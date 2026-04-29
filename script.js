// chat history
var msgLog = [];

var emotionData = [
  { emoji: "🌿", label: "I'm here with you" },
  { emoji: "💌", label: "This made me smile" },
  { emoji: "💕", label: "I care about you" },
  { emoji: "✨", label: "Thinking of you" },
  { emoji: "🌙", label: "Just a quiet moment" },
  { emoji: "🫧", label: "A little heavy right now" }
];

// shared app state
var appState = {
  activeInput: null,
  typingTimers: { device1: null, device2: null },
  blobScenes: {},
  keyboardMode: { device1: "letters", device2: "letters" },
  emotion: { device1: null, device2: null }
};

// avatar image
var avatarPath = "/Users/ivanleung/.cursor/projects/Users-ivanleung-Desktop-chatroom-artifact/assets/image-b90ab528-d45e-453f-94fa-d41aac3c14e3.png";

// DOM refs for both devices
var screens = {
  device1: {
    input: document.getElementById("input1"),
    send: document.getElementById("send1"),
    record: document.getElementById("record1"),
    messages: document.getElementById("messages1"),
    emotionRow: document.getElementById("emotionRow1"),
    keyboard: document.getElementById("keyboard1"),
    timeLabel: document.getElementById("timeLabel1"),
    stage: document.getElementById("stage1")
  },
  device2: {
    input: document.getElementById("input2"),
    send: document.getElementById("send2"),
    record: document.getElementById("record2"),
    messages: document.getElementById("messages2"),
    emotionRow: document.getElementById("emotionRow2"),
    keyboard: document.getElementById("keyboard2"),
    timeLabel: document.getElementById("timeLabel2"),
    stage: document.getElementById("stage2")
  }
};

// avatar with fallback if image 404s
var girlAvatar = document.getElementById("girlAvatar");
girlAvatar.src = avatarPath;
girlAvatar.onerror = function() {
  var ph = document.createElement("div");
  ph.className = "avatar-wrap avatar-letter";
  ph.textContent = "🔋";
  girlAvatar.parentNode.replaceChild(ph, girlAvatar);
};

// render message history on both screens
function drawMessages() {
  ["device1", "device2"].forEach(function(viewer) {
    var box = screens[viewer].messages;
    box.innerHTML = "";
    msgLog.forEach(function(entry) {
      var bubble = document.createElement("div");
      bubble.className = "bubble " + (entry.from === viewer ? "self" : "other");
      bubble.textContent = entry.text;
      box.appendChild(bubble);
    });
    box.scrollTop = box.scrollHeight;
  });
}

// send a message from a device
function postMessage(from, text) {
  var clean = text.trim();
  if (!clean) { return; }
  msgLog.push({ from: from, text: clean });
  screens[from].input.value = "";
  drawMessages();
}

// format Date to "2:30 p.m."
function fmtTime(date) {
  var raw = new Intl.DateTimeFormat("en-GB", {
    hour: "numeric", minute: "2-digit", hour12: true
  }).format(date);
  return raw.replace("pm", "p.m.").replace("am", "a.m.");
}

// weather code -> emoji
function weatherIcon(code) {
  // drizzle / rain
  if ([51,53,55,56,57,61,63,65,66,67,80,81,82].indexOf(code) > -1) { return "🌧️"; }
  // snow
  if ([71,73,75,77,85,86].indexOf(code) > -1) { return "❄️"; }
  // mainly clear / partly cloudy -> sunny
  if ([0,1].indexOf(code) > -1) { return "☀️"; }
  // overcast / fog -> cloudy
  if ([2,3,45,48].indexOf(code) > -1) { return "☁️"; }
  // thunderstorm
  if ([95,96,99].indexOf(code) > -1) { return "⛈️"; }
  return "☀️";
}

// fetch weather from open-meteo API
async function getWeather(lat, lon) {
  var url = "https://api.open-meteo.com/v1/forecast?latitude=" + lat + "&longitude=" + lon + "&current=temperature_2m,weather_code&timezone=auto";
  var resp = await fetch(url);
  if (!resp.ok) { throw new Error("weather fetch failed"); }
  return resp.json();
}

// "Amsterdam  2:38 p.m.  15°C ☀️"
function cityLabel(city, data) {
  var now = new Date();
  var localStr = new Intl.DateTimeFormat("en-US", {
    timeZone: data.timezone, year: "numeric", month: "2-digit",
    day: "2-digit", hour: "2-digit", minute: "2-digit", second: "2-digit", hour12: true
  }).format(now);
  var localDate = new Date(localStr);
  var temp = Math.round(data.current.temperature_2m);
  var icon = weatherIcon(data.current.weather_code);
  return city + "  " + fmtTime(localDate) + "  " + temp + "°C " + icon;
}

// update chat stage background texture based on weather
function applyWeatherBackground(deviceKey, weatherCode) {
  var stage = screens[deviceKey].stage;
  // remove any existing weather bg
  var existing = stage.querySelector(".weather-bg");
  if (existing) { existing.remove(); }

  var bg = document.createElement("div");
  bg.className = "weather-bg";

  // check if it's rainy weather
  var isRain = [51,53,55,56,57,61,63,65,66,67,80,81,82].indexOf(weatherCode) > -1;

  if (isRain) {
    // rainy glass texture
    bg.style.cssText = [
      "position:absolute;inset:0;z-index:0;pointer-events:none;",
      "background: linear-gradient(170deg, rgba(130,195,235,0.55) 0%, rgba(200,225,248,0.45) 60%, rgba(255,255,255,0.6) 100%);",
      "backdrop-filter: blur(3px);",
      "overflow:hidden;"
    ].join("");

    // rain streaks - create many diagonal lines using a canvas
    var rc = document.createElement("canvas");
    rc.style.cssText = "position:absolute;inset:0;width:100%;height:100%;opacity:0.22;";
    rc.width = 340; rc.height = 470;
    var rctx = rc.getContext("2d");
    rctx.strokeStyle = "#5a9fc4";
    rctx.lineWidth = 0.8;
    for (var i = 0; i < 60; i++) {
      var x = Math.random() * 380 - 20;
      var y = Math.random() * 10;
      rctx.beginPath();
      rctx.moveTo(x, y);
      rctx.lineTo(x - 12, 470);
      rctx.stroke();
    }
    // splash dots at bottom
    for (var j = 0; j < 40; j++) {
      rctx.beginPath();
      rctx.arc(Math.random() * 340, 400 + Math.random() * 70, 1.5, 0, Math.PI * 2);
      rctx.fillStyle = "rgba(100,160,210,0.35)";
      rctx.fill();
    }
    bg.appendChild(rc);
  } else {
    // sunny warm glass texture
    bg.style.cssText = [
      "position:absolute;inset:0;z-index:0;pointer-events:none;",
      "background: linear-gradient(175deg, rgba(255,220,100,0.50) 0%, rgba(255,180,60,0.30) 50%, rgba(255,255,200,0.40) 100%);",
      "backdrop-filter: blur(3px);",
      "overflow:hidden;"
    ].join("");

    // sun rays - radial lines from top-right
    var sc = document.createElement("canvas");
    sc.style.cssText = "position:absolute;inset:0;width:100%;height:100%;opacity:0.28;";
    sc.width = 340; sc.height = 470;
    var sctx = sc.getContext("2d");
    var sx = 290, sy = 30;
    for (var k = 0; k < 24; k++) {
      var angle = (k / 24) * Math.PI * 2;
      var len = 120 + Math.random() * 80;
      sctx.beginPath();
      sctx.moveTo(sx, sy);
      sctx.lineTo(sx + Math.cos(angle) * len, sy + Math.sin(angle) * len);
      sctx.strokeStyle = "rgba(255,210,60," + (0.4 + Math.random() * 0.4) + ")";
      sctx.lineWidth = 1.2 + Math.random() * 0.8;
      sctx.stroke();
    }
    // soft glow circle
    var grd = sctx.createRadialGradient(sx, sy, 5, sx, sy, 60);
    grd.addColorStop(0, "rgba(255,255,180,0.7)");
    grd.addColorStop(1, "rgba(255,220,80,0)");
    sctx.fillStyle = grd;
    sctx.beginPath();
    sctx.arc(sx, sy, 60, 0, Math.PI * 2);
    sctx.fill();
    bg.appendChild(sc);
  }

  stage.insertBefore(bg, stage.querySelector(".blob-canvas"));
}

// update both backgrounds to match current weather
async function refreshTimes() {
  try {
    var ams = await getWeather(52.3676, 4.9041);
    var edi = await getWeather(55.9533, -3.1883);
    screens.device1.timeLabel.textContent = cityLabel("Amsterdam", ams);
    screens.device2.timeLabel.textContent = cityLabel("Edinburgh", edi);
    // apply weather backgrounds
    applyWeatherBackground("device1", ams.current.weather_code);
    applyWeatherBackground("device2", edi.current.weather_code);
  } catch (err) {
    var now = new Date();
    var amsStr = new Intl.DateTimeFormat("en-US", {
      timeZone: "Europe/Amsterdam", hour: "numeric", minute: "numeric"
    }).format(now);
    var ediStr = new Intl.DateTimeFormat("en-US", {
      timeZone: "Europe/London", hour: "numeric", minute: "numeric"
    }).format(now);
    screens.device1.timeLabel.textContent = "Amsterdam  " + fmtTime(amsStr) + "  --°C ☀️";
    screens.device2.timeLabel.textContent = "Edinburgh  " + fmtTime(ediStr) + "  --°C 🌧️";
    // fallback sunny for d1, rainy for d2
    applyWeatherBackground("device1", 0);
    applyWeatherBackground("device2", 61);
  }
}

// update both time labels
async function refreshTimes() {
  try {
    var ams = await getWeather(52.3676, 4.9041);
    var edi = await getWeather(55.9533, -3.1883);
    screens.device1.timeLabel.textContent = cityLabel("Amsterdam", ams);
    screens.device2.timeLabel.textContent = cityLabel("Edinburgh", edi);
  } catch (err) {
    var now = new Date();
    var amsStr = new Intl.DateTimeFormat("en-US", {
      timeZone: "Europe/Amsterdam", hour: "numeric", minute: "numeric"
    }).format(now);
    var ediStr = new Intl.DateTimeFormat("en-US", {
      timeZone: "Europe/London", hour: "numeric", minute: "numeric"
    }).format(now);
    screens.device1.timeLabel.textContent = "Amsterdam  " + fmtTime(amsStr) + "  --°C ☁️";
    screens.device2.timeLabel.textContent = "Edinburgh  " + fmtTime(ediStr) + "  --°C ☁️";
  }
}

// build on-screen keyboard keys
function makeKeyboard(el, mode) {
  mode = mode || "letters";
  var letters = ["Q","W","E","R","T","Y","U","I","O","P","A","S","D","F","G","H","J","K","L","⌫",
                 "Z","X","C","V","B","N","M",",",".","↵","123","space","send"];
  var numbers = ["1","2","3","4","5","6","7","8","9","0","-","/",":",";","(",")","$","&","@","⌫",
                 ".",",","?","!","'","\"","#","%","+","↵","ABC","space","send"];
  var keys = mode === "numbers" ? numbers : letters;
  el.innerHTML = "";
  keys.forEach(function(k) {
    var btn = document.createElement("button");
    btn.className = "key";
    btn.type = "button";
    btn.dataset.key = k;
    btn.textContent = k;
    if (k === "space") { btn.classList.add("xwide"); }
    if (k === "send" || k === "123" || k === "ABC") { btn.classList.add("wide"); }
    el.appendChild(btn);
  });
}

// handle a key tap on the on-screen keyboard
function tapKey(deviceKey, keyVal) {
  var inp = screens[deviceKey].input;
  if (!inp) { return; }
  inp.focus();

  var start = inp.selectionStart != null ? inp.selectionStart : inp.value.length;
  var end = inp.selectionEnd != null ? inp.selectionEnd : inp.value.length;
  var val = inp.value;

  if (keyVal === "⌫") {
    if (start === end && start > 0) {
      inp.value = val.slice(0, start - 1) + val.slice(end);
      inp.setSelectionRange(start - 1, start - 1);
    } else if (start !== end) {
      inp.value = val.slice(0, start) + val.slice(end);
      inp.setSelectionRange(start, start);
    }
  } else if (keyVal === "↵" || keyVal === "send") {
    postMessage(deviceKey, inp.value);
  } else if (keyVal === "space") {
    inp.value = val.slice(0, start) + " " + val.slice(end);
    inp.setSelectionRange(start + 1, start + 1);
  } else if (keyVal === "123") {
    appState.keyboardMode[deviceKey] = "numbers";
    makeKeyboard(screens[deviceKey].keyboard, "numbers");
    return;
  } else if (keyVal === "ABC") {
    appState.keyboardMode[deviceKey] = "letters";
    makeKeyboard(screens[deviceKey].keyboard, "letters");
    return;
  } else {
    inp.value = val.slice(0, start) + keyVal + val.slice(end);
    inp.setSelectionRange(start + keyVal.length, start + keyVal.length);
  }
  inp.dispatchEvent(new Event("input", { bubbles: true }));
}

// reveal emotion chips after some typing
function revealEmotions(deviceKey) {
  screens[deviceKey].emotionRow.classList.remove("hidden");
}

// build emotion chips for a device
function buildEmotionRow(deviceKey) {
  var row = screens[deviceKey].emotionRow;
  row.innerHTML = "";

  emotionData.forEach(function(item) {
    var chip = document.createElement("button");
    chip.className = "chip";
    chip.type = "button";
    chip.innerHTML = "<span>" + item.emoji + "</span>" +
      "<span class='chip-tip'><span class='tip-emoji'>" + item.emoji + "</span>" +
      "<span class='tip-text'>" + item.label + "</span></span>";

    var holdTimer = null;
    var startHold = function() {
      holdTimer = setTimeout(function() {
        chip.classList.add("active", "show-tip");
      }, 450);
    };
    var stopHold = function() {
      clearTimeout(holdTimer);
      chip.classList.remove("show-tip");
      setTimeout(function() { chip.classList.remove("active"); }, 200);
    };

    chip.addEventListener("mouseenter", function() { chip.classList.add("active", "show-tip"); });
    chip.addEventListener("mouseleave", stopHold);
    chip.addEventListener("touchstart", startHold, { passive: true });
    chip.addEventListener("touchend", stopHold);
    chip.addEventListener("mousedown", startHold);
    chip.addEventListener("mouseup", stopHold);

    // tapping sends the emotion - only THIS device's blob animates
    chip.addEventListener("click", function() {
      postMessage(deviceKey, item.emoji + " " + item.label);
      triggerEmotion(deviceKey, item.emoji);
    });

    row.appendChild(chip);
  });
}

// kick off an emotion on the SPECIFIC device that was clicked
// Device 1 -> purple blob animates, green blob stays ambient
// Device 2 -> green blob animates, purple blob stays ambient
function triggerEmotion(deviceKey, emoji) {
  var idx = -1;
  for (var i = 0; i < emotionData.length; i++) {
    if (emotionData[i].emoji === emoji) { idx = i; break; }
  }
  if (idx === -1) { return; }

  appState.emotion[deviceKey] = idx;

  if (appState.blobScenes[deviceKey]) {
    appState.blobScenes[deviceKey].startEmotion(idx);
  }
}

// show / hide the on-screen keyboard
function toggleKeyboard(deviceKey, show) {
  screens[deviceKey].keyboard.classList.toggle("hidden", !show);
  var phone = screens[deviceKey].input.closest(".phone");
  if (phone) { phone.classList.toggle("typing", show); }
  var sc = appState.blobScenes[deviceKey];
  if (sc) { sc.setPartnerTyping(show); }
  if (show) { screens[deviceKey].input.focus(); }
}

// set up all event listeners for one device
function initDevice(deviceKey) {
  var s = screens[deviceKey];
  buildEmotionRow(deviceKey);
  makeKeyboard(s.keyboard, appState.keyboardMode[deviceKey]);

  s.keyboard.addEventListener("mousedown", function(e) { e.preventDefault(); });
  s.keyboard.addEventListener("click", function(e) {
    var key = e.target.closest(".key");
    if (!key) { return; }
    tapKey(deviceKey, key.dataset.key || "");
  });

  s.send.addEventListener("click", function() { postMessage(deviceKey, s.input.value); });
  s.record.addEventListener("click", function() { postMessage(deviceKey, "🎙 Voice note sent"); });

  s.input.addEventListener("keydown", function(e) {
    if (e.key === "Enter") { postMessage(deviceKey, s.input.value); }
  });

  s.input.addEventListener("focus", function() {
    appState.activeInput = deviceKey;
    toggleKeyboard(deviceKey, true);
  });

  s.input.addEventListener("blur", function() {
    setTimeout(function() { toggleKeyboard(deviceKey, false); }, 150);
  });

  s.input.addEventListener("input", function() {
    clearTimeout(appState.typingTimers[deviceKey]);
    var wait = 2000 + Math.random() * 2000;
    appState.typingTimers[deviceKey] = setTimeout(function() {
      revealEmotions(deviceKey);
    }, wait);
  });
}

// view toggle buttons
function setupViewToggle() {
  var wrap = document.getElementById("phonesWrap");
  document.querySelectorAll(".view-btn").forEach(function(btn) {
    btn.addEventListener("click", function() {
      document.querySelectorAll(".view-btn").forEach(function(b) { b.classList.remove("active"); });
      btn.classList.add("active");
      wrap.classList.remove("show-device1", "show-device2");
      if (btn.dataset.view === "device1") { wrap.classList.add("show-device1"); }
      if (btn.dataset.view === "device2") { wrap.classList.add("show-device2"); }
    });
  });
  document.querySelectorAll(".device-tag").forEach(function(tag) {
    tag.addEventListener("click", function() {
      document.querySelectorAll(".device-tag").forEach(function(t) { t.classList.remove("active"); });
      tag.classList.add("active");
      wrap.classList.remove("show-device1", "show-device2");
      wrap.classList.add(tag.dataset.target === "device1" ? "show-device1" : "show-device2");
    });
  });
}

// blend two hex colors by amt (0-1)
function lerpHex(hexA, hexB, amt) {
  var r = parseInt(hexA.slice(1,3),16);
  var g = parseInt(hexA.slice(3,5),16);
  var b = parseInt(hexA.slice(5,7),16);
  var r2 = parseInt(hexB.slice(1,3),16);
  var g2 = parseInt(hexB.slice(3,5),16);
  var b2 = parseInt(hexB.slice(5,7),16);
  var rr = Math.round(r + (r2-r)*amt);
  var gg = Math.round(g + (g2-g)*amt);
  var bb = Math.round(b + (b2-b)*amt);
  return "#" + rr.toString(16).padStart(2,"0") + gg.toString(16).padStart(2,"0") + bb.toString(16).padStart(2,"0");
}

// ================================================================
// BlobScene - canvas animation
// Each canvas renders two blobs. myBlobIndex tells which blob
// belongs to the device we're viewing from.
// ================================================================
function BlobScene(canvasEl, palette, myBlobIndex) {
  this.cv = canvasEl;
  this.ctx = canvasEl.getContext("2d");
  // [purpleA, purpleB, greenA, greenB]
  this.pal = palette;
  // which blob belongs to "me" on this device (1 = left/purple, 2 = right/green)
  this.myBlobIndex = myBlobIndex;

  this.t = 0;
  this.partnerTyping = false;
  this.glowAmt = 0;
  this.activeEmotion = -1;
  this.emotionT = 0;
  this.emotionPhase = 0;
  this.baseR = 0;
  this.scaleFactor = 1.0;
  this.breatheT = 0;
  this.bounceVel = 0;
  this.driftX = 0;
  this.driftY = 0;
  this.swapActive = false;
  this.swapT = 0;
  this.swapProgress = 0;
  this.coolBlend = 0;

  // floating label
  this.labelEl = null;
  this._makeLabel();

  var self = this;
  this.resize();
  window.addEventListener("resize", function() { self.resize(); });
  this.loop();
}

// add the floating "Thinking of You" label to the stage
BlobScene.prototype._makeLabel = function() {
  var existing = this.cv.parentElement.querySelector(".think-label");
  if (existing) { this.labelEl = existing; return; }
  var label = document.createElement("div");
  label.className = "think-label";
  label.textContent = "✨ Thinking of you";
  this.cv.parentElement.appendChild(label);
  this.labelEl = label;
};

BlobScene.prototype.resize = function() {
  this.cv.width = this.cv.clientWidth;
  this.cv.height = this.cv.clientHeight;
  this.baseR = Math.min(this.cv.width, this.cv.height) * 0.32;
};

// partner typing triggers the partner blob glow
BlobScene.prototype.setPartnerTyping = function(active) {
  this.partnerTyping = active;
};

// start an emotion animation
BlobScene.prototype.startEmotion = function(emotionIdx) {
  this.activeEmotion = emotionIdx;
  this.emotionT = 0;
  this.emotionPhase = 0;
  this.scaleFactor = 1.0;
  this.bounceVel = 0;
  this.driftX = 0;
  this.driftY = 0;
  this.coolBlend = 0;
  this.swapActive = false;
  this.swapProgress = 0;
  this.breatheT = 0;

  if (emotionIdx === 0) {
    // 🌿 breathing - oscillating scale
    this.breatheT = 0;

  } else if (emotionIdx === 1) {
    // ☀️ gentle bounce
    this.bounceVel = -3.5;

  } else if (emotionIdx === 2) {
    // 💕 grow and drift toward canvas centre
    this.emotionPhase = 0;
    this.scaleFactor = 1.0;

  } else if (emotionIdx === 3) {
    // ✨ Thinking of You - both blobs FULLY swap sides
    this.swapActive = true;
    this.swapT = 0;
    this.swapProgress = 0;
    if (this.labelEl) { this.labelEl.classList.add("visible"); }

  } else if (emotionIdx === 4) {
    // 🌙 quiet - shrink, slow, cooler tint
    this.scaleFactor = 0.65;
    this.coolBlend = 0.4;

  } else if (emotionIdx === 5) {
    // 🫧 heavy - sinks down, cool tint
    this.driftY = 0;
    this.coolBlend = 0.35;
  }
};

// draw one blob with a soft radial gradient
BlobScene.prototype.drawBlob = function(cx, cy, colorA, colorB, glowPower, radius) {
  var ctx = this.ctx;
  var r = radius || this.baseR * this.scaleFactor;
  var eased = glowPower * glowPower * (3 - 2 * glowPower);

  var grad = ctx.createRadialGradient(
    cx + r * 0.22, cy - r * 0.22, 0,
    cx, cy, r
  );
  grad.addColorStop(0.2, colorB);
  grad.addColorStop(0.8, colorA);
  if (eased > 0.03) {
    grad.addColorStop(1, "rgba(255,254,194," + (0.9 * eased) + ")");
  }
  grad.addColorStop(1, "rgba(255,255,255,0)");

  ctx.save();
  ctx.globalAlpha = 0.92 + eased * 0.08;
  ctx.fillStyle = grad;
  ctx.beginPath();
  ctx.ellipse(cx, cy, r, r, 0, 0, Math.PI * 2);
  ctx.fill();
  ctx.restore();

  // corner glow highlight
  if (eased > 0.03) {
    var dotR = r * (0.11 + eased * 0.1);
    var dotGrad = ctx.createRadialGradient(
      cx - r * 0.24, cy - r * 0.24, 0,
      cx - r * 0.24, cy - r * 0.24, dotR
    );
    dotGrad.addColorStop(0, "rgba(255,254,194," + (0.9 * (0.32 + eased * 0.24)) + ")");
    dotGrad.addColorStop(1, "rgba(255,254,194,0)");
    ctx.fillStyle = dotGrad;
    ctx.beginPath();
    ctx.ellipse(cx - r * 0.24, cy - r * 0.24, dotR * 0.9, dotR * 0.9, 0, 0, Math.PI * 2);
    ctx.fill();
  }
};

// main animation loop
BlobScene.prototype.loop = function() {
  var self = this;
  var ctx = this.ctx;
  var w = this.cv.width;
  var h = this.cv.height;

  this.t += 0.0024;
  this.emotionT += 0.016;

  ctx.clearRect(0, 0, w, h);

  // partner typing glow
  var glowTarget = this.partnerTyping ? 0.6 : 0;
  this.glowAmt += (glowTarget - this.glowAmt) * 0.018;

  // base positions - blob A (purple, left) and blob B (green, right)
  var bxA = w * 0.18 + Math.sin(this.t * 1.15) * w * 0.05;
  var byA = h * 0.5  + Math.cos(this.t * 1.05) * h * 0.06;
  var bxB = w * 0.82 + Math.cos(this.t * 0.98) * w * 0.05;
  var byB = h * 0.52 + Math.sin(this.t * 0.9)  * h * 0.06;

  // offsets for blob A and blob B (0 = ambient / no emotion effect)
  var offAx = 0, offAy = 0, scaleA = 1.0;
  var offBx = 0, offBy = 0, scaleB = 1.0;

  // which blob gets the emotion animation depends on myBlobIndex
  // myBlobIndex === 1 -> blob A (purple) animates
  // myBlobIndex === 2 -> blob B (green) animates
  var anim = {
    x: this.myBlobIndex === 1 ? offAx : offBx,
    y: this.myBlobIndex === 1 ? offAy : offBy,
    sc: this.myBlobIndex === 1 ? scaleA : scaleB
  };

  if (this.activeEmotion === 0) {
    // 🌿 breathing - oscillating scale on my blob
    this.breatheT += 0.04;
    var breathSc = 1.0 + Math.sin(this.breatheT) * 0.12;
    if (this.myBlobIndex === 1) { scaleA = breathSc; } else { scaleB = breathSc; }

  } else if (this.activeEmotion === 1) {
    // ☀️ gentle bounce
    this.bounceVel += 0.18;
    var bOff = this.bounceVel;
    if (this.bounceVel > 4) { this.bounceVel = -3.2; }
    if (this.myBlobIndex === 1) { offAy = bOff; } else { offBy = bOff; }

  } else if (this.activeEmotion === 2) {
    // 💕 grow + drift toward centre
    this.emotionPhase += 0.008;
    var growSc = Math.min(1.35, 1.0 + this.emotionPhase * 0.4);
    if (this.myBlobIndex === 1) {
      scaleA = growSc;
      offAx = (w / 2 - bxA) * 0.03;
      offAy = (h / 2 - byA) * 0.03;
    } else {
      scaleB = growSc;
      offBx = (w / 2 - bxB) * 0.03;
      offBy = (h / 2 - byB) * 0.03;
    }
    if (this.emotionT > 4.0) { this.activeEmotion = -1; }

  } else if (this.activeEmotion === 3) {
    // ✨ Thinking of You - BOTH blobs CROSS OVER each other
    this.swapT += 0.008;
    this.swapProgress = Math.min(1.0, this.swapT);

    if (this.swapProgress > 0.7 && this.labelEl) {
      this.labelEl.classList.remove("visible");
    }

    // ease-in-out for smooth crossing
    var ease = this.swapProgress < 0.5
      ? 2 * this.swapProgress * this.swapProgress
      : 1 - Math.pow(-2 * this.swapProgress + 2, 2) / 2;

    // total crossing distance - they pass THROUGH each other
    var totalDist = (bxB - bxA) * 1.4;

    // both blobs move toward opposite sides simultaneously
    offAx = totalDist * ease;
    offBx = -(totalDist * ease);

    if (this.emotionT > 5.0) {
      this.activeEmotion = -1;
      this.swapActive = false;
      this.swapProgress = 0;
      offAx = 0; offBx = 0;
      if (this.labelEl) { this.labelEl.classList.remove("visible"); }
    }

  } else if (this.activeEmotion === 4) {
    // 🌙 quiet - shrink, slow, cool tint
    this.emotionPhase += 0.01;
    var quietSc = 0.65 + Math.sin(this.emotionPhase * 0.5) * 0.04;
    this.coolBlend = 0.4;
    if (this.myBlobIndex === 1) {
      scaleA = quietSc;
      offAx = Math.sin(this.t * 0.3) * 1.5;
      offAy = Math.cos(this.t * 0.25) * 1.0;
    } else {
      scaleB = quietSc;
      offBx = Math.sin(this.t * 0.3) * 1.5;
      offBy = Math.cos(this.t * 0.25) * 1.0;
    }
    if (this.emotionT > 5.0) { this.activeEmotion = -1; this.coolBlend = 0; }

  } else if (this.activeEmotion === 5) {
    // 🫧 heavy - sinks down, cool tint
    this.emotionPhase += 0.015;
    this.driftY = Math.min(this.driftY + 0.05, 22);
    this.coolBlend = 0.35;
    var sinkY = this.driftY + Math.sin(this.t * 0.6) * 2.5;
    var sinkX = Math.sin(this.t * 0.4) * 2;
    var sinkSc = 0.92 + Math.sin(this.emotionPhase) * 0.05;
    if (this.myBlobIndex === 1) {
      scaleA = sinkSc; offAx = sinkX; offAy = sinkY;
    } else {
      scaleB = sinkSc; offBx = sinkX; offBy = sinkY;
    }
    if (this.emotionT > 5.0) { this.activeEmotion = -1; this.driftY = 0; this.coolBlend = 0; }
  }

  // final positions
  var finalX1 = bxA + offAx;
  var finalY1 = byA + offAy;
  var finalX2 = bxB + offBx;
  var finalY2 = byB + offBy;
  var finalR1 = this.baseR * scaleA;
  var finalR2 = this.baseR * scaleB;

  // cool tint
  var col0 = this.pal[0], col1 = this.pal[1], col2 = this.pal[2], col3 = this.pal[3];
  if (this.coolBlend > 0) {
    col0 = lerpHex(this.pal[0], "#9b7fbf", this.coolBlend);
    col2 = lerpHex(this.pal[2], "#7fa8cc", this.coolBlend);
  }

  // draw blob A (purple) and blob B (green)
  // blob A glows when partner types (myBlobIndex===2), blob B glows when i type (myBlobIndex===1)
  this.drawBlob(finalX1, finalY1, col0, col1,
    this.myBlobIndex === 2 ? this.glowAmt : 0, finalR1);
  this.drawBlob(finalX2, finalY2, col2, col3,
    this.myBlobIndex === 1 ? this.glowAmt : 0, finalR2);

  requestAnimationFrame(function() { self.loop(); });
};

// ================================================================
// boot
// ================================================================

// Device 1: purple blob is "my" blob (myBlobIndex = 1), green is partner
appState.blobScenes.device1 = new BlobScene(
  screens.device1.stage.querySelector(".blob-canvas"),
  ["#D1A7E0", "#D76DCA", "#53DABB", "#A8EAF1"],
  1
);

// Device 2: green blob is "my" blob (myBlobIndex = 2), purple is partner
appState.blobScenes.device2 = new BlobScene(
  screens.device2.stage.querySelector(".blob-canvas"),
  ["#CCABD8", "#D76DCA", "#86E3CE", "#A8EAF1"],
  2
);

initDevice("device1");
initDevice("device2");
setupViewToggle();
drawMessages();
refreshTimes();
setInterval(refreshTimes, 60000);

(function () {
  "use strict";

  function ready(fn) {
    if (document.readyState === "loading") {
      document.addEventListener("DOMContentLoaded", fn, { once: true });
    } else {
      fn();
    }
  }

  function getDeviceKeyFromElement(el) {
    if (!el) return null;
    var phone = el.closest(".phone");
    if (!phone) return null;
    if (phone.id === "device1") return "device1";
    if (phone.id === "device2") return "device2";
    return null;
  }

  function removeThinkingLabelEverywhere() {
    document.querySelectorAll(".think-label").forEach(function (n) {
      n.remove();
    });
  }

  // Smooth ping-pong loop for ✨ (swap right to left continuously, with slow bit, smoother)
  function patchSmoothSwapLoop() {
    if (!window.BlobScene || !window.BlobScene.prototype) return;
    if (typeof window.lerpHex !== "function") return;

    var originalLoop = window.BlobScene.prototype.loop;
    if (typeof originalLoop !== "function") return;

    window.BlobScene.prototype.loop = function () {
      // Only override drawing when ✨ is active & enable oscillation.
      if (this.activeEmotion !== 3 || !this._swapOscillate) {
        // Also handle 💕 "hold big" mode (grow once, then stay big)
        // Also handle 🌙 "hold small" mode (both blobs small and calm until next tap)
        if (!this._holdBig && !this._holdSmall) {
          return originalLoop.call(this);
        }
      }

      var self = this;
      var ctx = this.ctx;
      var w = this.cv.width;
      var h = this.cv.height;

      this.t += 0.0024;

      ctx.clearRect(0, 0, w, h);

      // partner typing glow (same idea as script.js)
      var glowTarget = this.partnerTyping ? 0.6 : 0;
      this.glowAmt += (glowTarget - this.glowAmt) * 0.018;

      // base positions - blob A (purple, left) and blob B (green, right)
      var bxA = w * 0.18 + Math.sin(this.t * 1.15) * w * 0.05;
      var byA = h * 0.5 + Math.cos(this.t * 1.05) * h * 0.06;
      var bxB = w * 0.82 + Math.cos(this.t * 0.98) * w * 0.05;
      var byB = h * 0.52 + Math.sin(this.t * 0.9) * h * 0.06;

      var offAx = 0;
      var offBx = 0;

      if (this._swapOscillate) {
        // ✨: smooth swap right <-> left forever

        // Simple ping-pong value 0..1..0..1.. (slightly faster)
        var p = (Math.sin(this.t * 3.0) + 1) / 2;

        // ease-in and out (same shape as script.js uses)
        var ease =
          p < 0.5 ? 2 * p * p : 1 - Math.pow(-2 * p + 2, 2) / 2;

        var totalDist = (bxB - bxA) * 1.4;
        offAx = totalDist * ease;
        offBx = -(totalDist * ease);
      }

      var finalX1 = bxA + offAx;
      var finalY1 = byA;
      var finalX2 = bxB + offBx;
      var finalY2 = byB;

      var col0 = this.pal[0],
        col1 = this.pal[1],
        col2 = this.pal[2],
        col3 = this.pal[3];

      if (this.coolBlend > 0) {
        col0 = window.lerpHex(this.pal[0], "#9b7fbf", this.coolBlend);
        col2 = window.lerpHex(this.pal[2], "#7fa8cc", this.coolBlend);
      }

      // 💕: slowly grow bigger once, then stay big
      var scaleA = 1.0;
      var scaleB = 1.0;
      if (this._holdBig) {
        // Friendly/simple: each frame move a little bit toward the target size.
        // changed: original version only affects "my blob", now both blobs grow together.
        var target = 1.35;
        this._holdBigScale = this._holdBigScale || 1.0;
        this._holdBigScale += (target - this._holdBigScale) * 0.03;
        scaleA = this._holdBigScale;
        scaleB = this._holdBigScale;
      }

      // 🌙: both blobs become smaller and stay calm (tiny movement only)
      if (this._holdSmall) {
        // changed: original was 0.65 (and cooler tone). now we hold around 0.58 and keep colour normal.
        var smallTarget = 0.58;
        this._holdSmallScale = this._holdSmallScale || 1.0;
        // smaller number equals to slower transition into the small blob form
        this._holdSmallScale += (smallTarget - this._holdSmallScale) * 0.02;
        scaleA = this._holdSmallScale;
        scaleB = this._holdSmallScale;

        // tiny "almost static" movements (no big drifting)
        finalX1 = bxA + Math.sin(this.t * 0.22) * 0.8;
        finalY1 = byA + Math.cos(this.t * 0.2) * 0.6;
        finalX2 = bxB + Math.sin(this.t * 0.22) * 0.8;
        finalY2 = byB + Math.cos(this.t * 0.2) * 0.6;

        this.coolBlend = 0;
      }

      // draw blob A (purple) and blob B (green) (same glow logic as script.js)
      this.drawBlob(
        finalX1,
        finalY1,
        col0,
        col1,
        this.myBlobIndex === 2 ? this.glowAmt : 0,
        this.baseR * scaleA
      );
      this.drawBlob(
        finalX2,
        finalY2,
        col2,
        col3,
        this.myBlobIndex === 1 ? this.glowAmt : 0,
        this.baseR * scaleB
      );

      requestAnimationFrame(function () {
        self.loop();
      });
    };
  }

  // 1) Remove the "✨ Thinking of you" notice on ✨ tap (without editing script.js)
  function patchThinkingLabel() {
    if (!window.BlobScene || !window.BlobScene.prototype) return;

    // Prevent creating the label in the first place
    window.BlobScene.prototype._makeLabel = function () {
      this.labelEl = null;
    };

    // If something already created it before this patch loads, remove it.
    removeThinkingLabelEverywhere();

    // Also keep it removed if anything re-adds it.
    var mo = new MutationObserver(function () {
      removeThinkingLabelEverywhere();
    });
    mo.observe(document.documentElement, { childList: true, subtree: true });
  }

  // 2) Keep blob movement going until next emoji tap (with the simple "loop" idea)
  function patchEmotionLooping() {
    if (typeof window.triggerEmotion !== "function") return;
    if (!window.appState || !window.appState.blobScenes) return;

    var originalTriggerEmotion = window.triggerEmotion;
    var loopTimers = { device1: null, device2: null };
    var lastIdx = { device1: null, device2: null };

    function stopLoop(deviceKey) {
      if (loopTimers[deviceKey]) { // checks if a timer exists for the given deviceKey,
        clearInterval(loopTimers[deviceKey]); // clears the interval to stop the loop, // and resets the reference to null to prevent reuse or memory leaks.
        loopTimers[deviceKey] = null;
      }
    }

    window.triggerEmotion = function (deviceKey, emoji) {
      // Let original logic compute idx and start once
      originalTriggerEmotion(deviceKey, emoji);

      var idx = window.appState && window.appState.emotion ? window.appState.emotion[deviceKey] : null;
      if (typeof idx !== "number" || idx < 0) return;

      // Restart loop on each new tap
      stopLoop(deviceKey);
      lastIdx[deviceKey] = idx;

      var sc = window.appState && window.appState.blobScenes ? window.appState.blobScenes[deviceKey] : null;
      if (sc) {
        // Reset special modes each time user taps a chip.
        sc._swapOscillate = idx === 3; // ✨
        sc._holdBig = idx === 2;       // 💕
        sc._holdSmall = idx === 4;     // 🌙
        if (idx !== 2) { sc._holdBigScale = 1.0; }
        if (idx !== 4) { sc._holdSmallScale = 1.0; }

        // 🫧 "heavy" is a colour mood that should stay until the next tap.
        // So: turn it on here, and turn it off automatically when a different emoji is picked.
        if (idx === 5) {
          sc._holdCoolTone = true;
          sc.coolBlend = 0.35; // same cool tone strength as the original heavy mood
        } else if (sc._holdCoolTone) {
          sc._holdCoolTone = false;
          sc.coolBlend = 0;
        }
      }

      if (idx === 3) {
        // Let the animation run smoothly; no interval reset.
        return;
      }

      if (idx === 2) {
        // 💕 should NOT loop. It grows and then stays bigger.
        // Also, stop the original 4s emotion timer by cancelling the active emotion.
        if (sc) { sc.activeEmotion = -1; }
        return;
      }

      if (idx === 4) {
        // 🌙 should NOT loop or end after 5 seconds.
        // We keep the small/calm form until the next tap.
        if (sc) {
          sc.activeEmotion = -1; // stop the original quiet timer so it won't snap back
          sc.coolBlend = 0;
        }
        return;
      }

      if (idx === 5) {
        // 🫧 should NOT loop or keep moving.
        // We only keep the cooler tone (mood colour) until the next tap.
        if (sc) {
          sc.activeEmotion = -1; // stop the heavy movement part
          sc.driftY = 0;
        }
        return;
      }

      // Smooth + simple loop (no "crack"):
      // make sure don't restart while it's mid-animation
      // - only restart AFTER the animation naturally ends (activeEmotion becomes -1)
      loopTimers[deviceKey] = setInterval(function () {
        var sc = window.appState && window.appState.blobScenes ? window.appState.blobScenes[deviceKey] : null;
        if (!sc || typeof sc.startEmotion !== "function") return;
        if (window.appState.emotion[deviceKey] !== lastIdx[deviceKey]) return; // user tapped another emoji
        if (sc.activeEmotion !== -1) return; // still running -> let it finish (looks smoother)
        sc.startEmotion(lastIdx[deviceKey]); // restart now
      }, 120);
    };
  }

  // user types message
  // user taps an emoji chip to SELECT emoji (and trigger blob movement)
  // user presses send/enter/keyboard send -> message sent with emoji appended at the end
  function patchSendFlow() {
    if (!window.screens || typeof window.postMessage !== "function") return;

    var selectedEmoji = { device1: null, device2: null };

    function setChipSelection(deviceKey, rowEl, emoji) {
      // basic highlight: reuse existing .active style
      rowEl.querySelectorAll(".chip").forEach(function (chip) {
        chip.classList.remove("active");
      });

      var chosen = null;
      rowEl.querySelectorAll(".chip").forEach(function (chip) {
        var emojiEl = chip.querySelector("span");
        var chipEmoji = emojiEl ? emojiEl.textContent.trim() : "";
        if (chipEmoji === emoji) chosen = chip;
      });
      if (chosen) chosen.classList.add("active");

      selectedEmoji[deviceKey] = emoji;
    }

    function clearSelection(deviceKey) {
      var row = window.screens[deviceKey] && window.screens[deviceKey].emotionRow;
      if (row) {
        row.querySelectorAll(".chip").forEach(function (chip) {
          chip.classList.remove("active");
        });
      }
      selectedEmoji[deviceKey] = null;
    }

    function sendWithSelectedEmoji(deviceKey) {
      var s = window.screens[deviceKey];
      if (!s || !s.input) return;
      var clean = (s.input.value || "").trim();
      if (!clean) return;

      var em = selectedEmoji[deviceKey];
      var out = em ? clean + " " + em : clean;
      window.postMessage(deviceKey, out);

      clearSelection(deviceKey);
    }

    // Intercept emoji-chip click: select emoji + trigger blobs, but DO NOT auto-post the label message.
    ["device1", "device2"].forEach(function (deviceKey) {
      var row = window.screens[deviceKey] && window.screens[deviceKey].emotionRow;
      if (!row) return;

      row.addEventListener(
        "click",
        function (e) {
          var chip = e.target && e.target.closest ? e.target.closest(".chip") : null;
          if (!chip) return;

          // Stop script.js's click handler on the chip
          e.preventDefault();
          e.stopImmediatePropagation();

          var emojiEl = chip.querySelector("span");
          var emoji = emojiEl ? emojiEl.textContent.trim() : "";
          if (!emoji) return;

          setChipSelection(deviceKey, row, emoji);

          // Keep existing blob behavior: emoji tap triggers emotion movement
          if (typeof window.triggerEmotion === "function") {
            window.triggerEmotion(deviceKey, emoji);
          }
        },
        true
      );
    });

    // Intercept send button click
    ["device1", "device2"].forEach(function (deviceKey) {
      var s = window.screens[deviceKey];
      if (!s) return;

      if (s.send) {
        s.send.addEventListener(
          "click",
          function (e) {
            e.preventDefault();
            e.stopImmediatePropagation();
            sendWithSelectedEmoji(deviceKey);
          },
          true
        );
      }

      if (s.input) {
        s.input.addEventListener(
          "keydown",
          function (e) {
            if (e.key !== "Enter") return;
            e.preventDefault();
            e.stopImmediatePropagation();
            sendWithSelectedEmoji(deviceKey);
          },
          true
        );
      }

      // Intercept on-screen keyboard "send" key
      if (s.keyboard) {
        s.keyboard.addEventListener(
          "click",
          function (e) {
            var key = e.target && e.target.closest ? e.target.closest(".key") : null;
            if (!key) return;
            var val = key.dataset ? key.dataset.key : "";
            if (val !== "send") return;
            e.preventDefault();
            e.stopImmediatePropagation();
            sendWithSelectedEmoji(deviceKey);
          },
          true
        );
      }
    });
  }

  ready(function () {
    patchSmoothSwapLoop();
    patchThinkingLabel();
    patchEmotionLooping();
    patchSendFlow();
  });
})();

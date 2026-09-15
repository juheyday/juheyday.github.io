(function () {
  "use strict";

  var API_BASE = "https://ju-hey-console.vercel.app/api/likes";
  var STORAGE_KEY = "juhey_likes_uid";

  function getOrCreateUserId() {
    var uid = localStorage.getItem(STORAGE_KEY);
    if (uid) return uid;
    uid = crypto.randomUUID();
    localStorage.setItem(STORAGE_KEY, uid);
    return uid;
  }

  function initLikeButtons() {
    var buttons = document.querySelectorAll("[data-like-post]");
    if (!buttons.length) return;

    var userId = getOrCreateUserId();
    var buttonStates = [];

    buttons.forEach(function (btn) {
      var postId = btn.getAttribute("data-like-post");
      if (!postId) return;

      var heart = btn.querySelector(".like-heart");
      var countEl = btn.querySelector(".like-count");
      var state = { liked: false, postId: postId };
      var reqSeq = 0;
      buttonStates.push(state);

      function render(isLiked, count) {
        state.liked = isLiked;
        if (heart) {
          heart.style.fill = isLiked ? "currentColor" : "none";
          heart.parentElement.classList.toggle("liked", isLiked);
        }
        btn.classList.toggle("has-count", count > 0);
        if (countEl) countEl.textContent = count > 0 ? count : "";
      }

      var available = true;

      function setUnavailable() {
        available = false;
        btn.style.opacity = "0.4";
        btn.style.pointerEvents = "none";
        btn.title = "일시적으로 사용할 수 없습니다";
      }

      function fetchState() {
        var seq = ++reqSeq;
        fetch(API_BASE + "?postId=" + encodeURIComponent(postId) + "&userId=" + encodeURIComponent(userId))
          .then(function (r) { if (!r.ok) throw new Error(); return r.json(); })
          .then(function (data) { if (seq === reqSeq) render(data.liked, data.count); })
          .catch(function () { setUnavailable(); });
      }

      state.fetchState = fetchState;

      // Fetch initial state
      fetchState();

      // Click handler
      btn.addEventListener("click", function (e) {
        e.preventDefault();
        if (!available) return;
        var action = state.liked ? "unlike" : "like";
        // Optimistic UI
        render(!state.liked, Math.max(0, parseInt(countEl.textContent || "0", 10) + (action === "like" ? 1 : -1)));

        var seq = ++reqSeq;
        fetch(API_BASE, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ postId: postId, userId: userId, action: action }),
        })
          .then(function (r) { if (!r.ok) throw new Error(); return r.json(); })
          .then(function (data) { if (seq === reqSeq) render(data.liked, data.count); })
          .catch(function () { setUnavailable(); });
      });
    });

    // Single visibilitychange listener for all buttons (multi-tab sync)
    document.addEventListener("visibilitychange", function () {
      if (document.visibilityState === "visible") {
        buttonStates.forEach(function (s) { s.fetchState(); });
      }
    });
  }

  if (document.readyState === "loading") {
    document.addEventListener("DOMContentLoaded", initLikeButtons);
  } else {
    initLikeButtons();
  }
})();

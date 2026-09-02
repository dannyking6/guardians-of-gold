/**
 * Stub local du SDK GameSnacks (https://sdks.gamesnacks.com/developer/v2/index.js)
 * Remplace les appels reseau (pubs, analytics) par des simulations hors-ligne.
 * - Publicites : simule un break pub reussi (reward -> gratifie le joueur).
 * - Audio : son active par defaut, souscrit via GameSnacks.audio.subscribe.
 * - Storage : backed par localStorage, persistant entre les sessions.
 * - game/score : no-ops (telemetrie inutile en local).
 */
(function () {
  "use strict";

  const STORAGE_PREFIX = "gs_local_";

  const storage = {
    getItem(name) {
      try {
        const v = localStorage.getItem(STORAGE_PREFIX + String(name));
        return v === null ? 0 : v;
      } catch (e) {
        return 0;
      }
    },
    setItem(name, value) {
      try {
        localStorage.setItem(STORAGE_PREFIX + String(name), String(value));
      } catch (e) { /* ignore */ }
    },
    removeItem(name) {
      try {
        localStorage.removeItem(STORAGE_PREFIX + String(name));
      } catch (e) { /* ignore */ }
    },
    clear() {
      try {
        Object.keys(localStorage)
          .filter((k) => k.startsWith(STORAGE_PREFIX))
          .forEach((k) => localStorage.removeItem(k));
      } catch (e) { /* ignore */ }
    },
  };

  const ad = {
    /**
     * Simule un break pub.
     * type 'next'    (interstitial) : beforeAd -> afterAd -> adBreakDone
     * type 'reward'  (rewarded)     : beforeReward(showAdFn) -> [le jeu appelle
     *        startRewardAd() quand le joueur accepte] -> showAdFn() ->
     *        adViewed/afterAd -> adBreakDone. Le jeu est alors gratifie.
     */
    break(opts) {
      const o = opts || {};
      console.log("[GameSnacks stub] ad.break type=" + o.type);
      setTimeout(() => {
        if (o.type === "reward") {
          // Le joueur "regarde" la pub simulée : le stub résout le flux tout
          // seul après un court délai (garde anti double-appel), que le jeu
          // appelle startRewardAd() ou non.
          let invoked = false;
          const invoke = () => {
            if (invoked) return;
            invoked = true;
            o.adViewed && o.adViewed();
            o.afterAd && o.afterAd();
            o.adBreakDone &&
              o.adBreakDone({ breakStatus: "completed", placementName: o.name });
          };
          o.beforeReward && o.beforeReward(invoke);
          setTimeout(invoke, 600);
        } else {
          o.beforeAd && o.beforeAd();
          o.afterAd && o.afterAd();
          o.adBreakDone &&
            o.adBreakDone({ breakStatus: "completed", placementName: o.name });
        }
      }, 50);
    },
  };

  const audio = {
    _enabled: true,
    _subscribers: [],
    // sdk.js lit GameSnacks.audio.g === true pour "son active"
    get g() {
      return this._enabled;
    },
    set g(v) {
      this._enabled = !!v;
      this._notify();
    },
    subscribe(cb) {
      if (typeof cb === "function") {
        this._subscribers.push(cb);
        // Notifie plus tard : le callback de sdk.js appelle c3_callFunction,
        // qui n'existe qu'apres l'init du runtime Construct.
        const notify = () => {
          try { cb(this._enabled); } catch (e) { /* ignore */ }
        };
        if (typeof window.c3_callFunction === "function") {
          setTimeout(notify, 0);
        } else {
          let tries = 0;
          const iv = setInterval(() => {
            tries++;
            if (typeof window.c3_callFunction === "function" || tries > 100) {
              clearInterval(iv);
              notify();
            }
          }, 100);
        }
      }
    },
    _notify() {
      this._subscribers.forEach((cb) => {
        try { cb(this._enabled); } catch (e) { /* ignore */ }
      });
    },
    setEnabled(v) {
      this._enabled = !!v;
      this._notify();
    },
  };

  const game = {
    ready: () => console.log("[GameSnacks stub] game.ready()"),
    firstFrameReady: () => console.log("[GameSnacks stub] game.firstFrameReady()"),
    gameOver: () => console.log("[GameSnacks stub] game.gameOver()"),
    levelComplete: (lvl) => console.log("[GameSnacks stub] game.levelComplete(" + lvl + ")"),
    onPause: (cb) => { console.log("[GameSnacks stub] onPause registered"); },
    onResume: (cb) => { console.log("[GameSnacks stub] onResume registered"); },
  };

  const score = {
    update: (s) => console.log("[GameSnacks stub] score.update(" + s + ")"),
  };

  window.GameSnacks = { ad, audio, game, score, storage };
  console.log("[GameSnacks stub] SDK local charge (mode hors-ligne)");
})();

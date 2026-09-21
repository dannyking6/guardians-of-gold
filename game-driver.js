/**
 * game-adapter.js — Couche d'adaptation neutre du jeu (0 dépendance externe).
 *
 * ARCHITECTURE EN 2 ÉTAGES :
 *
 *   [Jeu Construct]  <-- fonctions globales -->  [PONT]  <-- interface -->  [DRIVER]
 *                                   (ci-dessous)        (GameDriverInterface)
 *
 * 1) LE PONT (ne pas modifier) : expose les fonctions globales que le jeu
 *    appelle (gameReady, getItem, startRewardAd, gameOver, sendScore...) et
 *    renvoie les évènements vers le jeu via c3_callFunction. Il ne connaît
 *    AUCUNE plateforme : il délègue tout au driver courant.
 *
 * 2) LE DRIVER : implémente l'interface GameDriverInterface ci-dessous.
 *    - Par défaut : LocalDriver (simulation hors-ligne complète).
 *    - Pour brancher un autre SDK : définir `window.GameDriver = monImpl`
 *      AVANT le chargement de ce fichier. Aucune autre modification requise.
 *
 * Interface à implémenter (window.GameDriver) :
 *   getAudioEnabled()               -> bool
 *   onAudioChange(cb)               -> cb(enabled: bool) à chaque changement
 *   showInterstitialAd(opts)        -> opts: {beforeAd, afterAd, adDismissed, adViewed, adBreakDone}
 *   requestRewardedAd(opts)         -> opts: {beforeReward(showAdFn), adDismissed, adViewed, afterAd, adBreakDone}
 *   showRewardedAd()                -> le joueur a accepté : diffuser la pub récompensée
 *   onGamePause(cb) / onGameResume(cb) -> évènements plateforme
 *   notifyReady() / notifyFirstFrame() / notifyGameOver()
 *   notifyLevelComplete(level) / notifyScore(score)
 *   storageGet(k) -> valeur|0 ; storageSet(k, v) ; storageRemove(k) ; storageClear()
 */
(function () {
  "use strict";

  // ==================================================================
  // DRIVER PAR DÉFAUT : LocalDriver (simulation hors-ligne, sans réseau)
  // ==================================================================
  const OLD_PREFIX = "gs_local_"; // ancien préfixe (migration automatique)
  const PREFIX = "local_save_";

  function LocalDriver() {
    // --- Storage local persistant (migration de l'ancien préfixe) ---
    try {
      Object.keys(localStorage)
        .filter(function (k) { return k.indexOf(OLD_PREFIX) === 0; })
        .forEach(function (k) {
          const nk = PREFIX + k.slice(OLD_PREFIX.length);
          if (localStorage.getItem(nk) === null) localStorage.setItem(nk, localStorage.getItem(k));
        });
    } catch (e) { /* ignore */ }

    this._audioEnabled = true;
    this._audioSubs = [];
    this._pauseSubs = [];
    this._resumeSubs = [];
    this._rewardOpts = null;
    this._rewardShown = false;
    this._pendingRewardResolve = null;
  }

  LocalDriver.prototype._log = function () {
    if (typeof console !== "undefined") console.log.apply(console, ["[GameDriver:local]"].concat([].slice.call(arguments)));
  };

  // --- Audio ---
  LocalDriver.prototype.getAudioEnabled = function () { return this._audioEnabled; };
  LocalDriver.prototype.onAudioChange = function (cb) {
    if (typeof cb === "function") this._audioSubs.push(cb);
    // Notifie l'état initial (asynchrone, le temps que le runtime s'initialise)
    const self = this;
    setTimeout(function () { try { cb(self._audioEnabled); } catch (e) { /* ignore */ } }, 0);
  };
  LocalDriver.prototype.setAudioEnabled = function (v) {
    this._audioEnabled = !!v;
    const self = this;
    this._audioSubs.forEach(function (cb) { try { cb(self._audioEnabled); } catch (e) { /* ignore */ } });
  };

  // --- Publicité : interstitiel ---
  LocalDriver.prototype.showInterstitialAd = function (opts) {
    const o = opts || {};
    this._log("interstitial: résolution simulée");
    setTimeout(function () {
      o.beforeAd && o.beforeAd();
      o.afterAd && o.afterAd();
      o.adBreakDone && o.adBreakDone({ breakStatus: "completed" });
    }, 50);
  };

  // --- Publicité : récompensée (flux simulé auto-résolu) ---
  LocalDriver.prototype.requestRewardedAd = function (opts) {
    const o = opts || {};
    const self = this;
    this._rewardOpts = o;
    this._rewardShown = false;
    this._log("rewarded: disponibilité simulée");
    setTimeout(function () {
      o.beforeReward && o.beforeReward(function showAdFn() {
        self._resolveReward();
      });
      // Auto-résolution : le "joueur" regarde la pub simulée tout seul
      // (garde anti double-appel intégrée dans _resolveReward).
      setTimeout(function () { self._resolveReward(); }, 600);
    }, 50);
  };

  LocalDriver.prototype.showRewardedAd = function () {
    this._log("rewarded: showRewardedAd() appelé");
    if (this._pendingRewardResolve) this._pendingRewardResolve();
  };

  LocalDriver.prototype._resolveReward = function () {
    const o = this._rewardOpts;
    if (!o || this._rewardShown) return; // anti double-appel
    this._rewardShown = true;
    this._log("rewarded: pub vue -> gratification");
    o.adViewed && o.adViewed();
    o.afterAd && o.afterAd();
    o.adBreakDone && o.adBreakDone({ breakStatus: "completed" });
  };

  // --- Évènements plateforme (pause/reprise via visibilité de l'onglet) ---
  LocalDriver.prototype._wireVisibility = function () {
    const self = this;
    document.addEventListener("visibilitychange", function () {
      const subs = document.hidden ? self._pauseSubs : self._resumeSubs;
      subs.forEach(function (cb) { try { cb(); } catch (e) { /* ignore */ } });
    });
  };
  LocalDriver.prototype.onGamePause = function (cb) { this._pauseSubs.push(cb); this._wireVisibility(); };
  LocalDriver.prototype.onGameResume = function (cb) { this._resumeSubs.push(cb); this._wireVisibility(); };

  // --- Télémétrie de jeu (no-op en local) ---
  LocalDriver.prototype.notifyReady = function () { this._log("game.ready()"); };
  LocalDriver.prototype.notifyFirstFrame = function () { this._log("game.firstFrameReady()"); };
  LocalDriver.prototype.notifyGameOver = function () { this._log("game.gameOver()"); };
  LocalDriver.prototype.notifyLevelComplete = function (lvl) { this._log("game.levelComplete(" + lvl + ")"); };
  LocalDriver.prototype.notifyScore = function (s) { this._log("score.update(" + s + ")"); };

  // --- Storage ---
  LocalDriver.prototype.storageGet = function (k) {
    try {
      const v = localStorage.getItem(PREFIX + String(k));
      return v === null ? 0 : v;
    } catch (e) { return 0; }
  };
  LocalDriver.prototype.storageSet = function (k, v) {
    try { localStorage.setItem(PREFIX + String(k), String(v)); } catch (e) { /* ignore */ }
  };
  LocalDriver.prototype.storageRemove = function (k) {
    try { localStorage.removeItem(PREFIX + String(k)); } catch (e) { /* ignore */ }
  };
  LocalDriver.prototype.storageClear = function () {
    try {
      Object.keys(localStorage)
        .filter(function (k) { return k.indexOf(PREFIX) === 0; })
        .forEach(function (k) { localStorage.removeItem(k); });
    } catch (e) { /* ignore */ }
  };

  // Point d'injection : un autre SDK peut fournir window.GameDriver avant ce fichier.
  const driver = window.GameDriver || new LocalDriver();
  window.GameDriverInstance = driver; // debug / intégrations futures

  // ==================================================================
  // PONT JEU <-> DRIVER (ne pas modifier)
  // ==================================================================

  // Appel vers le jeu, avec file d'attente tant que le runtime Construct
  // n'a pas défini c3_callFunction (sinon les appels trop précoces sont perdus).
  const pendingCalls = [];
  let polling = false;
  function callGame(fnName, args) {
    if (typeof window.c3_callFunction === "function") {
      try { window.c3_callFunction(fnName, args || []); } catch (e) { /* ignore */ }
      return;
    }
    pendingCalls.push([fnName, args]);
    if (polling) return;
    polling = true;
    const started = Date.now();
    const iv = setInterval(function () {
      if (typeof window.c3_callFunction === "function") {
        clearInterval(iv);
        while (pendingCalls.length) {
          const c = pendingCalls.shift();
          try { window.c3_callFunction(c[0], c[1] || []); } catch (e) { /* ignore */ }
        }
        polling = false;
      } else if (Date.now() - started > 15000) {
        clearInterval(iv);
        pendingCalls.length = 0;
        polling = false;
      }
    }, 100);
  }

  // --- Fonctions globales appelées par le jeu (contrat d'origine) ---

  window.gameFirstFrameReady = function () {
    console.log("gameFirstFrameReady fired..!");
    driver.notifyFirstFrame();
  };

  window.gameReady = function () {
    console.log("Game Ready fired..!");
    driver.notifyReady();
  };

  window.checkSound = function () {
    console.log("Check Sound fired..!");
    callGame("checksound", [driver.getAudioEnabled() ? 0 : 1]);
  };

  window.getItem = function (itemName) {
    console.log("getItem fired..!", itemName);
    const value = driver.storageGet(String(itemName));
    callGame("getData", [itemName, value]);
    return value;
  };

  window.setItem = function (itemName, itemValue) {
    console.log("setItem fired..!", itemName);
    driver.storageSet(String(itemName), String(itemValue));
  };

  window.removeItem = function (itemName) {
    console.log("removeItem fired..!", itemName);
    driver.storageRemove(String(itemName));
  };

  window.clearData = function () {
    console.log("clearData fired..!");
    driver.storageClear();
  };

  window.sendScore = function (score) {
    console.log("sendScore fired..!", score);
    driver.notifyScore(score);
  };

  window.gameOver = function () {
    console.log("gameOver fired..!");
    driver.notifyGameOver();
  };

  window.levelComplete = function (level) {
    console.log("LevelComplete fired..!", level);
    driver.notifyLevelComplete(parseInt(level, 10));
  };

  window.displayAd = function () {
    console.log("Interstitial --> displayAd called");
    driver.showInterstitialAd({
      beforeAd: function () { callGame("checksound", [1]); },
      afterAd: function () { callGame("checksound", [0]); window.checkSound(); },
      adDismissed: function () { console.log("Interstitial --> Ad dismissed"); },
      adViewed: function () { console.log("Interstitial --> Ad viewed"); },
      adBreakDone: function (placementInfo) { console.log("Interstitial --> Ad break done:", placementInfo); },
    });
  };

  let showAdFnRef = null;

  window.displayRewardAd = function () {
    console.log("Rewarded Ad --> displayRewardAd called");
    driver.requestRewardedAd({
      beforeReward: function (showAdFn) {
        showAdFnRef = showAdFn;
        callGame("displayAdPrompt", [0]);
        console.log("reward ad is AVAILABLE");
      },
      adDismissed: function () {
        console.log("reward ad dismissed");
        callGame("adNotAvailable", [0]);
      },
      adViewed: function () {
        console.log("reward ad complete GRATIFYING now");
        callGame("gratifyUser", [0]);
        callGame("checksound", [0]);
        window.checkSound();
      },
      afterAd: function () { window.checkSound(); },
      adBreakDone: function (placementInfo) { console.log("Rewarded Ad --> Ad break done:", placementInfo); },
    });
  };

  window.startRewardAd = function () {
    console.log("startRewardAd called");
    if (showAdFnRef) {
      console.log("showing reward AD");
      showAdFnRef();
      callGame("checksound", [1]);
    } else {
      console.log("showAdFnRef >>", showAdFnRef);
      window.checkSound();
      callGame("adNotAvailable", [0]);
    }
  };

  // --- Abonnement audio : le driver prévient à chaque changement ---
  driver.onAudioChange(function (isEnabled) {
    console.log(isEnabled ? "Set Sound on" : "Set Sound off");
    callGame("checksound", [isEnabled ? 0 : 1]);
    if (isEnabled) window.checkSound();
  });

  // --- Pause / reprise plateforme ---
  driver.onGamePause(function () {
    console.log("Game Paused fired..!");
    callGame("gamePause", [0]);
  });
  driver.onGameResume(function () {
    console.log("Game Resumed fired..!");
    callGame("gameResume", [0]);
  });

  console.log("[game-adapter] pont chargé — driver:", window.GameDriver ? "injected" : "local (hors-ligne)");
})();

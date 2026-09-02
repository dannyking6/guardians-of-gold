let showAdFnRef = null;

function startRewardAd() {
    console.log("startRewardAd called");
    if (showAdFnRef) {
        console.log("showing reward AD");
        showAdFnRef();
        c3_callFunction("checksound", [1]);
    } else {
        console.log("showAdFnRef >> ", showAdFnRef);
        checkSound();
        c3_callFunction("adNotAvailable", [0]);
    }
}

// ----------------------------------

// Interstitial Ad integration

function displayAd() {
    console.log('Interstitial --> displayAd called');
    GameSnacks.ad.break({
        type: 'next',
        name: 'play_interstitial_ad',
        beforeAd: () => {
            console.log('Interstitial --> Before ad call here:');

            c3_callFunction("checksound", [1]);
        },
        afterAd: () => {
            console.log('Interstitial --> After ad call here:');

            c3_callFunction("checksound", [0]);
            checkSound();
        },
        adDismissed: () => {
            console.log('Interstitial --> Ad dismissed call here:');
        },
        adViewed: () => {
            console.log('Interstitial --> Ad viewed call here:');
        },
        adBreakDone: (placementInfo) => {
            console.log('Interstitial --> Ad break done call here:', placementInfo);
        },
    });
}

// ----------------------------------

// Rewarded Ad integration

function displayRewardAd() {
    console.log('Rewarded Ad --> displayRewardAd called');
    GameSnacks.ad.break({
        type: 'reward',
        name: 'reward_ad',
        beforeAd: () => {
            console.log('Rewarded Ad --> Before ad call here:');
            console.log("displayRewardAd >> beforeAd fired!");

            
        },
        afterAd: () => {
            console.log('Rewarded Ad --> After ad call here:');            
            checkSound();            
        },
        beforeReward: (showAdFn) => {
            console.log('Rewarded Ad --> Before reward ad call here:');
            showAdFnRef = showAdFn;
            c3_callFunction("displayAdPrompt", [0]);
            console.log("reward ad is AVAILABLE");
        },
        adDismissed: () => {
            console.log('Rewarded Ad --> Ad dismissed call here:');

            c3_callFunction("adNotAvailable", [0]);
            console.log("reward ad dismissed");
        },
        adViewed: () => {
            console.log('Rewarded Ad --> Ad viewed call here:');

            console.log("reward ad complete GRATIFYING now");
            c3_callFunction("gratifyUser", [0]);
            c3_callFunction("checksound", [0]);
            checkSound();
        },
        adBreakDone: (placementInfo) => {
            console.log('Rewarded Ad --> Ad break done call here:', placementInfo);
        },
    });
}

// Audio handling integration
function checkSound() {
    console.log("Check Sound fired..!");
    if (GameSnacks.audio.g == true) {
        console.log("Check Sound -- is on", GameSnacks.audio.g);
        c3_callFunction("checksound",[0]);
    } else {
        console.log("Check Sound -- is off", GameSnacks.audio.g);
        c3_callFunction("checksound",[1]);
    }
}

GameSnacks.audio.subscribe((isEnabled) => {
  if (isEnabled) {
      console.log("Set Sound on");
      c3_callFunction("checksound", [0]) ? c3_callFunction("checksound", [0]) : null;
      checkSound();
  } else {
      console.log("Set Sound off");
      c3_callFunction("checksound", [1]) ? c3_callFunction("checksound", [1]) : null;
  }
});

// Game Over integration

function gameOver() {
    console.log("gameOver fired..!");
    GameSnacks.game.gameOver();
}

// Level Complete Integration
function levelComplete(level) {
    console.log("LevelComplete fired..!",level);
    GameSnacks.game.levelComplete(parseInt(level));
}

// First Frame Ready integration
function gameFirstFrameReady() {
    console.log("gameFirstFrameReady fired..!");
    GameSnacks.game.firstFrameReady();
}

// Game Paused integration
GameSnacks.game.onPause(() => {
    console.log("Game Paused fired..!");
    c3_callFunction("gamePause", [0]);
});

// Game Resumed integration
GameSnacks.game.onResume(() => {
    console.log("Game Resumed fired..!");
    c3_callFunction("gameResume", [0]);
});

// Game Ready integration
function gameReady() {
    console.log("Game Ready fired..!");
    GameSnacks.game.ready();
}

// Game Score integration
function sendScore(score) {
    console.log("sendScore fired..!", score);
    GameSnacks.score.update(score);
}

// Game Storage Integration
function clearData() {
    console.log("clearData fired..!");
    GameSnacks.storage.clear();
}

// Get Item Integration
function getItem(itemName) {
    console.log("getItem fired..!", itemName);
    let starsEarned = GameSnacks.storage.getItem(itemName);
    // console.log("getItem retrieved:", starsEarned);
    c3_callFunction("getData", [itemName, starsEarned]);
    console.log("getItem fired:", itemName, starsEarned);
    return starsEarned;
}

// Remove Item Integration
function removeItem(itemName) {
    console.log("removeItem fired..!", itemName);
    GameSnacks.storage.removeItem(itemName);
}

// Set Item Integration
function setItem(itemName, itemValue) {
    console.log("setItem fired..!");
    GameSnacks.storage.setItem(String(itemName), String(itemValue));
}

// ----------------------------------
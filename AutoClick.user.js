// ==UserScript==
// @name         AutoClick
// @version 2.0.0
// @include /https?://orteil.dashnet.org/cookieclicker/
// ==/UserScript==
var clicksAtOnce = 1;
var intoTheAbyss = function() {
    for(var i = 0; i < clicksAtOnce; i++) {
        Game.ClickCookie();
        Game.lastClick = 0;
    }
};

const autoClickUser = setInterval(function() {
    const Game = unsafeWindow.Game;
    if (typeof Game !== 'undefined' && typeof Game.ready !== 'undefined' && Game.ready) {
        if (Game.hasBuff('Click frenzy') || Game.hasBuff('Cursed finger')||Game.hasBuff('Dragonflight')) intoTheAbyss();
    }
}, 100);


const autoCookie = setInterval(function() {
    Game.shimmers.forEach(function(shimmer) {
        if (shimmer.type == "golden" || shimmer.type == 'reindeer') { shimmer.pop(); }
    })
}, 500);
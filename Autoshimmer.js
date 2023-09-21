// ==UserScript==
// @name         Autoshimmer
// @include /https?://orteil.dashnet.org/cookieclicker/
// ==/UserScript==

const autoCookie = setInterval(function() {
    Game.shimmers.forEach(function(shimmer) {
        if (shimmer.type == "golden" || shimmer.type == 'reindeer') { shimmer.pop(); }
    })
}, 500);
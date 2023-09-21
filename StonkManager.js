// ==UserScript==
// @name         StonkManager
// @include /https?://orteil.dashnet.org/cookieclicker/
// ==/UserScript==

// Completely experimental Stock Market manager.

/*
// Get current resource averages. Run whenever curious. Displays Ticker Symbol, % Change In Last Tick, Current Average in console.
// You will have to copy this code into the console separately.
for (i = 0; i < resourceAverage.length; i++) {
console.log(document.querySelector("#bankGood-" + i + " > div:nth-child(1) > div:nth-child(2)").innerText + " " + resourceAverage[i]);
}

*/
/**TODO the way this is designed it only works when the stock market menu is opened, if it's closed on the 55 seconds it will spam the analysing of the values, maybe see if there is a more elegant way to check the value probably possible, seems to be info saved somewhere in the Game variable, for now hacked by a auto open function.

 */
// Stops the machine from marching forward.
clearInterval(StonkManager);

let reset = false; //By default, StonkManager saves data between sessions, this flag is used to reset the stored data. Set to true and reload to reset data. Don't forget to turn it back off on subsequenct loads
const autoOpen = true; //In the current design StonkManager only works if the stock market is opened, when this flag is enabled the StonkManager will automatically open this. This is useful between ascensions
const buildingAmount = 18; // The amount of buildings with the stock market. I.e. Cursor and Grandmas don't have a stock so 20 - 2 = 18. The current version of cookie clicker should have all buildings ever to be added so unless playing an odler version this number should never need to be changed
const printing = true; // Enable printing of data in the javascript console, information like what the averages are and what is bought.
const maxTicks = 2000; // The maximum amount of ticks the average will be calculated over. Stays on that tick once maxTicks is reached. Default 2000.

var resourceAverage = [];
// Initializes resource values for averaging over time
// Checks whether there already exists resource values and uses them unless the data should be reset
if (localStorage.getItem("StonkAvg") === undefined || reset) {
	print("StonkManager data reset");
	reset = true;
	for (let i = 0; i < buildingAmount; i++)
		resourceAverage.push(i);
	localStorage.setItem("StonkAvg", JSON.stringify(resourceAverage));
} else{
	print("Getting resource average from localstorage.")
	try{
		resourceAverage = JSON.parse(localStorage.getItem("StonkAvg"));
	} catch (error) {
		console.error(error);
		//When trying to read the existing data on a new run it breaks, so catch if that happens and then just reset the values

		//TODO make a reset function so code isn't duplicated
		reset = true;
		print("failed to get resource average from localstorage so resetting.");
		console.log(localStorage.getItem("StonkAvg"));
		for (let i = 0; i < buildingAmount; i++)
			resourceAverage.push(i);
		localStorage.setItem("StonkAvg", JSON.stringify(resourceAverage));
	}
}
// Begins tracking the number of ticks which have occurred since starting the script. Useful for long averages.
if (localStorage.getItem("ticks") === undefined || reset)
	localStorage.setItem("ticks", 1);

//These set how wide a swing in price you want.
// The multiplier for the max price to buy. Will be multiplied against running average price.
var buyMaxMult = .7;

// The multiplier for min price to sell. Will be multiplied against running average price.
var sellMinMult = 1.3;


// Timer for Stonks
var StonkManager
const readyCheck = setInterval(() => {
	print("Waiting for game to startup before being able to properly boot StonkManager ");
	const Game = unsafeWindow.Game;

	if (typeof Game !== 'undefined' && typeof Game.ready !== 'undefined' && Game.ready) {
		if (document.querySelector("#bankNextTick").innerText === '' && autoOpen){
			Game.ObjectsById[5].switchMinigame(1);
			print("The Stocks minigame has been opened.");
		}
		if (reset){
			print("Performing first time setup of the stocks averages.")
			for (let i = 0; i < resourceAverage.length; i++) {
				var currValDollar = document.querySelector("#bankGood-" + i + "-val").innerText;
				console.log(`price ${i} : ${currValDollar} `);
				resourceAverage[i] = 1 * currValDollar.substring(1);
			}
		}
		localStorage.setItem("StonkAvg", JSON.stringify(resourceAverage));
		print(resourceAverage)
		StonkManager = setInterval(function() {

			Stonks();

		}, 1000);
		clearInterval(readyCheck); //The game is now ready so no longer try to boot.
	}
}, 1000);

// Gets the current tick from game data.
function getTick(){
	const M = Game.ObjectsById[5].minigame;
	return Game.sayTime((Game.fps*M.secondsPerTick)-M.tickT+30,-1).split(/(\s+)/)[0];
}


let prevTick;
// Controller
function Stonks(){
	if (Game.ObjectsById[5].amount === 0){
		print("No banks have been bought, so the stocks minigame is not active. Not doing anything.");
		return;
	}
	const cur = getTick();
	if ((cur === prevTick || cur === '')&&autoOpen){
		Game.ObjectsById[5].switchMinigame(1);
		print("The Stocks minigame has been opened.");
	}
	prevTick = cur;
	let ticks = localStorage.getItem("ticks");
	if (cur == 55) {
		print(`StonkManager tick ${ticks}`);
		if (ticks < maxTicks) {
			ticks = parseInt(ticks) + 1;
			localStorage.setItem("ticks", ticks);
		}
		updateAverages(ticks);
		BuySell();
	}
}

// Updates the knowledge of the stock's averages over time
function updateAverages(ticks){
	print("updating averages")
	var i;
	for (i = 0; i < resourceAverage.length; i++) {
		var currValDollar = document.querySelector("#bankGood-" + i + "-val").innerText;
		var currVal = 1*currValDollar.substring(1);
		resourceAverage[i] = (currVal - resourceAverage[i]) * (1 / ticks) + resourceAverage[i];
	}
	print("new averages: ");
	print(resourceAverage);
	localStorage.setItem("StonkAvg", JSON.stringify(resourceAverage));
}

// Controls the Buy/Sell logic.
function BuySell(){
	print("checkling whether anything can be bought or sold.")
	for (let i = 0; i < resourceAverage.length; i++) {
		var currValDollar = document.querySelector("#bankGood-" + i + "-val").innerText;
		var currVal = 1*currValDollar.substring(1);
		if (currVal < (resourceAverage[i] * buyMaxMult)) {
			buyResource(i);
		}
		else if (currVal > (resourceAverage[i] * sellMinMult)) {
			sellResource(i);
		}
		else {
		}
	}
}

// Purchases a resource
function buyResource(resNum){
	let curAm = parseFloat(document.querySelector(`#bankGood-${resNum}-stock`).innerText.replace(/,/g, ''));
	let maxAm = parseFloat(document.querySelector(`#bankGood-${resNum}-stockMax`).innerText.slice(1).replace(/,/g, ''));
	print(`tryBuy ${resNum} : ${curAm}`);

	// Check whether the amount you currently have of the good is less than the max amount you can have.
	if (curAm < maxAm){
		print(`buy ${resNum}`);
		document.querySelector("#bankGood-" + resNum + "_Max").click();
	}
}

// Sells a resource
function sellResource(resNum){
	print(`trySell ${resNum}  : ${document.querySelector(`#bankGood-${resNum}-stock`).innerText}`);

	// Check whether you have anything to sell.
	if (parseFloat(document.querySelector(`#bankGood-${resNum}-stock`).innerText) > 0){
		print(`sell ${resNum}`);
		document.querySelector("#bankGood-" + resNum + "_-All").click();
	}
}

// Wrapper for console logs with the printing flag check.
function print(message){
	if (printing)
		console.log(message);
}
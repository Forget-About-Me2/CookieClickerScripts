// ==UserScript==
// @name         AutoPantheon
// @include /https?://orteil.dashnet.org/cookieclicker/
// ==/UserScript==

// Define at which times the pantheon should switch, in minutes since midnight. Times based on UTC times. times need to be sorted for the program to work correctly.
const switchTimes = [
    0,              // 00:00
    72,             // 01:12
    240,            // 04:00
    559,            // 09:19
    620,            // 10:20
    720,            // 12:00
    792,            // 13:12
    862,            // 14:22
    1080,           // 18:00
    1170,           // 19:30
    1260,           // 21:00
    1350,           // 22:30
];

// Definitions on what the pantheon should look like at a certain time. This is the main definition and should have priority
// These times are relative close to each other with not a lot of wriggle room in the morning, it could easily go wrong messing up swap times.
// A check is needed for the amount of swaps left to determine whether a swap is desirable and what happens when you shouldn't.
const timeDefinitions = {
    0:["ages", "order", -1], // 1 swap
    72:["order", "ages", -1], // 1 swap
    240:["order", -1, "ages"], // 1 swap
    559:["ages", -1, "order"], // 1 swap
    620:["order", -1, "ages"], // 1 swap
    720:["ages", -1, "order"], // 1 swap
    792:[-1, "ages", "order"], // 1 swap
    862:["order", "ages", -1], // 1 swap
    1080:["ages", "order", -1], // 1 swap
    1170:[-1, "order", -1], // 0 swap
    1260:["ages", "order", -1], // 1 swap
    1350:[-1, "order", -1] // 0 swap
}

// The acceptable lists are used when there is no swap available to swap the god to the right spot, but it's currently in a slot that might be fine too.
const DiamondAcceptable = [[0, 90], [180, 270], [360, 450], [540,630], [720,810], [900, 990], [1080, 1170], [1260, 1350]] // Times between which it's acceptable to have the god of ages in the Jade slot
const RubyAcceptable = [[0, 360], [720, 1080]] // Times between which it's acceptable to have the god of ages in the Ruby slot
const JadeAcceptable = [[0, 720]] // Times between which it's acceptable to have the god of ages in the Diamond slot

const acceptablePerSlot = [DiamondAcceptable, RubyAcceptable, JadeAcceptable];

const printing = true; // Enable printing of data in the javascript console, information like what the averages are and what is bought.

//Priority of which god needs to be put to the correct spot first, if no swaps are left some might not be done.
// All gods mentioned in timeDefinitions need to be mentioned here, or they won't be moved.
let godPriority = ["ages", "order"];
let godPriorityCastToIndex = false;

let startCurTimeFrameIndex = 0; //The index of the start time of the current time frame
let endCurTimeFrameIndex = 0; // The index of the end time of the current time frame

let curTimeFrameDefinitions; //The definitions of the current timeframe.

let curTimeStamp;
let minFromMidnight;

let changedTimeFrame = true;
let correctGods = false;

let M;



let autoPantheonUser;
const readyCheck = setInterval(() => {
    print("Waiting for game to startup before starting AutoPantheon.");

    const Game = unsafeWindow.Game;

    if (typeof Game !== 'undefined' && typeof Game.ready !== 'undefined' && Game.ready && typeof Game.ObjectsById[6].minigame !== 'undefined') {
        M = Game.ObjectsById[6].minigame;
        if (!godPriorityCastToIndex){
            godPriority = GodNameToIndex(godPriority);
            godPriorityCastToIndex = true;
        }
        calculatePantheon(); // Initial calculation to set things correct on startup.
        autoPantheonUser = setInterval(() => {
            calculatePantheon();
        }, 150000); //Calculate god slots every 5 minutes.
        clearInterval(readyCheck);
    }
}, 1000);

function calculatePantheon(){
    print("Calculate Pantheon.");
    M = Game.ObjectsById[6].minigame;
    updateTimeFrame();
    if (!changedTimeFrame && correctGods) return;
    if (changedTimeFrame){
        const timeFrame = switchTimes[startCurTimeFrameIndex];
        if (typeof timeFrame === 'undefined') {
            print("Found timeFrame does not have a time definition.");
            return;
        }
        curTimeFrameDefinitions = GodNameToIndex(timeDefinitions[timeFrame]);
    }

    syncGodsToTimeFrame();
}

function updateTimeFrame(){
    curTimeStamp = new Date();
    const hours = curTimeStamp.getUTCHours()
    const min = curTimeStamp.getUTCMinutes();

    minFromMidnight = (60*hours) + min;

    if (endCurTimeFrameIndex && minFromMidnight < switchTimes[endCurTimeFrameIndex])
        return;

    changedTimeFrame = true;
    // Define between which times you are
    while(startCurTimeFrameIndex < switchTimes.length - 1) {
        const curTime = switchTimes[startCurTimeFrameIndex];
        const nextTime = switchTimes[startCurTimeFrameIndex+1];
        // Check if this is the timeFrame we're in.
        if (minFromMidnight >= curTime && minFromMidnight < nextTime){
            endCurTimeFrameIndex = startCurTimeFrameIndex + 1;
            return;
        }
        startCurTimeFrameIndex++;
    }

    // If you here it's probably true that you're before midnight, either just before or just after so two cases.
    if (startCurTimeFrameIndex === switchTimes.length - 1){
        endCurTimeFrameIndex = 0
        return;
    }

    if (endCurTimeFrameIndex === 0){
        startCurTimeFrameIndex = 0;
        endCurTimeFrameIndex = 1;
    }
}

function syncGodsToTimeFrame(){
    let moveto = []; // overview of which slots will be moved to, to prevent double moves.
    let moveFrom = [-1, -1, -1] // overview from where gods are move to X slot. -1 means not moved from a different slot.
    let switches = []; //priority.
    let unslot = [];
    let curSlots = M.slot;
    print(`current state ${curSlots}`);
    print(`desired outcome ${curTimeFrameDefinitions}`);

    for (let i = 0; i < curSlots.length; i++) {
        let remainingRange = [...Array(curSlots.length).keys()];
        remainingRange.splice(i, 1);
        if (curSlots[i] !== curTimeFrameDefinitions[i]) {
            if (moveto.includes(i) && moveFrom[i] != -1){
                // This god is already moved, don't do it twice.
                break;
            }
            let found = false;
            for (let j of remainingRange) {
                if (curSlots[i] === curTimeFrameDefinitions[j] && curTimeFrameDefinitions[j] !== -1) {
                    switches.push([curSlots[i], j]);
                    moveto.push(j)
                    moveFrom.push(i);
                    found = true;
                    break;
                }
            }
            // If not found god needs to be unsloted
            if (!found && curSlots[i] !== -1) {
                unslot.push(curSlots[i]);
            } else if (!found){
                switches.push([curTimeFrameDefinitions[i], i]);
            }
        }
    }
    unslotList(unslot);
    moveGods(switches);

}

// Sets the current time frame definitions with the god names mapped to their index.
function GodNameToIndex(definitions){
    let result = [];
    for (const definition of definitions){
        if (definition === -1)
            result.push(definition);
        else {
            result.push(M.gods[definition].id);
        }
    }
    return result;
}

function unslotList(list){
    print(`unslotting : ${list}`);
    for (let godId of list){
        var div=l(`templeGod${godId}`);
        var other = l(`templeGodPlaceholder${godId}`);
        other.parentNode.insertBefore(div,other);
        other.style.display='none';
        M.slotGod(M.godsById[godId],-1);
    }
}

function moveGods(list){
    let movesList = sortMovesByPriority(list);
    print(`moving gods : ${JSON.stringify(movesList)}`);
    // A lot of this code is immediately copied from the original code of cookie clicker to do the swap function. With minor changes to work with this.
    for(let move of movesList){
        const curGod = M.godsById[move[0]];
        let prev = M.slot[move[1]]; // Get  the god on the slot that the new god is dropped on.
        if (M.swaps < 3){
            print(`A swap is needed but less than 3 swaps remain none is done to prevent using up all slots`);
            if ((curGod.id === 3 && curGod.slot !== -1 && !isAcceptable(acceptablePerSlot[curGod.slot], minFromMidnight))
                || (prev !== -1 && prev.id == 3 && !isAcceptable(acceptablePerSlot[move[1]], minFromMidnight))){
                print( `unslot god of ages to prevent negative boost`);
                unslotList([3]); //Temporary dirty patch to not have the game overuse slots when you just boot it. Without leaving the god of ages to give a negative multiplier
            }
            break;
        }
        let div = l(`templeGod${curGod.id}`);
        if (swapPrevention(curGod, move[1])){
            print(`didn't swap gods because it would create a problem before the next switch and the current state is save`);
            break;
        }
        print(`moved god: ${curGod.name}`);
        M.useSwap(1);
        M.lastSwapT=0;
        if (prev !== -1){
            prev = M.godsById[prev];
            print(`Swapped with: ${prev.name}`);
            const prevDiv = l(`templeGod${prev.id}`);
            if (curGod.slot !== -1)
                l(`templeSlot${curGod.slot}`).appendChild(prevDiv);
            else {
                const other = l(`templeGodPlaceholder${prev.id}`);
                other.parentNode.insertBefore(prevDiv, other);
            }
        }
        l(`templeSlot${move[1]}`).appendChild(div);
        M.slotGod(curGod, move[1]);
    }
}

// Flags if a swap needs to be prevented in order to not get in trouble with swaps later
function swapPrevention(god, moveTo){
    print("Check if swap needs to be prevented");
    if (minFromMidnight + 60 < switchTimes[endCurTimeFrameIndex])
        return false; // The switch happens far enough away from the next timeframe that the swap will be regenerated before the next timeframe so it's safe.
    if (god.id != 3)
        return true; // If it's not the god of ages the position of the god is irrelevant, so it can safely stay in its slot.
    if (god.slot != -1 && !isAcceptable(acceptablePerSlot[god.slot], minFromMidnight))
        return false; // If the current state of the god is an illegal one just swap, this can cause a swaps issue later but something needs to be done.
    if (isAcceptable(acceptablePerSlot[moveTo], switchTimes[endCurTimeFrameIndex], minFromMidnight + 60))
        return false; // The state the swap results in till the next refresh is fine, so swapping is fine
    return true; // Don't swap, the current state is acceptable and a swap will result in a not acceptable state down the line.
}

// Sorts the move list by the priority of which god needs to be moved ot the correct spot first.
// This is a relatively naive and not efficient sort, but that doesn't really matter as it doesn't need to be.
function sortMovesByPriority(movesList){
    let result = [];
    for (let i = 0; i < godPriority.length; i++){
        let moveIndex = -1;
        for (let j = 0; j < movesList.length; j++){
            if (movesList[j][0] === godPriority[i]){
                moveIndex = j;
                break;
            }
        }
        if (moveIndex !== -1){
            result.push(movesList[moveIndex]);
            movesList.splice(moveIndex, 1);
        }
    }
    return result;
}

// Check whether the given acceptable list is acceptable for the current time.
function isAcceptable(acceptableList, startRange, endRange){
    print("Check whether it's okay to leave the god of ages in its current slot.");
    if (!endRange) endRange = startRange;
    let startTime, endTime
    for ([startTime, endTime] of acceptableList){
        if (startTime <= startRange && endRange <= endTime){
            print("It is fine to have the god of ages in the given slot at the checked time.");
            return true;
        }
    }
    return false;
}

// Wrapper for console logs with the printing flag check.
function print(message){
    if (printing)
        console.log(message);
}
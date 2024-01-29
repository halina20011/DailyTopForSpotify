import {DaySelector} from "./daySelector.js";

console.log("I live <3");

const songsHolder = document.getElementById("songsHolder");

const songsView = document.getElementById("songsView");

let songsViewType = "line";
songsHolder.classList.add("songLineStyle");
const toggleSongLineStyle = document.querySelector(".toggleSongLineStyle");
toggleSongLineStyle.addEventListener("click", () => {
    songsViewType = "line";
    songsHolder.classList.add("songLineStyle");
    songsHolder.classList.remove("songBoxStyle");
    toggleSongLineStyle.classList.add("active");
    toggleSongBoxStyle.classList.remove("active");
}, false);

const toggleSongBoxStyle = document.querySelector(".toggleSongBoxStyle");
toggleSongBoxStyle.addEventListener("click", () => {
    songsViewType = "box";
    songsHolder.classList.add("songBoxStyle");
    songsHolder.classList.remove("songLineStyle");
    toggleSongBoxStyle.classList.add("active");
    toggleSongLineStyle.classList.remove("active");
}, false);

Date.prototype.format = function(){
    const year = this.getFullYear();
    const month = (this.getMonth() + 1).toString().padStart(2, '0');
    const day = this.getDate().toString().padStart(2, '0');
    const hours = this.getHours().toString().padStart(2, '0');
    const minutes = this.getMinutes().toString().padStart(2, '0');
    const seconds = this.getSeconds().toString().padStart(2, '0');

    return `${hours}:${minutes}:${seconds} ${day}/${month}/${year}`;
}

Date.prototype.yesterday = function(){
    let _yesterday = new Date(this);
    _yesterday.setHours(_yesterday.getHours() - 24);
    return _yesterday;
}

function sortByPlaybacks(allSongs){
    // let playbacks = {};
    // allSongs.forEach((song) => {
    //     if(playbacks[song.id] == undefined){
    //         playbacks[song.id] = [];
    //     }
    //     playbacks[song.id].push(song);
    // });

    // console.log(playbacks);
    const playbacksArray = Object.entries(allSongs);
    // console.log(playbacksArray);
    playbacksArray.sort((a, b) => b[1].playedAt.length - a[1].playedAt.length);
    console.log(playbacksArray);
    // let allSortedSongs = playbacksArray.map(([key, value], i) => {return {id:i, items:value}; });
    let allSortedSongs = Object.fromEntries(playbacksArray);
    // const sortedPlaybacks = playbacksArray.map(([key, value]) => ({ id: key, items: value }));

    return allSortedSongs;
}

function createElement(htmlString){
    const tempElement = document.createElement("div");
    tempElement.innerHTML = htmlString;

    const element = tempElement.firstElementChild;
    tempElement.removeChild(element);

    return element;
}

HTMLElement.prototype.appendChildren = function(...args){
    for(const arg of args){
        this.appendChild(arg);
    }
};

function createEntries(allOutputs){
    songsHolder.innerHTML = "";
    Object.keys(allOutputs.allSongs).forEach(id => {
        const song = allOutputs.allSongs[id];
        const songElement = createElement(`<div class="song"></div>`);
        const artists = (allOutputs.allSongs[id].artists.map(artist => artist.name)).join(", ");
        songElement.innerHTML = `
            <div class="firstLine">
                <img class="image" src="${song.image.url}" alt="${song.name}">
                <div>
                    <div class="songName">${song.name}</div>
                    <div class="artistNames">${artists}</div>
                </div>
            </div>
            <div class="playedAtHolder">
                <div class="playedAtInfo">
                    <button id="toggleButton"></button>
                    <p>${song.numberOfPlaybacks}</p>
                </div>
                <div class="playedAt hidden" id="playedAt"></div>
            </div>
        `;
        const playedAtEl = songElement.querySelector("#playedAt");
        const playedAtHolder = songElement.querySelector(".playedAtHolder");
        playedAtHolder.addEventListener("click", () => {
            playedAtEl.classList.toggle("hidden");
        }, false);

        let playedAt = song.playedAt.map(d => new Date(d));
        playedAt.sort((a, b) => b.getTime() - a.getTime());
        playedAt.forEach((time, i) => {
            let playedAtElement = document.createElement("div");
            playedAtElement.innerHTML = `<div>${i + 1}</div><div>${time.format()}</div>`;
            playedAtEl.appendChild(playedAtElement);
        });
        songsHolder.appendChild(songElement);
    });
}

// first join all songs and sort them and apply filters if needed
// TODO: sort by number of playes, artist
// TODO: filters
function createSongs(allOutputs){
    console.log(allOutputs);
    let allSongs = [];
    let numberOfSong = 0;
    // Object.keys(allOutputs.playedSongs).forEach((id) => {
    //     const output = allOutputs[outputKey];
    //     const playedSongs = output.playedSongs;
    //     Object.keys(playedSongs).forEach((i) => {
    //         allSongs.push(playedSongs[i]);
    //     });
    //     numberOfSong += output.numberOfSongs;
    // });
    // console.log(allSongs);
    // allOutputs.allSongs 
    allOutputs.allSongs = sortByPlaybacks(allOutputs.allSongs);
    createEntries(allOutputs);
}

// dates: date object or array of date objects
function requestSavedSongs(dates){
    if(!Array.isArray(dates)){
        dates = [dates];
    }
    console.log(dates);

    const datesObj = {"dates": dates};
    fetch("/api/songs", {
        method: "POST",
        cache: "no-cache",
        headers: {
            "Content-Type": "application/json",
        },
        body: JSON.stringify(datesObj)
    }).then((response) => {
        if(response.status == 200){
            response.json().then(a => {
                // console.log(a);
                createSongs(a);
            });
        }
    }).catch(error => {
        console.error(error);
    });
}

let leftColumn = document.querySelector(".leftColumn");
let daySelector = new DaySelector(leftColumn, new Date());
daySelector.submit.addEventListener("click", _ => {
    const selected = daySelector.selected();
    requestSavedSongs(selected);
    // console.log("UwU");
}, false);

let thisDay = new Date();
requestSavedSongs(new Date());

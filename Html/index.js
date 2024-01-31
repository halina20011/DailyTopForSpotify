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

function sortByPlaybackCount(songs){
    // let playbacks = {};
    // allSongs.forEach((song) => {
    //     if(playbacks[song.id] == undefined){
    //         playbacks[song.id] = [];
    //     }
    //     playbacks[song.id].push(song);
    // });

    // console.log(playbacks);
    const playbacksArray = Object.entries(songs);
    // console.log(playbacksArray);
    playbacksArray.sort((a, b) => b[1].playbackCount - a[1].playbackCount);
    // let allSortedSongs = playbacksArray.map(([key, value], i) => {return {id:i, items:value}; });
    const allSortedSongs = Object.fromEntries(playbacksArray);
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

function createEntries(songs, songsInfo){
    console.log(songs);
    console.log(songsInfo)

    songsHolder.innerHTML = "";
    Object.keys(songs).forEach(key => {
        console.log(songs[key].playbackCount);
        const song = songs[key];
        const songId = song.songId;
        const songInfo = songsInfo[songId];
        const songElement = createElement(`<div class="song"></div>`);
        const artists = (songInfo) ? (songInfo.artists.map(artist => artist.name)).join(", ") : "";
        const image = (songInfo) ? songInfo.image : null;
        songElement.innerHTML = `
            <div class="firstLine">
                <img class="image" src="${image}" alt="${song.name}">
                <div>
                    <div class="songName">${song.name}</div>
                    <div class="artistNames">${artists}</div>
                </div>
            </div>
            <div class="playedAtHolder">
                <div class="playedAtInfo">
                    <button id="toggleButton"></button>
                    <p>${song.playbackCount}</p>
                </div>
                <div class="playedAt hidden" id="playedAt"></div>
            </div>
        `;

                    // <p>${song.numberOfPlaybacks}</p>
        const playedAtEl = songElement.querySelector("#playedAt");
        const playedAtHolder = songElement.querySelector(".playedAtHolder");
        playedAtHolder.addEventListener("click", () => {
            playedAtEl.classList.toggle("hidden");
        }, false);

        const playedAt = song.playedAt.map(d => new Date(d));
        playedAt.sort((a, b) => b.getTime() - a.getTime());
        playedAt.forEach((time, i) => {
            const playedAtElement = document.createElement("div");
            playedAtElement.innerHTML = `<div>${i + 1}</div><div>${time.format()}</div>`;
            playedAtEl.appendChild(playedAtElement);
        });

        songsHolder.appendChild(songElement);
    });
}

// first join all songs and sort them and apply filters if needed
// TODO: sort by number of playes, artist
// TODO: filters
function createSongs(songs){
    // console.log(songs);
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
    songs = sortByPlaybackCount(songs);
    const songIds = Array.from(new Set(Object.keys(songs).map(songKey => songs[songKey].songId)));
    requestSongInfo(songIds, (songInfo) => {
        createEntries(songs, songInfo);
    })
}

function dateStamp(date){
    console.log(date);
    const d = String(date.getDate()).padStart(2, '0');
    const m = String(date.getMonth() + 1).padStart(2, '0');
    const y = String(date.getFullYear());

    const folderName = `${d}${m}${y}`;

    return folderName;
}

// dates: date object or array of date objects
function requestSavedSongs(dates){
    if(!Array.isArray(dates)){
        dates = [dates];
    }

    dates = dates.map(date => dateStamp(date));

    const datesObj = {"dates": dates};
    fetch("/api/played", {
        method: "POST",
        cache: "no-cache",
        headers: {
            "Content-Type": "application/json",
        },
        body: JSON.stringify(datesObj)
    }).then((response) => {
        if(response.status == 200){
            // console.log(response);
            response.json().then(a => {
                console.log(a);
                createSongs(a);
            });
        }
    }).catch(error => {
        console.error(error);
    });
}

function requestSongInfo(songIds, callback, ...args){
    const objSongIds = {"songIds": songIds};

    fetch("/api/songInfo", {
        method: "POST",
        cache: "no-cache",
        headers: {
            "Content-Type": "application/json",
        },
        body: JSON.stringify(objSongIds)
    }).then((response) => {
        if(response.status == 200){
            response.json().then(a => {
                console.log(a);
                callback(a, args)
                // createSongs(a);
            });
        }
    }).catch(error => {
        console.error(error);
    });
}

const leftColumn = document.querySelector(".leftColumn");
const daySelector = new DaySelector(leftColumn, new Date());
daySelector.submit.addEventListener("click", _ => {
    const selected = daySelector.selected();
    console.log(typeof selected[0]);
    requestSavedSongs(selected);
    // console.log("UwU");
}, false);

requestSavedSongs(new Date());

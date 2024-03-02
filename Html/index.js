import {DateSelector} from "./daySelector.js";
import {SongSelector} from "./songSelector.js";
import * as frontFunc from "./frontFunc.js";

Object.assign(globalThis, frontFunc);

l("I live <3");

const songSelectorHolder = document.querySelector(".songSelectorHolder");
const songSelector = new SongSelector(songSelectorHolder);

const songsHolder = document.querySelector(".songsHolder");
const statisticsHolder = document.querySelector(".statisticsHolder");
const spotifyTopItemsHolder = document.querySelector(".spotifyTopItemsHolder");
const histogramElement = document.querySelector(".histogram");
const histogramTextElement = document.querySelector(".histogramText");

const windowButtons = [".songPreview", ".statisticsPreview", ".spotifyTopItems"].map(bName => document.querySelector(bName));
const windows = [songsHolder, statisticsHolder, spotifyTopItemsHolder];
let activeWindow = 0;

for(let i = windows.length - 1; i >= 0; i--){
    windowButtons[i].$("click", () => {
        windows[activeWindow].classList.add("hidden");
        windowButtons[activeWindow].classList.remove("selected");

        activeWindow = i;
        windows[activeWindow].classList.remove("hidden");
        windowButtons[activeWindow].classList.add("selected");
    }, true);
}

let prevPreview = null;
const previewStyles = ["songLineSmallStyle", "songLineStyle", "songBoxStyle"];
const previewStylesButtons = [".toggleSongSmallLineStyle", ".toggleSongLineStyle", ".toggleSongBoxStyle"].map((buttonClassName, i) => {
    const button = document.querySelector(buttonClassName);
    button.addEventListener("click", () => {
        if(prevPreview){
            prevPreview.classList.remove("active");
            songsHolder.className = "songsHolder";
        }

        songsHolder.classList.add(previewStyles[i]);
        button.classList.add("active");
        prevPreview = button;
    });

    return button;
});

previewStylesButtons[0].click();

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

HTMLElement.prototype.appendChildren = function(...args){
    for(const arg of args){
        this.appendChild(arg);
    }
};

function createEntries(songs, songsInfo){
    // console.log(songs);
    // console.log(songsInfo);

    songsHolder.innerHTML = "";
    Object.keys(songs).forEach((key, i) => {
        // console.log(songs[key].playbackCount);
        const song = songs[key];
        const songId = song.songId;
        const songInfo = songsInfo[songId];
        const songElement = createElement(`<div class="song"></div>`);
        const artists = (songInfo) ? (songInfo.artists.map(artist => artist.name)).join(", ") : "";
        const image = (songInfo) ? songInfo.image : null;
        songElement.innerHTML = `
            <div class="firstLine">
                <img class="image" src="${image}" alt="${song.name}">
                <div class="songContent">
                    <div class="songName">${song.name}</div>
                    <div class="artistNames">${artists}</div>
                    <div class="songDuration">duration: ${toMinutes(songInfo.duration / 1000)}</div>
                    <div class="buttons">
                        <button class="selectSong">select</button>
                    </div>
                </div>
                <div class="order">
                    <p>#${i+1}</p>
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

        const playedAtEl = songElement.querySelector("#playedAt");
        const playedAtInfo = songElement.querySelector(".playedAtInfo");
        playedAtInfo.addEventListener("click", () => {
            playedAtEl.classList.toggle("hidden");
        }, false);

        const selectorElement = createElement(`<div class="songSelectorItem">
                <img class="image" src="${image}" alt="${song.name}">
                <div style="display: flex; flex-direction: column;">
                    <div class="songSelectorSongName">${song.name}</div>
                    <button class="removeSelectedSong button">remove</button>
                </div>
            </div>`);

        const selectorRemoveButton = selectorElement.querySelector(".removeSelectedSong");
        const songElementInfo = {button: songElement.querySelector(".selectSong"), state: false, element: selectorElement};
        songSelector.addSelector(songElementInfo, songId, selectorRemoveButton);

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

function createHistogram(songs, songsInfo, dates){
    dates.sort((a,b) => a - b);
    const lastDate = dates[dates.length - 1];
    const daysMaxDifference = Math.ceil(Math.abs(dates[0] - lastDate) / (1000 * 60 * 60 * 24));
    
    histogramElement.innerHTML = "";
    histogramTextElement.innerHTML = "";

    const histogram = Array.from({length: 24}, () => {return 0;});
    const allSongs = [];

    let totalDuration = 0;
    Object.keys(songs).forEach(sKey => {
        const songDuration = songsInfo[songs[sKey].songId].duration;
        for(let i = 0; i < songs[sKey].playbackCount; i++){
            totalDuration += songDuration;
            const time = new Date(songs[sKey].playedAt[i]);
            const data = {
                "time": time,
                "playedAt": time.getTime(),
                "id": songs[sKey].songId,
                "duration": songDuration
            };

            data.end = data.playedAt + songDuration;

            allSongs.push(data);
        }
    });
    
    allSongs.sort((a, b) => {return a.playedAt - b.playedAt});

    listenDuration.innerHTML = getFormatedTime(totalDuration);

    console.log(allSongs);
    const size = allSongs.length;
    for(let i = 0; i < size; i++){
        const song = allSongs[i];
        const duration = song.duration;
        // if(i + 1 != size){
        //     if(allSongs[i + 1].playedAt < song.end){
        //         duration = allSongs[i + 1].playedAt - song.playedAt;
        //     }
        // }
        // const song = songs[sKey];
        const time = song.time;
        // console.log(time.getHours(), song.time);
        histogram[time.getHours()] += duration;
    }

    histogram.forEach((v,i) => {
        // console.log(v, i);
        const minutes = Math.min(v / (60 * 1000), 60);
        const afk = (60 - minutes) / 60 * 100;
        const el = createElement(`<div>
            </div>`);
        const text = createElement(`<div><p>${i}</p></div>`);
        // el.style.paddingTop = `${afk}%`;
        el.style.height = `${100 - afk}%`;
        histogramElement.appendChild(el);
        histogramTextElement.appendChild(text);
        // const listenTime = 60 * 60 * 1000 - v;
        // console.log();
    });
    // console.log(histogram);

    return totalDuration;
}

function createSongTable(songs, songsInfo, totalDuration){
    songDurationOrderHolder.innerHTML = "";
    const allSongs = [];

    Object.keys(songs).forEach(key => {
        const s = songs[key];
        s.totalDuration = s.playbackCount * songsInfo[s.songId].duration;
        // console.log(`dur ${s.name} ${s.totalDuration}`);
        allSongs.push([s.totalDuration, s.songId]);
    });

    allSongs.sort((a, b) => {return b[0] - a[0]});

    allSongs.forEach(s => {
        const song = songs[s[1]];
        const songInfo = songsInfo[song.songId];
        const image = (songInfo) ? songInfo.image : null;
        const element = createElement(`<div class="songDurationItem">
                <img src="${image}" alt="${song.name}">
                <div>
                    <div style="width: ${s[0]/totalDuration * 100}%;"></div>
                    <p>${song.name}</p>
                </div>
                <p style="margin-left: auto;">${getFormatedTime(s[0])}</p>
            </div>`);
        songDurationOrderHolder.appendChild(element);
    });
}

// first join all songs and sort them and apply filters if needed
// TODO: sort by number of playes, artist
// TODO: filters
function createSongs(songs, dates){
    // console.log(songs);
    songs = sortByPlaybackCount(songs);
    const songIds = Array.from(new Set(Object.keys(songs).map(songKey => songs[songKey].songId)));
    requestSongInfo(songIds, (songInfo) => {
        createEntries(songs, songInfo);
        const totalDuration = createHistogram(songs, songInfo, dates);
        createSongTable(songs, songInfo, totalDuration);
    });
}

function dateStamp(date){
    // console.log(date);
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

    const reqDates = dates.map(date => dateStamp(date));

    const selectedSongs = songSelector.selected();

    const datesObj = {
        "dates": reqDates,
        "selectedSongs": selectedSongs
    };

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
            response.json().then(songs => {
                createSongs(songs, dates);
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
                // console.log(a);
                callback(a, args)
                // createSongs(a);
            });
        }
    }).catch(error => {
        console.error(error);
    });
}

// const leftColumn = document.querySelector(".leftColumn");
new DateSelector(dateSelectorHolder, new Date(), (selected) => {
    requestSavedSongs(selected);
});

requestSavedSongs(new Date());

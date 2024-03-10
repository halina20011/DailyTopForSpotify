import {DateSelector} from "./daySelector.js";
import {SongSelector} from "./songSelector.js";
import * as frontFunc from "./frontFunc.js";

Object.assign(globalThis, frontFunc);

l("I live <3");

let globalSongs = null, globalSongsInfo = null, globalArtists = null, globalSortData = null, globalSortOrder = null;

const songSelectorHolder = document.querySelector(".songSelectorHolder");
const songSelector = new SongSelector(songSelectorHolder, songSelectorClearAll);

const songsHolder = document.querySelector(".songsHolder");
// const artistsHolder = document.querySelector(".artistsHolder");
const statisticsHolder = document.querySelector(".statisticsHolder");
const spotifyTopItemsHolder = document.querySelector(".spotifyTopItemsHolder");
const histogramElement = document.querySelector(".histogram");
const histogramTextElement = document.querySelector(".histogramText");

const windowButtons = [".songPreview", ".statisticsPreview", ".spotifyTopItems"].map(bName => document.querySelector(bName));
const windows = [songsHolder, statisticsHolder, spotifyTopItemsHolder];
let activeWindow = 0;

const nullImage = "/Images/nullProfilePic.png";

for(let i = windows.length - 1; i >= 0; i--){
    windowButtons[i].$("click", () => {
        windows[activeWindow].classList.add("hidden");
        windowButtons[activeWindow].classList.remove("selected");

        activeWindow = i;
        windows[activeWindow].classList.remove("hidden");
        windowButtons[activeWindow].classList.add("selected");
    }, true);
}

let prevPreview = null, prevPreviewStyle = null;
const previewStyles = ["songLineSmallStyle", "songLineStyle", "songBoxStyle"];
const previewStylesButtons = [".toggleSongSmallLineStyle", ".toggleSongLineStyle", ".toggleSongBoxStyle"].map((buttonClassName, i) => {
    const button = document.querySelector(buttonClassName);
    button.addEventListener("click", () => {
        if(prevPreview){
            prevPreview.classList.remove("active");
            songsHolder.classList.remove(prevPreviewStyle);
        }

        songsHolder.classList.add(previewStyles[i]);
        button.classList.add("active");
        prevPreviewStyle = previewStyles[i];
        prevPreview = button;
    });

    return button;
});

previewStylesButtons[0].click();

globalSortOrder = sortingType.value;
sortingType.$("change", () => {
    globalSortOrder = sortingType.value;
    update();
});

Array.prototype.sortFirst = function(){
    return this.sort((a, b) => b[0] - a[0]);
}

function sortSongsData(songs, songsInfo){
    const byPlayback = [];
    const byDuration = [];

    const allArtists = new Map();

    Object.keys(songs).forEach(key => {
        const song = songs[key];
        const duration = song.playbackCount * songsInfo[song.songId].duration;

        byPlayback.push([song.playbackCount, song.songId]);
        byDuration.push([duration, song.songId]);

        songsInfo[song.songId].artists.forEach(artistId => {
            // console.log(artistId, song.songId);
            if(!allArtists.has(artistId)){
                allArtists.set(artistId, {duration: 0, playback: 0});
            }

            allArtists.get(artistId).duration += duration;
            allArtists.get(artistId).playback++;
        });
    });

    const artistsByPlayback = [];
    const artistsByDuration = [];
    // console.log(allArtists.entries());
    allArtists.forEach((val, key) => {
        artistsByPlayback.push([val.playback, key]);
        artistsByDuration.push([val.duration, key]);
    });

    byPlayback.sortFirst();
    byDuration.sortFirst();

    artistsByPlayback.sortFirst();
    artistsByDuration.sortFirst();

    return {
        "songs": {
            "playback": byPlayback,
            "duration": byDuration,
        },
        "artists": {
            "playback": artistsByPlayback,
            "duration": artistsByDuration,
        }
    };
}

HTMLElement.prototype.appendChildren = function(...args){
    for(const arg of args){
        this.appendChild(arg);
    }
};

function createSongEntries(songs, songsInfo, artists){
    // console.log(songs);
    // console.log(songsInfo);

    songsHolder.innerHTML = "";

    const order = globalSortData.songs[globalSortOrder];
    order.forEach((entry, i) => {
        const songId = entry[1];
        const song = songs[songId];
        const songInfo = songsInfo[songId];
        const songElement = createElement(`<div class="song"></div>`);
        const artistsStr = (songInfo && songInfo.artists && songInfo.artists[0]) ? (songInfo.artists.map(artistId => artists[artistId].name)).join(", ") : "";
        const image = (songInfo && songInfo.image) ? songInfo.image : nullImage;
        songElement.innerHTML = `
            <div class="firstLine">
                <img class="image" src="${image}" alt="${song.name}">
                <div class="songContent">
                    <div class="songName">${song.name}</div>
                    <div class="artistNames">${artistsStr}</div>
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
                <div style="display: flex; flex-direction: column; overflow: hidden;">
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

// TODO: createArtistEntries

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

function createSongTable(songs, songsInfo){
    songDurationOrderHolder.innerHTML = "";

    const order = globalSortData.songs[globalSortOrder];
    if(order.length <= 0){
        return;
    }

    const firstSong = order[0][0];

    order.forEach(entry => {
        const songId = entry[1];
        const song = songs[songId];
        const songInfo = songsInfo[song.songId];
        const image = (songInfo && songInfo.image) ? songInfo.image : nullImage;

        const text = (globalSortOrder == "duration") ? getFormatedTime(entry[0]) : entry[0];

        const element = createElement(`<div class="songDurationItem">
                <img src="${image}" alt="${song.name}">
                <div>
                    <div style="width: ${entry[0]/firstSong * 100}%;"></div>
                    <p>${song.name}</p>
                </div>
                <p style="margin-left: auto;">${text}</p>
            </div>`);
        songDurationOrderHolder.appendChild(element);
    });
}

function createArtistTable(artists){
    artistDurationOrderHolder.innerHTML = "";

    const order = globalSortData.artists[globalSortOrder];
    if(order.length <= 0){
        return;
    }
    const firstArtist = order[0][0];

    order.forEach(entry => {
        const artistId = entry[1];
        const artist = artists[artistId];
        const image = (artist && artist.image) ? artist.image : nullImage;

        const text = (globalSortOrder == "duration") ? getFormatedTime(entry[0]) : entry[0];

        const element = createElement(`<div class="songDurationItem">
                <img src="${image}" alt="${artist.name}">
                <div>
                    <div style="width: ${entry[0]/firstArtist * 100}%;"></div>
                    <p>${artist.name}</p>
                </div>
                <p style="margin-left: auto;">${text}</p>
            </div>`);
        artistDurationOrderHolder.appendChild(element);
    });
}

function requestInfo(url, obj){
    return fetch(url, {
        method: "POST",
        cache: "no-cache",
        headers: {
            "Content-Type": "application/json",
        },
        body: JSON.stringify(obj)
    }).then((response) => {
        return response.json()
    }).catch(error => {
        console.error(error);
    });
}

function update(){
    createSongEntries(globalSongs, globalSongsInfo, globalArtists);
    createSongTable(globalSongs, globalSongsInfo);
    createArtistTable(globalArtists);
}

// first join all songs and sort them and apply filters if needed
// TODO: sort by number of playes, artist
// TODO: filters
function createSongs(songs, dates){
    const songIdSet = new Set();

    Object.keys(songs).map(songKey => {
        const song = songs[songKey];
        songIdSet.add(song.songId);
    });

    const objSongIds = {"songIds": Array.from(songIdSet)};

    requestInfo("/api/songInfo", objSongIds).then(songsInfo => {
        const artistIdSet = new Set();

        Object.keys(songsInfo).forEach(key => {
            const songInfo = songsInfo[key]
            songInfo.artists.forEach(artist => artistIdSet.add(artist));
        });

        const objArtistIds = {"artistId": Array.from(artistIdSet)};
        requestInfo("/api/artistInfo", objArtistIds).then(artists => {
            const sortData = sortSongsData(songs, songsInfo);

            globalSongs = songs;
            globalSongsInfo = songsInfo;
            globalArtists = artists;
            globalSortData = sortData;

            // console.log("data arrived");
            update();
            createHistogram(songs, songsInfo, dates);
        });
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

// const leftColumn = document.querySelector(".leftColumn");
const dateSelector = new DateSelector(dateSelectorHolder, new Date(), (selected) => {
    requestSavedSongs(selected);
});

songSelectorSubmit.$("click", () => {
    requestSavedSongs(dateSelector.selected());
});

requestSavedSongs(new Date());

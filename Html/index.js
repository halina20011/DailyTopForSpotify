import {DateSelector} from "./daySelector.js";
import {SongSelector} from "./songSelector.js";
import * as frontFunc from "./frontFunc.js";

Object.assign(globalThis, frontFunc);

l("I live <3");

// TODO: graduall expansion of songs/artists
// TODO: gravity on/off for histogram
// TODO: highlight selected songs in histogram
// TODO: top items from spotify
// TODO: url encoded settings

let globalSongs = null, globalSongsInfo = null, globalArtists = null, globalDates = null, globalSortData = null, globalSortOrder = null;

const songSelectorHolder = document.querySelector(".songSelectorHolder");
const songSelector = new SongSelector(songSelectorHolder, songSelectorClearAll);

const songsHolder = document.querySelector(".songsHolder");
// const artistsHolder = document.querySelector(".artistsHolder");
const statisticsHolder = document.querySelector(".statisticsHolder");
const spotifyTopItemsHolder = document.querySelector(".spotifyTopItemsHolder");
const histogramElement = document.querySelector(".histogram");
const histogramTextElement = document.querySelector(".histogramText");

const windowButtons = [".statisticsPreview", ".songPreview", ".spotifyTopItems"].map(bName => document.querySelector(bName));
const windows = [statisticsHolder, songsHolder, spotifyTopItemsHolder];
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

histogramDivision.$("change", () => {
    createHistogram(globalSongs, globalSongsInfo, globalDates);
});

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

function createSongEntries(songs, songsInfo, artists, count = null){
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
            </div>`;

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

// divisions: 30 min
// divisions: 1 hour
// divisions: 1 day
function createHistogram(songs, songsInfo, dates){
    if(dates.length <= 0){
        return;
    }

    // console.log(dates);
    dates.sort((a,b) => a - b);
    // console.log(dates);
    // const lastDate = dates[dates.length - 1];
    // const daysMaxDifference = Math.ceil(Math.abs(dates[0] - lastDate) / (1000 * 60 * 60 * 24));
    // console.log(daysMaxDifference);
    
    histogramElement.innerHTML = "";
    histogramTextElement.innerHTML = "";

    // const histogram = Array.from({length: 24}, () => {return 0;});
    // const firstMonday = dates[0].firstMonday();
    // // clear ms, s, m, h
    // firstMonday.clear(4);
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

    const division = parseInt(histogramDivision.value);

    // go throw each date and generate its places
    const hashIndex = new Map();
    let index = 0;
    const texts = []
    dates.forEach(date => {
        const stamp = date.stamp();
        if(division == 0){
            for(let i = 0; i < 24; i++){
                for(let m = 0; m < 2; m++){
                    const hours = padNumber(i, 2);
                    const hash = `${m}${hours}${stamp}`;
                    // console.log(hash, index);
                    hashIndex.set(hash, index++);
                    const min = (m == 0) ? "00" : "30";
                    texts.push(`${hours}:${min}`);
                }
            }
        }
        else if(division == 1){
            for(let i = 0; i < 24; i++){
                const hours = padNumber(i, 2);
                const hash = `${hours}${stamp}`;
                hashIndex.set(hash, index++);
                texts.push(`${hours}`);
            }
        }
        else{
            const hash = stamp;
            hashIndex.set(hash, index++);
            texts.push(`${stamp.substring(0, 2)}`);
        }
    });

    const histogram = Array.from({length: index}, _ => 0);
        
    for(let i = 0; i < allSongs.length; i++){
        const song = allSongs[i];
        const duration = song.duration;

        const hash = song.time.hashFunc(division);
        const index = hashIndex.get(hash);
        // console.log(`${hash} => ${index}`);

        histogram[index] += duration;
    }

    const maxArray = [30, 60, 60 * 24];
    const max = maxArray[division];

    let textClass = "histogramText";
    if(50 < index){
        textClass = "histogramText vHidden";
    }

    let textClassHolder = "histogramTextHolder";
    if(division == 0){
        textClass += " rotateText";
        textClassHolder += " rotatedTextHolder";
    }

    histogram.forEach((v, i) => {
        const minutes = Math.min(v / (60 * 1000), max);
        const afk = ((max - minutes) / max) * 100;
        // console.log(minutes, afk);
        const el = createElement(`<div class="histogramItemHolder">
            <div class="histogramItem">
                <div>
                    <div style="height: ${afk}%"></div>
                    <div style="height: ${100 - afk}%"></div>
                </div>
            </div>
            <div class="${textClassHolder}">
                <p class="${textClass}">${texts[i]}</p>
            </div>
            </div>`);
        histogramElement.appendChild(el);
        // const text = createElement(`<div></div>`);
        // histogramTextElement.appendChild(text);
    });

    return totalDuration;
}

function loadSongs(text, count, max, parent){
    if(max < count){
        return;
    }

    const button = createElement(`<div class="loadButton">
            <button>${text}</button>
        </div>`);

    button.querySelector("button").$("click", () => {
        createSongTable(globalSongs, globalSongsInfo, count);
    });

    parent.appendChild(button);
}

function createSongTable(songs, songsInfo, count = null){
    songDurationOrderHolder.innerHTML = "";

    const order = globalSortData.songs[globalSortOrder];
    if(order.length <= 0){
        return;
    }

    const firstSong = order[0][0];

    count = (count == null || order.length < count) ? order.length : count;
    for(let i = 0; i < count; i++){
        const entry = order[i];

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
    };

    loadSongs("load 25", count + 25, order.length, songDurationOrderHolder);
    loadSongs("load 50", count + 50, order.length, songDurationOrderHolder);
    if(count != order.length){
        loadSongs("load all", order.length, order.length, songDurationOrderHolder);
    }

    loadSongs("collapse all", 0, order.length, songDurationOrderHolder);
}

function loadArtists(text, count, max, parent){
    if(max < count){
        return;
    }

    const button = createElement(`<div class="loadButton">
            <button>${text}</button>
        </div>`);

    button.querySelector("button").$("click", () => {
        createArtistTable(globalArtists, count);
    });

    parent.appendChild(button);
}

function createArtistTable(artists, count = null){
    artistDurationOrderHolder.innerHTML = "";

    const order = globalSortData.artists[globalSortOrder];
    if(order.length <= 0){
        return;
    }
    const firstArtist = order[0][0];

    count = (count == null || order.length < count) ? order.length : count;
    for(let i = 0; i < count; i++){
        const entry = order[i];

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
    };

    loadArtists("load 25", count + 25, order.length, artistDurationOrderHolder);
    loadArtists("load 50", count + 50, order.length, artistDurationOrderHolder);
    if(count != order.length){
        loadArtists("load all", order.length, order.length, artistDurationOrderHolder);
    }

    loadArtists("collapse all", 0, order.length, artistDurationOrderHolder);
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
    createSongTable(globalSongs, globalSongsInfo, 25);
    createArtistTable(globalArtists, 25);
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
            globalDates = dates;

            // console.log("data arrived");
            update();
            createHistogram(songs, songsInfo, dates);
        });
    });
}

// dates: date object or array of date objects
function requestSavedSongs(dates){
    if(!Array.isArray(dates)){
        dates = [dates];
    }

    const reqDates = dates.map(date => date.stamp());

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

// const date = new Date
// const testDate = new Date(new Date().setDate(1));
requestSavedSongs(new Date());

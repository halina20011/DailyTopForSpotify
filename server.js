// const func = require('./func.js');
import func from "./func.js";
import { TimeOut } from "./func.js";

import https from "https";
import path from "path";
import {MongoClient} from "mongodb";
import express from "express";
import request from "request";

import fs from "fs";

import {fileURLToPath} from "url"
const __filenam = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filenam);

const app = express();
const port = 5000;

let dataBaseUri;

let spotifyClientId;
let spotifyClientSecret;
let spotifyRedirectUri;

let accessToken = '';
let refreshAccessToken;
let lastTokenRequest;

let nextRefreshAccessTokenTimer = null;
let nextRequestTimer = null;

const configFile = __dirname + "/Data/config.json";
const loginFile = __dirname + "/Data/login.json";
const infoLog = __dirname + "/Data/infoLog.json";

const scope = "user-read-recently-played user-top-read";

app.use(express.json());

let oneTrackApproxTime = null;
const defaultOneTrackApproxTime = 2.5;
// apriximate how long it would take to listen to 50 songs
const getListenTimeApproximated = () => {
    if(oneTrackApproxTime == null){
        oneTrackApproxTime = defaultOneTrackApproxTime;
    }
    // from minutes to seconds *60 to milliseconds *1000
    return oneTrackApproxTime * 60 * 50 * 1000;
};

// lifespan of access Token in minutes
const refreshAccessTokenLifespan = 45 * 60;

const accessTokenTimeLeft = () => {
    const a = Date.now() - refreshAccessTokenLifespan * 1000;
    const b = lastTokenRequest;
    return b - a;
};

function setNextReqest(){
    const listenTimeApproximated = getListenTimeApproximated();
    nextRequestTimer = new TimeOut(lastTracks, listenTimeApproximated);
    func.log(`next request in ${listenTimeApproximated}ms in `);
}

function setRefreshAccessTimeout(timeOutSeconds = refreshAccessTokenLifespan){
    if(nextRefreshAccessTokenTimer){
        nextRefreshAccessTokenTimer.clear();
    }

    const timeOutMs = timeOutSeconds * 1000;
    nextRefreshAccessTokenTimer = new TimeOut(requestRefreshedAccessToken, timeOutMs, undefined);
    func.log(`next refresh access token request on ${nextRefreshAccessTokenTimer.expires()} in ${timeOutMs}ms`);
}

function loadConfig(){
    func.log("loading config file...");
    let data = {};
    if(fs.existsSync(configFile)){
        const fileContent = fs.readFileSync(configFile);
        data = func.tryJsonParse(fileContent);
    }
    else{
        func.error("failed to load config, exiting...");
        process.exit(1);
    }

    dataBaseUri = data["DATABASE_URI"];
    spotifyClientId = data["SPOTIFY_CLIENT_ID"];
    spotifyClientSecret = data["SPOTIFY_CLIENT_SECRET"];
    spotifyRedirectUri = data["SPOTIFY_REDIRECT_URI"];
}

function loadLogin(){
    func.log("loading login file...");
    if(fs.existsSync(loginFile)){
        const fileContent = fs.readFileSync(loginFile);
        const data = func.tryJsonParse(fileContent);

        accessToken = data["accessToken"];
        refreshAccessToken = data["refreshAccessToken"];
        lastTokenRequest = new Date(data["lastTokenRequest"]);

        if(accessTokenTimeLeft() <= 0){
            accessToken = null;
            lastTokenRequest = null; 
        }
    }
}

function saveLogin(){
    func.log("Writing to config file");
    const data = {
        "accessToken": accessToken,
        "refreshAccessToken": refreshAccessToken,
        "lastTokenRequest":  lastTokenRequest,
    };

    func.writeToFile(
        fs,
        loginFile, 
        JSON.stringify(data), 
        () => {func.log(`${loginFile} was updated`)}, 
        (error) => {func.log(`error writing to ${loginFile} ${error}`)}
    );
}

function infoLogAccess(action, lastRequest = undefined, lastTimestamp = undefined){
    // func.log("trying to access infoLog");
    let data = {};
    if(fs.existsSync(infoLog)){
        const fileContent = fs.readFileSync(infoLog);
        data = func.tryJsonParse(fileContent);
    }
    
    if(action == "read"){
        return data;
    }
    else{
        data.lastTrack = lastTimestamp;
        data.lastRequest = lastRequest;
        func.log(`new last request ${lastTimestamp} last timestamp ${lastTimestamp}`);
        func.writeToFile(
            fs,
            infoLog,
            JSON.stringify(data),
            () => {func.log(`${infoLog} was updated successfully`)},
            (error) => {func.log(`error writing to ${infoLog} ${error}`)}
        )
    }
}

// Spotify
const loginPath = "/auth/login";
app.get(loginPath, (_req, res) => {
    func.log(`${loginPath} was accessed`);
    const state = func.generateRandomString(16);
    
    const authUrl = new URLSearchParams({
        response_type: "code",
        client_id: spotifyClientId,
        scope: scope,
        redirect_uri: spotifyRedirectUri,
        state: state
    });

    res.redirect("https://accounts.spotify.com/authorize/?" + authUrl.toString());
});

// Request Access Token
app.get('/auth/callback', (req, res) => {
    func.log(`accessed callback`);
    const code = req.query.code;

    const authOptions = {
        url: 'https://accounts.spotify.com/api/token',
        form:{
            code: code,
            redirect_uri: spotifyRedirectUri,
            grant_type: 'authorization_code'
        },
        headers: {
            'Authorization': 'Basic ' + (Buffer.from(spotifyClientId + ':' + spotifyClientSecret).toString('base64')),
            'Content-Type' : 'application/x-www-form-urlencoded'
        },
        json: true
    };

    request.post(authOptions, (error, response, body) => {
        if(!error && response.statusCode === 200){
            func.log(`access token retrieved`);
            accessToken = body.access_token;
            refreshAccessToken = body.refresh_token;
            setRefreshAccessTimeout();
            res.redirect('/');
            // lastTracks();
        }
    });
});

// Web apis
// Request a refreshed Access Token
function requestRefreshedAccessToken(callback){
    const urlArgs = new URLSearchParams({
        grant_type: 'refresh_token',
        refresh_token: refreshAccessToken
    }).toString();

    const options = {
        host: 'accounts.spotify.com',
        path: `/api/token?${urlArgs}`,
        port: 443,
        method: 'POST',
        headers:{
            'Authorization': `Basic ${new Buffer.from(spotifyClientId + ':' + spotifyClientSecret).toString('base64')}`,
            'Content-Type': "application/x-www-form-urlencoded"
        }
    };

    const request = https.request(options, (res) => {
        let data = '';

        func.log(`status code ${res.statusCode}`);

        res.on('data', (chunk) => {
            data += chunk;
        });

        res.on("end", () => {
            if(res.statusCode === 200){
                const jsonResponse = JSON.parse(data);
                accessToken = jsonResponse.access_token;
                func.log(`${accessToken.substring(0, 10)}...`);
                lastTokenRequest = new Date();
                saveLogin();
                setRefreshAccessTimeout();
                if(callback != undefined){
                    callback();
                }
            }
        });

        res.on("error", (error) => {
            func.error(`error occurred on response from refreshed access token: "${error}"`);
        });
    });

    request.on("error", (error) => {
        func.error(`error occurred on requesting refreshed access token: "${error}"`);
        setRefreshAccessTimeout(2 * 60);
    });

    request.end();
}

// TODO: userTopArtists
// function userTopArtists(){
//
// }

class Artist{
    constructor(obj){
        this.id = obj.id;
        this.name = obj.name;
    }
}

class Song{
    constructor(songId, name, playedAt){
        this.songId = songId;
        this.name = name;
        this.dateStamp = func.dateStamp(playedAt);
        this.playedAt = playedAt;
    }
}

class SongInfo{
    constructor(track){
        this.songId = track.id;
        this.name = track.name;
        this.artists = track.artists.map(item => {return new Artist(item)});
        this.duration = track.duration_ms;
        this.image = track.album.images[0].url;
        this.href = track.href;
    }
}

function addSongs(data, callback, ...args){
    const jsonResponse = JSON.parse(data);
    if(Object.keys(jsonResponse.items).length <= 0){
        func.log(`empty object with items`);
        return;
    }

    const lastPlayedSong = (jsonResponse.items[0]).played_at;
    const lastTimestamp = new Date(lastPlayedSong).getTime();

    const toAdd = [];
    const songsMap = new Map();
    let durationSum = 0, numberOfSongs = 0;
    Object.keys(jsonResponse.items).forEach(itemKey => {
        const item = jsonResponse.items[itemKey];
        const songId = item.track.id;
        const name = item.track.name;
        
        songsMap.set(songId, itemKey);

        const playedAt = new Date(item.played_at);
        toAdd.push(new Song(songId, name, playedAt));
        
        durationSum += item.track.duration_ms;
        numberOfSongs++;
    });

    if(20 < numberOfSongs){
        const durationSumInMinutes = (durationSum / (1000 * 60)).toFixed(2);
        func.log(`recalculating new oneTrackApproxTime from ${numberOfSongs} tracks with duration sum ${durationSumInMinutes}min (${durationSum}ms)`);
        const newOneTrackApproxTime = (durationSumInMinutes / numberOfSongs).toFixed(2);
        if(1 < newOneTrackApproxTime){
            oneTrackApproxTime = newOneTrackApproxTime;
            func.log(`new oneTrackApproxTime = ${newOneTrackApproxTime}`);
        }
        else{
            func.error(`new oneTrackApproxTime is to small ${newOneTrackApproxTime}`);
        }
    }

    const songsIdArray = Array.from(songsMap.keys());

    set.find({songId: {$in: songsIdArray}}).toArray()
    .then(result => {
        result.forEach(item => {
            // console.log(`deleting ${item.songId}`);
            songsMap.delete(item.songId);
        });

        if(songsMap.size != 0){
            const newSongsInfo = [];
            songsMap.forEach((value) => {
                const item = jsonResponse.items[value];
                const name = item.track.name;
                func.log(`song "${name}" was firstly played`);
                newSongsInfo.push(new SongInfo(item.track));
            });

            set.insertMany(newSongsInfo);
        }
    })

    history.insertMany(toAdd).then(result => {
        if(result.acknowledged == true){
            func.log(`retrieved ${toAdd.length} tracks`);
            infoLogAccess("write", Date.now(), lastTimestamp);
            setNextReqest();
        }
    });

    if(callback){
        callback(...args);
    }
}

function lastTracks(callback, ...args){
    const lastTimestamp = infoLogAccess("read").lastRequest;

    const time = (lastTimestamp == null) ? `before=${new Date().getTime()}` : `after=${lastTimestamp}`;
    func.log(`Time: >${time}<`);

    const options = {
        hostname: "api.spotify.com",
        path: `/v1/me/player/recently-played?${time}&limit=50`,
        method: "GET",
        headers: {
            "Authorization": `Bearer ${accessToken}`,
            "Content-Type" : "application/json"
        },
        json: true
    };

    // sending the request
    https.request(options, (res) => {
        let data = '';
         
        res.on("data", (chunk) => {
            data += chunk;
        });
        
        // Ending the response 
        res.on("end", () => {
            func.log(`lastTrack status Code ${res.statusCode}`);
            if(res.statusCode === 200){
                addSongs(data, callback, args);
            }
            else if(res.statusCode == 401){
                func.error("Bad or expired token, requesting refreshed token");
                requestRefreshedAccessToken();
            }
            else{
                func.log(`status Code ${res.statusCode}`);
            }
        });
           
    }).on("error", (error) => { 
        func.error(`error occurred on requesting last tracks: "${error}"`);
    }).end();
}

app.use('/Images', express.static(__dirname + "/Images"));
app.use('/', express.static(__dirname + "/Html"));

app.get('/api/lastTracks', (_req, res) => {
    if(accessToken == "" || accessToken == null){
        res.status(400).send("accessToken is invalid please login first");
        return;
    }
    if(nextRequestTimer){
        nextRequestTimer.clear();
    }
    lastTracks();
    res.redirect('/');
});

app.get('/api/info', (_req, res) => {
    const lastRequest = infoLogAccess("read").lastRequest;
    const lastTrack = infoLogAccess("read").lastTrack;
    const aTTLU = accessTokenTimeLeft();
    const aTTL = new Date(aTTLU);
    const info = {
        "nextAccessToken": (nextRefreshAccessTokenTimer) ? nextRefreshAccessTokenTimer.info() : null,
        "nextRequest": (nextRequestTimer) ? nextRequestTimer.info() : null,
        "accessTokenTimeLeft": (aTTL) ? aTTL.timeLeft(): aTTLU,
        "lastRequest": new Date(lastRequest).toLogFormat(),
        "lastTrack": new Date(lastTrack).toLogFormat(),
    }

    res.json(info);
});

function getSongInfo(ids, onSuccess, songInfo, onError){
    if(ids == null || ids.length == 0){
        onSuccess(songInfo);
        return 0;
    }
    
    if(50 < ids.length){
        ids.splice(50);
    }

    const options = {
        hostname: "api.spotify.com",
        path: `/v1/tracks?ids=${ids.join(",")}`,
        method: "GET",
        headers: {
            "Authorization": `Bearer ${accessToken}`,
        },
    };

    // sending the request
    https.request(options, (res) => {
        let data = '';
         
        res.on("data", (chunk) => {
            data += chunk;
        });
        
        // Ending the response 
        res.on("end", () => {
            data = JSON.parse(data);
            if(res.statusCode === 200){
                const tracks = data.tracks;
                if(data != null && tracks != null){
                    const newSongInfo = tracks.map(track => new SongInfo(track));
                    set.insertMany(newSongInfo).then(result => {
                        func.log(`added ${result.insertedCount} new song info `)
                    });
                    Object.assign(songInfo, newSongInfo);
                    onSuccess(songInfo);
                }
                else{
                    onError();
                }
            }
            else if(res.statusCode == 401){
                onError();
                func.error("Bad or expired token, requesting refreshed token");
                requestRefreshedAccessToken();
            }
            else{
                onError();
                func.log(`status Code ${res.statusCode} ${data}`);
            }
        });
           
    }).on("error", (error) => {
        onError();
        func.error(`error occurred on requesting last tracks: "${error}"`);
    }).end();
}

app.post("/api/songInfo", (req, res) => {
    const jsonData = req.body;
    const songIds = jsonData.songIds;
    if(songIds == null){
        res.status(400).send();
        return;
    }
    
    const songIdsSet = new Set(songIds);
    
    const onSuccess = (dataArray) => {
        const entries = Object.fromEntries(dataArray.map(obj => [obj.songId, obj]));
        res.json(entries);
    };

    set.find({songId: {$in: songIds}}).toArray()
    .then(result => {
        result.forEach(item => {
            songIdsSet.delete(item.songId);
        });

        if(songIdsSet.size != 0){
            const array = Array.from(songIdsSet);
            console.log(`not found ${songIdsSet.size} ${array.join(",")}`);
            getSongInfo(array, onSuccess, result, () => {res.sendStatus(404)});
        }
        else{
            onSuccess(result);
        }
    })
    .catch(error => {
        func.error(`error on quering songs: ${error}`);
        res.sendStatus(500);
    });
});

app.post('/api/played', (req, res) => {
    const jsonData = req.body;
    const dates = jsonData.dates;
    const songIds = jsonData.selectedSongs;

    if(dates == null){
        res.status(400).send();
        return;
    }
    
    const query = {dateStamp: {$in: dates}};
    if(0 < songIds.length){
        query.songId = {$in: songIds}
    }

    console.log(dates, songIds);
    history.find(query).toArray()
    .then(result => {
        // console.log(result);
        const songs = {};
        // console.log(dataArray.length);
        result.forEach(song => {
            const songId = song.songId;
            if(songs[songId] == null){
                song.playbackCount = 1;
                song.playedAt = [song.playedAt];
                songs[songId] = song;
            }
            else{
                songs[songId].playbackCount++;
                songs[songId].playedAt.push(song.playedAt);
            }
        });
        
        // console.log(Object.keys(songs).length);
        res.json(songs);
    })
    .catch(error => {
        func.error(`error on quering songs: ${error}`);
        res.sendStatus(500);
    });
});

// we will have three collections
//  history: each song that have been played
//
//  set: each song has data that will repeat (as song id, artist, release date, uri...)
//      every time new song is played
//
//  TODO:
//  summary: each day will have 
//      total listen time
//      total number of listened songs
//      frequency of songs
//          first frequency 
//          if frequency matches then the longer song wins

 // .
 // ├── config.json
 // ├── infoLog.json
 // └── Data
 //     ├── config.json
 //     ├── infoLog.json
 //     └── login.json
//  
//  infoLog.json:
//  {
//      "lastTrack": unixTimestamp,
//      "lastRequest", unixTimestamp,
//  }
//
//  on start, load the config
//      if it failes, exit
//  
//  load the infoLog
//      if it has "accessToken" no manual login is required
//      else wait for the user to log in
//
//      if it has "refreshAccessToken" and the "lastTokenRequest" is in the window of validity use it
//      else request new refreshAccessToken
//  
//  TODO:
//  if we have access to API (valid requestToken) read the infoLog to get lastRequest
//      if the lastRequest + time to listen to 50 songs is smaller then curr time 
//          request the lastTracks
//      else set up timer and wait
//

const dbName = "dailyTopForSpotify";

let db, history, set;

loadConfig();

const server = app.listen(port, () => {
    func.log(`running on http://localhost:${server.address().port}`);
});

const client = new MongoClient(dataBaseUri);

client.connect().then(_ => {
    func.log("database connected");
    db = client.db(dbName);
    history = db.collection("history");
    set = db.collection("set");

    loadLogin();
    if(refreshAccessToken != "" && refreshAccessToken != null){
        func.log(`refresh access token was found`);
        if(accessToken != null){
            func.log(`access token is still valid, left: ${accessTokenTimeLeft()}`);
            setRefreshAccessTimeout();
        }
        else{
            requestRefreshedAccessToken(undefined /*lastTracks*/);
        }
        // let lastTrack = infoLogAccess("read").lastRequest;
    }
    else{
        func.log(`invalid refresh access token, waiting for user to log in on ${loginPath}`);
    }
}).catch(error => func.error(`failed to connect to database: ${error}`));

// the offset when the timer is considered failed
const TIMER_FAIL = 1 * 60 * 1000;

function checkTimer(timer, name){
    if(!timer){
        return;
    }
    if(timer.failed(TIMER_FAIL)){
        func.error(`timer "${name}" failed: ${timer.startTime} => ${timer.endTime} now ${new Date().toString()}`);
        timer.run();
    }
}

setInterval(() => {
    checkTimer(nextRefreshAccessTokenTimer, "nextRefreshAccessTokenTimer");
    checkTimer(nextRequestTimer, "nextRequestTimer");
}, 60 * 1000);

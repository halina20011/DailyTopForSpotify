const func = require('./func.js');

const https = require("https");
const path = require("path");
const express = require("express");
const request = require("request");

const fs = require("fs");

let app = express();
const port = 5000;

let spotifyClientId;
let spotifyClientSecret;
let spotifyRedirectUri;

let accessToken = '';
let refreshAccessToken;

let nextRefreshAccessTokenTimer = null;
let nextRequestTimer = null;

const configFile = __dirname + "/config.json";
const infoLog = __dirname + "/Data/infoLog.json";

let oneTrackApproxTime = 2 * 60;
// apriximate how long it would take to listen to 50 songs
getListenTimeApproximated = () => {return oneTrackApproxTime * 50 * 1000};

function setNextReqest(){
    const listenTimeApproximated = getListenTimeApproximated();
    nextRequestTimer = new func.TimeOut(lastTracks, listenTimeApproximated);
    func.log(`next request in ${listenTimeApproximated}ms in `);
}

function setRefreshAccessTimeout(timeOutSeconds){
    if(nextRefreshAccessTokenTimer){
        nextRefreshAccessTokenTimer.clear();
    }
    nextRefreshAccessTokenTimer = new func.TimeOut(requestRefreshedAccessToken, timeOutSeconds * 1000, undefined);
    func.log(`next refresh access token request in ${timeOutSeconds * 1000}ms`);
}

function saveConfig(){
    func.log("Writing to config file");
    const data = {
        "SPOTIFY_CLIENT_ID": spotifyClientId,
        "SPOTIFY_CLIENT_SECRET": spotifyClientSecret,
        "SPOTIFY_REDIRECT_URI":  spotifyRedirectUri,
        "REFRESH_ACCESS_TOKEN": refreshAccessToken
    };

    func.writeToFile(
        fs,
        configFile, 
        JSON.stringify(data), 
        () => {func.log(`${configFile} was updated`)}, 
        (error) => {func.log(`error writing to ${configFile} ${error}`)}
    );
}

function loadConfig(){
    func.log("loading config file");
    let data = {};
    if(fs.existsSync(configFile)){
        const fileContent = fs.readFileSync(configFile);
        data = func.tryJsonParse(fileContent);
    }
    else{
        process.exit(1);
    }

    spotifyClientId = data["SPOTIFY_CLIENT_ID"];
    spotifyClientSecret = data["SPOTIFY_CLIENT_SECRET"];
    spotifyRedirectUri = data["SPOTIFY_REDIRECT_URI"];
    refreshAccessToken = data["REFRESH_ACCESS_TOKEN"];
}

function infoLogAccess(action, lastRequest = undefined, lastTimestamp = undefined){
    // func.log("trying to access infoLog");
    let data = {};
    if(fs.existsSync(infoLog)){
        let fileContent = fs.readFileSync(infoLog);
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

const scope = "streaming user-read-email user-read-private user-read-recently-played";

app.use(express.json());

// Spotify
const loginPath = "/auth/login";
app.get(loginPath, (req, res) => {
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
    let code = req.query.code;

    let authOptions = {
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
            saveConfig();
            setRefreshAccessTimeout(3500);
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
        func.log(`headers: ${res.headers}`);

        res.on('data', (chunk) => {
            data += chunk;
        });

        res.on("end", () => {
            if(res.statusCode === 200){
                const jsonResponse = JSON.parse(data);
                accessToken = jsonResponse.access_token;
                func.log(accessToken);
                setRefreshAccessTimeout(3500);
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

function lastTracks(callback, ...args){
    let lastTimestamp = infoLogAccess("read").lastRequest;

    let time = (lastTimestamp == undefined) ? `before=${new Date().getTime()}` : `after=${lastTimestamp}`;
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
    const res = https.request(options, (res) => {
        let data = '';
         
        res.on("data", (chunk) => {
            data += chunk;
        });
        
        // Ending the response 
        res.on("end", () => {
            if(res.statusCode === 200){
                const jsonResponse = JSON.parse(data);
                if(Object.keys(jsonResponse.items).length <= 0){
                    func.log(`empty object with items`);
                    return;
                }
                const lastPlayedSong = (jsonResponse.items[0]).played_at;
                const lastTimestamp = new Date(lastPlayedSong).getTime();
                let responseByDates = {};
                // go throw every item in the response from playedAt value make and folderName that will
                // be used as an hash key if the key doesnt exist then make new object that has same
                // structure as the jsonResponse and add the item to the folderName.items 
                // {
                //      folderName1: {
                //          items: {}
                //      },
                //      folderName2: {
                //          items: {}
                //      },
                // }
                // TODO: insted of adding each element use binary search and find the last item then
                // split the object
                Object.keys(jsonResponse.items).forEach(itemKey => {
                    const item = jsonResponse.items[itemKey];
                    const playedAt = new Date(item.played_at);
                    const itemFolderTime = func.getFolderName(playedAt);
                    if(responseByDates[itemFolderTime] == undefined){
                        responseByDates[itemFolderTime] = {
                            items: [],
                            next: jsonResponse.next,
                            cursors: {
                                "after" : `${playedAt.getTime()}`,
                                "before" : jsonResponse.cursors.before
                            },
                            limit: jsonResponse.limit,
                            href: jsonResponse.href
                        };
                    }
                    responseByDates[itemFolderTime].items.push(item);
                });
                
                // console.log(lastPlayedSong.played_at);
                // const lastTimestamp = 
                // console.log(JSON.stringify(responseByDates, null, 4));
                Object.keys(responseByDates).forEach(folderName => {
                    const folderPath = `${__dirname}/Data/${folderName}`;

                    if(!fs.existsSync(folderPath)){
                        func.log(`initializing new day folder with path ${folderPath}`);

                        try{
                            fs.mkdirSync(folderPath);
                        }
                        catch(error){
                            func.log(`error when initializing new day folder ${error}`);
                        }
                    }
    
                    const files = func.getFiles(fs, path, folderPath);
                    const fileIndexName = `${folderPath}/${files.length}.json`;
                    
                    const newfileContent = JSON.stringify(responseByDates[folderName]);
                    func.writeToFile(
                        fs,
                        fileIndexName,
                        newfileContent,
                        () => {func.log(`response with length ${newfileContent.length} was written to ${fileIndexName} successfully`)},
                        (error) => {func.log(`error writing to ${fileIndexName} ${error}`)}
                    );
                });

                infoLogAccess("write", Date.now(), lastTimestamp);
                setNextReqest();
                if(callback){
                    callback(...args);
                }
            }
            else{
                func.log(`status Code ${res.statusCode}`);
            }
        });
           
    }).on("error", (error) => { 
        func.error(`error occurred on requesting last tracks: "${error}"`);
    }).end();
}
const routs = [
    ["/", "/Html/index.html"],
    ["/style.css", "/Html/style.css"],
    ["/index.js", "/Html/index.js"],
    ["/daySelector.js", "/Html/daySelector.js"]
];

routs.forEach(rout => {
    app.get(rout[0], (req, res) => {
        res.sendFile(__dirname + rout[1]);
    });
});

app.use('/Images', express.static(__dirname + "/Images"));

app.get('/api/lastTracks', (req, res) => {
    if(accessToken == "" || accessToken == undefined){
        res.statu(400).send("accessToken is invalid please login first");
    }
    if(nextRequestTimer){
        nextRequestTimer.clear();
    }
    lastTracks();
    res.redirect('/');
});

app.get('/api/info', (req, res) => {
    const lastRequest = infoLogAccess("read").lastRequest;
    const lastTrack = infoLogAccess("read").lastTrack;
    const info = {
        "nextAccessToken": (nextRefreshAccessTokenTimer) ? nextRefreshAccessTokenTimer.info() : undefined,
        "nextRequest": (nextRequestTimer) ? nextRequestTimer.info() : undefined,
        "lastRequest": new Date(lastRequest).toLogFormat(),
        "lastTrack": new Date(lastTrack).toLogFormat(),
    }
    res.json(info);
});

function createSongInfo(item){
    return {
        name: item.track.name,
        uri: item.track.uri,
        id: item.track.id,
        duration: item.track.duration_ms,
        artists: item.track.artists,
        image: item.track.album.images[0],
        numberOfPlaybacks: 1,
        playedAt: item.played_at
    }
}

// join the songs into output.json
// if the folder exists procede
// get all files songs files
// for every file in the folder loop throw all songs that were played 
function makeOutput(folderName){
    if(fs.existsSync(folderName)){
        const files = func.getFiles(fs, path, folderName);
        if(files.length <= 0){
            func.log(`there are files in ${folderName}`);
            return [false, {}];
        }

        let outputFile = `${folderName}/output.json`;
        if(fs.existsSync(outputFile)){
            const oldOutput = func.tryJsonParse(fs.readFileSync(outputFile));
            if(files.length == oldOutput.numberOfFiles){
                func.log(`there are no changes that should be made to ${outputFile}`);
                return [true, oldOutput];
            }
            else{
                func.log(`${outputFile} is obsolete, it should be updated`);
            }
        }
        let output = {
            numberOfFiles: 0,
            totalPlaybackCount: 0,
            numberOfSongs: 0,
            allSongs: {},
        }

        func.log(`number of files in ${folderName} is ${files.length}`);

        let totalPlaybackCount = 0;
        let numberOfSongs = 0;

        files.forEach((file) => {
            const fileFullPath = `${folderName}/${file}`;
            func.log(`processing ${file}...`);
            const fileContent = func.tryJsonParse(fs.readFileSync(fileFullPath));

            if(fileContent == undefined){
                func.log(`error file content of ${fileFullPath} is undefined`);
            }
            else{
                fileContent.items.forEach((item, i) => {
                    const song = createSongInfo(item);
                    if(output.allSongs[song.id] == undefined){
                        output.allSongs[song.id] = song;
                        output.allSongs[song.id].playedAt = [song.playedAt];
                        numberOfSongs++;
                    }
                    else{
                        output.allSongs[song.id].playedAt.push(song.playedAt);
                        output.allSongs[song.id].numberOfPlaybacks++;
                    }
                    totalPlaybackCount++;
                });
            }
        });
        
        output.numberOfFiles = files.length;
        output.numberOfSongs = numberOfSongs;
        output.totalPlaybackCount = totalPlaybackCount;

        let status = func.writeToFile(
            fs,
            outputFile,
            JSON.stringify(output),
            () => {func.log(`${outputFile} was updated`)},
            (error) => {func.log(`error writing to ${outputFile} ${error}`)}
        );

        return [status, output];
    }

    func.log(`error when trying to create output.js from non existing folder ${folderName}`);
    return [false, {}];
}

app.post('/api/songs', (req, res) => {
    const jsonData = req.body;
    const dates = jsonData.dates;
    if(dates == undefined){
        res.status(400).send();
    }

    let allOutputs = {
        totalPlaybackCount: 0,
        numberOfSongs: 0,
        allSongs: {},
    };

    let status, output;
    for(let i = 0; i < dates.length; i++){
        const date = new Date(dates[i]);
        const folderName = `${__dirname}/Data/${func.getFolderName(date)}`;
        [status, output] = makeOutput(folderName);
        if(status == true && output != undefined && output != {}){
            Object.keys(output.allSongs).forEach((id) => {
                const song = output.allSongs[id];
                if(allOutputs.allSongs[id] == undefined){
                    allOutputs.allSongs[id] = song;
                }
                else{
                    allOutputs.allSongs[id].playedAt = allOutputs.allSongs[id].playedAt.concat(song.playedAt);
                    allOutputs.allSongs[id].numberOfPlaybacks += song.numberOfPlaybacks;
                }
            });
            allOutputs.numberOfSongs += output.numberOfSongs;
            allOutputs.totalPlaybackCount += output.totalPlaybackCount;
        }
    }

    res.json(allOutputs);
});

let server = app.listen(port, () => {
    func.log(`running on http://${server.address().address}:${server.address().port}`);
});

//  .
//  ├── config.json
//  ├── infoLog.json
//  └── Data
//      └── ddmmyyyy
//          ├── 0.json              first request on this day
//          ├── 1.json              second request on this day
//          └── output.js           all the request combined without usless info like "available_markets"
//  
//  infoLog.json:
//  {
//      "lastTrack": unixTimestamp,
//  }
//
//  on start, load the config
//      if any of spotify settings is invalid or missing exit the program
//      if there is an refresh access token try to log with it
//      
//      wait for the user to log in
//  
//  after successfull log in make request to spotify to get lastTracks
//      
//      if this is the first request this day create a ddmmyyyy foldrer
//  
//      access the infoLog and find the timestamp of last saved song
//      request last 50 songs from spotify played after the timestamp
//      (if the timestamp wasn found make and request with before this time)
//      200
//
//      if the timestamp has different day then is current day then split the response
//      to the correct ddmmyyyy folder with the name asociated with its index
//      before saving the response check if
//      save all songs and create the timestamp for next request
//
//
//  front-end

loadConfig();
if(refreshAccessToken != "" && refreshAccessToken != undefined){
    func.log(`refresh access token was found`);
    // let lastTrack = infoLogAccess("read").lastRequest;
    requestRefreshedAccessToken(undefined /*lastTracks*/);
}
else{
    func.log(`invalid refresh access token, waiting for user to log in on ${loginPath}`);
}

// setInterval(() => {
//     
// }, 1000 * 60);

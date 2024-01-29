// File 
app.get('/', (req, res) => {
    res.sendFile(__dirname + "/index.html");
});

app.use("/Images", express.static(__dirname + "/Images"));

app.get('/index.js', (req, res) => {
    res.sendFile(__dirname + "/index.js");
});

app.get('/style.css', (req, res) => {
    res.sendFile(__dirname + "/style.css");
});

app.get('/auth/token', (req, res) => {
    console.log(`Token: ${accessToken.slice(0, 10)}..`);
    res.json({ accessToken: accessToken});
});

let getAccessToken = () => {
    if(accessToken == ""){
        console.warn("Access token is empty");
    }
    return accessToken;
}

// Get artist info
app.get("/api/getArtist", (req, res) =>{
    let id = req.query["id"];
    let callback = (data) => {
        console.log(data);
        res.writeHead(200, { "Content-Type": "application/json; charset=utf-8"});
        res.end(data);
    }

    let info = webApi.getArtist(getAccessToken(), id, callback);
});

// Get artists background image from scraper
app.get("/api/lastTracks", (req, res) =>{
    let from = req.query.from;
    let fromTimeStamp = (from) ? from : new Date.getTime();
    console.log(from);
    let callback = (response) => {
        response = JSON.parse(response);
        let parsedTracks = parseTracks(response);
        res.writeHead(200, { "Content-Type": "application/json; charset=utf-8"});
        res.end(JSON.stringify(parsedTracks));
    }

    webApi.lastTracks(getAccessToken(), fromTimeStamp, 0, callback);
});

const d = [
    Date.prototype.getFullYear,
    Date.prototype.getMonth,
    Date.prototype.getDate, 
    Date.prototype.getHours, 
    Date.prototype.getMinutes, 
    Date.prototype.getSeconds
];

Date.prototype.difference = (self, compareDate) => {
    // console.log(self);
    // Year -> month -> day -> hours -> minutes -> seconds
    for(let i = 0; i < d.length; i++){
        if(d[i].call(self) != d[i].call(compareDate)){
            return i;
        }
    }

    return -1;
}

// date1 = new Date("1/23/2023 1:00:01");
// date2 = new Date("1/23/2023 1:00:00");
// console.log(date2.difference(date2, date1));

function compareDateArray(dateToCompare, array){
    console.log(`Date To compare: ${dateToCompare}`);
    console.log(`First Date To be compared: ${array[0]}`);
    for(let i = 0; i < array.length; i++){
        let d = dateToCompare.difference(dateToCompare, array[i]);
        if(d < 3){
            console.log(`Diff is on ${d}`);
            return i;
        }
    }

    return -1;
}

function getObjectProperty(obj, path){
    return path.reduce((value, property) => value[property], obj);
}

function shiftArray(array, k){
    array.unshift(...array.splice(-k))
    return array;
}

// Parse output
// let tracks = require("./request.json");
function parseTracks(tracks, stop = null){
    let parse = (path, toDo = null) => {
        console.log(`Stop: ${stop}`);
        let tracksData = tracks.items.filter((item, index) => {
                if(stop == null || index < stop){
                    return true;
                }
                else{
                    return false
                }
            }).map((item) => {
                let data = getObjectProperty(item, path);
                if(toDo == null){
                    return data;
                }
                else{
                    return toDo(data);
                }

                return data;
        });

        return tracksData.reverse();
    }

    let songsNames = parse(["track", "name"]);
    let times = parse(["played_at"], (input) => {return new Date(input)});
    
    // console.log(songsNames);
    // console.log(times);

    return {"names": songsNames, "times": times};
}

// parseTracks();

function joinObjects(objects){
    let keys = Object.getOwnPropertyNames(objects[0]);
    console.log(`Keys: ${JSON.stringify(keys)}`);
    let newObject = {};

    for(let i = 0; i < keys.length; i++){
        for (let x = 0; x < x.length; x++) {
            const element = x[x];
            
        }
        newObject[keys[i]] = [...obj1[keys[i]], ...obj2[keys[i]]];
    }

    return newObject;
}

// let newObj = joinObjects({"item": ["apple"], "costs": [10]}, {"item": ["bananana"], "costs": [15]});
// console.log(newObj);

// thisDaySongs = [Date, Date.Unix];
let thisDaySongs = (todayDate, fromTimeStamp, songs = null) => {
    let max = 12;
    // Get first 50 songs
    // check if all songs were played today
    // if yes then get last's song time and make new request
    // if no then remove songs that weren't played today
    let callback = (response) => {
        response = JSON.parse(response);
        let responseLength = JSON.stringify(response).length;
        console.log(`Response length: ${responseLength}`);
        if(response.error){
            console.warn(response);
            return;
        }
        let parsedTracks = parseTracks(response);
        let times = parsedTracks.times;
        let names = parsedTracks.names;

        console.log(`Times l: ${times.length}`);
        console.log(times);
        console.log(`Names l: ${names.length}`);
        console.log(names);

        let index = compareDateArray(todayDate, times);
        console.log(`On index ${index}`);
        if(index != -1){
            // all songs weren't played from time stamp to end of the day
            parsedTracks = parseTracks(response, index);
        }
        else{
            let lastTime = parsedTracks.times[parsedTracks.times.length - 1];
            let lastTimeUnix = lastTime.getTime();
            console.log(`Last time: ${lastTimeUnix}`);
            thisDaySongs(todayDate, lastTimeUnix, songs);
        }
    }   

    webApi.lastTracks(getAccessToken(), fromTimeStamp, 1, callback);
}

app.get("/data", (req, res) =>{
    let callback = () => {

        // res.writeHead(200, { "Content-Type": "application/json; charset=utf-8" });
    }
    // Clear hours, minutes, seconds, ... from date
    let from = new Date(new Date().toDateString());
    let fromTimeStamp = from.getTime();
    thisDaySongs(from, fromTimeStamp);

    // let json = {
    // }

    // res.writeHead(200, { "Content-Type": "application/json; charset=utf-8" });
    res.end();
});

// Listener
http.createServer(app).listen(port, () => {
    console.log(`Listening at http://192.168.0.?:${port}`);
});

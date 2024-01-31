// duration in ms
function TimeOut(callback, duration, ...args){
    this.startTime = new Date();
    this.timer = setTimeout(() => {
        callback(...args);
    }, duration);
    this.endTime = new Date(this.startTime.getTime() + duration);
}

TimeOut.prototype.clear = function(){
    clearTimeout(this.timer);
}

TimeOut.prototype.getTimeLeft = function(){
    return this.endTime.getTime() - Date.now();
}

TimeOut.prototype.info = function(){
    return [formatTime(this.getTimeLeft()), this.endTime.toLogFormat()];
}

function formatTime(timeLength){
    if(timeLength == -1 || timeLength == null){
        return `-1`;
    }
    // convert it to seconds
    timeLength /= 1000;
    const hours = ~~(timeLength / 3600);
    timeLength -= hours * 3600;
    const minutes = ~~(timeLength / 60);
    timeLength -= minutes * 60;
    const seconds = timeLength.toFixed(4);
    return `${hours}:${minutes}:${seconds}`;
}

Date.prototype.toLogFormat = function(){
    const year = this.getFullYear();
    const month = (this.getMonth() + 1).toString().padStart(2, '0');
    const day = this.getDate().toString().padStart(2, '0');
    const hours = this.getHours().toString().padStart(2, '0');
    const minutes = this.getMinutes().toString().padStart(2, '0');
    const seconds = this.getSeconds().toString().padStart(2, '0');
    const milliseconds = this.getMilliseconds().toString().padStart(3, '0');

    return `${year}-${month}-${day} ${hours}:${minutes}:${seconds}.${milliseconds}`;
}

Date.prototype.timeLeft = function(){
    return formatTime(this);
}

Date.prototype.sameDay = function(secondDate){
    this.getDate() === secondDate.getDate();
}

// const ESC = "\033";
const ESC = "\x1b";
const escapeSequence = `${ESC}[0m`;

function Color8Bit(r, g, b){
    this.r = r;
    this.g = g;
    this.b = b;
}

Color8Bit.prototype.toString = function(){
    return `${ESC}[38;2;${this.r};${this.g};${this.b}m`;
}

const yellow = new Color8Bit(255, 255, 0);
const red = new Color8Bit(255, 0, 0);

function color(color, text){
    return `${color.toString()}${text}${escapeSequence}`;
}

function log(str){
    const now = new Date();
    console.log(`${color(yellow, now.toLogFormat())} ${str}`);
}

function error(str){
    const now = new Date();
    console.log(`${color(yellow, now.toLogFormat())} ${color(red, str)}`);
}

function writeToFile(fs, path, data, successFunction, errorFunction){
    try{
        fs.writeFileSync(path, data);
        if(successFunction){
            successFunction();
        }
        return true;
    }
    catch(error){
        if(errorFunction){
            errorFunction(error);
        }
        return false;
    }
}

function getDateFromFolderName(folderName) {
    const dateString = folderName.slice(0, 8);
    const day = dateString.slice(0, 2);
    const month = dateString.slice(2, 4);
    const year = dateString.slice(4, 8);

    return new Date(`${year}-${month}-${day}`);
}

function getAllFolders(fs, dir){
    const folders = fs.readdirSync(dir);
    const sortedFolders = folders.sort((a, b) => {
        const dateA = getDateFromFolder(a);
        const dateB = getDateFromFolder(b);

        return dateA - dateB;
    });

    return sortedFolders;
}

function getFiles(fs, path, dir){
    const files = fs.readdirSync(dir);
    const regex = /(\d)+\.json/;
    const filteredFiles = files.filter((file) => {
        return regex.test(file);
    });

    const sortedFiles = filteredFiles.sort((a, b) => {
        const indexA = parseInt(path.basename(a, path.basename(a)), 10);
        const indexB = parseInt(path.basename(b, path.basename(b)), 10);

        return indexA - indexB;
    });

    return sortedFiles;
}

function dateStamp(date){
    const d = String(date.getDate()).padStart(2, '0');
    const m = String(date.getMonth() + 1).padStart(2, '0');
    const y = String(date.getFullYear());

    const folderName = `${d}${m}${y}`;

    return folderName;
}

function writeToDayLog(fs, path, newFileName){
    let data = {};
    if(fs.existsSync(path)){
        const fileContent = fs.readFileSync(path);
        data = tryJsonParse(fileContent);
    }

    if(data.files == undefined){
        data.files = [];
    }
    if(newFileName != undefined){
        data.files.push(newFileName);
    }

    fs.writeFile(path, JSON.stringify(data), (err) => { log(err) });
}

function tryJsonParse(data){
    try{
        return JSON.parse(data);
    }
    catch(_e){
        return {};
    }
}

function generateRandomString(length){
    let text = '';
    const possible = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789';

    for(let i = 0; i < length; i++) {
        text += possible.charAt(Math.floor(Math.random() * possible.length));
    }

    return text;
}

module.exports = {TimeOut, log, error, writeToFile, getAllFolders, getFiles, dateStamp, writeToDayLog, tryJsonParse, generateRandomString};

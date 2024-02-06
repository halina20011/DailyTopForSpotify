// duration in ms

function color(color, text){
    return `${color.toString()}${text}${escapeSequence}`;
}

class Func{
    getFiles(fs, path, dir){
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

    dateStamp(date){
        const d = String(date.getDate()).padStart(2, '0');
        const m = String(date.getMonth() + 1).padStart(2, '0');
        const y = String(date.getFullYear());

        const folderName = `${d}${m}${y}`;

        return folderName;
    }

    writeToDayLog(fs, path, newFileName){
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

    tryJsonParse(data){
        try{
            return JSON.parse(data);
        }
        catch(_e){
            return {};
        }
    }

    generateRandomString(length){
        let text = '';
        const possible = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789';

        for(let i = 0; i < length; i++) {
            text += possible.charAt(Math.floor(Math.random() * possible.length));
        }

        return text;
    }

    formatTime(timeLength){
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

    log(str){
        const now = new Date();
        console.log(`${color(yellow, now.toLogFormat())} ${str}`);
    }

    error(str){
        const now = new Date();
        console.log(`${color(yellow, now.toLogFormat())} ${color(red, str)}`);
    }

    writeToFile(fs, path, data, successFunction, errorFunction){
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
}

class TimeOut{
    constructor(callback, duration, ...args){
        this.startTime = new Date();
        this.timer = setTimeout(() => {
            callback(...args);
        }, duration);
        this.endTime = new Date(this.startTime.getTime() + duration);

    }

    clear(){
        clearTimeout(this.timer);
    }

    getTimeLeft(){
        return this.endTime.getTime() - Date.now();
    }

    info(){
        return [func.formatTime(this.getTimeLeft()), this.endTime.toLogFormat()];
    }
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
    return func.formatTime(this);
}

Date.prototype.sameDay = function(secondDate){
    this.getDate() === secondDate.getDate();
}

// const ESC = "\033";
const ESC = "\x1b";
const escapeSequence = `${ESC}[0m`;

class Color8Bit{
    constructor(r, g, b){
        this.r = r;
        this.g = g;
        this.b = b;
    }
}

Color8Bit.prototype.toString = function(){
    return `${ESC}[38;2;${this.r};${this.g};${this.b}m`;
}

const yellow = new Color8Bit(255, 255, 0);
const red = new Color8Bit(255, 0, 0);

const func = new Func();
export default func;
export {TimeOut};

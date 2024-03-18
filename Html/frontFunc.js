export const l = console.log;

export function createElement(html){
    const temp = document.createElement("div");
    temp.innerHTML = html;

    const element = temp.children[0];
    temp.remove();

    return element;
}

export function formatTime(ms){
    let seconds = Math.floor(ms / 1000);
    let minutes = Math.floor(seconds / 60);
    seconds %= 60;
    const hours = Math.floor(minutes / 60);
    minutes %= 60;

    const formatedSeconds = String(seconds).padStart(2, '0');
    const formatedMinutes = String(minutes).padStart(2, '0');
    const formatedHours = String(hours).padStart(2, '0');

    return {
        "seconds": seconds,
        "minutes": minutes,
        "hours": hours,
        "seconds2": formatedSeconds,
        "minutes2": formatedMinutes,
        "hours2": formatedHours
    };
}

export function getFormatedTime(ms){
    const ft = formatTime(ms);
    let str = "";
    if(ft.hours != 0){
        str = `${ft.hours}:${ft.minutes2}:${ft.seconds2}`;
    }
    else{
        if(ft.minutes != 0){
            str = `${ft.minutes}:${ft.seconds2}`;
        }
        else{
            str = `${ft.seconds}`;
        }
    }

    return str;
}

export function toMinutes(duration){
    const minutes = Math.floor(duration / 60);
    const seconds = (duration - minutes * 60).toFixed(0);
    const secondsText = (seconds < 10) ? "0" + seconds : seconds;
    return `${minutes}:${secondsText}`;
}

HTMLElement.prototype.$ = function(name, f, run){
    if(run == true && f){
        f();
    }

    this.addEventListener(name, () => { f(); }, false);
}

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
    const _yesterday = new Date(this);
    _yesterday.setHours(_yesterday.getHours() - 24);
    return _yesterday;
}

Date.prototype.firstMonday = function(){
    const day = this.getDay();
    const diff = this.getDate() - day + (day === 0 ? -6 : 1);
    return new Date(this.setDate(diff));
}

Date.prototype.clear = function(level){
    const dP = Date.prototype;
    const functions = [dP.setMilliseconds, dP.setSeconds, dP.setMinutes, dP.setHours, dP.setDate];
    for(let i = 0; i <= level; i++){
        functions[i].apply(this, [0]);
    }
}

export function padNumber(n, s){
    return String(n).padStart(s, '0');
}

Date.prototype.stamp = function(){
    const d = String(this.getDate()).padStart(2, '0');
    const m = String(this.getMonth() + 1).padStart(2, '0');
    const y = String(this.getFullYear());

    return `${d}${m}${y}`;
}

Date.prototype.fromStamp = function(stamp){
    this.clear(4);
    const d = parseInt(stamp.substring(0, 2));
    const m = parseInt(stamp.substring(2, 4)) - 1;
    const y = parseInt(stamp.substring(4, 8));

    // l(stamp);
    // l(d, m, y);

    this.setDate(d);
    this.setMonth(m);
    this.setFullYear(y);

    return this;
}

Date.prototype.hashFunc = function(start){
    const min = String(Math.floor(this.getMinutes() / 30));
    const h = padNumber(this.getHours(), 2);
    const d = padNumber(this.getDate(), 2);
    const m = padNumber(this.getMonth() + 1, 2);
    const y = String(this.getFullYear());

    const arr = [min, h, d, m, y];

    let str = "";
    for(let i = start; i < arr.length; i++){
        str += arr[i];
    }

    return str;
}

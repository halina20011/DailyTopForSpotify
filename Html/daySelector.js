Date.prototype.previousMonth = function(){
    const prevMonth = new Date(this);
    prevMonth.setMonth(prevMonth.getMonth() - 1);
    return prevMonth;
}

Date.prototype.nextMonth = function(){
    const nextMonth = new Date(this);
    nextMonth.setMonth(nextMonth.getMonth() + 1);
    return nextMonth;
}

Date.prototype.getDays = function(){
    return new Date(this.getFullYear(), this.getMonth() + 1, 0).getDate();
}

Date.prototype.getFirstDay = function(){
    return new Date(this.getFullYear(), this.getMonth(), 0).getDay();
}

Date.prototype.sameMonth = function(date){
    return (
        this.getFullYear() === date.getFullYear() && 
        this.getMonth() == date.getMonth()
    );
}

Date.prototype.sameDay = function(date){
    return (
        this.getFullYear() === date.getFullYear() && 
        this.getMonth() == date.getMonth() &&
        this.getDate() === date.getDate()
    );
}

function createElement(htmlString){
    const tempElement = document.createElement("div");
    tempElement.innerHTML = htmlString;

    const element = tempElement.firstElementChild;
    tempElement.removeChild(element);

    return element;
}

export class DaySelector{
    constructor(parentElement, monthWindow){
        this.parentElement = parentElement;
        this.monthWindow = (!monthWindow) ? new Date() : monthWindow;
        
        this.settings = createElement(`
            <div class="settings">
                <button class="previousMonth"></button>
                <p class="monthName"></p>
                <button class="nextMonth"></button>
            </div>
        `);

        this.monthName = this.settings.querySelector(".monthName");
        this.days = {};
        this.numberOfDays = 0;
        this.start = 0;
        this.end = 0;

        this.previousMonth = this.settings.querySelector(".previousMonth");
        this.previousMonth.addEventListener("click", () => {
            this.monthWindow = this.monthWindow.previousMonth();
            this.update();
        }, false);

        this.nextMonth = this.settings.querySelector(".nextMonth");
        this.nextMonth.addEventListener("click", () => {
            this.monthWindow = this.monthWindow.nextMonth();
            this.update();
        }, false);
        
        this.daySelectorHolder = document.createElement("div");
        this.daySelectorHolder.className = "daySelectorHolder";

        this.daySelector = document.createElement("div");
        this.daySelector.className = "daySelector";
        
        this.submit = createElement(`<button class="submit">submit</button>`);

        console.log(this.parentElement);
        this.parentElement.appendChild(this.daySelectorHolder);
        [this.settings, this.daySelector, this.submit].forEach(e => this.daySelectorHolder.appendChild(e));

        this.update();
    }
}

DaySelector.prototype.update = function(){
    this.numberOfDays = this.monthWindow.getDays();
    this.start = this.monthWindow.getFirstDay();
    this.end = this.start + this.numberOfDays;
    const str = this.monthWindow.toString().split(" ");
    this.monthName.innerText = `${str[1]} ${str[3]}`;
    this.daySelector.innerHTML = "";
    
    this.days = {};
    const today = new Date();

    for(let i = 0; i < this.end; i++){
        const enabled = (this.start <= i && i <= this.end);
        const obj = {
            button : createElement(`<div class="day"><p><p></div>`),
            enabled : enabled,
            state : false,
            date : null
        }

        const text = obj.button.querySelector("p");

        const dayDate = new Date(this.monthWindow);
        dayDate.setDate(i - this.start + 1);
        obj.date = dayDate;
        
        if(enabled){
            text.innerText = dayDate.getDate();
            if(dayDate.sameDay(today)){
                obj.button.classList.add("today");
                obj.button.classList.add("selectedDay");
                obj.state = true;
            }
        }
        const eventF = _ => {
            if(enabled){
                obj.button.classList.toggle("selectedDay");
                obj.state = !obj.state;
            }
        }
        obj.button.addEventListener("click", eventF, false);
        // button.addEventListener("mouseenter", (e) => {
        //     console.log(e);
        //     eventF();
        // }, false);
        this.daySelector.appendChild(obj.button);
        this.days[dayDate] = obj;
    }
}

DaySelector.prototype.select = function(date){
    if(this.monthWindow.sameMonth(date)){
        const day = date.getDate();
        this.days[day].button.classList.add("selectedDay");
        this.days[day].state = true;
    }
}

DaySelector.prototype.selected = function(){
    const arr = [];
    
    Object.keys(this.days).forEach(day => {
        if(this.days[day].state == true){
            arr.push(this.days[day].date);
        }
    });

    return arr;
}

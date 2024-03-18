let shift = false;
let prevSelected = null;

document.addEventListener("keydown", (e) => {
    if(e.key == "Shift"){
        shift = true;
        // console.log("down");
    }
});

document.addEventListener("keyup", (e) => {
    if(e.key == "Shift"){
        shift = false;
        // console.log("up");
        prevSelected = null;
    }
});

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

function monthHash(date){
    return `${date.getMonth()}/${date.getFullYear()}`;
}

class DaySelector{
    constructor(date, selectedDays, parent, days){
        this.date = date;
        this.enabled = (date != null);
        this.selected = false;
        this.selectedDays = selectedDays;
        this.days = days;

        const dText = (this.enabled) ? this.date.getDate() : "";
        this.element = createElement(`<div class="day"><p>${dText}</p></div>`);
        parent.appendChild(this.element);

        if(this.enabled){
            this.element.addEventListener("click", () => {
                if(shift === true){
                    // console.log(this, prevSelected);
                    if(prevSelected && prevSelected.date != this.date){
                        let start = prevSelected.date.getDate() - 1;
                        let end = this.date.getDate() - 1;
                        if(end < start){
                            [start, end] = [end, start];
                        }
                        // console.log(start, end);
                        for(let i = start; i <= end; i++){
                            if(!this.days[i].selected){
                                this.days[i].select();
                            }
                        }
                    }

                    prevSelected = this;
                    // console.log(prevSelected);
                }
                else{
                    if(this.selected){
                        this.unselect();
                    }
                    else{
                        this.select();
                    }
                }
            }, false);
        }
    }

    select(){
        this.selectedDays.add(this.date.stamp());
        // console.log(Array.from(this.selectedDays));
        // console.log(this.days);
        // console.log(this.date.);
        this.element.classList.add("selectedDay");
        this.selected = true;
    }

    unselect(){
        this.selectedDays.delete(this.date.stamp());
        this.element.classList.remove("selectedDay");
        this.selected = false;
    }
}

class MonthSelector{
    constructor(date, selectedDays, parentElement){
        this.date = date;
        this.hash = monthHash(date);
        this.selectedDays = selectedDays;
        this.init(parentElement);
    }

    enable(){
        this.dayHolder.classList.remove("hidden");
    }

    disable(){
        this.dayHolder.classList.add("hidden");
    }

    init(parentElement){
        this.dayHolder = document.createElement("div");
        this.dayHolder.className = "dayHolder";
        parentElement.appendChild(this.dayHolder);

        const str = this.date.toString().split(" ");
        this.name = `${str[1]} ${str[3]}`;

        this.numberOfDays = this.date.getDays();
        this.start = this.date.getFirstDay();
        this.end = this.start + this.numberOfDays;
        
        this.days = [];
        const today = new Date();

        for(let i = 0; i < this.end; i++){
            let dayDate = null;
            const enabled = (this.start <= i && i <= this.end);

            if(enabled){
                dayDate = new Date(this.date);
                const date = i - this.start + 1;
                // console.log(date);
                dayDate.setDate(date);
            }
            const dayHolder = new DaySelector(dayDate, this.selectedDays, this.dayHolder, this.days);

            if(enabled){
                if(dayDate.sameDay(today)){
                    dayHolder.element.classList.add("today");
                    dayHolder.select();
                }
                this.days.push(dayHolder);
            }
        }
    }

    select(date){
        if(this.monthWindow.sameMonth(date)){
            const day = date.getDate();
            this.days[day].button.classList.add("selectedDay");
            this.days[day].state = true;
        }
    }

    clear(){
        this.days.forEach(daySelector => {
            if(daySelector.selected){
                daySelector.unselect();
            }
        });
    }
}

export class DateSelector{
    constructor(parentElement, monthWindow, submitFunc){
        this.parentElement = parentElement;
        
        this.monthWindow = (!monthWindow) ? new Date() : monthWindow;
        this.monthSelector = null;
        
        this.selectedDays = new Set();
        this.months = new Map();
        
        const settings = createElement(`
            <div class="settings">
                <button class="previousMonth"></button>
                <p class="monthName"></p>
                <button class="nextMonth"></button>
            </div>
        `);

        this.monthNameElement = settings.querySelector(".monthName");

        this.previousMonth = settings.querySelector(".previousMonth");
        this.previousMonth.addEventListener("click", () => {
            this.monthSelector.disable();
            this.monthWindow = this.monthWindow.previousMonth();
            this.updateMonth();
        }, false);

        this.nextMonth = settings.querySelector(".nextMonth");
        this.nextMonth.addEventListener("click", () => {
            this.monthSelector.disable();
            this.monthWindow = this.monthWindow.nextMonth();
            this.updateMonth();
        }, false);
        
        this.monthSelectorHolder = document.createElement("div");
        this.dateSelectorHolder = document.createElement("div");
        this.dateSelectorHolder.className = "dateSelector";
 
        const rangeSelector = createElement(`<div class="rangeSelector">
                    <p>range: </p>
                    <select class="selectDateRange">
                        <option value="1">day</option>
                        <option value="7">week</option>
                        <option value="31">month</option>
                    </select>
                </div>`);

        const buttonHolder = createElement(`<div class="buttonHolder">
                <button class="clearAll">clear all</button>
                <button class="clear" style="margin-left: auto;">clear</button>
                <button class="submit">submit</button>
            </div>`);

        buttonHolder.querySelector(".clear").addEventListener("click", () => {
            this.monthSelector.clear();
        });

        buttonHolder.querySelector(".clearAll").addEventListener("click", () => { this.clearAll(); });

        buttonHolder.querySelector(".submit").addEventListener("click", () => {
            submitFunc(this.selected());
        });

        const selectDateRange = rangeSelector.querySelector(".selectDateRange");
        selectDateRange.$("input", () => {
            const range = parseInt(selectDateRange.value);
            this.selectRange(range);
        });

        this.parentElement.appendChild(this.dateSelectorHolder);
        
        [settings, this.monthSelectorHolder, rangeSelector, buttonHolder].forEach(e => this.dateSelectorHolder.appendChild(e));

        this.updateMonth();
    }

    updateMonth(){
        const hash = monthHash(this.monthWindow);
        if(!this.months.has(hash)){
            // console.log("new month");
            this.months.set(hash, new MonthSelector(this.monthWindow, this.selectedDays, this.monthSelectorHolder));
        }

        this.monthSelector = this.months.get(hash);

        this.monthNameElement.innerHTML = this.monthSelector.name;
        // console.log(this.monthSelector.dayHolder);
        this.monthSelector.enable();
    }

    selected(){
        return Array.from(this.selectedDays.keys()).map(stamp => new Date().fromStamp(stamp));
    }
    
    clearAll(){
        this.months.forEach((v) => {
            v.clear();
        });
    }

    selectRange(n){
        this.clearAll();
        const thisMonthWindow = this.monthWindow;
        let day = new Date().getDate() - 1;
        while(0 < n){
            while(0 < n && 0 <= day){
                this.monthSelector.days[day--].select()
                n--;
            }
            if(0 < n && day < 0){
            this.monthSelector.disable();
                this.monthWindow = this.monthWindow.previousMonth();
                this.updateMonth();
                day = this.monthSelector.days.length - 1;
            }
        }

        this.monthSelector.disable();
        this.monthWindow = thisMonthWindow;
        this.updateMonth();
    }
}

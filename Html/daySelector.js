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
    constructor(date, selectedDays, parent){
        this.date = date;
        this.enabled = (date != null);
        this.selected = false;
        this.selectedDays = selectedDays;

        const dText = (this.enabled) ? this.date.getDate() : "";
        this.element = createElement(`<div class="day"><p>${dText}</p></div>`);
        parent.appendChild(this.element);

        if(this.enabled){
            this.element.addEventListener("click", () => {
                this.element.classList.toggle("selectedDay");
                this.selected = !this.selected;
                if(this.selected){
                    this.selectedDays.add(this);
                }
                else{
                    this.selectedDays.delete(this);
                }
            }, false);
        }
    }

    select(){
        this.selectedDays.add(this);
        this.element.classList.add("selectedDay");
        this.selected = true;
    }

    unselect(){
        this.selectedDays.delete(this);
        this.element.classList.remove("selectedDay");
        this.selected = true;
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
        
        this.days = Array.from({length: this.end});
        const today = new Date();

        for(let i = 0; i < this.end; i++){
            let dayDate = null;
            const enabled = (this.start <= i && i <= this.end);

            if(enabled){
                dayDate = new Date(this.date);
                dayDate.setDate(i - this.start + 1);
            }
            const dayHolder = new DaySelector(dayDate, this.selectedDays, this.dayHolder);

            if(enabled && dayDate.sameDay(today)){
                dayHolder.element.classList.add("today");
                dayHolder.select();
            }
            
            this.days[i] = dayHolder;
        }
    }

    select(date){
        if(this.monthWindow.sameMonth(date)){
            const day = date.getDate();
            this.days[day].button.classList.add("selectedDay");
            this.days[day].state = true;
        }
    }
}

export class DateSelector{
    constructor(parentElement, monthWindow){
        this.parentElement = parentElement;
        
        this.monthWindow = (!monthWindow) ? new Date() : monthWindow;
        // this.monthSelector = new MonthSelector(this.monthWindow);
        
        this.selectedDays = new Set();
        this.months = new Map();
        
        this.settings = createElement(`
            <div class="settings">
                <button class="previousMonth"></button>
                <p class="monthName"></p>
                <button class="nextMonth"></button>
            </div>
        `);

        this.monthNameElement = this.settings.querySelector(".monthName");

        this.previousMonth = this.settings.querySelector(".previousMonth");
        this.previousMonth.addEventListener("click", () => {
            this.monthSelector.disable();
            this.monthWindow = this.monthWindow.previousMonth();
            this.updateMonth();
        }, false);

        this.nextMonth = this.settings.querySelector(".nextMonth");
        this.nextMonth.addEventListener("click", () => {
            this.monthSelector.disable();
            this.monthWindow = this.monthWindow.nextMonth();
            this.updateMonth();
        }, false);
        
        this.monthSelectorHolder = document.createElement("div");
        this.dateSelectorHolder = document.createElement("div");
        this.dateSelectorHolder.className = "dateSelector";
        
        this.submit = createElement(`<button class="submit">submit</button>`);

        console.log(this.parentElement);
        this.parentElement.appendChild(this.dateSelectorHolder);
        [this.settings, this.monthSelectorHolder, this.submit].forEach(e => this.dateSelectorHolder.appendChild(e));

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
        return Array.from(this.selectedDays).map(daySelector => daySelector.date);
    }
}

import * as frontFunc from "./frontFunc.js";

Object.assign(globalThis, frontFunc);

const nextAccessTokenEl = document.querySelector(".nextAccessToken");
const nextRequestEl = document.querySelector(".nextRequest");

function addTimer(text, date, parent){
    parent.innerText = "null";

    if(!date){
        return;
    }
    
    setInterval(() => {
        const time = new Date(date);
        time.setMilliseconds(0);
        const diff = time.getTime() - Date.now();
        if(diff < 0){
            window.location.reload(); 
        }

        parent.innerText = `${text}: ${getFormatedTime(diff)}`;
    }, 500);
}

fetch("/api/info").then(r =>  {
    r.json().then(j => {
        const nextAccessToken = j.nextAccessToken[1];
        const nextRequest = (j.nextRequest) ? j.nextRequest[1] : null;
        addTimer("next Access Token", nextAccessToken, nextAccessTokenEl);
        addTimer("next request", nextRequest, nextRequestEl);
    })
})

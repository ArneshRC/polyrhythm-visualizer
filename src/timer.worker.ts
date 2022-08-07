let timerID: number = null;
let interval = 25;

self.addEventListener('message', ev => {

    if(ev.data == "start") {
        timerID = self.setInterval(
            () => postMessage("tick"),
            interval
        );
    } else if(ev.data == "stop") {
        clearInterval(timerID);
        timerID = null;
    }

});


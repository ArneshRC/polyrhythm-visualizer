let timerID: number | null = null;
const interval = 25;

self.addEventListener("message", event => {
    if (event.data == "start") {
        timerID = self.setInterval(() => postMessage("tick"), interval);
    } else if (event.data == "stop") {
        if (timerID != null) clearInterval(timerID);
        timerID = null;
    }
});

let timerID: number | null = null;
const interval = 25;

self.addEventListener("message", ev => {
    if (ev.data == "start") {
        timerID = self.setInterval(() => postMessage("tick"), interval);
    } else if (ev.data == "stop") {
        if (timerID != null) clearInterval(timerID);
        timerID = null;
    }
});

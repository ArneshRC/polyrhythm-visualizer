import { mount } from "redom";
import App from "./App";

import "./styles/index.css";

window.addEventListener("load", () => {
    mount(document.querySelector<HTMLDivElement>("#app")!, new App());
});

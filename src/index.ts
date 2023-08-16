import { mount } from "redom";
import App from "./App";

mount(document.querySelector<HTMLDivElement>("#app")!, new App());

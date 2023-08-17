import { mount } from "redom";
import App from "./App";

import "./styles/index.css";

mount(document.querySelector<HTMLDivElement>("#app")!, new App());

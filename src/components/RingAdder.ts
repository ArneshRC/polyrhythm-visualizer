import classNames from "classnames";
import { RedomComponent, el } from "redom";
import Icon from "./Icon";
import { mdiPlus } from "@mdi/js";
import colors from "tailwindcss/colors";

class RingAdder implements RedomComponent {
    el: HTMLButtonElement; 
    private classes = new (class {
        get plus() {
            return classNames([
                "w-10",
                "h-10",
                "absolute",
                "rounded-md",
                "bg-neutral-700",
                "text-neutral-200",
                "cursor-pointer",
                "top-1/2",
                "left-1/2",
                "-translate-x-1/2",
                "-translate-y-1/2",
                "select-none",
                "text-2xl",
                "flex",
                "items-center",
                "justify-center",
                "hover:bg-neutral-600",
                "transition-all"
            ]);
        }
    })();

    constructor() {
        this.el = el("button", new Icon(mdiPlus, colors.neutral[400]), {
            className: this.classes.plus
        });
        this.el.addEventListener("click", () => {
            this.clickHandler();
        });

    }

    clickHandler: () => void = () => {};
    set onClick(clickHandler: () => void) {
        this.clickHandler = clickHandler;
    }
}

export default RingAdder;

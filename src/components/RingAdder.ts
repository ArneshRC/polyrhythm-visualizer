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
                "rounded-full",
                "text-neutral-200",
                "cursor-pointer",
                "top-1/2",
                "left-1/2",
                "-translate-x-1/2",
                "-translate-y-1/2",
                "select-none",
                "focus:outline-none",
                "text-2xl",
                "flex",
                "items-center",
                "justify-center",
                "px-1",
                "border-2",
                "border-dashed",
                "border-neutral-500",
                "hover:bg-neutral-800",
                "transition-all"
            ]);
        }
    })();

    constructor() {
        this.el = el("button", new Icon(mdiPlus, colors.neutral[500]), {
            id: "ring-adder",
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

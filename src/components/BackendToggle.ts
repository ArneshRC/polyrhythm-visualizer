import classNames from "classnames";
import { RedomComponent, el } from "redom";

/**
 * A switch pinned to the bottom right of the screen,
 * for picking the rendering backend
 */
class BackendToggle implements RedomComponent {
    el: HTMLLabelElement;

    private classes = new (class {
        get container() {
            return classNames([
                "fixed",
                "bottom-4",
                "right-4",
                "z-10",
                "flex",
                "items-center",
                "gap-2",
                "font-sans",
                "text-sm",
                "text-neutral-300",
                "cursor-pointer",
                "select-none"
            ]);
        }
        get input() {
            return classNames(["sr-only", "peer"]);
        }
        get track() {
            return classNames([
                "w-10",
                "h-6",
                "rounded-full",
                "bg-neutral-800",
                "border",
                "border-neutral-600",
                "peer-checked:bg-blue-600",
                "peer-checked:border-blue-500",
                "peer-focus-visible:ring-2",
                "peer-focus-visible:ring-neutral-400",
                "transition-all"
            ]);
        }
        get knob() {
            // The knob is a sibling of the checkbox rather than a
            // child of the track, because `peer-checked` only
            // reaches the peer's siblings
            return classNames([
                "absolute",
                "left-1",
                "top-1/2",
                "-translate-y-1/2",
                "w-4",
                "h-4",
                "rounded-full",
                "bg-neutral-400",
                "peer-checked:translate-x-4",
                "peer-checked:bg-neutral-100",
                "transition-all"
            ]);
        }
    })();

    private input: HTMLInputElement;

    /**
     * @param checked Whether the switch starts on
     */
    constructor(checked: boolean) {
        this.input = el("input", {
            type: "checkbox",
            checked,
            className: this.classes.input
        });

        this.el = el(
            "label",
            [
                this.input,
                el("span", { className: this.classes.track }),
                el("span", { className: this.classes.knob }),
                "Use WebGL"
            ],
            { id: "webgl-toggle", className: this.classes.container }
        );

        this.input.addEventListener("change", () => {
            this.changeHandler(this.input.checked);
        });
    }

    /**
     * Whether the switch is on
     */
    get checked() {
        return this.input.checked;
    }

    set checked(checked: boolean) {
        this.input.checked = checked;
    }

    private changeHandler: (checked: boolean) => void = () => {};
    set onChange(changeHandler: (checked: boolean) => void) {
        this.changeHandler = changeHandler;
    }
}

export default BackendToggle;

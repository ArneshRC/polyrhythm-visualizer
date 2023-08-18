import classNames from "classnames";
import { RedomComponent, el } from "redom";
import { EASE, Scene } from "scenejs";
import { sleep } from "../utils";

class FlyingBeatCount implements RedomComponent {
    el: HTMLDivElement;
    private classes = new (class {
        getSpan(beatCount: number, increasing: boolean) {
            return classNames([
                "rounded-full",
                "w-8",
                "h-8",
                "bg-neutral-800",
                "text-neutral-300",
                "absolute",
                "flex",
                "items-center",
                "justify-center",
                `flying-beat-count-${beatCount}-${increasing ? "inc" : "dec"}`
            ]);
        }
    })();
    beatCount: number;
    increasing: boolean;
    constructor(beatCount: number, increasing: boolean) {
        this.beatCount = beatCount;
        this.increasing = increasing;
        this.el = el("div", beatCount.toString(), {
            className: this.classes.getSpan(beatCount, increasing)
        });
    }

    async animateFly() {
        const scene = new Scene(
            {
                [`.flying-beat-count-${this.beatCount}-${
                    this.increasing ? "inc" : "dec"
                }`]: {
                    0: {
                        opacity: 1,
                        transform: {
                            translateX: "50%",
                            translateY: "-50%",
                            scale: 1
                        }
                    },
                    1: {
                        opacity: 0,
                        transform: {
                            translateX: "150%",
                            translateY: "-150%",
                            scale: 0.2
                        }
                    }
                }
            },
            {
                easing: EASE,
                selector: true
            }
        ).playCSS();

        await sleep(1000);

        scene.clear();
    }
}

export default FlyingBeatCount;

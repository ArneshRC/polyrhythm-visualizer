import classNames from "classnames";
import { RedomComponent, el } from "redom";
import { EASE, Scene } from "scenejs";
import { sleep } from "../utils";

class FlyingBeatCount implements RedomComponent {
    /**
     * Keeps every overlay's animation hook unique. Two of them
     * in flight at once used to share a class and drive each
     * other's animation.
     */
    private static instanceCount = 0;

    el: HTMLDivElement;
    private classes = new (class {
        getSpan(hook: string) {
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
                hook
            ]);
        }
    })();
    beatCount: number;
    increasing: boolean;

    /**
     * The class the scenejs selector keys off
     */
    private hook: string;

    constructor(beatCount: number, increasing: boolean) {
        this.beatCount = beatCount;
        this.increasing = increasing;
        this.hook = `flying-beat-count-${FlyingBeatCount.instanceCount++}`;
        this.el = el("div", beatCount.toString(), {
            className: this.classes.getSpan(this.hook)
        });
    }

    async animateFly() {
        // Increments fly up and away, decrements drop
        const endY = this.increasing ? "-150%" : "50%";

        const scene = new Scene(
            {
                [`.${this.hook}`]: {
                    /** Pops in... **/
                    0: {
                        opacity: 0,
                        transform: {
                            translateX: "50%",
                            translateY: "-50%",
                            scale: 0.6
                        }
                    },
                    0.15: {
                        opacity: 1,
                        transform: {
                            translateX: "50%",
                            translateY: "-50%",
                            scale: 1.15
                        }
                    },
                    0.3: {
                        opacity: 1,
                        transform: {
                            translateX: "50%",
                            translateY: "-50%",
                            scale: 1
                        }
                    },
                    /** ...then flies off **/
                    1: {
                        opacity: 0,
                        transform: {
                            translateX: "150%",
                            translateY: endY,
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

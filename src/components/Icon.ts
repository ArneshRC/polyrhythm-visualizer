import classNames from "classnames";
import { RedomComponent, svg } from "redom";
import colors from "tailwindcss/colors";

class Icon implements RedomComponent {
    el: SVGElement;
    private classes = new (class {
        get svg() {
            return classNames(["m-1"]);
        }
    })();
    constructor(iconPath: string, color?: string) {
        this.el = svg(
            "svg",
            [
                svg(
                    "path",
                    {
                        d: iconPath
                    },
                    { fill: color || colors.neutral[900] }
                )
            ],
            { viewBox: "0 0 24 24", class: this.classes.svg }
        );
    }
}

export default Icon;

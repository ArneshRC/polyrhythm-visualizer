import classNames from "classnames";
import { RedomComponent, el } from "redom";

class RingAdder implements RedomComponent {

    private classes = {
        plus: classNames([
            'w-10',
            'h-10',
            'absolute',
            'rounded-md',
            'bg-neutral-700',
            'text-neutral-200',
            'cursor-pointer',
            'top-1/2',
            'left-1/2',
            '-translate-x-1/2',
            '-translate-y-1/2',
            'select-none',
            'text-2xl',
            'flex',
            'items-center',
            'justify-center',
            'hover:bg-neutral-600',
            'transition-all'
        ])
    }
    el = el('div', '+', { className: this.classes.plus })
    set onClick(clickHandler: () => void) {
        this.el.addEventListener('click', clickHandler);
    }

}

export default RingAdder;

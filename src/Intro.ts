import { el, mount, RedomComponent, unmount } from 'redom';

import App from './App';
import { text } from './constants';

export default class Intro implements RedomComponent {

    public el: HTMLElement;

    constructor() {

        this.el = el('div.intro.main-container',
            el('h1#app-name', text.appName),
            el('h1#click-to-start', text.clickToStart),
        );

        this.el.addEventListener('click', () => {
            unmount(document.body, this);
            const app = new App();
            app.init();
        })

    }

    init() {
        mount(document.body, this);
    }

}

import './public/styles/main.scss';
import Intro from './Intro';

document.addEventListener('load', () => {
    const intro = new Intro();
    intro.init();
});


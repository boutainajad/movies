import './style.css';
import AppUI from './services/router.js';
import { initPlayer } from './services/player.js';

const app = new AppUI();
window.app = app;
window.showPage = (name) => app.switchPage(name);

initPlayer(app);

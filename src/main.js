import './style.css';
import { initI18n, setLanguage } from './i18n/index.js';
import AppUI from './services/router.js';
import { initPlayer } from './services/player.js';

initI18n();

const app = new AppUI();
window.app = app;
window.showPage = (name) => app.switchPage(name);

initPlayer(app);

document.getElementById('langSelect')?.addEventListener('change', (e) => {
  setLanguage(e.target.value);
});

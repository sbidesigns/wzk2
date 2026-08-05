// barrel/ui/screens/screen.pause.js — overlaid on race
import { el, playUISound } from './_shared.js';

export async function mount(root, payload, ctx) {
  root.innerHTML = `
    <div class="pause-overlay">
      <div class="pause-card anim-scale-in">
        <h2 class="pause-title">PAUSED</h2>
        <button class="btn btn-primary btn-lg" data-action="resume">RESUME</button>
        <button class="btn" data-action="settings">SETTINGS</button>
        <button class="btn" data-action="restart">RESTART RACE</button>
        <button class="btn btn-ghost" data-action="quit">QUIT TO MAIN MENU</button>
      </div>
    </div>
  `;
  root.querySelector('[data-action="resume"]').addEventListener('click', () => {
    playUISound('confirm');
    window.__engine.bus.emit('ui:hidePause');
  });
  root.querySelector('[data-action="settings"]').addEventListener('click', () => {
    playUISound('navigate');
    window.__uiRouter.push('settings.root');
  });
  root.querySelector('[data-action="restart"]').addEventListener('click', () => {
    playUISound('confirm');
    const engine = window.__engine;
    const payload = engine.state.get('race.payload');
    engine.scenes.transition(engine.resolver.resolve('scenes', 'race'), payload);
    window.__engine.bus.emit('ui:hidePause');
  });
  root.querySelector('[data-action="quit"]').addEventListener('click', () => {
    playUISound('back');
    const engine = window.__engine;
    engine.scenes.transition({ module: { mount: async () => {}, unmount: async () => {} } }, {});
    document.getElementById('ui-shell').style.display = 'block';
    window.__uiRouter.popToRoot();
  });
}
export async function unmount(root) {}
export default { mount, unmount };

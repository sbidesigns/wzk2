// barrel/ui/screens/screen.cutscene.js — uses scene.cutscene under the hood
import { el, playUISound } from './_shared.js';

export async function mount(root, payload, ctx) {
  const engine = window.__engine;
  // Hide UI shell so the 3D cutscene canvas shows through
  document.getElementById('ui-shell').style.display = 'none';
  // Start the cutscene scene
  await engine.scenes.transition(engine.resolver.resolve('scenes', 'cutscene'), payload || {});

  // Skip button overlay
  const skip = el('div', '', `
    <div style="position:fixed; bottom:var(--space-xl); right:var(--space-xl); z-index:100; display:flex; gap:var(--space-s);">
      <button class="btn btn-ghost" id="cutscene-skip">SKIP ›</button>
    </div>
  `);
  root.appendChild(skip);
  skip.querySelector('#cutscene-skip').addEventListener('click', () => {
    playUISound('back');
    finish();
  });

  const finish = () => {
    engine.bus.emit('cutscene:complete');
  };

  // Listen for cutscene completion
  const unsub = engine.bus.on('cutscene:complete', () => {
    document.getElementById('ui-shell').style.display = 'block';
    window.__uiRouter.pop();
    unsub();
  });
}

export async function unmount(root) {
  // Cutscene scene is unmounted by SceneManager when next scene transitions in
}
export default { mount, unmount };

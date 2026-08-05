// barrel/ui/screens/screen.mode-select.js
// Barrel adapter that delegates to the comprehensive ui/mode-select.js module

import { getModeSelect } from '../../../ui/mode-select.js';

export async function mount(root, payload, ctx) {
  // Delegate mounting to the ModeSelectSystem singleton
  await getModeSelect().mount(root, payload, {
    router: ctx?.router,
    node: ctx?.node,
    manifestEntry: ctx?.manifestEntry
  });
  
  return root;
}

export async function unmount(root, payload) {
  await getModeSelect().unmount(root, payload);
}

export default { mount, unmount };

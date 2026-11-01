// Genvejstaster som tekst ("Ctrl+Alt+Space") og som virtuel tastekode +
// modifiers til tastaturhooket. Bruges både af brugerfladen (som <script>) og
// af hovedprocessen og hook-workeren (via require).
(function (root, factory) {
  const m = factory();
  if (typeof module === 'object' && module.exports) module.exports = m;
  else root.Hotkey = m;
})(typeof self !== 'undefined' ? self : this, function () {
  'use strict';

  const MOD = { Ctrl: 1, Alt: 2, Shift: 4, Super: 8 };
  const NAMED = {
    Space: 0x20, Enter: 0x0d, Tab: 0x09, Backspace: 0x08, Delete: 0x2e, Insert: 0x2d,
    Home: 0x24, End: 0x23, PageUp: 0x21, PageDown: 0x22, Up: 0x26, Down: 0x28, Left: 0x25, Right: 0x27,
  };

  function vkToKey(vk) {
    if (vk >= 0x70 && vk <= 0x87) return 'F' + (vk - 0x6f);
    if ((vk >= 0x41 && vk <= 0x5a) || (vk >= 0x30 && vk <= 0x39)) return String.fromCharCode(vk);
    return Object.keys(NAMED).find((k) => NAMED[k] === vk) || null;
  }
  function keyToVk(key) {
    const f = /^F(\d+)$/.exec(key);
    if (f) return 0x6f + Number(f[1]);
    if (/^[A-Z0-9]$/.test(key)) return key.charCodeAt(0);
    return NAMED[key] || 0;
  }

  // Tast fra hooket som tekst, eller null hvis den ikke kan bruges. En
  // almindelig tast uden modifier ville blive slugt overalt, så kun F-taster må stå alene.
  function fromHook(vk, mods) {
    const key = vkToKey(vk);
    if (!key || (!mods && !/^F\d+$/.test(key))) return null;
    return [...Object.keys(MOD).filter((n) => mods & MOD[n]), key].join('+');
  }
  function toHook(acc) {
    const parts = String(acc).split('+');
    const key = parts.pop();
    return { vk: keyToVk(key), mods: parts.reduce((m, p) => m | (MOD[p] || 0), 0) };
  }

  // Den fysiske Copilot-tast sendes af Windows som Win + Shift + F23
  const COPILOT = fromHook(0x86, MOD.Shift | MOD.Super);
  const label = (acc, copilotText) => (acc === COPILOT ? copilotText : acc.replace(/\bSuper\b/, 'Win').split('+').join(' + '));

  return { COPILOT, fromHook, toHook, label };
});

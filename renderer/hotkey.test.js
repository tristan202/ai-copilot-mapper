// npm test – tjekker omsætningen mellem tastetryk fra hooket og genvejstekst
const assert = require('assert');
const { COPILOT, fromHook, toHook, label } = require('./hotkey.js');

const CTRL = 1, ALT = 2, SHIFT = 4, WIN = 8;

assert.strictEqual(COPILOT, 'Shift+Super+F23');
assert.deepStrictEqual(toHook(COPILOT), { vk: 0x86, mods: SHIFT | WIN });
assert.strictEqual(fromHook(0x20, CTRL | ALT), 'Ctrl+Alt+Space');
assert.strictEqual(fromHook(0x41, CTRL | SHIFT), 'Ctrl+Shift+A');
assert.strictEqual(fromHook(0x7b, 0), 'F12', 'F-tast må stå alene');
assert.strictEqual(fromHook(0x41, 0), null, 'bogstav uden modifier afvises');
assert.strictEqual(fromHook(0xde, CTRL), null, 'ukendt tast afvises');

// Alt, der kan optages, skal kunne genkendes af hooket igen
for (const [vk, mods] of [[0x86, SHIFT | WIN], [0x20, CTRL | ALT], [0x31, ALT | SHIFT], [0x25, WIN], [0x70, 0]]) {
  assert.deepStrictEqual(toHook(fromHook(vk, mods)), { vk, mods });
}

assert.strictEqual(label(COPILOT, 'Copilot-tast'), 'Copilot-tast');
assert.strictEqual(label('Super+Alt+K', 'x'), 'Win + Alt + K');

console.log('hotkey: ok');

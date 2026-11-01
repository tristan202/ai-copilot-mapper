/* global I18N, Hotkey */
'use strict';
// Samme window.api som Electron-udgavens preload.js, men via Tauri-kommandoer.
// Alle kald giver { value } eller { error } tilbage; fejl fra Rust er tekstnøgler.
(function () {
  const { invoke } = window.__TAURI__.core;
  const { listen } = window.__TAURI__.event;

  const call = async (cmd, args) => {
    try { return { value: await invoke(cmd, args) }; } catch (e) { return { error: I18N.t(String(e)) }; }
  };
  // Intet gemt sprog: brug Windows' sprog
  const withLang = (r) => { if (r.value && !r.value.lang) r.value.lang = I18N.detect(navigator.language); return r; };

  const api = {
    info: async () => withLang(await call('app_info')),
    setLang: (lang) => call('set_lang', { lang }),
    setSettings: async (s) => withLang(await call('set_settings', s)),

    select: (id) => call('select', { id }),
    saveAI: (s) => call('save_ai', { id: s.id || null, name: s.name, url: s.url }),
    deleteAI: (id) => call('delete_ai', { id }),
    setExternal: (id, on) => call('set_external', { id, on }),
    openExternal: (url) => call('open_url', { url }),

    async setHotkey(acc) {
      const { vk, mods } = Hotkey.toHook(acc);
      return withLang(await call('set_hotkey', { acc, vk, mods }));
    },
    // Hooket giver (vk, modifiers); hotkey.js afgør om tasten kan bruges
    async recordHotkey() {
      const r = await call('record_hotkey');
      if (r.error || !r.value) return { value: null, ...r };
      const acc = Hotkey.fromHook(r.value[0], r.value[1]);
      return acc ? api.setHotkey(acc) : { error: I18N.t('HotkeyNeedsModifier') };
    },
    cancelRecord: () => call('cancel_record'),

    onShow: (fn) => listen('ui:show', (e) => fn(e.payload)),
    setTray: (text) => call('set_tray', { text }),

    // AI-siden ligger som en webview oven på #view
    view: {
      load: (url, r) => call('view_load', { url, ...r }),
      bounds: (r) => call('view_bounds', r),
      visible: (on) => call('view_visible', { on }),
      cmd: (cmd) => call('view_cmd', { cmd }),
      url: () => call('view_url'),
    },
  };
  window.api = api;
})();

/* global I18N, Hotkey, api */
'use strict';

const $ = (s, el = document) => el.querySelector(s);
const $$ = (s, el = document) => [...el.querySelectorAll(s)];
const esc = (s) => String(s ?? '').replace(/[&<>"']/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));
const tr = (k, v) => I18N.t(k, v);
const plain = (k, v) => I18N.plain(I18N.t(k, v)); // uden "..." og ":" i enden
const unwrap = (r) => { if (r.error) throw new Error(r.error); return r.value; };
const hostOf = (url) => { try { return new URL(url).host; } catch { return url; } };
const hotkeyLabel = (acc) => Hotkey.label(acc, tr('CopilotKey'));

const GITHUB = 'https://github.com/tristan202/AI-CoPilot-Mapper';
const COLORS = { gemini: '#5b8def', chatgpt: '#10a37f', claude: '#d97757', copilot: '#2bb3a3', grok: '#4b5370', perplexity: '#20808d', deepseek: '#4d6bfe', kimi: '#9b6cf0' };

function loadUi() { try { return JSON.parse(localStorage.getItem('aicm.ui')) || {}; } catch { return {}; } }
const ui = { sidebar: true, ...loadUi() };
function saveUi() { try { localStorage.setItem('aicm.ui', JSON.stringify(ui)); } catch {} }

const state = { info: null, editing: null, ready: false };
const current = () => state.info.services.find((s) => s.id === state.info.selected) || state.info.services[0];

// ---------- Tegning ----------
function avatar(s) {
  // Egne tjenester får en fast farve ud fra navnet
  const color = COLORS[s.id] || `hsl(${[...s.name].reduce((h, c) => h + c.charCodeAt(0), 0) % 360} 45% 45%)`;
  return `<span class="avatar" style="background:${color}">${esc(s.name.slice(0, 2))}</span>`;
}

function renderList() {
  $('#ai-list').innerHTML = state.info.services.map((s) => `
    <div class="host-item ${s.id === state.info.selected ? 'selected' : ''}" data-id="${esc(s.id)}" tabindex="0">
      ${avatar(s)}
      <div class="meta"><div class="name">${esc(s.name)}</div><div class="sub">${esc(hostOf(s.url))}</div></div>
      <button class="edit" data-edit="${esc(s.id)}" title="${esc(plain('BtnEdit'))}" aria-label="${esc(plain('BtnEdit'))}">✎</button>
    </div>`).join('');
}

function renderFoot() {
  const ok = state.info.hotkeyOk;
  const foot = $('#foot');
  foot.className = ok ? '' : 'warn';
  foot.textContent = hotkeyLabel(state.info.hotkey);
  foot.title = ok ? plain('HotkeyCurrent') : tr('HotkeyTaken');
  // Bakkemenuen får sine tekster herfra, så de følger sproget
  api.setTray({
    open: tr('MenuOpenAI'), pause: tr('MenuPause'), settings: tr('MenuSettings'), about: tr('MenuAbout'), exit: tr('MenuExit'),
    tooltip: `AI Copilot Mapper ${state.info.version}\n${plain('HotkeyCurrent')}: ${hotkeyLabel(state.info.hotkey)}`,
    paused: tr('TrayPaused'),
  });
}

// WebView2 fortæller ikke om der er en side at gå tilbage til, så knapperne er altid aktive
function renderNav() {
  const live = !current().external;
  for (const c of ['back', 'forward', 'reload']) $(`[data-cmd=${c}]`).disabled = !live;
}

// AI-siden er en webview, der ligger oven på brugerfladen og skal følge #view
const viewRect = () => { const r = $('#view').getBoundingClientRect(); return { x: r.left, y: r.top, w: r.width, h: r.height }; };
const viewShown = () => !current().external && $('#modal').hidden;

// Tjenester, der åbnes i browseren, vises som en flade med en knap i stedet for siden
function showCurrent() {
  const s = current();
  $('#view').classList.toggle('off', s.external);
  $('#external').hidden = !s.external;
  $('#title').textContent = s.name;
  if (s.external) {
    $('#external-name').textContent = s.name;
    $('#external-text').textContent = tr('OpensInBrowser', { x: s.name });
    api.view.visible(false);
  } else if (state.loaded !== s.id) {
    state.loaded = s.id;
    requestAnimationFrame(() => api.view.load(s.url, viewRect())); // efter layout, så feltet har sin størrelse
  } else {
    api.view.visible(viewShown());
  }
  renderNav();
}

function select(id, open = false) {
  state.info.selected = id;
  renderList();
  showCurrent();
  api.select(id);
  if (open && current().external) api.openExternal(current().url);
}

// ---------- Beskeder og dialoger ----------
function toast(text, kind = '') {
  const el = document.createElement('div');
  el.className = 'toast ' + kind;
  el.textContent = text;
  $('#toasts').append(el);
  setTimeout(() => el.remove(), kind === 'error' ? 7000 : 3500);
}

let modalResolve = null;
function openModal({ title = '', body = '', buttons = [] }) {
  closeModal(null);
  const box = $('#modal-box');
  box.innerHTML = (title ? `<h3>${esc(title)}</h3>` : '') + body +
    `<div class="modal-actions">${buttons.map((b, i) => `<button type="button" class="btn ${b.cls || ''}" data-b="${i}">${esc(b.label)}</button>`).join('')}</div>`;
  $('#modal').hidden = false;
  api.view.visible(false); // webviewen ligger ellers oven på dialogen
  box.onclick = (e) => {
    const b = e.target.closest('[data-b]');
    if (b) closeModal(buttons[b.dataset.b].v);
  };
  box.querySelector('.btn-primary')?.focus();
  return new Promise((res) => { modalResolve = res; });
}
function closeModal(v) {
  stopRecording();
  $('#modal').hidden = true;
  if (state.loaded) api.view.visible(viewShown());
  const r = modalResolve;
  modalResolve = null;
  if (r) r(v);
}

function aboutDialog() {
  openModal({
    body: `<div class="about"><img src="icon.png" alt="" /><div><h3>AI Copilot Mapper</h3><p>${esc(state.info.version)}</p></div></div>
      <p>${esc(tr('AboutText'))}\n${esc(tr('AboutWritten'))}</p>
      <p><a href="${GITHUB}" target="_blank">${GITHUB.replace('https://', '')}</a></p>`,
    buttons: [{ label: plain('BtnClose'), v: 'ok', cls: 'btn-primary' }],
  });
}

// ---------- Indstillinger ----------
let recording = false;
function stopRecording() {
  if (!recording) return;
  recording = false;
  api.cancelRecord();
}

function settingsDialog() {
  openModal({
    title: plain('MenuSettings'),
    body: `<h4>${esc(plain('FrameHotkey'))}</h4>
      <div class="hotkey-row">
        <kbd id="hk-show"></kbd>
        <button type="button" class="btn" id="hk-record">${esc(plain('BtnRecord'))}</button>
        <button type="button" class="btn" id="hk-reset">${esc(plain('BtnReset'))}</button>
      </div>
      <p class="form-error" id="hk-error" hidden></p>
      <label class="check"><input type="checkbox" id="set-embedded" /> ${esc(tr('OpenEmbedded'))}</label>
      <label class="check"><input type="checkbox" id="set-autostart" /> ${esc(tr('MenuAutoStart'))}</label>`,
    buttons: [{ label: plain('BtnClose'), v: 'ok', cls: 'btn-primary' }],
  });
  const show = () => { $('#hk-show').textContent = hotkeyLabel(state.info.hotkey); $('#hk-show').className = ''; };
  const fail = (msg) => { $('#hk-error').textContent = msg; $('#hk-error').hidden = !msg; };
  const setHotkey = async (acc) => {
    const r = await api.setHotkey(acc);
    if (r.error) fail(r.error); else { state.info = r.value; fail(''); }
    show();
    renderFoot();
  };
  show();
  $('#set-embedded').checked = state.info.embedded;
  $('#set-autostart').checked = state.info.autostart;

  $('#hk-reset').onclick = () => { stopRecording(); setHotkey(Hotkey.COPILOT); };
  // Tastaturhooket optager næste tryk (Esc annullerer)
  $('#hk-record').onclick = async () => {
    if (recording) return;
    recording = true;
    fail('');
    $('#hk-show').textContent = plain('HotkeyWaiting');
    $('#hk-show').className = 'rec';
    const r = await api.recordHotkey();
    recording = false;
    if (r.error) fail(r.error);
    else if (r.value) state.info = r.value;
    if ($('#hk-show')) show();
    renderFoot();
  };
  const apply = async (s) => { state.info = unwrap(await api.setSettings(s)); };
  $('#set-embedded').onchange = (e) => apply({ embedded: e.target.checked });
  $('#set-autostart').onchange = (e) => apply({ autostart: e.target.checked });
}

// ---------- Egne AI-tjenester ----------
function openEditor(s) {
  state.editing = s || {};
  const f = $('#ai-form');
  const builtIn = !!s && !s.custom; // indbyggede tjenester: kun browser-valget kan ændres
  $('#editor-title').textContent = plain(s ? 'AIEdit' : 'AINew');
  f.name.value = s ? s.name : '';
  f.url.value = s ? s.url : '';
  f.name.readOnly = f.url.readOnly = builtIn;
  f.external.checked = !!(s && s.external);
  $('#btn-delete').hidden = !s || builtIn;
  $('#form-error').hidden = true;
  $('#editor').hidden = false;
  f.name.focus();
}
const closeEditor = () => { $('#editor').hidden = true; state.editing = null; };

async function saveEditor() {
  const f = $('#ai-form');
  let id = state.editing.id;
  if (!id || state.editing.custom) {
    const r = await api.saveAI({ id, name: f.name.value, url: f.url.value });
    if (r.error) { $('#form-error').textContent = r.error; $('#form-error').hidden = false; return; }
    id = r.value.id;
    state.loaded = null; // URL'en kan være ændret
  }
  await api.setExternal(id, f.external.checked);
  state.info = unwrap(await api.info());
  closeEditor();
  select(id);
}

async function deleteEditor() {
  const s = state.editing;
  const ok = await openModal({
    title: plain('AIEdit'),
    body: `<p>${esc(tr('ConfirmDelete', { x: s.name }))}</p>`,
    buttons: [{ label: plain('HotkeyCancel'), v: null }, { label: plain('BtnDelete'), v: 'del', cls: 'btn-danger' }],
  });
  if (ok !== 'del') return;
  await api.deleteAI(s.id);
  state.info = unwrap(await api.info());
  closeEditor();
  if (s.id === state.info.selected || !state.info.services.some((x) => x.id === state.info.selected)) select(state.info.services[0].id);
  else renderList();
}

// ---------- Sprog og kommandoer ----------
function applyI18n() {
  document.documentElement.lang = I18N.lang;
  for (const el of $$('[data-i18n]')) el.textContent = plain(el.dataset.i18n);
  for (const el of $$('[data-i18n-title]')) { el.title = plain(el.dataset.i18nTitle); el.setAttribute('aria-label', el.title); }
  for (const el of $$('[data-tip]')) {
    el.title = plain(el.dataset.tip) + (el.dataset.key ? ` (${el.dataset.key})` : '');
    el.setAttribute('aria-label', el.title);
  }
  renderList();
  renderFoot();
  showCurrent();
}

async function setLanguage(lang) {
  I18N.setLang(lang);
  await api.setLang(I18N.lang); // bakkemenuen følger med
  applyI18n();
}

function cmd(name) {
  if (name === 'sidebar') { ui.sidebar = !ui.sidebar; saveUi(); $('#app').classList.toggle('no-sidebar', !ui.sidebar); }
  else if (name === 'external' && current().external) api.openExternal(current().url);
  else if (current().external) return;
  else if (name === 'external') api.view.url().then((r) => api.openExternal(r.value || current().url));
  else api.view.cmd(name); // back, forward, reload
}

function wire() {
  $('#lang-select').innerHTML = Object.entries(I18N.LANGS).map(([k, v]) => `<option value="${k}">${esc(v)}</option>`).join('');
  $('#lang-select').onchange = (e) => setLanguage(e.target.value);

  document.addEventListener('click', (e) => {
    const c = e.target.closest('[data-cmd]');
    if (c && !c.disabled) cmd(c.dataset.cmd);
  });
  $('#btn-new-ai').onclick = () => openEditor(null);
  $('#btn-settings').onclick = () => settingsDialog();
  $('#btn-about').onclick = () => aboutDialog();
  api.onShow((what) => (what === 'settings' ? settingsDialog() : aboutDialog()));

  $('#ai-list').addEventListener('click', (e) => {
    const ed = e.target.closest('[data-edit]');
    if (ed) { openEditor(state.info.services.find((s) => s.id === ed.dataset.edit)); return; }
    const it = e.target.closest('.host-item');
    if (it) select(it.dataset.id, true);
  });
  $('#ai-list').addEventListener('keydown', (e) => {
    const it = e.target.closest('.host-item');
    if (it && e.key === 'Enter') select(it.dataset.id, true);
  });

  const f = $('#ai-form');
  f.onsubmit = (e) => { e.preventDefault(); saveEditor(); };
  $('#editor-close').onclick = closeEditor;
  $('#btn-delete').onclick = deleteEditor;
  $('#modal').addEventListener('mousedown', (e) => { if (e.target.id === 'modal') closeModal(null); });

  // Flyt AI-webviewen med, når vinduet, sidepanelet eller editoren ændrer feltets størrelse
  new ResizeObserver(() => { if (state.loaded) api.view.bounds(viewRect()); }).observe($('#view'));

  // Links med target=_blank (fx GitHub i "om") åbnes i browseren
  document.addEventListener('click', (e) => {
    const a = e.target.closest('a[target=_blank]');
    if (a) { e.preventDefault(); api.openExternal(a.href); }
  });

  document.addEventListener('keydown', (e) => {
    if (e.key === 'Escape') {
      if (!$('#modal').hidden) closeModal(null);
      else if (!$('#editor').hidden) closeEditor();
      return;
    }
    if (!$('#modal').hidden) return;
    if ((e.ctrlKey || e.metaKey) && e.key.toLowerCase() === 'b') { e.preventDefault(); cmd('sidebar'); }
    else if (e.key === 'F5') { e.preventDefault(); cmd('reload'); }
    else if (e.altKey && e.key === 'ArrowLeft') cmd('back');
    else if (e.altKey && e.key === 'ArrowRight') cmd('forward');
  });
}

// ---------- Start ----------
async function init() {
  state.info = unwrap(await api.info());
  I18N.setLang(state.info.lang);
  wire();
  $('#lang-select').value = I18N.lang;
  $('#app').classList.toggle('no-sidebar', !ui.sidebar);
  applyI18n(); // viser også den valgte tjeneste
}
init();

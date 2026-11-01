# AI Copilot Mapper (Tauri)

The Tauri version of [AI Copilot Mapper](../AICopilotMapper). Same user interface (same look as Skal and Torrentry), but the AI page is shown in WebView2 (Microsoft Edge), like the PureBasic version. Google allows signing in there, unlike in Electron. The installer is about 2 MB instead of about 100 MB.

## Getting started

Requires Node.js, Rust and Visual Studio Build Tools with the C++ workload.

```
npm install
npm start        # tauri dev
npm run build    # installer in src-tauri/target/release/bundle/nsis
npm test         # hotkey.js
```

## Layout

- `renderer/` – the user interface, shared with the Electron version. `tauri-api.js` gives it the same `window.api` as Electron's preload, so `renderer.js` only differs in how the AI page is placed.
- `src-tauri/src/main.rs` – window, tray, storage (`prefs.json` in the app config folder) and commands. The AI page is a second webview laid exactly over `#view` in the UI.
- `src-tauri/src/hook.rs` – low-level keyboard hook in its own thread: catches the Copilot key (Win + Shift + F23) or your own hotkey and swallows it, and records a new one.

Not carried over from the PureBasic version: remapping to Right Ctrl / Right Alt, per-app profiles and choosing a specific external browser. Back/forward buttons are always enabled, because WebView2 does not report whether there is a page to go back to.

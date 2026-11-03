# AI Copilot Mapper

Opens your favorite AI with the Windows Copilot key or your own hotkey. Built with Tauri and shares its look with [Skal](../Skal) and [Torrentry](../Torrentry). The AI page is shown in WebView2 (Microsoft Edge), so signing in with Google works. The installer is about 2 MB.

## Features

- Lives in the system tray. Closing the window hides it; Exit is in the tray menu.
- The Copilot key (Win + Shift + F23) or a hotkey you record opens the selected AI, either in the built-in window or in your default browser.
- Built-in: Gemini, ChatGPT, Claude, Copilot, Grok, Perplexity, DeepSeek and Kimi. Add your own services, including local ones such as `http://localhost:3000`.
- Any service can be set to always open in your default browser (✎ → "Always open in browser").
- Logins are kept between starts.
- Pause the hotkey from the tray menu, start with Windows, 7 languages.

| Key | Action |
|---|---|
| Ctrl+B | Show/hide sidebar |
| F5 | Reload |
| Alt+← / Alt+→ | Back / forward |

## Building

Requires Node.js, Rust and Visual Studio Build Tools with the C++ workload.

```
npm install
npm start        # tauri dev
npm run build    # installer in src-tauri/target/release/bundle/nsis
npm test         # hotkey.js
```

## Layout

- `renderer/` – the user interface; `strings.js` holds all texts, `hotkey.js` converts between key presses and hotkey text, `tauri-api.js` wraps the Tauri commands as `window.api`.
- `src-tauri/src/main.rs` – window, tray, storage (`prefs.json` in the app config folder) and commands. The AI page is a second webview laid exactly over `#view` in the UI.
- `src-tauri/src/hook.rs` – low-level keyboard hook in its own thread: catches the hotkey and swallows it (Windows does not let normal programs register the Copilot key), and records a new one.

Back/forward buttons are always enabled, because WebView2 does not report whether there is a page to go back to.

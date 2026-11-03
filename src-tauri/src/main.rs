// AI Copilot Mapper. AI-siden vises i WebView2 (Microsoft Edge), som Google
// tillader login i (det gør Googles login ikke i Electron).
#![cfg_attr(not(debug_assertions), windows_subsystem = "windows")]
mod hook;

use serde::{Deserialize, Serialize};
use serde_json::{json, Value};
use std::path::PathBuf;
use std::sync::atomic::Ordering::Relaxed;
use std::sync::Mutex;
use tauri::menu::{CheckMenuItem, Menu, MenuItem, PredefinedMenuItem};
use tauri::tray::{MouseButton, MouseButtonState, TrayIconBuilder, TrayIconEvent};
use tauri::{AppHandle, Emitter, LogicalPosition, LogicalSize, Manager, Url, WebviewBuilder, WebviewUrl, WindowEvent};
use tauri_plugin_autostart::ManagerExt;
use tauri_plugin_opener::OpenerExt;

const BUILTIN: [(&str, &str, &str); 8] = [
    ("gemini", "Gemini", "https://gemini.google.com/"),
    ("chatgpt", "ChatGPT", "https://chatgpt.com/"),
    ("claude", "Claude", "https://claude.ai/"),
    ("copilot", "Copilot", "https://copilot.microsoft.com/"),
    ("grok", "Grok", "https://grok.com/"),
    ("perplexity", "Perplexity", "https://www.perplexity.ai/"),
    ("deepseek", "DeepSeek", "https://chat.deepseek.com/"),
    ("kimi", "Kimi", "https://www.kimi.com/"),
];

// ---------- Lager ----------
#[derive(Serialize, Deserialize, Clone)]
#[serde(default, rename_all = "camelCase")]
struct Prefs {
    lang: Option<String>,
    hotkey: String,
    hotkey_vk: u32,
    hotkey_mods: u32,
    embedded: bool,
    selected: String,
    custom: Vec<Custom>,
    external: Vec<String>,
}
impl Default for Prefs {
    fn default() -> Self {
        // Copilot-tasten: Win + Shift + F23 (se hotkey.js)
        Self { lang: None, hotkey: "Shift+Super+F23".into(), hotkey_vk: 0x86, hotkey_mods: 12, embedded: true, selected: "gemini".into(), custom: vec![], external: vec![] }
    }
}
#[derive(Serialize, Deserialize, Clone)]
struct Custom {
    id: String,
    name: String,
    url: String,
}

fn prefs_file(app: &AppHandle) -> PathBuf {
    app.path().app_config_dir().expect("app config dir").join("prefs.json")
}
fn read_prefs(app: &AppHandle) -> Prefs {
    std::fs::read_to_string(prefs_file(app)).ok().and_then(|s| serde_json::from_str(&s).ok()).unwrap_or_default()
}
fn write_prefs(app: &AppHandle, p: &Prefs) -> Result<(), String> {
    let file = prefs_file(app);
    let tmp = file.with_extension("tmp");
    std::fs::create_dir_all(file.parent().unwrap()).map_err(|e| e.to_string())?;
    std::fs::write(&tmp, serde_json::to_string_pretty(p).unwrap()).map_err(|e| e.to_string())?;
    std::fs::rename(&tmp, &file).map_err(|e| e.to_string())
}

fn services(p: &Prefs) -> Vec<Value> {
    let ext = |id: &str| p.external.iter().any(|x| x == id);
    BUILTIN
        .iter()
        .map(|(id, name, url)| json!({ "id": id, "name": name, "url": url, "external": ext(id) }))
        .chain(p.custom.iter().map(|c| json!({ "id": c.id, "name": c.name, "url": c.url, "custom": true, "external": ext(&c.id) })))
        .collect()
}
fn selected_service(p: &Prefs) -> Value {
    let all = services(p);
    all.iter().find(|s| s["id"] == p.selected.as_str()).cloned().unwrap_or_else(|| all[0].clone())
}

// Som i PureBasic-versionen: uden protokol bliver det https://, men http:// for lokale adresser
fn normalize_url(u: &str) -> Option<String> {
    let mut u = u.trim().to_string();
    if u.is_empty() {
        return None;
    }
    if !u.contains("://") {
        let local = ["localhost", "127.0.0.1", "[::1]"].iter().any(|p| u.to_lowercase().starts_with(p));
        u = format!("{}{u}", if local { "http://" } else { "https://" });
    }
    let parsed = Url::parse(&u).ok()?;
    matches!(parsed.scheme(), "http" | "https").then(|| parsed.to_string())
}

fn info(app: &AppHandle) -> Value {
    let p = read_prefs(app);
    json!({
        "version": app.package_info().version.to_string(),
        "lang": p.lang,
        "services": services(&p),
        "selected": selected_service(&p)["id"],
        "hotkey": p.hotkey,
        "hotkeyOk": hook::OK.load(Relaxed),
        "embedded": p.embedded,
        "autostart": app.autolaunch().is_enabled().unwrap_or(false),
    })
}

// ---------- Vindue, genvej og bakkeikon ----------
fn show_window(app: &AppHandle, what: Option<&str>) {
    if let Some(w) = app.get_window("main") {
        let _ = w.unminimize();
        let _ = w.show();
        let _ = w.set_focus();
    }
    if let Some(what) = what {
        let _ = app.emit("ui:show", what);
    }
}

fn open_external(app: &AppHandle, url: &str) {
    if url.starts_with("http://") || url.starts_with("https://") {
        let _ = app.opener().open_url(url, None::<&str>);
    }
}

fn on_hotkey(app: &AppHandle) {
    let p = read_prefs(app);
    let s = selected_service(&p);
    if p.embedded && s["external"] != true {
        show_window(app, None);
    } else {
        open_external(app, s["url"].as_str().unwrap_or_default());
    }
}

// Menuteksterne kommer fra brugerfladen (strings.js), så de følger det valgte sprog
#[derive(Deserialize, Clone)]
struct TrayText {
    open: String,
    pause: String,
    settings: String,
    about: String,
    exit: String,
    tooltip: String,
    paused: String,
}
impl Default for TrayText {
    fn default() -> Self {
        let s = |x: &str| x.to_string();
        Self { open: s("Open AI View"), pause: s("Pause mapping"), settings: s("Settings..."), about: s("About..."), exit: s("Exit"), tooltip: s("AI Copilot Mapper"), paused: s("Status: Paused") }
    }
}
struct Tray(Mutex<TrayText>);

fn update_tray(app: &AppHandle) -> tauri::Result<()> {
    let t = app.state::<Tray>().0.lock().unwrap().clone();
    let sep = PredefinedMenuItem::separator(app)?;
    let menu = Menu::with_items(app, &[
        &MenuItem::with_id(app, "open", &t.open, true, None::<&str>)?,
        &CheckMenuItem::with_id(app, "pause", &t.pause, true, hook::paused(), None::<&str>)?,
        &sep,
        &MenuItem::with_id(app, "settings", &t.settings, true, None::<&str>)?,
        &MenuItem::with_id(app, "about", &t.about, true, None::<&str>)?,
        &PredefinedMenuItem::separator(app)?,
        &MenuItem::with_id(app, "exit", &t.exit, true, None::<&str>)?,
    ])?;
    if let Some(tray) = app.tray_by_id("main") {
        tray.set_menu(Some(menu))?;
        let tip = if hook::paused() { format!("{}\n{}", t.tooltip, t.paused) } else { t.tooltip };
        tray.set_tooltip(Some(tip))?;
    }
    Ok(())
}

// ---------- Kommandoer (kaldes via window.api i tauri-api.js) ----------
#[tauri::command]
fn app_info(app: AppHandle) -> Value {
    info(&app)
}

#[tauri::command]
fn set_lang(app: AppHandle, lang: String) -> Result<(), String> {
    let mut p = read_prefs(&app);
    p.lang = Some(lang);
    write_prefs(&app, &p)
}

#[tauri::command]
fn set_settings(app: AppHandle, embedded: Option<bool>, autostart: Option<bool>) -> Result<Value, String> {
    if let Some(e) = embedded {
        let mut p = read_prefs(&app);
        p.embedded = e;
        write_prefs(&app, &p)?;
    }
    if let Some(a) = autostart {
        let al = app.autolaunch();
        if a { al.enable() } else { al.disable() }.map_err(|e| e.to_string())?;
    }
    Ok(info(&app))
}

#[tauri::command]
fn select(app: AppHandle, id: String) -> Result<(), String> {
    let mut p = read_prefs(&app);
    p.selected = id;
    write_prefs(&app, &p)
}

#[tauri::command]
fn save_ai(app: AppHandle, id: Option<String>, name: String, url: String) -> Result<Value, String> {
    let (name, url) = (name.trim().to_string(), normalize_url(&url));
    let Some(url) = url.filter(|_| !name.is_empty()) else { return Err("MsgFillNameUrl".into()) };
    let id = id.unwrap_or_else(|| format!("c{}", std::time::SystemTime::now().duration_since(std::time::UNIX_EPOCH).unwrap().as_millis()));
    let mut p = read_prefs(&app);
    let s = Custom { id: id.clone(), name, url };
    match p.custom.iter_mut().find(|c| c.id == id) {
        Some(c) => *c = s.clone(),
        None => p.custom.push(s.clone()),
    }
    write_prefs(&app, &p)?;
    Ok(json!({ "id": s.id, "name": s.name, "url": s.url }))
}

#[tauri::command]
fn delete_ai(app: AppHandle, id: String) -> Result<(), String> {
    let mut p = read_prefs(&app);
    p.custom.retain(|c| c.id != id);
    write_prefs(&app, &p)
}

#[tauri::command]
fn set_external(app: AppHandle, id: String, on: bool) -> Result<(), String> {
    let mut p = read_prefs(&app);
    p.external.retain(|x| *x != id);
    if on {
        p.external.push(id);
    }
    write_prefs(&app, &p)
}

#[tauri::command]
fn open_url(app: AppHandle, url: String) {
    open_external(&app, &url);
}

#[tauri::command]
fn set_hotkey(app: AppHandle, acc: String, vk: u32, mods: u32) -> Result<Value, String> {
    let mut p = read_prefs(&app);
    (p.hotkey, p.hotkey_vk, p.hotkey_mods) = (acc, vk, mods);
    write_prefs(&app, &p)?;
    hook::set_trigger(vk, mods);
    Ok(info(&app))
}

// Næste tastetryk som (vk, modifiers); null ved Esc eller annullering
#[tauri::command]
async fn record_hotkey() -> Option<(u32, u32)> {
    let (tx, rx) = std::sync::mpsc::channel();
    hook::record(tx);
    tauri::async_runtime::spawn_blocking(move || rx.recv().ok().flatten()).await.ok().flatten()
}

#[tauri::command]
fn cancel_record() {
    hook::cancel_record();
}

#[tauri::command]
fn set_tray(app: AppHandle, text: TrayText) -> Result<(), String> {
    *app.state::<Tray>().0.lock().unwrap() = text;
    update_tray(&app).map_err(|e| e.to_string())
}

// ---------- AI-siden: en webview oven på brugerfladen, der hvor #view er ----------
// (async, så webviewen ikke oprettes midt i et synkront kald fra brugerfladen)
#[tauri::command]
async fn view_load(app: AppHandle, url: String, x: f64, y: f64, w: f64, h: f64) -> Result<(), String> {
    let url = Url::parse(&url).map_err(|e| e.to_string())?;
    let (pos, size) = (LogicalPosition::new(x, y), LogicalSize::new(w, h));
    match app.get_webview("ai") {
        Some(v) => {
            v.navigate(url).map_err(|e| e.to_string())?;
            v.set_position(pos).map_err(|e| e.to_string())?;
            v.set_size(size).map_err(|e| e.to_string())?;
            v.show().map_err(|e| e.to_string())
        }
        None => {
            let win = app.get_window("main").ok_or("no window")?;
            win.add_child(WebviewBuilder::new("ai", WebviewUrl::External(url)), pos, size).map(|_| ()).map_err(|e| e.to_string())
        }
    }
}

#[tauri::command]
async fn view_bounds(app: AppHandle, x: f64, y: f64, w: f64, h: f64) {
    if let Some(v) = app.get_webview("ai") {
        let _ = v.set_position(LogicalPosition::new(x, y));
        let _ = v.set_size(LogicalSize::new(w, h));
    }
}

#[tauri::command]
async fn view_visible(app: AppHandle, on: bool) {
    if let Some(v) = app.get_webview("ai") {
        let _ = if on { v.show() } else { v.hide() };
    }
}

#[tauri::command]
async fn view_cmd(app: AppHandle, cmd: String) {
    let js = match cmd.as_str() {
        "back" => "history.back()",
        "forward" => "history.forward()",
        _ => "location.reload()",
    };
    if let Some(v) = app.get_webview("ai") {
        let _ = v.eval(js);
    }
}

#[tauri::command]
async fn view_url(app: AppHandle) -> Option<String> {
    app.get_webview("ai").and_then(|v| v.url().ok()).map(|u| u.to_string())
}

fn main() {
    tauri::Builder::default()
        // Kun én instans ad gangen – en ny start henter det kørende vindue frem
        .plugin(tauri_plugin_single_instance::init(|app, _args, _cwd| show_window(app, None)))
        .plugin(tauri_plugin_opener::init())
        .plugin(tauri_plugin_autostart::init(tauri_plugin_autostart::MacosLauncher::LaunchAgent, Some(vec!["--hidden"])))
        .plugin(
            tauri_plugin_window_state::Builder::default()
                .with_state_flags(tauri_plugin_window_state::StateFlags::all() - tauri_plugin_window_state::StateFlags::VISIBLE)
                .build(),
        )
        .manage(Tray(Mutex::new(TrayText::default())))
        .invoke_handler(tauri::generate_handler![
            app_info, set_lang, set_settings, select, save_ai, delete_ai, set_external, open_url,
            set_hotkey, record_hotkey, cancel_record, set_tray,
            view_load, view_bounds, view_visible, view_cmd, view_url
        ])
        .setup(|app| {
            let handle = app.handle().clone();
            let p = read_prefs(&handle);
            hook::set_trigger(p.hotkey_vk, p.hotkey_mods);
            let h = handle.clone();
            hook::start(move || {
                let a = h.clone();
                let _ = h.run_on_main_thread(move || on_hotkey(&a));
            });

            let win = tauri::window::WindowBuilder::new(app, "main")
                .title(format!("AI Copilot Mapper {}", app.package_info().version))
                .inner_size(1200.0, 820.0)
                .min_inner_size(640.0, 420.0)
                .visible(false)
                .build()?;
            let size = win.inner_size()?.to_logical::<f64>(win.scale_factor()?);
            win.add_child(WebviewBuilder::new("ui", WebviewUrl::App("index.html".into())).auto_resize(), LogicalPosition::new(0.0, 0.0), size)?;
            // Luk = gem i bakken; programmet skal blive ved med at lytte efter genvejen
            let w = win.clone();
            win.on_window_event(move |e| {
                if let WindowEvent::CloseRequested { api, .. } = e {
                    api.prevent_close();
                    let _ = w.hide();
                }
            });
            // Startet af Windows ved login: bliv i bakken
            if !std::env::args().any(|a| a == "--hidden") {
                win.show()?;
            }

            TrayIconBuilder::with_id("main")
                .icon(app.default_window_icon().unwrap().clone())
                .show_menu_on_left_click(false)
                .on_menu_event(|app, e| match e.id.as_ref() {
                    "open" => on_hotkey(app),
                    "pause" => {
                        hook::set_paused(!hook::paused());
                        let _ = update_tray(app);
                    }
                    "settings" => show_window(app, Some("settings")),
                    "about" => show_window(app, Some("about")),
                    "exit" => app.exit(0),
                    _ => {}
                })
                .on_tray_icon_event(|tray, e| {
                    if let TrayIconEvent::Click { button: MouseButton::Left, button_state: MouseButtonState::Up, .. } = e {
                        show_window(tray.app_handle(), None);
                    }
                })
                .build(app)?;
            update_tray(&handle)?;
            Ok(())
        })
        .run(tauri::generate_context!())
        .expect("error while running AI Copilot Mapper");
}

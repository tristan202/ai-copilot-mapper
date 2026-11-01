// Lavniveau-tastaturhook i sin egen tråd. Fanger genvejen – også Copilot-tasten
// (Win + Shift + F23), som Windows ikke lader programmer registrere på normal vis –
// og sluger den. Samme logik som hook-worker.js i Electron-udgaven.
use std::sync::atomic::{AtomicBool, AtomicU32, Ordering::Relaxed};
use std::sync::mpsc::Sender;
use std::sync::{Mutex, OnceLock};

use windows::Win32::Foundation::{HINSTANCE, LPARAM, LRESULT, WPARAM};
use windows::Win32::System::LibraryLoader::GetModuleHandleW;
use windows::Win32::UI::Input::KeyboardAndMouse::{keybd_event, GetAsyncKeyState, KEYBD_EVENT_FLAGS, KEYEVENTF_KEYUP};
use windows::Win32::UI::WindowsAndMessaging::{
    CallNextHookEx, GetMessageW, SetWindowsHookExW, KBDLLHOOKSTRUCT, LLKHF_INJECTED, MSG, WH_KEYBOARD_LL,
    WM_KEYDOWN, WM_SYSKEYDOWN,
};

static TRIGGER_VK: AtomicU32 = AtomicU32::new(0);
static TRIGGER_MODS: AtomicU32 = AtomicU32::new(0);
static PAUSED: AtomicBool = AtomicBool::new(false);
static RECORDING: AtomicBool = AtomicBool::new(false);
static DOWN: AtomicBool = AtomicBool::new(false);
pub static OK: AtomicBool = AtomicBool::new(true);
static RECORD_TX: Mutex<Option<Sender<Option<(u32, u32)>>>> = Mutex::new(None);
static ON_HOTKEY: OnceLock<Box<dyn Fn() + Send + Sync>> = OnceLock::new();

const VK_ESCAPE: u32 = 0x1b;
const VK_UNUSED: u8 = 0xe8;
const MODIFIER_VKS: [u32; 11] = [0x10, 0x11, 0x12, 0xa0, 0xa1, 0xa2, 0xa3, 0xa4, 0xa5, 0x5b, 0x5c];

pub fn set_trigger(vk: u32, mods: u32) {
    TRIGGER_VK.store(vk, Relaxed);
    TRIGGER_MODS.store(mods, Relaxed);
}
pub fn set_paused(on: bool) {
    PAUSED.store(on, Relaxed);
}
pub fn paused() -> bool {
    PAUSED.load(Relaxed)
}

// Næste tastetryk sendes til tx som (vk, modifiers), eller None ved Esc/annullering
pub fn record(tx: Sender<Option<(u32, u32)>>) {
    cancel_record();
    *RECORD_TX.lock().unwrap() = Some(tx);
    RECORDING.store(true, Relaxed);
}
pub fn cancel_record() {
    RECORDING.store(false, Relaxed);
    if let Some(tx) = RECORD_TX.lock().unwrap().take() {
        let _ = tx.send(None);
    }
}

pub fn start(on_hotkey: impl Fn() + Send + Sync + 'static) {
    let _ = ON_HOTKEY.set(Box::new(on_hotkey));
    std::thread::spawn(|| unsafe {
        let module = GetModuleHandleW(None).ok().map(|m| HINSTANCE(m.0));
        if SetWindowsHookExW(WH_KEYBOARD_LL, Some(on_key), module, 0).is_err() {
            OK.store(false, Relaxed);
            return;
        }
        // Hooket kaldes, mens tråden venter på beskeder
        let mut msg = MSG::default();
        while GetMessageW(&mut msg, None, 0, 0).as_bool() {}
    });
}

fn held(vk: i32) -> bool {
    unsafe { (GetAsyncKeyState(vk) as u16 & 0x8000) != 0 }
}
fn current_mods() -> u32 {
    (held(0x11) as u32) | (held(0x12) as u32) << 1 | (held(0x10) as u32) << 2 | ((held(0x5b) || held(0x5c)) as u32) << 3
}

// Slippes Win uden at Windows har set en anden tast imellem, åbner startmenuen.
// Et tryk på en ubrugt tast forhindrer det (samme trick som AutoHotkey).
fn mask_start_menu(mods: u32) {
    if mods & 8 != 0 {
        unsafe {
            keybd_event(VK_UNUSED, 0, KEYBD_EVENT_FLAGS(0), 0);
            keybd_event(VK_UNUSED, 0, KEYEVENTF_KEYUP, 0);
        }
    }
}

unsafe extern "system" fn on_key(code: i32, wparam: WPARAM, lparam: LPARAM) -> LRESULT {
    let pass = || unsafe { CallNextHookEx(None, code, wparam, lparam) };
    if code < 0 {
        return pass();
    }
    let k = unsafe { &*(lparam.0 as *const KBDLLHOOKSTRUCT) };
    if k.flags.0 & LLKHF_INJECTED.0 != 0 {
        return pass(); // også vores egne tryk
    }
    let is_down = wparam.0 as u32 == WM_KEYDOWN || wparam.0 as u32 == WM_SYSKEYDOWN;

    if RECORDING.load(Relaxed) {
        if !is_down || MODIFIER_VKS.contains(&k.vkCode) {
            return pass();
        }
        RECORDING.store(false, Relaxed);
        let mods = current_mods();
        mask_start_menu(mods);
        if let Some(tx) = RECORD_TX.lock().unwrap().take() {
            let _ = tx.send(if k.vkCode == VK_ESCAPE { None } else { Some((k.vkCode, mods)) });
        }
        return LRESULT(1);
    }

    if k.vkCode != TRIGGER_VK.load(Relaxed) {
        return pass();
    }
    if !is_down {
        // Afslut altid et tryk vi selv har slugt, også hvis modifierne blev sluppet først
        if !DOWN.swap(false, Relaxed) {
            return pass();
        }
        return LRESULT(1);
    }
    if DOWN.load(Relaxed) {
        return LRESULT(1); // gentagelse mens tasten holdes nede
    }
    let mods = current_mods();
    if PAUSED.load(Relaxed) || mods != TRIGGER_MODS.load(Relaxed) {
        return pass();
    }
    DOWN.store(true, Relaxed);
    mask_start_menu(mods);
    if let Some(f) = ON_HOTKEY.get() {
        f();
    }
    LRESULT(1)
}

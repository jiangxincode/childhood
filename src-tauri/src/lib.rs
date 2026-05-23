// Tauri runtime entry. Kept minimal: this app is purely static front-end content,
// no custom commands or IPC are required. Add `.invoke_handler(...)` here later
// if native bridges become necessary.
#[cfg_attr(mobile, tauri::mobile_entry_point)]
pub fn run() {
    tauri::Builder::default()
        .setup(|_app| Ok(()))
        .run(tauri::generate_context!())
        .expect("error while running tauri application");
}

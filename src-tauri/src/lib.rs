use std::fs;
use std::path::PathBuf;
use tauri::{AppHandle, Manager};

fn data_file_path(app: &AppHandle) -> Result<PathBuf, String> {
    let data_dir = app.path().app_data_dir().map_err(|error| error.to_string())?;
    fs::create_dir_all(&data_dir).map_err(|error| error.to_string())?;
    Ok(data_dir.join("data.json"))
}

#[tauri::command]
fn load_app_data(app: AppHandle) -> Result<Option<String>, String> {
    let data_path = data_file_path(&app)?;
    if !data_path.exists() {
        return Ok(None);
    }

    fs::read_to_string(data_path)
        .map(Some)
        .map_err(|error| error.to_string())
}

#[tauri::command]
fn save_app_data(app: AppHandle, data: String) -> Result<(), String> {
    serde_json::from_str::<serde_json::Value>(&data).map_err(|error| error.to_string())?;
    let data_path = data_file_path(&app)?;
    fs::write(data_path, data).map_err(|error| error.to_string())
}

#[cfg_attr(mobile, tauri::mobile_entry_point)]
pub fn run() {
    tauri::Builder::default()
        .invoke_handler(tauri::generate_handler![load_app_data, save_app_data])
        .run(tauri::generate_context!())
        .expect("error while running Wealth Tracker");
}

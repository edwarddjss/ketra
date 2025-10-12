use std::process::Command;

pub fn get_default_folder(env: &str) -> Result<String, String> {
    if env == "wsl" {
        // WSL: Use ~/ketra folder
        let username_result = Command::new("wsl")
            .args(&["bash", "-c", "echo $USER"])
            .output()
            .map_err(|e| format!("Failed to get WSL username: {}", e))?;

        let username = String::from_utf8_lossy(&username_result.stdout).trim().to_string();
        let path = format!("/home/{}/ketra", username);
        println!("[DEBUG] WSL ketra path: {}", path);
        Ok(path)
    } else {
        // Windows: Use %USERPROFILE%\ketra folder
        let userprofile = std::env::var("USERPROFILE")
            .map_err(|_| "Failed to get USERPROFILE environment variable".to_string())?;
        let path = format!("{}\\ketra", userprofile);
        println!("[DEBUG] Windows ketra path: {}", path);
        Ok(path)
    }
}

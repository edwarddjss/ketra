use crate::types::Project;
use crate::git::{get_git_status, get_git_status_wsl};
use crate::utils::get_default_folder;
use std::fs;
use std::process::Command;

pub async fn scan_launcher_folders_async() -> Vec<Project> {
    let mut project_futures = Vec::new();

    // Scan Windows projects folder
    if let Ok(windows_folder) = get_default_folder("windows") {
        if let Ok(entries) = fs::read_dir(&windows_folder) {
            for entry in entries.flatten() {
                if let Ok(metadata) = entry.metadata() {
                    if metadata.is_dir() {
                        if let Some(name) = entry.file_name().to_str() {
                            let path = entry.path();
                            let path_str = path.to_string_lossy().to_string();
                            let name = name.to_string();

                            // Get last modified time
                            let last_opened = metadata.modified()
                                .ok()
                                .and_then(|time| time.duration_since(std::time::UNIX_EPOCH).ok())
                                .map(|d| d.as_secs())
                                .unwrap_or(0);

                            // Spawn async task to get git status in parallel
                            let future = tokio::task::spawn_blocking(move || {
                                let git_status = get_git_status(&path_str);
                                Project {
                                    name,
                                    path: path_str,
                                    last_opened,
                                    git_status,
                                    is_pinned: false,
                                }
                            });
                            project_futures.push(future);
                        }
                    }
                }
            }
        }
    }

    // Scan WSL projects folder
    if let Ok(wsl_folder) = get_default_folder("wsl") {
        let wsl_projects_path = wsl_folder.clone();

        let wsl_result = Command::new("wsl")
            .args(&["bash", "-c", &format!("find {} -maxdepth 1 -type d -not -path {}", wsl_projects_path, wsl_projects_path)])
            .output();

        if let Ok(output) = wsl_result {
            if output.status.success() {
                let stdout = String::from_utf8_lossy(&output.stdout);
                for line in stdout.lines() {
                    let path = line.trim();
                    if !path.is_empty() {
                        if let Some(name) = path.split('/').last() {
                            let path_owned = path.to_string();
                            let name_owned = name.to_string();

                            // Spawn async task for WSL git status in parallel
                            let future = tokio::task::spawn_blocking(move || {
                                let git_status = get_git_status_wsl(&path_owned);
                                Project {
                                    name: name_owned,
                                    path: path_owned,
                                    last_opened: 0,
                                    git_status,
                                    is_pinned: false,
                                }
                            });
                            project_futures.push(future);
                        }
                    }
                }
            }
        }
    }

    // Wait for all git status checks to complete in parallel
    let mut all_projects = Vec::new();
    for future in project_futures {
        if let Ok(project) = future.await {
            all_projects.push(project);
        }
    }

    all_projects
}

pub fn scan_launcher_folders_fast() -> Vec<Project> {
    // Only scan Windows folder synchronously - it's instant
    // WSL scanning will happen in background to avoid blocking
    let mut all_projects = Vec::new();

    if let Ok(windows_folder) = get_default_folder("windows") {
        if let Ok(entries) = fs::read_dir(&windows_folder) {
            for entry in entries.flatten() {
                if let Ok(metadata) = entry.metadata() {
                    if metadata.is_dir() {
                        if let Some(name) = entry.file_name().to_str() {
                            let path = entry.path().to_string_lossy().to_string();
                            let last_opened = metadata.modified()
                                .ok()
                                .and_then(|time| time.duration_since(std::time::UNIX_EPOCH).ok())
                                .map(|d| d.as_secs())
                                .unwrap_or(0);

                            all_projects.push(Project {
                                name: name.to_string(),
                                path,
                                last_opened,
                                git_status: None,
                                is_pinned: false,
                            });
                        }
                    }
                }
            }
        }
    }

    all_projects
}

// New async function to scan WSL in background
pub async fn scan_wsl_projects() -> Vec<Project> {
    let mut wsl_projects = Vec::new();

    if let Ok(wsl_folder) = get_default_folder("wsl") {
        // Use wsl.exe directly with ls command (faster than bash -c)
        let wsl_result = tokio::process::Command::new("wsl.exe")
            .args(&["ls", "-1", &wsl_folder])
            .output()
            .await;

        if let Ok(output) = wsl_result {
            if output.status.success() {
                let stdout = String::from_utf8_lossy(&output.stdout);
                for name in stdout.lines() {
                    let name = name.trim();
                    if !name.is_empty() {
                        let path = format!("{}/{}", wsl_folder, name);
                        wsl_projects.push(Project {
                            name: name.to_string(),
                            path,
                            last_opened: 0,
                            git_status: None,
                            is_pinned: false,
                        });
                    }
                }
            }
        }
    }

    wsl_projects
}

pub async fn delete_project(path: String, name: String) -> Result<(), String> {
    use crate::github::delete_github_repo;

    // Try to delete GitHub repo first (if it exists)
    match delete_github_repo(name.clone()).await {
        Ok(_) => println!("GitHub repo '{}' deleted or didn't exist", name),
        Err(e) => println!("Warning: Could not delete GitHub repo '{}': {}", name, e),
    }

    // Check if path exists first
    let exists = if path.starts_with("/home/") || path.starts_with("/mnt/") {
        // WSL path
        let check = Command::new("wsl")
            .args(&["test", "-d", &path])
            .status();

        match check {
            Ok(status) => status.success(),
            Err(_) => false
        }
    } else {
        // Windows path
        std::path::Path::new(&path).exists()
    };

    if !exists {
        return Err(format!("Project folder does not exist: {}", path));
    }

    // Delete the local project folder
    if path.starts_with("/home/") || path.starts_with("/mnt/") {
        // WSL path - use WSL command to delete
        let result = Command::new("wsl")
            .args(&["rm", "-rf", &path])
            .output()
            .map_err(|e| format!("Failed to delete WSL project: {}", e))?;

        if !result.status.success() {
            let stderr = String::from_utf8_lossy(&result.stderr);
            return Err(format!("Failed to delete WSL project: {}", stderr));
        }
    } else {
        // Windows path - just delete the folder
        fs::remove_dir_all(&path)
            .map_err(|e| {
                // Check if it's a permission/access error (likely because folder is open)
                if e.kind() == std::io::ErrorKind::PermissionDenied {
                    format!("Cannot delete project - please close VSCode or any programs using this folder first")
                } else {
                    format!("Failed to delete project folder '{}': {}", path, e)
                }
            })?;
    }

    Ok(())
}

pub fn check_project_exists(name: String, env: String) -> Result<bool, String> {
    let base_folder = get_default_folder(&env)?;

    let full_path = if env == "wsl" {
        format!("{}/{}", base_folder, name)
    } else {
        format!("{}\\{}", base_folder, name)
    };

    // Check if path exists
    let exists = if env == "wsl" {
        let result = Command::new("wsl")
            .args(&["test", "-d", &full_path])
            .status();

        match result {
            Ok(status) => status.success(),
            Err(_) => false
        }
    } else {
        std::path::Path::new(&full_path).exists()
    };

    Ok(exists)
}

pub fn open_existing_project(path: String, env: String) -> Result<(), String> {
    // Just open VSCode for an existing project
    let ps_script = if env == "wsl" {
        format!(
            r#"code --folder-uri 'vscode-remote://wsl+Ubuntu{}'"#,
            path
        )
    } else {
        format!(
            r#"code '{}'"#,
            path
        )
    };

    Command::new("powershell")
        .args(&["-NoProfile", "-Command", &ps_script])
        .spawn()
        .map_err(|e| format!("Failed to open VSCode: {}", e))?;

    Ok(())
}

pub async fn paste_folder(env: String) -> Result<String, String> {
    use clipboard_win::{formats, get_clipboard};
    use crate::utils::get_default_folder;

    // Get clipboard contents (Windows file paths)
    let clipboard_data: Vec<String> = get_clipboard(formats::FileList)
        .unwrap_or_default();

    if clipboard_data.is_empty() {
        return Err("No folder in clipboard".to_string());
    }

    let source_path = clipboard_data.first().ok_or("No folder in clipboard")?;

    // Check if it's a directory
    if !std::path::Path::new(source_path).is_dir() {
        return Err("Clipboard contains a file, not a folder".to_string());
    }

    // Get folder name
    let folder_name = std::path::Path::new(source_path)
        .file_name()
        .ok_or("Invalid folder name")?
        .to_str()
        .ok_or("Invalid folder name")?;

    let base_folder = get_default_folder(&env)?;
    let dest_path = if env == "wsl" {
        format!("{}/{}", base_folder, folder_name)
    } else {
        format!("{}\\{}", base_folder, folder_name)
    };

    // Check if destination already exists
    let exists = if env == "wsl" {
        let check = Command::new("wsl")
            .args(&["test", "-d", &dest_path])
            .status();
        match check {
            Ok(status) => status.success(),
            Err(_) => false
        }
    } else {
        std::path::Path::new(&dest_path).exists()
    };

    if exists {
        return Err(format!("Project '{}' already exists", folder_name));
    }

    // Copy folder
    if env == "wsl" {
        // Convert Windows path to WSL path for source
        let wsl_source = source_path.replace("\\", "/").replace("C:", "/mnt/c");
        Command::new("wsl")
            .args(&["cp", "-r", &wsl_source, &dest_path])
            .output()
            .map_err(|e| format!("Failed to copy folder: {}", e))?;
    } else {
        // Use robocopy for Windows
        Command::new("robocopy")
            .args(&[source_path, &dest_path, "/E", "/NFL", "/NDL", "/NJH", "/NJS"])
            .output()
            .map_err(|e| format!("Failed to copy folder: {}", e))?;
    }

    Ok(folder_name.to_string())
}

pub fn open_ketra_folder(env: String) -> Result<(), String> {
    let base_folder = get_default_folder(&env)?;

    if env == "wsl" {
        // Open WSL folder in Windows Explorer
        Command::new("explorer.exe")
            .arg(format!("\\\\wsl$\\Ubuntu{}", base_folder))
            .spawn()
            .map_err(|e| format!("Failed to open folder: {}", e))?;
    } else {
        Command::new("explorer")
            .arg(&base_folder)
            .spawn()
            .map_err(|e| format!("Failed to open folder: {}", e))?;
    }

    Ok(())
}

pub fn open_terminal(env: String) -> Result<(), String> {
    let base_folder = get_default_folder(&env)?;

    if env == "wsl" {
        // Open Windows Terminal in WSL
        Command::new("wt")
            .args(&["-d", &base_folder])
            .spawn()
            .map_err(|e| format!("Failed to open terminal: {}", e))?;
    } else {
        // Open Windows Terminal in Windows
        Command::new("wt")
            .args(&["-d", &base_folder])
            .spawn()
            .map_err(|e| format!("Failed to open terminal: {}", e))?;
    }

    Ok(())
}

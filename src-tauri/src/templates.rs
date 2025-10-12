use std::fs;
use std::process::Command;
use crate::utils::get_default_folder;
use crate::github::create_github_repo;

pub fn init_project_template(path: &str, template: &str, env: &str) -> Result<(), String> {
    let is_wsl = env == "wsl";

    match template {
        "rust" => {
            let cmd = if is_wsl {
                Command::new("wsl")
                    .args(&["bash", "-c", &format!("cd {} && cargo init", path)])
                    .output()
            } else {
                Command::new("cmd")
                    .args(&["/C", "cargo", "init", path])
                    .output()
            };
            cmd.map_err(|e| format!("Failed to initialize Rust project: {}", e))?;
        },
        "nextjs" => {
            let cmd = if is_wsl {
                Command::new("wsl")
                    .args(&["bash", "-c", &format!("cd {} && npx create-next-app@latest . --typescript --tailwind --app --no-src-dir --import-alias '@/*' --yes", path)])
                    .output()
            } else {
                Command::new("cmd")
                    .args(&["/C", "cd", path, "&&", "npx", "create-next-app@latest", ".", "--typescript", "--tailwind", "--app", "--no-src-dir", "--import-alias", "@/*", "--yes"])
                    .output()
            };
            cmd.map_err(|e| format!("Failed to initialize Next.js project: {}", e))?;
        },
        "python" => {
            // Create basic Python project structure
            let content = "#!/usr/bin/env python3\n\ndef main():\n    print(\"Hello, World!\")\n\nif __name__ == \"__main__\":\n    main()\n";

            if is_wsl {
                Command::new("wsl")
                    .args(&["bash", "-c", &format!("echo '{}' > {}/main.py", content, path)])
                    .output()
                    .map_err(|e| format!("Failed to create Python file: {}", e))?;
            } else {
                let main_py = format!("{}\\main.py", path);
                fs::write(&main_py, content)
                    .map_err(|e| format!("Failed to create Python file: {}", e))?;
            }

            // Create requirements.txt
            if is_wsl {
                Command::new("wsl")
                    .args(&["touch", &format!("{}/requirements.txt", path)])
                    .output()
                    .ok();
            } else {
                let req_file = format!("{}\\requirements.txt", path);
                fs::write(&req_file, "").ok();
            }
        },
        "go" => {
            let cmd = if is_wsl {
                Command::new("wsl")
                    .args(&["bash", "-c", &format!("cd {} && go mod init {}", path, path.split('/').last().unwrap_or("app"))])
                    .output()
            } else {
                Command::new("cmd")
                    .args(&["/C", "cd", path, "&&", "go", "mod", "init", path.split('\\').last().unwrap_or("app")])
                    .output()
            };
            cmd.map_err(|e| format!("Failed to initialize Go project: {}", e))?;

            // Create main.go
            let content = "package main\n\nimport \"fmt\"\n\nfunc main() {\n    fmt.Println(\"Hello, World!\")\n}\n";

            if is_wsl {
                Command::new("wsl")
                    .args(&["bash", "-c", &format!("echo '{}' > {}/main.go", content, path)])
                    .output()
                    .ok();
            } else {
                let main_go = format!("{}\\main.go", path);
                fs::write(&main_go, content).ok();
            }
        },
        "node" => {
            let cmd = if is_wsl {
                Command::new("wsl")
                    .args(&["bash", "-c", &format!("cd {} && npm init -y", path)])
                    .output()
            } else {
                Command::new("cmd")
                    .args(&["/C", "cd", path, "&&", "npm", "init", "-y"])
                    .output()
            };
            cmd.map_err(|e| format!("Failed to initialize Node project: {}", e))?;

            // Create index.js
            let content = "console.log('Hello, World!');\n";

            if is_wsl {
                Command::new("wsl")
                    .args(&["bash", "-c", &format!("echo \"{}\" > {}/index.js", content, path)])
                    .output()
                    .ok();
            } else {
                let index_js = format!("{}\\index.js", path);
                fs::write(&index_js, content).ok();
            }
        },
        _ => {
            // Empty project - just create a README
            let content = format!("# {}\n\nA new project.\n", path.split(&['/', '\\'][..]).last().unwrap_or("project"));

            if is_wsl {
                Command::new("wsl")
                    .args(&["bash", "-c", &format!("echo '{}' > {}/README.md", content, path)])
                    .output()
                    .ok();
            } else {
                let readme = format!("{}\\README.md", path);
                fs::write(&readme, content).ok();
            }
        }
    }

    Ok(())
}

pub async fn launch_project(env: String, name: String, template: String, create_repo: bool) -> Result<(), String> {
    // Get the default base folder
    let base_folder = get_default_folder(&env)?;

    // Build full path
    let full_path = if env == "wsl" {
        format!("{}/{}", base_folder, name)
    } else {
        format!("{}\\{}", base_folder, name)
    };

    let is_wsl = env == "wsl";

    // For WSL, we need to create the folder via WSL command
    if is_wsl {
        // Create folder in WSL
        Command::new("wsl")
            .args(&["mkdir", "-p", &full_path])
            .output()
            .map_err(|e| format!("Failed to create WSL directory: {}", e))?;
    } else {
        // Create folder in Windows
        if !std::path::Path::new(&full_path).exists() {
            fs::create_dir_all(&full_path)
                .map_err(|e| format!("Failed to create directory: {}", e))?;
        }
    }

    // Initialize project template
    init_project_template(&full_path, &template, &env)?;

    // Initialize git repo with main as default branch
    let git_init = if is_wsl {
        Command::new("wsl")
            .args(&["bash", "-c", &format!("cd {} && git init -b main && git add . && git commit -m 'Initial commit'", full_path)])
            .output()
    } else {
        Command::new("cmd")
            .args(&["/C", &format!("cd {} && git init -b main && git add . && git commit -m \"Initial commit\"", full_path)])
            .output()
    };

    git_init.map_err(|e| format!("Failed to initialize git: {}", e))?;

    // Create GitHub repo if requested
    if create_repo {
        let clone_url = create_github_repo(name.clone()).await?;

        // Add remote and push
        let git_push = if is_wsl {
            Command::new("wsl")
                .args(&["bash", "-c", &format!("cd {} && git remote add origin {} && git branch -M main && git push -u origin main", full_path, clone_url)])
                .output()
        } else {
            Command::new("cmd")
                .args(&["/C", &format!("cd {} && git remote add origin {} && git branch -M main && git push -u origin main", full_path, clone_url)])
                .output()
        };

        git_push.map_err(|e| format!("Failed to push to GitHub: {}", e))?;
    }

    // Create a PowerShell script to launch VSCode
    let ps_script = if env == "wsl" {
        format!(
            r#"code --folder-uri 'vscode-remote://wsl+Ubuntu{}'"#,
            full_path
        )
    } else {
        format!(
            r#"code '{}'"#,
            full_path
        )
    };

    // Execute the PowerShell script
    let result = Command::new("powershell")
        .args(&["-NoProfile", "-Command", &ps_script])
        .spawn();

    match result {
        Ok(_) => Ok(()),
        Err(e) => Err(format!("Failed to launch VSCode: {}", e))
    }
}

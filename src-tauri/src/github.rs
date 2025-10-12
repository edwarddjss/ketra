use std::process::Command;

pub fn get_github_token() -> Result<String, String> {
    // Try to read GitHub token from environment or git config
    if let Ok(token) = std::env::var("GITHUB_TOKEN") {
        return Ok(token);
    }

    // Try gh CLI token
    let gh_result = Command::new("gh")
        .args(&["auth", "token"])
        .output();

    if let Ok(output) = gh_result {
        if output.status.success() {
            let token = String::from_utf8_lossy(&output.stdout).trim().to_string();
            if !token.is_empty() {
                return Ok(token);
            }
        }
    }

    Err("GitHub token not found. Please run 'gh auth login' or set GITHUB_TOKEN environment variable.".to_string())
}

pub fn check_github_auth() -> Result<String, String> {
    // Check if gh CLI is authenticated
    let gh_result = Command::new("gh")
        .args(&["auth", "status"])
        .output();

    match gh_result {
        Ok(output) => {
            if output.status.success() {
                // Get username
                let username_result = Command::new("gh")
                    .args(&["api", "user", "--jq", ".login"])
                    .output();

                if let Ok(user_output) = username_result {
                    let username = String::from_utf8_lossy(&user_output.stdout).trim().to_string();
                    return Ok(username);
                }
                Ok("authenticated".to_string())
            } else {
                Err("not_authenticated".to_string())
            }
        },
        Err(_) => Err("gh_not_installed".to_string())
    }
}

pub fn github_login() -> Result<(), String> {
    // Launch gh auth login
    Command::new("cmd")
        .args(&["/C", "start", "cmd", "/K", "gh", "auth", "login"])
        .spawn()
        .map_err(|e| format!("Failed to launch GitHub login: {}", e))?;

    Ok(())
}

pub async fn create_github_repo(name: String) -> Result<String, String> {
    let token = get_github_token()?;

    // Create private repo using GitHub API
    let client = reqwest::Client::new();
    let body = serde_json::json!({
        "name": name,
        "private": true,
        "auto_init": false
    });

    let response = client
        .post("https://api.github.com/user/repos")
        .header("Authorization", format!("Bearer {}", token))
        .header("User-Agent", "launcher-app")
        .json(&body)
        .send()
        .await
        .map_err(|e| format!("Failed to create GitHub repo: {}", e))?;

    if !response.status().is_success() {
        let error_text = response.text().await.unwrap_or_else(|_| "Unknown error".to_string());
        return Err(format!("GitHub API error: {}", error_text));
    }

    let repo_data: serde_json::Value = response.json().await
        .map_err(|e| format!("Failed to parse GitHub response: {}", e))?;

    let clone_url = repo_data["clone_url"]
        .as_str()
        .ok_or("Failed to get clone URL from response")?
        .to_string();

    Ok(clone_url)
}

pub async fn delete_github_repo(repo_name: String) -> Result<(), String> {
    let token = match get_github_token() {
        Ok(t) => t,
        Err(e) => {
            // No GitHub token, skip GitHub deletion
            println!("Skipping GitHub deletion: {}", e);
            return Ok(());
        }
    };

    // Get GitHub username
    let username_result = Command::new("gh")
        .args(&["api", "user", "--jq", ".login"])
        .output();

    let username = if let Ok(output) = username_result {
        String::from_utf8_lossy(&output.stdout).trim().to_string()
    } else {
        return Err("Failed to get GitHub username".to_string());
    };

    // Delete repo using GitHub API
    let client = reqwest::Client::new();
    let url = format!("https://api.github.com/repos/{}/{}", username, repo_name);

    let response = client
        .delete(&url)
        .header("Authorization", format!("Bearer {}", token))
        .header("User-Agent", "launcher-app")
        .send()
        .await
        .map_err(|e| format!("Failed to delete GitHub repo: {}", e))?;

    if !response.status().is_success() {
        // If repo doesn't exist (404), that's fine
        if response.status().as_u16() == 404 {
            return Ok(());
        }
        let error_text = response.text().await.unwrap_or_else(|_| "Unknown error".to_string());
        return Err(format!("GitHub API error: {}", error_text));
    }

    Ok(())
}

pub async fn git_push(path: String, env: String, message: String) -> Result<String, String> {
    // Check if remote exists
    let remote_check = if env == "wsl" {
        Command::new("wsl")
            .args(&["bash", "-c", &format!("cd {} && git remote get-url origin 2>&1", path)])
            .output()
    } else {
        Command::new("git")
            .args(&["-C", &path, "remote", "get-url", "origin"])
            .output()
    };

    let has_remote = if let Ok(output) = remote_check {
        output.status.success()
    } else {
        false
    };

    // If no remote, create GitHub repo and add it
    if !has_remote {
        // Extract project name from path
        let project_name = if env == "wsl" {
            path.split('/').last().unwrap_or("project")
        } else {
            path.split('\\').last().unwrap_or("project")
        };

        // Create GitHub repo
        let clone_url = create_github_repo(project_name.to_string()).await?;

        // Add remote
        let add_remote = if env == "wsl" {
            Command::new("wsl")
                .args(&["bash", "-c", &format!("cd {} && git remote add origin {} 2>&1", path, clone_url)])
                .output()
        } else {
            Command::new("git")
                .args(&["-C", &path, "remote", "add", "origin", &clone_url])
                .output()
        };

        if let Err(e) = add_remote {
            return Err(format!("Failed to add remote: {}", e));
        }

        // Set upstream branch
        let set_upstream = if env == "wsl" {
            Command::new("wsl")
                .args(&["bash", "-c", &format!("cd {} && git branch -M main 2>&1", path)])
                .output()
        } else {
            Command::new("git")
                .args(&["-C", &path, "branch", "-M", "main"])
                .output()
        };

        set_upstream.ok(); // Ignore errors if branch is already main
    }

    // Add all changes
    let add_output = if env == "wsl" {
        Command::new("wsl")
            .args(&["bash", "-c", &format!("cd {} && git add . 2>&1", path)])
            .output()
    } else {
        Command::new("git")
            .args(&["-C", &path, "add", "."])
            .output()
    };

    if let Err(e) = add_output {
        return Err(format!("Failed to add files: {}", e));
    }

    // Check if there are changes to commit
    let status_output = if env == "wsl" {
        Command::new("wsl")
            .args(&["bash", "-c", &format!("cd {} && git status --porcelain 2>&1", path)])
            .output()
    } else {
        Command::new("git")
            .args(&["-C", &path, "status", "--porcelain"])
            .output()
    };

    let has_changes = if let Ok(output) = status_output {
        !String::from_utf8_lossy(&output.stdout).trim().is_empty()
    } else {
        false
    };

    // Commit if there are changes
    if has_changes {
        let commit_output = if env == "wsl" {
            Command::new("wsl")
                .args(&["bash", "-c", &format!("cd {} && git commit -m '{}' 2>&1", path, message.replace("'", "'\\''"))])
                .output()
        } else {
            Command::new("git")
                .args(&["-C", &path, "commit", "-m", &message])
                .output()
        };

        if let Err(e) = commit_output {
            return Err(format!("Failed to commit: {}", e));
        }
    }

    // Push (with -u flag if this is the first push to new remote)
    let output = if env == "wsl" {
        let push_cmd = if !has_remote {
            format!("cd {} && git push -u origin main 2>&1", path)
        } else {
            format!("cd {} && git push 2>&1", path)
        };
        Command::new("wsl")
            .args(&["bash", "-c", &push_cmd])
            .output()
    } else {
        let mut args = vec!["-C", &path, "push"];
        if !has_remote {
            args.extend_from_slice(&["-u", "origin", "main"]);
        }
        Command::new("git")
            .args(&args)
            .output()
    };

    match output {
        Ok(o) => {
            let stdout = String::from_utf8_lossy(&o.stdout).to_string();
            let stderr = String::from_utf8_lossy(&o.stderr).to_string();

            if o.status.success() {
                Ok(stdout)
            } else {
                let combined = format!("{}{}", stdout, stderr);
                if combined.contains("Permission denied") || combined.contains("403") || combined.contains("denied to push") {
                    Err("Permission denied. You don't have push access to this repository. Fork it or create your own repo to push changes.".to_string())
                } else {
                    Err(format!("Push failed: {}", combined))
                }
            }
        },
        Err(e) => Err(format!("Failed to execute push: {}", e)),
    }
}

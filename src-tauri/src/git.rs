use crate::types::GitStatus;
use std::process::Command;

pub fn get_git_status(path: &str) -> Option<GitStatus> {
    // Check if .git folder exists
    let git_path = format!("{}/.git", path.replace("\\", "/"));
    if !std::path::Path::new(&git_path).exists() {
        return None;
    }

    // Get branch name
    let branch_output = Command::new("git")
        .args(&["-C", path, "branch", "--show-current"])
        .output()
        .ok()?;
    let branch = String::from_utf8_lossy(&branch_output.stdout).trim().to_string();

    // Get status
    let status_output = Command::new("git")
        .args(&["-C", path, "status", "--porcelain"])
        .output()
        .ok()?;
    let status_str = String::from_utf8_lossy(&status_output.stdout);
    let uncommitted_files = status_str.lines().count() as i32;
    let is_clean = uncommitted_files == 0;

    // Get ahead/behind counts
    let rev_output = Command::new("git")
        .args(&["-C", path, "rev-list", "--left-right", "--count", "HEAD...@{u}"])
        .output();

    let (commits_ahead, commits_behind) = if let Ok(output) = rev_output {
        let rev_str = String::from_utf8_lossy(&output.stdout);
        let parts: Vec<&str> = rev_str.trim().split_whitespace().collect();
        if parts.len() == 2 {
            (
                parts[0].parse().unwrap_or(0),
                parts[1].parse().unwrap_or(0),
            )
        } else {
            (0, 0)
        }
    } else {
        (0, 0)
    };

    Some(GitStatus {
        branch,
        is_clean,
        commits_ahead,
        commits_behind,
        uncommitted_files,
    })
}

pub fn get_git_status_wsl(path: &str) -> Option<GitStatus> {
    // Check if git repo exists
    let check = Command::new("wsl")
        .args(&["test", "-d", &format!("{}/.git", path)])
        .status()
        .ok()?;

    if !check.success() {
        return None;
    }

    // Get branch name
    let branch_output = Command::new("wsl")
        .args(&["bash", "-c", &format!("cd {} && git branch --show-current 2>/dev/null || echo ''", path)])
        .output()
        .ok()?;
    let branch = String::from_utf8_lossy(&branch_output.stdout).trim().to_string();

    // Get status
    let status_output = Command::new("wsl")
        .args(&["bash", "-c", &format!("cd {} && git status --porcelain 2>/dev/null || echo ''", path)])
        .output()
        .ok()?;
    let status_str = String::from_utf8_lossy(&status_output.stdout);
    let uncommitted_files = status_str.lines().filter(|l| !l.is_empty()).count() as i32;
    let is_clean = uncommitted_files == 0;

    // Get ahead/behind
    let rev_output = Command::new("wsl")
        .args(&["bash", "-c", &format!("cd {} && git rev-list --left-right --count HEAD...@{{u}} 2>/dev/null || echo '0 0'", path)])
        .output();

    let (commits_ahead, commits_behind) = if let Ok(output) = rev_output {
        let rev_str = String::from_utf8_lossy(&output.stdout);
        let parts: Vec<&str> = rev_str.trim().split_whitespace().collect();
        if parts.len() >= 2 {
            (
                parts[0].parse().unwrap_or(0),
                parts[1].parse().unwrap_or(0),
            )
        } else {
            (0, 0)
        }
    } else {
        (0, 0)
    };

    Some(GitStatus {
        branch,
        is_clean,
        commits_ahead,
        commits_behind,
        uncommitted_files,
    })
}

pub async fn git_pull(path: String, env: String) -> Result<String, String> {
    let output = if env == "wsl" {
        Command::new("wsl")
            .args(&["bash", "-c", &format!("cd {} && git pull 2>&1", path)])
            .output()
    } else {
        Command::new("git")
            .args(&["-C", &path, "pull"])
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
                if combined.contains("No such file or directory") || combined.contains("not a git repository") {
                    Err("Not a git repository".to_string())
                } else if combined.contains("no tracking information") || combined.contains("no upstream branch") {
                    Err("No remote tracking branch. This project may not have been pushed yet.".to_string())
                } else {
                    Err(format!("Pull failed: {}", combined))
                }
            }
        },
        Err(e) => Err(format!("Failed to execute pull: {}", e)),
    }
}

pub async fn git_clone(repo_url: String, env: String, base_folder: String) -> Result<String, String> {
    // Extract repo name from URL
    let repo_name = repo_url
        .trim_end_matches(".git")
        .split('/')
        .last()
        .ok_or("Invalid repository URL")?
        .to_string();

    let _clone_path = if env == "wsl" {
        format!("{}/{}", base_folder, repo_name)
    } else {
        format!("{}\\{}", base_folder, repo_name)
    };

    // Clone the repository
    let output = if env == "wsl" {
        Command::new("wsl")
            .args(&["bash", "-c", &format!("cd {} && git clone {} 2>&1", base_folder, repo_url)])
            .output()
    } else {
        Command::new("git")
            .args(&["-C", &base_folder, "clone", &repo_url])
            .output()
    };

    match output {
        Ok(o) => {
            if o.status.success() {
                Ok(repo_name)
            } else {
                let error = String::from_utf8_lossy(&o.stderr).to_string();
                Err(format!("Git clone failed: {}", error))
            }
        }
        Err(e) => Err(format!("Failed to execute git clone: {}", e))
    }
}

// Get list of all branches
pub fn get_branches(path: String, env: String) -> Result<Vec<String>, String> {
    let output = if env == "wsl" {
        Command::new("wsl")
            .args(&["bash", "-c", &format!("cd {} && git branch --all 2>&1", path)])
            .output()
    } else {
        Command::new("git")
            .args(&["-C", &path, "branch", "--all"])
            .output()
    };

    match output {
        Ok(o) => {
            if o.status.success() {
                let branches: Vec<String> = String::from_utf8_lossy(&o.stdout)
                    .lines()
                    .map(|line| line.trim().trim_start_matches("* ").trim_start_matches("remotes/origin/").to_string())
                    .filter(|b| !b.is_empty() && !b.contains("HEAD ->"))
                    .collect();
                Ok(branches)
            } else {
                Err("Failed to get branches".to_string())
            }
        }
        Err(e) => Err(format!("Failed to execute git branch: {}", e))
    }
}

// Switch to a different branch
pub async fn switch_branch(path: String, env: String, branch: String) -> Result<String, String> {
    let output = if env == "wsl" {
        Command::new("wsl")
            .args(&["bash", "-c", &format!("cd {} && git checkout {} 2>&1", path, branch)])
            .output()
    } else {
        Command::new("git")
            .args(&["-C", &path, "checkout", &branch])
            .output()
    };

    match output {
        Ok(o) => {
            if o.status.success() {
                Ok(format!("Switched to branch '{}'", branch))
            } else {
                let error = String::from_utf8_lossy(&o.stderr).to_string();
                Err(format!("Failed to switch branch: {}", error))
            }
        }
        Err(e) => Err(format!("Failed to execute git checkout: {}", e))
    }
}

// Create a new branch
pub async fn create_branch(path: String, env: String, branch_name: String) -> Result<String, String> {
    let output = if env == "wsl" {
        Command::new("wsl")
            .args(&["bash", "-c", &format!("cd {} && git checkout -b {} 2>&1", path, branch_name)])
            .output()
    } else {
        Command::new("git")
            .args(&["-C", &path, "checkout", "-b", &branch_name])
            .output()
    };

    match output {
        Ok(o) => {
            if o.status.success() {
                Ok(format!("Created and switched to branch '{}'", branch_name))
            } else {
                let error = String::from_utf8_lossy(&o.stderr).to_string();
                Err(format!("Failed to create branch: {}", error))
            }
        }
        Err(e) => Err(format!("Failed to execute git checkout: {}", e))
    }
}

// Get commit history
pub fn get_commit_history(path: String, env: String, limit: i32) -> Result<Vec<serde_json::Value>, String> {
    let output = if env == "wsl" {
        Command::new("wsl")
            .args(&["bash", "-c", &format!(
                "cd {} && git log -{} --pretty=format:'%H|%an|%ae|%at|%s' 2>&1",
                path, limit
            )])
            .output()
    } else {
        Command::new("git")
            .args(&["-C", &path, "log", &format!("-{}", limit), "--pretty=format:%H|%an|%ae|%at|%s"])
            .output()
    };

    match output {
        Ok(o) => {
            if o.status.success() {
                let commits: Vec<serde_json::Value> = String::from_utf8_lossy(&o.stdout)
                    .lines()
                    .filter_map(|line| {
                        let parts: Vec<&str> = line.splitn(5, '|').collect();
                        if parts.len() == 5 {
                            Some(serde_json::json!({
                                "hash": parts[0],
                                "author": parts[1],
                                "email": parts[2],
                                "timestamp": parts[3].parse::<i64>().unwrap_or(0),
                                "message": parts[4]
                            }))
                        } else {
                            None
                        }
                    })
                    .collect();
                Ok(commits)
            } else {
                Err("Failed to get commit history".to_string())
            }
        }
        Err(e) => Err(format!("Failed to execute git log: {}", e))
    }
}

// Get git diff
pub fn get_diff(path: String, env: String) -> Result<String, String> {
    let output = if env == "wsl" {
        Command::new("wsl")
            .args(&["bash", "-c", &format!("cd {} && git diff HEAD 2>&1", path)])
            .output()
    } else {
        Command::new("git")
            .args(&["-C", &path, "diff", "HEAD"])
            .output()
    };

    match output {
        Ok(o) => {
            if o.status.success() {
                Ok(String::from_utf8_lossy(&o.stdout).to_string())
            } else {
                Err("Failed to get diff".to_string())
            }
        }
        Err(e) => Err(format!("Failed to execute git diff: {}", e))
    }
}

// Git stash
pub async fn git_stash(path: String, env: String) -> Result<String, String> {
    let output = if env == "wsl" {
        Command::new("wsl")
            .args(&["bash", "-c", &format!("cd {} && git stash 2>&1", path)])
            .output()
    } else {
        Command::new("git")
            .args(&["-C", &path, "stash"])
            .output()
    };

    match output {
        Ok(o) => {
            if o.status.success() {
                let result = String::from_utf8_lossy(&o.stdout).to_string();
                if result.contains("No local changes to save") {
                    Ok("No changes to stash".to_string())
                } else {
                    Ok("Changes stashed successfully".to_string())
                }
            } else {
                Err("Failed to stash changes".to_string())
            }
        }
        Err(e) => Err(format!("Failed to execute git stash: {}", e))
    }
}

// Git stash pop
pub async fn git_stash_pop(path: String, env: String) -> Result<String, String> {
    let output = if env == "wsl" {
        Command::new("wsl")
            .args(&["bash", "-c", &format!("cd {} && git stash pop 2>&1", path)])
            .output()
    } else {
        Command::new("git")
            .args(&["-C", &path, "stash", "pop"])
            .output()
    };

    match output {
        Ok(o) => {
            if o.status.success() {
                Ok("Stash applied successfully".to_string())
            } else {
                let error = String::from_utf8_lossy(&o.stderr).to_string();
                if error.contains("No stash entries found") {
                    Err("No stashed changes to restore".to_string())
                } else {
                    Err(format!("Failed to apply stash: {}", error))
                }
            }
        }
        Err(e) => Err(format!("Failed to execute git stash pop: {}", e))
    }
}

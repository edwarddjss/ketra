// Prevents additional console window on Windows in release, DO NOT REMOVE!!
#![cfg_attr(not(debug_assertions), windows_subsystem = "windows")]

mod types;
mod git;
mod github;
mod projects;
mod templates;
mod utils;

use types::{Project, GitStatus};
use git::{get_git_status, get_git_status_wsl};
use projects::*;

#[tauri::command]
async fn get_recent_projects() -> Vec<Project> {
    let mut projects = scan_launcher_folders_async().await;
    // Sort by last_opened (modified time), most recent first
    projects.sort_by(|a, b| b.last_opened.cmp(&a.last_opened));
    projects
}

#[tauri::command]
fn get_projects_fast() -> Vec<Project> {
    let mut all_projects = scan_launcher_folders_fast();
    // Sort by last_opened (modified time), most recent first
    all_projects.sort_by(|a, b| b.last_opened.cmp(&a.last_opened));
    all_projects
}

#[tauri::command]
fn get_project_git_status(path: String) -> Option<GitStatus> {
    if path.starts_with("/home/") || path.starts_with("/mnt/") {
        get_git_status_wsl(&path)
    } else {
        get_git_status(&path)
    }
}

#[tauri::command]
async fn delete_github_repo(repo_name: String) -> Result<(), String> {
    github::delete_github_repo(repo_name).await
}

#[tauri::command]
async fn delete_project(path: String, name: String) -> Result<(), String> {
    projects::delete_project(path, name).await
}

#[tauri::command]
fn check_github_auth() -> Result<String, String> {
    github::check_github_auth()
}

#[tauri::command]
fn github_login() -> Result<(), String> {
    github::github_login()
}

#[tauri::command]
async fn create_github_repo(name: String) -> Result<String, String> {
    github::create_github_repo(name).await
}

#[tauri::command]
fn check_project_exists(name: String, env: String) -> Result<bool, String> {
    projects::check_project_exists(name, env)
}

#[tauri::command]
fn open_existing_project(path: String, env: String) -> Result<(), String> {
    projects::open_existing_project(path, env)
}

#[tauri::command]
async fn launch_project(env: String, name: String, template: String, create_repo: bool) -> Result<(), String> {
    templates::launch_project(env, name, template, create_repo).await
}

#[tauri::command]
async fn git_pull(path: String, env: String) -> Result<String, String> {
    git::git_pull(path, env).await
}

#[tauri::command]
async fn git_push(path: String, env: String, message: String) -> Result<String, String> {
    github::git_push(path, env, message).await
}

#[tauri::command]
fn toggle_pin(_name: String) -> Result<(), String> {
    // For now, just return Ok - will implement persistence later
    Ok(())
}

#[tauri::command]
async fn git_clone(repo_url: String, env: String) -> Result<String, String> {
    use utils::get_default_folder;
    let base_folder = get_default_folder(&env)?;
    git::git_clone(repo_url, env, base_folder).await
}

#[tauri::command]
async fn paste_folder(env: String) -> Result<String, String> {
    projects::paste_folder(env).await
}

#[tauri::command]
fn open_ketra_folder(env: String) -> Result<(), String> {
    projects::open_ketra_folder(env)
}

#[tauri::command]
fn open_terminal(env: String) -> Result<(), String> {
    projects::open_terminal(env)
}

#[tauri::command]
fn get_branches(path: String, env: String) -> Result<Vec<String>, String> {
    git::get_branches(path, env)
}

#[tauri::command]
async fn switch_branch(path: String, env: String, branch: String) -> Result<String, String> {
    git::switch_branch(path, env, branch).await
}

#[tauri::command]
async fn create_branch(path: String, env: String, branch_name: String) -> Result<String, String> {
    git::create_branch(path, env, branch_name).await
}

#[tauri::command]
fn get_commit_history(path: String, env: String, limit: i32) -> Result<Vec<serde_json::Value>, String> {
    git::get_commit_history(path, env, limit)
}

#[tauri::command]
fn get_diff(path: String, env: String) -> Result<String, String> {
    git::get_diff(path, env)
}

#[tauri::command]
async fn git_stash(path: String, env: String) -> Result<String, String> {
    git::git_stash(path, env).await
}

#[tauri::command]
async fn git_stash_pop(path: String, env: String) -> Result<String, String> {
    git::git_stash_pop(path, env).await
}

#[tauri::command]
async fn scan_wsl_projects() -> Vec<Project> {
    projects::scan_wsl_projects().await
}

fn main() {
    tauri::Builder::default()
        .plugin(tauri_plugin_shell::init())
        .plugin(tauri_plugin_dialog::init())
        .invoke_handler(tauri::generate_handler![
            get_recent_projects,
            get_projects_fast,
            scan_wsl_projects,
            get_project_git_status,
            delete_project,
            delete_github_repo,
            launch_project,
            open_existing_project,
            check_project_exists,
            create_github_repo,
            check_github_auth,
            github_login,
            git_pull,
            git_push,
            toggle_pin,
            git_clone,
            paste_folder,
            open_ketra_folder,
            open_terminal,
            get_branches,
            switch_branch,
            create_branch,
            get_commit_history,
            get_diff,
            git_stash,
            git_stash_pop
        ])
        .run(tauri::generate_context!())
        .expect("error while running tauri application");
}

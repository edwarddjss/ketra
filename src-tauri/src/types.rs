use serde::{Deserialize, Serialize};

#[derive(Debug, Serialize, Deserialize, Clone)]
pub struct Project {
    pub name: String,
    pub path: String,
    pub last_opened: u64,
    pub git_status: Option<GitStatus>,
    pub is_pinned: bool,
}

#[derive(Debug, Serialize, Deserialize, Clone)]
pub struct GitStatus {
    pub branch: String,
    pub is_clean: bool,
    pub commits_ahead: i32,
    pub commits_behind: i32,
    pub uncommitted_files: i32,
}

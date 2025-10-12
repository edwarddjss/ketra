export interface GitStatus {
  branch: string;
  is_clean: boolean;
  commits_ahead: number;
  commits_behind: number;
}

export interface Project {
  name: string;
  path: string;
  last_opened: number;
  is_pinned: boolean;
  git_status?: GitStatus;
}

export interface Settings {
  defaultEnv: 'windows' | 'wsl';
  defaultTemplate: 'empty' | 'rust' | 'nextjs' | 'python' | 'go' | 'node';
  autoCreateGithub: boolean;
}

export type Environment = 'windows' | 'wsl';

export type ToastType = 'info' | 'success' | 'error';

export interface AppState {
  projects: Project[];
  pinnedProjects: Set<string>;
  projectOrder: string[];
  settings: Settings;
  activeEnv: Environment;
  isGithubAuthenticated: boolean;
}

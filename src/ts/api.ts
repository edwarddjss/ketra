import { invoke } from '@tauri-apps/api/core';
import { Project } from './types';

export class API {
  static async getRecentProjects(): Promise<Project[]> {
    try {
      return await invoke<Project[]>('get_recent_projects');
    } catch (error) {
      console.error('Failed to get recent projects:', error);
      throw new Error(`Failed to load projects: ${error}`);
    }
  }

  static async getProjectsFast(): Promise<Project[]> {
    try {
      return await invoke<Project[]>('get_projects_fast');
    } catch (error) {
      console.error('Failed to get projects:', error);
      throw new Error(`Failed to load projects: ${error}`);
    }
  }

  static async scanWslProjects(): Promise<Project[]> {
    try {
      return await invoke<Project[]>('scan_wsl_projects');
    } catch (error) {
      console.error('Failed to scan WSL projects:', error);
      return [];
    }
  }

  static async getProjectGitStatus(path: string): Promise<any> {
    try {
      return await invoke('get_project_git_status', { path });
    } catch (error) {
      console.error('Failed to get git status:', error);
      return null;
    }
  }

  static async launchProject(params: {
    env: string;
    name: string;
    template: string;
    createRepo: boolean;
  }): Promise<void> {
    try {
      await invoke('launch_project', params);
    } catch (error) {
      console.error('Failed to launch project:', error);
      throw new Error(`Failed to create project: ${error}`);
    }
  }

  static async openExistingProject(path: string, env: string): Promise<void> {
    try {
      await invoke('open_existing_project', { path, env });
    } catch (error) {
      console.error('Failed to open project:', error);
      throw new Error(`Failed to open project: ${error}`);
    }
  }

  static async deleteProject(path: string, name: string): Promise<void> {
    try {
      await invoke('delete_project', { path, name });
    } catch (error) {
      console.error('Failed to delete project:', error);
      throw new Error(`Failed to delete project: ${error}`);
    }
  }

  static async gitPull(path: string, env: string): Promise<void> {
    try {
      await invoke('git_pull', { path, env });
    } catch (error) {
      console.error('Failed to pull:', error);
      throw new Error(`Git pull failed: ${error}`);
    }
  }

  static async gitPush(path: string, env: string, message: string): Promise<void> {
    try {
      await invoke('git_push', { path, env, message });
    } catch (error) {
      console.error('Failed to push:', error);
      throw new Error(`Git push failed: ${error}`);
    }
  }

  static async gitClone(repoUrl: string, env: string): Promise<string> {
    try {
      return await invoke<string>('git_clone', { repoUrl, env });
    } catch (error) {
      console.error('Failed to clone:', error);
      throw new Error(`Git clone failed: ${error}`);
    }
  }

  static async checkProjectExists(name: string, env: string): Promise<boolean> {
    try {
      return await invoke<boolean>('check_project_exists', { name, env });
    } catch (error) {
      console.error('Failed to check project:', error);
      return false;
    }
  }

  static async checkGithubAuth(): Promise<string | null> {
    try {
      return await invoke<string>('check_github_auth');
    } catch (error) {
      return null;
    }
  }

  static async githubLogin(): Promise<void> {
    try {
      await invoke('github_login');
    } catch (error) {
      console.error('Failed to open GitHub login:', error);
      throw new Error(`Failed to open GitHub login: ${error}`);
    }
  }

  static async pasteFolder(env: string): Promise<string> {
    try {
      return await invoke<string>('paste_folder', { env });
    } catch (error) {
      console.error('Failed to paste folder:', error);
      throw new Error(`${error}`);
    }
  }

  static async openKetraFolder(env: string): Promise<void> {
    try {
      await invoke('open_ketra_folder', { env });
    } catch (error) {
      console.error('Failed to open ketra folder:', error);
      throw new Error(`Failed to open ketra folder: ${error}`);
    }
  }

  static async openTerminal(env: string): Promise<void> {
    try {
      await invoke('open_terminal', { env });
    } catch (error) {
      console.error('Failed to open terminal:', error);
      throw new Error(`Failed to open terminal: ${error}`);
    }
  }

  static async getBranches(path: string, env: string): Promise<string[]> {
    try {
      return await invoke<string[]>('get_branches', { path, env });
    } catch (error) {
      console.error('Failed to get branches:', error);
      throw new Error(`Failed to get branches: ${error}`);
    }
  }

  static async switchBranch(path: string, env: string, branch: string): Promise<string> {
    try {
      return await invoke<string>('switch_branch', { path, env, branch });
    } catch (error) {
      console.error('Failed to switch branch:', error);
      throw new Error(`Failed to switch branch: ${error}`);
    }
  }

  static async createBranch(path: string, env: string, branchName: string): Promise<string> {
    try {
      return await invoke<string>('create_branch', { path, env, branchName });
    } catch (error) {
      console.error('Failed to create branch:', error);
      throw new Error(`Failed to create branch: ${error}`);
    }
  }

  static async getCommitHistory(path: string, env: string, limit: number = 10): Promise<any[]> {
    try {
      return await invoke<any[]>('get_commit_history', { path, env, limit });
    } catch (error) {
      console.error('Failed to get commit history:', error);
      throw new Error(`Failed to get commit history: ${error}`);
    }
  }

  static async getDiff(path: string, env: string): Promise<string> {
    try {
      return await invoke<string>('get_diff', { path, env });
    } catch (error) {
      console.error('Failed to get diff:', error);
      throw new Error(`Failed to get diff: ${error}`);
    }
  }

  static async gitStash(path: string, env: string): Promise<string> {
    try {
      return await invoke<string>('git_stash', { path, env });
    } catch (error) {
      console.error('Failed to stash:', error);
      throw new Error(`Failed to stash: ${error}`);
    }
  }

  static async gitStashPop(path: string, env: string): Promise<string> {
    try {
      return await invoke<string>('git_stash_pop', { path, env });
    } catch (error) {
      console.error('Failed to unstash:', error);
      throw new Error(`Failed to unstash: ${error}`);
    }
  }
}

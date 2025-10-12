import { Project, Settings, AppState, Environment } from './types';
import { Storage } from './storage';

class StateManager {
  private state: AppState = {
    projects: [],
    pinnedProjects: new Set(),
    projectOrder: [],
    settings: {
      defaultEnv: 'windows',
      defaultTemplate: 'empty',
      autoCreateGithub: false,
    },
    activeEnv: 'windows', // Default to Windows
    isGithubAuthenticated: false,
  };

  private listeners = new Set<() => void>();

  constructor() {
    this.loadFromStorage();
  }

  private loadFromStorage(): void {
    const savedSettings = Storage.loadSettings();
    this.state.settings = { ...this.state.settings, ...savedSettings };
    this.state.pinnedProjects = Storage.loadPinnedProjects();
    this.state.projectOrder = Storage.loadProjectOrder();
    // Set activeEnv to match the saved defaultEnv
    this.state.activeEnv = this.state.settings.defaultEnv;
  }

  // Getters
  getProjects(): Project[] {
    return this.state.projects;
  }

  getSettings(): Settings {
    return this.state.settings;
  }

  getActiveEnv(): Environment {
    return this.state.activeEnv;
  }

  getPinnedProjects(): Set<string> {
    return this.state.pinnedProjects;
  }

  getProjectOrder(): string[] {
    return this.state.projectOrder;
  }

  isAuthenticated(): boolean {
    return this.state.isGithubAuthenticated;
  }

  // Setters
  setProjects(projects: Project[]): void {
    this.state.projects = projects;
    this.notify();
  }

  setSettings(settings: Partial<Settings>): void {
    this.state.settings = { ...this.state.settings, ...settings };
    // When defaultEnv changes, update activeEnv and reload projects
    if (settings.defaultEnv && settings.defaultEnv !== this.state.activeEnv) {
      this.state.activeEnv = settings.defaultEnv;
    }
    Storage.saveSettings(this.state.settings);
    this.notify();
  }

  setActiveEnv(env: Environment): void {
    this.state.activeEnv = env;
    this.notify();
  }

  togglePin(projectName: string): void {
    if (this.state.pinnedProjects.has(projectName)) {
      this.state.pinnedProjects.delete(projectName);
    } else {
      this.state.pinnedProjects.add(projectName);
    }
    Storage.savePinnedProjects(this.state.pinnedProjects);
    this.notify();
  }

  setProjectOrder(order: string[]): void {
    this.state.projectOrder = order;
    Storage.saveProjectOrder(order);
    this.notify();
  }

  setAuthenticated(value: boolean): void {
    this.state.isGithubAuthenticated = value;
    this.notify();
  }

  // Observer pattern
  subscribe(listener: () => void): () => void {
    this.listeners.add(listener);
    return () => this.listeners.delete(listener);
  }

  private notify(): void {
    this.listeners.forEach(listener => listener());
  }
}

export const state = new StateManager();

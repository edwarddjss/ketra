import { Settings } from './types';

const STORAGE_KEYS = {
  SETTINGS: 'ketra_settings',
  PINNED: 'ketra_pinned_projects',
  ORDER: 'ketra_project_order',
} as const;

export class Storage {
  static loadSettings(): Partial<Settings> {
    try {
      const saved = localStorage.getItem(STORAGE_KEYS.SETTINGS);
      return saved ? JSON.parse(saved) : {};
    } catch (error) {
      console.error('Failed to load settings:', error);
      return {};
    }
  }

  static saveSettings(settings: Settings): void {
    try {
      localStorage.setItem(STORAGE_KEYS.SETTINGS, JSON.stringify(settings));
    } catch (error) {
      console.error('Failed to save settings:', error);
    }
  }

  static loadPinnedProjects(): Set<string> {
    try {
      const pinned = localStorage.getItem(STORAGE_KEYS.PINNED);
      return pinned ? new Set(JSON.parse(pinned)) : new Set();
    } catch (error) {
      console.error('Failed to load pinned projects:', error);
      return new Set();
    }
  }

  static savePinnedProjects(pinned: Set<string>): void {
    try {
      localStorage.setItem(STORAGE_KEYS.PINNED, JSON.stringify([...pinned]));
    } catch (error) {
      console.error('Failed to save pinned projects:', error);
    }
  }

  static loadProjectOrder(): string[] {
    try {
      const order = localStorage.getItem(STORAGE_KEYS.ORDER);
      return order ? JSON.parse(order) : [];
    } catch (error) {
      console.error('Failed to load project order:', error);
      return [];
    }
  }

  static saveProjectOrder(order: string[]): void {
    try {
      localStorage.setItem(STORAGE_KEYS.ORDER, JSON.stringify(order));
    } catch (error) {
      console.error('Failed to save project order:', error);
    }
  }
}

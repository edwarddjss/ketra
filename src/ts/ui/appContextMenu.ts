import { API } from '../api';
import { Toast } from './toast';
import { Renderer } from './renderer';
import { state } from '../state';
import { ContextMenuManager } from './contextMenuManager';

export class AppContextMenu {
  static init(): void {
    // Right-click on main app area (not on project cards)
    document.addEventListener('contextmenu', (e) => {
      const card = (e.target as HTMLElement).closest('.project-card');
      const titleBar = (e.target as HTMLElement).closest('.title-bar');
      const contextMenuEl = (e.target as HTMLElement).closest('.context-menu');

      // Only show if NOT clicking on a card, title bar, or existing context menu
      if (!card && !titleBar && !contextMenuEl) {
        const content = (e.target as HTMLElement).closest('.content');
        if (content) {
          e.preventDefault();
          ContextMenuManager.show('appContextMenu', e.clientX, e.clientY);
        }
      }
    });

    // Handle menu item clicks
    document.querySelectorAll('#appContextMenu .context-menu-item').forEach(item => {
      item.addEventListener('click', (e) => {
        const action = (e.currentTarget as HTMLElement).dataset.action;
        if (action) {
          this.handleAction(action);
        }
        ContextMenuManager.hide('appContextMenu');
      });
    });
  }

  private static async handleAction(action: string): Promise<void> {
    const settings = state.getSettings();
    const env = settings.defaultEnv;

    switch (action) {
      case 'refresh':
        try {
          await Renderer.loadProjects();
        } catch (error) {
          Toast.error('Failed to refresh projects');
        }
        break;

      case 'openLauncher':
        try {
          await API.openKetraFolder(env);
        } catch (error) {
          Toast.error('Failed to open ketra folder');
        }
        break;

      case 'terminal':
        try {
          await API.openTerminal(env);
        } catch (error) {
          Toast.error('Failed to open terminal');
        }
        break;
    }
  }
}

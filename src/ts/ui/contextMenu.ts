import { API } from '../api';
import { Toast } from './toast';
import { state } from '../state';
import { ContextMenuManager } from './contextMenuManager';

export class ContextMenu {
  private static currentProjectName: string | null = null;
  private static currentProjectPath: string | null = null;
  private static currentProjectEnv: string | null = null;

  static init(): void {
    // Right-click on project cards
    document.addEventListener('contextmenu', (e) => {
      const card = (e.target as HTMLElement).closest('.project-card') as HTMLElement;
      if (card) {
        e.preventDefault();
        this.currentProjectName = card.dataset.name || null;
        this.currentProjectPath = card.dataset.path || null;
        this.currentProjectEnv = card.dataset.env || null;
        ContextMenuManager.show('contextMenu', e.clientX, e.clientY);
      }
    });

    // Handle menu item clicks
    document.querySelectorAll('#contextMenu .context-menu-item').forEach(item => {
      item.addEventListener('click', (e) => {
        const action = (e.currentTarget as HTMLElement).dataset.action;
        if (action) {
          this.handleAction(action);
        }
        ContextMenuManager.hide('contextMenu');
      });
    });
  }

  private static async handleAction(action: string): Promise<void> {
    if (!this.currentProjectName || !this.currentProjectPath || !this.currentProjectEnv) return;

    const projectName = this.currentProjectName;
    const projectPath = this.currentProjectPath;
    const projectEnv = this.currentProjectEnv;

    switch (action) {
      case 'open':
        try {
          await API.openExistingProject(projectPath, projectEnv);
        } catch (error) {
          Toast.error('Failed to open project');
        }
        break;

      case 'copy':
        try {
          await navigator.clipboard.writeText(projectName);
        } catch (error) {
          Toast.error('Failed to copy project');
        }
        break;

      case 'copyPath':
        try {
          await navigator.clipboard.writeText(projectPath);
        } catch (error) {
          Toast.error('Failed to copy path');
        }
        break;

      case 'delete':
        // Use the existing delete flow with confirmation modal
        const confirmDelete = await this.showDeleteConfirmation(projectName);
        if (confirmDelete) {
          try {
            await API.deleteProject(projectName, projectPath);

            // Remove from state
            const projects = state.getProjects().filter(p => p.name !== projectName);
            state.setProjects(projects);
          } catch (error) {
            const errorMsg = error instanceof Error ? error.message : 'Unknown error';
            Toast.error(`Failed to delete: ${errorMsg}`);
          }
        }
        break;
    }
  }

  private static showDeleteConfirmation(projectName: string): Promise<boolean> {
    return new Promise((resolve) => {
      const modalHtml = `
        <div class="modal-overlay active" id="deleteConfirmModal">
          <div class="modal">
            <div class="modal-header">CONFIRM DELETE</div>
            <div class="modal-content">
              <div class="modal-text">Are you sure you want to delete this project?</div>
              <div class="modal-project-name">${projectName}</div>
              <div class="modal-text" style="font-size: 11px; color: #888;">This will only remove it from the launcher. Files will not be deleted.</div>
              <div class="modal-buttons">
                <button class="btn btn-cancel">CANCEL</button>
                <button class="btn btn-delete">DELETE</button>
              </div>
            </div>
          </div>
        </div>
      `;

      document.body.insertAdjacentHTML('beforeend', modalHtml);

      const modal = document.getElementById('deleteConfirmModal');
      const cancelBtn = modal?.querySelector('.btn-cancel');
      const deleteBtn = modal?.querySelector('.btn-delete');

      const cleanup = () => {
        modal?.remove();
      };

      cancelBtn?.addEventListener('click', () => {
        cleanup();
        resolve(false);
      });

      deleteBtn?.addEventListener('click', () => {
        cleanup();
        resolve(true);
      });

      // Close on escape
      const escHandler = (e: KeyboardEvent) => {
        if (e.key === 'Escape') {
          cleanup();
          resolve(false);
          document.removeEventListener('keydown', escHandler);
        }
      };
      document.addEventListener('keydown', escHandler);
    });
  }
}

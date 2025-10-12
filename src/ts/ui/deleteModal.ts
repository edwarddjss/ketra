import { API } from '../api';
import { state } from '../state';
import { Toast } from './toast';

export async function confirmDeleteProject(name: string, path: string): Promise<void> {
  const modalHtml = `
    <div class="modal-overlay active" id="dragDeleteModal">
      <div class="modal">
        <div class="modal-header">DELETE PROJECT</div>
        <div class="modal-content">
          <div class="modal-text">To delete this project, type its name:</div>
          <div class="modal-project-name">${name}</div>
          <input type="text" id="dragDeleteInput" placeholder="Type project name" autocomplete="off" autocorrect="off" autocapitalize="off" spellcheck="false">
          <div class="modal-buttons">
            <button class="btn btn-cancel" id="dragDeleteCancel">CANCEL</button>
            <button class="btn btn-delete" id="dragDeleteConfirm" disabled>DELETE</button>
          </div>
        </div>
      </div>
    </div>
  `;

  document.body.insertAdjacentHTML('beforeend', modalHtml);

  const modal = document.getElementById('dragDeleteModal')!;
  const input = document.getElementById('dragDeleteInput') as HTMLInputElement;
  const cancelBtn = document.getElementById('dragDeleteCancel')!;
  const confirmBtn = document.getElementById('dragDeleteConfirm') as HTMLButtonElement;

  input.focus();

  input.addEventListener('input', () => {
    confirmBtn.disabled = input.value.trim() !== name;
  });

  input.addEventListener('keydown', (e) => {
    if (e.key === 'Enter' && !confirmBtn.disabled) {
      performDelete();
    } else if (e.key === 'Escape') {
      closeModal();
    }
  });

  cancelBtn.addEventListener('click', closeModal);
  confirmBtn.addEventListener('click', performDelete);

  function closeModal() {
    modal.remove();
  }

  async function performDelete() {
    closeModal();

    try {
      await API.deleteProject(path, name);
      const projects = state.getProjects().filter(p => p.name !== name);
      state.setProjects(projects);
      Toast.success('Project deleted!');
    } catch (error) {
      console.error('Failed to delete:', error);
      Toast.error(`Delete failed: ${error}`);
    }
  }
}

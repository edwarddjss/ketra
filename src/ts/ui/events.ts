import { getCurrentWindow } from '@tauri-apps/api/window';
import { state } from '../state';
import { API } from '../api';
import { Toast } from './toast';
import { Renderer } from './renderer';

export class EventHandlers {
  static setupWindowControls(): void {
    document.getElementById('minimize')?.addEventListener('click', async () => {
      await getCurrentWindow().minimize();
    });

    document.getElementById('maximize')?.addEventListener('click', async () => {
      await getCurrentWindow().toggleMaximize();
    });

    document.getElementById('close')?.addEventListener('click', async () => {
      await getCurrentWindow().close();
    });

    // Settings button
    document.getElementById('settingsBtn')?.addEventListener('click', async () => {
      await showSettingsModal();
    });
  }

  static setupFabButtons(): void {
    // Add project button - shows choice modal
    document.getElementById('addProjectBtn')?.addEventListener('click', async () => {
      await showAddProjectChoiceModal();
    });
  }

  static setupCardActions(): void {
    document.addEventListener('click', async (e) => {
      const target = e.target as HTMLElement;
      const card = target.closest('.project-card') as HTMLElement;
      if (!card) return;

      const name = card.dataset.name!;
      const path = card.dataset.path!;
      const env = card.dataset.env!;
      const action = target.closest('[data-action]')?.getAttribute('data-action');

      if (action === 'pin') {
        e.stopPropagation();
        state.togglePin(name);
      } else if (action === 'pull') {
        e.stopPropagation();
        await handleGitPull(path, env);
      } else if (action === 'push') {
        e.stopPropagation();
        await handleGitPush(path, env);
      } else if (action === 'branch-menu') {
        e.stopPropagation();
        await showBranchMenu(path, env);
      } else if (action === 'history') {
        e.stopPropagation();
        await showCommitHistoryModal(path, env);
      } else if (action === 'stash') {
        e.stopPropagation();
        await handleStash(path, env);
      }
      // Removed click-to-open functionality - now only via context menu
    });
  }

  static async handleGitPull(path: string, env: string): Promise<void> {
    try {
      await API.gitPull(path, env);
      await Renderer.loadProjects();
    } catch (error) {
      const errorMsg = String(error).replace('Error: Git pull failed: ', '');
      Toast.error(`Pull failed: ${errorMsg}`);
      console.error('Pull error:', error);
    }
  }

  static async handleGitPush(path: string, env: string): Promise<void> {
    const message = await showCommitMessageModal(path, env);
    if (!message) {
      return; // User cancelled
    }

    try {
      await API.gitPush(path, env, message);
      await Renderer.loadProjects();
    } catch (error) {
      const errorMsg = String(error).replace('Error: Git push failed: ', '');
      Toast.error(`Push failed: ${errorMsg}`);
      console.error('Push error:', error);
    }
  }

  static async openProject(path: string, env: string): Promise<void> {
    try {
      await API.openExistingProject(path, env);
    } catch (error) {
      Toast.error('Failed to open project');
    }
  }
}

async function handleGitPull(path: string, env: string): Promise<void> {
  return EventHandlers.handleGitPull(path, env);
}

async function handleGitPush(path: string, env: string): Promise<void> {
  return EventHandlers.handleGitPush(path, env);
}

async function openProject(path: string, env: string): Promise<void> {
  return EventHandlers.openProject(path, env);
}

async function showAddProjectChoiceModal(): Promise<void> {
  const modalHtml = `
    <div class="modal-overlay active" id="addProjectChoiceModal">
      <div class="modal" style="width: 500px;">
        <div class="modal-header">ADD PROJECT</div>
        <div class="modal-content">
          <div class="choice-card" id="choiceCreateNew" style="padding: 20px; background: #1a1a1a; border: 3px solid #000; margin-bottom: 12px; cursor: pointer; transition: all 0.1s;">
            <div style="display: flex; align-items: center; gap: 16px;">
              <svg width="32" height="32" viewBox="0 0 24 24" fill="none" stroke="#c94a4a" stroke-width="2">
                <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"/>
                <polyline points="14 2 14 8 20 8"/>
                <line x1="12" y1="18" x2="12" y2="12"/>
                <line x1="9" y1="15" x2="15" y2="15"/>
              </svg>
              <div>
                <div style="font-weight: 700; font-size: 14px; color: #fff; margin-bottom: 4px;">CREATE NEW</div>
                <div style="font-size: 11px; color: #888;">Start from template</div>
              </div>
            </div>
          </div>

          <div class="choice-card" id="choiceClone" style="padding: 20px; background: #1a1a1a; border: 3px solid #000; margin-bottom: 12px; cursor: pointer; transition: all 0.1s;">
            <div style="display: flex; align-items: center; gap: 16px;">
              <svg width="32" height="32" viewBox="0 0 24 24" fill="none" stroke="#4caf50" stroke-width="2">
                <circle cx="12" cy="12" r="10"/>
                <polyline points="8 12 12 16 16 12"/>
                <line x1="12" y1="8" x2="12" y2="16"/>
              </svg>
              <div>
                <div style="font-weight: 700; font-size: 14px; color: #fff; margin-bottom: 4px;">CLONE REPOSITORY</div>
                <div style="font-size: 11px; color: #888;">Clone from Git URL</div>
              </div>
            </div>
          </div>

          <div class="choice-card" id="choiceImport" style="padding: 20px; background: #1a1a1a; border: 3px solid #000; cursor: pointer; transition: all 0.1s;">
            <div style="display: flex; align-items: center; gap: 16px;">
              <svg width="32" height="32" viewBox="0 0 24 24" fill="none" stroke="#ff9800" stroke-width="2">
                <path d="M22 19a2 2 0 0 1-2 2H4a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h5l2 3h9a2 2 0 0 1 2 2z"/>
                <line x1="12" y1="11" x2="12" y2="17"/>
                <polyline points="9 14 12 17 15 14"/>
              </svg>
              <div>
                <div style="font-weight: 700; font-size: 14px; color: #fff; margin-bottom: 4px;">IMPORT EXISTING</div>
                <div style="font-size: 11px; color: #888;">Browse for existing project</div>
              </div>
            </div>
          </div>

          <div class="modal-buttons" style="margin-top: 16px;">
            <button class="btn btn-cancel" id="addProjectChoiceCancel">CANCEL</button>
          </div>
        </div>
      </div>
    </div>
  `;

  document.body.insertAdjacentHTML('beforeend', modalHtml);

  const modal = document.getElementById('addProjectChoiceModal')!;
  const cancelBtn = document.getElementById('addProjectChoiceCancel')!;
  const createCard = document.getElementById('choiceCreateNew')!;
  const cloneCard = document.getElementById('choiceClone')!;
  const importCard = document.getElementById('choiceImport')!;

  // Hover effects
  [createCard, cloneCard, importCard].forEach(card => {
    card.addEventListener('mouseenter', () => {
      card.style.transform = 'translate(-2px, -2px)';
      card.style.boxShadow = '5px 5px 0 #000';
    });
    card.addEventListener('mouseleave', () => {
      card.style.transform = '';
      card.style.boxShadow = '';
    });
  });

  cancelBtn.addEventListener('click', () => modal.remove());

  createCard.addEventListener('click', () => {
    modal.remove();
    showNewProjectModal();
  });

  cloneCard.addEventListener('click', () => {
    modal.remove();
    showCloneModal();
  });

  importCard.addEventListener('click', async () => {
    modal.remove();
    await showImportFolderDialog();
  });

  // Close on escape
  const escHandler = (e: KeyboardEvent) => {
    if (e.key === 'Escape') {
      modal.remove();
      document.removeEventListener('keydown', escHandler);
    }
  };
  document.addEventListener('keydown', escHandler);
}

async function showImportFolderDialog(): Promise<void> {
  const settings = state.getSettings();
  try {
    // Import open from Tauri dialog API
    const { open } = await import('@tauri-apps/plugin-dialog');

    // Open folder picker
    const selectedPath = await open({
      directory: true,
      multiple: false,
      title: 'Select Project Folder'
    });

    if (!selectedPath) {
      // User cancelled
      return;
    }

    // Open the selected project
    const path = typeof selectedPath === 'string' ? selectedPath : selectedPath[0];
    await API.openExistingProject(path, settings.defaultEnv);

    // Extract project name from path
    const projectName = path.split(/[\\/]/).pop() || 'project';
    Toast.success(`Imported ${projectName}!`);
    await Renderer.loadProjects();
  } catch (error) {
    const errorMsg = error instanceof Error ? error.message : String(error);
    Toast.error(errorMsg);
  }
}

async function showCloneModal(): Promise<void> {
  const settings = state.getSettings();
  const modalHtml = `
    <div class="modal-overlay active" id="cloneModal">
      <div class="modal">
        <div class="modal-header">CLONE REPOSITORY</div>
        <div class="modal-content">
          <div class="input-group">
            <label class="input-label">Repository URL</label>
            <input type="text" id="cloneRepoUrl" placeholder="https://github.com/user/repo.git" autocomplete="off">
          </div>
          <div class="input-group">
            <label class="input-label">Environment</label>
            <div class="env-toggle">
              <div class="env-option ${settings.defaultEnv === 'windows' ? 'active' : ''}" data-env="windows">WINDOWS</div>
              <div class="env-option ${settings.defaultEnv === 'wsl' ? 'active' : ''}" data-env="wsl">WSL</div>
            </div>
          </div>
          <div class="modal-buttons">
            <button class="btn btn-cancel" id="cloneCancel">CANCEL</button>
            <button class="btn btn-primary" id="cloneConfirm">CLONE</button>
          </div>
        </div>
      </div>
    </div>
  `;

  document.body.insertAdjacentHTML('beforeend', modalHtml);

  const modal = document.getElementById('cloneModal')!;
  const repoUrlInput = document.getElementById('cloneRepoUrl') as HTMLInputElement;
  const cancelBtn = document.getElementById('cloneCancel')!;
  const confirmBtn = document.getElementById('cloneConfirm')!;
  let selectedEnv = settings.defaultEnv;

  repoUrlInput.focus();

  // Env toggle
  modal.querySelectorAll('.env-option').forEach(option => {
    option.addEventListener('click', () => {
      modal.querySelectorAll('.env-option').forEach(o => o.classList.remove('active'));
      option.classList.add('active');
      selectedEnv = option.getAttribute('data-env') as 'windows' | 'wsl';
    });
  });

  cancelBtn.addEventListener('click', () => modal.remove());

  confirmBtn.addEventListener('click', async () => {
    const repoUrl = repoUrlInput.value.trim();
    if (!repoUrl) {
      Toast.error('Please enter a repository URL');
      return;
    }

    modal.remove();
    Toast.info('Cloning repository...');

    try {
      const repoName = await API.gitClone(repoUrl, selectedEnv);
      Toast.success(`Cloned ${repoName} successfully!`);
      await Renderer.loadProjects();
    } catch (error) {
      Toast.error(`Clone failed: ${error}`);
    }
  });

  repoUrlInput.addEventListener('keydown', (e) => {
    if (e.key === 'Enter') {
      confirmBtn.click();
    } else if (e.key === 'Escape') {
      modal.remove();
    }
  });
}

async function showNewProjectModal(): Promise<void> {
  const settings = state.getSettings();
  const modalHtml = `
    <div class="modal-overlay active" id="newProjectModal">
      <div class="modal">
        <div class="modal-header">NEW PROJECT</div>
        <div class="modal-content">
          <div class="input-group">
            <label class="input-label">Project Name</label>
            <input type="text" id="projectName" placeholder="my-project" autocomplete="off">
          </div>
          <div class="input-group">
            <label class="input-label">Template</label>
            <select id="projectTemplate">
              <option value="empty" ${settings.defaultTemplate === 'empty' ? 'selected' : ''}>Empty</option>
              <option value="rust" ${settings.defaultTemplate === 'rust' ? 'selected' : ''}>Rust</option>
              <option value="nextjs" ${settings.defaultTemplate === 'nextjs' ? 'selected' : ''}>Next.js</option>
              <option value="python" ${settings.defaultTemplate === 'python' ? 'selected' : ''}>Python</option>
              <option value="go" ${settings.defaultTemplate === 'go' ? 'selected' : ''}>Go</option>
              <option value="node" ${settings.defaultTemplate === 'node' ? 'selected' : ''}>Node.js</option>
            </select>
          </div>
          <div class="input-group">
            <label class="input-label">Environment</label>
            <div class="env-toggle">
              <div class="env-option ${settings.defaultEnv === 'windows' ? 'active' : ''}" data-env="windows">WINDOWS</div>
              <div class="env-option ${settings.defaultEnv === 'wsl' ? 'active' : ''}" data-env="wsl">WSL</div>
            </div>
          </div>
          <div class="input-group">
            <label style="display: flex; align-items: center; gap: 8px; cursor: pointer;">
              <input type="checkbox" id="createGithubRepo" ${settings.autoCreateGithub ? 'checked' : ''}>
              <span class="input-label" style="margin: 0; cursor: pointer;">Create GitHub Repository</span>
            </label>
          </div>
          <div class="modal-buttons">
            <button class="btn btn-cancel" id="newProjectCancel">CANCEL</button>
            <button class="btn btn-primary" id="newProjectConfirm">CREATE</button>
          </div>
        </div>
      </div>
    </div>
  `;

  document.body.insertAdjacentHTML('beforeend', modalHtml);

  const modal = document.getElementById('newProjectModal')!;
  const nameInput = document.getElementById('projectName') as HTMLInputElement;
  const templateSelect = document.getElementById('projectTemplate') as HTMLSelectElement;
  const createRepoCheckbox = document.getElementById('createGithubRepo') as HTMLInputElement;
  const cancelBtn = document.getElementById('newProjectCancel')!;
  const confirmBtn = document.getElementById('newProjectConfirm')!;
  let selectedEnv = settings.defaultEnv;

  nameInput.focus();

  // Env toggle
  modal.querySelectorAll('.env-option').forEach(option => {
    option.addEventListener('click', () => {
      modal.querySelectorAll('.env-option').forEach(o => o.classList.remove('active'));
      option.classList.add('active');
      selectedEnv = option.getAttribute('data-env') as 'windows' | 'wsl';
    });
  });

  cancelBtn.addEventListener('click', () => modal.remove());

  confirmBtn.addEventListener('click', async () => {
    const name = nameInput.value.trim();
    if (!name) {
      Toast.error('Please enter a project name');
      return;
    }

    // Check if project already exists
    const exists = await API.checkProjectExists(name, selectedEnv);
    if (exists) {
      Toast.error('Project already exists!');
      return;
    }

    modal.remove();
    Toast.info('Creating project...');

    try {
      await API.launchProject({
        env: selectedEnv,
        name,
        template: templateSelect.value,
        createRepo: createRepoCheckbox.checked,
      });
      Toast.success(`Created ${name} successfully!`);
      await Renderer.loadProjects();
    } catch (error) {
      Toast.error(`Failed to create project: ${error}`);
    }
  });

  nameInput.addEventListener('keydown', (e) => {
    if (e.key === 'Enter') {
      confirmBtn.click();
    } else if (e.key === 'Escape') {
      modal.remove();
    }
  });
}

async function showSettingsModal(): Promise<void> {
  const settings = state.getSettings();
  const isAuthenticated = state.isAuthenticated();
  const modalHtml = `
    <div class="modal-overlay active" id="settingsModal">
      <div class="modal">
        <div class="modal-header">SETTINGS</div>
        <div class="modal-content">
          <div class="input-group">
            <label class="input-label">Default Environment</label>
            <div class="env-toggle">
              <div class="env-option ${settings.defaultEnv === 'windows' ? 'active' : ''}" data-env="windows">WINDOWS</div>
              <div class="env-option ${settings.defaultEnv === 'wsl' ? 'active' : ''}" data-env="wsl">WSL</div>
            </div>
          </div>
          <div class="input-group">
            <label class="input-label">Default Template</label>
            <select id="settingsTemplate">
              <option value="empty" ${settings.defaultTemplate === 'empty' ? 'selected' : ''}>Empty</option>
              <option value="rust" ${settings.defaultTemplate === 'rust' ? 'selected' : ''}>Rust</option>
              <option value="nextjs" ${settings.defaultTemplate === 'nextjs' ? 'selected' : ''}>Next.js</option>
              <option value="python" ${settings.defaultTemplate === 'python' ? 'selected' : ''}>Python</option>
              <option value="go" ${settings.defaultTemplate === 'go' ? 'selected' : ''}>Go</option>
              <option value="node" ${settings.defaultTemplate === 'node' ? 'selected' : ''}>Node.js</option>
            </select>
          </div>
          <div class="input-group">
            <label style="display: flex; align-items: center; gap: 8px; cursor: pointer;">
              <input type="checkbox" id="settingsAutoGithub" ${settings.autoCreateGithub ? 'checked' : ''}>
              <span class="input-label" style="margin: 0; cursor: pointer;">Auto-create GitHub Repository</span>
            </label>
          </div>
          <div class="input-group">
            <label class="input-label">GitHub Authentication</label>
            <div style="display: flex; align-items: center; gap: 10px;">
              <span style="color: ${isAuthenticated ? '#4caf50' : '#666'}; font-size: 12px;">
                ${isAuthenticated ? '✓ Authenticated' : '✗ Not authenticated'}
              </span>
              ${!isAuthenticated ? '<button class="btn btn-primary" id="githubLoginBtn" style="flex: 0;">LOGIN</button>' : ''}
            </div>
          </div>
          <div class="modal-buttons">
            <button class="btn btn-cancel" id="settingsCancel">CANCEL</button>
            <button class="btn btn-primary" id="settingsSave">SAVE</button>
          </div>
        </div>
      </div>
    </div>
  `;

  document.body.insertAdjacentHTML('beforeend', modalHtml);

  const modal = document.getElementById('settingsModal')!;
  const templateSelect = document.getElementById('settingsTemplate') as HTMLSelectElement;
  const autoGithubCheckbox = document.getElementById('settingsAutoGithub') as HTMLInputElement;
  const cancelBtn = document.getElementById('settingsCancel')!;
  const saveBtn = document.getElementById('settingsSave')!;
  const githubLoginBtn = document.getElementById('githubLoginBtn');
  let selectedEnv = settings.defaultEnv;

  // Env toggle
  modal.querySelectorAll('.env-option').forEach(option => {
    option.addEventListener('click', () => {
      modal.querySelectorAll('.env-option').forEach(o => o.classList.remove('active'));
      option.classList.add('active');
      selectedEnv = option.getAttribute('data-env') as 'windows' | 'wsl';
    });
  });

  // GitHub login button
  if (githubLoginBtn) {
    githubLoginBtn.addEventListener('click', async () => {
      try {
        await API.githubLogin();
        modal.remove();
      } catch (error) {
        Toast.error('Failed to open GitHub login');
      }
    });
  }

  cancelBtn.addEventListener('click', () => modal.remove());

  saveBtn.addEventListener('click', async () => {
    const oldEnv = state.getSettings().defaultEnv;

    state.setSettings({
      defaultEnv: selectedEnv,
      defaultTemplate: templateSelect.value as any,
      autoCreateGithub: autoGithubCheckbox.checked,
    });

    modal.remove();

    // If environment changed, show loading and reload projects
    if (oldEnv !== selectedEnv) {
      // Clear current projects immediately and show loading
      state.setProjects([]);
      const recentGrid = document.getElementById('recentProjects')!;
      const pinnedSection = document.getElementById('pinnedSection')!;
      pinnedSection.style.display = 'none';
      recentGrid.innerHTML = `
        <div class="loading-state">
          <div class="loading-spinner"></div>
          <div style="margin-top: 12px; color: #888;">Switching to ${selectedEnv.toUpperCase()}...</div>
        </div>
      `;

      await Renderer.loadProjects();
    }
  });

  // Close on Escape
  modal.addEventListener('keydown', (e) => {
    if (e.key === 'Escape') {
      modal.remove();
    }
  });
}

async function showCommitMessageModal(path: string, env: string): Promise<string | null> {
  return new Promise(async (resolve) => {
    // Get diff to show what's being committed
    let diffPreview = '';
    try {
      const diff = await API.getDiff(path, env);
      if (diff && diff.trim()) {
        const lines = diff.split('\n').slice(0, 20); // Show first 20 lines
        diffPreview = `
          <div class="input-group">
            <label class="input-label">Changes to be committed (preview)</label>
            <pre style="background: #0f0f0f; padding: 10px; border: 2px solid #000; font-size: 11px; max-height: 150px; overflow-y: auto; color: #ddd;">${lines.join('\n')}${diff.split('\n').length > 20 ? '\n\n... (truncated)' : ''}</pre>
          </div>
        `;
      }
    } catch (e) {
      console.error('Failed to get diff:', e);
    }

    const modalHtml = `
      <div class="modal-overlay active" id="commitModal">
        <div class="modal">
          <div class="modal-header">COMMIT & PUSH</div>
          <div class="modal-content">
            ${diffPreview}
            <div class="input-group">
              <label class="input-label">Commit message</label>
              <input type="text" id="commitMessageInput" placeholder="Update" value="Update" autocomplete="off">
            </div>
            <div class="modal-buttons">
              <button class="btn btn-cancel" id="commitCancel">CANCEL</button>
              <button class="btn btn-primary" id="commitConfirm">PUSH</button>
            </div>
          </div>
        </div>
      </div>
    `;

    document.body.insertAdjacentHTML('beforeend', modalHtml);

    const modal = document.getElementById('commitModal')!;
    const input = document.getElementById('commitMessageInput') as HTMLInputElement;
    const cancelBtn = document.getElementById('commitCancel')!;
    const confirmBtn = document.getElementById('commitConfirm')!;

    input.focus();
    input.select();

    const cleanup = () => {
      modal.remove();
    };

    cancelBtn.addEventListener('click', () => {
      cleanup();
      resolve(null);
    });

    confirmBtn.addEventListener('click', () => {
      const message = input.value.trim();
      if (!message) {
        Toast.error('Commit message cannot be empty');
        return;
      }
      cleanup();
      resolve(message);
    });

    input.addEventListener('keydown', (e) => {
      if (e.key === 'Enter') {
        confirmBtn.click();
      } else if (e.key === 'Escape') {
        cancelBtn.click();
      }
    });
  });
}

async function showBranchMenu(path: string, env: string): Promise<void> {
  try {
    const branches = await API.getBranches(path, env);
    const currentBranch = branches.find(b => b.startsWith('* '))?.substring(2) || branches[0];

    const modalHtml = `
      <div class="modal-overlay active" id="branchModal">
        <div class="modal">
          <div class="modal-header">SWITCH BRANCH</div>
          <div class="modal-content">
            <div class="input-group">
              <label class="input-label">Select a branch</label>
              <select id="branchSelect" style="width: 100%; padding: 10px; background: #1a1a1a; color: #ddd; border: 3px solid #000; font-size: 13px;">
                ${branches.map(branch => {
                  const branchName = branch.trim().replace('* ', '');
                  const isActive = branch.startsWith('* ');
                  return `<option value="${branchName}" ${isActive ? 'selected' : ''}>${branchName}${isActive ? ' (current)' : ''}</option>`;
                }).join('')}
              </select>
            </div>
            <div style="margin: 10px 0; text-align: center; color: #888; font-size: 12px;">OR</div>
            <div class="input-group">
              <label class="input-label">Create new branch</label>
              <input type="text" id="newBranchInput" placeholder="feature/my-branch" autocomplete="off">
            </div>
            <div class="modal-buttons">
              <button class="btn btn-cancel" id="branchCancel">CANCEL</button>
              <button class="btn" id="createBranchBtn">CREATE</button>
              <button class="btn btn-primary" id="switchBranchBtn">SWITCH</button>
            </div>
          </div>
        </div>
      </div>
    `;

    document.body.insertAdjacentHTML('beforeend', modalHtml);

    const modal = document.getElementById('branchModal')!;
    const select = document.getElementById('branchSelect') as HTMLSelectElement;
    const newBranchInput = document.getElementById('newBranchInput') as HTMLInputElement;
    const cancelBtn = document.getElementById('branchCancel')!;
    const switchBtn = document.getElementById('switchBranchBtn')!;
    const createBtn = document.getElementById('createBranchBtn')!;

    cancelBtn.addEventListener('click', () => modal.remove());

    switchBtn.addEventListener('click', async () => {
      const selectedBranch = select.value;
      if (selectedBranch === currentBranch) {
        modal.remove();
        return;
      }

      modal.remove();

      try {
        await API.switchBranch(path, env, selectedBranch);
        await Renderer.loadProjects();
      } catch (error) {
        Toast.error(`Failed to switch branch: ${error}`);
      }
    });

    createBtn.addEventListener('click', async () => {
      const branchName = newBranchInput.value.trim();
      if (!branchName) {
        Toast.error('Branch name cannot be empty');
        return;
      }

      modal.remove();

      try {
        await API.createBranch(path, env, branchName);
        await Renderer.loadProjects();
      } catch (error) {
        Toast.error(`Failed to create branch: ${error}`);
      }
    });
  } catch (error) {
    Toast.error(`Failed to load branches: ${error}`);
  }
}

async function showCommitHistoryModal(path: string, env: string): Promise<void> {
  let commits: any[] = [];
  let errorMessage = '';

  try {
    commits = await API.getCommitHistory(path, env, 20);
  } catch (error) {
    console.error('Failed to load commit history:', error);
    const errorStr = String(error);

    // Provide user-friendly error messages
    if (errorStr.includes('not a git repository') || errorStr.includes('does not have any commits')) {
      errorMessage = 'This project has no commits yet. Make some changes and commit them first!';
    } else if (errorStr.includes('Failed to execute git log')) {
      errorMessage = 'Git is not available or not installed on your system.';
    } else {
      errorMessage = 'Unable to load commit history. This might be a new repository with no commits.';
    }
  }

  const modalHtml = `
    <div class="modal-overlay active" id="historyModal">
      <div class="modal" style="width: 600px; max-width: 95%;">
        <div class="modal-header">COMMIT HISTORY</div>
        <div class="modal-content">
          <div style="max-height: 400px; overflow-y: auto;">
            ${errorMessage ? `
              <div style="text-align: center; padding: 40px;">
                <div style="font-size: 48px; margin-bottom: 16px;">📝</div>
                <div style="color: #888; font-size: 14px; line-height: 1.6;">
                  ${errorMessage}
                </div>
              </div>
            ` : commits.length > 0 ? commits.map(commit => {
              const date = new Date(commit.timestamp * 1000);
              const timeAgo = formatTimeAgo(commit.timestamp);
              return `
                <div style="padding: 12px; border-bottom: 2px solid #000; background: #1a1a1a; margin-bottom: 8px;">
                  <div style="font-size: 13px; font-weight: 700; color: #fff; margin-bottom: 4px;">
                    ${commit.message}
                  </div>
                  <div style="font-size: 11px; color: #888;">
                    <span style="color: #c94a4a;">${commit.hash.substring(0, 7)}</span>
                    by ${commit.author} • ${timeAgo}
                  </div>
                </div>
              `;
            }).join('') : `
              <div style="text-align: center; padding: 40px;">
                <div style="font-size: 48px; margin-bottom: 16px;">📝</div>
                <div style="color: #888; font-size: 14px;">
                  No commits found in this repository.
                </div>
              </div>
            `}
          </div>
          <div class="modal-buttons">
            <button class="btn btn-primary" id="historyClose">CLOSE</button>
          </div>
        </div>
      </div>
    </div>
  `;

  document.body.insertAdjacentHTML('beforeend', modalHtml);

  const modal = document.getElementById('historyModal')!;
  const closeBtn = document.getElementById('historyClose')!;

  closeBtn.addEventListener('click', () => modal.remove());

  modal.addEventListener('keydown', (e) => {
    if (e.key === 'Escape') {
      modal.remove();
    }
  });
}

async function handleStash(path: string, env: string): Promise<void> {
  // Check if there are changes to stash
  const modalHtml = `
    <div class="modal-overlay active" id="stashModal">
      <div class="modal">
        <div class="modal-header">STASH OPTIONS</div>
        <div class="modal-content">
          <div style="margin-bottom: 16px; color: #ddd; font-size: 13px;">
            Choose an action for your changes:
          </div>
          <div class="modal-buttons">
            <button class="btn btn-cancel" id="stashCancel">CANCEL</button>
            <button class="btn btn-primary" id="stashSave">STASH CHANGES</button>
            <button class="btn" id="stashPop">RESTORE STASH</button>
          </div>
        </div>
      </div>
    </div>
  `;

  document.body.insertAdjacentHTML('beforeend', modalHtml);

  const modal = document.getElementById('stashModal')!;
  const cancelBtn = document.getElementById('stashCancel')!;
  const saveBtn = document.getElementById('stashSave')!;
  const popBtn = document.getElementById('stashPop')!;

  cancelBtn.addEventListener('click', () => modal.remove());

  saveBtn.addEventListener('click', async () => {
    modal.remove();
    Toast.info('Stashing changes...');

    try {
      const result = await API.gitStash(path, env);
      Toast.success(result);
      await Renderer.loadProjects();
    } catch (error) {
      Toast.error(`${error}`);
    }
  });

  popBtn.addEventListener('click', async () => {
    modal.remove();
    Toast.info('Restoring stashed changes...');

    try {
      const result = await API.gitStashPop(path, env);
      Toast.success(result);
      await Renderer.loadProjects();
    } catch (error) {
      Toast.error(`${error}`);
    }
  });
}

function formatTimeAgo(timestamp: number): string {
  const now = Math.floor(Date.now() / 1000);
  const diff = now - timestamp;

  if (diff < 60) return 'just now';
  if (diff < 3600) return `${Math.floor(diff / 60)}m ago`;
  if (diff < 86400) return `${Math.floor(diff / 3600)}h ago`;
  if (diff < 604800) return `${Math.floor(diff / 86400)}d ago`;
  if (diff < 2592000) return `${Math.floor(diff / 604800)}w ago`;
  return `${Math.floor(diff / 2592000)}mo ago`;
}

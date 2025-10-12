import { Project } from '../types';

export function formatTime(lastOpened: number): string {
  if (lastOpened === 0) return 'unknown';

  const now = Math.floor(Date.now() / 1000);
  const diff = now - lastOpened;

  if (diff < 60) return 'just now';
  if (diff < 3600) return `${Math.floor(diff / 60)}m ago`;
  if (diff < 86400) return `${Math.floor(diff / 3600)}h ago`;
  if (diff < 604800) return `${Math.floor(diff / 86400)}d ago`;
  return `${Math.floor(diff / 604800)}w ago`;
}

export function renderProjectCard(project: Project): string {
  const git = project.git_status;
  const hasGit = git && git.branch;
  const statusClass = hasGit ? (git.is_clean ? 'clean' : 'dirty') : '';
  const statusIcon = hasGit ? (git.is_clean ? '✓' : '●') : '';

  let commitsText = '';
  if (hasGit && (git.commits_ahead > 0 || git.commits_behind > 0)) {
    const parts: string[] = [];
    if (git.commits_ahead > 0) parts.push(`⬆${git.commits_ahead}`);
    if (git.commits_behind > 0) parts.push(`⬇${git.commits_behind}`);
    commitsText = `<span class="git-commits">${parts.join(' ')}</span>`;
  }

  const env = project.path.startsWith('/') ? 'wsl' : 'windows';

  return `
    <div class="project-card ${project.is_pinned ? 'pinned' : ''}"
         draggable="true"
         data-name="${project.name}"
         data-path="${project.path}"
         data-env="${env}">
      <div class="project-header">
        <div class="project-name">${project.name}</div>
        <button class="pin-btn ${project.is_pinned ? 'pinned' : ''}" data-action="pin">
          ${project.is_pinned ? 'PINNED' : 'PIN'}
        </button>
      </div>
      <div class="project-body">
        ${hasGit ? `
          <div class="git-status">
            <div class="git-branch ${statusClass}" data-action="branch-menu" style="cursor: pointer;" title="Click to switch branches">
              ${statusIcon} ${git.branch} ▼
            </div>
            ${commitsText}
          </div>
        ` : `
          <div class="git-status git-loading">
            <div class="git-branch">Loading...</div>
          </div>
        `}
        <div class="project-path">${project.path}</div>
        <div class="project-time">${formatTime(project.last_opened)}</div>
        <div class="project-actions">
          ${hasGit ? `
            <button class="action-btn" data-action="history" title="View commit history">
              HISTORY
            </button>
            <button class="action-btn" data-action="stash" title="Stash changes">
              STASH
            </button>
            <button class="action-btn pull" data-action="pull" ${git.commits_behind === 0 ? 'disabled' : ''}>
              PULL
            </button>
            <button class="action-btn push" data-action="push" ${git.is_clean && git.commits_ahead === 0 ? 'disabled' : ''}>
              PUSH
            </button>
          ` : ''}
        </div>
      </div>
    </div>
  `;
}

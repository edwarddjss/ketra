import { state } from '../state';
import { renderProjectCard } from './cards';
import { API } from '../api';
import { Toast } from './toast';

export class Renderer {
  private static gitStatusCache = new Map<string, any>();

  static render(): void {
    const projects = state.getProjects();
    const pinnedSet = state.getPinnedProjects();
    const order = state.getProjectOrder();

    // Apply pinned state
    projects.forEach(p => p.is_pinned = pinnedSet.has(p.name));

    // Sort by order
    const sortedProjects = [...projects].sort((a, b) => {
      const indexA = order.indexOf(a.name);
      const indexB = order.indexOf(b.name);
      if (indexA === -1 && indexB === -1) return 0;
      if (indexA === -1) return 1;
      if (indexB === -1) return -1;
      return indexA - indexB;
    });

    const pinned = sortedProjects.filter(p => p.is_pinned);
    const regular = sortedProjects.filter(p => !p.is_pinned);

    const pinnedSection = document.getElementById('pinnedSection')!;
    const pinnedGrid = document.getElementById('pinnedProjects')!;
    const recentGrid = document.getElementById('recentProjects')!;

    pinnedSection.style.display = pinned.length > 0 ? 'block' : 'none';
    if (pinned.length > 0) {
      pinnedGrid.innerHTML = pinned.map(p => renderProjectCard(p)).join('');
    }

    if (regular.length > 0) {
      recentGrid.innerHTML = regular.map(p => renderProjectCard(p)).join('');
    } else {
      recentGrid.innerHTML = projects.length === 0
        ? '<div class="empty-state">No projects found. Click "+ NEW" to create one!</div>'
        : '<div class="empty-state">All projects are pinned!</div>';
    }
  }

  static async loadProjects(): Promise<void> {
    try {
      const activeEnv = state.getActiveEnv();

      if (activeEnv === 'windows') {
        // INSTANT: Load Windows projects only
        const windowsProjects = await API.getProjectsFast();
        state.setProjects(windowsProjects);
        Renderer.loadGitStatusBatch(windowsProjects);
      } else {
        // Load WSL projects only
        const wslProjects = await API.scanWslProjects();
        state.setProjects(wslProjects);
        Renderer.loadGitStatusBatch(wslProjects);
      }
    } catch (error) {
      console.error('Failed to load projects:', error);
      Toast.error('Failed to load projects');
      const recentGrid = document.getElementById('recentProjects')!;
      recentGrid.innerHTML = '<div class="empty-state">Failed to load projects. Please restart the app.</div>';
    }
  }

  private static async loadGitStatusBatch(projects: any[]): Promise<void> {
    // Load ALL git statuses in parallel (fast!)
    const results = await Promise.allSettled(
      projects.map(p => API.getProjectGitStatus(p.path))
    );

    // Update projects with git status
    const currentProjects = state.getProjects();
    let updated = false;

    results.forEach((result, index) => {
      if (result.status === 'fulfilled' && result.value) {
        const project = projects[index];
        const projectIndex = currentProjects.findIndex(p => p.path === project.path);
        if (projectIndex !== -1) {
          currentProjects[projectIndex].git_status = result.value;
          this.gitStatusCache.set(project.path, result.value);
          updated = true;
        }
      }
    });

    // Single re-render after all updates
    if (updated) {
      state.setProjects([...currentProjects]);
    }
  }
}

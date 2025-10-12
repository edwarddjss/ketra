import { state } from './ts/state';
import { Toast } from './ts/ui/toast';
import { Renderer } from './ts/ui/renderer';
import { EventHandlers } from './ts/ui/events';
import { DragHandler } from './ts/drag/dragHandler';
import { TrashZone } from './ts/drag/trashZone';
import { ContextMenu } from './ts/ui/contextMenu';
import { AppContextMenu } from './ts/ui/appContextMenu';
import { ContextMenuManager } from './ts/ui/contextMenuManager';
import { API } from './ts/api';

async function init() {
  // Initialize UI components
  Toast.init();

  // Setup event handlers
  EventHandlers.setupWindowControls();
  EventHandlers.setupCardActions();
  EventHandlers.setupFabButtons();
  setupSearch();

  // Setup drag and drop
  DragHandler.init();
  TrashZone.init();

  // Setup context menus (manager must be initialized first)
  ContextMenuManager.init();
  ContextMenu.init();
  AppContextMenu.init();

  // Subscribe to state changes
  state.subscribe(() => {
    Renderer.render();
  });

  // Load initial data
  await Renderer.loadProjects();

  // Check GitHub authentication
  try {
    const username = await API.checkGithubAuth();
    state.setAuthenticated(!!username);
  } catch {
    state.setAuthenticated(false);
  }

  console.log('App initialized');
}

function setupSearch() {
  const searchInput = document.getElementById('searchInput') as HTMLInputElement;
  searchInput?.addEventListener('input', (e) => {
    const query = (e.target as HTMLInputElement).value.toLowerCase();
    filterProjects(query);
  });
}

function filterProjects(query: string) {
  const pinnedCards = document.querySelectorAll('#pinnedProjects .project-card');
  const recentCards = document.querySelectorAll('#recentProjects .project-card');

  [...pinnedCards, ...recentCards].forEach(card => {
    const projectName = card.querySelector('.project-name')?.textContent?.toLowerCase() || '';
    const projectPath = card.querySelector('.project-path')?.textContent?.toLowerCase() || '';

    if (projectName.includes(query) || projectPath.includes(query)) {
      (card as HTMLElement).style.display = '';
    } else {
      (card as HTMLElement).style.display = 'none';
    }
  });
}

// Wait for DOM to be ready
if (document.readyState === 'loading') {
  document.addEventListener('DOMContentLoaded', init);
} else {
  init();
}

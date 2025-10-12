/**
 * ContextMenuManager - Single source of truth for all context menus
 *
 * Benefits:
 * - Ensures only one menu is visible at a time
 * - Decouples menu classes from each other
 * - Easy to add new menus without modifying existing ones
 * - Centralized hiding logic
 */
export class ContextMenuManager {
  private static activeMenu: HTMLElement | null = null;

  /**
   * Show a context menu and automatically hide any other active menu
   */
  static show(menuId: string, x: number, y: number): void {
    // Hide any currently active menu
    this.hideAll();

    const menu = document.getElementById(menuId);
    if (!menu) return;

    menu.style.display = 'block';
    menu.style.left = `${x}px`;
    menu.style.top = `${y}px`;

    // Adjust if menu goes off screen
    const rect = menu.getBoundingClientRect();
    if (rect.right > window.innerWidth) {
      menu.style.left = `${window.innerWidth - rect.width - 10}px`;
    }
    if (rect.bottom > window.innerHeight) {
      menu.style.top = `${window.innerHeight - rect.height - 10}px`;
    }

    this.activeMenu = menu;
  }

  /**
   * Hide a specific menu by ID
   */
  static hide(menuId: string): void {
    const menu = document.getElementById(menuId);
    if (menu) {
      menu.style.display = 'none';
      if (this.activeMenu === menu) {
        this.activeMenu = null;
      }
    }
  }

  /**
   * Hide all context menus
   */
  static hideAll(): void {
    // Hide the active menu if there is one
    if (this.activeMenu) {
      this.activeMenu.style.display = 'none';
      this.activeMenu = null;
    }

    // Failsafe: Hide all known context menus
    const menuIds = ['contextMenu', 'appContextMenu'];
    menuIds.forEach(id => {
      const menu = document.getElementById(id);
      if (menu) {
        menu.style.display = 'none';
      }
    });
  }

  /**
   * Initialize global click handler to close menus when clicking outside
   */
  static init(): void {
    document.addEventListener('click', (e) => {
      const target = e.target as HTMLElement;

      // If clicking outside any context menu, hide all
      if (this.activeMenu && !this.activeMenu.contains(target)) {
        this.hideAll();
      }
    });
  }
}

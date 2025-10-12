import { state } from '../state';

export class DragHandler {
  private static isInitialized = false;

  static init(): void {
    if (this.isInitialized) return;

    const content = document.querySelector('.content');
    if (!content) return;

    // Dragstart
    document.addEventListener('dragstart', (e) => {
      const card = (e.target as HTMLElement).closest('.project-card') as HTMLElement;
      if (!card) return;

      const name = card.dataset.name!;
      const path = card.dataset.path!;

      card.classList.add('dragging');
      e.dataTransfer!.effectAllowed = 'move';
      e.dataTransfer!.setData('text/plain', JSON.stringify({ name, path }));

      const trashZone = document.getElementById('trashZone');
      trashZone?.classList.add('visible');
      content.classList.add('dragging-active');
    });

    // Dragend
    document.addEventListener('dragend', (e) => {
      const card = (e.target as HTMLElement).closest('.project-card');
      if (!card) return;

      // Small delay to ensure all events are processed
      setTimeout(() => {
        card.classList.remove('dragging');

        const trashZone = document.getElementById('trashZone');
        trashZone?.classList.remove('visible', 'drag-over');
        content.classList.remove('dragging-active');

        document.querySelectorAll('.project-card').forEach(c => {
          c.classList.remove('drag-over');
        });
      }, 10);
    });

    // Dragover
    document.addEventListener('dragover', (e) => {
      const card = (e.target as HTMLElement).closest('.project-card') as HTMLElement;
      const trashZone = (e.target as HTMLElement).closest('#trashZone');

      if (card) {
        e.preventDefault();
        e.dataTransfer!.dropEffect = 'move';

        const draggingCard = document.querySelector('.dragging');
        if (draggingCard && draggingCard !== card) {
          document.querySelectorAll('.project-card').forEach(c => {
            c.classList.remove('drag-over');
          });
          card.classList.add('drag-over');
        }
      } else if (trashZone) {
        e.preventDefault();
      } else if (document.querySelector('.dragging')) {
        e.preventDefault();
        e.dataTransfer!.dropEffect = 'none';
      }
    });

    // Drop
    document.addEventListener('drop', (e) => {
      const card = (e.target as HTMLElement).closest('.project-card') as HTMLElement;
      if (card) {
        e.preventDefault();
        e.stopPropagation();

        const draggingCard = document.querySelector('.dragging');
        if (draggingCard && draggingCard !== card) {
          const data = JSON.parse(e.dataTransfer!.getData('text/plain'));
          this.reorderProjects(data.name, card.dataset.name!);
        }

        card.classList.remove('drag-over');
      }
    });

    this.isInitialized = true;
  }

  private static reorderProjects(draggedName: string, targetName: string): void {
    const currentOrder = state.getProjects().map(p => p.name);

    const draggedIndex = currentOrder.indexOf(draggedName);
    const targetIndex = currentOrder.indexOf(targetName);

    if (draggedIndex === -1 || targetIndex === -1) return;
    if (draggedIndex === targetIndex) return;

    // Remove dragged item from its current position
    currentOrder.splice(draggedIndex, 1);

    // Find where to insert it
    // After removing, we need to find the target's new index
    const newTargetIndex = currentOrder.indexOf(targetName);

    // Insert at the target's position (this will push target to the right)
    currentOrder.splice(newTargetIndex, 0, draggedName);

    state.setProjectOrder(currentOrder);
  }
}

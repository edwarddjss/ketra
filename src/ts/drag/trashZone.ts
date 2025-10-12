import { confirmDeleteProject } from '../ui/deleteModal';

export class TrashZone {
  static init(): void {
    const trashZone = document.getElementById('trashZone');
    if (!trashZone) return;

    trashZone.ondragover = (e) => {
      e.preventDefault();
      e.dataTransfer!.dropEffect = 'move';
      trashZone.classList.add('drag-over');
    };

    trashZone.ondragleave = () => {
      trashZone.classList.remove('drag-over');
    };

    trashZone.ondrop = (e) => {
      e.preventDefault();
      trashZone.classList.remove('drag-over', 'visible');

      const content = document.querySelector('.content');
      content?.classList.remove('dragging-active');

      const data = JSON.parse(e.dataTransfer!.getData('text/plain'));
      confirmDeleteProject(data.name, data.path);
    };
  }
}

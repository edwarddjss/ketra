import { ToastType } from '../types';

export class Toast {
  private static container: HTMLElement | null = null;

  static init(): void {
    this.container = document.getElementById('toastContainer');
  }

  static show(message: string, type: ToastType = 'info', duration: number = 3000): void {
    if (!this.container) {
      console.error('Toast container not initialized');
      return;
    }

    const toast = document.createElement('div');
    toast.className = `toast ${type}`;
    toast.textContent = message;

    this.container.appendChild(toast);

    // Trigger animation
    setTimeout(() => toast.classList.add('show'), 10);

    // Remove after duration
    setTimeout(() => {
      toast.classList.remove('show');
      setTimeout(() => toast.remove(), 300);
    }, duration);
  }

  static success(message: string, duration?: number): void {
    this.show(message, 'success', duration);
  }

  static error(message: string, duration?: number): void {
    this.show(message, 'error', duration);
  }

  static info(message: string, duration?: number): void {
    this.show(message, 'info', duration);
  }
}

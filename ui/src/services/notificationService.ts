export const notificationService = {
  async show(title: string, body: string, options?: { icon?: string; silent?: boolean }): Promise<void> {
    if (window.electronAPI) {
      await window.electronAPI.notification.show({
        title,
        body,
        icon: options?.icon,
        silent: options?.silent,
      });
    } else {
      // Fallback to browser notifications
      if ('Notification' in window && Notification.permission === 'granted') {
        new Notification(title, { body, ...options });
      }
    }
  },

  async downloadComplete(filename: string): Promise<void> {
    if (window.electronAPI) {
      await window.electronAPI.notification.downloadComplete(filename);
    } else {
      await this.show('Download Complete', `${filename} has been downloaded successfully.`);
    }
  },

  async downloadFailed(filename: string, error: string): Promise<void> {
    if (window.electronAPI) {
      await window.electronAPI.notification.downloadFailed(filename, error);
    } else {
      await this.show('Download Failed', `${filename} failed to download: ${error}`);
    }
  },

  async downloadScheduled(filename: string, scheduledTime: string): Promise<void> {
    if (window.electronAPI) {
      await window.electronAPI.notification.downloadScheduled(filename, scheduledTime);
    } else {
      await this.show('Download Scheduled', `${filename} has been scheduled for ${scheduledTime}.`);
    }
  },

  async downloadStarted(filename: string): Promise<void> {
    if (window.electronAPI) {
      await window.electronAPI.notification.downloadStarted(filename);
    } else {
      await this.show('Download Started', `${filename} download has started.`);
    }
  },

  async requestPermission(): Promise<NotificationPermission> {
    if ('Notification' in window) {
      return await Notification.requestPermission();
    }
    return 'denied';
  },
};

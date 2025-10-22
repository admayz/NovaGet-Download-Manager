import { Notification } from 'electron';

export interface NotificationOptions {
  title: string;
  body: string;
  icon?: string;
  silent?: boolean;
}

export function showNotification(options: NotificationOptions) {
  const notification = new Notification({
    title: options.title,
    body: options.body,
    icon: options.icon,
    silent: options.silent || false,
  });

  notification.show();
  
  return notification;
}

export function showDownloadCompleteNotification(filename: string) {
  return showNotification({
    title: 'Download Complete',
    body: `${filename} has been downloaded successfully.`,
  });
}

export function showDownloadFailedNotification(filename: string, error: string) {
  return showNotification({
    title: 'Download Failed',
    body: `${filename} failed to download: ${error}`,
  });
}

export function showDownloadScheduledNotification(filename: string, scheduledTime: string) {
  return showNotification({
    title: 'Download Scheduled',
    body: `${filename} has been scheduled for ${scheduledTime}.`,
  });
}

export function showDownloadStartedNotification(filename: string) {
  return showNotification({
    title: 'Download Started',
    body: `${filename} download has started.`,
  });
}

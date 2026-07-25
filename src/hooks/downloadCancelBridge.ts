/** Module bridge: snackbar sits above DownloadContext. */

let cancelHandler: (() => void) | null = null;

export function setDownloadCancelHandler(handler: (() => void) | null): void {
  cancelHandler = handler;
}

export function cancelActiveDownload(): void {
  cancelHandler?.();
}

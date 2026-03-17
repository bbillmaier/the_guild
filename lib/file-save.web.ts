/**
 * Web / Electron file-save implementation.
 *
 * - In Electron: delegates to the main process via window.electronAPI.fs.saveImage
 *   which downloads the image and writes it to the userData directory.
 * - In a plain browser: returns the remote URL as-is (image stays on the server).
 */

const isElectron = typeof window !== 'undefined' && !!(window as { electronAPI?: unknown }).electronAPI;

export async function saveImageToFolder(
  imageUrl: string,
  subfolder: string,
  filename: string,
): Promise<string> {
  if (isElectron) {
    const api = (window as { electronAPI: { fs: { saveImage: (url: string, subfolder: string, filename: string) => Promise<string> } } }).electronAPI;
    return api.fs.saveImage(imageUrl, subfolder, filename);
  }
  // Browser fallback — keep the remote URL
  return imageUrl;
}

import * as FileSystem from 'expo-file-system';

/**
 * Download an image from a URL and save it to a local folder.
 * Returns the local file path.
 */
export async function saveImageToFolder(
  imageUrl: string,
  subfolder: string,
  filename: string,
): Promise<string> {
  const dir = `${FileSystem.documentDirectory}${subfolder}/`;
  const info = await FileSystem.getInfoAsync(dir);
  if (!info.exists) {
    await FileSystem.makeDirectoryAsync(dir, { intermediates: true });
  }
  const localPath = `${dir}${filename}`;
  await FileSystem.downloadAsync(imageUrl, localPath);
  return localPath;
}

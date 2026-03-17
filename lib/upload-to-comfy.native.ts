import * as FileSystem from 'expo-file-system';

/** Read a local image file and return its base64-encoded contents. */
export async function readAvatarBase64(localPath: string): Promise<string> {
  return FileSystem.readAsStringAsync(localPath, {
    encoding: FileSystem.EncodingType.Base64,
  });
}

/**
 * Web: the avatar is stored as a remote URL (no local filesystem).
 * Fetch it and convert to base64 so it can be injected into the workflow.
 */
export async function readAvatarBase64(avatarPath: string): Promise<string> {
  if (!avatarPath) return '';
  const res = await fetch(avatarPath);
  if (!res.ok) throw new Error(`Failed to fetch avatar for base64 conversion: ${res.status}`);
  const buffer = await res.arrayBuffer();
  const bytes = new Uint8Array(buffer);
  let binary = '';
  for (let i = 0; i < bytes.length; i++) {
    binary += String.fromCharCode(bytes[i]);
  }
  return btoa(binary);
}

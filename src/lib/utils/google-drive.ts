/**
 * Generate a Google Drive image URL for preview/embedding
 * This is a client-safe utility that doesn't require Node.js dependencies
 * Uses a server-side proxy endpoint for reliable image access
 * @param fileId The Google Drive file ID
 * @returns The image URL that can be used in img src
 */
export function getDriveThumbnailUrl(fileId: string): string {
  // Use server-side proxy endpoint for reliable access
  // This handles authentication and gets the actual thumbnail from Google Drive API
  return `/api/attachments/${fileId}/thumbnail`;
}

/**
 * Generate a Google Drive full-size image URL
 * This is a client-safe utility that doesn't require Node.js dependencies
 * Uses a server-side proxy endpoint for full-size image access
 * @param fileId The Google Drive file ID
 * @returns The full-size image URL that can be used in img src
 */
export function getDriveFullImageUrl(fileId: string): string {
  // Use server-side proxy endpoint for full-size images
  // This handles authentication and gets the full-size image from Google Drive API
  return `/api/attachments/${fileId}/image`;
}


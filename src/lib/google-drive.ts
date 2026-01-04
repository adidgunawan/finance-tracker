import { google } from "googleapis";
import { Readable } from "stream";
import { getDriveClientForUser, getUserDriveTokens } from "./google-drive-oauth";

interface DriveFileMetadata {
  driveFileId: string;
  driveWebViewLink: string;
  driveDownloadLink: string;
}

/**
 * Get or create a folder in Google Drive
 */
async function getOrCreateFolder(
  drive: ReturnType<typeof google.drive>,
  parentFolderId: string | null,
  folderName: string
): Promise<string> {
  try {
    // Search for existing folder only if we have a parent
    if (parentFolderId) {
      const query = `name='${folderName.replace(/'/g, "\\'")}' and mimeType='application/vnd.google-apps.folder' and trashed=false and '${parentFolderId}' in parents`;
      
      try {
        const response = await drive.files.list({
          q: query,
          fields: "files(id, name)",
        });

        if (response.data.files && response.data.files.length > 0) {
          return response.data.files[0].id!;
        }
      } catch (queryError: any) {
        // If query fails (e.g., parent doesn't exist), continue to create
        console.warn(`Query failed for folder "${folderName}", will create new folder:`, queryError.message);
      }
    } else {
      // For root, try to find folder
      const query = `name='${folderName.replace(/'/g, "\\'")}' and mimeType='application/vnd.google-apps.folder' and trashed=false and 'root' in parents`;
      
      try {
        const response = await drive.files.list({
          q: query,
          fields: "files(id, name)",
        });

        if (response.data.files && response.data.files.length > 0) {
          return response.data.files[0].id!;
        }
      } catch (queryError: any) {
        // If query fails, continue to create
        console.warn(`Query failed for root folder "${folderName}", will create new folder:`, queryError.message);
      }
    }

    // Create folder if it doesn't exist
    const folderMetadata: any = {
      name: folderName,
      mimeType: "application/vnd.google-apps.folder",
    };

    // Set parents - if parentFolderId is null, omit parents to create in root
    if (parentFolderId) {
      folderMetadata.parents = [parentFolderId];
    }
    // If parentFolderId is null, don't set parents - this creates in root

    const folder = await drive.files.create({
      requestBody: folderMetadata,
      fields: "id, name",
    });

    if (!folder.data.id) {
      throw new Error("Failed to create folder: no ID returned");
    }

    // Verify the folder was created successfully
    try {
      const createdFolder = await drive.files.get({
        fileId: folder.data.id,
        fields: "id, name",
      });
      console.log(`Successfully created/verified folder: ${createdFolder.data.name} (${createdFolder.data.id})`);
    } catch (verifyError: any) {
      console.warn(`Warning: Created folder but cannot verify access:`, verifyError.message);
    }

    return folder.data.id;
  } catch (error: any) {
    console.error(`Error in getOrCreateFolder for "${folderName}":`, error);
    throw new Error(`Failed to get or create folder "${folderName}": ${error.message}`);
  }
}

/**
 * Create user-specific folder structure in their Google Drive
 * Returns the user folder ID (Finance Tracker/{userId})
 * Simplified structure for better performance
 */
export async function createUserFolder(userId: string): Promise<string> {
  const drive = await getDriveClientForUser(userId);

  // Create simplified folder structure: Finance Tracker/{userId}
  // Start from root (user's Drive root)
  let currentFolderId: string | null = null;

  // Create "Finance Tracker" folder in user's root
  const financeTrackerFolderId = await getOrCreateFolder(
    drive,
    currentFolderId,
    "Finance Tracker"
  );

  // Create user-specific folder directly under Finance Tracker
  const userFolderId = await getOrCreateFolder(drive, financeTrackerFolderId, userId);

  // Verify the folder is accessible
  try {
    const finalFolder = await drive.files.get({
      fileId: userFolderId,
      fields: "id, name, parents",
    });
    console.log(`User folder created: ${finalFolder.data.name} (${finalFolder.data.id})`);
    if (finalFolder.data.parents && finalFolder.data.parents.length > 0) {
      console.log(`Folder parent: ${finalFolder.data.parents[0]}`);
    }
  } catch (verifyError: any) {
    console.warn(`Warning: Cannot verify user folder:`, verifyError.message);
  }

  return userFolderId;
}

/**
 * Upload a file to Google Drive using OAuth
 */
export async function uploadFile(
  file: File | Buffer,
  userId: string,
  transactionId: string,
  filename: string,
  mimeType: string
): Promise<DriveFileMetadata> {
  // Check if user has Google Drive connected
  const tokens = await getUserDriveTokens(userId);
  if (!tokens) {
    throw new Error(
      "Google Drive not connected. Please connect your Google Drive account in Settings."
    );
  }

  const drive = await getDriveClientForUser(userId);

  // Get or create user's folder (Finance Tracker/{userId})
  const userFolderId = await createUserFolder(userId);

  // Convert File to Buffer if needed
  let fileBuffer: Buffer;
  if (file instanceof File) {
    const arrayBuffer = await file.arrayBuffer();
    fileBuffer = Buffer.from(arrayBuffer);
  } else {
    fileBuffer = file;
  }

  // Sanitize original filename
  const sanitizedOriginalFilename = filename.replace(/[^a-zA-Z0-9._-]/g, "_");
  
  // Create unique filename: {timestamp}_{transactionId}_{originalFilename}
  // This ensures uniqueness while keeping the original filename readable
  const timestamp = Date.now();
  const uniqueFilename = `${timestamp}_${transactionId}_${sanitizedOriginalFilename}`;

  // Upload file directly to user folder (no per-transaction subfolders)
  const fileMetadata = {
    name: uniqueFilename,
    parents: [userFolderId],
  };

  const media = {
    mimeType,
    body: Readable.from(fileBuffer),
  };

  let uploadedFile;
  try {
    console.log(`Uploading file "${uniqueFilename}" to folder ${userFolderId}`);
    uploadedFile = await drive.files.create({
      requestBody: fileMetadata,
      media,
      fields: "id, webViewLink, webContentLink",
    });
    console.log(`File uploaded successfully: ${uploadedFile.data.id}`);
  } catch (uploadError: any) {
    console.error("Upload error:", uploadError);
    throw new Error(
      `Failed to upload file to Google Drive: ${uploadError.message || "Unknown error"}`
    );
  }

  if (!uploadedFile.data.id) {
    throw new Error("Failed to upload file to Google Drive");
  }

  // Make file accessible (optional - for viewing in app)
  try {
    await drive.permissions.create({
      fileId: uploadedFile.data.id,
      requestBody: {
        role: "reader",
        type: "anyone",
      },
    });
  } catch (permError) {
    // Non-critical - file is still uploaded
    console.warn("Failed to set file permissions:", permError);
  }

  // Get download link
  const downloadLink = `https://drive.google.com/uc?export=download&id=${uploadedFile.data.id}`;

  return {
    driveFileId: uploadedFile.data.id,
    driveWebViewLink: uploadedFile.data.webViewLink || downloadLink,
    driveDownloadLink: downloadLink,
  };
}

/**
 * Delete a file from Google Drive
 */
export async function deleteFile(driveFileId: string, userId: string): Promise<void> {
  const drive = await getDriveClientForUser(userId);

  try {
    await drive.files.delete({
      fileId: driveFileId,
    });
  } catch (error: any) {
    // If file not found, that's okay (might already be deleted)
    if (error.code !== 404) {
      throw error;
    }
  }
}

/**
 * Get file metadata from Google Drive
 */
export async function getFileMetadata(
  driveFileId: string,
  userId: string
): Promise<{
  name: string;
  mimeType: string;
  size: string;
  webViewLink: string;
  webContentLink: string;
}> {
  const drive = await getDriveClientForUser(userId);

  const file = await drive.files.get({
    fileId: driveFileId,
    fields: "id, name, mimeType, size, webViewLink, webContentLink",
  });

  if (!file.data.id) {
    throw new Error("File not found");
  }

  return {
    name: file.data.name || "",
    mimeType: file.data.mimeType || "",
    size: file.data.size || "0",
    webViewLink: file.data.webViewLink || "",
    webContentLink: file.data.webContentLink || "",
  };
}

/**
 * Update an existing file in Google Drive
 * Google Drive automatically keeps version history
 */
export async function updateFile(
  driveFileId: string,
  fileBuffer: Buffer,
  mimeType: string,
  userId: string
): Promise<void> {
  const drive = await getDriveClientForUser(userId);

  const media = {
    mimeType,
    body: Readable.from(fileBuffer),
  };

  try {
    // Update with keepRevisionForever to ensure version is kept
    await drive.files.update({
      fileId: driveFileId,
      media,
      fields: "id, modifiedTime",
      keepRevisionForever: false, // Let Google Drive manage revisions automatically
    });
    console.log(`File ${driveFileId} updated successfully`);
  } catch (error: any) {
    console.error("Update error:", error);
    throw new Error(
      `Failed to update file in Google Drive: ${error.message || "Unknown error"}`
    );
  }
}

/**
 * Get version history of a file from Google Drive
 */
export async function getFileVersions(
  driveFileId: string,
  userId: string
): Promise<Array<{
  id: string;
  modifiedTime: string;
  size: string;
}>> {
  const drive = await getDriveClientForUser(userId);

  try {
    const response = await drive.revisions.list({
      fileId: driveFileId,
      fields: "revisions(id, modifiedTime, size)",
    });

    const revisions = response.data.revisions || [];
    console.log(`Found ${revisions.length} revisions for file ${driveFileId}`);
    return revisions
      .filter((rev) => rev.id && rev.modifiedTime)
      .map((rev) => ({
        id: rev.id!,
        modifiedTime: rev.modifiedTime!,
        size: rev.size || "0",
      }));
  } catch (error: any) {
    console.error("Error getting file versions:", error);
    throw new Error(`Failed to get file versions: ${error.message || "Unknown error"}`);
  }
}

/**
 * Restore a specific version of a file
 */
export async function restoreFileVersion(
  driveFileId: string,
  revisionId: string,
  userId: string
): Promise<void> {
  const drive = await getDriveClientForUser(userId);

  try {
    // Get the revision content
    const response = await drive.revisions.get(
      {
        fileId: driveFileId,
        revisionId: revisionId,
        alt: "media",
      },
      { responseType: "arraybuffer" }
    );

    // Update the file with the old version's content
    const buffer = Buffer.from(response.data as ArrayBuffer);
    const media = {
      mimeType: "image/jpeg",
      body: Readable.from(buffer),
    };

    await drive.files.update({
      fileId: driveFileId,
      media,
      fields: "id, modifiedTime",
    });

    console.log(`File ${driveFileId} restored to revision ${revisionId}`);
  } catch (error: any) {
    console.error("Error restoring file version:", error);
    throw new Error(`Failed to restore file version: ${error.message || "Unknown error"}`);
  }
}

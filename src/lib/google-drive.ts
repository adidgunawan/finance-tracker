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
 * Returns the transaction folder ID for the user
 */
export async function createUserFolder(userId: string): Promise<string> {
  const drive = await getDriveClientForUser(userId);

  // Create folder structure: Finance Tracker/Users/{userId}/Transactions
  // Start from root (user's Drive root)
  let currentFolderId: string | null = null;

  // Create "Finance Tracker" folder in user's root
  const financeTrackerFolderId = await getOrCreateFolder(
    drive,
    currentFolderId,
    "Finance Tracker"
  );

  // Create "Users" folder
  const usersFolderId = await getOrCreateFolder(
    drive,
    financeTrackerFolderId,
    "Users"
  );

  // Create user-specific folder
  const userFolderId = await getOrCreateFolder(drive, usersFolderId, userId);

  // Create "Transactions" folder
  const transactionsFolderId = await getOrCreateFolder(
    drive,
    userFolderId,
    "Transactions"
  );

  // Verify the final folder is accessible
  try {
    const finalFolder = await drive.files.get({
      fileId: transactionsFolderId,
      fields: "id, name, parents",
    });
    console.log(`Final transactions folder created: ${finalFolder.data.name} (${finalFolder.data.id})`);
    if (finalFolder.data.parents && finalFolder.data.parents.length > 0) {
      console.log(`Folder parent: ${finalFolder.data.parents[0]}`);
    }
  } catch (verifyError: any) {
    console.warn(`Warning: Cannot verify final folder:`, verifyError.message);
  }

  return transactionsFolderId;
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

  // Get or create user's transaction folder
  const transactionsFolderId = await createUserFolder(userId);

  // Create transaction-specific folder
  const transactionFolderId = await getOrCreateFolder(
    drive,
    transactionsFolderId,
    transactionId
  );

  // Convert File to Buffer if needed
  let fileBuffer: Buffer;
  if (file instanceof File) {
    const arrayBuffer = await file.arrayBuffer();
    fileBuffer = Buffer.from(arrayBuffer);
  } else {
    fileBuffer = file;
  }

  // Sanitize filename
  const sanitizedFilename = filename.replace(/[^a-zA-Z0-9._-]/g, "_");

  // Upload file
  const fileMetadata = {
    name: sanitizedFilename,
    parents: [transactionFolderId],
  };

  const media = {
    mimeType,
    body: Readable.from(fileBuffer),
  };

  let uploadedFile;
  try {
    console.log(`Uploading file "${sanitizedFilename}" to folder ${transactionFolderId}`);
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

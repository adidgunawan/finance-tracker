import { google } from "googleapis";
import { Readable } from "stream";

interface DriveFileMetadata {
  driveFileId: string;
  driveWebViewLink: string;
  driveDownloadLink: string;
}

let driveClient: ReturnType<typeof google.drive> | null = null;
let rootFolderId: string | null = null;

/**
 * Initialize Google Drive client with service account
 */
export function initializeDriveClient() {
  if (driveClient) {
    return driveClient;
  }

  if (!process.env.GOOGLE_DRIVE_SERVICE_ACCOUNT_EMAIL) {
    throw new Error("GOOGLE_DRIVE_SERVICE_ACCOUNT_EMAIL is not set");
  }

  if (!process.env.GOOGLE_DRIVE_SERVICE_ACCOUNT_PRIVATE_KEY) {
    throw new Error("GOOGLE_DRIVE_SERVICE_ACCOUNT_PRIVATE_KEY is not set");
  }

  // Handle private key - it can come in different formats
  let privateKey = process.env.GOOGLE_DRIVE_SERVICE_ACCOUNT_PRIVATE_KEY;

  if (!privateKey) {
    throw new Error("GOOGLE_DRIVE_SERVICE_ACCOUNT_PRIVATE_KEY is empty");
  }

  // Remove any surrounding quotes that might have been added
  privateKey = privateKey.trim().replace(/^["']|["']$/g, "");

  // Check if it's base64 encoded (doesn't contain BEGIN marker)
  if (!privateKey.includes("-----BEGIN")) {
    try {
      // Try to decode from base64
      const decoded = Buffer.from(privateKey, "base64").toString("utf-8");
      if (decoded.includes("-----BEGIN")) {
        privateKey = decoded;
      } else {
        throw new Error("Base64 decoded value doesn't contain a valid private key");
      }
    } catch (e: any) {
      // If base64 decode fails, check if it's a JSON string
      try {
        const parsed = JSON.parse(privateKey);
        if (parsed.private_key) {
          privateKey = parsed.private_key;
        }
      } catch (jsonError) {
        throw new Error(
          `Invalid private key format. The key must be either:\n` +
          `1. A raw private key starting with "-----BEGIN PRIVATE KEY-----"\n` +
          `2. A base64-encoded private key\n` +
          `3. A JSON object with a "private_key" field\n` +
          `Current key starts with: ${privateKey.substring(0, 50)}...`
        );
      }
    }
  }

  // Replace escaped newlines (common in environment variables)
  // Handle both \\n (double escaped) and \n (single escaped)
  privateKey = privateKey.replace(/\\\\n/g, "\n").replace(/\\n/g, "\n");
  
  // Ensure proper line breaks (some systems might have different line endings)
  privateKey = privateKey.replace(/\r\n/g, "\n").replace(/\r/g, "\n");
  
  // Validate the key structure
  if (!privateKey.includes("-----BEGIN PRIVATE KEY-----")) {
    throw new Error(
      "Private key must start with '-----BEGIN PRIVATE KEY-----'. " +
      "If you're using a JSON service account file, extract the 'private_key' field value."
    );
  }

  if (!privateKey.includes("-----END PRIVATE KEY-----")) {
    throw new Error(
      "Private key must end with '-----END PRIVATE KEY-----'. " +
      "Make sure all newlines are properly escaped as \\n in your .env file."
    );
  }

  // Extract just the key content between BEGIN and END markers
  const beginMarker = "-----BEGIN PRIVATE KEY-----";
  const endMarker = "-----END PRIVATE KEY-----";
  const beginIndex = privateKey.indexOf(beginMarker);
  const endIndex = privateKey.indexOf(endMarker);
  
  if (beginIndex === -1 || endIndex === -1 || endIndex <= beginIndex) {
    throw new Error("Could not find valid BEGIN/END markers in private key");
  }
  
  // Reconstruct the key with proper formatting
  const keyContent = privateKey.substring(beginIndex, endIndex + endMarker.length);
  
  // Validate the key has actual content (not just markers)
  const keyBody = keyContent
    .replace(beginMarker, "")
    .replace(endMarker, "")
    .trim();
  
  if (keyBody.length < 100) {
    throw new Error(
      "Private key appears to be too short or incomplete. " +
      "Make sure you copied the entire key including all lines between BEGIN and END markers."
    );
  }

  // Final key with proper formatting
  privateKey = `${beginMarker}\n${keyBody}\n${endMarker}`;

  try {
    const auth = new google.auth.JWT({
      email: process.env.GOOGLE_DRIVE_SERVICE_ACCOUNT_EMAIL,
      key: privateKey,
      scopes: ["https://www.googleapis.com/auth/drive"],
    });

    driveClient = google.drive({ version: "v3", auth });
  } catch (error: any) {
    if (error.code === "ERR_OSSL_UNSUPPORTED" || error.message?.includes("DECODER")) {
      throw new Error(
        "Failed to parse private key (OpenSSL error). Common causes:\n" +
        "1. Private key format is incorrect\n" +
        "2. Newlines are not properly escaped (use \\n in .env files)\n" +
        "3. Key is corrupted or incomplete\n\n" +
        "To fix: Copy the 'private_key' value from your service account JSON file, " +
        "replace all actual newlines with \\n, and put it all on one line in .env.local"
      );
    }
    throw error;
  }

  // Get root folder ID if specified
  rootFolderId = process.env.GOOGLE_DRIVE_FOLDER_ID || null;

  return driveClient;
}

/**
 * Get or create a folder in Google Drive
 */
async function getOrCreateFolder(
  drive: ReturnType<typeof google.drive>,
  parentFolderId: string | null,
  folderName: string
): Promise<string> {
  // Search for existing folder
  const query = `name='${folderName}' and mimeType='application/vnd.google-apps.folder' and trashed=false`;
  const parentQuery = parentFolderId
    ? `'${parentFolderId}' in parents`
    : "parents in 'root'";
  const fullQuery = `${query} and ${parentQuery}`;

  const response = await drive.files.list({
    q: fullQuery,
    fields: "files(id, name)",
  });

  if (response.data.files && response.data.files.length > 0) {
    return response.data.files[0].id!;
  }

  // Create folder if it doesn't exist
  const folderMetadata = {
    name: folderName,
    mimeType: "application/vnd.google-apps.folder",
    ...(parentFolderId && { parents: [parentFolderId] }),
  };

  const folder = await drive.files.create({
    requestBody: folderMetadata,
    fields: "id",
  });

  return folder.data.id!;
}

/**
 * Create user-specific folder structure
 * Returns the transaction folder ID for the user
 */
export async function createUserFolder(userId: string): Promise<string> {
  const drive = initializeDriveClient();

  // Create folder structure: Finance Tracker/Users/{userId}/Transactions
  let currentFolderId = rootFolderId;

  // Create "Finance Tracker" folder if root folder is not specified
  if (!currentFolderId) {
    currentFolderId = await getOrCreateFolder(drive, null, "Finance Tracker");
  }

  // Create "Users" folder
  const usersFolderId = await getOrCreateFolder(
    drive,
    currentFolderId,
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

  return transactionsFolderId;
}

/**
 * Upload a file to Google Drive
 */
export async function uploadFile(
  file: File | Buffer,
  userId: string,
  transactionId: string,
  filename: string,
  mimeType: string
): Promise<DriveFileMetadata> {
  const drive = initializeDriveClient();

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

  const uploadedFile = await drive.files.create({
    requestBody: fileMetadata,
    media,
    fields: "id, webViewLink, webContentLink",
  });

  if (!uploadedFile.data.id) {
    throw new Error("Failed to upload file to Google Drive");
  }

  // Make file accessible (service account files need to be shared)
  await drive.permissions.create({
    fileId: uploadedFile.data.id,
    requestBody: {
      role: "reader",
      type: "anyone",
    },
  });

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
export async function deleteFile(driveFileId: string): Promise<void> {
  const drive = initializeDriveClient();

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
  driveFileId: string
): Promise<{
  name: string;
  mimeType: string;
  size: string;
  webViewLink: string;
  webContentLink: string;
}> {
  const drive = initializeDriveClient();

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


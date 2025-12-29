# Google Drive Setup Guide

This guide explains how to set up Google Drive integration for transaction file attachments.

## Prerequisites

1. A Google Cloud Project
2. Google Drive API enabled
3. A service account with Drive API access

## Step-by-Step Setup

### 1. Create a Google Cloud Project

1. Go to [Google Cloud Console](https://console.cloud.google.com/)
2. Create a new project or select an existing one
3. Note your project ID

### 2. Enable Google Drive API

1. In the Google Cloud Console, navigate to **APIs & Services** > **Library**
2. Search for "Google Drive API"
3. Click on it and press **Enable**

### 3. Create a Service Account

1. Navigate to **APIs & Services** > **Credentials**
2. Click **Create Credentials** > **Service Account**
3. Fill in the service account details:
   - **Name**: `finance-tracker-drive` (or any name you prefer)
   - **Description**: Service account for Finance Tracker file storage
4. Click **Create and Continue**
5. Skip the optional steps and click **Done**

### 4. Create and Download Service Account Key

1. In the **Credentials** page, find your service account
2. Click on the service account email
3. Go to the **Keys** tab
4. Click **Add Key** > **Create new key**
5. Select **JSON** format
6. Click **Create** - this will download a JSON file

### 5. Extract Credentials from JSON

Open the downloaded JSON file. You'll need:

- `client_email` - This is your `GOOGLE_DRIVE_SERVICE_ACCOUNT_EMAIL`
- `private_key` - This is your `GOOGLE_DRIVE_SERVICE_ACCOUNT_PRIVATE_KEY`

**Important:** The private key is a multi-line string. You have two options:

#### Option 1: Use Raw Private Key (Recommended)
Copy the entire `private_key` value from the JSON (including the `-----BEGIN PRIVATE KEY-----` and `-----END PRIVATE KEY-----` markers) and paste it into your `.env.local` file. In `.env` files, you need to escape newlines:

```env
GOOGLE_DRIVE_SERVICE_ACCOUNT_PRIVATE_KEY="-----BEGIN PRIVATE KEY-----\nMIIEvQIBADANBgkqhkiG9w0BAQEFAASCBKcwggSjAgEAAoIBAQC...\n-----END PRIVATE KEY-----\n"
```

**Note:** Replace actual newlines with `\n` in the `.env` file.

#### Option 2: Base64 Encode the Private Key
If you prefer, you can base64 encode the entire private key (including BEGIN/END markers) and store it:

```bash
# On Linux/Mac
cat service-account-key.json | jq -r '.private_key' | base64

# Then in .env.local
GOOGLE_DRIVE_SERVICE_ACCOUNT_PRIVATE_KEY="<base64-encoded-string>"
```

The application will automatically detect and decode base64-encoded keys.

### 6. Set Up Folder Structure (Optional)

If you want to organize files in a specific folder:

1. Create a folder in Google Drive (or use an existing one)
2. Share the folder with your service account email (give it "Editor" access)
3. Get the folder ID from the URL: `https://drive.google.com/drive/folders/FOLDER_ID_HERE`
4. Set `GOOGLE_DRIVE_FOLDER_ID` to this folder ID

If you don't set this, files will be organized in:
```
Finance Tracker/
  └── Users/
      └── {userId}/
          └── Transactions/
              └── {transactionId}/
                  └── {filename}
```

### 7. Configure Environment Variables

#### Easy Method: Use the Helper Script (Recommended)

We've provided a helper script to automatically format your private key:

```bash
# Option 1: Provide the JSON file path
node scripts/format-private-key.js path/to/your-service-account.json

# Option 2: Run without arguments and paste the JSON when prompted
node scripts/format-private-key.js
```

The script will output the correctly formatted environment variables that you can copy directly into your `.env.local` file.

#### Manual Method

If you prefer to do it manually, add these to your `.env.local` file:

```env
# Google Drive Service Account
GOOGLE_DRIVE_SERVICE_ACCOUNT_EMAIL=your-service-account@project-id.iam.gserviceaccount.com
GOOGLE_DRIVE_SERVICE_ACCOUNT_PRIVATE_KEY="-----BEGIN PRIVATE KEY-----\nMIIEvQIBADANBgkqhkiG9w0BAQEFAASCBKcwggSjAgEAAoIBAQC...\n-----END PRIVATE KEY-----\n"
GOOGLE_DRIVE_FOLDER_ID=optional-folder-id-here
```

**Critical Notes:**
- The private key **must** include the `-----BEGIN PRIVATE KEY-----` and `-----END PRIVATE KEY-----` markers
- In `.env` files, you **must** replace actual newlines with `\n` (backslash-n)
- The entire key should be on one line in the `.env` file, with `\n` representing line breaks
- If you get an "ERR_OSSL_UNSUPPORTED" error, it means the private key format is incorrect
- You can also use base64 encoding - the service will auto-detect and decode it

**Common Mistakes:**
- ❌ Using actual line breaks in the .env file (will break)
- ❌ Forgetting to escape newlines (should be `\n`, not actual newlines)
- ❌ Missing the BEGIN/END markers
- ❌ Copying only part of the key
- ✅ Using the helper script (recommended)

### 8. Share Drive Folder with Service Account (If Using Custom Folder)

If you set `GOOGLE_DRIVE_FOLDER_ID`, make sure to:
1. Open the folder in Google Drive
2. Click **Share**
3. Add your service account email
4. Give it **Editor** permissions
5. Click **Send**

### 9. File Permissions

The service automatically makes uploaded files accessible to anyone with the link. This allows:
- Viewing images in the application
- Downloading PDFs
- Accessing files via the web view links

Files are organized per user and transaction for easy management.

## Troubleshooting

### Error: "GOOGLE_DRIVE_SERVICE_ACCOUNT_EMAIL is not set"
- Make sure you've added the environment variable to `.env.local`
- Restart your development server after adding environment variables

### Error: "Failed to upload file to Google Drive"
- Check that the Google Drive API is enabled in your Google Cloud project
- Verify the service account has the correct permissions
- Check that the private key is correctly formatted

### Files not appearing in Google Drive
- Check the folder structure in your Drive
- Verify the service account has access to the folder (if using `GOOGLE_DRIVE_FOLDER_ID`)
- Check server logs for any error messages

### Permission Denied Errors
- Ensure the service account has "Editor" access to the root folder (if specified)
- Verify the Google Drive API is enabled
- Check that the service account key hasn't been revoked

## Security Considerations

1. **Never commit** the service account JSON file or private key to version control
2. Keep your `.env.local` file secure and never share it
3. The service account should only have Drive API access (minimal permissions)
4. Files are automatically shared with "anyone with the link" for viewing - this is necessary for the application to display them

## File Limits

- Maximum file size: 25MB per file
- Allowed file types:
  - Images: JPG, PNG, GIF, WEBP
  - Documents: PDF
- Maximum files per transaction: 10 (configurable in FileUpload component)


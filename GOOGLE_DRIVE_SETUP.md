# Google Drive Setup Guide

This guide explains how to set up Google Drive integration for transaction file attachments using OAuth 2.0.

## Overview

The application uses OAuth 2.0 to allow users to connect their personal Google Drive accounts. Files are uploaded directly to each user's Google Drive, ensuring proper storage quota and ownership.

## Prerequisites

1. A Google Cloud Project
2. Google Drive API enabled
3. OAuth 2.0 credentials configured

## Step-by-Step Setup

### 1. Create a Google Cloud Project

1. Go to [Google Cloud Console](https://console.cloud.google.com/)
2. Create a new project or select an existing one
3. Note your project ID

### 2. Enable Google Drive API

1. In the Google Cloud Console, navigate to **APIs & Services** > **Library**
2. Search for "Google Drive API"
3. Click on it and press **Enable**

### 3. Configure OAuth Consent Screen

**IMPORTANT:** You must configure the OAuth consent screen BEFORE creating OAuth credentials.

1. Navigate to **APIs & Services** > **OAuth consent screen**
2. Choose **External** (unless you have a Google Workspace account)
3. Fill in the required information:
   - **App name**: Finance Tracker (or your app name)
   - **User support email**: Your email
   - **Developer contact information**: Your email
4. Click **Save and Continue**
5. **Add Scopes** (this is where you configure scopes):
   - Click **Add or Remove Scopes**
   - In the filter/search box, type: `drive.file`
   - Select: `https://www.googleapis.com/auth/drive.file` (See, edit, create, and delete only the specific Google Drive files you use with this app)
   - Click **Update**
   - Click **Save and Continue**
6. **IMPORTANT: Add Test Users** (REQUIRED - even for developers):
   - **You MUST add yourself as a test user, even though you're the developer!**
   - Click **Add Users** or **+ Add Users**
   - Enter your Google account email (the one you'll use to sign in)
   - Click **Add**
   - You can add multiple test users if needed
   - Click **Save and Continue**
   - **Note:** Without adding test users, you'll get "Access blocked" error even as the developer
7. Review and click **Back to Dashboard**

### 4. Create OAuth 2.0 Credentials

1. Navigate to **APIs & Services** > **Credentials**
2. Click **Create Credentials** > **OAuth client ID**
3. Configure the OAuth client:
   - **Application type**: Web application
   - **Name**: Finance Tracker Web Client (or any name)
   - **Authorized redirect URIs**: 
     - For development: `http://localhost:3000/api/auth/google/callback`
     - For production: `https://yourdomain.com/api/auth/google/callback`
     - Click **+ Add URI** for each URI you need
   - Click **Create**
   - **Copy the Client ID and Client Secret** - you'll need these

### 4. Configure Environment Variables

Add these to your `.env.local` file:

```env
# Google Drive OAuth 2.0
# You can use either naming convention:
GOOGLE_CLIENT_ID=your-oauth-client-id.apps.googleusercontent.com
GOOGLE_CLIENT_SECRET=your-oauth-client-secret

# OR use the Drive-specific names:
# GOOGLE_DRIVE_CLIENT_ID=your-oauth-client-id.apps.googleusercontent.com
# GOOGLE_DRIVE_CLIENT_SECRET=your-oauth-client-secret

# Optional: Custom redirect URI (defaults to /api/auth/google/callback)
GOOGLE_DRIVE_REDIRECT_URI=http://localhost:3000/api/auth/google/callback
```

**Note:** The code supports both `GOOGLE_CLIENT_ID`/`GOOGLE_CLIENT_SECRET` and `GOOGLE_DRIVE_CLIENT_ID`/`GOOGLE_DRIVE_CLIENT_SECRET` naming conventions. Use whichever you prefer.

**For production**, update `GOOGLE_DRIVE_REDIRECT_URI` to your production URL.

### 5. User Connection Flow

Once the OAuth credentials are configured:

1. Users go to **Settings** page
2. Click **Connect Google Drive** button
3. They'll be redirected to Google to authorize the application
4. After authorization, they'll be redirected back to the app
5. Files can now be uploaded to their Google Drive

## How It Works

- Each user connects their own Google Drive account
- Files are uploaded to: `Finance Tracker/Users/{userId}/Transactions/{transactionId}/`
- Files are owned by the user (not the service account)
- No storage quota issues since files use the user's quota
- Users can disconnect at any time from Settings

## Folder Structure

Files are organized in the user's Google Drive as follows:

```
Finance Tracker/
  └── Users/
      └── {userId}/
          └── Transactions/
              └── {transactionId}/
                  └── {filename}
```

## Security Considerations

1. **OAuth Tokens**: Stored securely in the database with RLS policies
2. **Token Refresh**: Tokens are automatically refreshed before expiration
3. **User Isolation**: Each user can only access their own files
4. **Revocation**: Users can disconnect their Google Drive at any time

## Troubleshooting

### Error: "Access blocked: App has not completed the Google verification process"
**This is the most common error!** Even if you're the developer, you MUST add yourself as a test user:

1. Go to **APIs & Services** > **OAuth consent screen** in Google Cloud Console
2. Scroll down to the **Test users** section
3. Click **+ Add Users** or **Add Users**
4. Enter your Google account email (the exact email you're using to sign in: `adidharmagunawan@gmail.com`)
5. Click **Add**
6. Click **Save** (if there's a save button)
7. Wait a few seconds, then try connecting again

**Why this happens:** Until your app is verified by Google (which requires publishing to production), only explicitly added test users can access the app - **even the developer needs to be added as a test user!**

### Error: "Google Drive not connected"
- User needs to connect their Google Drive account in Settings
- Click "Connect Google Drive" and complete the OAuth flow
- Make sure the user is added as a test user in OAuth consent screen (see above)

### Error: "Failed to refresh access token"
- User may need to reconnect their Google Drive account
- Go to Settings and disconnect, then reconnect

### Error: "OAuth client not configured"
- Make sure `GOOGLE_CLIENT_ID` and `GOOGLE_CLIENT_SECRET` are set
- Verify the redirect URI matches in both `.env.local` and Google Cloud Console

### Files not appearing in Google Drive
- Check the folder structure in your Google Drive
- Look for "Finance Tracker" folder in the root of your Drive
- Verify the file was uploaded successfully (check transaction details)

## Disconnecting Google Drive

Users can disconnect their Google Drive at any time:
1. Go to Settings page
2. Click "Disconnect" in the Google Drive section
3. This will revoke the OAuth tokens and prevent further uploads

## File Limits

- Maximum file size: 25MB per file
- Allowed file types:
  - Images: JPG, PNG, GIF, WEBP
  - Documents: PDF
- Maximum files per transaction: 10 (configurable in FileUpload component)

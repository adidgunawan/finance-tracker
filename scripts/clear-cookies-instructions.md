# How to Clear Cookies to Fix 431 Error

## Step-by-Step Instructions

### Chrome/Edge (Recommended Method)

1. **Open Developer Tools:**
   - Press `F12` or right-click → "Inspect"
   - Or press `Ctrl+Shift+I` (Windows) / `Cmd+Option+I` (Mac)

2. **Navigate to Application Tab:**
   - Click the "Application" tab at the top
   - If you don't see it, click the `>>` icon to see more tabs

3. **Find Cookies:**
   - In the left sidebar, expand "Storage"
   - Click on "Cookies"
   - Click on `http://localhost:3000`

4. **Clear All Cookies:**
   - You'll see a list of cookies
   - Right-click anywhere in the cookie list
   - Select "Clear" or click the trash icon
   - **OR** click the "Clear site data" button at the top

5. **Close DevTools and Refresh:**
   - Close DevTools (F12 again)
   - Press `Ctrl+Shift+R` (Windows) or `Cmd+Shift+R` (Mac) to hard refresh

### Firefox

1. **Open Developer Tools:**
   - Press `F12` or right-click → "Inspect Element"

2. **Navigate to Storage Tab:**
   - Click the "Storage" tab

3. **Find Cookies:**
   - Expand "Cookies" in the left sidebar
   - Click on `http://localhost:3000`

4. **Clear Cookies:**
   - Right-click on the domain
   - Select "Delete All" or click "Clear All"

### Alternative: Use Incognito/Private Mode

1. **Chrome/Edge:**
   - Press `Ctrl+Shift+N` (Windows) or `Cmd+Shift+N` (Mac)
   - Navigate to `http://localhost:3000`

2. **Firefox:**
   - Press `Ctrl+Shift+P` (Windows) or `Cmd+Shift+P` (Mac)
   - Navigate to `http://localhost:3000`

3. **Try signing in** - this will have no cookies

## Verify Cookies Are Cleared

After clearing, check that cookies are gone:

1. Open DevTools → Application/Storage → Cookies
2. You should see very few or no cookies for localhost:3000
3. If you still see many cookies, try:
   - Closing all browser tabs for localhost:3000
   - Restarting your browser
   - Using incognito mode

## Why This Works

The 431 error happens because:
- Your browser has accumulated many cookies
- Each cookie adds to the request header size
- The Google OAuth callback URL is long (with state, code, scope parameters)
- Combined, they exceed the ~8KB header limit

Clearing cookies removes the accumulated data, making headers small again.





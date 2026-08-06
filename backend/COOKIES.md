# YouTube Cookies Setup

To bypass YouTube's bot detection and "Sign in to confirm you're not a bot" errors, you can configure yt-dlp to use exported YouTube cookies.

## Why Use Cookies?

YouTube has implemented bot detection that blocks automated downloads. Using cookies from a signed-in browser session helps bypass these restrictions.

## How to Export YouTube Cookies

### Using Browser Extension (Recommended)

1. Install the "Get cookies.txt" extension for your browser:
   - Chrome: https://chrome.google.com/webstore/detail/get-cookiestxt-locally/cclelndahbckbenkjhflpdbanldgppdd
   - Firefox: https://addons.mozilla.org/en-US/firefox/addon/get-cookiestxt-locally/

2. Sign in to YouTube in your browser

3. Navigate to youtube.com

4. Click the extension icon and export cookies as `cookies.txt`

### Using yt-dlp Built-in Method

Alternatively, you can use yt-dlp's built-in cookie authentication:

```bash
yt-dlp --cookies-from-browser chrome
```

## Setting Up Cookies in Backend

### 1. Upload Cookies File

Upload your `cookies.txt` file to your server. For Render deployment, you can:

- Add it to your repository (not recommended for security)
- Use Render's shell to upload it
- Use environment variables to specify the path

### 2. Configure Environment Variable

Set the `YOUTUBE_COOKIES_FILE` environment variable to point to your cookies file:

```bash
YOUTUBE_COOKIES_FILE=/path/to/cookies.txt
```

### For Render Deployment:

1. Upload your `cookies.txt` file to the Render service using the Render shell:
   ```bash
   # Connect to your Render service shell
   # Upload the file using scp or create it directly
   ```

2. Add the environment variable in Render dashboard:
   - Go to your Render service
   - Navigate to "Environment" section
   - Add: `YOUTUBE_COOKIES_FILE=/opt/render/project/backend/cookies.txt`

## Security Considerations

⚠️ **Important Security Notes:**

- Never commit cookies files to public repositories
- Cookies contain authentication tokens that can access your account
- Rotate cookies periodically for security
- Use environment-specific cookies (don't use personal account cookies for production)

## Browser Impersonation

The backend is configured with browser impersonation by default:

- User-Agent: Chrome 120 on Windows
- Player Client: Android
- These settings help avoid detection

## Troubleshooting

### "Sign in to confirm you're not a bot" Error

1. Ensure cookies file is properly formatted
2. Check that the environment variable points to the correct path
3. Verify cookies are not expired
4. Try exporting fresh cookies from your browser

### Cookies Not Working

1. Check file permissions
2. Verify the file format (should be Netscape cookie format)
3. Ensure the file contains YouTube domain cookies
4. Check logs for cookie-related errors

## Alternative Solutions

If cookies don't work, the backend has fallback mechanisms:

- Browser impersonation (enabled by default)
- Android client extraction (enabled by default)
- These work without cookies but may be less reliable

## Support

For issues with cookie setup, check:
- yt-dlp documentation: https://github.com/yt-dlp/yt-dlp
- Render documentation: https://render.com/docs

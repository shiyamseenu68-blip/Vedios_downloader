# Cookie and System Diagnostics

This guide helps you verify that cookies are properly configured and yt-dlp is working correctly in the Render container.

## API Diagnostic Endpoint

### Quick Check via API

Call the diagnostic endpoint from your browser or curl:

```bash
curl https://vedios-downloader-5.onrender.com/api/diagnose
```

This will return:
- Cookie status and file information
- System information (platform, Node version, PATH)
- yt-dlp binary location and version
- Test results for cookies and impersonate methods

## Render Shell Diagnostics

### Access Render Shell

1. Go to your Render dashboard
2. Navigate to your backend service
3. Click "Shell" or "SSH" to access the container

### Run Diagnostic Script

Navigate to the backend directory and run the diagnostic script:

```bash
cd /opt/render/project/backend
bash scripts/diagnose-cookies.sh
```

This will:
- List all files in the directory
- Check for cookies.txt file
- Verify YOUTUBE_COOKIES_FILE environment variable
- Check yt-dlp binary and version
- Test yt-dlp with cookies
- Test yt-dlp without cookies (impersonate only)
- Check system PATH for required binaries

### Manual Verification Commands

If you prefer to run commands manually:

```bash
# 1. List files in backend directory
ls -la

# 2. Check for cookies.txt file
cat cookies.txt

# 3. Check environment variable
echo $YOUTUBE_COOKIES_FILE

# 4. Check if cookies file exists at the specified path
if [ -f "$YOUTUBE_COOKIES_FILE" ]; then
    echo "Cookie file exists at: $YOUTUBE_COOKIES_FILE"
    wc -c "$YOUTUBE_COOKIES_FILE"  # File size
    wc -l "$YOUTUBE_COOKIES_FILE"  # Line count
else
    echo "Cookie file not found at: $YOUTUBE_COOKIES_FILE"
fi

# 5. Test yt-dlp with cookies
./yt-dlp --cookies cookies.txt --impersonate chrome "https://www.youtube.com/watch?v=ip8o5hDFLhI"

# 6. Test yt-dlp without cookies (impersonate only)
./yt-dlp --impersonate chrome --extractor-args "youtube:player_client=android" "https://www.youtube.com/watch?v=ip8o5hDFLhI"

# 7. Check yt-dlp version
./yt-dlp --version

# 8. Check system PATH
echo $PATH

# 9. Check for required binaries
which python3
which ffmpeg
```

## Expected Results

### Successful Cookie Setup

If cookies are working correctly, you should see:

```
✓ cookies.txt exists
File size: [size] bytes
Line count: [number] lines
✓ yt-dlp binary exists
yt-dlp version: [version]
✓ YOUTUBE_COOKIES_FILE points to existing file
```

### Cookie Issues

If cookies are not working, you might see:

```
✗ cookies.txt does not exist
✗ YOUTUBE_COOKIES_FILE environment variable is not set
✗ Cookie file path specified but file does not exist
```

## Troubleshooting

### Cookies File Not Found

**Problem**: Cookie file doesn't exist in the container

**Solution**: Upload cookies.txt to the Render container:

```bash
# From your local machine, upload to Render
scp cookies.txt render@your-service:/opt/render/project/backend/cookies.txt

# Or create it directly in the Render shell
nano cookies.txt
# Paste your cookies content
# Save and exit
```

### Environment Variable Not Set

**Problem**: YOUTUBE_COOKIES_FILE environment variable is not set

**Solution**: Set it in the Render dashboard:

1. Go to your Render service
2. Navigate to "Environment" section
3. Add: `YOUTUBE_COOKIES_FILE=/opt/render/project/backend/cookies.txt`
4. Restart the service

### yt-dlp Not Found

**Problem**: yt-dlp binary not found

**Solution**: The deployment script should install it automatically. Check:

```bash
# Check if yt-dlp exists
ls -la yt-dlp

# If missing, re-run the setup script
bash scripts/setup-ytdlp.sh
```

### Test Fails with Bot Detection

**Problem**: Even with cookies, yt-dlp fails with bot detection

**Solution**: 
1. Verify cookies are not expired
2. Try exporting fresh cookies from your browser
3. Check that cookies contain YouTube domain cookies
4. The fallback strategies should still work without cookies

## Next Steps

After running diagnostics:

1. **Check API response**: `GET /api/diagnose` - gives comprehensive overview
2. **Review Render logs**: Look for cookie-related error messages
3. **Test manually**: Run the diagnostic script in Render shell
4. **Verify file uploads**: Ensure cookies.txt is properly uploaded
5. **Check environment variables**: Confirm YOUTUBE_COOKIES_FILE is set correctly

## Support

If you continue to have issues:

1. Share the diagnostic output from `/api/diagnose`
2. Include the output from the shell diagnostic script
3. Provide relevant Render log entries
4. Check if the fallback strategies are working (impersonate mode)

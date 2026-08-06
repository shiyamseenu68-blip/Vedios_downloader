#!/bin/bash

echo "=== COOKIE DIAGNOSTIC SCRIPT ==="
echo "Current directory: $(pwd)"
echo "Timestamp: $(date)"
echo ""

echo "=== 1. LISTING FILES IN CURRENT DIRECTORY ==="
ls -la
echo ""

echo "=== 2. CHECKING FOR COOKIES FILE ==="
if [ -f "cookies.txt" ]; then
    echo "✓ cookies.txt exists"
    echo "File size: $(wc -c < cookies.txt) bytes"
    echo "Line count: $(wc -l < cookies.txt) lines"
    echo ""
    echo "=== 3. COOKIES FILE CONTENT (first 500 chars) ==="
    head -c 500 cookies.txt
    echo ""
    echo "..."
else
    echo "✗ cookies.txt does not exist in current directory"
fi
echo ""

echo "=== 4. CHECKING ENVIRONMENT VARIABLE ==="
echo "YOUTUBE_COOKIES_FILE: $YOUTUBE_COOKIES_FILE"
if [ -n "$YOUTUBE_COOKIES_FILE" ]; then
    if [ -f "$YOUTUBE_COOKIES_FILE" ]; then
        echo "✓ Environment variable points to existing file: $YOUTUBE_COOKIES_FILE"
        echo "File size: $(wc -c < "$YOUTUBE_COOKIES_FILE") bytes"
        echo "Line count: $(wc -l < "$YOUTUBE_COOKIES_FILE") lines"
    else
        echo "✗ Environment variable points to non-existent file: $YOUTUBE_COOKIES_FILE"
    fi
else
    echo "✗ YOUTUBE_COOKIES_FILE environment variable is not set"
fi
echo ""

echo "=== 5. CHECKING YT-DLP BINARY ==="
if [ -f "./yt-dlp" ]; then
    echo "✓ yt-dlp binary exists"
    echo "yt-dlp version:"
    ./yt-dlp --version
    echo ""
    echo "yt-dlp location:"
    which yt-dlp
else
    echo "✗ yt-dlp binary does not exist"
fi
echo ""

echo "=== 6. TESTING YT-DLP WITH COOKIES ==="
if [ -f "cookies.txt" ]; then
    echo "Testing yt-dlp with cookies.txt..."
    ./yt-dlp --cookies cookies.txt --impersonate chrome --dump-json --no-playlist "https://www.youtube.com/watch?v=ip8o5hDFLhI" 2>&1 | head -20
    echo ""
elif [ -n "$YOUTUBE_COOKIES_FILE" ] && [ -f "$YOUTUBE_COOKIES_FILE" ]; then
    echo "Testing yt-dlp with YOUTUBE_COOKIES_FILE..."
    ./yt-dlp --cookies "$YOUTUBE_COOKIES_FILE" --impersonate chrome --dump-json --no-playlist "https://www.youtube.com/watch?v=ip8o5hDFLhI" 2>&1 | head -20
    echo ""
else
    echo "✗ No cookies file available for testing"
fi
echo ""

echo "=== 7. TESTING YT-DLP WITHOUT COOKIES ==="
echo "Testing yt-dlp without cookies (impersonate only)..."
./yt-dlp --impersonate chrome --extractor-args "youtube:player_client=android" --dump-json --no-playlist "https://www.youtube.com/watch?v=ip8o5hDFLhI" 2>&1 | head -20
echo ""

echo "=== 8. CHECKING SYSTEM PATH FOR BINS ==="
echo "PATH: $PATH"
echo ""
echo "Python location:"
which python3 || echo "Python3 not found"
echo ""
echo "FFmpeg location:"
which ffmpeg || echo "FFmpeg not found"
echo ""

echo "=== DIAGNOSTIC COMPLETE ==="
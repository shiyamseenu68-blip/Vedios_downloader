#!/bin/bash

# Download yt-dlp binary for Linux (Render uses Linux)
# Download to the backend directory where the app will run
cd "$(dirname "$0")/.."

echo "=== YT-DLP SETUP SCRIPT ==="
echo "Current directory: $(pwd)"
echo "Listing files before download:"
ls -la

echo ""
echo "Downloading yt-dlp..."
curl -L https://github.com/yt-dlp/yt-dlp/releases/latest/download/yt-dlp -o yt-dlp

echo ""
echo "Making yt-dlp executable..."
chmod a+rx yt-dlp

echo ""
echo "Listing files after download:"
ls -la

echo ""
echo "Checking if yt-dlp exists and is executable:"
if [ -f "./yt-dlp" ]; then
    echo "✓ yt-dlp file exists"
    if [ -x "./yt-dlp" ]; then
        echo "✓ yt-dlp is executable"
        echo "✓ yt-dlp version:"
        ./yt-dlp --version
    else
        echo "✗ yt-dlp is not executable"
    fi
else
    echo "✗ yt-dlp file does not exist"
fi

echo ""
echo "=== YT-DLP SETUP COMPLETE ==="

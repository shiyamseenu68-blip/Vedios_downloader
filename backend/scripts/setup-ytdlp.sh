#!/bin/bash

# Setup script for yt-dlp, ffmpeg, and JavaScript runtime on Render
# Download to the backend directory where the app will run
cd "$(dirname "$0")/.."

echo "=== BACKEND DEPENDENCIES SETUP SCRIPT ==="
echo "Current directory: $(pwd)"
echo "Listing files before setup:"
ls -la

echo ""
echo "=== INSTALLING FFMPEG ==="
apt-get update && apt-get install -y ffmpeg

echo ""
echo "=== INSTALLING PYTHON FOR JAVASCRIPT RUNTIME ==="
apt-get install -y python3 python3-pip

echo ""
echo "=== INSTALLING PYTHON PACKAGES FOR YTDLP ==="
pip3 install --upgrade pip
pip3 install pycryptodomex websockets

echo ""
echo "=== DOWNLOADING YT-DLP ==="
curl -L https://github.com/yt-dlp/yt-dlp/releases/latest/download/yt-dlp -o yt-dlp

echo ""
echo "Making yt-dlp executable..."
chmod a+rx yt-dlp

echo ""
echo "Listing files after setup:"
ls -la

echo ""
echo "=== VERIFYING INSTALLATIONS ==="

# Check ffmpeg
if command -v ffmpeg &> /dev/null; then
    echo "✓ ffmpeg is installed"
    ffmpeg -version | head -n 1
else
    echo "✗ ffmpeg is not installed"
fi

# Check Python
if command -v python3 &> /dev/null; then
    echo "✓ Python3 is installed"
    python3 --version
else
    echo "✗ Python3 is not installed"
fi

# Check yt-dlp
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
echo "=== SETUP COMPLETE ==="

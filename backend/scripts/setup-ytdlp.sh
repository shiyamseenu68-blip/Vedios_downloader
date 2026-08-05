#!/bin/bash

# Download yt-dlp binary for Linux (Render uses Linux)
# Download to the backend directory where the app will run
cd "$(dirname "$0")/.."
curl -L https://github.com/yt-dlp/yt-dlp/releases/latest/download/yt-dlp -o yt-dlp
chmod a+rx yt-dlp

echo "yt-dlp downloaded and made executable at $(pwd)/yt-dlp"

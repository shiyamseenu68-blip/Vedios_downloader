#!/bin/bash

# Download yt-dlp binary for Linux (Render uses Linux)
cd /opt/render/project/src
curl -L https://github.com/yt-dlp/yt-dlp/releases/latest/download/yt-dlp -o yt-dlp
chmod a+rx yt-dlp

echo "yt-dlp downloaded and made executable"

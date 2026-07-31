const { execSync } = require('child_process');
const fs = require('fs');
const path = require('path');
const os = require('os');

const platform = os.platform();
const ytDlpBinary = platform === 'win32' ? 'yt-dlp.exe' : 'yt-dlp';
const ytDlpPath = path.join(__dirname, '..', ytDlpBinary);

console.log(`Downloading yt-dlp for ${platform}...`);

let downloadUrl;
if (platform === 'win32') {
  downloadUrl = 'https://github.com/yt-dlp/yt-dlp/releases/latest/download/yt-dlp.exe';
} else {
  downloadUrl = 'https://github.com/yt-dlp/yt-dlp/releases/latest/download/yt-dlp';
}

try {
  execSync(`curl -L "${downloadUrl}" -o "${ytDlpPath}"`, {
    stdio: 'inherit'
  });
  
  // Make executable on Unix-like systems
  if (platform !== 'win32') {
    fs.chmodSync(ytDlpPath, 0o755);
  }
  
  console.log('Verifying yt-dlp installation...');
  const version = execSync(`"${ytDlpPath}" --version`, { encoding: 'utf8' });
  console.log(`yt-dlp version: ${version.trim()}`);
  console.log('yt-dlp installed successfully');
} catch (error) {
  console.error('Failed to install yt-dlp:', error.message);
  process.exit(1);
}

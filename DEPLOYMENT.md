# Deployment Guide

This guide covers deploying the YouTube Playlist Downloader to production.

## Architecture

- **Frontend**: React + Vite deployed on Vercel
- **Backend**: Express + TypeScript deployed on Render
- **Database**: None (file-based downloads)
- **External Dependencies**: yt-dlp, ffmpeg

## Frontend Deployment (Vercel)

### Prerequisites
- Vercel account
- GitHub repository with the frontend code

### Steps

1. **Push frontend code to GitHub**
   ```bash
   cd frontend
   git init
   git add .
   git commit -m "Initial commit"
   git remote add origin <your-repo-url>
   git push -u origin main
   ```

2. **Deploy to Vercel**
   - Go to [vercel.com](https://vercel.com)
   - Click "Add New Project"
   - Import your GitHub repository
   - Configure build settings:
     - Framework: Vite
     - Build Command: `npm run build`
     - Output Directory: `dist`
   - Add environment variable:
     - `VITE_API_BASE_URL`: Your backend URL (e.g., `https://your-backend.onrender.com/api`)
   - Click "Deploy"

3. **Update backend CORS**
   - After deployment, copy the Vercel URL
   - Update the `FRONTEND_URL` environment variable in Render

## Backend Deployment (Render)

### Prerequisites
- Render account
- GitHub repository with the backend code

### Steps

1. **Push backend code to GitHub**
   ```bash
   cd backend
   git init
   git add .
   git commit -m "Initial commit"
   git remote add origin <your-repo-url>
   git push -u origin main
   ```

2. **Deploy to Render**
   - Go to [render.com](https://render.com)
   - Click "New +"
   - Select "Web Service"
   - Connect your GitHub repository
   - Configure build settings:
     - Runtime: Node
     - Build Command: `npm install && npm run build`
     - Start Command: `npm start`
   - Add environment variables:
     - `NODE_ENV`: `production`
     - `PORT`: `10000`
     - `FRONTEND_URL`: Your Vercel frontend URL
   - Click "Create Web Service"

3. **Verify deployment**
   - Check the Render logs for successful startup
   - Test the API endpoints
   - Verify yt-dlp binary was downloaded

## Environment Variables

### Frontend (.env)
```env
VITE_API_BASE_URL=https://your-backend.onrender.com/api
```

### Backend (.env)
```env
NODE_ENV=production
PORT=10000
FRONTEND_URL=https://your-frontend.vercel.app
```

## Production Considerations

### yt-dlp and ffmpeg
- The backend automatically downloads yt-dlp during deployment via `postinstall` script
- ffmpeg-static package provides ffmpeg binaries
- Both are required for video/audio download and conversion

### CORS Configuration
- Backend uses `FRONTEND_URL` environment variable for CORS
- Ensure this matches your deployed Vercel URL
- In development, CORS allows all origins (`*`)

### File Storage
- Downloaded files are stored in the `downloads` directory
- ZIP files are created and served for download
- Files are cleaned up after ZIP creation
- Render's ephemeral filesystem means files are lost on redeploy

### Rate Limiting
- Consider adding rate limiting for API endpoints
- Implement request queuing for large playlists
- Add authentication for production use

### Monitoring
- Monitor Render logs for errors
- Track download success/failure rates
- Monitor disk usage for downloads directory
- Set up alerts for API failures

## Troubleshooting

### Frontend Issues
- **API connection errors**: Verify `VITE_API_BASE_URL` is correct
- **CORS errors**: Check backend `FRONTEND_URL` matches frontend URL
- **Build failures**: Check Vercel build logs

### Backend Issues
- **yt-dlp not found**: Check postinstall script ran successfully
- **ffmpeg errors**: Verify ffmpeg-static is installed correctly
- **Download failures**: Check Render logs for yt-dlp errors
- **SSE connection issues**: Verify CORS and network connectivity

### Common Issues
- **ZIP files empty**: Check file path resolution logic
- **Download timeouts**: Increase timeout in Axios configuration
- **Memory issues**: Consider upgrading Render plan for larger playlists

## Scaling Considerations

### Current Limitations
- Single server deployment
- No database for persistent storage
- Ephemeral file storage
- No authentication
- No rate limiting

### Future Improvements
- Add Redis for job queuing
- Implement S3 for file storage
- Add user authentication
- Implement rate limiting
- Add database for download history
- Implement CDN for static assets
- Add monitoring and alerting

# 🎵 SCRipper - SoundCloud Downloader Web App

A modern web application for downloading SoundCloud tracks and playlists, built with Node.js, Express, React, and Docker.

## Features

- 🎵 **Download Tracks & Playlists**: Download individual tracks or entire SoundCloud playlists
- 🎨 **Modern React UI**: Beautiful, responsive web interface
- 🐳 **Dockerized**: Easy deployment with Docker Compose
- 🚀 **Node.js Backend**: Fast Express API server
- 🎧 **High-Quality Audio**: Converts to 320kbps MP3
- 🏷️ **Metadata Embedding**: Automatically embeds ID3 tags and album art
- 📥 **File Management**: Download and manage your downloaded files through the web UI

## Project Structure

```
SCRipper/
├── server/              # Node.js Express backend
│   ├── services/       # Business logic (downloader, converter, metadata)
│   ├── index.js        # Express server entry point
│   └── package.json    # Backend dependencies
├── client/             # React frontend
│   ├── src/           # React source files
│   ├── package.json   # Frontend dependencies
│   └── vite.config.js # Vite configuration
├── docker-compose.yml # Docker orchestration
└── README.md          # This file
```

## Prerequisites

- **Docker** and **Docker Compose** installed
- OR **Node.js** 20+ and **npm** for local development

## Quick Start with Docker (Recommended)

1. **Clone the repository**
   ```bash
   git clone <your-repo-url>
   cd SCRipper
   ```

2. **Build and start the containers**
   ```bash
   docker-compose up --build
   ```

3. **Access the application**
   - Web UI: http://localhost
   - API: http://localhost:3001

4. **Stop the containers**
   ```bash
   docker-compose down
   ```

## Local Development

### Backend Setup

1. **Navigate to server directory**
   ```bash
   cd server
   ```

2. **Install dependencies**
   ```bash
   npm install
   ```

3. **Install system dependencies** (Ubuntu/Debian)
   ```bash
   sudo apt-get update
   sudo apt-get install -y python3 python3-pip ffmpeg
   pip3 install yt-dlp
   ```

4. **Start the server**
   ```bash
   npm start
   # or for development with auto-reload
   npm run dev
   ```

The backend will run on http://localhost:3001

### Frontend Setup

1. **Navigate to client directory** (in a new terminal)
   ```bash
   cd client
   ```

2. **Install dependencies**
   ```bash
   npm install
   ```

3. **Start the development server**
   ```bash
   npm run dev
   ```

The frontend will run on http://localhost:3000

## API Endpoints

### `GET /api/health`
Health check endpoint.

**Response:**
```json
{
  "status": "ok",
  "message": "SCRipper API is running"
}
```

### `POST /api/download`
Download a SoundCloud track or playlist.

**Request Body:**
```json
{
  "url": "https://soundcloud.com/..."
}
```

**Response:**
```json
{
  "success": true,
  "total": 1,
  "results": [
    {
      "success": true,
      "title": "Track Title",
      "artist": "Artist Name",
      "path": "/path/to/file.mp3",
      "filename": "Track Title.mp3"
    }
  ]
}
```

### `GET /api/downloads`
List all downloaded files.

**Response:**
```json
{
  "files": [
    {
      "filename": "Track Title.mp3",
      "path": "/api/downloads/Track Title.mp3",
      "size": null
    }
  ]
}
```

### `GET /api/downloads/:filename`
Download a specific file.

### `DELETE /api/downloads/:filename`
Delete a downloaded file.

## Environment Variables

### Backend
- `PORT` - Server port (default: 3001)
- `NODE_ENV` - Environment mode (development/production)

### Frontend
- `VITE_API_URL` - Backend API URL (default: http://localhost:3001)

## Docker Volumes

The `downloads` directory is mounted as a volume, so downloaded files persist even after containers are stopped.

## Troubleshooting

### Docker Issues

**Port already in use:**
- Change ports in `docker-compose.yml` if 80 or 3001 are already in use

**Permission errors:**
- Ensure Docker has proper permissions to create the downloads directory

### Download Issues

**yt-dlp errors:**
- Ensure yt-dlp is up to date: `pip3 install --upgrade yt-dlp`
- Some tracks may require authentication (cookies)

**FFmpeg errors:**
- Verify FFmpeg is installed: `ffmpeg -version`
- In Docker, FFmpeg is included automatically

### Development Issues

**Module not found:**
- Run `npm install` in both server and client directories
- Clear node_modules and reinstall if issues persist

## Technology Stack

- **Backend**: Node.js, Express.js
- **Frontend**: React, Vite
- **Audio Processing**: FFmpeg, yt-dlp
- **Metadata**: node-id3
- **Containerization**: Docker, Docker Compose
- **Web Server**: Nginx (production frontend)

## License

This project is licensed under some kinda License.

## Contributing

Contributions welcome! Please:
1. Fork the repo
2. Create a feature branch
3. Commit your changes
4. Push to the branch
5. Open a Pull Request

---

**Note**: This tool is for personal use only. Respect SoundCloud's Terms of Service and copyright laws.

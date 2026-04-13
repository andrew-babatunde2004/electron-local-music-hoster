# Music Player

A local music player built with Electron and React. Stream your music library from your desktop to any device on the same Wi-Fi network, or play files directly from a local folder.

---

## Requirements

- [Node.js](https://nodejs.org/) v18 or later
- npm (comes with Node.js)

---

## Setup

Install dependencies:

```bash
npm install
```

---

## Running the App

```bash
npm run dev
```

This opens the Electron player window. The sidebar has two source modes:

- **Network** — connect to your desktop music server over Wi-Fi
- **Local** — browse a folder directly on the machine running the app

---

## Hosting Your Music Over the Network

To stream music from your desktop to any device on the same Wi-Fi, run the included server script on your desktop.

### 1. Start the server

Open a terminal in the project folder and run:

```bash
node server.js
```

You will be prompted for your music folder:

```
Music folder path: C:\Users\you\Music
```

Once running, the server prints two URLs:

```
  ✓ Serving 47 tracks from:
    C:\Users\you\Music

  Endpoints
    Local:    http://localhost:3000/songs
    Network:  http://192.168.1.10:3000/songs

  Paste the Network URL into the app on any device on your Wi-Fi.
  Ctrl+C to stop.
```

You can also pass the folder and port as arguments:

```bash
node server.js "C:\Users\you\Music"
node server.js "C:\Users\you\Music" 8080
```

### 2. Connect from any device

On any device on the same network (laptop, another PC, etc.):

1. Open the app (`npm run dev`)
2. Make sure **Network** is selected in the sidebar
3. Paste the **Network** URL printed by the server — e.g. `http://192.168.1.10:3000/songs`
4. Press **Connect** or hit Enter

Your tracks will load and playback starts immediately.

> Both devices must be on the same Wi-Fi network.

### 3. Stop the server

Press `Ctrl+C` in the terminal where the server is running.

---

## Playing Local Files

To play music directly on the machine running the app without a server:

1. Switch to **Local** in the sidebar
2. Click **Browse folder**
3. Select any folder containing audio files

Supported formats: `mp3` `flac` `wav` `ogg` `m4a` `aac` `opus` `wma`

---

## File Naming Convention

Artist and title are parsed automatically from the filename. The expected format is:

```
Artist Name - Song Title.mp3
```

If there is no ` - ` separator the full filename becomes the title and artist is set to `Unknown Artist`.

---

## Building for Distribution

```bash
npm run build:win    # Windows
npm run build:mac    # macOS
npm run build:linux  # Linux
```

Output goes to the `dist/` folder.

---

## Project Structure

```
electron-local-music-hoster/
├── src/
│   ├── main/         # Electron main process (window, IPC, file system)
│   ├── preload/      # Context bridge — exposes IPC to the renderer
│   └── renderer/     # React frontend
├── server.js         # Standalone music server (run on your desktop)
├── build/            # App icons for packaged builds
└── resources/        # Icons used during development
```

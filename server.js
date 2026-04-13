#!/usr/bin/env node
/**
 * Music Server
 * Serves a local music folder over HTTP so the player app can connect
 * from any device on the same network.
 *
 * Usage:
 *   node server.js                        (prompts for folder)
 *   node server.js "C:/Users/you/Music"   (pass folder directly)
 *   node server.js "/home/you/Music" 4000 (custom port)
 */

const http = require('http')
const fs = require('fs')
const path = require('path')
const readline = require('readline')
const os = require('os')

// ── Config ──────────────────────────────────────────────────────────────────

const AUDIO_EXTENSIONS = ['.mp3', '.flac', '.wav', '.ogg', '.m4a', '.aac', '.opus', '.wma']

const MIME = {
  '.mp3':  'audio/mpeg',
  '.flac': 'audio/flac',
  '.wav':  'audio/wav',
  '.ogg':  'audio/ogg',
  '.m4a':  'audio/mp4',
  '.aac':  'audio/aac',
  '.opus': 'audio/opus',
  '.wma':  'audio/x-ms-wma',
}

// ── Helpers ──────────────────────────────────────────────────────────────────

function getLocalIP() {
  for (const ifaces of Object.values(os.networkInterfaces())) {
    for (const iface of ifaces) {
      if (iface.family === 'IPv4' && !iface.internal) return iface.address
    }
  }
  return '127.0.0.1'
}

function parseFilename(filename) {
  const name = filename.replace(/\.[^/.]+$/, '') // strip extension
  const dash = name.indexOf(' - ')
  if (dash !== -1) {
    return { artist: name.slice(0, dash).trim(), title: name.slice(dash + 3).trim() }
  }
  return { artist: 'Unknown Artist', title: name }
}

function scanDir(dir) {
  return fs.readdirSync(dir)
    .filter(f => AUDIO_EXTENSIONS.some(ext => f.toLowerCase().endsWith(ext)))
    .map((file, i) => ({ id: String(i), ...parseFilename(file), file }))
}

function prompt(question) {
  const rl = readline.createInterface({ input: process.stdin, output: process.stdout })
  return new Promise(resolve => rl.question(question, ans => { rl.close(); resolve(ans.trim()) }))
}

// ── Request handler ──────────────────────────────────────────────────────────

function createHandler(musicDir, songs, localIP, port) {
  return function handler(req, res) {
    res.setHeader('Access-Control-Allow-Origin', '*')
    res.setHeader('Access-Control-Allow-Methods', 'GET, OPTIONS')

    if (req.method === 'OPTIONS') { res.writeHead(204); res.end(); return }

    const url = new URL(req.url, 'http://localhost')

    // GET /songs → JSON list
    if (url.pathname === '/songs') {
      const body = JSON.stringify(
        songs.map(s => ({
          id:       s.id,
          title:    s.title,
          artist:   s.artist,
          audioUrl: `http://${localIP}:${port}/audio/${s.id}`
        }))
      )
      res.writeHead(200, { 'Content-Type': 'application/json' })
      res.end(body)
      return
    }

    // GET /audio/:id → stream file with range support (needed for seeking)
    const match = url.pathname.match(/^\/audio\/(\d+)$/)
    if (match) {
      const song = songs.find(s => s.id === match[1])
      if (!song) { res.writeHead(404); res.end('Not found'); return }

      const filePath = path.join(musicDir, song.file)
      const ext = path.extname(song.file).toLowerCase()
      const mime = MIME[ext] || 'audio/mpeg'

      let stat
      try { stat = fs.statSync(filePath) } catch {
        res.writeHead(404); res.end('File not found'); return
      }

      const rangeHeader = req.headers.range
      if (rangeHeader) {
        const [s, e] = rangeHeader.replace(/bytes=/, '').split('-')
        const start = parseInt(s, 10)
        const end   = e ? parseInt(e, 10) : stat.size - 1
        res.writeHead(206, {
          'Content-Range':  `bytes ${start}-${end}/${stat.size}`,
          'Accept-Ranges':  'bytes',
          'Content-Length': String(end - start + 1),
          'Content-Type':   mime,
        })
        fs.createReadStream(filePath, { start, end }).pipe(res)
      } else {
        res.writeHead(200, {
          'Content-Length': String(stat.size),
          'Content-Type':   mime,
          'Accept-Ranges':  'bytes',
        })
        fs.createReadStream(filePath).pipe(res)
      }
      return
    }

    res.writeHead(404)
    res.end('Not found')
  }
}

// ── Main ─────────────────────────────────────────────────────────────────────

async function main() {
  let musicDir = process.argv[2]
  const port   = parseInt(process.argv[3] || process.env.PORT || '3000', 10)

  // Prompt if no directory passed
  if (!musicDir) {
    console.log('\nMusic Server — serves your local music over the network\n')
    musicDir = await prompt('Music folder path: ')
  }

  // Expand ~ on Unix/Mac
  if (musicDir.startsWith('~')) musicDir = path.join(os.homedir(), musicDir.slice(1))
  // Normalize slashes
  musicDir = path.resolve(musicDir)

  if (!fs.existsSync(musicDir) || !fs.statSync(musicDir).isDirectory()) {
    console.error(`\n  ✗ Not a valid directory: ${musicDir}\n`)
    process.exit(1)
  }

  const songs = scanDir(musicDir)
  if (songs.length === 0) {
    console.warn(`\n  ⚠  No audio files found in: ${musicDir}`)
    console.warn(`     Supported formats: ${AUDIO_EXTENSIONS.join(', ')}\n`)
    process.exit(1)
  }

  const localIP = getLocalIP()
  const server  = http.createServer(createHandler(musicDir, songs, localIP, port))

  server.listen(port, '0.0.0.0', () => {
    console.log(`\n  ✓ Serving ${songs.length} tracks from:`)
    console.log(`    ${musicDir}`)
    console.log(`\n  Endpoints`)
    console.log(`    Local:    http://localhost:${port}/songs`)
    console.log(`    Network:  http://${localIP}:${port}/songs`)
    console.log(`\n  Paste the Network URL into the app on any device on your Wi-Fi.`)
    console.log('  Ctrl+C to stop.\n')
  })

  // Log each request (optional, helpful for debugging)
  server.on('request', (req) => {
    const ts = new Date().toLocaleTimeString()
    console.log(`  [${ts}] ${req.method} ${req.url}`)
  })
}

main().catch(err => { console.error(err); process.exit(1) })

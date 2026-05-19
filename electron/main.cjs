const { app, BrowserWindow, dialog } = require('electron')
const path = require('path')
const { spawn, fork } = require('child_process')
const http = require('http')

const isDev = !app.isPackaged

const VITE_PORT = 3000
const BACKEND_PORT = 3001

let mainWindow = null
let viteProcess = null
let serverProcess = null

function createWindow() {
  mainWindow = new BrowserWindow({
    width: 1280,
    height: 800,
    minWidth: 900,
    minHeight: 600,
    webPreferences: {
      preload: path.join(__dirname, 'preload.cjs'),
      contextIsolation: true,
      nodeIntegration: false
    },
    show: false
  })

  mainWindow.once('ready-to-show', () => {
    mainWindow.show()
  })

  mainWindow.on('closed', () => {
    mainWindow = null
  })
}

function waitForUrl(url, maxRetries = 30, interval = 1000) {
  return new Promise((resolve, reject) => {
    let retries = 0
    const check = () => {
      http.get(url, (res) => {
        if (res.statusCode === 200) {
          resolve()
        } else if (++retries < maxRetries) {
          setTimeout(check, interval)
        } else {
          reject(new Error(`Server at ${url} not ready after ${maxRetries} retries`))
        }
      }).on('error', () => {
        if (++retries < maxRetries) {
          setTimeout(check, interval)
        } else {
          reject(new Error(`Server at ${url} not ready after ${maxRetries} retries`))
        }
      })
    }
    check()
  })
}

function waitForOutput(proc, keyword) {
  return new Promise((resolve) => {
    const handler = (data) => {
      if (data.toString().includes(keyword)) {
        proc.stdout?.off('data', handler)
        proc.stderr?.off('data', handler)
        resolve()
      }
    }
    proc.stdout?.on('data', handler)
    proc.stderr?.on('data', handler)
  })
}

async function startDevServers() {
  const npx = process.platform === 'win32' ? 'npx.cmd' : 'npx'

  viteProcess = spawn(npx, ['vite', '--host', '0.0.0.0', '--port', String(VITE_PORT)], {
    cwd: path.join(__dirname, '..'),
    stdio: 'pipe',
    shell: process.platform === 'win32'
  })

  viteProcess.stdout.on('data', (d) => process.stdout.write(`[vite] ${d}`))
  viteProcess.stderr.on('data', (d) => process.stderr.write(`[vite] ${d}`))

  serverProcess = fork(path.join(__dirname, '..', 'server', 'server.js'), [], {
    env: { ...process.env, PORT: String(BACKEND_PORT) },
    stdio: 'pipe'
  })

  serverProcess.stdout.on('data', (d) => process.stdout.write(`[server] ${d}`))
  serverProcess.stderr.on('data', (d) => process.stderr.write(`[server] ${d}`))

  await Promise.all([
    waitForOutput(viteProcess, 'Local:'),
    waitForUrl(`http://127.0.0.1:${BACKEND_PORT}/api/health`)
  ])
}

async function startProductionServer() {
  const serverPath = path.join(app.getAppPath(), 'server', 'server.js')

  serverProcess = fork(serverPath, [], {
    env: { ...process.env, PORT: String(BACKEND_PORT) },
    stdio: 'pipe'
  })

  serverProcess.stdout.on('data', (d) => process.stdout.write(`[server] ${d}`))
  serverProcess.stderr.on('data', (d) => process.stderr.write(`[server] ${d}`))

  await waitForUrl(`http://127.0.0.1:${BACKEND_PORT}/api/health`)
}

async function loadFrontend() {
  if (isDev) {
    mainWindow.loadURL(`http://127.0.0.1:${VITE_PORT}`)
    mainWindow.webContents.openDevTools()
  } else {
    mainWindow.loadFile(path.join(__dirname, '..', 'dist', 'index.html'))
  }
}

app.whenReady().then(async () => {
  createWindow()

  try {
    if (isDev) {
      await startDevServers()
    } else {
      await startProductionServer()
    }
    await loadFrontend()
  } catch (err) {
    console.error('Failed to start:', err)
    dialog.showErrorBox('Startup Error', `Failed to start:\n${err.message}\n\nCheck the console for details.`)
    app.quit()
  }

  app.on('activate', () => {
    if (BrowserWindow.getAllWindows().length === 0) {
      createWindow()
    }
  })
})

app.on('window-all-closed', () => {
  if (process.platform !== 'darwin') {
    app.quit()
  }
})

app.on('will-quit', () => {
  if (serverProcess) {
    serverProcess.kill()
    serverProcess = null
  }
  if (viteProcess) {
    viteProcess.kill()
    viteProcess = null
  }
})

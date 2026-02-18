import { app, BrowserWindow, ipcMain, screen, Tray, Menu } from "electron";
import path from "path";
import { fileURLToPath } from "url";
import fs from "fs";

import { attach, detach, reset } from "electron-as-wallpaper";
const gotLock = app.requestSingleInstanceLock();
if (!gotLock) {
  app.quit();
} else {
  app.on("second-instance", () => {
    if (controlWin) {
      try { controlWin.show(); controlWin.focus(); } catch {}
    }
  });
}

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

let wallpaperWin;
let controlWin;
let tray;

  const WALLPAPERS_DIR = getWallpapersDir();
const CONFIG_PATH = path.join(app.getPath("userData"), "config.json");
function getAppRoot() {
  // En dev: __dirname (carpeta del proyecto)
  // En prod: process.resourcesPath (carpeta "resources" del build)
  return app.isPackaged ? process.resourcesPath : __dirname;
}

function getAssetPath(...parts) {
  return path.join(getAppRoot(), "assets", ...parts);
}

function getWallpapersDir() {
  return path.join(getAppRoot(), "wallpapers");
}

// Motor de playlist
let rotationTimer = null;

function defaultConfig() {
  return {
    lastMode: "single",
    lastSingle: null,
    playlists: [],
    activePlaylistId: null,
    openAtLogin: false
  };
}

function readConfig() {
  try {
    const raw = fs.readFileSync(CONFIG_PATH, "utf-8");
    const parsed = JSON.parse(raw);
    return { ...defaultConfig(), ...parsed };
  } catch {
    return defaultConfig();
  }
}

function writeConfig(next) {
  try {
    fs.mkdirSync(path.dirname(CONFIG_PATH), { recursive: true });
    fs.writeFileSync(CONFIG_PATH, JSON.stringify(next, null, 2), "utf-8");
  } catch (e) {
    console.error("No pude guardar config:", e);
  }
}

function isVideo(fileName) {
  const ext = path.extname(fileName).toLowerCase();
  return ext === ".mp4" || ext === ".webm";
}

// --- helpers preview ---
function findPreviewForVideo(absVideoPath) {
  const dir = path.dirname(absVideoPath);
  const base = path.basename(absVideoPath, path.extname(absVideoPath));
  const candidates = [
    path.join(dir, base + ".png"),
    path.join(dir, base + ".jpg"),
    path.join(dir, base + ".jpeg"),
    path.join(dir, base + ".webp"),
  ];
  return candidates.find((p) => fs.existsSync(p)) || null;
}

function findPreviewForWebFolder(absFolderPath) {
  const candidates = [
    path.join(absFolderPath, "preview.png"),
    path.join(absFolderPath, "preview.jpg"),
    path.join(absFolderPath, "preview.jpeg"),
    path.join(absFolderPath, "preview.webp"),
  ];
  return candidates.find((p) => fs.existsSync(p)) || null;
}

// --- reemplazá listWallpapers por esta versión ---
function listWallpapers() {
  // Devuelve: [{ id, name, type: "web"|"video", absPath, previewPath|null }]
  const results = [];
  if (!fs.existsSync(WALLPAPERS_DIR)) return results;

  const entries = fs.readdirSync(WALLPAPERS_DIR, { withFileTypes: true });

  for (const ent of entries) {
    const abs = path.join(WALLPAPERS_DIR, ent.name);

    // WEB wallpaper: carpeta con index.html
    if (ent.isDirectory()) {
      const indexHtml = path.join(abs, "index.html");
      if (fs.existsSync(indexHtml)) {
        results.push({
          id: "web:" + ent.name,
          name: ent.name,
          type: "web",
          absPath: indexHtml,
          previewPath: findPreviewForWebFolder(abs),
        });
      }
      continue;
    }

    // VIDEO wallpaper: archivo mp4/webm
    if (ent.isFile() && isVideo(ent.name)) {
      results.push({
        id: "video:" + ent.name,
        name: ent.name,
        type: "video",
        absPath: abs,
        previewPath: findPreviewForVideo(abs),
      });
    }
  }

  results.sort((a, b) => a.name.localeCompare(b.name, "es"));
  return results;
}

function uid() {
  return Math.random().toString(16).slice(2) + "-" + Date.now().toString(16);
}

function getActivePlaylist(cfg) {
  if (!cfg.activePlaylistId) return null;
  return cfg.playlists.find((p) => p.id === cfg.activePlaylistId) || null;
}

function stopRotation() {
  if (rotationTimer) clearInterval(rotationTimer);
  rotationTimer = null;
}

function applyWallpaper(payload) {
  if (wallpaperWin) wallpaperWin.webContents.send("set-wallpaper", payload);
}

function pickNextIndex(playlist) {
  if (!playlist.items.length) return 0;

  if (playlist.random) {
    if (playlist.items.length === 1) return 0;
    let next = Math.floor(Math.random() * playlist.items.length);
    if (next === playlist.currentIndex)
      next = (next + 1) % playlist.items.length;
    return next;
  }

  return (playlist.currentIndex + 1) % playlist.items.length;
}

function startRotationFromConfig() {
  const cfg = readConfig();
  stopRotation();

  if (cfg.lastMode !== "playlist") return;

  const pl = getActivePlaylist(cfg);
  if (!pl || !pl.items.length) return;

  pl.currentIndex = Math.max(
    0,
    Math.min(pl.currentIndex || 0, pl.items.length - 1),
  );
  const current = pl.items[pl.currentIndex] || pl.items[0];
  applyWallpaper({ type: current.type, path: current.path });

  const intervalSec = Math.max(3, Number(pl.intervalSec || 30));

  rotationTimer = setInterval(() => {
    const cfg2 = readConfig();
    const pl2 = getActivePlaylist(cfg2);
    if (!pl2 || !pl2.items.length) return;

    const nextIndex = pickNextIndex(pl2);
    pl2.currentIndex = nextIndex;

    const nextItem = pl2.items[nextIndex];
    applyWallpaper({ type: nextItem.type, path: nextItem.path });

    writeConfig(cfg2);
  }, intervalSec * 1000);

  writeConfig(cfg);
}

function createTray() {
const iconPath = getAssetPath("tray.ico");
  tray = new Tray(iconPath);
  tray.setToolTip("Wallpaper Clone");

  const contextMenu = Menu.buildFromTemplate([
    {
      label: "Abrir control",
      click: () => {
        if (!controlWin) createControlWindow();
        controlWin.show();
        controlWin.focus();
      },
    },
    { type: "separator" },
    {
      label: "Salir",
      click: () => {
        app.isQuiting = true;
        app.quit();
      },
    },
  ]);

  tray.setContextMenu(contextMenu);

  tray.on("double-click", () => {
    if (!controlWin) createControlWindow();
    controlWin.show();
    controlWin.focus();
  });

  tray.on("click", () => {
    if (!controlWin) createControlWindow();
    controlWin.show();
    controlWin.focus();
  });
}

function createWallpaperWindow() {
  const { width, height } = screen.getPrimaryDisplay().workAreaSize;

  wallpaperWin = new BrowserWindow({
    x: 0,
    y: 0,
    width,
    height,
    frame: false,
    transparent: true,
    resizable: false,
    movable: false,
    fullscreen: true,
    skipTaskbar: true,
    focusable: false,
    hasShadow: false,
    webPreferences: {
      nodeIntegration: true,
      contextIsolation: false,
    },
    
  });

  wallpaperWin.setMenuBarVisibility(false);
  wallpaperWin.setAlwaysOnTop(false, "screen-saver");
  wallpaperWin.loadFile(path.join(__dirname, "wallpaper", "index.html"));

    wallpaperWin.webContents.once("did-finish-load", () => {
    let attached = false;

    try {
      attach(wallpaperWin, {
        transparent: true,
        forwardKeyboardInput: false,
        forwardMouseInput: false,
      });
      attached = true;
    } catch (err) {
      console.error("attach() falló:", err);
    }

    // SI NO SE PUDO "PEGAR" AL DESKTOP => ocultar para no tapar todo
    if (!attached) {
      try { wallpaperWin.hide(); } catch {}
      return;
    }

    // por las dudas, reforzar ignore mouse
    try { wallpaperWin.setIgnoreMouseEvents(true, { forward: false }); } catch {}

    const cfg = readConfig();

    if (cfg.lastMode === "single" && cfg.lastSingle) {
      applyWallpaper(cfg.lastSingle);
    }
    if (cfg.lastMode === "playlist") {
      startRotationFromConfig();
    }
  });

    // CLAVE: que no intercepte clicks (si no, tapa todo)
  try {
    wallpaperWin.setIgnoreMouseEvents(true, { forward: false });
  } catch {}
}

function createControlWindow() {
  controlWin = new BrowserWindow({
    title: "Wallpaper Clone",
    width: 1090,
    height: 750,
    minWidth: 1090, // <-- clave
    minHeight: 750, // <-- clave
    resizable: true,
    autoHideMenuBar: true,
    webPreferences: {
      nodeIntegration: true,
      contextIsolation: false,
    },
  });

  controlWin.setMenuBarVisibility(false);

  // (Opcional) Para que abra centrado y consistente
  controlWin.center();

  controlWin.loadFile(path.join(__dirname, "control", "index.html"));
controlWin.on("hide", () => {
    try {
      controlWin.webContents.setBackgroundThrottling(true);
    } catch {}
  });

  controlWin.on("show", () => {
    try {
      controlWin.webContents.setBackgroundThrottling(false);
    } catch {}
  });

  controlWin.on("minimize", () => {
    try {
      controlWin.webContents.setBackgroundThrottling(true);
    } catch {}
  });


  controlWin.on("close", (e) => {
    if (app.isQuiting) return;
    e.preventDefault();
    controlWin.hide();
  });
}
ipcMain.handle("list-wallpapers", () => listWallpapers());
ipcMain.handle("get-config", () => readConfig());

ipcMain.handle("save-config", (event, nextCfg) => {
  const cfg = { ...defaultConfig(), ...nextCfg };
  writeConfig(cfg);
  return cfg;
});

ipcMain.handle("get-open-at-login", () => {
  // devuelve lo que dice Windows ahora
  try {
    const s = app.getLoginItemSettings();
    return { ok: true, openAtLogin: !!s.openAtLogin };
  } catch (e) {
    return { ok: false, openAtLogin: false, error: String(e) };
  }
});

ipcMain.handle("set-open-at-login", (event, nextValue) => {
  const openAtLogin = !!nextValue;

  try {
    app.setLoginItemSettings({
      openAtLogin,
      path: app.getPath("exe") // ayuda en algunos casos en Windows
    });
  } catch (e) {
    return { ok: false, openAtLogin, error: String(e) };
  }

  // persistimos preferencia en config
  const cfg = readConfig();
  cfg.openAtLogin = openAtLogin;
  writeConfig(cfg);

  return { ok: true, openAtLogin };
});


ipcMain.on("set-wallpaper", (event, payload) => {
  applyWallpaper(payload);

  const cfg = readConfig();
  cfg.lastMode = "single";
  cfg.lastSingle = payload;
  writeConfig(cfg);

  stopRotation();
});

ipcMain.on("start-playlist", (event, playlistId) => {
  const cfg = readConfig();
  cfg.lastMode = "playlist";
  cfg.activePlaylistId = playlistId;

  const pl = getActivePlaylist(cfg);
  if (pl) {
    pl.currentIndex = Math.max(
      0,
      Math.min(pl.currentIndex || 0, (pl.items?.length || 1) - 1),
    );
  }

  writeConfig(cfg);
  startRotationFromConfig();
});

ipcMain.on("stop-playlist", () => {
  stopRotation();
  const cfg = readConfig();
  cfg.lastMode = "single";
  writeConfig(cfg);
});

ipcMain.on("reset-wallpaper", () => {
  try {
    reset();
  } catch (err) {
    console.error("reset() falló:", err);
  }

  stopRotation();

  const cfg = readConfig();
  cfg.lastMode = "single";
  cfg.lastSingle = null;
  writeConfig(cfg);
});
ipcMain.handle("control-toggle-full", () => {
  if (!controlWin) return { ok: false };

  // Si está maximizada => volver a tamaño compact (1075x750) centrado
  if (controlWin.isMaximized()) {
    controlWin.unmaximize();
    controlWin.setSize(1090, 750, true);
    controlWin.center();
    controlWin.show();
    controlWin.focus();
    return { ok: true, mode: "compact" };
  }

  // Si NO está maximizada => maximizar
  controlWin.maximize();
  controlWin.show();
  controlWin.focus();
  return { ok: true, mode: "full" };
});

app.whenReady().then(() => {
  try {
    try { Menu.setApplicationMenu(null); } catch {}
    try { app.setAppUserModelId("com.feder.wallpaperclone"); } catch {}
  } catch {}

  // aplicar preferencia de inicio con Windows (si existe)
  const cfg = readConfig();
  if (typeof cfg.openAtLogin === "boolean") {
    try {
      app.setLoginItemSettings({
        openAtLogin: cfg.openAtLogin,
        path: app.getPath("exe"),
      });
    } catch {}
  }

  createWallpaperWindow();
  createControlWindow();
  createTray();
});


app.on("before-quit", () => {
  app.isQuiting = true;
  stopRotation();
  try {
    if (wallpaperWin) detach(wallpaperWin);
  } catch {}
});

app.on("window-all-closed", () => {
  // con tray, no hacemos quit acá.
});

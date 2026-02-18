# Wallpaper Clone

Desktop wallpaper engine for Windows built with Electron.  
Motor de wallpapers para Windows desarrollado con Electron.

---

## 🇬🇧 English

### What is this?

Wallpaper Clone is a lightweight desktop application that lets you:

- Use videos or web wallpapers as your desktop background
- Create playlists of wallpapers
- Automatically rotate wallpapers over time
- Start with Windows
- Run silently in the background using minimal resources

The app is designed to behave like a real desktop utility:
- system tray based
- persistent configuration
- low CPU/GPU usage when minimized
- stable Windows startup integration


### Features

- 🎬 Video wallpapers
- 🌐 Web wallpapers
- 📂 Playlist system
- ⏱ Rotation intervals
- 🖥 Runs in system tray
- 🚀 Start with Windows
- 💤 Background silent mode
- 💾 Persistent config


### Installation (recommended)

1. Download the installer from Releases.
2. Run:

Wallpaper Clone Setup.exe

3. Launch the app.
4. Enable **Start with Windows** if desired.


### Running from source

Requirements:
- Node.js
- npm

Install:

npm install

Run in dev mode:

npm run dev


### Build

npm run dist

Output:

dist/
  Wallpaper Clone Setup.exe


### Wallpapers folder

Wallpapers must be placed in:

/wallpapers

Preview images must:

- have the same filename as the video/web wallpaper
- be .jpg or .png

Example:

rain.mp4  
rain.jpg


### Playlists

- Create a playlist
- Add wallpapers
- Choose interval
- Choose order or random
- Start playlist


### Autostart

The "Start with Windows" option registers the installed app.

Important:

Do not enable autostart from win-unpacked builds.  
Only from the installed version.


### Background mode

When the control window is hidden:

- UI rendering stops
- CPU and GPU usage drop
- wallpaper continues
- playlists continue

This keeps the app lightweight.


---

## 🇪🇸 Español

### ¿Qué es?

Wallpaper Clone es una aplicación de escritorio para Windows que permite:

- Usar videos o páginas web como fondo de pantalla
- Crear playlists de wallpapers
- Rotarlos automáticamente
- Iniciar junto con Windows
- Ejecutarse en segundo plano con bajo consumo


### Funcionalidades

- 🎬 Wallpapers en video
- 🌐 Wallpapers web
- 📂 Sistema de playlists
- ⏱ Intervalos automáticos
- 🖥 Tray del sistema
- 🚀 Inicio con Windows
- 💤 Modo silencioso
- 💾 Configuración persistente


### Instalación (recomendada)

1. Descargar el instalador desde Releases
2. Ejecutar:

Wallpaper Clone Setup.exe

3. Abrir la app
4. Activar **Iniciar con Windows** si se desea


### Ejecutar desde el código

Requisitos:
- Node.js
- npm

Instalar:

npm install

Modo desarrollo:

npm run dev


### Build

npm run dist

Salida:

dist/
  Wallpaper Clone Setup.exe


### Carpeta de wallpapers

Los wallpapers deben colocarse en:

/wallpapers

Las previews:

- mismo nombre que el wallpaper
- formato .jpg o .png

Ejemplo:

cyberpunk.mp4  
cyberpunk.jpg


### Playlists

- Crear playlist
- Agregar wallpapers
- Definir intervalo
- Elegir orden o aleatorio
- Iniciar playlist


### Inicio con Windows

La opción registra la app instalada.

Importante:

No activarlo desde win-unpacked.  
Solo desde la versión instalada.


### Modo silencioso

Cuando la ventana se oculta:

- la UI deja de renderizar
- baja consumo CPU/GPU
- wallpaper sigue activo
- playlists continúan


---

## Tech stack

- Electron
- Node.js
- electron-as-wallpaper


## License

Personal project / hobby software.

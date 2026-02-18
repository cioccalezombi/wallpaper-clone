const { ipcRenderer } = require("electron");

const elWallpaperList = document.getElementById("wallpaperList");
const btnRefresh = document.getElementById("refresh");
const btnReset = document.getElementById("reset");
const btnToggleCompact = document.getElementById("toggleCompact");
const searchInput = document.getElementById("search");

const btnPrevPage = document.getElementById("prevPage");
const btnNextPage = document.getElementById("nextPage");
const pageInfo = document.getElementById("pageInfo");

const newPlaylistName = document.getElementById("newPlaylistName");
const btnCreatePlaylist = document.getElementById("createPlaylist");
const playlistSelect = document.getElementById("playlistSelect");
const btnDeletePlaylist = document.getElementById("deletePlaylist");

const intervalSec = document.getElementById("intervalSec");
const modeSelect = document.getElementById("modeSelect");
const btnSavePlaylistSettings = document.getElementById("savePlaylistSettings");
const btnStartPlaylist = document.getElementById("startPlaylist");
const btnStopPlaylist = document.getElementById("stopPlaylist");

const playlistItems = document.getElementById("playlistItems");
const modalBackdrop = document.getElementById("retroModalBackdrop");
const modalMsg = document.getElementById("retroModalMsg");
const modalOk = document.getElementById("retroModalOk");
const chkOpenAtLogin = document.getElementById("openAtLogin");

let lastActiveEl = null;

function showRetroAlert(message, title = "Wallpaper Clone") {
  // guardar foco actual
  lastActiveEl = document.activeElement;

  // set title (por si querés cambiarlo en el futuro)
  const titleEl = document.getElementById("retroModalTitle");
  if (titleEl) titleEl.textContent = title;

  modalMsg.textContent = message;
  modalBackdrop.style.display = "grid";

  // enfocar el botón OK para que Enter funcione
  setTimeout(() => modalOk.focus(), 0);
}

function closeRetroAlert() {
  modalBackdrop.style.display = "none";

  // restaurar foco para evitar el bug de “no puedo escribir”
  if (lastActiveEl && typeof lastActiveEl.focus === "function") {
    setTimeout(() => lastActiveEl.focus(), 0);
  } else {
    // fallback: enfocar el input de búsqueda si existe
    const s = document.getElementById("search");
    if (s) setTimeout(() => s.focus(), 0);
  }
  lastActiveEl = null;
}

// OK button
modalOk.addEventListener("click", closeRetroAlert);

// Click fuera del modal cierra también
modalBackdrop.addEventListener("click", (e) => {
  if (e.target === modalBackdrop) closeRetroAlert();
});

// Enter / Escape
document.addEventListener("keydown", (e) => {
  if (modalBackdrop.style.display === "none") return;

  if (e.key === "Escape") {
    e.preventDefault();
    closeRetroAlert();
  }
  if (e.key === "Enter") {
    e.preventDefault();
    closeRetroAlert();
  }
});


let cfg = null;
let availableWallpapers = [];
let query = "";

// paginación
const PAGE_SIZE = 5;
let currentPage = 0;

function uid() {
  return Math.random().toString(16).slice(2) + "-" + Date.now().toString(16);
}

function getActivePlaylist() {
  if (!cfg?.activePlaylistId) return null;
  return cfg.playlists.find(p => p.id === cfg.activePlaylistId) || null;
}

function saveConfig() {
  return ipcRenderer.invoke("save-config", cfg).then((saved) => {
    cfg = saved;
    return cfg;
  });
}

function ensureActivePlaylist() {
  if (!cfg.playlists.length) { cfg.activePlaylistId = null; return; }
  if (!cfg.activePlaylistId || !cfg.playlists.some(p => p.id === cfg.activePlaylistId)) {
    cfg.activePlaylistId = cfg.playlists[0].id;
  }
}

function fileUrl(p) {
  return p ? ("file://" + p.replace(/\\/g, "/")) : null;
}

function matchesSearch(it) {
  if (!query) return true;
  return (it.name || "").toLowerCase().includes(query);
}

function getFilteredWallpapers() {
  return availableWallpapers.filter(matchesSearch);
}

function clampPage() {
  const total = getFilteredWallpapers().length;
  const maxPage = Math.max(0, Math.ceil(total / PAGE_SIZE) - 1);
  currentPage = Math.max(0, Math.min(currentPage, maxPage));
}

function updatePager() {
  const total = getFilteredWallpapers().length;
  const totalPages = Math.max(1, Math.ceil(total / PAGE_SIZE));
  const shownPage = Math.min(totalPages, currentPage + 1);

  pageInfo.textContent = `${shownPage}/${totalPages}`;

  btnPrevPage.disabled = currentPage <= 0;
  btnNextPage.disabled = currentPage >= (totalPages - 1);
}

function renderWallpaperList() {
  elWallpaperList.innerHTML = "";

  const items = getFilteredWallpapers();
  clampPage();
  updatePager();

  if (!items.length) {
    elWallpaperList.innerHTML = `<div style="opacity:.8">No hay resultados.</div>`;
    return;
  }

  const start = currentPage * PAGE_SIZE;
  const pageItems = items.slice(start, start + PAGE_SIZE);

  for (const it of pageItems) {
    const div = document.createElement("div");
    div.className = "card";

    const thumb = document.createElement("div");
    thumb.className = "thumb";

    if (it.previewPath) {
      const img = document.createElement("img");
      img.src = fileUrl(it.previewPath);
      img.alt = it.name;
      thumb.appendChild(img);
    } else {
      const ph = document.createElement("div");
      ph.className = "ph";
      ph.textContent = "SIN\nPREVIEW";
      thumb.appendChild(ph);
    }

    const main = document.createElement("div");
    main.className = "cardMain";

    const nameRow = document.createElement("div");
    nameRow.className = "nameRow";

    const name = document.createElement("div");
    name.className = "name";
    name.textContent = it.name;

    const badge = document.createElement("span");
    badge.className = "badge";
    badge.textContent = it.type === "video" ? "VIDEO" : "WEB";

    nameRow.appendChild(name);
    nameRow.appendChild(badge);

    const btnRow = document.createElement("div");
    btnRow.className = "btnRow";

    const btnApply = document.createElement("button");
    btnApply.className = "btn red pixel";
    btnApply.textContent = "Aplicar";
    btnApply.addEventListener("click", () => {
      ipcRenderer.send("set-wallpaper", { type: it.type, path: it.absPath });
    });

    const btnAdd = document.createElement("button");
    btnAdd.className = "btn blue pixel";
    btnAdd.textContent = "Agregar";
    btnAdd.addEventListener("click", async () => {
      ensureActivePlaylist();
      const pl = getActivePlaylist();
      if (!pl) { showRetroAlert("Creá una playlist primero."); return; }
      pl.items = pl.items || [];
      pl.items.push({ type: it.type, path: it.absPath, name: it.name, previewPath: it.previewPath || null });
      await saveConfig();
      renderPlaylistsUI();
    });

    btnRow.appendChild(btnApply);
    btnRow.appendChild(btnAdd);

    main.appendChild(nameRow);
    main.appendChild(btnRow);

    div.appendChild(thumb);
    div.appendChild(main);
    elWallpaperList.appendChild(div);
  }
}

/** Playlists */
function renderPlaylistSelect() {
  playlistSelect.innerHTML = "";

  if (!cfg.playlists.length) {
    const opt = document.createElement("option");
    opt.value = "";
    opt.textContent = "No hay playlists";
    playlistSelect.appendChild(opt);
    return;
  }

  for (const p of cfg.playlists) {
    const opt = document.createElement("option");
    opt.value = p.id;
    opt.textContent = p.name;
    playlistSelect.appendChild(opt);
  }

  playlistSelect.value = cfg.activePlaylistId || cfg.playlists[0].id;
}

function renderPlaylistSettings() {
  const pl = getActivePlaylist();
  if (!pl) { intervalSec.value = 30; modeSelect.value = "order"; return; }
  intervalSec.value = Number(pl.intervalSec || 30);
  modeSelect.value = pl.random ? "random" : "order";
}

function renderPlaylistItems() {
  playlistItems.innerHTML = "";
  const pl = getActivePlaylist();

  if (!pl) {
    playlistItems.innerHTML = `<div style="opacity:.8">Creá una playlist para ver items.</div>`;
    return;
  }

  if (!pl.items?.length) {
    playlistItems.innerHTML = `<div style="opacity:.8">Playlist vacía. Agregá items con “Agregar”.</div>`;
    return;
  }

  pl.items.forEach((it, idx) => {
    const div = document.createElement("div");
    div.className = "card";

    const thumb = document.createElement("div");
    thumb.className = "thumb";

    if (it.previewPath) {
      const img = document.createElement("img");
      img.src = fileUrl(it.previewPath);
      img.alt = it.name;
      thumb.appendChild(img);
    } else {
      const ph = document.createElement("div");
      ph.className = "ph";
      ph.textContent = "SIN\nPREVIEW";
      thumb.appendChild(ph);
    }

    const main = document.createElement("div");
    main.className = "cardMain";

    const nameRow = document.createElement("div");
    nameRow.className = "nameRow";

    const name = document.createElement("div");
    name.className = "name";
    name.textContent = `${idx + 1}. ${it.name}`;

    const badge = document.createElement("span");
    badge.className = "badge";
    badge.textContent = it.type === "video" ? "VIDEO" : "WEB";

    nameRow.appendChild(name);
    nameRow.appendChild(badge);

    const topRow = document.createElement("div");
    topRow.className = "btnRow";

    const btnUp = document.createElement("button");
    btnUp.className = "btn purple pixel";
    btnUp.textContent = "↑";
    btnUp.disabled = idx === 0;
    btnUp.addEventListener("click", async () => {
      const tmp = pl.items[idx - 1];
      pl.items[idx - 1] = pl.items[idx];
      pl.items[idx] = tmp;
      await saveConfig();
      renderPlaylistsUI();
    });

    const btnDown = document.createElement("button");
    btnDown.className = "btn purple pixel";
    btnDown.textContent = "↓";
    btnDown.disabled = idx === pl.items.length - 1;
    btnDown.addEventListener("click", async () => {
      const tmp = pl.items[idx + 1];
      pl.items[idx + 1] = pl.items[idx];
      pl.items[idx] = tmp;
      await saveConfig();
      renderPlaylistsUI();
    });

    topRow.appendChild(btnUp);
    topRow.appendChild(btnDown);

    const bottomRow = document.createElement("div");
    bottomRow.className = "btnRow";

    const btnPlay = document.createElement("button");
    btnPlay.className = "btn green pixel";
    btnPlay.textContent = "Reproducir";
    btnPlay.addEventListener("click", async () => {
      pl.currentIndex = idx;
      await saveConfig();
      ipcRenderer.send("start-playlist", pl.id);
    });

    const btnRemove = document.createElement("button");
    btnRemove.className = "btn red pixel";
    btnRemove.textContent = "🗑";
    btnRemove.addEventListener("click", async () => {
      pl.items.splice(idx, 1);
      if (pl.currentIndex >= pl.items.length) pl.currentIndex = 0;
      await saveConfig();
      renderPlaylistsUI();
    });

    bottomRow.appendChild(btnPlay);
    bottomRow.appendChild(btnRemove);

    main.appendChild(nameRow);
    main.appendChild(topRow);
    main.appendChild(bottomRow);

    div.appendChild(thumb);
    div.appendChild(main);
    playlistItems.appendChild(div);
  });
}

function renderPlaylistsUI() {
  ensureActivePlaylist();
  renderPlaylistSelect();
  renderPlaylistSettings();
  renderPlaylistItems();
}

async function loadAll() {
  cfg = await ipcRenderer.invoke("get-config");
  async function loadStartupSetting() {
  if (!chkOpenAtLogin) return;

  const res = await ipcRenderer.invoke("get-open-at-login");
  if (res && res.ok) chkOpenAtLogin.checked = !!res.openAtLogin;

  // si querés, sincronizás cfg.openAtLogin con lo que devuelve Windows
  if (cfg) cfg.openAtLogin = !!(res && res.ok && res.openAtLogin);
}

  ensureActivePlaylist();
  availableWallpapers = await ipcRenderer.invoke("list-wallpapers");
  currentPage = 0;
  renderWallpaperList();
  renderPlaylistsUI();
  await loadStartupSetting();

}
if (chkOpenAtLogin) {
  chkOpenAtLogin.addEventListener("change", async () => {
    const want = chkOpenAtLogin.checked;

    const res = await ipcRenderer.invoke("set-open-at-login", want);
    if (!res || !res.ok) {
      // si estás usando tu modal retro:
      // showRetroAlert("No pude cambiar el inicio con Windows.\n" + (res?.error || ""));
      // si no:
      alert("No pude cambiar el inicio con Windows.\n" + (res?.error || ""));
      // revertimos el check
      chkOpenAtLogin.checked = !want;
      return;
    }

    // opcional: guardar en cfg
    if (cfg) {
      cfg.openAtLogin = !!res.openAtLogin;
      await saveConfig();
    }
  });
}

/** Events */
btnRefresh.addEventListener("click", loadAll);
btnReset.addEventListener("click", () => ipcRenderer.send("reset-wallpaper"));

btnToggleCompact.textContent = "Full"; // arranca en compacto

btnToggleCompact.addEventListener("click", async () => {
  const res = await ipcRenderer.invoke("control-toggle-full");
  if (!res || !res.ok) return;

  // Si el main devolvió "full" => mostramos "Compact" (para volver a chico)
  // Si devolvió "compact" => mostramos "Full" (para maximizar)
  btnToggleCompact.textContent = (res.mode === "full") ? "Compact" : "Full";
});
searchInput.addEventListener("input", () => {
  query = (searchInput.value || "").trim().toLowerCase();
  currentPage = 0;
  renderWallpaperList();
});

btnPrevPage.addEventListener("click", () => { currentPage--; renderWallpaperList(); });
btnNextPage.addEventListener("click", () => { currentPage++; renderWallpaperList(); });

btnCreatePlaylist.addEventListener("click", async () => {
  const name = (newPlaylistName.value || "").trim();
  if (!name) return;

  cfg.playlists.push({
    id: uid(),
    name,
    items: [],
    intervalSec: 30,
    random: false,
    currentIndex: 0,
  });

  cfg.activePlaylistId = cfg.playlists[cfg.playlists.length - 1].id;
  newPlaylistName.value = "";
  await saveConfig();
  renderPlaylistsUI();
});

playlistSelect.addEventListener("change", async () => {
  cfg.activePlaylistId = playlistSelect.value || null;
  await saveConfig();
  renderPlaylistsUI();
});

btnDeletePlaylist.addEventListener("click", async () => {
  const id = playlistSelect.value;
  if (!id) return;

  cfg.playlists = cfg.playlists.filter(p => p.id !== id);
  if (cfg.activePlaylistId === id) cfg.activePlaylistId = cfg.playlists[0]?.id || null;
  if (!cfg.activePlaylistId) cfg.lastMode = "single";

  await saveConfig();
  renderPlaylistsUI();
});

btnSavePlaylistSettings.addEventListener("click", async () => {
  const pl = getActivePlaylist();
  if (!pl) return;

  pl.intervalSec = Math.max(3, Number(intervalSec.value || 30));
  pl.random = modeSelect.value === "random";
  await saveConfig();
  renderPlaylistsUI();
});

btnStartPlaylist.addEventListener("click", async () => {
  const pl = getActivePlaylist();
  if (!pl) { showRetroAlert("Creá y seleccioná una playlist primero."); return; }
  if (!pl.items?.length) { showRetroAlert("La playlist está vacía."); return; }

  pl.intervalSec = Math.max(3, Number(intervalSec.value || 30));
  pl.random = modeSelect.value === "random";
  await saveConfig();

  ipcRenderer.send("start-playlist", pl.id);
});

btnStopPlaylist.addEventListener("click", async () => {
  ipcRenderer.send("stop-playlist");
  cfg.lastMode = "single";
  await saveConfig();
});

loadAll();


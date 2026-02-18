const { ipcRenderer } = require("electron");

const root = document.getElementById("root");

function clearRoot() {
  root.innerHTML = "";
  root.style.width = "100%";
  root.style.height = "100%";
}

function setWeb(filePath) {
  clearRoot();
  const iframe = document.createElement("iframe");
  iframe.src = "file://" + filePath;
  iframe.style.width = "100%";
  iframe.style.height = "100%";
  iframe.style.border = "0";
  root.appendChild(iframe);
}

function setVideo(filePath) {
  clearRoot();
  const video = document.createElement("video");
  video.src = "file://" + filePath;
  video.autoplay = true;
  video.loop = true;
  video.muted = true;
  video.playsInline = true;
  video.style.width = "100%";
  video.style.height = "100%";
  video.style.objectFit = "cover";
  root.appendChild(video);

  video.addEventListener("error", () => {
    console.error("Error reproduciendo video:", video.error);
  });
}

ipcRenderer.on("set-wallpaper", (event, payload) => {
  if (!payload) return;
  if (payload.type === "web") setWeb(payload.path);
  if (payload.type === "video") setVideo(payload.path);
});



const { BrowserWindow } = require("electron");
const path = require("path");

let authWindow, reAuthWindow, infoWindow;

function createSimpleWindow() {
  const window = new BrowserWindow({
    width: 700,
    height: 300,
    icon: path.join(__dirname, "..", "assets", "images", "logo_color.png"),
    webPreferences: {
      nodeIntegration: true,
    },
  });
  window.setMenuBarVisibility(false);
  return window;
}

async function openAuthWindow() {
  authWindow = createSimpleWindow();
  await authWindow.loadFile(path.join(__dirname, "auth.html"));
  return authWindow;
}

function closeAuthWindow() {
  if (authWindow) {
    authWindow.close();
  }
}

async function openReAuthWindow() {
  reAuthWindow = createSimpleWindow();
  await reAuthWindow.loadFile(path.join(__dirname, "reAuth.html"));
  return reAuthWindow;
}

function closeReAuthWindow() {
  if (reAuthWindow) {
    reAuthWindow.close();
  }
}

async function openInfoWindow() {
  infoWindow = createSimpleWindow();
  await infoWindow.loadFile(path.join(__dirname, "info.html"));
  return infoWindow;
}

module.exports = {
  openAuthWindow,
  closeAuthWindow,
  openReAuthWindow,
  closeReAuthWindow,
  openInfoWindow,
};

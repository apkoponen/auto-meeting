const { BrowserWindow } = require("electron");
const path = require("path");

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
  const authWindow = createSimpleWindow();
  await authWindow.loadFile(path.join(__dirname, "auth.html"));
  return authWindow;
}

async function openReAuthWindow() {
  const reAuthWindow = createSimpleWindow();
  await reAuthWindow.loadFile(path.join(__dirname, "reAuth.html"));
  return reAuthWindow;
}

module.exports = {
  openAuthWindow,
  openReAuthWindow,
};

const { BrowserWindow } = require("electron");
const path = require("path");

async function openAuthWindow() {
  const authWindow = new BrowserWindow({
    width: 700,
    height: 300,
    icon: path.join(__dirname, "..", "assets", "images", "logo_color.png"),
    webPreferences: {
      nodeIntegration: true,
    },
  });
  authWindow.setMenuBarVisibility(false);

  await authWindow.loadFile(path.join(__dirname, "auth.html"));

  return authWindow;
}

module.exports = {
  openAuthWindow,
};

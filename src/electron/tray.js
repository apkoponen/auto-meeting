const path = require("path");
const { app, Menu, Tray, BrowserWindow } = require("electron");

function createTrayMenu() {
  const tray = new Tray(
    path.join(__dirname, "..", "assets", "images", "logo_white.png")
  );
  const contextMenu = Menu.buildFromTemplate([
    {
      label: "Open",
      click: async () => {
        // Create the browser window.
        const mainWindow = new BrowserWindow({
          width: 800,
          height: 600,
        });

        // and load the index.html of the app.
        mainWindow.loadFile(path.join(__dirname, "index.html"));

        // Open the DevTools.
        mainWindow.webContents.openDevTools();

        //await shell.openExternal('https://electronjs.org')
      },
    },
    {
      label: "Quit",
      click: () => {
        app.quit();
      },
    },
  ]);
  tray.setToolTip("Auto Meeting");
  tray.setContextMenu(contextMenu);
}

module.exports = {
  createTrayMenu,
};

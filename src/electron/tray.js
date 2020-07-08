const path = require("path");
const { app, Menu, Tray } = require("electron");
const { openInfoWindow } = require("../ui/windows");

function createTrayMenu() {
  const tray = new Tray(
    path.join(__dirname, "..", "assets", "images", "logo_white.png")
  );
  const contextMenu = Menu.buildFromTemplate([
    {
      label: "Open",
      click: () => {
        openInfoWindow();
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

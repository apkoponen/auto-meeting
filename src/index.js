const { app } = require("electron");
const { createTrayMenu } = require("./electron/tray");
const { startMainProcess } = require("./main/mainProcess");

// Handle creating/removing shortcuts on Windows when installing/uninstalling.
if (require("electron-squirrel-startup")) {
  // eslint-disable-line global-require
  app.quit();
}

const startProject = async () => {
  createTrayMenu();
  startMainProcess();
};

// This method will be called when Electron has finished
// initialization and is ready to create browser windows.
// Some APIs can only be used after this event occurs.
app.on("ready", startProject);

// Prevent main process from closing when closing all windows.
app.on("window-all-closed", (e) => e.preventDefault());

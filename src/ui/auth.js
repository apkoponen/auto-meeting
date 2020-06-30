const { ipcRenderer: ipc } = require("electron-better-ipc");

const uiEvents = require("./uiEvents");

setTimeout(() => {
  document.querySelector(".start-auth-button").addEventListener("click", () => {
    ipc.callMain(uiEvents.startAuth);
    document.querySelector(".auth-info").classList.add("hide");
    document.querySelector(".auth-in-process").classList.remove("hide");
  });
});

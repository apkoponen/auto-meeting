const { ipcRenderer: ipc } = require("electron-better-ipc");

let hasClickedAuth = false;
setTimeout(() => {
  document.querySelector(".start-auth-button").addEventListener("click", () => {
    hasClickedAuth = true;
    document.querySelector(".auth-info").classList.add("hide");
    document.querySelector(".auth-in-process").classList.remove("hide");
  });
});

// We want to await in the main process until we can start the authentication process,
// so we await until the user clicks on the button.
ipc.answerMain("ready-to-start-auth", async () => {
  await checkOnInterval((onEnd) => {
    if (hasClickedAuth) {
      onEnd();
    }
  }, 100);
  return true;
});

async function checkOnInterval(callback, ms) {
  await new Promise(function (resolve) {
    const intervalId = setInterval(
      () =>
        callback(function onEnd() {
          clearInterval(intervalId);
          resolve();
        }),
      ms
    );
  });
}

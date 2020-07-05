const { app, shell } = require("electron");
const { ipcMain: ipc } = require("electron-better-ipc");
const EventEmitter = require("events");

const { createGoogleApiAxios } = require("./google/googleApiAxios");
const { createApiAxios } = require("./api/apiAxios");
const { filesystemStore } = require("./storage/filesystemStore");
const { getRefreshToken, setRefreshToken } = require("./storage/secureStore");
const { poll } = require("./utils/polling");
const { checkEventsToOpen } = require("./utils/events");
const { createTrayMenu } = require("./electron/tray");
const { openAuthWindow, openReAuthWindow } = require("./ui/windows");
const uiEvents = require("./ui/uiEvents");

// Handle creating/removing shortcuts on Windows when installing/uninstalling.
if (require("electron-squirrel-startup")) {
  // eslint-disable-line global-require
  app.quit();
}

const state = {
  calendars: [],
  events: [],
  initialAccessToken: "",
  authWindow: null,
};

const apiAxios = createApiAxios();

const mainEvents = {
  initialAuthWindow: "initialAuthWindow",
  initialAuth: "initialAuth",
  reAuthWindow: "reAuthWindow",
  reAuthWithGoogle: "reAuthWithGoogle",
  startGoogleEventLoop: "startGoogleEventLoop",
};

class MainEmitter extends EventEmitter {}
const mainEmitter = new MainEmitter();

mainEmitter.on(mainEvents.initialAuthWindow, async function () {
  state.authWindow = await openAuthWindow();
});

ipc.answerRenderer(uiEvents.startAuth, function () {
  mainEmitter.emit(mainEvents.initialAuth);
});

mainEmitter.on(mainEvents.initialAuth, async function () {
  state.initialAccessToken = await authorize();
  if (state.authWindow) {
    state.authWindow.close();
  }
  filesystemStore.set("hasAuthenticated", true);
  mainEmitter.emit(mainEvents.startGoogleEventLoop);
});

mainEmitter.on(mainEvents.reAuthWindow, async function () {
  state.authWindow = await openReAuthWindow();
});

ipc.answerRenderer(uiEvents.startReAuth, function () {
  mainEmitter.emit(mainEvents.reAuthWithGoogle);
});

mainEmitter.on(mainEvents.reAuthWithGoogle, async function () {
  state.initialAccessToken = await authorize();
  if (state.authWindow) {
    state.authWindow.close();
  }
  mainEmitter.emit(mainEvents.startGoogleEventLoop);
});

mainEmitter.on(mainEvents.startGoogleEventLoop, async function () {
  const refreshToken = await getRefreshToken();
  const googleApiAxios = createGoogleApiAxios(
    async function fetchAccessTokenFromServer() {
      const response = await apiAxios.post("/auth/refresh", {
        refreshToken,
      });
      return response.data.access_token;
    },
    state.initialAccessToken
  );
  // Reset access token once we've started with it.
  state.initialAccessToken = "";

  try {
    const response = await googleApiAxios.get(
      "/calendar/v3/users/me/calendarList"
    );
    state.calendars = response.data.items.map((calendar) => ({
      googleCalendar: calendar,
      enabled: true,
    }));
    const msInMinute = 60 * 1000;
    const intervalMs = msInMinute * 15;

    poll(function checkCalendars() {
      const timeMin = new Date().toISOString();
      const timeMax = new Date(Date.now() + intervalMs).toISOString();

      state.calendars
        .filter((calendar) => calendar.googleCalendar.primary)
        .forEach(async (calendar) => {
          const { data } = await googleApiAxios.get(
            `/calendar/v3/calendars/${calendar.googleCalendar.id}/events`,
            {
              params: {
                singleEvents: true,
                timeMin,
                timeMax,
              },
            }
          );
          checkEventsToOpen(
            data.items.filter((event) => event.status === "confirmed"),
            (link) => {
              shell.openExternal(link);
            }
          );
        });
    }, intervalMs);
  } catch (error) {
    if (error && error.response && error.response.status === 401) {
      mainEmitter.emit(mainEvents.reAuthWindow);
    }
    // TODO: Handle all other possible errors gracefully.
  }
});

async function authorize() {
  const { data } = await apiAxios.post("/auth/");
  shell.openExternal("http://automeeting.xyz/api/auth/start?state=" + data.id);
  const response = await poll(async () => {
    const response = await apiAxios.get(`/auth/${data.id}`);
    if (response.status === 204) {
      // Returning undefined informs poll that we want to continue polling
      return;
    }
    return response;
  }, 5000);
  await setRefreshToken(response.data.refresh_token);
  return response.data.access_token;
}

async function initialize() {
  if (!filesystemStore.get("hasAuthenticated")) {
    mainEmitter.emit(mainEvents.initialAuthWindow);
    return;
  }

  const refreshToken = await getRefreshToken();
  if (!refreshToken) {
    mainEmitter.emit(mainEvents.reAuthWithGoogle);
    return;
  }

  mainEmitter.emit(mainEvents.startGoogleEventLoop);
}

const startProject = async () => {
  createTrayMenu();
  initialize();
};

// This method will be called when Electron has finished
// initialization and is ready to create browser windows.
// Some APIs can only be used after this event occurs.
app.on("ready", startProject);

// Prevent main process from closing when closing all windows.
app.on("window-all-closed", (e) => e.preventDefault());

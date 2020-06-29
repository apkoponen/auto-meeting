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
const { openAuthWindow } = require("./ui/windows");

// Handle creating/removing shortcuts on Windows when installing/uninstalling.
if (require("electron-squirrel-startup")) {
  // eslint-disable-line global-require
  app.quit();
}

const state = {
  calendars: [],
  events: [],
  initialAccessToken: "",
};

const apiAxios = createApiAxios();

const events = {
  initialAuth: "initialAuth",
  reAuthorizeWithGoogle: "reAuthorizeWithGoogle",
  startGoogleEventLoop: "startGoogleEventLoop",
};

class MainEmitter extends EventEmitter {}
const mainEmitter = new MainEmitter();

mainEmitter.on(events.initialAuth, async function () {
  const authWindow = await openAuthWindow();
  await ipc.callFocusedRenderer("ready-to-start-auth");
  state.initialAccessToken = await authorize();
  authWindow.close();
  filesystemStore.set("hasAuthenticated", true);
  mainEmitter.emit(events.startGoogleEventLoop);
});

mainEmitter.on(events.reAuthorizeWithGoogle, async function () {
  state.initialAccessToken = await authorize();
  mainEmitter.emit(events.startGoogleEventLoop);
});

mainEmitter.on(events.startGoogleEventLoop, async function () {
  const refreshToken = await getRefreshToken();
  const googleApiAxios = createGoogleApiAxios(
    async function fetchAccessTokenFromServer() {
      try {
        const response = await apiAxios.post("/auth/refresh", {
          refreshToken,
        });
        return response.data.access_token;
      } catch (e) {
        // TODO: Inform the user
      }
    },
    state.initialAccessToken
  );
  // Reset access token once we've started with it.
  state.initialAccessToken = "";

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
    const timeMax = new Date(Date.now() + intervalMs * 1000).toISOString();

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
  if (!filesystemStore.get("hasAuthenticatedz")) {
    mainEmitter.emit(events.initialAuth);
    return;
  }

  const refreshToken = await getRefreshToken();
  if (!refreshToken) {
    mainEmitter.emit(events.reAuthorizeWithGoogle);
    return;
  }

  mainEmitter.emit(events.startGoogleEventLoop);
}

const startProject = async () => {
  createTrayMenu();
  initialize();
};

// This method will be called when Electron has finished
// initialization and is ready to create browser windows.
// Some APIs can only be used after this event occurs.
app.on("ready", startProject);

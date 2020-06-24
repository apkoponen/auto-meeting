const { shell } = require("electron");
const { app } = require("electron");

const { createGoogleApiAxios } = require("./google/googleApiAxios");
const { createApiAxios } = require("./api/apiAxios");
const { filesystemStore } = require("./storage/filesystemStore");
const { getRefreshToken, setRefreshToken } = require("./storage/secureStore");
const { poll } = require("./utils/polling");
const { checkEventsToOpen } = require("./utils/events");
const { createTrayMenu } = require("./electron/tray");

// Handle creating/removing shortcuts on Windows when installing/uninstalling.
if (require("electron-squirrel-startup")) {
  // eslint-disable-line global-require
  app.quit();
}

const state = {
  calendars: [],
  events: [],
};

const apiAxios = createApiAxios();

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
  let initialAccessToken;
  if (!filesystemStore.get("hasAuthenticated")) {
    initialAccessToken = await authorize();
    filesystemStore.set("hasAuthenticated", true);
  }

  const refreshToken = await getRefreshToken();
  if (!refreshToken) {
    initialAccessToken = await authorize();
  }

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
    initialAccessToken
  );

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
        checkEventsToOpen(data.items, (link) => {
          shell.openExternal(link);
        });
      });
  }, intervalMs);
}

const startProject = async () => {
  createTrayMenu();
  initialize();
};

// This method will be called when Electron has finished
// initialization and is ready to create browser windows.
// Some APIs can only be used after this event occurs.
app.on("ready", startProject);

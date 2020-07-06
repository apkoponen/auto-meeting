const { app, shell } = require("electron");
const { ipcMain: ipc } = require("electron-better-ipc");
const EventEmitter = require("events");

const { filesystemStore } = require("./storage/filesystemStore");
const { poll } = require("./utils/polling");
const {
  openEventMeetingLinksOnSchedule,
  returnSchedulableEvents,
} = require("./utils/events");
const { createTrayMenu } = require("./electron/tray");
const { openAuthWindow, openReAuthWindow } = require("./ui/windows");
const { createApiRepository } = require("./api/apiRepository");
const { createGoogleRepository } = require("./google/googleRepository");
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
let apiRepository;

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
  const googleRepository = createGoogleRepository(
    apiRepository.fetchAccessToken,
    state.initialAccessToken
  );

  // Reset access token once we've started with it.
  state.initialAccessToken = "";

  try {
    const googleCalendars = await googleRepository.fetchCalendars();
    state.calendars = googleCalendars.map((calendar) => ({
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
          const googleEvents = await googleRepository.fetchEvents(
            calendar.googleCalendar.id,
            timeMin,
            timeMax
          );
          const events = returnSchedulableEvents(googleEvents);
          openEventMeetingLinksOnSchedule(events, (link) => {
            shell.openExternal(link);
          });
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
  const authorizationId = await apiRepository.createNewAuthorization();
  shell.openExternal(
    "http://automeeting.xyz/api/auth/start?state=" + authorizationId
  );
  const accessToken = await apiRepository.waitForAuthorizationToComplete(
    authorizationId
  );
  return accessToken;
}

async function initialize() {
  apiRepository = await createApiRepository();

  if (!filesystemStore.get("hasAuthenticated")) {
    mainEmitter.emit(mainEvents.initialAuthWindow);
    return;
  }

  if (!apiRepository.hasRefreshToken()) {
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

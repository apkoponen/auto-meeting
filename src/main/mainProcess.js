const { shell } = require("electron");
const { ipcMain: ipc } = require("electron-better-ipc");
const EventEmitter = require("events");

const { filesystemStore } = require("../storage/filesystemStore");
const { poll } = require("../utils/polling");
const {
  openEventMeetingLinksOnSchedule,
  returnSchedulableEvents,
} = require("../utils/events");
const {
  openAuthWindow,
  closeAuthWindow,
  openReAuthWindow,
  closeReAuthWindow,
} = require("../ui/windows");
const { createApiRepository } = require("../api/apiRepository");
const { createGoogleRepository } = require("../google/googleRepository");
const uiEvents = require("../ui/uiEvents");

const state = {
  calendars: [],
  events: [],
  initialAccessToken: "",
  scheduledEvents: new Map(),
};
let apiRepository;

const mainEvents = {
  initialAuthWindow: "initialAuthWindow",
  initialAuth: "initialAuth",
  reAuthWindow: "reAuthWindow",
  reAuthWithGoogle: "reAuthWithGoogle",
  startGoogleEventLoop: "startGoogleEventLoop",
  updateUIState: "updateUIState",
};

class MainEmitter extends EventEmitter {}
const mainEmitter = new MainEmitter();

mainEmitter.on(mainEvents.updateUIState, async function () {
  ipc.sendToRenderers(uiEvents.stateUpdate, {
    calendars: state.calendars,
    events: Array.from(state.scheduledEvents.values()),
  });
});

setInterval(() => {
  mainEmitter.emit(mainEvents.updateUIState);
}, 5000);

ipc.answerRenderer(uiEvents.toggleCalendar, function ({ calendarId, enabled }) {
  const calendar = state.calendars.find(
    (calendar) => calendar.googleCalendar.id === calendarId
  );
  if (calendar) {
    calendar.enabled = enabled;
    // TODO: Persist on disk
    // TODO: Remove scheduled events from calendar
  }
});

mainEmitter.on(mainEvents.initialAuthWindow, async function () {
  await openAuthWindow();
});

ipc.answerRenderer(uiEvents.startAuth, function () {
  mainEmitter.emit(mainEvents.initialAuth);
});

mainEmitter.on(mainEvents.initialAuth, async function () {
  state.initialAccessToken = await authorize();
  closeAuthWindow();
  filesystemStore.set("hasAuthenticated", true);
  mainEmitter.emit(mainEvents.startGoogleEventLoop);
});

mainEmitter.on(mainEvents.reAuthWindow, async function () {
  await openReAuthWindow();
});

ipc.answerRenderer(uiEvents.startReAuth, function () {
  mainEmitter.emit(mainEvents.reAuthWithGoogle);
});

mainEmitter.on(mainEvents.reAuthWithGoogle, async function () {
  state.initialAccessToken = await authorize();
  closeReAuthWindow();
  mainEmitter.emit(mainEvents.startGoogleEventLoop);
});

async function checkCalendars(
  calendars,
  scheduledEvents,
  fetchEvents,
  timeMaxInterval
) {
  const timeMin = new Date().toISOString();
  const timeMax = new Date(Date.now() + timeMaxInterval).toISOString();
  await Promise.all(
    calendars.map(async (calendar) => {
      const googleEvents = await fetchEvents(
        calendar.googleCalendar.id,
        timeMin,
        timeMax
      );
      const eventsToSchedule = returnSchedulableEvents(googleEvents).filter(
        (event) => !scheduledEvents.has(event.googleEvent.id)
      );
      openEventMeetingLinksOnSchedule(eventsToSchedule, (link) => {
        shell.openExternal(link);
      });
      eventsToSchedule.forEach((event) =>
        scheduledEvents.set(event.googleEvent.id, event)
      );
    })
  );
}

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
    const timeMaxInterval = msInMinute * 30;
    poll(async () => {
      await checkCalendars(
        state.calendars.filter((calendar) => calendar.enabled),
        state.scheduledEvents,
        googleRepository.fetchEvents,
        timeMaxInterval
      );
      mainEmitter.emit(mainEvents.updateUIState);
    }, intervalMs);
  } catch (error) {
    if (error && error.response && error.response.status === 401) {
      mainEmitter.emit(mainEvents.reAuthWindow);
    } else {
      // TODO: Handle all other possible errors gracefully.
      throw error;
    }
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

async function startMainProcess() {
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

module.exports = {
  startMainProcess,
  forTests: {
    checkCalendars,
  },
};

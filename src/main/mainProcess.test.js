jest.mock("electron-better-ipc", () => ({
  ipcMain: {
    on: () => {},
    answerRenderer: () => {},
  },
}));
jest.mock("../storage/filesystemStore", () => ({
  filesystemStore: {},
}));

const {
  forTests: { checkCalendars },
} = require("./mainProcess");
jest.unmock("../utils/events");
const events = require("../utils/events");

const mockGoogleCalendar = {
  kind: "calendar#calendarListEntry",
  etag: '"1548653961231230"',
  id: "example@gmail.com",
  summary: "example@gmail.com",
  timeZone: "Europe/Helsinki",
  colorId: "3",
  backgroundColor: "#f83a22",
  foregroundColor: "#000000",
  selected: true,
  accessRole: "owner",
  defaultReminders: [],
  notificationSettings: {
    notifications: [
      { type: "eventCreation", method: "email" },
      { type: "eventChange", method: "email" },
      { type: "eventCancellation", method: "email" },
      { type: "eventResponse", method: "email" },
    ],
  },
  primary: true,
  conferenceProperties: {
    allowedConferenceSolutionTypes: ["hangoutsMeet"],
  },
};
const mockGoogleEvent = {
  kind: "calendar#event",
  etag: '"3236593796465000"',
  id:
    "_71144g9i8ko42b9g8d1j8b9k60asdab9o8osjib9p70s30cpj71346hi46s_20200625T150000Z",
  status: "confirmed",
  htmlLink:
    "https://www.google.com/calendar/event?eid=XzcxMTQ0ZzasdOGtvNDJiO231FqOGI5azYwb2thYjlvOG9zamliOXA3MHMzMGNwajcxMzQ2aGk0NnNfMjAyMDA2MjVUMTUwMDAwWiBhcC5rb3BvbmVuQG0",
  created: "2019-08-14T07:51:30.000Z",
  updated: "2019-09-12T14:01:38.319Z",
  summary: "Group meeting",
  description:
    "https://us04web.zoom.us/j/78667075110?pwd=ZUdsdHRJMEdtQ2NjN253K3MvVlBSZz0a",
  creator: { email: "example@gmail.com", self: true },
  organizer: { email: "example@gmail.com", self: true },
  start: {
    dateTime: "2020-06-25T18:00:00+03:00",
    timeZone: "Europe/Helsinki",
  },
  end: {
    dateTime: "2020-06-25T20:00:00+03:00",
    timeZone: "Europe/Helsinki",
  },
  recurringEventId:
    "_71144g9i8ko42b9g8d1j821360oksdao8osjib9p70s30cpj71346hi46s",
  originalStartTime: {
    dateTime: "2020-06-25T18:00:00+03:00",
    timeZone: "Europe/Helsinki",
  },
  iCalUID: "B3BA2E0A-0CC4-401E-8F99-AD80338FCFD7",
  sequence: 0,
  reminders: { useDefault: false },
};

describe.only("checkCalendars", () => {
  const mockCalendars = [{ enabled: true, googleCalendar: mockGoogleCalendar }];
  it("should schedule meetings only once", async () => {
    const openMock = jest.fn();
    events.openEventLinkOnSchedule = openMock;
    const scheduledEvents = new Set();
    const checkSingleEvent = async () =>
      checkCalendars(
        mockCalendars,
        scheduledEvents,
        () => [mockGoogleEvent],
        10
      );
    await checkSingleEvent();
    expect(openMock).toHaveBeenCalledTimes(1);
    await checkSingleEvent();
    expect(openMock).toHaveBeenCalledTimes(1);
  });

  it("should schedule multiple meetings", async () => {
    const openMock = jest.fn();
    events.openEventLinkOnSchedule = openMock;
    const scheduledEvents = new Set();
    const checkSingleEvent = async () =>
      checkCalendars(
        mockCalendars,
        scheduledEvents,
        () => [mockGoogleEvent, { ...mockGoogleEvent, id: "id-number-two" }],
        10
      );
    await checkSingleEvent();
    expect(openMock).toHaveBeenCalledTimes(2);
  });

  it("should add new meetings", async () => {
    const openMock = jest.fn();
    events.openEventLinkOnSchedule = openMock;
    const scheduledEvents = new Set();
    await checkCalendars(
      mockCalendars,
      scheduledEvents,
      () => [mockGoogleEvent, { ...mockGoogleEvent, id: "id-number-two" }],
      10
    );
    expect(openMock).toHaveBeenCalledTimes(2);

    await checkCalendars(
      mockCalendars,
      scheduledEvents,
      () => [mockGoogleEvent, { ...mockGoogleEvent, id: "id-number-three" }],
      10
    );
    expect(openMock).toHaveBeenCalledTimes(3);
  });
});

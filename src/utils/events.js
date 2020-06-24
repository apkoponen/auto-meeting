const { shell } = require("electron");
const getUrls = require("get-urls");

function parseAndFindMeetingLink(data) {
  const urls = getUrls(data);
  for (const url of urls) {
    if (
      url.startsWith("https://meet.google.com/") ||
      url.startsWith("https://teams.microsoft.com/l/meetup-join/") ||
      url.includes("zoom.us/j/")
    ) {
      return url;
    }
  }
}

function openEventLinkOnSchedule(startDate, meetingLink, openLinkCallback) {
  const difference = startDate - Date.now();
  const timeTo30SecsBefore = Math.max(difference - 1000 * 30, 0);
  setTimeout(() => openLinkCallback(meetingLink), timeTo30SecsBefore);
}

function checkEventsToOpen(events, openLinkCallback) {
  events.forEach((event) => {
    const meetingLink =
      event.hangoutLink ||
      (event.description && parseAndFindMeetingLink(event.description));
    if (meetingLink) {
      openEventLinkOnSchedule(
        new Date(event.start.dateTime),
        meetingLink,
        openLinkCallback
      );
    }
  });
}

module.exports = {
  parseAndFindMeetingLink,
  openEventLinkOnSchedule,
  checkEventsToOpen,
};

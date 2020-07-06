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

function returnSchedulableEvents(googleEvents) {
  return googleEvents
    .filter((event) => event.status === "confirmed")
    .reduce((events, googleEvent) => {
      const meetingLink =
        googleEvent.hangoutLink ||
        (googleEvent.description &&
          parseAndFindMeetingLink(googleEvent.description));
      if (meetingLink) {
        events.push({
          meetingLink,
          googleEvent,
        });
      }
      return events;
    }, []);
}

function openEventMeetingLinksOnSchedule(events, openLinkCallback) {
  events.forEach((event) => {
    openEventLinkOnSchedule(
      new Date(event.googleEvent.start.dateTime),
      event.meetingLink,
      openLinkCallback
    );
  });
}

module.exports = {
  parseAndFindMeetingLink,
  openEventLinkOnSchedule,
  returnSchedulableEvents,
  openEventMeetingLinksOnSchedule,
};

const {
  parseAndFindMeetingLink,
  openEventLinkOnSchedule,
  returnSchedulableEvents,
} = require("./events");
const { testevents } = require("./events.testadata");

describe("parseAndFindMeetingLink", () => {
  it("should parse Microsoft Teams links", () => {
    const data = `Hello,

Let's discuss the agenda together.

Yours, Pena
________________________________________________________________________________
Join Microsoft Teams -teaming<https://teams.microsoft.com/l/meetup-join/19%3ameeting_N2RiZTI5MmEtNzlmMSa0MmVjLWFlMzQtMjZiNDA4ZTM4Nzlj%40thread.v2/0?context=%7b%22Tid%22%3a%22a609c794-1111-43b2-be34-990f3b068das%22%2c%22Oid%22%3a%220abbb111-307e-1111-bbb6-73dd4b9cb8f2%22%7d>
Learn more about Teams<https://aka.ms/JoinTeamsMeeting> | Settings<https://teams.microsoft.com/meetingOptions/?organizerId=0abbb08f-307e-420e-bbb6-73dd4b9cb8f2&tenantId=a609c794-111-43b2-111-990f3b01111&threadId=19_meeting_111111mEtNzlmMS00MmVjLWFlMzQtMjZiNDI4Z114Nzlj@thread.v2&messageId=0&language=fi-FI>
________________________________________________________________________________`;
    expect(parseAndFindMeetingLink(data)).toBe(
      "https://teams.microsoft.com/l/meetup-join/19%3ameeting_N2RiZTI5MmEtNzlmMSa0MmVjLWFlMzQtMjZiNDA4ZTM4Nzlj%40thread.v2/0?context=%7B%22Tid%22%3A%22a609c794-1111-43b2-be34-990f3b068das%22%2C%22Oid%22%3A%220abbb111-307e-1111-bbb6-73dd4b9cb8f2%22%7D%3E"
    );
  });

  it("should parse Google Meet links", () => {
    const data = `-::~:~::~:~:~:~:~:~:~:~:~:~:~:~:~:~:~:~:~:~:~:~:~:~:~:~:~:~:~:~:~:~:~:~:~:~:~:~::~:~::-
Please do not edit this section of the description.

This event has a video call.
Join: https://meet.google.com/eos-xvsp-abc
+358 9 85691688 PIN: 747492982#
View more phone numbers: https://tel.meet/eos-xvsp-abc?pin=6210467559640&hs=7
-::~:~::~:~:~:~:~:~:~:~:~:~:~:~:~:~:~:~:~:~:~:~:~:~:~:~:~:~:~:~:~:~:~:~:~:~:~:~::~:~::-`;
    expect(parseAndFindMeetingLink(data)).toBe(
      "https://meet.google.com/eos-xvsp-abc"
    );
  });

  it("should parse normal Zoom links", () => {
    const data = `Pena is inviting you to a scheduled Zoom meeting.
    
Join Zoom Meeting
https://us04web.zoom.us/j/78667075110?pwd=ZUdsdHRJMEdtQ2NjN253K3MvVlBSZz0a

Meeting ID: 786 6717 5140
Password: 6PMatA
`;
    expect(parseAndFindMeetingLink(data)).toBe(
      "https://us04web.zoom.us/j/78667075110?pwd=ZUdsdHRJMEdtQ2NjN253K3MvVlBSZz0a"
    );
  });

  it("should parse organization Zoom links", () => {
    const data = `Hi Pena,

thanks for booking a time slot.

I would suggest the following agenda for the call:

1. Company overview (focus, expertise, needs);
2. Client overview / partnership program;
3. Questions.

Please let me know if you would like to discuss anything else.

Have a great day!

Cheers,
Ritva

──────────

Ritva Nönnönnöö lädt Sie zu einem geplanten Zoom-Meeting ein.

Zoom-Meeting beitreten
https://some-organisation.zoom.us/j/734097133

Schnelleinwahl mobil
+16699006833,,734097123# Vereinigte Staaten von Amerika (San Jose)
+16465588656,,734097113# Vereinigte Staaten von Amerika (New York)

Einwahl nach aktuellem Standort
        +1 669 900 6833 Vereinigte Staaten von Amerika (San Jose)
        +1 646 558 8656 Vereinigte Staaten von Amerika (New York)
        +49 69 7104 9922 Deutschland
        +49 30 3080 6188 Deutschland
        +49 30 5679 5800 Deutschland
Meeting-ID: 734 111 111
Ortseinwahl suchen: https://zoom.us/u/13123123`;
    expect(parseAndFindMeetingLink(data)).toBe(
      "https://some-organisation.zoom.us/j/734097133"
    );
  });
});

describe("returnSchedulableEvents", () => {
  it("should filter out events without meetings", () => {
    expect(returnSchedulableEvents(testevents)).toEqual([]);
  });

  it("should return googleEvent and meetingLink", () => {
    const meetingLink =
      "https://us04web.zoom.us/j/78667075110?pwd=ZUdsdHRJMEdtQ2NjN253K3MvVlBSZz0a";
    const googleEvent = {
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
      description: meetingLink,
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
    const events = returnSchedulableEvents([googleEvent]);
    expect(events[0].meetingLink).toEqual(meetingLink);
    expect(events[0].googleEvent).toEqual(googleEvent);
  });
});

describe("openEventLinkOnSchedule", () => {
  beforeEach(() => {
    jest.useFakeTimers();
  });

  it("should run for dates in the future", () => {
    const link = "link";
    const callback = jest.fn();
    openEventLinkOnSchedule(new Date(Date.now() + 1000 * 10), link, callback);
    jest.runOnlyPendingTimers();
    expect(callback).toHaveBeenCalledTimes(1);
    expect(callback).toHaveBeenCalledWith("link");
  });

  it("should run for dates in the past", () => {
    const link = "link";
    const callback = jest.fn();
    openEventLinkOnSchedule(new Date(Date.now() - 1000 * 10), link, callback);
    jest.runOnlyPendingTimers();
    expect(callback).toHaveBeenCalledTimes(1);
    expect(callback).toHaveBeenCalledWith("link");
  });
});

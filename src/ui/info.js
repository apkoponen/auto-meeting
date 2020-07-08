const { ipcRenderer: ipc } = require("electron-better-ipc");

const uiEvents = require("./uiEvents");

function renderCalendars(calendars) {
  const calendarElement = document.querySelector(".calendars");
  if (calendars.length === 0) {
    calendarElement.innerHTML = `<div>Your account has no calendars.</div>`;
  } else {
    calendarElement.innerHTML = calendars
      .map((calendar) => {
        return `
        <div>
          <label>
          <input 
            class="calendar-checkbox" 
            type="checkbox" 
            value="${calendar.googleCalendar.id}" 
            ${calendar.enabled && 'checked="checked"'} 
          />
          ${calendar.googleCalendar.summary}
          </label>
        </div>
      `;
      })
      .join("");
  }

  document.querySelectorAll(".calendar-checkbox").forEach((checkbox) =>
    checkbox.addEventListener("click", (event) => {
      ipc.callMain(uiEvents.toggleCalendar, {
        calendarId: event.target.value,
        enabled: event.target.checked,
      });
    })
  );
}

function renderEvents(events) {
  const eventElement = document.querySelector(".events");
  if (events.length === 0) {
    eventElement.innerHTML = `<div>You have no scheduled remote meetings within the next 30 minutes.</div>`;
  } else {
    eventElement.innerHTML = events
      .map((event) => {
        const startTime = new Intl.DateTimeFormat("default", {
          hour: "numeric",
          minute: "numeric",
        }).format(new Date(event.googleEvent.start.dateTime));
        return `
        <div>
          ${startTime} <strong>${event.googleEvent.summary}</strong>
        </div>
      `;
      })
      .join("");
  }
}

ipc.on(uiEvents.stateUpdate, function (event, state) {
  renderCalendars(state.calendars);
  renderEvents(state.events);
});

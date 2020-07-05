const { createGoogleApiAxios } = require("./googleApiAxios");

function createGoogleRepository(
  refreshAccessTokenCallback,
  initialAccessToken
) {
  const googleApiAxios = createGoogleApiAxios(
    refreshAccessTokenCallback,
    initialAccessToken
  );

  async function fetchCalendars() {
    const { data } = await googleApiAxios.get(
      "/calendar/v3/users/me/calendarList"
    );
    return data.items;
  }

  async function fetchEvents(calendarId, timeMin, timeMax) {
    const { data } = await googleApiAxios.get(
      `/calendar/v3/calendars/${calendarId}/events`,
      {
        params: {
          singleEvents: true,
          timeMin,
          timeMax,
        },
      }
    );
    return data.items;
  }

  return {
    fetchCalendars,
    fetchEvents,
  };
}

module.exports = {
  createGoogleRepository,
};

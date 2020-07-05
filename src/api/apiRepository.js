const { getRefreshToken, setRefreshToken } = require("../storage/secureStore");
const { createApiAxios } = require("./apiAxios");
const { poll } = require("../utils/polling");

async function createApiRepository() {
  let _refreshToken = await getRefreshToken();
  const apiAxios = createApiAxios();

  async function fetchAuthorizationResult(authorizationId) {
    const response = await apiAxios.get(`/auth/${authorizationId}`);
    if (response.status === 204) {
      return;
    }
    return {
      accessToken: response.data.access_token,
      refreshToken: response.data.refresh_token,
    };
  }

  async function fetchAccessToken() {
    const response = await apiAxios.post("/auth/refresh", {
      refreshToken: _refreshToken,
    });
    return response.data.access_token;
  }

  function hasRefreshToken() {
    return !!_refreshToken;
  }

  async function createNewAuthorization() {
    const { data } = await apiAxios.post("/auth/");
    return data.id;
  }

  async function waitForAuthorizationToComplete(authorizationId) {
    const { accessToken, refreshToken } = await poll(async () => {
      const result = await fetchAuthorizationResult(authorizationId);
      if (!result) {
        // Returning undefined informs poll that we want to continue polling
        return;
      }
      return result;
    }, 5000);
    _refreshToken = refreshToken;
    await setRefreshToken(refreshToken);
    return accessToken;
  }

  return {
    fetchAccessToken,
    createNewAuthorization,
    waitForAuthorizationToComplete,
    hasRefreshToken,
  };
}

module.exports = {
  createApiRepository,
};

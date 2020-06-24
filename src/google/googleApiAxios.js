const axios = require("axios");

function getAuthorizationHeader(accessToken) {
  return "Bearer " + accessToken;
}

function createGoogleApiAxios(refreshCallback, initialAccessToken) {
  const headers = {};
  if (initialAccessToken) {
    headers["Authorization"] = getAuthorizationHeader(initialAccessToken);
  }
  const googleApiAxios = axios.create({
    baseURL: "https://www.googleapis.com/",
    headers,
  });

  googleApiAxios.interceptors.request.use(
    async function ensureAccessTokenExistsOnRequest(config) {
      if (!config.headers["Authorization"]) {
        const accessToken = await refreshCallback();
        config.headers["Authorization"] = getAuthorizationHeader(accessToken);
      }
      return config;
    }
  );

  googleApiAxios.interceptors.response.use(
    (response) => response,
    async function refreshTokenAndRetryOnError(error) {
      const originalRequest = error.config;
      if (error.response.status === 401 && !originalRequest._retry) {
        originalRequest._retry = true;
        try {
          const accessToken = await refreshCallback();
          const authorizationHeader = getAuthorizationHeader(accessToken);
          googleApiAxios.defaults.headers[
            "Authorization"
          ] = authorizationHeader;
          originalRequest.headers["Authorization"] = authorizationHeader;
        } catch (e) {
          return Promise.reject(error);
        }
        return axios(originalRequest);
      }
      return Promise.reject(error);
    }
  );
  return googleApiAxios;
}

module.exports = {
  createGoogleApiAxios,
};

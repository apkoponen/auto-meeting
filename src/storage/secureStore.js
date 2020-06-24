const os = require("os");
const keytar = require("keytar");

const keytarService = "auto-meeting-refresh";
const keytarAccount = os.userInfo().username;

async function getRefreshToken() {
  return keytar.getPassword(keytarService, keytarAccount);
}

async function setRefreshToken(refreshToken) {
  return keytar.setPassword(keytarService, keytarAccount, refreshToken);
}

module.exports = {
  getRefreshToken,
  setRefreshToken,
};

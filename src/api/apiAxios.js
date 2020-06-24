const axios = require("axios");

function createApiAxios() {
  return axios.create({
    baseURL: "https://automeeting.xyz/api/",
  });
}

module.exports = {
  createApiAxios,
};

const Store = require("electron-store");

const schema = {
  hasAuthenticated: {
    type: "boolean",
  },
};

const filesystemStore = new Store({ schema });

module.exports = {
  filesystemStore,
};

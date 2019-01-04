'use strict';

const JsonWebSocket = {
  "Client": require("./lib/ClientConnection.js"),
  "Server": require("./lib/JsonServer.js")
};
//const JsonWebSocket.Client = require("./lib/ClientConnection.js");
//const JsonWebSocket.Server = require("./lib/JsonServer.js");

module.exports = JsonWebSocket;

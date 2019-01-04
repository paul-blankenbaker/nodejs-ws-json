/**
 * Adds handler(s) to perform file related operations based on the
 * many useful "fs" functions found in the Node.js File System module
 * (https://nodejs.org/api/fs.html)
 */

const fs = require('fs');
const ClientConnection = require('../lib/ClientConnection.js');

function installHandlers(wss) {
  wss.setHandler("stat", function(cc, msg) {
    const path = msg["path"];
    fs.stat(path, (err, stats) => {
      msg["err"] = err;
      msg["stats"] = stats;
      cc.sendObj("stat", msg);
    });
  });

  wss.setHandler("readdir", function(cc, msg) {
    const path = msg["path"];
    const options = ClientConnection.getAttribute(msg, "options", {});
    fs.readdir(path, options, (err, files) => {
      msg["err"] = err;
      msg["files"] = files;
      cc.sendObj("readdir", msg);
    });
  });
}

module.exports.installHandlers = installHandlers;

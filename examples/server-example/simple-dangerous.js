const fs = require('fs');
const path = require('path');

const JsonWebSocket = require('../../index');
const getAttribute = JsonWebSocket.Client.getAttribute;
const fsHandlers = require('../../handlers/fs');

// Construct new instance of server
const server = new JsonWebSocket.Server({
  // Port to listen on
  "port": 9981,

  // Limit connections to local host (change to null to allow from everywhere)
  //"bindHost": null,
  "bindHost": "127.0.0.1",

  // If you keep handlers in separate modules. However, in this example
  // we will install some handlers below. See handlers/fs.js as an
  // example of writing a custom handler module.
  "handlerDir": undefined,

  // Increase for more verbose output
  "verbosity": 3
});

// Add some built-in factory handlers
server.addStatusHandler();
server.addEchoHandler();
server.addTimeHandler();

// Enable query/set of servers verbosity level at run time
server.addVerbosityHandler();

// DANGER! DANGER! DANGER! The arbitrary exec handler allows client to
// run any executable on the server that is accessible by the server
// process!
//server.addExecHandler();

// The kill handler is not quite so dangerous - it only allows client
// to kill processes that it started.
//server.addKillHandler();

// Example of adding specific factory handler module (allows client to
// query, read write files on server)
// fsHandlers.installHandlers(server);

// Example of loading all Factory default handlers found in the
// modules handlers directory (again this is dangerous as you are adding
// every possible handler). Typically you would create your own
// handlers directory with specific message handlers to load
//const hdir = path.dirname(require.resolve('../../handlers/fs'));
//server.loadHandlers(hdir);

// Example of adding a very basic message handler (given
// radius, provides diameter, area and circumference)
server.setHandler("circle", (cc, msg) => {
  let r = parseFloat(getAttribute(msg, "radius", 1.0));
  msg["radius"] = r;
  msg["diameter"] = r * 2;
  msg["area"] = Math.PI * r * r;
  msg["circum"] = Math.PI * 2 * r;
  cc.sendObj("circle", msg);
});

// Example of adding handler that runs a specific system command
// (output will come asyncrhonously and over multiple messages)
server.setHandler("top", (cc, msg) => {
  let cmd = {
    "op": "top",
    "cmd": "/usr/bin/top",
    "args": [ "-b", "-n", "1" ],
    "encoding": "utf-8"
  };
  cc.exec(cmd);
});

// Example of adding a simple authentication mechanism that requires
// client to post an initial JSON message before enabling handlers:
//
// { "op": "auth", "key": "admin" }
//
server.setAuthHandler("auth", (cc, msg) => {
  let key = getAttribute(msg, "key", "MISSING");
  if ("admin" === key) {
    server.setAuthenticated(cc);
    
    cc.sendObj("auth", msg);
  } else {
    // Throwing exception forces client to connect again to log in
    // (comment or remove if you want them to be able to try again)
    throw Exception("Bad authentication key from client - closing connection");
  }
});


// Now that everything is set up, go start server and handle client requests
server.start();

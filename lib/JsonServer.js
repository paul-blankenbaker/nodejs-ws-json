/**
 * Class used to manage a JSON message based web server.
 */
const fs = require('fs');
const path = require('path');
const WebSocket = require('ws');
const ClientConnection = require('./ClientConnection.js');

const STRING_TYPE = 'string';

/**
 * Default configuration options.
 */
const DEFAULT_CONFIG = {
  /**
   * Port to bind to.
   */
  "port": 9981,

  /**
   * Host to bind to (what clients can connect to) - null to bind to
   * all hosts.
   */
  "bindHost": "127.0.0.1",
  
  /**
   * Directory to load application specific handlers from.
   */
  "handlerDir": undefined,

  /**
   * Verbosity level (for logging) - larger numbers for more output.
   */
  "verbosity": 1,

  /**
   * Should all factory handlers be included by default (dangerous
   * to enable security wise).
   */
  "factoryHandlers": false
};

/**
 * Implements a WebSocket server where all data is exchanged as JSON
 * messages between the client and the server.
 */
class JsonServer {

  /**
   * Set a single JSON message handler.
   *
   * <p>This will replace an existing handler if there is one already
   * installed having the same name.</p>
   *
   * @param {String} name The operation name (like: "exec").
   *
   * @param {Function} cb The callback function that handles the
   * action, receives two parameters (cc, msg). Where cc is the
   * ClientConnection object that sent the message, and msg is the
   * JSON message object sent by client.
   * @public
   */
  setHandler(name, cb) {
    this.allHandlers[name] = cb;
  }

  /**
   * Set a single JSON message handler used during client authentication.
   *
   * <p>This method allows you to install a JSON based authentication
   * state where the client must pass one or more messages that you
   * use to authenticate the connection. When one of your handlers
   * verifies itself, you should invoke the authenticated(cc)
   * method.</p>
   *
   * <p>NOTE: If you don't set any authentication handlers, then no
   * authentication will be done (any client that can connect will
   * be able to access the services provided).</p>
   *
   * @param {String} name The operation name (like: "auth").
   *
   * @param {Function} cb The callback function that handles the
   * action, receives two parameters (cc, msg). Where cc is the
   * ClientConnection object that sent the message, and msg is the
   * JSON message object sent by client.
   * @public
   */
  setAuthHandler(name, cb) {
    if (this.authHandlers === undefined) {
      this.authHandlers = { };
    }
    this.authHandlers[name] = cb;
  }

  /**
   * Indicate that client connection has authenticated itself properly.
   *
   * <p>After invoking this method, the client will have access to
   * all of the normal message handlers associated with the server.</p>
   *
   * @param {Object} cc The ClientConnection object that is now authorized.
   * @public
   */
  setAuthenticated(cc) {
    // Enable all normal handlers for processing messages from client
    cc.setHandlers(this.allHandlers);
  }

  /**
   * Look up setting from configuration values.
   *
   * @param {String} key The key to look up the value with (like: "port").
   * @param {Object} defValue The default value to return if not found.
   * @return {Object} The associated value from the config or the
   * defValue passed if not found.
   * @public
   */
  getSetting(key, defValue) {
    const val = ClientConnection.getAttribute(this.config, key, defValue);
    return val;
  }

  /**
   * Returns the port the server is configured to listen on.
   *
   * @return {Number} Port number.
   * @public
   */
  getPort() {
    return parseInt(this.getSetting("port", DEFAULT_CONFIG.port));
  }

  /**
   * A "nice" string representation of the server.
   *
   * @return {String} String that includes the port number.
   * @public
   */
  toString() {
    return "JsonServer:" + this.getPort();
  }

  /**
   * Determine if a certain verbosity level should be logged.
   *
   * @param {Number} level Verbosity level to check.
   * @return {Boolean} true if verbosity is configured high enough
   * such that you should log your message.
   * @public
   */
  shouldLog(level) { return (level <= this.verbosity); }

  addEchoHandler() {
    this.setHandler("echo", (cc, msg) => { cc.sendObj("echo", msg); });
  }

  addExecHandler() {
    this.setHandler("exec", (cc, msg) => { cc.exec(msg); });
  }

  addKillHandler() {
    this.setHandler("kill", (cc, msg) => { cc.kill(msg); });
  }

  addTimeHandler() {
    this.setHandler("time", (cc, msg) => {
      msg["time"] = Date.now(); cc.sendObj("time", msg)
    });
  }
  
  /**
   * Adds standard handler to provide some status information back.
   */
  addStatusHandler() {
    this.setHandler("status", (cc, msg) => {
      cc.sendObj("status", cc.getStatus());
    });
  }
  
  /**
   * Adds handler to set/get the verbosity level.
   *
   * 
   */
  addVerbosityHandler() {
    this.setHandler("verbosity", (cc, msg) => {
      let v = msg["set"];
      if (v !== undefined) {
        this.verbosity = parseInt(v);
      }
      cc.sendObj("verbosity", { "verbosity": this.verbosity });
    });
  }

  /**
   * Attempts to load all handlers from a specific directory.
   *
   * @param {String} hdir Directory to load from (must exist and be
   * readable, but does not need to contain any JavaScript files).
   * @public
   */
  loadHandlers(hdir) {
    if (this.shouldLog(1)) {
      console.log("Looking for Handlers in: " + hdir);
    }
    let fnames = fs.readdirSync(hdir);
    for (let idx in fnames) {
      let fname = fnames[idx];
      let p = hdir + "/" + fname;
      let s = fs.statSync(p);
      let ok = s.isFile() && fname.endsWith(".js");
      if (ok) {
        if (this.shouldLog(6)) {
          console.log("  Installing Handler: " + fname);
        }
        let op = require(p);
        op.installHandlers(this);
        if (this.shouldLog(2)) {
          console.log("  Installed  Handler: " + fname);
        }
      }
    }
  }
  
  /**
   * Constructs a new instance (but not start) the JSON server.
   *
   * @param {Object} config Configuration options (see DEFAULT_CONFIG).
   * @public
   */
  constructor(config) {
    // Make a copy of default configuration, then apply overrides
    this.config = Object.assign({}, DEFAULT_CONFIG);
    this.config = Object.assign(this.config, config);
    this.allHandlers = { };
    this.verbosity = parseInt(this.getSetting("verbosity", 0));

    // Load all run time client handlers found in the handler directory
    let hdir = this.getSetting("handlerDir", undefined);
    if (typeof(hdir) === STRING_TYPE) {
      this.loadHandlers(hdir);
    }
  }

  /**
   * Starts running the server and accepting client connections.
   *
   * @public
   */
  start() {
    const port = this.getPort();
    if (this.shouldLog(1)) {
      console.log("Starting WebSocket server on port: " + port);
    }

    // Issue warning if no auth handlers installed?
    if (this.authHandlers === undefined) {
      if (this.shouldLog(1)) {
        console.log("WARNING: No authentication handler configured - allowing ALL connections");
      }
    }

    const wss = new WebSocket.Server({
      "port": port,
      "host": this.getSetting("bindHost", null),
      "backlog": this.getSetting("backlog", null)
    });
    
    this.server = wss;
    const self = this;

    wss.on('connection', function connection(wsc, req) {
      let cc = new ClientConnection(self, wsc, req);
      wsc.cc = cc;
      if (self.shouldLog(1)) {
        console.log("New connection from: " + cc.toString());
      }

      wsc.on('message', function incoming(jsonMessage) {
        this.cc.processMessage(jsonMessage);
      });

      if (self.authHandlers !== undefined) {
        // Special "login" authentication required
        cc.setHandlers(self.authHandlers);
      } else {
        // No "login" authentication required, enable all handlers
        self.setAuthenticated(cc);
      }
    });
  }
}

module.exports = JsonServer;

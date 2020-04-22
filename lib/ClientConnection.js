/**
 * Base class for each object representing a client connection to
 * the JSON WebSocket server.
 */
const { spawn } = require('child_process');
const WebSocket = require('ws');

/**
 * A single client connection to the JSON WebSocketServer.
 */
class ClientConnection {

  /**
   * Construct a new instance base on incoming request from client.
   *
   * @param {Object} wss The JsonServer that the client connection came in on.
   * @param {Object} ws A ws.WebSocket connection used to communicate with client.
   * @param {Object} req The http.IncomingMessage request received from client.
   */
  constructor(wss, ws, req) {
    this.wss = wss;
    this.ws = ws;
    this.remoteHost = req.connection.remoteAddress;
    this.remotePort = req.connection.remotePort;
    this.headers = req.headers;
    this.start = Date.now();
    this.last = this.start;
    this.commands = [];
    this.handlers = {};
  }

  /**
   * Get the WebSocket object associated with the connection.
   *
   * @return {Object} The WebSocket object (see the ws package),
   * that we use to communicate with the client.
   *
   * @public
   */
  getWebSocket() {
    return this.ws;
  }

  /**
   * Get the ready state of the WebSocket object associated with the connection.
   *
   * @return {Number} The WebSocket state (constant from the ws
   * package).  Will be ws.CONNECTING (0), ws.OPEN (1), ws.CLOSING (2)
   * or ws.CLOSED (3).
   *
   * @public
   */
  getReadyState() {
    return this.ws.readyState;
  }

  /**
   * Determine if the WebSocket connection is open and able to
   * send/receive messages.
   *
   * @public
   */
  isOpen() {
    return (this.getReadyState() === WebSocket.OPEN);
  }

  /**
   * Get reference to the JsonServer that owns this client connection.
   *
   * @return {Object} The JsonServer that owns the client as set in
   * the constructor.
   */
  getServer() {
    return this.wss;
  }

  /**
   * Sends a response message back to the client.
   *
   * @param {String} op The operation ("op") ID to associate with the
   * response message.
   * @param {Object} obj The JSON date (message) to send back (must be
   * convertable via JSON.stringify(obj)).
   */
  sendObj(op, obj) {
    obj["op"] = op;
    let msg = JSON.stringify(obj);
    if (this.shouldLog(8)) {
      console.log("message to: %s, sending: %s", this.toString(), msg);
    }
    this.ws.send(msg);
  }

  /**
   * Determine if a certain verbosity level should be logged.
   *
   * @param {Number} level Verbosity level to check.
   * @return {Boolean} true if verbosity is configured high enough
   * such that you should log your message.
   * @public
   */
  shouldLog(level) { return this.wss.shouldLog(level); }

  /**
   * Set table of all JSON message handlers.
   *
   * @param {Object} An associative array of 0 or more JSON message
   * handlers where the key is the operation ("op") to be performed
   * and the data is the callback method having the form of
   * callback(cc, msg) where cc is a reference to ClientConnection
   * that will process the message and msg is the JSON message
   * (Object) to process.
   */
  setHandlers(handlers) {
    this.handlers = handlers;
  }

  /**
   * Helper method to send a portion of output from running an
   * arbitrary command on the system.
   *
   * @param {Object} cmd The spawned command that is running in the background.
   *
   * @param {Array} data Array of byte values containing output from
   * the command.
   *
   * @param {String} state Type of output "out" (stdout) or "err" (stderr).
   */
  sendCmdOutput(cmd, data, state) {
    let resp = { "pid": cmd.pid, "state": state };
    if (cmd.encoding === undefined) {
      resp["bytes"] = data;
    } else {
      resp["text"] = data.toString(cmd.encoding);
    }
    resp["ws"] = (typeof this.ws);
    this.sendObj(cmd.op, resp);
  }

  /**
   * Kill one of this client's running processes.
   *
   * <p>NOTE: This message sends an acknowledgement message indicating
   * the results of its attempt to kill the child process. Once the
   * process terminates, a "exec" message with an "exit" state will
   * also be generated and sent to the client.</p>
   *
   * @param {Object} msg Message object with "signal" and "pid" attributes.
   */
  kill(msg) {
    var op = msg["op"];

    let signal = msg["signal"];
    let pid = parseInt(msg["pid"]);
    let cmd = this.commands.find((c) => c.pid == pid);
    if (cmd !== undefined) {
      cmd.kill(signal);
      msg["startedBy"] = cmd.startedBy;
      msg["message"] = "Sent signal " + signal + " to PID " + pid;
      msg["killed"] = cmd.killed;
    } else {
      msg["message"] = "Failed to locate PID in client command list (ignored request)";
      msg["killed"] = false;
      msg["code"] = 1;
    }
    this.sendObj(op, msg);
  }

  /**
   * Start executing a process in the background and send back output as it occurs.
   *
   * @param {Object} msg JSON message.
   * @param {String} msg.op Operation that triggered invocation ("exec").
   * @param {String} msg.cmd Fully qualified path of command to run
   * (like: "/bin/ps").
   * @param {Array} msg.args Array of 0 or more arguments to pass to
   * command (like: [ "-fu", "nstwui" ]).
   * @param {Object} msg.options Options for child_process.spawn()
   * invocation (see: https://nodejs.org/api/child_process.html).
   * @param {String} msg.encoding Optional encoding. Pass "utf-8" if
   * you want output back as strings instead of array of bytes.
   */
  exec(msg) {
    let op = msg["op"];
    let cmd = spawn(msg["cmd"], msg["args"], msg["options"]);
    cmd.op = op;
    cmd.encoding = msg["encoding"];
    cmd.startedBy = msg;
    
    this.commands.push(cmd);

    // Data handler when process writes to stdout
    cmd.stdout.on('data', (data) => {
      this.sendCmdOutput(cmd, data, "out");
    });

    // Data handler when process writes to stderr
    cmd.stderr.on('data', (data) => {
      this.sendCmdOutput(cmd, data, "err");
    });

    // Exit handler when process terminates from exit() or signal
    cmd.on('exit', (code, signal) => {
      // Remove command for list of running commands
      this.commands = this.commands.filter((c) => (c.pid != cmd.pid));
      this.sendObj(op, { "pid": cmd.pid, "state": "exit", "code": code, "signal": signal, "startedBy": msg });
    });
    
    // Error handler if failure to start process
    cmd.on('error', (err) => {
      // Remove error command from list
      this.commands = this.commands.filter((c) => (c !== cmd));
      let msg = { "state": "error", "message": err.toString(), "startedBy": cmd.startedBy };
      this.sendObj(op, msg);
    });
    msg["pid"] = cmd.pid;
    msg["state"] = "started";
    this.sendObj(op, msg);
  }

  /**
   * Attempts to process a message for the client.
   *
   * <p>If the message specifies a known operation ("op"), then that
   * operation handler will be invoked (see setHandlers()).</p>
   *
   * <p>NOTE: If the client requests a bad operation and triggers an
   * error, the client's connection will be closed!</p>
   *
   * @param {Object} jsonMessage The message to process.
   * @param {String} jsonMessage.op The name of the operation to perform.
   */
  processMessage(jsonMessage) {
    try {
      let msg = JSON.parse(jsonMessage);
      let req = msg["op"];
      if (this.shouldLog(8)) {
        console.log('message from: %s, received: %s', this.toString(), jsonMessage);
      }
      this.handlers[req](this, msg);
      this.last = Date.now();
    } catch (err) {
      if (this.shouldLog(1)) {
        console.log("message from: %s, ERROR: %s, message: %s", this.toString(), err.toString(), jsonMessage);
      }
      this.close();
    }
  }

  /**
   * A nice string representation of the connection (for logging purposes).
   *
   * return {String} A string in the form of HOST:PORT where PORT is
   * the port at used by the client. NOTE: Host will be inside square
   * brackets if it contains colons like an IPv6 address.
   * @public
   */
  toString() {
    let h = this.remoteHost;
    if (h.indexOf(':') !== -1) {
      h = "[" + h + "]";
    }
    return h + ":" + this.remotePort;
  }

  /**
   * Closes the connection.
   *
   * @public
   */
  close() {
    this.ws.close();
  }

  /**
   * Get status information about the server and client.
   *
   * @return {Object} A JSON object providing information about the
   * client connection.
   * @public
   */
  getStatus() {
    let handlerNames = [ ];
    for (var name in this.handlers) {
      handlerNames.push(name);
    }
    let ca = [ ];
    for (let i = 0; i < this.commands.length; i++) {
      let c = this.commands[i];
      ca.push({ "pid": c.pid, "startedBy": c.startedBy });
    }
    
    let status = {
      "start": this.start,
      "last": this.last,
      "handlers": handlerNames,
      "remoteAddress": this.remoteHost,
      "remotePort": this.remotePort,
      "running": ca,
      "headers": this.headers
    };
    return status;
  }
  
  /**
   * Helper method to fetch a value from a hash table or return a
   * default value if not found.
   *
   * @param {Object} obj The hash table to lookup value from (can be undefined).
   * @param {String} key Key into hash table to pull value from (can
   * be undefined).
   * @param {Object} defval The default value to return if unable to
   * look up or not found.
   * @return {Object} The value found in the hash table or defval if
   * not available.
   * @public
   */
  static getAttribute(obj, attr, defval) {
    let val = defval;
    if ((obj !== undefined) && (attr !== undefined)) {
      let aval = obj[attr];
      if (aval !== undefined) {
        val = aval;
      }
    }
    return val;
  }
}

module.exports = ClientConnection;

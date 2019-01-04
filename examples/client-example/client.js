/**
 * Class definition for a JSON message based WebSocket server to
 * demonstrate/test the messages that are available.
 * 
 * @returns {Tool} The tool used to communicate with the server.
 */
function Tool() {
}

/**
 * Update the state of the web socket connection (show user if we are
 * connected or not).
 * 
 * @param {String} state The new ASCII state of the Web Socket connection. 
 */
Tool.prototype.setState = function(state) {
  this.state = state;
  if (this.statusWidget !== undefined) {
    this.statusWidget.removeChild(this.statusWidget.firstChild);
    this.statusWidget.className = state;
    this.statusWidget.appendChild(document.createTextNode(state));
  }
  if (this.startWidget !== undefined) {
    this.startWidget.disabled = (state === "Connected");
  }
  if (this.sendWidget !== undefined) {
    this.sendWidget.disabled = (state !== "Connected");
  }
};

/**
 * Start up the WebSocket connection to the server.
 */
Tool.prototype.start = function() {
  this.stop();
  if (this.ws === undefined) {
    this.setState("Connecting");
    this.ws = new WebSocket(this.url.value);
    var self = this;

    this.ws.onmessage = function (event) {
      var jsonOkCss = "bad";
      var textOut = event.data;
      try {
        // Save in global variable so it can be inspected in debugger
        var obj = Window.lastJsonMsg = JSON.parse(event.data);
        if (obj !== null) {
          jsonOkCss = "good";
          textOut = JSON.stringify(obj, null, 2);
        }
      } catch (e) {
      }
      var msgWidget = self.createElement("pre", textOut, "wsMsgContent " + jsonOkCss);
      var output = self.outputWidget;
      output.appendChild(msgWidget);
      // Scroll div to bottom
      output.scrollTop = output.scrollHeight;
    };

    this.ws.onopen = function(event) {
      self.setState("Connected");
    };

    this.ws.onclose = function(event) {
      self.setState("Disconnected");
    };

    this.ws.onerror = function(event) {
      self.setState("Error");
      self.ws.close();
    };

  }
};

/**
 * Stop the TLP web socket connection to the server.
 */
Tool.prototype.stop = function() {
  if (this.ws !== undefined) {
    this.setState("Disconnecting");
    this.ws.close();
    delete this.ws;
  }
};

/**
 * Method that creates a element to insert into the document.
 * 
 * @param type The type (like "div") of HTML elment you want to
 * create.
 *
 * @param text Initial text to append to the create element (omit if
 * you don't want anything appended).
 *
 * @param cname The class name to assign to the created element
 * (defaults to "jsonWs" if omitted).
 *
 * @returns DOM element that can be added to the document.
 */
Tool.prototype.createElement = function(type, text, cname) {
  var widget = document.createElement(type);
  widget.className = (cname !== undefined ? cname : "jsonWs");
  if (text !== undefined) {
    var tnode = document.createTextNode(text);
    widget.appendChild(tnode);
  }
  return widget;
};

/**
 * Method that creates and appends a new element.
 * 
 * @param parent The parent node to append the new element to.
 *
 * @param type The type (like "div") of HTML elment you want to create.
 *
 * @param text Initial text to append to the create element (omit if
 * you don't want anything appended).
 *
 * @param cname The class name to assign to the created element
 * (defaults to "jsonWs" if omitted).
 *
 * @returns DOM element that was appended to the parent.
 */
Tool.prototype.appendElement = function(parent, type, text, cname) {
  var widget = this.createElement(type, text, cname);
  parent.appendChild(widget);
  return widget;
};

/**
 * Method which takes the user entered message and sends it to the server.
 */
Tool.prototype.send = function() {
  if (this.ws === undefined) {
    this.start();
  }
  var message = this.jsonInput.value;
  this.ws.send(message);
};

/**
 * Returns a reference to the WUI tool the user interacts with
 * (creating on first invocation).
 * 
 * @returns A DOM widget you can add to your HTML document.
 */
Tool.prototype.getWidget = function() {
  if (this._Widget !== undefined) {
    return this._Widget;
  }
  var self = this;
  var widget = this._Widget = this.createElement("div");

  this.url = this.appendElement(widget, "input");
  var hostname = "127.0.0.1";
  if (window.location && window.location.hostname) {
    hostname = window.location.hostname;
  }
  this.url.value = "ws://" + hostname + ":9981/ws";

  var start = this.appendElement(widget, "button", "Connect");
  this.startWidget = start;
  start.onclick = function (event) {
    self.start();
  };

  var stop = this.appendElement(widget, "button", "Disconnect");
  this._Stop = stop;
  stop.onclick = function (event) {
    self.stop();
  };

  this.state = "Disconnected";
  this.statusWidget = this.appendElement(widget, "span", this.state);

  this.appendElement(widget, "h2", "Enter Message To Send");
  
  var quickList = this.appendElement(widget, "select");
  var choices = [
    "authenticate: Enable Actions", {
      "op": "authenticate",
      "comment": "NOTE: How authentication is done is configurable"
    },
    "status: Get some status info", { "op": "status" },
    "exec: bash", {
      "op": "exec", "cmd": "/bin/bash",
      "args": [ "-c", "ls -l /etc/hosts; for ((i = 0; i < 20; i++)); do date; sleep 3; done" ], "options": { },
      "encoding": "utf-8" },
    "kill: Stop Child Process", { "op": "kill", "signal": "SIGTERM", "pid": -1 },
    "stat: File Info", { "op": "stat", "path": "/etc/hosts" },
    "readdir: Directory Listing", { "op": "readdir", "path": "/etc/sysconfig", "options": { } },
    "time: Current Time", { "op": "time" },
    "verbosity: Get log verbosity", { "op": "verbosity" },
    "verbosity: Set log verbosity", { "op": "verbosity", "set": 9 },
    "echo: Echo Back JSON", { "op": "echo", "text": "entire JSON message should come back" }
  ];

  for (var i = 0; i < choices.length;) {
    var label = choices[i++];
    var value = choices[i++];
    var option = this.appendElement(quickList, "option", label);
    option.value = value;
  }
  quickList.onchange = function(event) {
    var selected = quickList.selectedIndex;
    var obj = choices[selected * 2 + 1];
    var value = JSON.stringify(obj, null, 2);
    self.jsonInput.value = value;
  };

  var jsonInput = this.jsonInput = this.appendElement(widget, "textarea");
  let checkInput = function() {
    try {
      JSON.parse(jsonInput.value);
      jsonInput.className = "jsonWs good";
    } catch (ignore) {
      jsonInput.className = "jsonWs bad";
    }
  }
  jsonInput.oninput = checkInput;
  this.jsonInput.value = JSON.stringify(choices[1], null, 2);
  checkInput();

  var send = this.appendElement(widget, "button", "Send");
  this.sendWidget = send;
  send.onclick = function (event) {
    self.send();
  };

  var clearWidget = this.appendElement(widget, "button", "Clear Output");
  clearWidget.onclick = function (event) {
    var widget = self.outputWidget;
    for (var i = widget.children.length - 1; i >= 0; i--) {
      widget.removeChild(widget.children[i]);
    }
  };

  this.appendElement(widget, "h2", "Messages Received");

  this.outputWidget = this.appendElement(widget, "div", undefined, "wsRxd");
  widget.appendChild(this.outputWidget);

  this.setState(this.state);

  return widget;
};

/**
 * Helper method to create and insert the tool into the HTML
 * document (appends to the document element with an ID of "tool").
 *
 * @return {Tool} The newly created tool.
 */
function insertTool() {
  var node = document.getElementById("tool");
  var tool = new Tool();
  node.appendChild(tool.getWidget());
  return tool;
}

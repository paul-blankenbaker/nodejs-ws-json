# nodejs-ws-json

A JSON layer on top of the ws Node.js WebSocket module

# Overview

This generic framework provides a WebSocket interface built on top of
the ws Node.js WebSocket module that expects all messages between the
client and the server to be in a valid JSON.

Each JSON message sent from the client to the server MUST contain the
"op" attribute indicating the desired operation to be performed. For
example a minimal request from the server to request the time from the
server has the form:

```json
{ "op": "time" }
```

The server then responds with a JSON message of the form:

```json
{ "op": "time", "time": 1542318407143 }
```

The server is designed with the following features:

- Communications are configurable (ws, wss, port, etc).
- Factory handlers are optional (you can disable them).
- Custom handlers can be added on a per server instance.
- The authentication mechanism is pluggable.

## Running The Server

## Example Client

The doc/client-example directory contains a stand-alone web page, CSS
and JavaScript files that can be used to test/exercise your server
locally. To use the client, simply open the "client.html" file in your
web browser (tested on Chrome).

- You will need to fill in the URL necessary to connect to your
  instance of the server and then press the "Connect" button.

- From there you can type in JSON messages and press the "Send"
  button.

- Responses from the server should appear in the lower window.

- Entering invalid messages will likely result in your connection
  being dropped (the server does not like mis-behaving clients).

- There is a quick list that will load some JSON messages that can be
  processed by the factory default handlers (however, if you have the
  factory default handlers disabled, this won't do much for you).

# Build Commands

## To Build/Test

```
npm install
npm test
```

## To Package

```
npm pack
```

'use strict';

const expect = require('chai').expect;

const pkg = require('../index.js');
const Client = pkg.Client;
const Server = pkg.Server;

describe('# ClientConnection Class', function() {
  it('ClientConnection Object', function() {
    var result = typeof(Client);
    expect("function").to.equal(result);
  });

  it('ClientConnection getAttribute default', function() {
    var result = Client.getAttribute({ }, "key", "defaultValue");
    expect("defaultValue").to.equal(result);

    result = Client.getAttribute(undefined, "key", "defaultValue");
    expect("defaultValue").to.equal(result);
  });

  it('ClientConnection getAttribute boolean', function() {
    var result = Client.getAttribute({ "key": true }, "key", "defaultValue");
    expect(true).to.equal(result);

    result = Client.getAttribute({ "key2": false }, "key2", "defaultValue");
    expect(false).to.equal(result);
  });

  it('ClientConnection getAttribute String', function() {
    var result = Client.getAttribute({ "key": "xyz" }, "key", "defaultValue");
    expect("xyz").to.equal(result);

    result = Client.getAttribute({ "key2": "" }, "key2", "defaultValue");
    expect("").to.equal(result);
  });

  it('ClientConnection getAttribute undefined', function() {
    var result = Client.getAttribute({ }, "key", undefined);
    expect(undefined).to.equal(result);

    result = Client.getAttribute(undefined, "key2", undefined);
    expect(undefined).to.equal(result);
  });
});


describe('# Server Class', function() {
  it('Server Constructor', function() {
    var result = new Server({ "port": 9876 });
    expect("JsonServer:9876").to.equal(result.toString());
  });

  it('Server getPort()', function() {
    const server = new Server({ "port": 9876 });
    const result = server.getPort();
    expect(9876).to.equal(result);
  });

  it('Server getPort() default', function() {
    const server = new Server({ });
    const result = server.getPort();
    expect(9981).to.equal(result);
  });
});

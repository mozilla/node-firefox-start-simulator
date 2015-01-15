# node-firefox-start-simulator

Start a Firefox OS simulator in NodeJS/CLI.

This is part of the [node-firefox](https://github.com/mozilla/node-firefox) project.

## Installation

### From git

```sh
git clone https://github.com/mozilla/node-firefox-start-simulator.git
cd node-firefox-start-simulator
npm install
```

If you want to update later on:

```sh
cd node-firefox-start-simulator
git pull origin master
npm install
```

### npm
This module is not on npm yet.

## Usage

#### Callback

```javascript
var start = require('./node-firefox-start-simulator');
start(function(err, sim) {

})
```

#### Promise

```javascript
var start = require('./node-firefox-start-simulator');
start()
  .then(
    function(sim) {
    },
    function(err) {
    }
  );
```

## Examples

#### Start a simulator on known port, connect and return client

Start a FirefoxOS simulator and connect to it through [firefox-client](https://github.com/harthur/firefox-client) by returning `client`.
```javascript
var start = require('./node-firefox-start-simulator');
start({ port: 1234, connect: true }, function(err, sim) {
  // Let's show for example all the running apps
  sim.client.getWebapps(function(err, webapps) {
    webapps.listRunningApps(function(err, apps) {
      console.log("Running apps:", apps);
    });
  });
})
```

#### Start a simulator on known port without connecting
Just start a FirefoxOS simulator without opening a connection:

```javascript
var start = require('./node-firefox-start-simulator');
start({ port: 1234, connect: false }, function(err, sim) {
  // Let's show for example all the running apps
  sim.client.connect(1234, function() {
    client.getWebapps(function(err, webapps) {
      webapps.listRunningApps(function(err, apps) {
        console.log("Running apps:", apps);
      });
    });
  });
})
```

#### Start and kill simulator

```javascript
var start = require('./node-firefox-start-simulator');
start({ connect: true }, function(err, sim) {
  sim.client.disconnect();
  process.kill(sim.pid);
})
```

#### Force start a simulator

```javascript
var start = require('./node-firefox-start-simulator');
start({ connect: true, force: true }, function(err, sim) {
  sim.client.disconnect();
  process.kill(sim.pid);
})
```

##History

This is based on initial work on fxos-start by Nicola Greco.


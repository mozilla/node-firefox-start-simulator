# fxos-start

Start a FirefoxOS simulator if no simulator is running.

## Install

```sh
# Library
$ npm install fxos-start

# Command line
$ npm install -g fxos-start
```

## Usage

### Command line

```sh
Usage: fxos-start [options]

Options:
   -p, --port                   Port of FirefoxOS
   -f, --force                  Kill other simulators on this port
   --verbose                    Set the output level to verbose
   --bin                        Set external B2G bin
   --profile                    Set external B2G profile
   --release <release>          Release of FirefoxOS to filter
   --exit                       Exit after startup
   --stdin <stdin filepath>     The path where stdin of the simulator will be redirected to
   --stdout <stdout filepath>   The path where stdout of the simulator will be redirected to
   --stderr <stderr filepath>   The path where stderr of the simulator will be redirected to
   --timeout                    The timeout time to wait for a response from the Simulator.
   --version                    Print version and exit
```

### Node library

### Start a simulator on known port, connect and return client

Start a FirefoxOS simulator and connect to it through [firefox-client](https://github.com/harthur/firefox-client) by returning `client`.
```javascript
var start = require('fxos-start');
start({port:1234}, function(err, sim) {
  // Let's show for example all the running apps
  sim.client.getWebapps(function(err, webapps) {
    webapps.listRunningApps(function(err, apps) {
      console.log("Running apps:", apps);
    });
  });
})
```

### Start a simulator on known port without connecting
Just start a FirefoxOS simulator without opening a connection:

```javascript
var start = require('fxos-start');
start({port:1234, connect:false}, function(err) {
  // Let's show for example all the running apps
  client.connect(1234, function() {
    client.getWebapps(function(err, webapps) {
      webapps.listRunningApps(function(err, apps) {
        console.log("Running apps:", apps);
      });
    });
  });
})
```

### Start a simulator on any port
Just start a  without opening a connection:

```javascript
var start = require('fxos-start');
start(function(err, sim) {
  // Let's show for example all the running apps

  sim.client.getWebapps(function(err, webapps) {
    webapps.listRunningApps(function(err, apps) {
      console.log("Running apps:", apps);
    });
  });
})
```

### Start and kill simulator

```javascript
var start = require('fxos-start');
start(function(err, sim) {
  sim.client.disconnect();
  process.kill(sim.pid);
})
```

### Force start a simulator

```javascript
var start = require('fxos-start');
start({force: true}, function(err, sim) {
  sim.client.disconnect();
  process.kill(sim.pid);
})
```

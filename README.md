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


### Start a simulator on known port, connect and return client

Start a FirefoxOS simulator and connect to it through [firefox-client](https://github.com/harthur/firefox-client) by returning `client`.
```javascript
var start = require('fxos-start');
start({port:1234}, function(err, client) {
  // Let's show for example all the running apps
  client.getWebapps(function(err, webapps) {
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
start(function(err, client) {
  // Let's show for example all the running apps

  client.getWebapps(function(err, webapps) {
    webapps.listRunningApps(function(err, apps) {
      console.log("Running apps:", apps);
    });
  });
})
```

## Usage with command line

```sh
$ fxos-start
Firefox Simulator started on port 8901

$ fxos-start -p 8001
Firefox Simulator started on port 8001
```

```sh
Usage: fxos-start [options]

Options:
   -p, --port   Port of FirefoxOS
   --version    Print version and exit
```

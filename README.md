# moz-start-b2g

Start a FirefoxOS simulator if no simulator is running.

## Install

```
$ npm install moz-start-b2g
```

## Usage


### Start a simulator on known port, connect and return client

Start a B2G and connect to it through [firefox-client](https://github.com/harthur/firefox-client) by returning `client`.
```javascript
var startB2G = require('moz-start-b2g');
startB2G({port:1234}, function(err, client) {
  // Let's show for example all the running apps
  client.getWebapps(function(err, webapps) {
    webapps.listRunningApps(function(err, apps) {
      console.log("Running apps:", apps);
    });
  });
})
```

### Start a simulator on known port without connecting
Just start a B2G without opening a connection:

```javascript
var startB2G = require('moz-start-b2g');
startB2G({port:1234, connect:false}, function(err) {
  // Let's show for example all the running apps
  client.connect(7653, function() {
    client.getWebapps(function(err, webapps) {
      webapps.listRunningApps(function(err, apps) {
        console.log("Running apps:", apps);
      });
    });
  });
})
```

### Start a simulator on any port
Just start a B2G without opening a connection:

```javascript
var startB2G = require('moz-start-b2g');
startB2G(function(err, client) {
  // Let's show for example all the running apps

  client.getWebapps(function(err, webapps) {
    webapps.listRunningApps(function(err, apps) {
      console.log("Running apps:", apps);
    });
  });
})
```
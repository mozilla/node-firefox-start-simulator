# moz-start-b2g

Start a FirefoxOS simulator if no simulator is running.

## Install

```
$ npm install moz-start-b2g
```

## Usage

Start a B2G and connect to it through [firefox-client](https://github.com/harthur/firefox-client) by returning `client`.
```javascript
var startB2G = require('moz-start-b2g');
startB2G({port:1234}, function(client) {
  console.log(client)
})
```

Just start a B2G without opening a connection:

```javascript
var startB2G = require('moz-start-b2g');
startB2G({port:1234, connect:false}, function(client) {
  console.log(client)
})
```
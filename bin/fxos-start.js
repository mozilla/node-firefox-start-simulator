#!/usr/bin/env node

var fs = require('fs');
var path = require('path');
var Q = require('q');
var startB2G = require('../index');

var opts = require("nomnom")
  .option('port', {
    abbr: 'p',
    help: 'Port of FirefoxOS'
  })
  .option('version', {
    flag: true,
    help: 'Print version and exit',
    callback: function() {
      fs.readFile(path.resolve(__dirname, '../package.json'), 'utf-8', function(err, file) {
        console.log(JSON.parse(file).version);
      });
    }
  })
  .parse();

// No need to create FirefoxClient
opts.connect = false;

startB2G(opts)
  .then(function(client){
    console.log("Firefox Simulator started on port", opts.port);
  })
  .catch(function(err) {
    console.log("Error", err);
  }).done();
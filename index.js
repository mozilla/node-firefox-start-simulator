#!/usr/bin/env node

var findB2G = require('moz-find-b2g');
var net = require('net');
var discoverPorts = require('moz-discover-ports');
var exec = require('shelljs').exec;
var async = require('async');
var FirefoxClient = require("firefox-client");


module.exports = startB2G;

function whenPortReady(port, cb) {
  var sock = new net.Socket();
  sock.on('connect', function() {
      sock.destroy();
      cb();
  }).on('error', function(e) {
      setTimeout(function() {
        whenPortReady(port, cb);
      }, 1000);
  }).connect(port,'localhost');
}

function startB2G (opts, callback) {

  function _startB2G(opts, done) {
    var opened_ports = discoverPorts();
    if (opened_ports.b2g.indexOf(opts.port) > -1) {
      return done(null, opts);
    }

    async.waterfall([
      function(next) {
        if (opts.bin && opts.profile)
          return next(null, opts);

        findB2G(opts, function(err, b2gs) {
          if (b2gs && b2gs[0])
            return next(err, b2gs[0]);

          next(err || "No b2g found");
        });
      },
      function(b2g, next) {
        var port = opts.port;
        var command = '"' + b2g.bin + '" -profile "' + b2g.profile + '" -start-debugger-server ' + port + ' -no-remote';
        var output = exec(command, {silent: true, async:true}).output;
        next(null, opts);
      }], done);
  }

  _startB2G(opts, function(err, b2g_instance) {

    whenPortReady(opts.port, function() {

      if (opts.connect === false) {
        return callback(err, b2g_instance);
      }

      var client = new FirefoxClient();
      client.connect(opts.port, function(err) {
        callback(err, client);
      });

    });

  });

}

if (require.main === module) {
  (function() {
    startB2G({port:7653}, function(err, ports){
      if (err) return console.err("err", err);
      console.log("Running Firefox on ports", ports);
    });
  })();
}
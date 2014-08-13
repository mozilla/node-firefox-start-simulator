#!/usr/bin/env node

var findB2G = require('moz-find-b2g');
var discoverPorts = require('moz-discover-ports');
var exec = require('shelljs').exec;
var async = require('async');
var FirefoxClient = require("firefox-client");


module.exports = startB2G;

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

      if (opts.connect === false) {
        return callback(err, b2g_instance);
      }

      // TODO wait a bit to make sure sim is on!
      var client = new FirefoxClient();
      client.connect(opts.port, function(err) {
        callback(err, client);
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
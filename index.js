#!/usr/bin/env node

var findB2G = require('moz-find-b2g');
var discoverPorts = require('moz-discover-ports');
var exec = require('shelljs').exec;
var async = require('async');


module.exports = startB2G;

function startB2G (opts, callback) {

  var opened_ports = discoverPorts();

  if (opened_ports.b2g.indexOf(opts.port) > -1) {
    return callback(null, opts);
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
      console.log(command);
      var output = exec(command, {silent: true, async:true}).output;
      console.log(output);
      next(null, opts);
    }], callback);

}

if (require.main === module) {
  (function() {
    startB2G({port:7653}, function(err, ports){
      if (err) return console.log(err);
      console.log("Running Firefox on ports", ports);
    });
  })();
}
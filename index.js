#!/usr/bin/env node

var findB2G = require('moz-find-b2g');
var Q = require('q');
var net = require('net');
var discoverPorts = require('moz-discover-ports');
var exec = require('shelljs').exec;
var async = require('async');
var FirefoxClient = require("firefox-client");
var portfinder = require('portfinder');


module.exports = startB2G;

function portIsReady(port, cb) {
  var defer = Q.defer();

  function ping(defer) {
    var sock = new net.Socket();
    sock.setTimeout(5000);
    sock
      .on('connect', function() {
        sock.destroy();
        defer.resolve();
      })
      .on('timeout', function(e) {
        defer.reject(new Error(e));
      })
      .on('error', function(e) {
        setTimeout(function() {
          ping(defer);
        }, 1000);
      })
      .connect(port,'localhost');
  }
  ping(defer);

  return defer.promise;
}

function runB2G(opts, callback) {
  var defer = Q.defer();
  var command = '"' + opts.bin + '" -profile "' + opts.profile + '" -start-debugger-server ' + opts.port + ' -no-remote';
  var output = exec(command, {silent: true, async:true}).output;
  if (callback) callback(null, opts);
  defer.resolve(opts);
  return defer.promise;
}

function getPort (opts, found) {
  var opened_ports = discoverPorts().b2g;

  if (opened_ports.length > 0) {
    found(null, opened_ports[0]);
  } else {
    portfinder.getPort(found);
  }
}

function startB2G (opts, done) {

  var defer = Q.defer();

  if (typeof opts == 'function') {
    done = opts;
    opts = {};
  }

  var opened_ports = discoverPorts().b2g;

  // If no port is specified, find a port and restart
  if (!opts.port)
    return getPort(opts, function(err, port) {
      opts.port = port;
      return startB2G(opts, done);
    });


  Q.Promise(function(resolve, reject, notify) {
    // A simulator is open on the same port, we use it
    if (opened_ports.indexOf(opts.port) > -1) {
      return resolve(opts);
    }
    // Otherwise we start one with settings we want
    else if (opts.bin && opts.profile) {
      return resolve(opts);
    }
    // Or we start one.
    else {
      findB2G(opts, function(err, b2gs) {
        opts.bin = b2gs[0].bin;
        opts.profile = b2gs[0].profile;
        runB2G(opts).then(resolve);
      });
    }
  })
  .then(function() {
    return portIsReady(opts.port);
  })
  .then(function() {
    if (opts.connect === false) {
      if (done) done(null, opts);
      defer.resolve(opts);
    }
    else {
      var client = new FirefoxClient();
      client.connect(opts.port, function(err) {
        if (done) done(err, client);
        defer.resolve(client);
      });
    }
  });
  
  return defer.promise;
}

if (require.main === module) {
  (function() {
    startB2G({port:7653}, function(err, client){
      if (err) return console.err("err", err);
      console.log("Connected and disconnected")
      client.disconnect();
    });
  })();
}
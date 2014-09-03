#!/usr/bin/env node

var findSimulators = require('fxos-simulators');
var Q = require('q');
var net = require('net');
var discoverPorts = require('fx-ports');
var spawn = require('child_process').spawn;
var async = require('async');
var FirefoxClient = require("firefox-client");
var portfinder = require('portfinder');
var fs = require('fs');


module.exports = startB2G;

function portIsReady(port, cb) {
  var defer = Q.defer();

  function ping(defer) {
    var sock = new net.Socket();
    sock
      .on('connect', function() {
        sock.destroy();
        defer.resolve();
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

function commandB2G(opts, callback) {
  var defer = Q.defer();

  var options;
  options = { stdio: ['ignore', 'ignore', 'ignore'] };
  if (opts.exit) {
    options.detached = true;
  }
  if (opts.verbose) {
    options.stdio = [process.stdin,  process.stdout, process.stderr];
  }

  if (opts.stdin) options.stdio[0] = fs.openSync(opts.stdin, 'a');
  if (opts.stdout) options.stdio[1] = fs.openSync(opts.stdout, 'a');
  if (opts.stderr) options.stdio[2] = fs.openSync(opts.stderr, 'a');

  var bin = spawn(
    opts.bin,
    ['-profile', opts.profile, '-start-debugger-server', opts.port, '-no-remote'],
    options
  );

  if (opts.exit) bin.unref();
  if (callback) callback(null, bin);
  defer.resolve(bin);
  return defer.promise;
}

function connect (opts, callback) {

  var defer = Q.defer();

  var client = new FirefoxClient();
  client.connect(opts.port, function(err) {
    if (err) return defer.reject(err);
    opts.client = opts.client || client;
    if (callback) callback(err, client);
    defer.resolve(client);
  });

  return defer.promise;
}

function runB2G (opts) {
  var opened_ports = discoverPorts().b2g;

  // Port is not open
  if (opened_ports.indexOf(opts.port) == -1) {
    var commandReady = commandB2G(opts);
    var portReady = commandReady.then(portIsReady.bind(null, opts.port));

    return Q.all(commandReady, portReady);
  }
  // Port already open
  else {
    return Q();
  }
}

function getPort (opts, found) {
  var deferred = Q.defer();

  var opened_ports = discoverPorts().b2g;

  if (opened_ports.length > 0) {
    if (found) found(null, opened_ports[0]);
    deferred.resolve(opened_ports[0]);
  } else {
    portfinder.getPort(function(err, port){
      if (found) found(err, port);
      deferred.resolve(port);
    });
  }

  return deferred.promise;
}

function findSimulatorsPromise (opts) {
  var deferred = Q.defer();
  findSimulators(opts, deferred.makeNodeResolver());
  return deferred.promise;
}

function findPaths (opts) {
  return findSimulatorsPromise(opts).then(function(b2gs) {
    var latestB2G = b2gs[b2gs.length - 1];
    return latestB2G;
  });
}

function findPort (opts) {
  return getPort(opts)
    .then(function(port) {
      return port;
    });
}

function startB2G () {

  var args = arguments;
  var opts = {};
  var callback;

  var promise = Q();

  /* Overloading */

  // startB2G(opts [, callback])
  if (typeof args[0] == 'object') {
    opts = args[0];
  }

  // startB2G(..., callback)
  if (typeof args[args.length-1] == 'function') {
    callback = args[args.length-1];
  }

  /* Options */

  // if client is passed, no need to start
  if (opts.client) {
    return Q().then(function() {
      if (callback) callback(null, opts.client);
      return opts.client;
    });
  }

  if (typeof opts.connect == 'undefined') {
    opts.connect = true;
  }

  /* Promises */

  // Make sure we have bin, profile and port
  var pathsReady = (opts.bin && opts.profile) || findPaths(opts);
  var portReady = opts.port || findPort(opts);

  var ready = Q.all([pathsReady, portReady])
    .spread(function(paths, port) {
      if (!opts.bin) opts.bin = paths.bin;
      if (!opts.profile) opts.profile = paths.profile;
      if (!opts.sdk) opts.sdk = paths.sdk;
      if (!opts.port) opts.port = port;
    });

  // If port is already open stop here

  var simulatorReady = ready
    .then(runB2G.bind(null, opts))
    .then(function(running) {
      return {process: running};
    });

  if (opts.connect) {
    var clientReady = simulatorReady
      .then(connect.bind(null, opts, callback));

    return Q.all(simulatorReady, clientReady)
      .spread(function(simulator, client) {
        simulator.client = client;
        return simulator;
      });
  }

  return simulatorReady;
}

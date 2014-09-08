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
var __ = require('underscore');


module.exports = startB2G;

function portIsReady(port, cb) {
  var defer = Q.defer();

  function ping() {
    var sock = new net.Socket();
    sock
      .on('connect', function() {
        defer.resolve();
        sock.destroy();
      })
      .on('error', function(e) {
        sock.destroy();
        setTimeout(function() {
          ping(defer);
        }, 1000);
      })
      .connect(port,'localhost');
  }

  ping();

  return defer.promise;
}

function commandB2G(opts) {
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

  var sim_process = spawn(
    opts.bin,
    ['-profile', opts.profile, '-start-debugger-server', opts.port, '-no-remote'],
    options
  );


  if (!opts.exit) {
    // From https://www.exratione.com/2013/05/die-child-process-die/
    process.once('exit', function() {
      sim_process.kill("SIGTERM");
    });

    process.once("uncaughtException", function (error) {
      if (process.listeners("uncaughtException").length === 0) {
        sim_process.kill("SIGTERM");
        throw error;
      }
    });
  }


  if (opts.exit) sim_process.unref();
  defer.resolve(sim_process);
  return defer.promise;
}

function connect (opts) {

  var defer = Q.defer();

  var client = new FirefoxClient();
  client.connect(opts.port, function(err) {
    if (err) return defer.reject(err);
    opts.client = opts.client || client;
    defer.resolve(client);
  });

  return defer.promise;
}

function runB2G (opts) {
  var commandReady = commandB2G(opts);
  var portReady = commandReady.then(portIsReady.bind(null, opts.port));
  return portReady.then(function() {
    return commandReady;
  });
}

function getPort (opts) {
  var deferred = Q.defer();
  portfinder.getPort(deferred.makeNodeResolver());
  return deferred.promise;
}

function findSimulatorsPromise (opts) {
  var deferred = Q.defer();
  findSimulators(opts, deferred.makeNodeResolver());
  return deferred.promise;
}

function findPaths (opts) {
  return findSimulatorsPromise(opts)
    .then(function(b2gs) {
      var latestB2G = b2gs[b2gs.length - 1];
      return latestB2G;
    });
}

function startB2G () {

  var args = arguments;
  var opts = {};
  var callback;

  /* Overloading */

  // startB2G(opts [, callback])
  if (typeof args[0] == 'object') {
    opts = __.clone(args[0]);
  }

  // startB2G(..., callback)
  if (typeof args[args.length-1] == 'function') {
    callback = args[args.length-1];
  }

  /* Options */

  if (opts.force) {
    discoverPorts({b2g: true}, function(err, instances) {
      instances.forEach(function(instance) {
        process.kill(instance.pid);
      });
    });
  }

  // Defaults
  if (typeof opts.connect == 'undefined') {
    opts.connect = true;
  }

  if (!opts.timeout) {
    opts.timeout = 10*1000;
  }

  /* Promises */

  // Make sure we have bin, profile and port
  var pathsReady = (opts.bin && opts.profile) || findPaths(opts);
  var portReady = opts.port || getPort(opts);

  var optsReady = Q.all([pathsReady, portReady])
    .spread(function(paths, port) {

      opts.bin = opts.bin || paths.bin;
      opts.profile = opts.profile || paths.profile;
      opts.sdk = opts.sdk || paths.sdk;
      opts.port = opts.port || port;

      return opts;
    });

  var runReady = optsReady.then(runB2G);

  var simulatorReady = Q.all([optsReady, runReady])
    .spread(function(options, sim_process) {
      return __.extend(options, {process: sim_process});
    })
    .then(function(simulator) {
      var maybeConnected = Q(simulator);

      if (opts.connect) {
        maybeConnected = connect(simulator).then(function(client) {
          return __.extend(simulator, {client: client});
        });
      }

      return maybeConnected;
    });

  return simulatorReady.then(function(simulator) {
    if (callback) callback(null, simulator);
    return simulator;
  });

}


process.once("SIGTERM", function () {
  process.exit(0);
});
process.once("SIGINT", function () {
  process.exit(0);
});
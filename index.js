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
  var command = '"' + opts.bin + '" -profile "' + opts.profile + '" -start-debugger-server ' + opts.port + ' -no-remote';
  var output = exec(command, {silent: true, async:true}).output;
  if (callback) callback(null, opts);
  defer.resolve(opts);
  return defer.promise;
}

function runB2G (opts) {
  var opened_ports = discoverPorts().b2g;

  // Port is not open
  if (opened_ports.indexOf(opts.port) == -1) {
    return commandB2G(opts)
      .then(function() {
        return portIsReady(opts.port);
      });
  }
  // Port already open
  else {
    return Q();
  }
}

function connectB2G (opts, callback) {

  var defer = Q.defer();

  if (opts.connect === false) {
    if (callback) callback(null, opts);
    defer.resolve(opts);
  }
  else {
    var client = new FirefoxClient();
    client.connect(opts.port, function(err) {
      if (err) return defer.reject(err);
      opts.client = opts.client || client;
      if (callback) callback(err, client);
      defer.resolve(client);
    });
  }

  return defer.promise;
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

function findB2GPromise (opts) {
  var deferred = Q.defer();
  findB2G(opts, deferred.makeNodeResolver());
  return deferred.promise;
}

function findPaths (opts) {
  return findB2GPromise(opts).then(function(b2gs) {
    var latestB2G = b2gs[b2gs.length - 1];
    return {
      bin: latestB2G.bin,
      profile: latestB2G.profile
    };
  });
}

function findPort (opts) {
  return getPort(opts).then(function(port) {
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

  /* Promises */

  // Make sure we have bin, profile and port
  var pathsReady = (opts.bin && opts.profile) || findPaths(opts);
  var portReady = opts.port || findPort(opts);

  var ready = Q.all([pathsReady, portReady])
    .spread(function(paths, port) {
      if (!opts.bin) opts.bin = paths.bin;
      if (!opts.profile) opts.profile = paths.profile;
      if (!opts.port) opts.port = port;
    });

  // If port is already open stop here


  return ready
    .then(runB2G.bind(null, opts))
    .then(connectB2G.bind(null, opts, callback));

}

if (require.main === module) {
  (function() {
    startB2G({port:12345}, function(err, client){
      if (err) return console.err("err", err);
      console.log("Connected and disconnected");
    }).catch(function(err) {
      console.log("big error", err.stack);
    });
  })();
}

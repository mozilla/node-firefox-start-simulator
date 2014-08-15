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

function runB2G(opts, callback) {
  var defer = Q.defer();
  var command = '"' + opts.bin + '" -profile "' + opts.profile + '" -start-debugger-server ' + opts.port + ' -no-remote';
  var output = exec(command, {silent: true, async:true}).output;
  if (callback) callback(null, opts);
  defer.resolve(opts);
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

function startB2G (opts, callback) {

  var promise = Q();

  // startB2G(callback)
  if (typeof opts == 'function') {
    callback = opts;
    opts = {};
  }

  // If no b2g paths configs
  if (!opts.bin || !opts.profile) {
    var pathsReady = findB2GPromise(opts)
      .then(function(b2gs) {
        opts.bin = b2gs[0].bin;
        opts.profile = b2gs[0].profile;
    });

    promise = Q.all([promise, pathsReady]);
  }

  // If no port
  if (!opts.port) {
    var portReady = getPort(opts)
      .then(function(port) {
        opts.port = port;
      });

    promise = Q.all([promise, portReady]);
  }

  // If port is already open stop here
  var opened_ports = discoverPorts().b2g;

  return promise
    .then(function() {
      if (opened_ports.indexOf(opts.port) == -1) {
        return runB2G(opts)
          .then(function() {
            console.log(opts)
            return portIsReady(opts.port);
          });
      } else {
        return Q();
      }
    })
    .then(function() {
      return _startB2G(opts, callback);
    });

}

function _startB2G (opts, callback) {

  var defer = Q.defer();
  
  Q()
    .then(function() {
      if (opts.connect === false) {
        if (callback) callback(null, opts);
        defer.resolve(opts);
      }
      else {
        var client = new FirefoxClient();
        client.connect(opts.port, function(err) {
          if (callback) callback(err, client);
          defer.resolve(client);
        });
      }
    }).done()
  
  return defer.promise;
}

if (require.main === module) {
  (function() {
    startB2G({port:12345}, function(err, client){
      if (err) return console.err("err", err);
      console.log("Connected and disconnected");
      client.disconnect();
    }).catch(function(err) {
      console.log("big error", err);
    });
  })();
}
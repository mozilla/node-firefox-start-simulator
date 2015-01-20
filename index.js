'use strict';

// See https://github.com/jshint/jshint/issues/1747 for context
/* global -Promise */
var Promise = require('es6-promise').Promise;
var net = require('net');
var spawn = require('child_process').spawn;
var fs = require('fs');
var portFinder = require('portfinder');
var findSimulators = require('node-firefox-find-simulators');
var findPorts = require('node-firefox-find-ports');
var FirefoxClient = require('firefox-client');


module.exports = startSimulator;

function startSimulator(options) {

  var detached = options.detached ? true : false;
  var verbose = options.verbose ? true : false;
  var port = options.port;

  var simulatorOptions = {};
  if(options.version) {
    simulatorOptions.version = options.version;
  }

  return new Promise(function(resolve, reject) {

    Promise.all([ findSimulator(simulatorOptions), findAvailablePort(port) ])
      .then(function(results) {

        var simulator = results[0];
        port = results[1];

        launchSimulatorAndWaitUntilReady({
          binary: simulator.bin,
          profile: simulator.profile,
          port: port,
          detached: detached,
          verbose: verbose
        }).then(function(simulatorDetails) {
          resolve(simulatorDetails);
        }, function(simulatorLaunchError) {
          reject(simulatorLaunchError);
        });

      }, function(error) {
        reject(error);
      });

  });
}

// Find a simulator that matches the options
function findSimulator(options) {

  return new Promise(function(resolve, reject) {

    findSimulators(options).then(function(results) {

      if(!results || results.length === 0) {
        reject(new Error('No simulators installed, or cannot find them'));
      }

      // just returning the first result for now
      resolve(results[0]);

    }, function(error) {
      reject(error);
    });

  });

}


function findAvailablePort(preferredPort) {

  return new Promise(function(resolve, reject) {

    // Start searching with the preferred port, if specified
    if(preferredPort !== undefined) {
      portFinder.basePort = preferredPort;
    }
    
    portFinder.getPort(function(err, port) {
      if(err) {
        reject(err);
      } else {
        console.log('got this port', port);
        resolve(port);
      }
    });
  });

}


// Launches the simulator and wait until it's ready to be used
function launchSimulatorAndWaitUntilReady(options) {

  var port = options.port;
  var binary = options.binary;
  var profile = options.profile;

  return new Promise(function(resolve, reject) {

    launchSimulator(options).then(function(simulatorProcess) {
      waitUntilSimulatorIsReady(port).then(function() {
        resolve({
          process: simulatorProcess,
          pid: simulatorProcess.pid,
          port: port,
          binary: binary,
          profile: profile
        });
      }, function(timedOutError) {
          reject(timedOutError);
      });
    }, function(simulatorLaunchError) {
      reject(simulatorLaunchError);
    });

  });
}

// Launches the simulator in the specified port
function launchSimulator(options) {

  var detached = options.detached;

  return new Promise(function(resolve, reject) {

    startSimulatorProcess(options).then(function(simulatorProcess) {

      // If the simulator is not detached, we need to kill its process
      // once our own process exits
      if (!detached) {

        process.once('exit', function() {
          simulatorProcess.kill('SIGTERM');
        });

        process.once('uncaughtException', function(error) {
          if (process.listeners('uncaughtException').length === 0) {
            simulatorProcess.kill('SIGTERM');
            throw error;
          }
        });

      } else {

        // Totally make sure we don't keep references to this new child--
        // this removes the child from the parent's event loop
        // See http://nodejs.org/api/child_process.html#child_process_options_detached
        simulatorProcess.unref();

      }

      resolve(simulatorProcess);

    }, function(error) {

      reject(error);

    });

  });
  
}


function startSimulatorProcess(options) {

  return new Promise(function(resolve, reject) {

    var simulatorBinary = options.binary;
    var childOptions = { stdio: ['ignore', 'ignore', 'ignore'] };
    
    // Simple sanity check: make sure the simulator binary exists
    if (!fs.existsSync(simulatorBinary)) {
      return reject(new Error(simulatorBinary + ' does not exist'));
    }

    if (options.detached) {
      childOptions.detached = true;
    }

    if (options.verbose) {
      childOptions.stdio = [ process.stdin, process.stdout, process.stderr ];
    }

    // TODO do we want to pipe stdin/stdout/stderr as in commandB2G?
    // https://github.com/nicola/fxos-start/blob/6b4794814e3a5c97d60abf2ab8619c635d6c3c94/index.js#L55-L57

    var simulatorProcess = spawn(
      simulatorBinary,
      [
        '-profile', options.profile,
        '-start-debugger-server', options.port,
        '-no-remote'
      ],
      childOptions
    );

    resolve(simulatorProcess);

  });

}


function waitUntilSimulatorIsReady(port) {

  var maxTimeout = 25000;
  var attemptInterval = 1000;
  var elapsedTime = 0;

  return new Promise(function(resolve, reject) {

    function ping() {
      var socket = new net.Socket();
      socket
        .on('connect', function() {
          resolve();
          socket.destroy();
        }).on('error', function(error) {
          if(error && error.code !== 'ECONNREFUSED') {
            throw error;
          }
          socket.destroy();
          maybeTryAgain();
        }).connect(port, 'localhost');
    }

    function maybeTryAgain() {
      elapsedTime += attemptInterval;

      if(elapsedTime < maxTimeout) {
        setTimeout(ping, attemptInterval);
      } else {
        reject(new Error('Timed out trying to connect to the simulator in ' + port));
      }

    }

    ping();

  });

}

// These actually make it so that child process get killed when this process
// gets killed (except when the child process is detached, obviously)
process.once('SIGTERM', function() {
  process.exit(0);
});
process.once('SIGINT', function() {
  process.exit(0);
});


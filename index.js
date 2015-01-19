'use strict';

// See https://github.com/jshint/jshint/issues/1747 for context
/* global -Promise */
var Promise = require('es6-promise').Promise;
var findSimulators = require('node-firefox-find-simulators');
var Q = require('q');
var net = require('net');
var findPorts = require('node-firefox-find-ports');
var spawn = require('child_process').spawn;
var FirefoxClient = require('firefox-client');
var portfinder = require('portfinder');
var fs = require('fs');
var __ = require('underscore');


module.exports = startSimulator;

function startSimulator(options) {
  /* TODO if options.force, it should find running simulators and kill them */

  var detached = options.detached ? true : false;
  var verbose = options.verbose ? true : false;

  return new Promise(function(resolve, reject) {

    Promise.all([ findSimulator(/* TODO options */), findAvailablePort() ])
      .then(function(results) {

        var simulator = results[0];
        var port = results[1];

        launchSimulator({
          simulator: simulator,
          port: port,
          detached: detached,
          verbose: verbose
        }).then(function(simulatorProcess) {

          waitUntilSimulatorIsReady(port).then(function(ready) {
            resolve({
              process: simulatorProcess,
              pid: simulatorProcess.pid,
              port: port,
              binary: simulator.bin,
              profile: simulator.profile
            });
          }, function(timedOutError) {
            reject(timedOutError);
          });
          
        }, function(simLaunchError) {
          reject(simLaunchError);
        });

      }, function(error) {
        reject(error);
      });
    
  });
}

// Find a simulator that matches the options
function findSimulator(options) {

  // TODO actually use the options to filter simulators
  return new Promise(function(resolve, reject) {
    
    findSimulators().then(function(results) {

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


function findAvailablePort(options) {
  return new Promise(function(resolve, reject) {
    // TODO actually look for available ports
    resolve(9999);
  });
}


// Launches the simulator in the specified port
function launchSimulator(options) {

  var simulator = options.simulator;
  var port = options.port;
  var detached = options.detached;

  return new Promise(function(resolve, reject) {
    startSimulatorProcess({
      binary: simulator.bin,
      profile: simulator.profile,
      port: port,
      detached: detached,
      verbose: options.verbose
    }).then(function(simulatorProcess) {

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

  var childOptions = { stdio: ['ignore', 'ignore', 'ignore'] };
  
  if (options.detached) {
    childOptions.detached = true;
  }

  if (options.verbose) {
    childOptions.stdio = [ process.stdin, process.stdout, process.stderr ];
  }

  // TODO do we want to pipe stdin/stdout/stderr as in commandB2G?

  var simulatorProcess = spawn(
    options.binary,
    [
      '-profile', options.profile,
      '-start-debugger-server', options.port,
      '-no-remote'
    ],
    childOptions
  );

  return new Promise(function(resolve, reject) {
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
        if (e && e.code !== 'ECONNREFUSED') {
          throw e;
        }
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

// XXX TODO Not using this one in favour of startSimulatorProcess, keeping for reference
function commandB2G(opts) {
  var defer = Q.defer();

  var childOptions = { stdio: ['ignore', 'ignore', 'ignore'] };

  if (opts.exit) {
    childOptions.detached = true;
  }

  if (opts.verbose) {
    childOptions.stdio = [process.stdin,  process.stdout, process.stderr];
  }

  if (opts.stdin) {
    childOptions.stdio[0] = fs.openSync(opts.stdin, 'a');
  }
  if (opts.stdout) {
    childOptions.stdio[1] = fs.openSync(opts.stdout, 'a');
  }
  if (opts.stderr) {
    childOptions.stdio[2] = fs.openSync(opts.stderr, 'a');
  }

  var simProcess = spawn(
    opts.bin,
    ['-profile', opts.profile, '-start-debugger-server', opts.port, '-no-remote'],
    childOptions
  );

  if (!opts.exit) {
    // From https://www.exratione.com/2013/05/die-child-process-die/
    process.once('exit', function() {
      simProcess.kill('SIGTERM');
    });

    process.once('uncaughtException', function(error) {
      if (process.listeners('uncaughtException').length === 0) {
        simProcess.kill('SIGTERM');
        throw error;
      }
    });
  }

  if (opts.exit) {
    simProcess.unref();
  }
  defer.resolve(simProcess);
  return defer.promise;
}

function createClient(simulator) {
  var deferred = Q.defer();
  var client = new FirefoxClient();
  client.connect(simulator.port, function(err) {
    if (err) {
      deferred.reject(err);
    }
    simulator.client = client;
    deferred.resolve(simulator);
  });
  return deferred.promise;
}

function runB2G(opts) {
  var commandReady = commandB2G(opts);
  var portReady = commandReady.then(portIsReady.bind(null, opts.port));
  return portReady.then(function() {
    return commandReady;
  });
}

function findPaths(opts) {
  return new findSimulators(opts).then(function(result) {
    if (!result || !result.length) {
      var errorMsg = 'No simulator found on your machine.';
      if (opts && opts.version) {
        errorMsg = 'No simulator for Firefox version ' + opts.version + ' found on your machine.';
      }
      console.error(new Error(errorMsg));
      process.exit(1);
    }
    var latestB2G = result[result.length - 1];
    return latestB2G;
  });
}

/* XXX TODO this function is not used - keeping for reference */
function startB2G(opts, callback) {

  if (typeof opts === 'function') {
    callback = opts;
  }
  opts = __.clone(opts) || {};

  /* Options */

  if (opts.force) {
    new findPorts({ b2g: true }, function(err, instances) {
      instances.forEach(function(instance) {
        process.kill(instance.pid);
      });
    });
  }

  /* Promises */

  // Make sure we have bin, profile and port
  var pathsReady = (opts.bin && opts.profile) ? { bin: opts.bin, opts: opts.profile } : findPaths(opts);
  var portReady = opts.port || Q.ninvoke(portfinder, 'getPort', opts);
  var optsReady = Q.all([pathsReady, portReady])
    .spread(function(paths, port) {
      // Cloning bevause opts should be unaltered
      var simulator = __.clone(opts);
      simulator.bin = paths.bin;
      simulator.profile = paths.profile;
      simulator.port = port;
      if (paths && paths.release) {
        simulator.release = paths.release;
      }
      else if (opts.bin && opts.profile && opts.release.length === 1) {
        simulator.release = simulator.release[0];
      }

      return simulator;
    });

  var runReady = optsReady.then(runB2G);

  return Q.all([optsReady, runReady])
    .spread(function(opts, simProcess) {
      opts.process = simProcess;
      opts.pid = simProcess.pid;
      return opts;
    })
    .then(function(simulator) {
      return opts.connect ? createClient(simulator) : simulator;
    })
    .nodeify(callback);

}

process.once('SIGTERM', function() {
  process.exit(0);
});
process.once('SIGINT', function() {
  process.exit(0);
});

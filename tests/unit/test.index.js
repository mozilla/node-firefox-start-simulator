'use strict';

var path = require('path');
var net = require('net');

/* global -Promise */
var Promise = require('es6-promise').Promise;
var mockery = require('mockery');
var nodemock = require('nodemock');

// nodemock expects an empty function to indicate a callback parameter
var CALLBACK_TYPE = function() {};

// Switch env vars to point at the mocked up home / profile test data so that
// findSimulators finds one of our mock simulators.
var home = path.join(__dirname, 'data', process.platform);
process.env.HOME = home;
process.env.USERPROFILE = home;

// Load findSimulators, but do some patching for Windows if necessary
var findSimulators = require('node-firefox-find-simulators');
if ('win32' === process.platform) {
  monkeyPatchFindSimulatorsForWin32Tests();
}

var startSimulator = require('../../index');

module.exports = {

  'startSimulator spawns with an available port': testStartSimulator(),

  'startSimulator spawns with specified port 2112': testStartSimulator(2112),

  'startSimulator.all() launches multiple simulators': function(test) {

    var simulators = [
      { version: '1.4', bin: '/bin/b2g-1.4', profile: '/profile/b2g-1.4' },
      { version: '2.0', bin: '/bin/b2g-2.0', profile: '/profile/b2g-2.0' },
      { version: '2.2', bin: '/bin/b2g-2.2', profile: '/profile/b2g-2.2' }
    ];

    var ports = [ 8008, 8010, 8012 ];

    var mocked = nodemock.ignore('test');

    // Mock up findSimulators fed by test data.
    mockery.registerMock('node-firefox-find-simulators', function(opts) {
      return new Promise(function(resolve, reject) {
        if (opts.version) {
          return resolve(simulators.filter(function(simulator) {
            return simulator.version === opts.version;
          }));
        }
        return resolve(simulators);
      });
    });

    // Mock fs.existsSync that finds simulator binaries in test data.
    mockery.registerMock('fs', {
      existsSync: function(filename) {
        var found = simulators.filter(function(simulator) {
          return simulator.bin === filename;
        });
        return found.length > 0;
      }
    });

    // Mock portfinder.getPort that pulls from a series of test ports.
    var portsIdx = 0;
    mockery.registerMock('portfinder', {
      getPort: function(callback) {
        callback(null, ports[portsIdx++]);
      }
    });

    // Mock up child_process.spawn to assert expected launched simulators
    for (var spawnIndex = 0; spawnIndex < simulators.length; spawnIndex++) {
      var bin = simulators[spawnIndex].bin;
      var args = [
        '-profile', simulators[spawnIndex].profile,
        '-start-debugger-server', ports[spawnIndex],
        '-no-remote', '-foreground'
      ];
      var options = {
        'stdio': ['ignore','ignore','ignore'],
        'detached': true
      };
      mocked.mock('spawn')
        .takes(bin, args, options)
        .returns({
          pid: spawnIndex,
          bin: bin,
          args: args,
          options: options,
          unref: CALLBACK_TYPE
        });
    }

    mockery.registerMock('child_process', {
      spawn: mocked.spawn
    });

    for (var connectIndex = 0; connectIndex < ports.length; connectIndex++) {
      mocked.mock('connect')
        .takes(ports[connectIndex], 'localhost')
        .returns(true);
    }

    function MockSocket() { /* no-op */ }

    MockSocket.prototype = {
      connect: function(port, host) {
        return mocked.connect(port, host);
      },
      on: function(event, callback) {
        if (event === 'connect') {
          setImmediate(callback);
        }
        return this;
      },
      destroy: function() {
        return true;
      }
    };

    mockery.registerMock('net', {
      Socket: MockSocket
    });

    // Enable mocks on a clear import cache
    mockery.enable({
      warnOnReplace: false,
      warnOnUnregistered: false,
      useCleanCache: true
    });

    // Require a freshly imported forwardPorts for this test
    var startSimulatorWithMocks = require('../../index');
    var startSimulatorPromise = startSimulatorWithMocks.all({ detached: true })(simulators);

    startSimulatorPromise.catch(function(err) {
      test.ifError(err);
      test.done();
    }).then(function(results) {

      // console.log(JSON.stringify(results, null, ' '));

      // Ensure all the mocks were called, and with the expected parameters
      test.ok(mocked.assert());

      // Putting all the mocks together, this is what the results on the other
      // end should look like after "starting" simulators
      var expected = [];
      for (var simulatorIndex = 0; simulatorIndex < simulators.length; simulatorIndex++) {
        var simulator = simulators[simulatorIndex];
        expected.push({
          process: {
            pid: simulatorIndex,
            bin: simulator.bin,
            args: [
              '-profile', simulator.profile,
              '-start-debugger-server', ports[simulatorIndex],
              '-no-remote', '-foreground'
            ],
            options: {
              'stdio': [ 'ignore', 'ignore', 'ignore' ],
              'detached': true
            },
            unref: CALLBACK_TYPE
          },
          pid: simulatorIndex,
          port: ports[simulatorIndex],
          binary: simulator.bin,
          profile: simulator.profile
        });
      }

      test.deepEqual(results, expected);

      test.done();
    });

  },

  /*
  'startSimulator.all() launches only one simulator per unique version': function(test) {
    test.done();
  },
  */

  setUp: function(done) {
    return done();
  },

  tearDown: function(done) {
    mockery.disable();
    return done();
  }

};

function testStartSimulator(testPort) {

  return function(test) {

    var simulatorOptions = {
      detached: false,
      verbose: true,
      version: '2.1',
      timeout: 3000
    };
    if (testPort) {
      simulatorOptions.port = testPort;
    }

    var expectedSimulator;
    findSimulators(simulatorOptions).then(function(result) {

      expectedSimulator = result[0];
      return startSimulator(simulatorOptions);

    }).then(function(sim) {

      // The .cmd script for win32 breaks this test
      if (process.platform !== 'win32') {
        test.equal(sim.binary, expectedSimulator.bin);
      }
      test.equal(sim.profile, expectedSimulator.profile);

      var response;

      if (testPort) {
        test.equal(sim.port, testPort);
      } else {
        test.ok(typeof sim.port !== 'undefined');
      }

      console.log('Connecting to server on port ' + sim.port);

      net.connect({ port: sim.port }, function() {
        response = '';
      }).on('data', function(data) {
        response += data.toString();
      }).on('error', function(error) {
        test.ok(false, error);
        test.done();
      }).on('end', function() {

        var b2gOptions = JSON.parse(response);

        // The .cmd script for win32 breaks this test
        if (process.platform !== 'win32') {
          test.equal(b2gOptions.binary, expectedSimulator.bin);
        }
        test.equal(b2gOptions.profile, expectedSimulator.profile);
        if (testPort) {
          test.equal(b2gOptions['start-debugger-server'], testPort);
        }
        test.equal(b2gOptions.foreground,
                   !simulatorOptions.detached);

        test.done();

      });

    }).catch(function(error) {

      test.ok(false, error);
      test.done();

    });

  };

}


// HACK: The following reaches into the require() cache and wraps the function
// exported by node-firefox-find-simulator with code that replaces b2g-bin.exe
// with b2g-bin.cmd, so that the mock server gets run on win32.

function monkeyPatchFindSimulatorsForWin32Tests() {
  for (var k in require.cache) {
    if (k.indexOf('node-firefox-find-simulators\\index.js') !== -1) {
      monkeyPatchRequireCacheForWin32(require.cache[k]);
    }
  }
}

function monkeyPatchRequireCacheForWin32(entry) {
  var originalFindSimulators = entry.exports;
  entry.exports = function(options) {
    return originalFindSimulators(options).then(function(simulators) {
      simulators.forEach(function(simulator) {
        simulator.bin = simulator.bin.replace('.exe', '.cmd');
      });
      return simulators;
    });
  };
}

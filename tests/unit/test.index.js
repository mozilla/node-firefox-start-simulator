'use strict';

var path = require('path');
var net = require('net');

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
  'startSimulator spawns with specified port 2112': testStartSimulator(2112)
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

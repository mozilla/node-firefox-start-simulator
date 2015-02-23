'use strict';
//
// Simple server to mock up a Firefox debug service for startSimulator()
//
// The tested code only needs a successful connection to work, and the testing
// code makes another connection to introspect the command options used to
// launch the mock simulator
//

var net = require('net');

// This server will self-destruct after 3 seconds...
// HACK: It's a race condition, but detecting a server should ideally happen
// faster than this. Travis can be slow sometimes, though.
var serverLifetime = 3000;

// Quick & filthy command line options parsing
var options = {
  'binary': process.argv[1],
  'start-debugger-server': 9999
};
for (var index = 2; index < process.argv.length; index++) {
  var arg = process.argv[index];
  if (arg[0] === '-') {
    var optionName = arg.substr(1);
    var nextArg = process.argv[index + 1];
    options[optionName] = (!nextArg || nextArg[0] === '-') ?
      true : process.argv[++index];
  }
}

var server = net.createServer(function(c) {

  c.on('error', function(e) {
    // The tested code will cause an error when it closes the initial
    // connection, and we don't care about that. So, squelch & ignore.
  });

  c.on('close', function(e) {
  });

  // Echo the options used to start this server back to the test.
  c.write(JSON.stringify(options) + '\r\n');
  c.end();

});

server.on('error', function(e) {
  console.log('server error ' + e);
});

server.listen(options['start-debugger-server'], function() {
  console.log('Server bound on port ' + options['start-debugger-server']);
});

// Shutdown the server in 3 seconds, no matter what.
setTimeout(shutdownServer, serverLifetime);

function shutdownServer() {
  console.log('Server exiting on port ' + options['start-debugger-server']);
  server.close();
  process.exit();
}

'use strict';

var startB2G = require('../index');
var FirefoxClient = require('firefox-client');

startB2G({ port: 8003, connect: false }, function(err, sim) {

  var client = new FirefoxClient();

  // Let's show for example all the running apps
  client.connect(8003, function() {
    client.getWebapps(function(err, webapps) {
      webapps.listRunningApps(function(err, apps) {
        console.log('Running apps:', apps);
        client.disconnect();
        process.kill(sim.pid);
      });
    });
  });

});

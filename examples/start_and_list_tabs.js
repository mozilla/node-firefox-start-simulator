'use strict';

var startSimulator = require('../index');

startSimulator({ connect: true, port: 8002 }).then(function(results) {
  /*var client = sim.client;

  // Let's show for example all the running apps
  client.getWebapps(function(err, webapps) {
    webapps.listRunningApps(function(err, apps) {
      console.log('Running apps:', apps);
      client.disconnect();
      process.kill(sim.pid);
    });
  });*/
  console.log(results);

}, function(err) {
  console.error('Error starting simulator', err);
});

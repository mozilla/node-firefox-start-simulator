'use strict';

var startB2G = require('../index');

startB2G({ connect: true }, function(err, sim) {
  var client = sim.client;

  // Let's show for example all the running apps
  startB2G({ client: client }, function(err, client) {
    console.log(client === client);
    sim.client.disconnect();
    process.kill(sim.pid);
  });

});

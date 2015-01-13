var startB2G = require('../index');

startB2G({ connect: true }, function(err, sim) {
  var client = sim.client;

  // Let's show for example all the running apps
  client.getWebapps(function(err, webapps) {
    webapps.listRunningApps(function(err, apps) {
      console.log("Running apps:", apps);
      client.disconnect();
      process.kill(sim.pid);
    });
  });

});
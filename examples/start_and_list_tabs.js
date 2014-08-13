var startB2G = require('../index');

startB2G({port:7653}, function(err, client) {
  // Let's show for example all the running apps

  client.getWebapps(function(err, webapps) {
    webapps.listRunningApps(function(err, apps) {
      console.log("Running apps:", apps);
      client.disconnect();
    });
  });

});
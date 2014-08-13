var startB2G = require('../index');
var FirefoxClient = require('firefox-client');

startB2G({port:7653, connect:false}, function(err, sim) {

  var client = new FirefoxClient();

  // Let's show for example all the running apps
  client.connect(7653, function() {
    client.getWebapps(function(err, webapps) {
      webapps.listRunningApps(function(err, apps) {
        console.log("Running apps:", apps);
        client.disconnect();
      });
    });
  });

});
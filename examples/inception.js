var startB2G = require('../index');

startB2G(function(err, client) {
  // Let's show for example all the running apps
  
  startB2G({client: client}, function(err, client) {
    console.log(client == client);
    client.disconnect();
  });

});

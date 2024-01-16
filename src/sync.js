const ServerContext = require("./servercontext");

async function run() {
  const serverContext = new ServerContext();
  const catalog = serverContext.collections();
  console.log("Refreshing GEE catalog...");
  catalog.updateCatalog(true)
    .then(() => catalog.readLocalCatalog())
    .then(num => {
      console.log("Updated catalog with " + num + " collections.");
      process.exit(0);
    })
    .catch((err) => {
      console.error("ERROR: Failed to update catalogs: " + err);
      process.exit(1);
    });
}

run();
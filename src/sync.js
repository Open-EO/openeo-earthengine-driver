/*eslint n/no-process-exit: "off"*/
import ServerContext from "./utils/servercontext.js";

const serverContext = new ServerContext();
const catalog = serverContext.collections();
console.log("Refreshing GEE catalog...");
try {
	await catalog.updateCatalog(true);
	const num = await catalog.readLocalCatalog();
	console.log("Updated catalog with " + num + " collections.");
	process.exit(0);
} catch (err) {
	console.error("ERROR: Failed to update catalogs: " + err);
	process.exit(1);
}

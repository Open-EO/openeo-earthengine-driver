/*eslint n/no-process-exit: "off"*/
import ServerContext from "./utils/servercontext.js";

const serverContext = new ServerContext();

async function getCountsPerUser(db) {
	const all = Array.from(await db.findAsync({}));
	const perUser = {};
	for(const obj of all) {
		if (!(obj.user_id in perUser)) {
			perUser[obj.user_id] = [];
		}
		perUser[obj.user_id].push(perUser[obj.user_id]);
	}
	return perUser;
}

try {
	// Get a map of all users
	const users = {};
	const internalUsers = Array.from(await serverContext.users().all());
	for(const user of internalUsers) {
		users[user._id] = user;
	}

	// Group jobs by use
	const userJobs = await getCountsPerUser(serverContext.jobs().database());
	const userServices = await getCountsPerUser(serverContext.webServices().database());
	const userProcesses = await getCountsPerUser(serverContext.storedProcessGraphs().database());

	// Get a list of all user names from all sources
	const allUsers = Array.from(new Set([
		...Object.keys(users),
		...Object.keys(userJobs),
		...Object.keys(userServices),
		...Object.keys(userProcesses)
	])).sort();

	// Print users and their jobs
	const stats = {};
	for(const user of allUsers) {
		stats[user] = {
			Name: (user in users) ? users[user].name : undefined,
			BatchJobs: (userJobs[user] || []).length,
			WebServices: (userServices[user] || []).length,
			UDPs: (userProcesses[user] || []).length
		};
	}
	console.table(stats);
	process.exit(0);
} catch (err) {
	console.error(err);
	process.exit(1);
}

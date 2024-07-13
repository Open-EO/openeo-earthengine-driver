/*eslint n/no-process-exit: "off"*/
import ServerContext from "./utils/servercontext.js";
import { createInterface } from 'node:readline/promises';

const serverContext = new ServerContext();
const users = serverContext.users();

const rl = createInterface({
	input: process.stdin,
	output: process.stdout
});
const stop = (code) => {
	rl.close();
	process.exit(code);
}

const username = await rl.question('Enter a username: ');
const exists = await users.exists(username);

let onlyData = false;
if (exists) {
	const keepAccount = await rl.question('Keep account (y/n): ');
	const onlyDataMap = {
		y: true,
		n: false
	};
	if (!(keepAccount in onlyDataMap)) {
		console.error('Invalid input, must be y or n');
		stop(1);
	}
	onlyData = onlyDataMap[keepAccount];
}
else {
	console.warn('User might be a Google User, trying to delete the corresponding data');
}

try {
	await users.remove(username, onlyData);
	if (onlyData) {
		console.log('Workspace cleared!');
	}
	else {
		console.log('User deleted and workspace cleared!');
	}
	stop(0);
} catch (err) {
	console.error(err);
	stop(1);
}

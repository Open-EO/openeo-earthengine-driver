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
if (!exists) {
	console.warn('User might be a Google User, trying to delete the corresponding data');
}

try {
	await users.remove(username);
	console.log('User (data) deleted!');
	stop(0);
} catch (err) {
	console.error(err);
	stop(1);
}

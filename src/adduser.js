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
if (username && username.length < 4) {
	console.error("Username must be at least 4 characters long.");
	stop(1);
}
const exists = await users.exists(username);
if (exists) {
	console.error("User with the given name already exists.");
	stop(1);
}

const password = await rl.question('Enter a password: ');
if (password && password.length < 4) {
	console.error("Password must be at least 4 characters long.");
	stop(1);
}

let email = await rl.question('Enter an email address (optional): ');
if (!email || email.length < 6) {
	email = null;
}

try {
	await users.register(username, password, email);
	console.log('User created!');
	stop(0);
} catch (err) {
	console.error(err);
	stop(1);
}

/*eslint n/no-process-exit: "off"*/
import ServerContext from "./utils/servercontext.js";

const serverContext = new ServerContext();
const users = serverContext.users();

try {
	const allUsers = Array.from(await users.all());
	for(const user of allUsers) {
		let str = `- ${user.name}`;
		if (user.email) {
			str += ` <${user.email}>`;
		}
		console.log(str);
	}
	process.exit(0);
} catch (err) {
	console.error(err);
	process.exit(1);
}

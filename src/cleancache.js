/*eslint n/no-process-exit: "off"*/
import fse from 'fs-extra';
import path from 'path';

const CACHE_DIR = './storage/item_thumb_cache';
const MAX_AGE_MS = 30 * 24 * 60 * 60 * 1000; // 1 month

async function cleanDir(dir) {
	const entries = await fse.readdir(dir);
	let removed = 0;

	for (const entry of entries) {
		const filepath = path.join(dir, entry);
		try {
			const stat = await fse.stat(filepath);
			if (stat.isDirectory()) {
				removed += await cleanDir(filepath);
				// Remove directory if empty
				const remaining = await fse.readdir(filepath);
				if (remaining.length === 0) {
					await fse.rmdir(filepath);
				}
			}
			else if (stat.isFile() && (Date.now() - stat.mtimeMs) > MAX_AGE_MS) {
				await fse.unlink(filepath);
				removed++;
			}
		}
		catch (e) {
			console.error(`Failed to process ${filepath}: ${e.message}`);
		}
	}

	return removed;
}

try {
	await fse.ensureDir(CACHE_DIR);
	const removed = await cleanDir(CACHE_DIR);
	console.log(`Removed ${removed} file(s) older than 30 days from ${CACHE_DIR}`);
	process.exit(0);
}
catch (e) {
	console.error(e);
	process.exit(1);
}

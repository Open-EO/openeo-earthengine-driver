import DB from '../utils/db.js';
import fse from 'fs-extra';
import path from 'path';

export default class ItemStore {

	constructor() {
		this.thumbCacheFolder = './storage/item_thumb_cache';
		this.db = DB.load('item_cache');
	}

	database() {
		return this.db;
	}

	async clear() {
		await fse.ensureDir(this.thumbCacheFolder);
		await this.removeOutdated();
	}

	async getItem(id) {
		return await this.db.findOneAsync({_id: id});
	}

	async removeOutdated() {
		// 7 day cache
		const daysAgo = Date.now() - 1000 * 60 * 60 * 24 * 7;
		return await this.db.removeAsync({
			_time: {$lt: daysAgo}
		}, {
			multi: true
		});
	}

	async addItem(data) {
		const dbData = Object.assign({
			_id: data.id,
			_time: Date.now()
		}, data);
		return await this.db.updateAsync(dbData, { upsert: true });
	}

	getThumbPath(id) {
		return path.join(this.thumbCacheFolder, `${id}.png`);
	}

	async hasThumb(id) {
		return await fse.pathExists(this.getThumbPath(id));
	}

}

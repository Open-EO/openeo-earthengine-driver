import GeeProcess from '../processgraph/process.js';
import eq from './eq.js';

export default class gte extends GeeProcess {

	executeSync(node) {
		return eq.process(node, (x, y) => x.gte(y));
	}

}

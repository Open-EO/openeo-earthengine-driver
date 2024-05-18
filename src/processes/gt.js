import GeeProcess from '../processgraph/process.js';
import eq from './eq.js';

export default class gt extends GeeProcess {

	executeSync(node) {
		return eq.process(node, (x, y) => x.gt(y), false);
	}

}

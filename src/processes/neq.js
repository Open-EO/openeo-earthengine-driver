import GeeProcess from '../processgraph/process.js';
import eq from './eq.js';

export default class neq extends GeeProcess {

	executeSync(node) {
		return eq.process(node, (a, b) => a.neq(b), true, false);
	}

}

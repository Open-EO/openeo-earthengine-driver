import GeeProcess from '../processgraph/process.js';
import GeeFilters from './utils/filters.js';

export default class filter_bbox extends GeeProcess {

	executeSync(node) {
		return GeeFilters.filterBoundingBox(node, "extent");
	}

}

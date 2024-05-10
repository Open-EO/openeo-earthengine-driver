import GeeProcess from '../processgraph/process.js';
import GeeFilters from './utils/filters.js';

export default class filter_spatial extends GeeProcess {

	executeSync(node) {
		return GeeFilters.filterSpatial(node, "geometries");
	}

}

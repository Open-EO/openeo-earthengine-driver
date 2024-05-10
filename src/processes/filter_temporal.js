import GeeProcess from '../processgraph/process.js';
import GeeFilters from './utils/filters.js';

export default class filter_temporal extends GeeProcess {

	executeSync(node) {
		return GeeFilters.filterTemporal(node, "extent");
	}

}

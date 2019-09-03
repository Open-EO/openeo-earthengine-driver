const Process = require('../processgraph/process');
const Commons = require('../processgraph/commons');

module.exports = class max extends Process {

    geeReducer() {
        return 'max';
    }

	async execute(node, context) {
		var list = node.getArgument('data');
		if (list.length <= 1) {
			// ToDo: Invalid, handle appropriately
			return;
		}

		for(var i = 1; i < list.length; i++) {
			var first = list[i-1];
			var second = list[i];
			if (typeof first === 'number' && typeof second === 'number') {
				list[i] = Math.max(first, second);
			}
			else if (first.isImageCollection()) {
				if (typeof second === 'number') {
					list[i] = first.imageCollection(ic => ic.map(img => img.max(second)));
				}
				else if (second.isImage()) {
					list[i] = second.image(img => img.max(first));
				}
				else {
					throw "Not supported";
				}
			}
			else if (first.isImage()) {
				if (typeof second === 'number' || second.isImage()) {
					list[i] = first.image(img => img.max(second));
				}
				else if (second.isImageCollection()) {
					list[i] = second.imageCollection(ic => ic.map(img => img.max(first)));
				}
				else {
					throw "Not supported";
				}
			}
			else if (first.isArray()) {
				if (typeof second === 'number' || second.isArray()) {
					list[i] = first.array(arr => arr.max(second)); // Does this work for numbers?
				}
				else {
					throw "Not supported";
				}
			}
			else {
				throw "Not supported";
			}
		}
		return list[list.length-1];
	}

};
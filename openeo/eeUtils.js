module.exports = {

	toImage(obj, req, res) {
		if (obj instanceof ee.Image) {
			return obj;
		}
		else if (obj instanceof ee.ComputedObject) {
			// ToDo: Send warning via subscriptions
			console.log("WARN: Casting to Image might be unintentional.");
			return ee.Image(obj);
		}
		else if (obj instanceof ee.ImageCollection) {
			// ToDo: Send warning via subscriptions
			console.log("WARN: Compositing the image collection to a single image.");
			return obj.mosaic();
		}
		return null;
	},
	
	toImageCollection(obj) {
		if (obj instanceof ee.ImageCollection) {
			return obj;
		}
		else if (obj instanceof ee.Image || obj instanceof ee.ComputedObject) {
			return ee.ImageCollection(obj);
		}
		return null;
	}

};
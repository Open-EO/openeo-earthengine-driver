const ajv = require('ajv');

module.exports = class JsonSchemaValidator {

	constructor(context = null) {
		var ajvOptions = {
			schemaId: 'auto',
			format: 'full',
			formats: {
				'band-name': {type: 'string', validate: this._validateBandName.bind(this)},
				'bounding-box': {type: 'object', validate: this._validateBoundingBox.bind(this)},
				'callback': {type: 'object', validate: this._validateCallback.bind(this)},
				'collection-id': {type: 'string', validate: this._validateCollectionId.bind(this)},
				'epsg-code': {type: 'integer', validate: this._validateEpsgCode.bind(this)},
				'geojson': {type: 'object', validate: this._validateGeoJson.bind(this)},
				'job-id': {type: 'string', async: true, validate: this._validateJobId.bind(this)},
				'kernel': {type: 'array', validate: this._validateKernel.bind(this)},
				'output-format': {type: 'string', validate: this._validateOutputFormat.bind(this)},
				'output-format-options': {type: 'array', validate: this._validateOutputFormatOptions.bind(this)},
				'process-graph-id': {type: 'string', async: true, validate: this._validateProcessGraphId.bind(this)},
				'process-graph-variables': {type: 'array', validate: this._validateProcessGraphVariables.bind(this)},
				'proj-definition': {type: 'string', validate: this._validateProjDefinition.bind(this)},
				'raster-cube': {type: 'object', validate: this._validateRasterCube.bind(this)},
				'temporal-interval': {type: 'array', validate: this._validateTemporalInterval.bind(this)},
				'temporal-intervals': {type: 'array', validate: this._validateTemporalIntervals.bind(this)},
				'vector-cube': {type: 'object', validate: this._validateVectorCube.bind(this)}
			}
		};
		this.ajv = new ajv(ajvOptions);
		this.ajv.addKeyword('parameters', {
			dependencies: [
				"type",
				"format"
			],
			metaSchema: {
				type: "object",
				additionalProperties: {
					type: "object"
				}
			},
			valid: true,
			errors: true
		});
		this.setContext(context);
	}

	setContext(context) {
		this.context = context;
	}

	async validateJson(json, schema) {
		 // Make sure we don't alter the process registry
		var clonedSchema = Object.assign({}, schema);
		clonedSchema["$async"] = true;
		if (typeof schema["$schema"] === 'undefined') {
			// Set applicable JSON SChema draft version if not already set
			clonedSchema["$schema"] = "http://json-schema.org/draft-07/schema#";
		}

		try {
			await this.ajv.validate(clonedSchema, json);
			return [];
		} catch (e) {
			return e.errors.map(e => e.message);
		}
	}

	validateJsonSchema(schema) {
		// Set applicable JSON SChema draft version if not already set
		if (typeof schema["$schema"] === 'undefined') {
			var schema = Object.assign({}, schema); // Make sure we don't alter the process registry
			schema["$schema"] = "http://json-schema.org/draft-07/schema#";
		}
	
		let result = this.ajv.compile(schema);
		return result.errors || [];
	}

	_validateBandName() {
		return true; // ToDo
	}

	_validateBoundingBox() {
		return true; // ToDo
	}

	_validateCallback() {
		return true; // ToDo
	}

	_validateCollectionId(data) {
		if (this.context.getCollection(data) === null) {
			throw new ajv.ValidationError([{
				message: "Collection doesn't exist."
			}]);
		}
		return true;
	}

	_validateEpsgCode() {
		return true; // ToDo
	}

	_validateGeoJson(data) {
		if (typeof data.type !== 'string') { // ToDo: Fully check against GeoJSON schema
			throw new ajv.ValidationError([{
				message: "Invalid GeoJSON specified (no type property)."
			}]);
		}
		return true;
	}
	
	async _validateJobId() {
		var job = await this.context.getJob(data);
		if (job === null) {
			throw new ajv.ValidationError([{
				message: "Job doesn't exist."
			}]);
		}
		return true;
	}
	
	_validateKernel() {
		return true; // ToDo
	}
	
	_validateOutputFormat(data) {
		if (!this.context.server().isValidOutputFormat(data)) {
			throw new ajv.ValidationError([{
				message: "Output format not supported."
			}]);
		}
		return true;
	}
	
	_validateOutputFormatOptions() {
		return true; // ToDo
	}
	
	async _validateProcessGraphId() {
		var pg = await this.context.getStoredProcessGraph(data);
		if (pg === null) {
			throw new ajv.ValidationError([{
				message: "Stored process graph doesn't exist."
			}]);
		}
		return true;
	}
	
	_validateProcessGraphVariables() {
		return true; // ToDo
	}

	_validateProjDefinition() {
		return true; // ToDo
	}
	
	_validateRasterCube() {
		return true; // ToDo
	}
	
	_validateTemporalInterval() {
		return true; // ToDo
	}
	
	_validateTemporalIntervals() {
		return true; // ToDo
	}

	_validateVectorCube() {
		return true; // ToDo
	}

}

function checkJsonSchema(schema) {
	if (typeof schema["$schema"] === 'undefined') {
		// Set applicable JSON SChema draft version if not already set
		schema["$schema"] = "http://json-schema.org/draft-07/schema#";
	}

	let result = jsv.compile(schema);
	expect(result.errors).toBeNull();
}
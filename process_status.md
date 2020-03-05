# openEO v1.0.0 process status
## General TODOs:
- Mapping from an array to an image collection (preserve metadata) (important for e.g. sort)
- Properly read the default values from the JSON files
## Aggregate & Resample
- [ ] aggregate_spatial
    * convert GeoJson geometry to GEE geometry
    * use `reduceRegion` from GEE
    * return result as JSON
- [ ] aggregate_temporal
    * use _filter_temporal_ on collection for each interval
    * apply reducer on each sub collection
    * apply labels for each sub collection
    * merge the result again
- [ ] resample_cube_spatial
    * use `resample`, `reduceResolution`, and `reproject`
- [ ] resample_spatial
    * use `resample`, `reduceResolution`, and `reproject`
- [ ] resample_cube_temporal
    * use e.g., _aggregate_temporal_
## Arrays
- [ ] array_apply
    * use complex apply (should be done by default)
- [ ] array_contains
    * process is missing in GEE
    * implementation could be somehow done like in _count_
- [X] array_element
- [ ] array_filter
    * could be used as a reducer
    * process is missing in GEE
    * one could only do it for JS arrays
- [ ] array_find
    * could be used as a reducer
    * process is missing in GEE
    * one could only do it for JS arrays
- [ ] array_labels
- [ ] count 
    * could be theoretically implemented with existing processes:
        * `ee.ImageCollection.count()` or `sum()` as a reducer (mask needed)
        * `ee.Image.updateMask(mask)` 
- [X] first
    * Only available as simple reducer
    * implementation for arrays needed
- [X] last
    * Only available as simple reducer
    * implementation for arrays needed
- [ ] order
    * process is missing in GEE 
    * maybe conversion to array?
    * one could only do it for JS arrays
- [ ] rearrange
    * process is missing in GEE
    * maybe conversion to array?
    * one could only do it for JS arrays
- [ ] sort
    * conversion to array necessary. 
## Comparison
- [ ] between
    * conversion to array necessary
    * could be used by taking a chained process call into account
- [ ] eq
    * conversion to array necessary
- [ ] neq
    * conversion to array necessary. 
- [ ] gt 
    * conversion to array necessary. 
- [ ] lt
    * conversion to array necessary. 
- [ ] gte
    * conversion to array necessary. 
- [ ] lte
    * conversion to array necessary. 
- [ ] is_nan
    * one could only do it for numbers
    * process is missing in GEE
- [ ] is_nodata
    * one could only do it for numbers
    * process is missing in GEE
- [ ] is_valid
    * one could only do it for numbers
    * process is missing in GEE
- [X] if
    * usage of `ee.Algorithms.If()` missing, only JS supported atm
# Texts
- [X] text_begins
- [X] text_contains
- [X] text_ends
- [X] text_merge

All of them only work in JS only mode, may not work if used with GEE data.

# Cubes
- [X] add_dimension
- [X] apply
- [ ] apply_dimension
- [ ] apply_kernel
    * `ee.Image.convolve(kernel)` with `ee.Kernel..` could be used
- [X] create_raster_cube
- [X] dimension_labels
- [X] drop_dimension
- [ ] filter_labels
    * functions already in place
- [X] filter_spatial
    * May not exactly follow the spec regarding the pixels covered...
- [X] filter_bbox
    * WKT implementation missing
- [X] filter_temporal
    * Restricts the temporal extent of all temporal dimensions instead of a single one. (GEE restriction?)
- [x] filter_bands
    * usage of common_bands metadata is missing
    * usage of wavelengths metadata is missing
- [X] load_collection
    * filter metadata by properties is missing
    * usage of common_bands metadata is missing
    * bbox WKT implementation missing
- [ ] load_result
- [ ] load_uploaded_files
- [X] merge_cubes
    * overlap resolver is missing
- [X] reduce_dimension
- [X] rename_dimension
- [X] rename_labels
- [X] save_result
- [ ] trim_cube
    * is not possible to be implemented at the moment
# Development
- [ ] debug
# Import
- [ ] run_udf
    * is not possible to be implemented at the moment
- [ ] run_udf_externally
    * is not possible to be implemented at the moment
# Logic
- [ ] all
    * one could only do it for JS arrays
    * process is missing in GEE
- [ ] and
    * `ee.Array.and()`
    * conversion to array necessary
- [ ] any
    * one could only do it for JS arrays
    * process is missing in GEE
- [ ] not
    * `ee.Array.not()`
    * conversion to array necessary
- [ ] or
    * `ee.Array.or()`
    * conversion to array necessary
- [ ] xor
    * only bitwise xor: `ee.Array.bitwiseXor()`
    * conversion to array necessary
# Masks
- [ ] mask
    * one could use `ee.Image.mask`
- [ ] mask_polygon
    * create `ee.Array` mask from the polygon in JS
    * then apply it in `ee.Image.arrayMask`
# Math
- [X] absolute
- [X] add
- [X] clip
- [X] divide
- [ ] extrema
    * multiple return values need to be handled
- [X] int
- [X] linear_scale_range
- [X] max
- [X] mean
- [X] median
- [X] min
- [ ] mod
    * available for arrays and numbers
- [X] multiply
- [X] power
- [X] product
- [ ] quantiles
    * multiple return values need to be handled
- [X] sd
- [ ] sgn
- [X] sqrt
- [X] subtract
- [X] sum
- [X] variance
- [X] e
- [X] pi
- [ ] cummax
    * process accum for arrays and reducer max
    * complex apply could do the main work
- [ ] cummin
    * process accum for arrays and reducer min
    * complex apply could do the main work
- [ ] cumsum
    * process accum for arrays and reducer sum (default)
    * complex apply could do the main work
- [ ] cumproduct
    * process accum for arrays and reducer product
    * complex apply could do the main work
- [X] exp
- [X] ln
- [X] log
- [X] normalized_difference
- [ ] ndvi
- [X] floor
- [X] ceil
- [X] int
- [X] round
- [X] cos
- [X] sin
- [X] tan
- [X] cosh
- [X] sinh
- [X] tanh
- [X] arccos
- [X] arcsin
- [X] arctan
- [X] arcosh
- [X] arsinh
- [X] artanh
- [ ] arctan2
    * needs 2 arrays, i.e. it needs a complex apply


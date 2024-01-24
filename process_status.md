# Process implementation status

The following processes have a fully GEE-based implementation or are not relevant for GEE directly:

- [x] absolute
- [x] add
- [x] add_dimension
- [ ] aggregate_temporal_period
- [ ] anomaly
- [x] apply
- [x] arccos
- [x] arcosh
- [ ] array_element
- [x] arsinh
- [x] arcsin
- [x] artanh
- [x] arctan
- [x] ceil
- [ ] climatological_normal
- [x] clip
- [x] cos
- [x] cosh
- [x] create_cube
- [ ] dimension_labels
- [x] divide
- [ ] drop_dimension
- [x] e
- [x] exp
- [ ] filter_bands
- [ ] filter_bbox
- [ ] filter_spatial
- [ ] filter_temporal
- [ ] first
- [x] floor
- [x] if
- [x] inspect
- [x] int
- [x] linear_scale_range
- [x] ln
- [ ] load_collection
- [x] log
- [ ] mask
- [ ] mean
- [ ] median
- [ ] merge_cubes
- [ ] min
- [x] multiply
- [x] nan
- [x] normalized_difference
- [x] pi
- [x] power
- [ ] product
- [ ] reduce_dimension
- [x] rename_dimension
- [ ] rename_labels
- [x] round
- [ ] save_result
- [ ] sd
- [x] sgn
- [x] sin
- [x] sinh
- [x] sqrt
- [x] subtract
- [ ] sum
- [x] tan
- [x] tanh
- [x] text_begins
- [x] text_concat
- [x] text_contains
- [x] text_ends
- [ ] variance

# OUTDATED: openEO v1.0.0 process status

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
# Cubes
- [ ] apply_dimension
- [ ] apply_kernel
    * `ee.Image.convolve(kernel)` with `ee.Kernel..` could be used
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
- [X] merge_cubes
    * overlap resolver is missing
- [X] reduce_dimension
- [X] rename_dimension
- [X] rename_labels
- [X] save_result
- [ ] trim_cube
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
- [ ] extrema
    * multiple return values need to be handled
- [X] max
- [X] mean
- [X] median
- [X] min
- [ ] mod
    * available for arrays and numbers
- [X] product
- [ ] quantiles
    * multiple return values need to be handled
- [X] sd
- [X] sum
- [X] variance
- [ ] ndvi
- [ ] arctan2
    * needs 2 arrays, i.e. it needs a complex apply


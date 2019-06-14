# openEO v0.4.0 process status
## General TODOs:
- Mapping from an array to an image collection (preserve metadata) (important for e.g. sort)
- Introduce Numbers for simple processes
- Properly read the default values from the JSON files
## Aggregate & Resample
- [ ] aggregate_polygon
- [ ] aggregate_temporal
- [ ] resample_cube_spatial
- [ ] resample_spatial
## Arrays
- [ ] array_contains
    * process is missing in GEE
    * implementation could be somehow done like in _count_
- [ ] array_element
    * process is available (_ee.Image.arrayGet(position)_), but not feasible to implement at the moment (position needs to be an image, ...).
- [ ] count 
    * could be theoretically implemented with existing processes:
        * _ee.ImageCollection.count()_ or _sum()_ as a reducer (mask needed)
        * _ee.Image.updateMask(mask)_ 
- [ ] order
    * process is missing in GEE 
    * maybe conversion to array?
- [ ] rearrange
    * process is missing in GEE
    * maybe conversion to array?
- [ ] sort
    * conversion to array necessary. 
    * reverse transformation missing: Array -> ImageCollection
# Comparison
- [ ] eq
    * conversion to array necessary. 
    * reverse transformation missing: Array -> ImageCollection
- [ ] neq
    * conversion to array necessary. 
    * reverse transformation missing: Array -> ImageCollection
- [ ] gt 
    * conversion to array necessary. 
    * reverse transformation missing: Array -> ImageCollection
- [ ] lt
    * conversion to array necessary. 
    * reverse transformation missing: Array -> ImageCollection
- [ ] gte
    * conversion to array necessary. 
    * reverse transformation missing: Array -> ImageCollection
- [ ] lte
    * conversion to array necessary. 
    * reverse transformation missing: Array -> ImageCollection
- [ ] is_nan
    * process is missing in GEE
- [ ] is_nodata
    * process is missing in GEE
- [ ] is_valid
    * process is missing in GEE
- [ ] if
    * usage of _ee.Algorithms.If()_
# Texts
- [X] text_begins
- [X] text_contains
- [X] text_ends
# Cubes
- [X] add_dimension
- [ ] apply
    * maybe better to work on arrays than images and collections
- [ ] apply_dimension
    * selection of different dimensions needs to be done
- [ ] apply_kernel
    * _ee.Image.convolve(kernel)_ with _ee.Kernel.._ could be used
- [ ] create raster_cube
- [ ] filter
- [ ] find_collections
- [X] load_collection
- [ ] load_result
- [ ] merge_cubes
- [ ] property
- [X] reduce
- [ ] rename_dimension
- [ ] save_result
    * option support still necessary to implement
- [ ] trim
# Development
- [ ] debug
- [ ] output
# Filter
- [X] filter_bbox
- [X] filter_temporal
- [X] filter_polygon
- [X] filter_bands
# Import
- [ ] run_process_graph
- [ ] run_udf
- [ ] run_udf_externally
# Logic
- [ ] and
    * _ee.Array.and()_
    * conversion to array necessary. 
    * reverse transformation missing: Array -> ImageCollection
- [ ] not
    * _ee.Array.not()_
    * conversion to array necessary. 
    * reverse transformation missing: Array -> ImageCollection
- [ ] or
    * _ee.Array.or()_
    * conversion to array necessary. 
    * reverse transformation missing: Array -> ImageCollection
- [ ] xor
    * only bitwise xor: _ee.Array.bitwiseXor()_
    * conversion to array necessary. 
    * reverse transformation missing: Array -> ImageCollection
# Masks
- [ ] mask
# Math
- [X] absolute
- [ ] clip
- [ ] divide
- [ ] extrema
    * multiple return values need to be handled
- [X] int
- [ ] linear_scale_range
- [X] max
- [X] mean
- [X] median
- [X] min
- [ ] mod
- [ ] multiply
- [ ] power
* process needs transformation between array and image collection
* process could be done by mapping the image collection
- [ ] product
- [ ] quantiles
- [X] sd
- [ ] sgn
- [X] sqrt
- [ ] subtract
- [X] sum
- [ ] variance
- [X] e
- [X] pi
- [ ] cummax
    * process accum for arrays and reducer max
- [ ] cummin
    * process accum for arrays and reducer min
- [ ] cumsum
    * process accum for arrays and reducer sum (default)
- [ ] cumproduct
    * process accum for arrays and reducer product
- [X] exp
- [X] ln
- [X] log
- [X] normalized_difference
- [X] ndvi
- [X] floor
    * process needs transformation between array and image collection
    * process could be done by mapping the image collection
- [X] ceil
    * process needs transformation between array and image collection
    * process could be done by mapping the image collection
- [X] int
    * process needs transformation between array and image collection
    * process could be done by mapping the image collection
- [X] round
    * process needs transformation between array and image collection
    * process could be done by mapping the image collection
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
    * process is missing in GEE
    * different mathematical formulation?
- [X] arsinh
    * process is missing in GEE
    * different mathematical formulation?
- [X] artanh
    * process is missing in GEE
    * different mathematical formulation?
- [X] arctan2
    * needs 2 arrays, i.e. it is not a simple apply


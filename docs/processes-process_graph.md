# Loading stored (external) process graphs

The Google Earth Engine driver allows to load and process stored internal and external process graphs, including process graph variables.

**NOTE: This example is outdated and only valid for openEO API v0.3!**

## Example workflow

Store a process graph internally with a variable `collection` for the collection name.

Request:

```http
POST /process_graphs

{
  "public": true,
  "process_graph":{
    "process_id":"stretch_colors",
    "imagery":{
      "process_id":"min_time",
      "imagery":{
        "process_id":"NDVI",
        "imagery":{
          "process_id":"filter_bbox",
          "imagery":{
            "process_id":"filter_daterange",
            "imagery":{
              "process_id":"get_collection",
              "name":{
                "variable_id":"collection",
                "description":"Identifier of the collection",
                "type":"string"
              }
            },
            "extent":[
              "2018-01-01T00:00:00Z",
              "2018-01-31T23:59:59Z"
            ]
          },
          "extent":{
            "west":16.1,
            "south":47.2,
            "east":16.6,
            "north":48.6
          }
        },
        "red":"B4",
        "nir":"B8"
      }
    },
    "min":-1,
    "max":1
  }
}
```

Response:

```http
HTTP/1.1 201 Created
Location: http://localhost/process_graphs/XkwnNZ0i0KjpliXT
OpenEO-Identifier: XkwnNZ0i0KjpliXT
```

The value of the response header `OpenEO-Identifier` can be used as `id` to load the internally stored process graph. The varible `collection` is set to `COPERNICUS/S2`:


Request:

```http
POST /execute

{
  "process_graph":{
    "process_id": "process_graph",
    "id": "XkwnNZ0i0KjpliXT",
    "variables": {
      "collection": "COPERNICUS/S2"
    }
  }
}
```

The response is the computed image.

Requesting an external process graph works similarly, but the process graph needs to be publicly available for retrieval. Please note that most back-ends currently do not support public sharing/access for stored process graphs. To publish a process graph in the Google Earth Engine back-end set the proprietary `public` flag to `true` during process graph creation (see first request).

Request:

```http
POST /execute

{
  "process_graph":{
    "process_id": "process_graph",
    "url": "http://localhost/process_graphs/XkwnNZ0i0KjpliXT",
    "variables": {
      "collection": "COPERNICUS/S2"
    }
  }
}
```


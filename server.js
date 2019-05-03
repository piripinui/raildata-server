const fs = require('fs'),
request = require('request'),
express = require('express'),
path = require('path'),
urlPattern = require('url-pattern'),
loki = require('lokijs'),
http = require('http'),
https = require('https');

var app = express(),
nodeRailwayTypes = {
  types: [
    'station',
    'level_crossing',
    'stop',
    'subway_entrance',
    'junction',
    'switch',
    'buffer_stop',
    'crossing',
    'railway_crossing',
    'loading_ramp',
    'signal',
    'platform',
    'station_site',
    'entrance',
    'train station entrance',
    'train_station_entrance',
    'disused',
    'disused_station',
    'owner_change',
    'waiting_room',
    'stop_position',
    'ventilation_shaft',
    'power_supply',
    'construction',
    'station_entrance',
    'yes'
  ]
},
wayRailwayTypes = {
  types: [
    'subway',
    'rail',
    'platform',
    'razed',
    'light_rail'
  ]
},
db = new loki('loki.json'),
nodeCollection = db.addCollection('node', { indices: [ 'id', 'tags.railway' ]}),
wayCollection = db.addCollection('way', { indices: [ 'id', 'tags.railway' ]}),
relationCollection = db.addCollection('relation', {indices: [ 'id' ]});

function initialise() {
  console.log("Initialising...");

  var myPromise = new Promise(function(resolve, reject){
    fs.readFile('./data/london_ug_og.json', function read(err, data) {
        if (err) {
            throw err;
        }
        content = JSON.parse(data);

        origFeatures = JSON.parse(JSON.stringify(content));

        processFile();

        resolve();
    });
 });

 myPromise.then(function() {
   createWebServices();
   console.log("Initialisation complete.");
 });
}

function processFile() {
    loadData(content);

    var totalsString = "Loaded ";

    totalsString += " nodes: " + nodeCollection.count() + " ";
    totalsString += " ways: " + wayCollection.count() + " ";
    totalsString += " relations: " + relationCollection.count() + " ";

    console.log(totalsString);
};

function loadData(content) {

  content.elements.forEach(function(anElement) {
    // An element can be one of 'node' or 'way'.
    var elementType = anElement.type,
    elementId = anElement.id;

    switch(elementType) {
      case 'node':
        // A node is a point object with a location representing something on the rail line e.g. a level crossing, a station etc.
        // The 'tags' element contains an object with metadata describing what sort of thing this node is. A key element of this
        // metadata is 'railway', which contains values like 'station', 'level_crossing' etc.

        nodeCollection.insert(anElement);
        break;
      case 'way':
        // Ways are linear objects like rail lines, platforms etc.
        wayCollection.insert(anElement);
        break;
      case 'relation':
        relationCollection.insert(anElement);
        break;
      default:
        console.log("Do not recognise element type " + elementType);
        break;
    }
  });
}

function convertToGeoJSON(data) {
  var result = {
    type: "FeatureCollection",
    features: []
  };

  data.forEach(function(anObject) {
    var aFeature;

    if (anObject.type == "node") {
      // Create a point feature.
      aFeature = {
        type: "Feature",
        id: anObject.id,
        properties: anObject.tags,
        geometry: {
          type: "Point",
          coordinates: [Number(anObject.lon), Number(anObject.lat)]
        }
      }
    }
    else {
      // Gather up the related nodes to this way to get the coordinates.
      var coords = [];
      anObject.nodes.forEach(function(aNodeId) {
        var aNode = nodeCollection.find({id: aNodeId});
        var aCoord = [aNode[0].lon, aNode[0].lat];
        coords.push(aCoord);
      })
      // Create a line feature.
      aFeature = {
        type: "Feature",
        id: anObject.id,
        properties: anObject.tags,
        geometry: {
          type: "LineString",
          coordinates: coords
        }
      }
    }

    result.features.push(aFeature);
  })

  return result;
}

function createWebServices() {
  nodeRailwayTypes.types.forEach(function(aType) {
    console.log("Creating node web service for " + aType);

    app.get("/" + aType, function(req, res) {
      console.log("Got request for node type " + aType + "...");

      var results = convertToGeoJSON(nodeCollection.find({ "tags.railway": aType }));

      res.send(JSON.stringify(results));
    })
  });

  wayRailwayTypes.types.forEach(function(aType) {
    console.log("Creating way web service for " + aType);

    app.get("/" + aType, function(req, res) {
      console.log("Got request for way type " + aType + "...");

      var results = convertToGeoJSON(wayCollection.find({ "tags.railway": aType }));

      res.send(JSON.stringify(results));
    })
  });

}

app.use(express.static(path.join(__dirname, 'public')));

app.listen(3000, function () {
	console.log('railway-server listening on port ' + 3000 + '!');
});

initialise();

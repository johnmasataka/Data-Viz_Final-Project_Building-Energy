/* First, define what constitutes a small screen.
This will affect the zoom parameter for each chapter. */

var smallMedia = window.matchMedia("(max-width: 600px)").matches;

/* Next, create two variables that will hold:
1. The different types of layers available to Mapbox and their respective opacity attributes.
2. The possible alignments which could be applied to the vignettes.*/

var layerTypes = {
  fill: ["fill-opacity"],
  line: ["line-opacity"],
  circle: ["circle-opacity", "circle-stroke-opacity"],
  symbol: ["icon-opacity", "text-opacity"],
  raster: ["raster-opacity"],
  "fill-extrusion": ["fill-extrusion-opacity"],
  heatmap: ["heatmap-opacity"],
};

var alignments = {
  left: "lefty",
  center: "centered",
  right: "righty",
  full: "fully",
};

/* The next two functions help turn on and off individual
layers through their opacity attributes: The first one gets
the type of layer and the second one adjusts the layer's opacity */

function getLayerPaintType(layer) {
  var layerType = map.getLayer(layer).type;
  return layerTypes[layerType];
}

function setLayerOpacity(layer) {
  var paintProps = getLayerPaintType(layer.layer);
  paintProps.forEach(function (prop) {
    var options = {};
    if (layer.duration) {
      var transitionProp = prop + "-transition";
      options = { duration: layer.duration };
      map.setPaintProperty(layer.layer, transitionProp, options);
    }
    map.setPaintProperty(layer.layer, prop, layer.opacity, options);
  });
}

/* Next, these variables and functions create the story and vignette html elements, and populate them with the content from the config.js file.
They also assign a css class to certain elements, also based on the config.js file */

// Main 'story', 'features' and 'header' elements
var story = document.getElementById("story");
var features = document.createElement("div");
var header = document.createElement("div");
features.setAttribute("id", "features");

// If the content exists, then assign it to the 'header' element
// Note how each one of these are assigning 'innerHTML'
if (config.topTitle) {
  var topTitle = document.createElement("div");
  topTitle.innerHTML = config.topTitle;
  header.appendChild(topTitle);
}
if (config.title) {
  var titleText = document.createElement("div");
  titleText.innerHTML = config.title;
  header.appendChild(titleText);
}
if (config.subtitle) {
  var subtitleText = document.createElement("div");
  subtitleText.innerHTML = config.subtitle;
  header.appendChild(subtitleText);
}
if (config.byline) {
  var bylineText = document.createElement("div");
  bylineText.innerHTML = config.byline;
  header.appendChild(bylineText);
}
if (config.description) {
  var descriptionText = document.createElement("div");
  descriptionText.innerHTML = config.description;
  header.appendChild(descriptionText);
}

// If after this, the header has anything in it, it gets appended to the story
if (header.innerText.length > 0) {
  header.classList.add(config.theme);
  header.setAttribute("id", "header");
  story.appendChild(header);
}

/* After building the elements and assigning content to the header these functions will loop through the chapters in the config.js file, create the vignette elements and assign them their respective content */

config.chapters.forEach((record, idx) => {
  /* These first two variables will hold each vignette, the chapter
    element will go in the container element */
  var container = document.createElement("div");
  var chapter = document.createElement("div");
  // Adds a class to the vignette
  chapter.classList.add("br3");
  // Adds all the content to the vignette's div
  chapter.innerHTML = record.chapterDiv;
  // Sets the id for the vignette and adds the step css attribute
  container.setAttribute("id", record.id);
  container.classList.add("step");
  // If the chapter is the first one, set it to active
  if (idx === 0) {
    container.classList.add("active");
  }
  // Adds the overall theme to the chapter element
  chapter.classList.add(config.theme);
  /* Appends the chapter to the container element and the container
    element to the features element */
  container.appendChild(chapter);
  container.classList.add(alignments[record.alignment] || "centered");
  if (record.hidden) {
    container.classList.add("hidden");
  }
  features.appendChild(container);
});

// Appends the features element (with the vignettes) to the story element
story.appendChild(features);

/* Next, this section creates the footer element and assigns it
its content based on the config.js file */

var footer = document.createElement("div");

// This assigns all the content to the footer element
if (config.footer) {
  var footerText = document.createElement("p");
  footerText.innerHTML = config.footer;
  footer.appendChild(footerText);
}
// If the footer element contains any content, add it to the story
if (footer.innerText.length > 0) {
  footer.classList.add(config.theme);
  footer.setAttribute("id", "footer");
  story.appendChild(footer);
}

// Adds the Mapbox access token
mapboxgl.accessToken = config.accessToken;

// Honestly, don't know what this does
const transformRequest = (url) => {
  const hasQuery = url.indexOf("?") !== -1;
  const suffix = hasQuery
    ? "&pluginName=scrollytellingV2"
    : "?pluginName=scrollytellingV2";
  return {
    url: url + suffix,
  };
};

// Creates a variable to hold the starting zoom value
var startingZoom;
// If the screen size is small, it uses the `zoomSmall` value
if (smallMedia) {
  startingZoom = config.chapters[0].location.zoomSmall;
} else {
  startingZoom = config.chapters[0].location.zoom;
}

/* This section creates the map element with the
attributes from the main section of the config.js file */
var map = new mapboxgl.Map({
  container: "map",
  style: config.style,
  center: config.chapters[0].location.center,
  zoom: startingZoom,
  bearing: config.chapters[0].location.bearing,
  pitch: config.chapters[0].location.pitch,
  interactive: false,
  transformRequest: transformRequest,
});

if (config.showMarkers) {
  var marker = new mapboxgl.Marker({ color: config.markerColor });
  marker.setLngLat(config.chapters[0].location.center).addTo(map);
}

// Instantiates the scrollama function
var scroller = scrollama();

/* Here we add the two extra layers we are using, just like in our previous
tutorial. At the end, however, we setup the functions that will tie the
scrolling to the chapters and move the map from one location to another
while changing the zoom level, pitch and bearing */

map.on("load", function () {
  // Add 3d terrain if necessary
  if (config.use3dTerrain) {
    map.addSource("mapbox-dem", {
      type: "raster-dem",
      url: "mapbox://mapbox.mapbox-terrain-dem-v1",
      tileSize: 512,
      maxzoom: 14,
    });
    // Add the DEM source as a terrain layer with exaggerated height
    map.setTerrain({ source: "mapbox-dem", exaggeration: 1.5 });

    // Add a sky layer that will show when the map is highly pitched
    map.addLayer({
      id: "sky",
      type: "sky",
      paint: {
        "sky-type": "atmosphere",
        "sky-atmosphere-sun": [0.0, 0.0],
        "sky-atmosphere-sun-intensity": 15,
      },
    });
  }
  map.addLayer(
    {
      id: "electricity", //turnstileData
      type: "circle",
      source: {
        type: "geojson",
        data: "data/data.geojson",
      },
      paint: {
        "circle-color": [
          "interpolate",
          ["linear"],
          ["get", "electricity_psf"],
          0, //0.046   //natural_gas_psf: 0.0
          "#d0ff00",
          16.19, //16.19  //natural_gas_psf: 56.96
          "#e58e00",
          105.57, //105.57   //natural_gas_psf: 322.53
          "#ff0000",
        ],
        "circle-stroke-color": "#4d4d4d",
        "circle-stroke-width": 0.5,
        "circle-radius": [
          "interpolate",
          ["exponential", 2],
          ["zoom"],
          10,
          ["interpolate", ["linear"], ["get", "electricity"], -1, 10, -0.4, 4],//-1, 10, -0.4, 4
          15,
          [
            "interpolate",
            ["linear"],
            ["get", "electricity"],
            -1,
            25,
            -0.4,
            12,
          ],
        ],
      },
    },
    "waterway-label"
  );

  map.addLayer(
    {
      id: "price",
      type: "circle",
      source: {
        type: "geojson",
        data: "data/data.geojson",
      },
      paint: {
        // Use the same circle color logic if needed (or remove it if only size should change)
        "circle-color": [
          "interpolate",
          ["linear"],
          ["get", "electricity_psf"],
          0,
          "#d0ff00",
          16.19,
          "#e58e00",
          105.57,
          "#ff0000",
        ],
        "circle-stroke-color": "#4d4d4d",
        "circle-stroke-width": 0.5,

        // Adjust the circle radius based on 'price' from the geojson file
        "circle-radius": [
          "interpolate",
          ["linear"],
          ["get", "price"], // Use the 'price' property for size
          1.31, 0.01, // Smallest size 
          713.21, 4, // Medium size 
          4336.16, 20, // Largest size 
        ],
      },
    },
    "waterway-label" // Ensure this is layered appropriately in the map
  );

  map.addLayer(
    {
      id: "price_large",
      type: "circle",
      source: {
        type: "geojson",
        data: "data/data.geojson",
      },
      paint: {
        // Use the same circle color logic if needed (or remove it if only size should change)
        "circle-color": [
          "interpolate",
          ["linear"],
          ["get", "electricity_psf"],
          0,
          "#d0ff00",
          16.19,
          "#e58e00",
          105.57,
          "#ff0000",
        ],
        "circle-stroke-color": "#4d4d4d",
        "circle-stroke-width": 0.5,

        // Adjust the circle radius based on 'price' from the geojson file
        "circle-radius": [
          "interpolate",
          ["linear"],
          ["get", "price"], // Use the 'price' property for size
          1.31, 1, // Smallest size 
          713.21, 25, // Medium size 
          4336.16, 50, // Largest size 
        ],
      },
    },
    "waterway-label" // Ensure this is layered appropriately in the map
  );

  map.addLayer(
    {
      id: "natural_gas", //turnstileData
      type: "circle",
      source: {
        type: "geojson",
        data: "data/data.geojson",
      },
      paint: {
        "circle-color": [
          "interpolate",
          ["linear"],
          ["get", "natural_gas_psf"],
          0, //0.046   //natural_gas_psf: 0.0
          "rgb(255, 255, 204)",
          20, 
          "rgb(199, 233, 180)",
          40, 
          "rgb(127, 205, 187)",
          56.95, //16.19  //natural_gas_psf: 56.96
          "rgb(65, 182, 196)",
          145, 
          "rgb(29, 145, 192)",
          228, 
          "rgb(34, 94,168)",
          322.53, //105.57   //natural_gas_psf: 322.53
          "rgb(12, 44, 132)", 
        ],
        "circle-stroke-color": "#4d4d4d",
        "circle-stroke-width": 0.5,
        "circle-radius": [
          "interpolate",
          ["exponential", 2],
          ["zoom"],
          10,
          ["interpolate", ["linear"], ["get", "natural_gas_psf"], -1, 10, -0.4, 4],//-1, 10, -0.4, 4
          15,
          [
            "interpolate",
            ["linear"],
            ["get", "natural_gas_psf"],
            -1,
            25,
            -0.4,
            12,
          ],
        ],
      },
    },
    "waterway-label"
  );

  map.addLayer(
    {
      id: "price_natural_gas",
      type: "circle",
      source: {
        type: "geojson",
        data: "data/data.geojson",
      },
      paint: {
        // Use the same circle color logic if needed (or remove it if only size should change)
        "circle-color": [
          "interpolate",
          ["linear"],
          ["get", "natural_gas_psf"],
          0, //0.046   //natural_gas_psf: 0.0
          "rgb(255, 255, 204)",
          20, 
          "rgb(199, 233, 180)",
          40, 
          "rgb(127, 205, 187)",
          56.95, //16.19  //natural_gas_psf: 56.96
          "rgb(65, 182, 196)",
          145, 
          "rgb(29, 145, 192)",
          228, 
          "rgb(34, 94,168)",
          322.53, //105.57   //natural_gas_psf: 322.53
          "rgb(12, 44, 132)", 
        ],
        "circle-stroke-color": "#4d4d4d",
        "circle-stroke-width": 0.5,

        // Adjust the circle radius based on 'price' from the geojson file
        "circle-radius": [
          "interpolate",
          ["linear"],
          ["get", "price"], // Use the 'price' property for size
          1.31, 0.01, // Smallest size 
          713.21, 4, // Medium size 
          4336.16, 20, // Largest size 
        ],
      },
    },
    "waterway-label" // Ensure this is layered appropriately in the map
  );

  map.addLayer(
    {
      id: "price_natural_gas_large",
      type: "circle",
      source: {
        type: "geojson",
        data: "data/data.geojson",
      },
      paint: {
        // Use the same circle color logic if needed (or remove it if only size should change)
        "circle-color": [
          "interpolate",
          ["linear"],
          ["get", "natural_gas_psf"],
          0, //0.046   //natural_gas_psf: 0.0
          "rgb(255, 255, 204)",
          20, 
          "rgb(199, 233, 180)",
          40, 
          "rgb(127, 205, 187)",
          56.95, //16.19  //natural_gas_psf: 56.96
          "rgb(65, 182, 196)",
          145, 
          "rgb(29, 145, 192)",
          228, 
          "rgb(34, 94,168)",
          322.53, //105.57   //natural_gas_psf: 322.53
          "rgb(12, 44, 132)", 
        ],
        "circle-stroke-color": "#4d4d4d",
        "circle-stroke-width": 0.5,

        // Adjust the circle radius based on 'price' from the geojson file
        "circle-radius": [
          "interpolate",
          ["linear"],
          ["get", "price"], // Use the 'price' property for size
          1.31, 1, // Smallest size 
          713.21, 25, // Medium size 
          4336.16, 50, // Largest size 
        ],
      },
    },
    "waterway-label" // Ensure this is layered appropriately in the map
  );

  // map.addLayer(
  //   {
  //     id: "same_electricity_diff_price",
  //     type: "circle",
  //     source: {
  //       type: "geojson",
  //       data: "data/data.geojson",
  //     },
  //     filter: ["in", "line", 10, 11, 12, 13, 14, 15, 16, 17, 18, 19, 20, 100, 200], // Highlighted features
  //     paint: {
  //       "circle-color": [
  //         "interpolate",
  //         ["linear"],
  //         ["get", "electricity_psf"],
  //         0,
  //         "#d0ff00",
  //         16.19,
  //         "#e58e00",
  //         105.57,
  //         "#ff0000",
  //       ], // Base coloring logic remains
  //       "circle-stroke-color": "#ff00ff", // Magenta stroke for highlighting
  //       "circle-stroke-width": 20, // Thicker stroke for visibility
  //       "circle-radius": [
  //         "interpolate",
  //         ["linear"],
  //         ["get", "price"],
  //         1.31,
  //         0.01,
  //         713.21,
  //         4,
  //         4336.16,
  //         20,
  //       ], // Same radius logic as base
  //       "circle-stroke-dasharray": [4, 2], // Dashed stroke for highlighted circles
  //     },
  //   },
  //   "waterway-label" // Add above the base layer for visibility
  // );

  // map.addLayer(
  //   {
  //     id: "medianIncome",
  //     type: "fill",
  //     source: {
  //       type: "geojson",
  //       data: "data/data.geojson",
  //     },
  //     filter: ['all', ['!=', ['get', 'MHHI'], null]], //if the data is not null, show the data 
  //     paint: {
  //       "fill-opacity": 0,
  //       "fill-color": [
  //         "step",
  //         ["get", "MHHI"],
  //         "#ffffff",
  //         20000, "#E6E6E6", 
  //         //"#ccedf5",
  //         50000, "#BFBFBF",
  //         //"#99daea",
  //         75000, "#7A7A7A",
  //         //"#66c7e0",
  //         100000, "#404040",
  //         //"#33b5d5",
  //         150000, "#1A1A1A",
  //         //"#00a2ca",
  //       ],
  //     },
  //   },
  //   "waterway"
  // );

  // Setup the instance, pass callback functions
  scroller
    .setup({
      step: ".step",
      offset: 0.75,
      progress: true,
    })
    .onStepEnter((response) => {
      var chapter = config.chapters.find(
        (chap) => chap.id === response.element.id
      );
      response.element.classList.add("active");
      let thisZoom;
      if (smallMedia) {
        thisZoom = chapter.location.zoomSmall;
      } else {
        thisZoom = chapter.location.zoom;
      }
      thisLocation = {
        bearing: chapter.location.bearing,
        center: chapter.location.center,
        pitch: chapter.location.pitch,
        zoom: thisZoom,
      };
      map[chapter.mapAnimation || "flyTo"](thisLocation);
      if (config.showMarkers) {
        marker.setLngLat(chapter.location.center);
      }
      if (chapter.onChapterEnter.length > 0) {
        chapter.onChapterEnter.forEach(setLayerOpacity);
      }
      if (chapter.callback) {
        window[chapter.callback]();
      }
      if (chapter.rotateAnimation) {
        map.once("moveend", function () {
          const rotateNumber = map.getBearing();
          map.rotateTo(rotateNumber + 90, {
            duration: 24000,
            easing: function (t) {
              return t;
            },
          });
        });
      }
    })
    .onStepExit((response) => {
      var chapter = config.chapters.find(
        (chap) => chap.id === response.element.id
      );
      response.element.classList.remove("active");
      if (chapter.onChapterExit.length > 0) {
        chapter.onChapterExit.forEach(setLayerOpacity);
      }
    });
});

/* Here we watch for any resizing of the screen to
adjust our scrolling setup */
window.addEventListener("resize", scroller.resize);
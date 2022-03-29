import * as d3 from 'd3';
import * as L from 'leaflet';
import 'leaflet/dist/leaflet.css';

const getDefaultLayerStyle = (vis) => (d) => ({
  fillColor: vis.colorScale(vis.choropleth.choroplethData[d.id] || 0),
  dashArray: '3',
  color: 'white',
  opacity: 1,
  weight: 2,
  fillOpacity: 0.7,
});

export class GeoMap {
  /**
   * Class constructor with basic configuration
   * @param {Object}
   * @param {Array}
   */
  constructor(
    _config,
    _geoData,
    {
      choropleth: {
        title = 'Number of farms by country',
        columnName = 'Number of farms',
        choroplethData,
        choroplethDomain,
        center,
        zoom,
        data: { farmNumberByCountryId, areaByCountryId },
      },
      farmWithAreaByFarmId,
    },
    { onCountryChange },
  ) {
    this.config = {
      parentElement: (_config.parentElement = '#map'),
      containerWidth: _config.containerWidth || 1000,
      containerHeight: _config.containerHeight || 400,
      margin: _config.margin || { top: 0, right: 0, bottom: 0, left: 0 },
      tooltipPadding: 10,
    };
    this.geoData = _geoData;
    this.choropleth = {
      choroplethData,
      choroplethDomain,
      center,
      zoom,
      title,
      columnName,
      data: { farmNumberByCountryId, areaByCountryId },
    };
    this.farmWithAreaByFarmId = farmWithAreaByFarmId;
    this.geoIdLayerMap = {};
    this.onCountryChange = onCountryChange;
    this.circles = [];

    this.initVis();
  }

  /**
   * We initialize scales/axes and append static elements, such as axis titles.
   */
  initVis() {
    const vis = this;
    vis.map = L.map('map');

    L.tileLayer('http://{s}.tile.osm.org/{z}/{x}/{y}.png', {
      attribution: '&copy; <a href="http://osm.org/copyright">OpenStreetMap</a>',
    }).addTo(vis.map);
    vis.geoLayers = L.geoJSON(vis.geoData, {
      onEachFeature: function (feature, layer) {
        vis.geoIdLayerMap[feature.id] = layer;
      },
    }).addTo(vis.map);

    vis.gradeLegendControl = L.control({ position: 'bottomright' });

    vis.farmNumberLegendControl = L.control();

    vis.colorScale = d3.scaleThreshold();

    vis.symbolScale = d3.scaleSqrt().range([100, 500]);

    vis.updateVis();
  }

  updateVis() {
    const vis = this;
    vis.colorScale
      .domain(vis.choropleth.choroplethDomain)
      .range(d3.schemeBlues[vis.choropleth.choroplethDomain.length + 1]);
    vis.symbolScale.domain(
      d3.extent(Object.values(vis.farmWithAreaByFarmId).map(({ total_area }) => total_area)),
    );
    vis.renderVis();
  }

  renderVis() {
    const vis = this;
    vis.map.setView(vis.choropleth.center, vis.choropleth.zoom);
    vis.geoLayers.setStyle(getDefaultLayerStyle(vis));

    vis.farmNumberLegendControl.onAdd = function (map) {
      vis.farmNumberLegend = L.DomUtil.create('div', 'info');
      this.update();
      return vis.farmNumberLegend;
    };

    vis.farmNumberLegendControl.update = function (feature) {
      const country = feature ? `<p>Country: ${feature.properties.name}</p>` : '';
      const data = feature
        ? vis.choropleth.choroplethData[feature.id] || 0
        : d3.sum(Object.values(vis.choropleth.choroplethData));
      const area = feature
        ? vis.choropleth.data.areaByCountryId[feature.id] || 0
        : d3.sum(Object.values(vis.choropleth.data.areaByCountryId));
      vis.farmNumberLegend.innerHTML = `<h4>${vis.choropleth.title}</h4>
           ${country}
        <p>${vis.choropleth.columnName}: ${data}</p>
         <p>Area: ${area} m <sup>2</sup></p>
`;
    };

    vis.farmNumberLegendControl.addTo(vis.map);

    vis.geoLayers.eachLayer((layer) => {
      layer.clearAllEventListeners();
      layer.on({
        mouseover: (e) => {
          e.target.setStyle({
            weight: 5,
            color: '#666',
            dashArray: '',
            fillOpacity: 0.7,
            // zIndex: 999,
          });
          // if (!L.Browser.ie && !L.Browser.opera && !L.Browser.edge) {
          //   e.target.bringToFront();
          // }
          vis.farmNumberLegendControl.update(layer.feature);
        },
        mouseout: (e) => {
          vis.farmNumberLegendControl.update();
          e.target.setStyle({
            dashArray: '3',
            color: 'white',
            weight: 2,
            fillOpacity: 0.7,
            // zIndex: 0,
          });
          // e.target.bringToBack()
        },
        click: (e) => {
          e.target.setStyle((d) => ({
            weight: 5,
            color: '#666',
            dashArray: '',
            fillOpacity: 0.7,
          }));
          vis.map.fitBounds(e.target.getBounds());
        },
      });
    });

    vis.gradeLegendControl.onAdd = function (map) {
      vis.gradeLegend && L.DomUtil.remove(vis.gradeLegend);
      vis.gradeLegend = L.DomUtil.create('div', 'info legend');
      const grades = vis.choropleth.choroplethDomain;

      for (let i = 0; i < grades.length; i++) {
        vis.gradeLegend.innerHTML += `<div><i style="background:${vis.colorScale(
          grades[i] + 1,
        )}"></i>
            ${grades[i] + (grades[i + 1] ? '&ndash;' + grades[i + 1] : '+')}</div>`;
      }
      return vis.gradeLegend;
    };
    vis.gradeLegendControl.addTo(vis.map);

    for (const circle of vis.circles) {
      vis.map.removeLayer(circle);
    }
    for (const farm of Object.values(vis.farmWithAreaByFarmId)) {
      const circle = L.circle([farm.grid_points.lat, farm.grid_points.lng], {
        color: 'red',
        fillColor: '#f03',
        fillOpacity: 0.5,
        radius: vis.symbolScale(farm.total_area),
        className: 'circle',
      }).addTo(vis.map);
      vis.circles.push(circle);
    }
  }

  updateCountry() {
    const vis = this;
  }
}

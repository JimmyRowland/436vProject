import * as d3 from 'd3';
import * as L from 'leaflet';
import 'leaflet/dist/leaflet.css';
import {
  areaColorScale,
  farmNumberByCountryIdDomain,
  getFarmAreaBucket,
  getFarmNumberByCountryId,
  getFarmTooltipContent,
  getTotalAreaByCountryId,
} from './utils';
import { filteredStates, filters, states, updateCharts } from './main';
import { filter } from 'd3';

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
        center,
        zoom,
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
      center,
      zoom,
      title,
      columnName,
    };
    this.geoIdLayerMap = {};
    this.onCountryChange = onCountryChange;
    this.circles = [];
    this.isFirstRender = true;
    this.initVis();
  }

  /**
   * We initialize scales/axes and append static elements, such as axis titles.
   */
  initVis() {
    const vis = this;
    vis.map = L.map('map');
    vis.map.setView(this.choropleth.center, this.choropleth.zoom);

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

    vis.colorScale
      .domain(farmNumberByCountryIdDomain)
      .range(d3.schemeBlues[farmNumberByCountryIdDomain.length + 1]);

    vis.farmWithAreaByFarmId = filteredStates.farmWithAreaByFarmId;
    vis.symbolScale.domain(
      d3.extent(Object.values(vis.farmWithAreaByFarmId).map(({ total_area }) => total_area)),
    );
    for (const farm of Object.values(vis.farmWithAreaByFarmId)) {
      const circle = L.circle([farm.grid_points.lat, farm.grid_points.lng], {
        radius: vis.symbolScale(farm.total_area),
        className: 'circle',
      }).addTo(vis.map);
      circle.farm = farm;
      vis.circles.push(circle);
    }
    vis.updateVis();
  }

  updateVis() {
    const vis = this;
    vis.choropleth.choroplethData = getFarmNumberByCountryId(
      filteredStates.farms,
      states.countryNameIdMap,
    );
    vis.choropleth.areaByCountryId = getTotalAreaByCountryId(
      filteredStates.farms,
      states.countryNameIdMap,
      states.locationsByFarmId,
    );
    vis.renderVis();
  }

  renderVis() {
    const vis = this;
    vis.isFirstRender = false;
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
        ? vis.choropleth.areaByCountryId[feature.id] || 0
        : d3.sum(Object.values(vis.choropleth.areaByCountryId));
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
          const farms = states.farmsByCountryName[layer.feature.properties.name];
          const farmsToSelect = [];
          const farmsToDeselect = [];
          for (const farm of farms) {
            const clickable = filteredStates.farmIdSet.has(farm.farm_id);
            const selected = filters.geoMap.selectedFarmIdSet.has(farm.farm_id);
            if (clickable) {
              !selected && farmsToSelect.push(farm);
              selected && farmsToDeselect.push(farm);
            }
          }
          if (farmsToSelect.length) {
            for (const { farm_id } of farmsToSelect) {
              filters.geoMap.selectedFarmIdSet.add(farm_id);
            }
            e.target.setStyle((d) => ({
              weight: 5,
              color: '#666',
              dashArray: '',
              fillOpacity: 0.7,
            }));
            vis.map.fitBounds(e.target.getBounds());
          } else {
            for (const { farm_id } of farmsToDeselect) {
              filters.geoMap.selectedFarmIdSet.delete(farm_id);
            }
            vis.map.setView(this.choropleth.center, this.choropleth.zoom);
          }
          updateCharts();
        },
      });
    });

    vis.gradeLegendControl.onAdd = function (map) {
      vis.gradeLegend && L.DomUtil.remove(vis.gradeLegend);
      vis.gradeLegend = L.DomUtil.create('div', 'info legend');
      const grades = farmNumberByCountryIdDomain;

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
      const farm = circle.farm;
      const clickable = filteredStates.farmIdSet.has(farm.farm_id);
      const selected = filters.geoMap.selectedFarmIdSet.has(farm.farm_id);

      circle.setStyle({
        color: clickable && selected ? 'red' : 'rgb(51, 136, 255)',
        fillColor: areaColorScale(getFarmAreaBucket(farm)),
        opacity: clickable ? 0.8 : 0,
        fillOpacity: clickable ? 1 : 0.1,
      });
      circle.removeEventListener();
      clickable &&
        circle.on({
          mouseover: (e) => {
            d3.select('#tooltip')
              .style('display', 'block')
              .style('left', e.originalEvent.clientX + 12 + 'px')
              .style('top', e.originalEvent.clientY + 12 + 'px')
              .html(getFarmTooltipContent(farm));
          },
          mouseout: (e) => {
            d3.select('#tooltip').style('display', 'none');
          },
          click: (e) => {
            selected
              ? filters.geoMap.selectedFarmIdSet.delete(farm.farm_id)
              : filters.geoMap.selectedFarmIdSet.add(farm.farm_id);
            circle.setStyle({
              color: !selected ? 'red' : 'rgb(51, 136, 255)',
            });
            updateCharts();
          },
        });
    }
  }

  updateCountry() {
    const vis = this;
  }
}

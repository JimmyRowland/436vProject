import '../css/style.css';
import * as d3 from 'd3';
import { GeoMap } from './geoMap';
import {
  farmNumberByCountryIdCenter,
  farmNumberByCountryIdDomain,
  farmNumberByCountryIdZoom,
  getCropGroups,
  getfarmWithAreaByFarmId,
  getFarmNumberByCountryId,
  getFarmsByUserCount,
  getFarmsCountryIdMap,
  getTotalAreaByCountryId,
  getFarmsByUserCountAreaBucket,
  getFarmPercentageByUserCountGroup,
  getFarmsByCertificationCertifier,
  getCertifierGroups,
  areaAggregationBreakpoints,
} from './utils';
import { destroyPieChart, piechart } from './piechart';
import produce from 'immer';
import { Barchart } from './barChart';
import { BubbleChart } from './bubbleChart';
import { bubbleChart } from './bubbleChart2';

let URI;
const VITE_ENV = import.meta.env.VITE_ENV || 'development';
if (import.meta.env.VITE_API_URL?.length) {
  URI = import.meta.env.VITE_API_URL;
} else {
  if (VITE_ENV === 'development') {
    URI = window.location.href.replace(/3000.*/, '5000');
  } else if (VITE_ENV === 'production') {
    URI = 'https://api.app.litefarm.org';
  } else if (VITE_ENV === 'integration') {
    URI = 'https://api.beta.litefarm.org';
  }
}

export const states = {
  farms: {},
  countryNameIdMap: {},
  crops: {},
  locations: {},
  cropVarietiesByFarmId: {},
  cropVarietiesByCropId: {},
  locationsByFarmId: {},
  locationTypes: [],
  locationColorScale: undefined,
  country_id: undefined,
  geoMap: undefined,
  barChart: undefined,
  chart1: {
    height: 0,
    width: 0,
  },
  chart2: {
    height: 0,
    width: 0,
  },
};

export const filters = {
  barchart: {
    area: areaAggregationBreakpoints.reduce((filter, breakpoint) => {
      filter[breakpoint] = true;
      return filter;
    }, {}),
    userCount: {},
  },
};

export const filteredStates = {
  farms: {},
  farmWithAreaByFarmId: {},
  //barchart
  farmsByUserCountAreaBucket: {},
};

Promise.all([
  d3.json('data/world_countries.json'),
  // original source
  // d3.csv(
  //   'https://raw.githubusercontent.com/holtzy/D3-graph-gallery/master/DATA/world_population.csv',
  // ),

  d3.json(`data/farm.json`),
  d3.json(`data/variety.json`),
  d3.json(`data/crop.json`),
  d3.json(`data/location.json`),
  // db endpoints:
  // d3.json(`${URI}/visualization/farm`),
  // d3.json(`${URI}/visualization/variety`),
  // d3.json(`${URI}/visualization/crop`),
  // d3.json(`${URI}/visualization/location`),
])
  .then((data) => {
    fillCache(data);
    fillChartDivWidth();
    //does not need filter when location chart is not implemented

    filteredStates.farmWithAreaByFarmId = produce({}, (_) =>
      getfarmWithAreaByFarmId(states.farms, states.locationsByFarmId),
    );
    updateFilteredStates();

    const farmNumberByCountryId = getFarmNumberByCountryId(states.farms, states.countryNameIdMap);
    const areaByCountryId = getTotalAreaByCountryId(
      states.farms,
      states.countryNameIdMap,
      states.locationsByFarmId,
    );

    states.geoMap = new GeoMap(
      {
        parentElement: '#map',
      },
      data[0],
      {
        choropleth: {
          choroplethDomain: farmNumberByCountryIdDomain,
          choroplethData: farmNumberByCountryId,
          zoom: farmNumberByCountryIdZoom,
          center: farmNumberByCountryIdCenter,
          data: { farmNumberByCountryId, areaByCountryId },
        },
        farmWithAreaByFarmId: filteredStates.farmWithAreaByFarmId,
        // pieChart: getCountryCropGroupData()
      },
      { onCountryChange },
    );

    states.geoMap.updateVis();
    piechart(getCountryCropGroupData());
    states.barChart = new Barchart({
      parentElement: '#chart1',
    });
    states.barChart.updateVis();
    bubbleChart();
  })
  .catch((error) => console.error(error));

function fillCache(data) {
  for (const cropVariety of data[2]) {
    states.cropVarietiesByFarmId = produce(
      states.cropVarietiesByFarmId,
      (cropVarietiesByFarmId) => {
        cropVarietiesByFarmId[cropVariety.farm_id] =
          cropVarietiesByFarmId[cropVariety.farm_id] || [];
        cropVarietiesByFarmId[cropVariety.farm_id].push(cropVariety);
      },
    );
    states.cropVarietiesByCropId = produce(
      states.cropVarietiesByCropId,
      (cropVarietiesByCropId) => {
        cropVarietiesByCropId[cropVariety.crop_id] =
          cropVarietiesByCropId[cropVariety.crop_id] || [];
        cropVarietiesByCropId[cropVariety.crop_id].push(cropVariety);
      },
    );
  }
  for (const crop of data[3]) {
    states.crops = produce(states.crops, (crops) => {
      crops[crop.crop_id] = crop;
    });
  }
  for (const farm of data[1]) {
    states.farms = produce(states.farms, (farms) => {
      farms[farm.farm_id] = farm;
    });
    filters.barchart.userCount[farm.number_of_users] = true;
  }

  const locationTypes = new Set();
  for (const location of data[4]) {
    states.locations = produce(states.locations, (locations) => {
      locations[location.location_id] = location;
    });
    states.locationsByFarmId = produce(states.locationsByFarmId, (locationsByFarmId) => {
      locationsByFarmId[location.farm_id] = locationsByFarmId[location.farm_id] || [];
      locationsByFarmId[location.farm_id].push(location);
    });
    locationTypes.add(location.type);
  }
  states.locationTypes = produce(states.locationTypes, (_) => Array.from(locationTypes));
  states.locationColorScale = d3.scaleOrdinal().domain(states.locationTypes).range(d3.schemeSet1);
  for (const country of data[0].features) {
    states.countryNameIdMap = produce(states.countryNameIdMap, (countryNameIdMap) => {
      countryNameIdMap[country.properties.name] = country.id;
    });
  }
}

function onCountryChange(country_id) {
  states.country_id = country_id;
  states.geoMap.updateCountry(country_id);
}

function getCountryCropGroupData() {
  const farmsByCountryId = getFarmsCountryIdMap(states.farms, states.countryNameIdMap);
  const children = Object.entries(farmsByCountryId).map(([country_id, farms]) => ({
    name: farms[0].country_name,
    children: getCropGroups(farms),
  }));
  return { name: 'crop_group', children: getCropGroups(Object.values(states.farms)) };
}

function fillChartDivWidth() {
  const chartDiv1 = document.getElementById('chart1');
  states.chart1.width = chartDiv1.offsetWidth;
  states.chart1.height = chartDiv1.offsetHeight;
  const chartDiv2 = document.getElementById('chart2');
  states.chart2.width = chartDiv2.offsetWidth;
  states.chart2.height = chartDiv2.offsetHeight;
}

function updateFilteredStates() {
  filteredStates.farms = produce([], () =>
    Object.values(filteredStates.farmWithAreaByFarmId).filter((farm) => {
      const areaBucket = areaAggregationBreakpoints.find((area) => area <= farm.total_area);
      return filters.barchart.area[areaBucket] && filters.barchart.userCount[farm.number_of_users];
    }),
  );
}

export function updateCharts() {
  updateFilteredStates();
  states.barChart.updateVis();
}

function logStates(data) {
  console.log(new Set(data[1].map((farm) => farm.certifier)).size);
  console.log(new Set(data[1].map((farm) => farm.certification)).size);
  console.log(new Set(data[1].map((farm) => farm.country_name)).size);
  console.log(d3.extent(data[1].map((farm) => farm.number_of_users)));
  console.log(d3.extent(data[1].map((farm) => farm.grid_points.lat)));
  console.log(d3.extent(data[1].map((farm) => farm.grid_points.lng)));
  console.log(new Set(data[2].map((variety) => variety.crop_id)).size);
  console.log(new Set(data[2].map((variety) => variety.crop_variety_name)).size);

  console.log(new Set(data[2].map((variety) => states.crops[variety.crop_id])).size);
  console.log(new Set(data[2].map((variety) => variety.farm_id)).size);
  console.log(new Set(data[1].map((farm) => farm.farm_id)).size);

  console.log(d3.extent(data[4].map((location) => location.total_area)));
}

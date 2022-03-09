import '../css/style.css';
import * as d3 from 'd3';
import { GeoMap } from './geoMap';
import {
  farmNumberByCountryIdCenter,
  farmNumberByCountryIdDomain,
  farmNumberByCountryIdZoom,
  getFarmAreaByFarmId,
  getFarmNumberByCountryId,
  getFarmsCountryIdMap,
  getTotalAreaByCountryId,
} from './utils';
import { piechart } from './piechart';

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

const states = {
  farms: {},
  countryNameIdMap: {},
  crops: {},
  locations: {},
  cropVarietiesByFarmId: {},
  cropVarietiesByCropId: {},
  locationsByFarmId: {},
  country_id: undefined,
  geoMap: undefined,
};

Promise.all([
  d3.json('data/world_countries.json'),
  // d3.csv(
  //   'https://raw.githubusercontent.com/holtzy/D3-graph-gallery/master/DATA/world_population.csv',
  // ),
  // d3.json(`${URI}/visualization/farm`),
  // d3.json(`${URI}/visualization/variety`),
  // d3.json(`${URI}/visualization/crop`),
  // d3.json(`${URI}/visualization/location`),
  d3.json(`data/farm.json`),
  d3.json(`data/variety.json`),
  d3.json(`data/crop.json`),
  d3.json(`data/location.json`),
])
  .then((data) => {
    for (const cropVariety of data[2]) {
      states.cropVarietiesByFarmId[cropVariety.farm_id] =
        states.cropVarietiesByFarmId[cropVariety.farm_id] || [];
      states.cropVarietiesByFarmId[cropVariety.farm_id].push(cropVariety);
      states.cropVarietiesByCropId[cropVariety.crop_id] =
        states.cropVarietiesByCropId[cropVariety.crop_id] || [];
      states.cropVarietiesByCropId[cropVariety.crop_id].push(cropVariety);
    }
    for (const crop of data[3]) {
      states.crops[crop.crop_id] = crop;
    }
    for (const farm of data[1]) {
      states.farms[farm.farm_id] = farm;
    }
    for (const location of data[4]) {
      states.locations[location.location_id] = location;
      states.locationsByFarmId[location.farm_id] = states.locationsByFarmId[location.farm_id] || [];
      states.locationsByFarmId[location.farm_id].push(location);
    }
    for (const country of data[0].features) {
      states.countryNameIdMap[country.properties.name] = country.id;
    }

    const farmNumberByCountryId = getFarmNumberByCountryId(states.farms, states.countryNameIdMap);
    const areaByCountryId = getTotalAreaByCountryId(
      states.farms,
      states.countryNameIdMap,
      states.locationsByFarmId,
    );
    const farmAreaByFarmId = getFarmAreaByFarmId(states.farms, states.locationsByFarmId);
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
        farmAreaByFarmId,
        // pieChart: getCountryCropGroupData()
      },
      { onCountryChange },
    );

    states.geoMap.updateVis();
    piechart(getCountryCropGroupData());
  })
  .catch((error) => console.error(error));

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
  return { name: 'country', children };
}

function getCropGroups(farms) {
  const cropsByCropGroup = {};
  for (const { farm_id } of farms) {
    const cropVarieties = states.cropVarietiesByFarmId[farm_id];
    if (cropVarieties) {
      for (const cropVariety of cropVarieties) {
        const crop = states.crops[cropVariety.crop_id];
        cropsByCropGroup[crop.crop_group] = cropsByCropGroup[crop.crop_group] || {};
        cropsByCropGroup[crop.crop_group][crop.crop_id] = cropsByCropGroup[crop.crop_group][
          crop.crop_id
        ] || {
          name: crop.crop_common_name,
          children: [],
        };
        cropsByCropGroup[crop.crop_group][crop.crop_id].children.push({
          name: cropVariety.crop_variety_name,
          value: 1,
        });
      }
    }
  }
  return (
    Object.entries(cropsByCropGroup).map(([crop_group, crops]) => ({
      name: crop_group,
      children: Object.values(crops).map((crop) => crop),
    })) || []
  );
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

export const getFarmsCountryIdMap = (farms, countryNameIdMap) => {
  return Object.values(farms).reduce((farmsByISO, farm) => {
    const country_id = countryNameIdMap[farm.country_name];
    if (country_id) {
      farmsByISO[country_id] = farmsByISO[country_id] ?? [];
      farmsByISO[country_id].push({ ...farm, country_id });
    }
    return farmsByISO;
  }, {});
};

export const getFarmNumberByCountryId = (farms, countryNameIdMap) => {
  return Object.entries(getFarmsCountryIdMap(farms, countryNameIdMap)).reduce(
    (farmNumberByCountryId, [country_id, farms]) => {
      farmNumberByCountryId[country_id] = farms.length;
      return farmNumberByCountryId;
    },
    {},
  );
};

export const getTotalAreaByCountryId = (farms, countryNameIdMap, locationsByFarmId) => {
  return Object.entries(getFarmsCountryIdMap(farms, countryNameIdMap)).reduce(
    (farmNumberByCountryId, [country_id, farms]) => {
      farmNumberByCountryId[country_id] = farms.reduce((total_area, { farm_id }) => {
        total_area += (locationsByFarmId[farm_id] || []).reduce((total_area, location) => {
          total_area += ['field', 'garden', 'greenhouse'].includes(location.type)
            ? location.total_area
            : 0;
          return total_area;
        }, 0);
        return total_area;
      }, 0);
      return farmNumberByCountryId;
    },
    {},
  );
};

export const getFarmAreaByFarmId = (farms, locationsByFarmId) => {
  return Object.entries(locationsByFarmId).reduce((farmAreaByFarmId, [farm_id, locations]) => {
    const total_area = locations.reduce((total_area, location) => {
      total_area += ['field', 'garden', 'greenhouse'].includes(location.type)
        ? location.total_area
        : 0;
      return total_area;
    }, 0);
    const farm = farms[farm_id];
    locationsByFarmId[farm_id] = { ...farm, total_area };
    return locationsByFarmId;
  }, {});
};

export const farmNumberByCountryIdDomain = [1, 5, 10, 50, 100];
export const farmNumberByCountryIdCenter = [0, -80];
export const farmNumberByCountryIdZoom = 3;

export const getPopulationById = (countries) =>
  countries.reduce((populationById, country) => {
    country.pop = +country.pop || 0;
    populationById[country.code] = country.pop;
    return populationById;
  }, {});

import { countryToFlagEmoji, scale } from './helper.js';

document.addEventListener("DOMContentLoaded", () => {
  const select = document.getElementById("plot-type");
  const ctx = document.getElementById('chart');
  let bubbleChart = null;

  const metricHandlers = {
    population: countries => processCountryMetric(countries, 'population', 'Population', 3),
    borders: countries => processCountryMetric(countries, 'borders.length', 'Number of borders'),
    timezones: countries => processCountryMetric(countries, 'timezones.length', 'Number of timezones'),
    languages: countries => processCountryMetric(countries, 'languages.length', 'Number of languages'),
    region_country_count: countries => processRegionCount(countries, 'Country count'),
    region_timezones: countries => processRegionTimezones(countries, 'Unique timezones'),
  };

  select.addEventListener("change", updateChart);
  updateChart();

  /**
    * Fetches country data and updates the chart and table based on the selected metric
    */
  function updateChart() {
    const selectedMetric = select.value;
    fetch('/data/countries.json')
      .then(res => res.json())
      .then(countries => {
        if (!selectedMetric) return;

        const handler = metricHandlers[selectedMetric];
        console.log(handler, selectedMetric)
        if (!handler) {
          console.error('Unknown metric selected:', selectedMetric);
          return;
        }

        const dataPoints = handler(countries);
        renderChart(dataPoints);
        renderTable(dataPoints);
      });
  }

  /**
    * Renders the bubble chart using Chart.js
    * @param {Array[Object]} dataPoints - Array of data point objects to plot
    */
  function renderChart(dataPoints) {
    if (bubbleChart) bubbleChart.destroy();

    bubbleChart = new Chart(ctx, {
      type: 'bubble',
      data: {
        datasets: [{
          data: dataPoints,
          backgroundColor: 'rgba(50, 221, 138, 0.5)',
        }]
      },
      options: {
        layout: { padding: 0 },
        plugins: {
          legend: false,
          tooltip: {
            callbacks: {
              title: context => `${context[0].raw.flag} ${context[0].raw.name}`,
              label: context => `${context.raw.header}: ${context.raw.value.toLocaleString()}`,
            },
          },
        },
        scales: {
          x: { beginAtZero: true, display: false },
          y: { beginAtZero: true, display: false },
        },
      }
    });

    bubbleChart.update();
  }

  /**
    * Renders the data table based on the provided data points
    * @param {Array[Object]} dataPoints - Array of data point objects to plot
    */
  function renderTable(dataPoints) {
    const table = document.getElementById('table');
    if (!dataPoints.length) return;

    const header = dataPoints[0].header || '';
    const isRegionOnly = !dataPoints[0].flag && !dataPoints[0].subregion;

    const tableHeaders = isRegionOnly
      ? `
      <th scope="col">Name</th>
      <th scope="col">${header}</th>
    `
      : `
      <th scope="col">Name</th>
      <th scope="col">Flag</th>
      <th scope="col">Region</th>
      <th scope="col">Subregion</th>
      <th scope="col">${header}</th>
    `;

    const tableRows = dataPoints.map(dp => {
      return isRegionOnly
        ? `
        <tr>
          <td>${dp.name || ''}</td>
          <td>${dp.value.toLocaleString()}</td>
        </tr>
      `
        : `
        <tr>
          <td>${dp.name || ''}</td>
          <td>${dp.flag || ''}</td>
          <td>${dp.region || ''}</td>
          <td>${dp.subregion || ''}</td>
          <td>${dp.value.toLocaleString()}</td>
        </tr>
      `;
    }).join('');

    table.innerHTML = `
    <thead>
      <tr>${tableHeaders}</tr>
    </thead>
    <tbody>${tableRows}</tbody>
  `;
  }

  /**
    * Processes country data to extract metrics for plotting
    * @param {Array[Object]} countries - Array of country objects
    * @param {string} path - Path to the metric value in the country object
    * @param {string} header - Header for the metric column
    * @param {number} rScale - Radius scale for the bubble chart, defaults to 1
    * @return {Array[Object]} - Array of processed data points for the bubble chart
    */
  function processCountryMetric(countries, path, header, rScale = 1) {
    const getValue = country => path.split('.').reduce((o, k) => o?.[k], country);
    countries.sort((a, b) => getValue(b) - getValue(a));
    const smallest = getValue(countries[countries.length - 1]);
    const largest = getValue(countries[0]);

    return countries.map(country => ({
      ...country,
      x: country.latlng[1],
      y: country.latlng[0],
      r: scale(getValue(country), smallest, largest) * rScale,
      name: country.name,
      region: country.region,
      subregion: country.subregion,
      flag: countryToFlagEmoji(country.alpha2Code),
      header,
      value: getValue(country),
    }));
  }

  /**
    * Processes region data to calculate average coordinates and counts
    * @param {Array[Object]} countries - Array of country objects
    * @param {string} header - Header for the metric column
    */
  function processRegionCount(countries, header) {
    const regionData = {};

    countries.forEach(country => {
      const { region, latlng } = country;
      if (!region || !latlng?.length) return;

      const [lat, lng] = latlng;
      if (!regionData[region]) regionData[region] = { totalLat: 0, totalLng: 0, count: 0 };
      regionData[region].totalLat += lat;
      regionData[region].totalLng += lng;
      regionData[region].count++;
    });

    const regionArray = Object.entries(regionData).map(([region, { totalLat, totalLng, count }]) => ({
      region,
      lat: totalLat / count,
      lng: totalLng / count,
      count
    })).sort((a, b) => b.count - a.count);

    const smallest = regionArray[regionArray.length - 1].count;
    const largest = regionArray[0].count;

    return regionArray.map(r => ({
      x: r.lng,
      y: r.lat,
      r: scale(r.count, smallest, largest),
      name: r.region,
      flag: "",
      header,
      value: r.count
    }));
  }

  /**
    * Processes region data to calculate average coordinates and unique timezones
    * @param {Array[Object]} countries - Array of country objects
    * @param {string} header - Header for the metric column
    */
  function processRegionTimezones(countries, header) {
    const regionData = {};

    countries.forEach(country => {
      const { region, latlng, timezones } = country;
      if (!region || !latlng?.length) return;

      const [lat, lng] = latlng;
      if (!regionData[region]) {
        regionData[region] = { totalLat: 0, totalLng: 0, timezones: new Set(), count: 0 };
      }

      regionData[region].totalLat += lat;
      regionData[region].totalLng += lng;
      timezones.forEach(tz => regionData[region].timezones.add(tz));
      regionData[region].count++;
    });

    const regionArray = Object.entries(regionData).map(([region, data]) => {
      return {
        region,
        lat: data.totalLat / data.count,
        lng: data.totalLng / data.count,
        flag: "",
        count: data.timezones.size,
      };
    }).sort((a, b) => b.count - a.count);

    const smallest = regionArray[regionArray.length - 1].count;
    const largest = regionArray[0].count;

    return regionArray.map(r => ({
      x: r.lng,
      y: r.lat,
      r: scale(r.count, smallest, largest),
      name: r.region,
      header,
      value: r.count
    }));
  }
});

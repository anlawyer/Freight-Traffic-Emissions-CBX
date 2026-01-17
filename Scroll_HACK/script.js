// Replace with your Mapbox access token
mapboxgl.accessToken = 'pk.eyJ1Ijoic3JpeWF0aG90YWt1cmEiLCJhIjoiY21kYzhuMG1hMTVrbjJpcHpnZ3Awdjc1dCJ9.bEGwdPmOH5kVaT9RWduC5Q';

// Global variables
let scroller;
let animationFrame;
let animationStart;
let hviDataLoaded = false;
let parkAccessDataLoaded = false;
let asthmaDataLoaded = false;

// Initialize the map
const map = new mapboxgl.Map({
    container: 'map',
    style: 'mapbox://styles/mapbox/light-v11',
    center: [-73.8667, 40.8250], // Soundview, Bronx coordinates
    zoom: 14,
    pitch: 0,
    bearing: 0,
    trackResize: false,
    attributionControl: false
});

// Store map layers and sources
const layers = {
    arterialRoads: 'arterial-roads',
    arterialDots: 'arterial-dots',
    freightRoutes: 'freight-routes',
    imperviousSurfaces: 'impervious-surfaces',
    parkAccessHexbins: 'park-access-hexbins',
    asthmaHexbins: 'asthma-hexbins',
    priorityZone: 'priority-zone',
    schools: 'schools',
    hospitals: 'hospitals',
    hviLayer: 'hvi-layer'
};

// Track hero section visibility
let isInHeroSection = true;

// Function to fetch and join HVI data with UHF42 geography
async function fetchAndJoinHVIData() {
    try {
        console.log('Starting to fetch HVI data...');

        // Fetch both datasets in parallel using Promise.all
        // Use UHF42 geography with indicator 2418 (HVI for UHF42 neighborhoods)
        // Indicator 2191 uses CDTA2020 which doesn't have a matching geography file
        const [geoResponse, hviResponse] = await Promise.all([
            fetch('https://raw.githubusercontent.com/nychealth/EHDP-data/production/geography/UHF42.geojson'),
            fetch('https://raw.githubusercontent.com/nychealth/EHDP-data/production/indicators/data/2418.json')
        ]);

        console.log('Fetch complete, parsing JSON...');

        // Check for CORS or fetch errors
        if (!geoResponse.ok) {
            console.error('Geography fetch failed:', geoResponse.status, geoResponse.statusText);
            return null;
        }
        if (!hviResponse.ok) {
            console.error('HVI data fetch failed:', hviResponse.status, hviResponse.statusText);
            return null;
        }

        // Parse both responses in parallel
        const [geoData, hviData] = await Promise.all([
            geoResponse.json(),
            hviResponse.json()
        ]);

        console.log('JSON parsed successfully');

        // Debug: Log sample data to check types and structure
        console.log('Sample GeoJSON feature:', geoData.features[0]);
        console.log('Full HVI data structure:', hviData);
        console.log('Sample HVI GeoIDs:', hviData.GeoID.slice(0, 5));
        console.log('Sample HVI Values:', hviData.Value.slice(0, 5));
        console.log('GeoID types - GeoJSON:', typeof geoData.features[0].properties.GEOCODE, 'HVI:', typeof hviData.GeoID[0]);

        // Create a lookup map: GeoID -> Value
        // Force type casting to strings using .toString()
        const hviLookup = {};
        for (let i = 0; i < hviData.GeoID.length; i++) {
            const key = hviData.GeoID[i].toString();
            const value = hviData.Value[i];
            hviLookup[key] = value;
        }

        console.log('HVI Lookup created with', Object.keys(hviLookup).length, 'entries');

        // Join the data by matching GeoID
        // Try multiple property fields to find the right join key
        let matchCount = 0;
        let noMatchCount = 0;

        console.log('First 3 GeoJSON features IDs:', geoData.features.slice(0, 3).map(f => ({
            id: f.properties.id,
            GEOCODE: f.properties.GEOCODE,
            GEONAME: f.properties.GEONAME
        })));

        geoData.features.forEach((feature, index) => {
            // Try different property fields for matching
            const possibleKeys = [
                feature.properties.id,
                feature.properties.GEOCODE,
                feature.properties.GeoID,
                feature.id
            ];

            let hviValue = null;
            let matchedKey = null;

            for (const key of possibleKeys) {
                if (key !== undefined && key !== null) {
                    const keyStr = key.toString();
                    if (hviLookup[keyStr] !== undefined) {
                        hviValue = hviLookup[keyStr];
                        matchedKey = keyStr;
                        break;
                    }
                }
            }

            if (hviValue !== undefined && hviValue !== null) {
                feature.properties.hviValue = hviValue;
                matchCount++;
                if (index < 3) {
                    console.log(`Match ${index}: key=${matchedKey}, value=${hviValue}`);
                }
            } else {
                // Pink test: Set to -999 to indicate no match
                feature.properties.hviValue = -999;
                noMatchCount++;
                if (index < 5) {
                    console.log(`No match ${index}: tried keys`, possibleKeys.map(k => k?.toString()));
                }
            }
        });

        console.log(`Join complete: ${matchCount} matches, ${noMatchCount} no matches`);

        // Find min and max values for the color scale
        const validValues = geoData.features
            .map(f => f.properties.hviValue)
            .filter(v => v !== -999 && v !== null && v !== undefined);
        const minValue = Math.min(...validValues);
        const maxValue = Math.max(...validValues);
        console.log(`HVI value range: ${minValue} to ${maxValue}`);

        console.log('Sample joined feature:', geoData.features.find(f => f.properties.hviValue !== null && f.properties.hviValue !== -999));

        return geoData;
    } catch (error) {
        console.error('Error fetching HVI data:', error);
        return null;
    }
}

// Function to load HVI layer
async function loadHVILayer() {
    console.log('loadHVILayer called');

    const hviGeoJSON = await fetchAndJoinHVIData();

    if (!hviGeoJSON) {
        console.error('Failed to load HVI data');
        return;
    }

    if (!hviGeoJSON.features || hviGeoJSON.features.length === 0) {
        console.error('HVI GeoJSON has no features');
        return;
    }

    console.log('Adding HVI source with', hviGeoJSON.features.length, 'features');

    // Add HVI data source
    map.addSource('hvi-source', {
        type: 'geojson',
        data: hviGeoJSON
    });

    console.log('HVI source added successfully');

    // Add HVI fill layer with Magma color ramp
    // Magma color scheme: dark purple -> pink -> orange -> yellow (high contrast)
    // Insert at the top of the layer stack (no beforeId means it goes on top)
    // PINK TEST: Features with -999 (no match) will show as bright pink
    // Values range from ~400 to ~900, so we scale accordingly
    map.addLayer({
        id: layers.hviLayer,
        type: 'fill',
        source: 'hvi-source',
        paint: {
            'fill-color': [
                'case',
                ['==', ['get', 'hviValue'], -999], '#FF00FF',  // BRIGHT PINK for failed joins
                ['==', ['get', 'hviValue'], null], '#00FFFF',  // CYAN for null values
                [
                    'interpolate',
                    ['linear'],
                    ['get', 'hviValue'],
                    400, '#000004',   // Very dark purple (lowest vulnerability ~400)
                    500, '#3B0F70',   // Dark purple
                    600, '#8C2981',   // Purple-pink
                    700, '#DE4968',   // Pink-red
                    800, '#FE9F6D',   // Orange
                    900, '#FCFFA4'    // Yellow (highest vulnerability ~900)
                ]
            ],
            'fill-opacity': 0.85,  // Increased opacity to make colors more visible
            'fill-outline-color': '#ffffff'
        },
        layout: {
            visibility: 'none'
        }
    });

    console.log('HVI layer added with pink test enabled');

    // Add outline layer for better visibility
    map.addLayer({
        id: `${layers.hviLayer}-outline`,
        type: 'line',
        source: 'hvi-source',
        paint: {
            'line-color': '#ffffff',
            'line-width': 1,
            'line-opacity': 0.3
        },
        layout: {
            visibility: 'none'
        }
    });

    // Add hover interaction
    map.on('mouseenter', layers.hviLayer, () => {
        map.getCanvas().style.cursor = 'pointer';
    });

    map.on('mouseleave', layers.hviLayer, () => {
        map.getCanvas().style.cursor = '';
    });

    // Add click event to show neighborhood info
    map.on('click', layers.hviLayer, (e) => {
        console.log('HVI layer clicked!', e.features);
        if (!e.features || e.features.length === 0) {
            console.warn('No features found at click location');
            return;
        }

        const feature = e.features[0];
        const { GEONAME, BOROUGH, hviValue } = feature.properties;

        console.log('Clicked feature:', GEONAME, BOROUGH, hviValue);

        new mapboxgl.Popup()
            .setLngLat(e.lngLat)
            .setHTML(`
                <div style="font-family: sans-serif;">
                    <h3 style="margin: 0 0 8px 0; font-size: 14px; font-weight: bold;">${GEONAME}</h3>
                    <p style="margin: 0; font-size: 12px; color: #666;">${BOROUGH}</p>
                    <p style="margin: 8px 0 0 0; font-size: 12px;">
                        <strong>HVI Score:</strong> ${hviValue !== null && hviValue !== -999 ? hviValue.toFixed(2) : 'N/A'}
                    </p>
                </div>
            `)
            .addTo(map);
    });

    // Add a general click handler to debug
    map.on('click', (e) => {
        console.log('Map clicked at:', e.lngLat);
        const features = map.queryRenderedFeatures(e.point, { layers: [layers.hviLayer] });
        console.log('Features at click point:', features);
    });

    console.log('HVI layers and interactions configured');
    console.log('Layer visibility:', map.getLayoutProperty(layers.hviLayer, 'visibility'));
    console.log('Layer paint properties:', map.getPaintProperty(layers.hviLayer, 'fill-color'));

    hviDataLoaded = true;
    console.log('HVI data loaded successfully - hviDataLoaded set to true');
}

// Function to fetch and process Park Access data with hexbins
async function fetchAndProcessParkAccessData() {
    try {
        console.log('Starting to fetch Park Access data...');

        // Fetch both NTA geography and Park Access indicator data
        // Using indicator 2138 which is Access to Parks for NTA neighborhoods
        const [ntaResponse, parkResponse] = await Promise.all([
            fetch('https://raw.githubusercontent.com/nychealth/EHDP-data/production/geography/NTA.geojson'),
            fetch('https://raw.githubusercontent.com/nychealth/EHDP-data/production/indicators/data/2138.json')
        ]);

        console.log('Fetch complete, parsing JSON...');

        if (!ntaResponse.ok || !parkResponse.ok) {
            console.error('Failed to fetch data');
            return null;
        }

        const [ntaData, parkData] = await Promise.all([
            ntaResponse.json(),
            parkResponse.json()
        ]);

        console.log('Park Access data structure:', parkData);
        console.log('NTA features:', ntaData.features.length);

        // Find the most recent year in the data
        const uniqueYears = [...new Set(parkData.TimePeriodID)];
        const latestYear = Math.max(...uniqueYears);
        console.log('Latest year:', latestYear);

        // Create lookup map for park access (filtered by latest year)
        const parkLookup = {};
        for (let i = 0; i < parkData.GeoID.length; i++) {
            if (parkData.TimePeriodID[i] === latestYear) {
                const geoId = parkData.GeoID[i].toString();
                parkLookup[geoId] = {
                    percentage: parkData.Value[i],
                    year: latestYear
                };
            }
        }

        console.log('Park Access lookup created with', Object.keys(parkLookup).length, 'entries');

        // Join park access data to NTA features
        let matchCount = 0;
        let noMatchCount = 0;

        ntaData.features.forEach(feature => {
            const ntaCode = feature.properties.NTACode?.toString() || feature.properties.GEOCODE?.toString() || feature.properties.id?.toString();
            const parkInfo = parkLookup[ntaCode];

            if (parkInfo && parkInfo.percentage !== null && parkInfo.percentage !== undefined) {
                feature.properties.parkAccess = parkInfo.percentage;
                feature.properties.parkYear = parkInfo.year;
                matchCount++;
            } else {
                feature.properties.parkAccess = null;
                feature.properties.parkYear = null;
                noMatchCount++;
            }
        });

        console.log(`Park Access join: ${matchCount} matches, ${noMatchCount} no matches`);

        // Find bounding box for NYC
        const bbox = turf.bbox(ntaData);
        console.log('NYC Bounding Box:', bbox);

        // Create hexgrid (500m = 0.5km resolution)
        const cellSide = 0.5; // 500 meters
        const options = { units: 'kilometers' };
        const hexgrid = turf.hexGrid(bbox, cellSide, options);

        console.log('Hexgrid created with', hexgrid.features.length, 'hexagons');

        // Assign park access to hexagons based on which NTA they fall within
        const hexagonsWithData = [];

        hexgrid.features.forEach(hex => {
            const hexCenter = turf.centroid(hex);

            // Find which NTA this hex center falls within
            for (const nta of ntaData.features) {
                if (turf.booleanPointInPolygon(hexCenter, nta)) {
                    if (nta.properties.parkAccess !== null) {
                        hex.properties = {
                            parkAccess: nta.properties.parkAccess,
                            parkYear: nta.properties.parkYear,
                            ntaName: nta.properties.NTAName || nta.properties.GEONAME || nta.properties.name,
                            ntaCode: nta.properties.NTACode || nta.properties.GEOCODE || nta.properties.id
                        };
                        hexagonsWithData.push(hex);
                    }
                    break;
                }
            }
        });

        console.log('Hexagons with park data:', hexagonsWithData.length);

        // Find min/max park access for scaling
        const values = hexagonsWithData.map(h => h.properties.parkAccess);
        const minValue = Math.min(...values);
        const maxValue = Math.max(...values);
        console.log(`Park Access range: ${minValue}% to ${maxValue}%`);

        return {
            type: 'FeatureCollection',
            features: hexagonsWithData
        };
    } catch (error) {
        console.error('Error processing park access data:', error);
        return null;
    }
}

// Function to load 3D Park Access Hexbin layer
async function loadParkAccessHexbinLayer() {
    console.log('loadParkAccessHexbinLayer called');

    const hexbinData = await fetchAndProcessParkAccessData();

    if (!hexbinData || hexbinData.features.length === 0) {
        console.error('Failed to load park access hexbin data');
        parkAccessDataLoaded = false;
        return;
    }

    console.log('Adding park access hexbin source with', hexbinData.features.length, 'hexagons');
    console.log('Sample park access feature:', hexbinData.features[0]?.properties);

    // Add hexbin data source
    map.addSource('park-access-hexbins', {
        type: 'geojson',
        data: hexbinData
    });

    // Add 2D fill layer showing park access debt
    // Lower park access = More intense colors (showing "green space debt")
    map.addLayer({
        id: layers.parkAccessHexbins,
        type: 'fill',
        source: 'park-access-hexbins',
        paint: {
            // Color gradient: Deep Green (High Access) to Bright Neon Orange/Pink (Low Access)
            'fill-color': [
                'interpolate',
                ['linear'],
                ['get', 'parkAccess'],
                0, '#FF1493',      // Hot pink/magenta (0% - worst access)
                20, '#FF4500',     // Orange-red (very low)
                40, '#FFA500',     // Orange (low)
                60, '#FFD700',     // Gold (medium-low)
                80, '#90EE90',     // Light green (good)
                100, '#228B22'     // Deep green (100% - best access)
            ],
            // Inverted opacity: Low access = high opacity (0.9), High access = low opacity (0.2)
            'fill-opacity': [
                'interpolate',
                ['linear'],
                ['get', 'parkAccess'],
                0, 0.9,    // 0% access = 0.9 opacity (high debt, more visible)
                100, 0.2   // 100% access = 0.2 opacity (low debt, fades into basemap)
            ]
        },
        layout: {
            visibility: 'none'
        }
    });

    // Add stroke layer for grid feel
    map.addLayer({
        id: `${layers.parkAccessHexbins}-stroke`,
        type: 'line',
        source: 'park-access-hexbins',
        paint: {
            'line-color': '#333333',  // Dark color for grid feel
            'line-width': 0.5,
            'line-opacity': 0.3
        },
        layout: {
            visibility: 'none'
        }
    });

    console.log('2D Park Access hexbin layer added');

    // Add hover interaction with glassmorphism popup
    let popup = null;

    map.on('mouseenter', layers.parkAccessHexbins, () => {
        map.getCanvas().style.cursor = 'pointer';
    });

    map.on('mouseleave', layers.parkAccessHexbins, () => {
        map.getCanvas().style.cursor = '';
        if (popup) {
            popup.remove();
            popup = null;
        }
    });

    map.on('mousemove', layers.parkAccessHexbins, (e) => {
        if (e.features.length > 0) {
            const feature = e.features[0];
            const { ntaName, parkAccess, parkYear } = feature.properties;

            if (popup) popup.remove();

            popup = new mapboxgl.Popup({
                closeButton: false,
                closeOnClick: false,
                offset: 15
            })
                .setLngLat(e.lngLat)
                .setHTML(`
                    <div style="
                        font-family: sans-serif;
                        background: rgba(255, 255, 255, 0.85);
                        backdrop-filter: blur(20px);
                        border-radius: 12px;
                        padding: 12px 16px;
                        border: 1px solid rgba(255, 255, 255, 0.3);
                        box-shadow: 0 8px 32px rgba(0, 0, 0, 0.1);
                    ">
                        <h3 style="margin: 0 0 8px 0; font-size: 13px; font-weight: bold; color: #333;">
                            ${ntaName}
                        </h3>
                        <p style="margin: 0; font-size: 12px; color: ${parkAccess < 50 ? '#FF1493' : '#228B22'}; font-weight: 600;">
                            ${ntaName}: Only ${parkAccess ? parkAccess.toFixed(1) : 'N/A'}% of residents can walk to a park.
                        </p>
                        <p style="margin: 4px 0 0 0; font-size: 11px; color: #888;">
                            Year: ${parkYear}
                        </p>
                    </div>
                `)
                .addTo(map);
        }
    });

    parkAccessDataLoaded = true;
    console.log('Park Access hexbin data loaded successfully');
}

// Function to fetch and process Asthma data with hexbins
async function fetchAndProcessAsthmaData() {
    try {
        console.log('Starting to fetch Asthma data...');

        // Fetch both UHF42 geography and Asthma indicator data
        // Using indicator 2417 which is Childhood Asthma (5-17) for UHF42 neighborhoods
        const [ntaResponse, asthmaResponse] = await Promise.all([
            fetch('https://raw.githubusercontent.com/nychealth/EHDP-data/production/geography/UHF42.geojson'),
            fetch('https://raw.githubusercontent.com/nychealth/EHDP-data/production/indicators/data/2417.json')
        ]);

        console.log('Fetch complete, parsing JSON...');

        if (!ntaResponse.ok || !asthmaResponse.ok) {
            console.error('Failed to fetch data');
            return null;
        }

        const [ntaData, asthmaData] = await Promise.all([
            ntaResponse.json(),
            asthmaResponse.json()
        ]);

        console.log('Asthma data structure:', asthmaData);
        console.log('NTA features:', ntaData.features.length);

        // Find the most recent year in the data
        const uniqueYears = [...new Set(asthmaData.TimePeriodID)];
        const latestYear = Math.max(...uniqueYears);
        console.log('Latest year:', latestYear);

        // Create lookup map for asthma rates (filtered by latest year)
        const asthmaLookup = {};
        for (let i = 0; i < asthmaData.GeoID.length; i++) {
            if (asthmaData.TimePeriodID[i] === latestYear) {
                const geoId = asthmaData.GeoID[i].toString();
                asthmaLookup[geoId] = {
                    rate: asthmaData.Value[i],
                    year: latestYear
                };
            }
        }

        console.log('Asthma lookup created with', Object.keys(asthmaLookup).length, 'entries');

        // Join asthma data to UHF42 features
        ntaData.features.forEach(feature => {
            const geoCode = feature.properties.GEOCODE || feature.properties.id;
            const asthmaInfo = asthmaLookup[geoCode];

            if (asthmaInfo) {
                feature.properties.asthmaRate = asthmaInfo.rate;
                feature.properties.asthmaYear = asthmaInfo.year;
            } else {
                feature.properties.asthmaRate = null;
                feature.properties.asthmaYear = null;
            }
        });

        // Find bounding box for NYC
        const bbox = turf.bbox(ntaData);
        console.log('NYC Bounding Box:', bbox);

        // Create hexgrid (500m = 0.5km resolution)
        const cellSide = 0.5; // 500 meters
        const options = { units: 'kilometers' };
        const hexgrid = turf.hexGrid(bbox, cellSide, options);

        console.log('Hexgrid created with', hexgrid.features.length, 'hexagons');

        // Assign asthma rates to hexagons based on which NTA they fall within
        const hexagonsWithData = [];

        hexgrid.features.forEach(hex => {
            const hexCenter = turf.centroid(hex);

            // Find which NTA this hex center falls within
            for (const nta of ntaData.features) {
                if (turf.booleanPointInPolygon(hexCenter, nta)) {
                    if (nta.properties.asthmaRate !== null) {
                        hex.properties = {
                            asthmaRate: nta.properties.asthmaRate,
                            asthmaYear: nta.properties.asthmaYear,
                            ntaName: nta.properties.GEONAME || nta.properties.name,
                            ntaCode: nta.properties.GEOCODE || nta.properties.id
                        };
                        hexagonsWithData.push(hex);
                    }
                    break;
                }
            }
        });

        console.log('Hexagons with data:', hexagonsWithData.length);

        // Find min/max asthma rates for scaling
        const rates = hexagonsWithData.map(h => h.properties.asthmaRate);
        const minRate = Math.min(...rates);
        const maxRate = Math.max(...rates);
        console.log(`Asthma rate range: ${minRate} to ${maxRate}`);

        return {
            type: 'FeatureCollection',
            features: hexagonsWithData
        };
    } catch (error) {
        console.error('Error processing asthma data:', error);
        return null;
    }
}

// Function to load 3D Asthma Hexbin layer
async function loadAsthmaHexbinLayer() {
    console.log('loadAsthmaHexbinLayer called');

    const hexbinData = await fetchAndProcessAsthmaData();

    if (!hexbinData || hexbinData.features.length === 0) {
        console.error('Failed to load asthma hexbin data');
        return;
    }

    console.log('Adding asthma hexbin source with', hexbinData.features.length, 'hexagons');

    // Find max rate for scaling
    const rates = hexbinData.features.map(h => h.properties.asthmaRate);
    const maxRate = Math.max(...rates);

    // Add hexbin data source
    map.addSource('asthma-hexbins', {
        type: 'geojson',
        data: hexbinData
    });

    // Add 3D fill-extrusion layer with Magma color ramp
    map.addLayer({
        id: layers.asthmaHexbins,
        type: 'fill-extrusion',
        source: 'asthma-hexbins',
        paint: {
            // Height based on asthma rate (0 to 2000m scale)
            'fill-extrusion-height': [
                'interpolate',
                ['linear'],
                ['get', 'asthmaRate'],
                0, 0,
                maxRate, 2000
            ],
            'fill-extrusion-base': 0,

            // Magma color ramp: dark purple to bright yellow
            'fill-extrusion-color': [
                'interpolate',
                ['linear'],
                ['get', 'asthmaRate'],
                0, '#000004',      // Dark purple (low)
                maxRate * 0.2, '#3B0F70',  // Dark purple
                maxRate * 0.4, '#8C2981',  // Purple-pink
                maxRate * 0.6, '#DE4968',  // Pink-red
                maxRate * 0.8, '#FE9F6D',  // Orange
                maxRate, '#FCFFA4'         // Bright yellow (high)
            ],

            'fill-extrusion-opacity': 0.85
        },
        layout: {
            visibility: 'none'
        }
    });

    console.log('3D Asthma hexbin layer added');

    // Add hover interaction with glassmorphism popup
    let popup = null;

    map.on('mouseenter', layers.asthmaHexbins, () => {
        map.getCanvas().style.cursor = 'pointer';
    });

    map.on('mouseleave', layers.asthmaHexbins, () => {
        map.getCanvas().style.cursor = '';
        if (popup) {
            popup.remove();
            popup = null;
        }
    });

    map.on('mousemove', layers.asthmaHexbins, (e) => {
        if (e.features.length > 0) {
            const feature = e.features[0];
            const { ntaName, asthmaRate, asthmaYear } = feature.properties;

            if (popup) popup.remove();

            popup = new mapboxgl.Popup({
                closeButton: false,
                closeOnClick: false,
                offset: 15
            })
                .setLngLat(e.lngLat)
                .setHTML(`
                    <div style="
                        font-family: sans-serif;
                        background: rgba(255, 255, 255, 0.85);
                        backdrop-filter: blur(20px);
                        border-radius: 12px;
                        padding: 12px 16px;
                        border: 1px solid rgba(255, 255, 255, 0.3);
                        box-shadow: 0 8px 32px rgba(0, 0, 0, 0.1);
                    ">
                        <h3 style="margin: 0 0 8px 0; font-size: 13px; font-weight: bold; color: #333;">
                            ${ntaName}
                        </h3>
                        <p style="margin: 0; font-size: 12px; color: #666;">
                            <strong>Asthma Rate (Age 5-17):</strong> ${asthmaRate ? asthmaRate.toFixed(0) : 'N/A'} per 100k
                        </p>
                        <p style="margin: 4px 0 0 0; font-size: 11px; color: #888;">
                            Year: ${asthmaYear}
                        </p>
                    </div>
                `)
                .addTo(map);
        }
    });

    asthmaDataLoaded = true;
    console.log('Asthma hexbin data loaded successfully');
}

// Wait for the map to load
map.on('load', async () => {
    // Add initial data sources and layers (await to ensure traffic data is preloaded)
    await initializeMapLayers();

    // Load HVI data
    loadHVILayer();

    // Load Park Access hexbin data
    loadParkAccessHexbinLayer();

    // Load Asthma hexbin data
    loadAsthmaHexbinLayer();

    // Initialize Scrollama after map and layers are loaded
    scroller = scrollama();
    
    // Set up scrollama
    scroller
        .setup({
            step: '.step',
            offset: 0.5,
            progress: true,
            debug: false
        })
        .onStepEnter(handleStepEnter)
        .onStepExit(handleStepExit);
        
    // Track hero section visibility
    const heroSection = document.querySelector('.relative.h-screen');
    const observer = new IntersectionObserver((entries) => {
        isInHeroSection = entries[0].isIntersecting;
        if (isInHeroSection && animationFrame === undefined) {
            // Restart animation when returning to hero section
            animationFrame = requestAnimationFrame(animateDots);
        }
    }, {
        threshold: 0.5
    });
    
    if (heroSection) {
        observer.observe(heroSection);
    }

    // Setup resize event
    window.addEventListener('resize', scroller.resize);
    
    // Set up slider interaction
    setupSliderInteraction();
    
    // Force a resize to ensure proper calculation
    setTimeout(() => {
        scroller.resize();
    }, 100);
});

// Function to convert traffic volume point data to lines
function convertTrafficPointsToLines(pointData) {
    // Group points by SegmentID
    const segments = {};
    pointData.features.forEach(feature => {
        const segmentId = feature.properties.SegmentID;
        if (!segments[segmentId]) {
            segments[segmentId] = [];
        }
        segments[segmentId].push({
            coordinates: feature.geometry.coordinates,
            traffic: feature.properties.Total_Traffic
        });
    });

    // Create LineString features from grouped points
    const lineFeatures = [];
    Object.keys(segments).forEach(segmentId => {
        const points = segments[segmentId];
        if (points.length > 1) {
            // Sort points by longitude to create a line (simple approach)
            points.sort((a, b) => a.coordinates[0] - b.coordinates[0]);
            
            // Calculate average traffic for this segment
            const avgTraffic = points.reduce((sum, p) => sum + (p.traffic || 0), 0) / points.length;
            
            lineFeatures.push({
                type: 'Feature',
                properties: {
                    SegmentID: segmentId,
                    Total_Traffic: avgTraffic
                },
                geometry: {
                    type: 'LineString',
                    coordinates: points.map(p => p.coordinates)
                }
            });
        }
    });

    return {
        type: 'FeatureCollection',
        features: lineFeatures
    };
}

async function initializeMapLayers() {
    // Preload traffic volume data for faster rendering
    console.log('Preloading traffic heatmap data...');

    try {
        const trafficResponse = await fetch('./data/Geojson/traffic_volumenyc.geojson');
        const trafficData = await trafficResponse.json();
        console.log('Traffic data loaded:', trafficData.features.length, 'features');

        // Add traffic volume heatmap source with preloaded data
        map.addSource('traffic-volume', {
            type: 'geojson',
            data: trafficData
        });

        // Add heatmap layer
        map.addLayer({
            id: 'traffic-heatmap',
            type: 'heatmap',
            source: 'traffic-volume',
            maxzoom: 15,
            paint: {
                'heatmap-weight': [
                    'interpolate',
                    ['linear'],
                    ['get', 'Vol'],
                    0, 0,
                    100, 0.1,    // Start showing at lower values
                    500, 0.3,    // More visible at medium traffic
                    2000, 0.6,   // Stronger for higher traffic
                    5000, 0.9,   // Very strong for heavy traffic
                    10000, 1.2,  // Extra weight for very heavy traffic
                    20000, 1.5   // Maximum weight for extreme traffic
                ],
                'heatmap-radius': [
                    'interpolate',
                    ['linear'],
                    ['zoom'],
                    0, 2,
                    9, 4,
                    11, 8,
                    13, 12,
                    15, 16
                ],
                'heatmap-color': [
                    'interpolate',
                    ['linear'],
                    ['heatmap-density'],
                    0, 'rgba(0, 0, 0, 0)',
                    0.1, 'rgba(255, 0, 0, 0.6)',         // Red - low traffic
                    0.3, 'rgba(255, 100, 0, 0.8)',       // Orange-red - medium traffic
                    0.5, 'rgba(255, 200, 0, 0.9)',       // Orange-yellow - high traffic
                    0.7, 'rgba(255, 255, 0, 1)',         // Bright yellow - very high traffic
                    0.9, 'rgba(255, 255, 200, 1)',       // Bright yellow-white - extreme traffic
                    1, 'rgba(255, 255, 255, 1)'          // White - maximum traffic
                ],
                'heatmap-intensity': [
                    'interpolate',
                    ['exponential', 1.5],
                    ['zoom'],
                    0, 1,
                    15, 5
                ],
                'heatmap-opacity': 0.85
            },
            layout: {
                visibility: 'none'  // Start hidden, show on scroll step 1
            }
        }, 'waterway-label');

        console.log('Traffic heatmap layer added and ready');
    } catch (error) {
        console.error('Error loading traffic data:', error);
    }

    // Load traffic_volume.geojson for step 2 overlay (glowing line layer)
    try {
        console.log('Loading traffic_volume.geojson for glowing line overlay...');
        const trafficVolumeResponse = await fetch('./data/Geojson/traffic_volume.geojson');
        const trafficVolumeData = await trafficVolumeResponse.json();
        console.log('Traffic volume data loaded:', trafficVolumeData.features.length, 'points');

        // Convert points to lines
        const trafficLines = convertTrafficPointsToLines(trafficVolumeData);
        console.log('Converted to', trafficLines.features.length, 'line segments');

        // Add traffic volume line source
        map.addSource('traffic-volume-lines', {
            type: 'geojson',
            data: trafficLines
        });

        // Add glowing line layer with neon heat effect
        map.addLayer({
            id: 'traffic-volume-lines',
            type: 'line',
            source: 'traffic-volume-lines',
            paint: {
                'line-color': '#FF1493',  // Bright neon pink/magenta
                'line-width': [
                    'interpolate',
                    ['linear'],
                    ['zoom'],
                    10, 2,
                    13, 4,
                    15, 6
                ],
                'line-opacity': 0.9,
                'line-blur': [
                    'interpolate',
                    ['linear'],
                    ['zoom'],
                    10, 1,
                    13, 2,
                    15, 4
                ]
            },
            layout: {
                'line-join': 'round',
                'line-cap': 'round',
                visibility: 'none'  // Start hidden, show on step 2
            }
        });

        console.log('Traffic volume glowing line layer added');
    } catch (error) {
        console.error('Error loading traffic volume line data:', error);
    }
    // Add truck routes source
    map.addSource('truck-routes', {
        type: 'geojson',
        data: './data/Geojson/truck_routesnyc.geojson'
    });

    // Add truck routes layer with orange dotted line style
    map.addLayer({
        id: 'truck-routes-layer',
        type: 'line',
        source: 'truck-routes',
        layout: {
            'line-join': 'round',
            'line-cap': 'round',
            'visibility': 'none' // Hidden by default
        },
        paint: {
            'line-color': '#FFA500', // Orange color
            'line-width': 2,
            'line-opacity': 0.8,
            'line-dasharray': [1, 2], // Dotted line
            'line-offset': 0
        }
    });

    // Add arterial roads source
    map.addSource('arterial-roads', {
        type: 'geojson',
        data: './data/Geojson/arterial.geojson'
    });
    
    // Add arterial roads base layer with dark blood red color
    map.addLayer({
        id: layers.arterialRoads,
        type: 'line',
        source: 'arterial-roads',
        paint: {
            'line-color': '#8B0000', // Dark blood red
            'line-width': 2,
            'line-opacity': 0.8
        }
    });
    
    // Add dot layer for animation
    map.addLayer({
        id: layers.arterialDots,
        type: 'circle',
        source: 'arterial-roads',
        paint: {
            'circle-radius': [
                'interpolate',
                ['linear'],
                ['zoom'],
                10, 2,
                16, 3
            ],
            'circle-color': '#FF0000', // Bright red for visibility
            'circle-opacity': 0,
            'circle-blur': 1
        }
    });
    
    // Generate points along the line for dot animation
    function generatePointsAlongLine() {
        const features = [];
        const source = map.getSource('arterial-roads');
        
        if (source && source._data && source._data.features) {
            source._data.features.forEach(feature => {
                if (feature.geometry.type === 'LineString') {
                    const coordinates = feature.geometry.coordinates;
                    for (let i = 0; i < coordinates.length - 1; i++) {
                        features.push({
                            type: 'Feature',
                            geometry: {
                                type: 'Point',
                                coordinates: coordinates[i]
                            },
                            properties: {
                                progress: i / (coordinates.length - 1)
                            }
                        });
                    }
                }
            });
        }
        
        return {
            type: 'FeatureCollection',
            features: features
        };
    }
    
    // Add source for animated dots
    map.addSource('arterial-dots-source', {
        type: 'geojson',
        data: {
            type: 'FeatureCollection',
            features: []
        }
    });
    
    // Update dot layer with generated points
    const pointsData = generatePointsAlongLine();
    map.getSource('arterial-dots-source').setData(pointsData);
    
    // Animate the dots
    let animationFrame;
    let animationStart;
    const animationDuration = 4000; // 4 seconds for one full cycle
    
    function animateDots(timestamp) {
        if (!animationStart) animationStart = timestamp;
        const elapsed = timestamp - animationStart;
        const progress = (elapsed % animationDuration) / animationDuration;
        
        if (isInHeroSection) {
            // Ensure values are in ascending order
            const start = Math.max(0, progress - 0.2);
            const mid = progress;
            const end = Math.min(1, progress + 0.2);
            
            map.setPaintProperty(layers.arterialDots, 'circle-opacity', [
                'step',
                ['get', 'progress'],
                0,
                start, 0,
                mid, 0.9,
                end, 0
            ]);
            
            // Add glow effect
            map.setPaintProperty(layers.arterialDots, 'circle-radius', [
                'step',
                ['get', 'progress'],
                0,
                start, 0,
                mid, 5,
                end, 0
            ]);
            
            animationFrame = requestAnimationFrame(animateDots);
        } else {
            // Hide dots when not in hero section
            map.setPaintProperty(layers.arterialDots, 'circle-opacity', 0);
        }
    }
    
    // Start the dot animation
    animationFrame = requestAnimationFrame(animateDots);
    
    // Update animation when map moves
    map.on('move', () => {
        if (isInHeroSection) {
            const pointsData = generatePointsAlongLine();
            map.getSource('arterial-dots-source').setData(pointsData);
        }
    });

    // Add GeoJSON data source (replace with your actual data)
    map.addSource('master-data', {
        type: 'geojson',
        data: {
            type: 'FeatureCollection',
            features: []
        }
    });

    // Freight Routes (line)
    map.addLayer({
        id: layers.freightRoutes,
        type: 'line',
        source: 'master-data',
        paint: {
            'line-color': '#ff0000',
            'line-width': 3,
            'line-opacity': 0
        },
        filter: ['==', '$type', 'LineString']
    });

    // Impervious Surfaces (fill)
    map.addLayer({
        id: layers.imperviousSurfaces,
        type: 'fill',
        source: 'master-data',
        paint: {
            'fill-color': '#555555',
            'fill-opacity': 0.5
        },
        filter: ['==', 'type', 'impervious'],
        layout: {
            visibility: 'none'
        }
    });

    // Note: asthma-hexbins layer is now loaded dynamically via loadAsthmaHexbinLayer()

    // Priority Zone (fill + line)
    map.addLayer({
        id: layers.priorityZone,
        type: 'fill',
        source: 'master-data',
        paint: {
            'fill-color': '#ffffff',
            'fill-opacity': 0.1
        },
        filter: ['==', 'type', 'priority-zone'],
        layout: {
            visibility: 'none'
        }
    });

    map.addLayer({
        id: `${layers.priorityZone}-outline`,
        type: 'line',
        source: 'master-data',
        paint: {
            'line-color': '#ffffff',
            'line-width': 3,
            'line-opacity': 0,
            'line-dasharray': [2, 2]
        },
        filter: ['==', 'type', 'priority-zone']
    });

    // Schools (circle)
    map.addLayer({
        id: layers.schools,
        type: 'circle',
        source: 'master-data',
        paint: {
            'circle-radius': 8,
            'circle-color': '#4d4dff',
            'circle-opacity': 0,
            'circle-stroke-width': 2,
            'circle-stroke-color': '#ffffff'
        },
        filter: ['==', 'type', 'school']
    });

    // Hospitals (circle)
    map.addLayer({
        id: layers.hospitals,
        type: 'circle',
        source: 'master-data',
        paint: {
            'circle-radius': 10,
            'circle-color': '#ff4d4d',
            'circle-opacity': 0,
            'circle-stroke-width': 2,
            'circle-stroke-color': '#ffffff'
        },
        filter: ['==', 'type', 'hospital']
    });
}

function handleStepEnter(response) {
    const step = parseInt(response.element.dataset.step);
    
    // Hide all layers first
    Object.values(layers).forEach(layer => {
        const layout = map.getLayoutProperty(layer, 'visibility');
        if (layout) {
            map.setLayoutProperty(layer, 'visibility', 'none');
        }
        // Also hide stroke layers
        try {
            map.setLayoutProperty(`${layer}-stroke`, 'visibility', 'none');
        } catch (e) {
            // Stroke layer might not exist
        }
    });
    
    // Hide heatmap by default
    map.setLayoutProperty('traffic-heatmap', 'visibility', 'none');
    
    // Hide traffic volume lines by default
    try {
        map.setLayoutProperty('traffic-volume-lines', 'visibility', 'none');
    } catch (e) {
        // Layer might not exist yet
    }
    
    // Reset map view if needed (step 2 is 2D, so pitch should be 0)
    if (map.getPitch() > 0) {
        map.easeTo({ pitch: 0, duration: 1000 });
    }
    
    // Hide truck routes by default in all steps
    map.setLayoutProperty('truck-routes-layer', 'visibility', 'none');
    
    switch(step) {
        case 1:
            // Show freight routes, truck routes, and traffic heatmap
            map.setLayoutProperty(layers.freightRoutes, 'visibility', 'visible');
            map.setPaintProperty(layers.freightRoutes, 'line-opacity', 1);
            map.setLayoutProperty('truck-routes-layer', 'visibility', 'visible');
            map.setLayoutProperty('traffic-heatmap', 'visibility', 'visible');
            
            // Fly to the full stretch of Cross Bronx Expressway
            map.flyTo({
                center: [-73.8965, 40.8370], // Center of the Bronx
                zoom: 11,
                duration: 2000
            });
            break;
            
        case 2:
            // Show park access hexbins (2D) with traffic overlay to visualize urban severance
            if (parkAccessDataLoaded) {
                map.setLayoutProperty(layers.parkAccessHexbins, 'visibility', 'visible');
                map.setLayoutProperty(`${layers.parkAccessHexbins}-stroke`, 'visibility', 'visible');

                // Move hexbins below traffic to show how highways create no-access zones
                try {
                    // Ensure traffic line layer is on top
                    map.moveLayer('traffic-volume-lines');
                } catch (e) {
                    console.error('Error reordering layers:', e);
                }
            }

            // Show traffic volume as glowing line overlay showing the barrier (the incision)
            map.setLayoutProperty('traffic-volume-lines', 'visibility', 'visible');

            // Fly to Soundview, Bronx (2D view, no pitch needed)
            map.flyTo({
                center: [-73.8667, 40.8250], // Soundview, Bronx
                zoom: 13,
                pitch: 0,  // 2D view
                duration: 2000
            });
            break;
            
        case 3:
            // Show asthma hexbins, schools, and hospitals
            map.setLayoutProperty(layers.asthmaHexbins, 'visibility', 'visible');
            map.setLayoutProperty(layers.schools, 'visibility', 'visible');
            map.setLayoutProperty(layers.hospitals, 'visibility', 'visible');

            // Animate opacity for schools and hospitals
            map.setPaintProperty(layers.schools, 'circle-opacity', 1);
            map.setPaintProperty(layers.hospitals, 'circle-opacity', 1);

            // Keep the same view as step 2
            break;
            
        case 4:
            // Show priority zone
            map.setLayoutProperty(layers.priorityZone, 'visibility', 'visible');
            map.setLayoutProperty(`${layers.priorityZone}-outline`, 'visibility', 'visible');

            // Animate the priority zone outline
            map.setPaintProperty(`${layers.priorityZone}-outline`, 'line-opacity', 1);

            // Show HVI layer if data is loaded
            console.log('Step 4 - hviDataLoaded:', hviDataLoaded);
            if (hviDataLoaded) {
                console.log('Making HVI layer visible');
                map.setLayoutProperty(layers.hviLayer, 'visibility', 'visible');
                map.setLayoutProperty(`${layers.hviLayer}-outline`, 'visibility', 'visible');

                // Move HVI layer to the top of the layer stack so it's clickable
                try {
                    map.moveLayer(layers.hviLayer);
                    map.moveLayer(`${layers.hviLayer}-outline`);
                    console.log('HVI layers moved to top of layer stack');
                } catch (e) {
                    console.error('Error moving HVI layers:', e);
                }

                console.log('HVI layer visibility after change:', map.getLayoutProperty(layers.hviLayer, 'visibility'));

                // Debug: Check if source has data
                const source = map.getSource('hvi-source');
                if (source) {
                    console.log('HVI source exists');
                } else {
                    console.error('HVI source NOT found!');
                }
            } else {
                console.warn('HVI data not loaded yet, cannot show layer');
            }

            // Zoom into the Bronx to show HVI data
            map.flyTo({
                center: [-73.9, 40.85], // Bronx center
                zoom: 11,
                pitch: 0,
                duration: 1500
            });
            break;

        case 5:
            // Show 3D asthma hexbins with traffic correlation
            if (asthmaDataLoaded) {
                map.setLayoutProperty(layers.asthmaHexbins, 'visibility', 'visible');

                // Move hexbins below traffic to show correlation
                try {
                    // Ensure traffic heatmap is on top
                    map.moveLayer('traffic-heatmap');
                } catch (e) {
                    console.error('Error reordering layers:', e);
                }
            }

            // Show traffic heatmap with bright neon red glow
            map.setLayoutProperty('traffic-heatmap', 'visibility', 'visible');

            // Enhance traffic heatmap for bright neon red glow
            map.setPaintProperty('traffic-heatmap', 'heatmap-color', [
                'interpolate',
                ['linear'],
                ['heatmap-density'],
                0, 'rgba(0, 0, 0, 0)',
                0.1, 'rgba(255, 0, 0, 0.8)',      // Bright red
                0.3, 'rgba(255, 50, 0, 0.9)',     // Neon red-orange
                0.5, 'rgba(255, 100, 0, 1)',      // Bright orange-red
                0.7, 'rgba(255, 150, 0, 1)',      // Intense orange
                0.9, 'rgba(255, 200, 100, 1)',    // Glowing yellow-orange
                1, 'rgba(255, 255, 255, 1)'       // White hot
            ]);

            map.setPaintProperty('traffic-heatmap', 'heatmap-intensity', 1.5);

            // Show schools and hospitals
            map.setLayoutProperty(layers.schools, 'visibility', 'visible');
            map.setLayoutProperty(layers.hospitals, 'visibility', 'visible');
            map.setPaintProperty(layers.schools, 'circle-opacity', 1);
            map.setPaintProperty(layers.hospitals, 'circle-opacity', 1);

            // Enable 3D view with pitch for dramatic hexbin visualization
            map.flyTo({
                center: [-73.8667, 40.8250], // Soundview, Bronx
                zoom: 12,
                pitch: 60,  // 60 degree angle to see 3D hexbins
                bearing: 0,
                duration: 1500
            });

            break;
    }
}

function handleStepExit(response) {
    // You can add exit animations or cleanup here if needed
}

function setupSliderInteraction() {
    const slider = document.getElementById('freightTax');
    const taxValue = document.getElementById('taxValue');
    const healthOutcome = document.querySelector('#healthOutcome span');
    
    if (!slider || !taxValue || !healthOutcome) return;
    
    slider.addEventListener('input', (e) => {
        const value = parseInt(e.target.value);
        taxValue.textContent = value;
        
        // Update freight routes opacity based on tax value
        const opacity = value / 100;
        map.setPaintProperty(layers.freightRoutes, 'line-opacity', 0.3 + (opacity * 0.7));
        
        // Update asthma hexbin colors based on tax value
        map.setPaintProperty(layers.asthmaHexbins, 'fill-extrusion-opacity', 0.3 + (0.5 * (1 - opacity)));
        
        // Calculate and update health outcome (simplified)
        const healthImprovement = Math.round(value * 12500); // $12.5k per $1/ton (example)
        healthOutcome.textContent = (healthImprovement / 1000000).toFixed(1);
    });
}

// Handle window resize
window.addEventListener('resize', () => {
    if (scroller && typeof scroller.resize === 'function') {
        scroller.resize();
    }
});
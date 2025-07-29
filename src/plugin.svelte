<div class="plugin__mobile-header">
    {title}
</div>

<section class="plugin__content">
    <div
        class="plugin__title plugin__title--chevron-back"
        on:click={() => bcast.emit('rqstOpen', 'menu')}
    >
        {title}
    </div>

    <p><b>SIGMETs</b></p>
    <label class="toggle-switch">
        <input
            type="checkbox"
            bind:checked={sigmetVisible}
            on:change={handleCheckboxChangeSigmet}
        />
        <span class="slider"></span>
        <span class="label-text">{sigmetVisible ? 'Masquer le Sigmet' : 'Afficher le Sigmet'}</span>
    </label>
    <br /><br /><br />

    <p><b>FIR</b></p>
    <label class="toggle-switch">
        <input type="checkbox" bind:checked={firVisible} on:change={handleCheckboxChange} />
        <span class="slider"></span>
        <span class="label-text">{firVisible ? 'Masquer la FIR' : 'Afficher la FIR'}</span>
    </label>

    <p>Épaisseur des contours</p>
    <input type="range" id="myRange" min="0" max="8" value="0" on:change={valueRangeSlider} />

    <p>Couleur des contours</p>
    <input type="color" id="colorPicker" value="#3498db" on:change={colorPickerFir} />
    <br /><br />

    <p>Développé par Manne Micaël KITSOUKOU</p>
</section>

<script lang="js">
    import { map } from '@windy/map';
    import bcast from '@windy/broadcast';
    import config from './pluginConfig';

    const { title } = config;
    let sigmetVisible = true;
    let firVisible = false;
    let geoLayer = null;
    let colorFir = '#3498db';

    // Charger jQuery
    const script = document.createElement('script');
    script.src = 'https://cdnjs.cloudflare.com/ajax/libs/jquery/3.5.1/jquery.min.js';
    script.type = 'text/javascript';
    document.head.appendChild(script);

    // Initialiser le groupe de calques SIGMET
    if (!map.sigmetLayerGroup) {
        map.sigmetLayerGroup = L.layerGroup().addTo(map);
        map.sigmetLayerGroup.setZIndex(500);
    }

    function handleCheckboxChange() {
        firVisible ? getFir() : removeFir();
    }

    function handleCheckboxChangeSigmet() {
        sigmetVisible ? getSigmets() : removeSigmets();
    }

    function removeSigmets() {
        map.sigmetLayerGroup.clearLayers();
    }

    function removeFir() {
        if (geoLayer) {
            map.removeLayer(geoLayer);
            geoLayer = null;
        }
    }

    function valueRangeSlider() {
        const rangeValue = parseInt(document.getElementById('myRange').value, 10);
        window.rangeValue = rangeValue;
        if (firVisible) getFir();
    }

    function colorPickerFir() {
        colorFir = document.getElementById('colorPicker').value;
        if (firVisible) getFir();
    }

    function getFir() {
        if (!map) return console.error('[getFir] map is not defined');

        if (geoLayer) map.removeLayer(geoLayer);

        fetch(new URL('./countries.geo.json', import.meta.url))
            .then(r => {
                if (!r.ok) throw new Error(`Erreur ${r.status} en récupérant le GeoJSON`);
                return r.json();
            })
            .then(data => {
                geoLayer = L.geoJSON(data, {
                    style: {
                        color: colorFir,
                        weight: typeof window.rangeValue === 'number' ? window.rangeValue : 2,
                        fillOpacity: 0,
                    },
                    onEachFeature: (f, l) => {
                        if (f.properties?.name) l.bindTooltip(f.properties.name);
                    },
                }).addTo(map);

                geoLayer.bringToBack();
                map.sigmetLayerGroup.eachLayer(layer => layer.bringToFront?.());
            })
            .catch(err => console.error('GeoJSON – chargement impossible :', err));
    }

    script.onload = () => {
        const $ = window.jQuery;

        $(document).ready(() => {
            $('#map-container').ready(() => getSigmets());

            function getSigmets() {
                $.ajax({
                    url: 'https://manne.tekissa.net/',
                    type: 'GET',
                    success(response) {
                        const sigmetLayerGroup = map.sigmetLayerGroup;
                        sigmetLayerGroup.clearLayers();

                        if (typeof response === 'string') {
                            try {
                                response = JSON.parse(response);
                            } catch (e) {
                                return console.error('Erreur JSON :', e);
                            }
                        }

                        if (!Array.isArray(response.features)) {
                            return console.error('Réponse invalide :', response);
                        }

                        response.features.forEach((feature, index) => {
                            if (!feature.geometry) {
                                return console.warn(
                                    `Feature sans geometry à l’index ${index}`,
                                    feature,
                                );
                            }

                            const props = feature.properties;
                            const color = props.hazard === 'TS' ? 'red' : 'orange';

                            const popupContent = `
                                <div>
                                    <b style="color: blue;">SIGMET : ${props.qualifier || 'N/A'} ${props.hazard || ''}</b><br><br>
                                    <b style="color: blue;">FIR Name :</b> ${props.firName || 'N/A'}<br>
                                    <b style="color: blue;">Hazard :</b> ${props.hazard || 'N/A'}<br>
                                    <b style="color: blue;">Begins :</b> ${props.validTimeFrom || 'N/A'}<br>
                                    <b style="color: blue;">Ends :</b> ${props.validTimeTo || 'N/A'}<br><br>
                                    <hr>
                                    <pre style="font-size: 11px;
 
            max-width: 540px;">${props.rawSigmet || ''}</pre>
                                </div>`;

                            let layer;
                            const coords = feature.geometry.coordinates;

                            if (feature.geometry.type === 'Polygon') {
                                const latlngs = coords.map(ring =>
                                    ring.map(([lon, lat]) => [lat, lon]),
                                );
                                layer = L.polygon(latlngs, { color }).bindPopup(popupContent, {
                                    maxWidth: 560,
                                    autoPan: false,
                                    
                                });
                            } else if (feature.geometry.type === 'MultiPolygon') {
                                const latlngs = coords.map(polygon =>
                                    polygon.map(ring => ring.map(([lon, lat]) => [lat, lon])),
                                );
                                layer = L.polygon(latlngs, { color }).bindPopup(popupContent, {
                                    maxWidth: 560,
                                    autoPan: false,
                                });
                            }

                            if (layer) sigmetLayerGroup.addLayer(layer);
                        });
                    },
                    error(xhr, status, error) {
                        console.error('Erreur AJAX :', error);
                    },
                });
            }

            window.getSigmets = getSigmets;
            setInterval(getSigmets, 300000); // 5 minutes
        });
    };
</script>

<style>
    .toggle-switch {
        display: inline-flex;
        align-items: center;
        gap: 10px;
        font-family: sans-serif;
        cursor: pointer;
    }

    .toggle-switch input {
        display: none;
    }

    .slider {
        width: 40px;
        height: 20px;
        background-color: #ccc;
        border-radius: 999px;
        position: relative;
        transition: background-color 0.3s;
    }

    .slider::before {
        content: '';
        position: absolute;
        top: 2px;
        left: 2px;
        width: 16px;
        height: 16px;
        background-color: white;
        border-radius: 50%;
        transition: transform 0.3s;
    }

    input:checked + .slider {
        background-color: #4caf50;
    }

    input:checked + .slider::before {
        transform: translateX(20px);
    }

    .label-text {
        font-size: 14px;
    }
</style>

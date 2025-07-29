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
    Hover over anyof the Polygons for additional information.
    <p>SIGMETs</p>

    <p>FIR</p>
    <button on:click={getFir}>Afficher</button>
    <button on:click={removeFir}>Masquer</button>
    <p>Epaisseur des contours</p>
    <input type="range" id="myRange" min="0" max="8" value="0" on:change={valueRangeSlider} />
    <p>Couleur des contours</p>
    <input type="color" id="colorPicker" value="#3498db" on:change={colorPickerFir} />
</section>

<script lang="js">
    import { map } from '@windy/map';
    import bcast from '@windy/broadcast';
    import { onDestroy, onMount } from 'svelte';
    import config from './pluginConfig';

    const { title } = config;

    var mouseX;
    var mouseY;

    // S'assurer que le groupe est créé une seule fois, et réutilisé ensuite
    if (!map.sigmetLayerGroup) {
        map.sigmetLayerGroup = L.layerGroup().addTo(map);
        map.sigmetLayerGroup.setZIndex(500);
    }

    var script = document.createElement('script');
    script.src = 'https://cdnjs.cloudflare.com/ajax/libs/jquery/3.5.1/jquery.min.js';
    script.type = 'text/javascript';

    script.onload = function () {
        var $ = window.jQuery;
        $(document).ready(function () {
            $('#map-container')
                .append(
                    '<style> #tooltip-sigmets { display: none; position:absolute; width: 300px; height: auto; background-color: rgba(0,0,0,0.75); font-size:0.9em; font-weight:normal; color:#fff; margin: 15px; text-align:left; line-height: 18px; z-index:99; } #tooltip-sigmets .heading, #tooltip-sigmets .body{ padding:0.5em; } #tooltip-sigmets .body div{ margin-bottom:0.5em; }</style><div id="tooltip-sigmets"></div>',
                )
                .ready(function () {
                    getSigmets();
                });

            $('#map-container, #map-container div').mousemove(function (e) {
                var rect = e.target.getBoundingClientRect();
                mouseX = e.clientX - rect.left;
                mouseY = e.clientY - rect.top;
            });

            function getSigmets() {
                $.ajax({
                    url: 'https://manne.tekissa.net/',
                    type: 'GET',
                    success: function (response) {
                        const sigmetLayerGroup = map.sigmetLayerGroup;
                        sigmetLayerGroup.clearLayers();

                        if (typeof response === 'string') {
                            try {
                                response = JSON.parse(response);
                            } catch (e) {
                                console.error('Erreur JSON :', e);
                                return;
                            }
                        }

                        if (!response.features || !Array.isArray(response.features)) {
                            console.error('Réponse invalide :', response);
                            return;
                        }

                        response.features.forEach(function (feature, index) {
                            // Debug log pour chaque feature
                            if (!feature.geometry) {
                                console.warn(`Feature sans geometry à l’index ${index} :`, feature);
                                return; // On saute cette feature pour éviter l’erreur
                            }

                            const color = feature.properties.hazard === 'TS' ? 'red' : 'orange';
                            const props = feature.properties;
                            const popupContent = `
    <div>
        <b style="color: blue;">SIGMET : ${props.qualifier || 'N/A'} ${props.hazard || ''}</b><br><br>
        <b style="color: blue;">FIR Name :</b> ${props.firName || 'N/A'}<br>
        <b style="color: blue;">Hazard :</b> ${props.hazard || 'N/A'}<br>
        <b style="color: blue;">Begins :</b> ${props.validTimeFrom || 'N/A'}<br>
        <b style="color: blue;">Ends :</b> ${props.validTimeTo || 'N/A'}<br><br>
        <hr>
         <pre style="font-size:11px" >
${props.rawSigmet || ''}
        </pre>
    </div>
`;
                            let layer;

                            if (feature.geometry.type === 'Polygon') {
                                const latlngs = feature.geometry.coordinates.map(ring =>
                                    ring.map(coord => [coord[1], coord[0]]),
                                );
                                layer = L.polygon(latlngs, { color }).bindPopup(popupContent);
                            } else if (feature.geometry.type === 'MultiPolygon') {
                                const latlngs = feature.geometry.coordinates.map(polygon =>
                                    polygon.map(ring => ring.map(coord => [coord[1], coord[0]])),
                                );
                                layer = L.polygon(latlngs, { color }).bindPopup(popupContent);
                            }

                            if (layer) sigmetLayerGroup.addLayer(layer);
                        });

                        console.log('JSON RESPONSE :');
                        console.log(response.features);
                    },
                    error: function (xhr, status, error) {
                        console.error('Erreur AJAX :', error);
                    },
                });
            }
            window.getSigmets = getSigmets;
        });
    };

    // ===================== code micael =================

    let geoLayer = null; // Déclarée en global pour y accéder dans plusieurs fonctions

    // Recuperer la valeur du range bouton (épaisseur des contours)

    function valueRangeSlider() {
        const rangeInput = document.getElementById('myRange');
        const rangeValue = parseInt(rangeInput.value, 10);
        window.rangeValue = rangeValue;
        getFir();
    }
    //

    //
    let colorFir = '#3498db';
    function colorPickerFir() {
        const picker = document.getElementById('colorPicker');
        colorFir = picker.value;
        getFir();
    }

    //
    function getFir() {
        if (!mapReady) {
            console.warn('Carte non encore prête');
            return;
        }

        if (geoLayer) {
            map.removeLayer(geoLayer);
        }

        fetch(new URL('./countries.geo.json', import.meta.url))
            .then(r => {
                if (!r.ok) throw new Error(`Erreur ${r.status} en récupérant le GeoJSON`);
                return r.json();
            })
            .then(data => {
                geoLayer = L.geoJSON(data, {
                    style: {
                        color: colorFir,
                        weight: window.rangeValue || 2,
                        fillOpacity: 0,
                    },
                    onEachFeature: (f, l) => {
                        if (f.properties?.name) {
                            l.bindTooltip(f.properties.name);
                        }
                    },
                }).addTo(map);
            })
            .catch(err => console.error('GeoJSON – chargement impossible :', err));
    }

    // Nouvelle fonction : suppression du geoLayer
    function removeFir() {
        if (geoLayer) {
            map.removeLayer(geoLayer);
            geoLayer = null;
        }
    }
    document.getElementsByTagName('head')[0].appendChild(script);
</script>

<style>
    #myDIV {
        width: 100%;
        padding: 50px 0;
        text-align: center;
        background-color: lightblue;
        margin-top: 20px;
    }
</style>

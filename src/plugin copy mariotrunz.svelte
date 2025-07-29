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
    <button on:click={displayHideSIGMETS}>Afficher Sigmets</button>

    <p>FIR</p>
    <button on:click={getFir}>Afficher</button>
    <button on:click={removeFir}>Masquer</button>
    <p>Epaisseur des contours</p>
    <input type="range" id="myRange" min="1" max="8" value="2" on:change={valueRangeSlider}>
    <p>Couleur des contours</p>
    <input type="color" id="colorPicker" value="#3498db" on:change={colorPickerFir}>
    <div id="myDIV">This is my DIV element.</div>
</section>

<script lang="js">
    import { map } from '@windy/map';
    import bcast from '@windy/broadcast';
    import { onDestroy, onMount } from 'svelte';
    import config from './pluginConfig';

    const { title } = config;

    var mouseX;
    var mouseY;
    var sigmet_i = 0;
    var sigmet_timer;
    var sigmet_polygons = [];
    var recent_sigmets_timer;
    var recent_sigmets = [];
    var recent_sigmets_properties = [];
    var recent_sigmets_state = '';

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
                if (sigmet_polygons) {
                    for (sigmet_i = 0; sigmet_i < sigmet_polygons.length; sigmet_i++) {
                        map.removeLayer(sigmet_polygons[sigmet_i]);
                    }
                    sigmet_polygons = [];
                }
                if (recent_sigmets) {
                    for (sigmet_i = 0; sigmet_i < recent_sigmets.length; sigmet_i++) {
                        map.removeLayer(recent_sigmets[sigmet_i]);
                    }
                    recent_sigmets = [];
                    recent_sigmets_properties = [];
                }
                $.ajax({
                    url: 'https://mariotrunz.me/windy/getSigmets.php',
                    type: 'GET',
                    success: function (response) {
                        $.each(response, function (key, value) {
                            var points = [];

                            for (var i = 0; i < value.coordinates.length; i++) {
                                points.push([value.coordinates[i][0], value.coordinates[i][1]]);
                            }

                            var sigmet_type = parseSIGMETType(value.type);
                            var rgb_color = convertHEXtoRGB(sigmet_type[0].color);

                            var polygon_content =
                                '<div>' +
                                '<div style="background-color:rgba(' +
                                rgb_color[0] +
                                ',' +
                                rgb_color[1] +
                                ',' +
                                rgb_color[2] +
                                ',0.6);" class="heading">' +
                                value.qualifier +
                                ' ' +
                                sigmet_type[0].description +
                                ' (' +
                                value.type +
                                ') SIGMET</div>' +
                                '<div class="body">' +
                                value.contentString +
                                '</div>' +
                                '</div>';

                            var polygon = L.polygon([points], {
                                color: sigmet_type[0].color,
                            }).addTo(map);

                            polygon.on('mouseover', function () {
                                $('#tooltip-sigmets')
                                    .html(polygon_content)
                                    .css({
                                        left: mouseX,
                                        top: mouseY,
                                    })
                                    .show();
                            });

                            polygon.on('mouseout', function () {
                                $('#tooltip-sigmets').hide();
                            });

                            if (value.recent == 'true') {
                                recent_sigmets.push(polygon);
                                recent_sigmets_properties.push(sigmet_type[0].color);
                            }

                            sigmet_polygons.push(polygon);
                        });

                        if (recent_sigmets.length > 0) {
                            recent_sigmets_state = '';
                            animateRecentSIGMETS();
                        }
                    },
                });

                function animateRecentSIGMETS() {
                    var color = '';
                    if (recent_sigmets_state == '') {
                        color = '#000000';
                        recent_sigmets_state = 'black';
                    } else {
                        recent_sigmets_state = '';
                    }

                    for (sigmet_i = 0; sigmet_i < recent_sigmets.length; sigmet_i++) {
                        if (color != '') {
                            recent_sigmets[sigmet_i].setStyle({ color: '#000000' });
                        } else {
                            var sigmet_color = recent_sigmets_properties[sigmet_i];
                            recent_sigmets[sigmet_i].setStyle({ color: sigmet_color });
                        }
                    }

                    clearTimeout(recent_sigmets_timer);
                    recent_sigmets_timer = setTimeout(animateRecentSIGMETS, 1000);
                }

                function parseSIGMETType(sigmet_type) {
                    var color, description;

                    if (
                        sigmet_type == 'TS' ||
                        sigmet_type == 'TSGR' ||
                        sigmet_type == 'CONVECTIVE'
                    ) {
                        description = 'Convective';
                        color = '#FF0000';
                    } else if (sigmet_type == 'TURB') {
                        description = 'Turbulence';
                        color = '#ff6600';
                    } else if (sigmet_type == 'LLWS') {
                        description = 'Wind Shear';
                        color = '#983636';
                    } else if (sigmet_type == 'ICE' || sigmet_type == 'ICG') {
                        description = 'Icing';
                        color = '#0008ff';
                    } else if (sigmet_type == 'MTW') {
                        description = 'Mountain Wave';
                        color = '#ff06ff';
                    } else if (sigmet_type == 'TC') {
                        description = 'Tropical Cyclone';
                        color = '#cb6600';
                    } else if (sigmet_type == 'VA') {
                        description = 'Volcanic Ash';
                        color = '#afd4cb';
                    } else if (sigmet_type == 'IFR') {
                        description = 'IFR';
                        color = '#980298';
                    } else {
                        color = '#000000';
                    }

                    return [{ color: color, description: description }];
                }

                function convertHEXtoRGB(hex) {
                    hex = hex.replace('#', '');
                    var aRgbHex = hex.match(/.{1,2}/g);
                    var aRgb = [
                        parseInt(aRgbHex[0], 16),
                        parseInt(aRgbHex[1], 16),
                        parseInt(aRgbHex[2], 16),
                    ];
                    return aRgb;
                }

                clearTimeout(sigmet_timer);
                sigmet_timer = setTimeout(getSigmets, 600000);
            }
            window.getSigmets = getSigmets;
        });
    };
    document.getElementsByTagName('head')[0].appendChild(script);
    // ================ CODE MICAEL =========================

    // DISPLAY - HIDE FIR
    var couleurFIR = 'blue';

    // Autres lignes FIR
    const blueLineCoords = [
        { lat: 'N0800', lon: 'E01000' },
        { lat: 'N0800', lon: 'E25000' },
        { lat: 'S1000', lon: 'E20000' },
        { lat: 'S1000', lon: 'E01000' },
        { lat: 'N0800', lon: 'E01000' },
    ];

    const redLineCoords = [
        { lat: 'N0100', lon: 'E02200' },
        { lat: 'N0300', lon: 'E02300' },
    ];

    // Fonction de conversion des coordonnées aéronautiques en décimales
    function convertCoord(coord) {
        const direction = coord[0];
        const degrees = parseInt(coord.slice(1, 3), 10);
        const minutes = parseFloat(coord.slice(3)) / 60;

        let decimal = degrees + minutes;
        if (direction === 'S' || direction === 'W') {
            decimal = -decimal; // Inverse pour le Sud et l'Ouest
        }
        return decimal;
    }

    // Tracer les lignes bleues et rouges
    var redPolyline = L.polyline(
        redLineCoords.map(coord => [convertCoord(coord.lat), convertCoord(coord.lon)]),
        { color: couleurFIR, weight: 2 },
    ).addTo(map);

    // ========================= FIN CODE MICAEL ==========================

    // DISPLAY FUNCTIONS
    var displaySigmetBool = Boolean(true);

    function displayHideSIGMETS() {
        if (displaySigmetBool) {
            /* Masquer les polygones SIGMET */
            sigmet_polygons.forEach(p => map.removeLayer(p));
            sigmet_polygons = [];
            displaySigmetBool = false;
            sigmetButtonLabel = 'Afficher SIGMETs';
        } else {
            /* Les ré-afficher */
            if (window.getSigmets) {
                window.getSigmets();
            }
            displaySigmetBool = true;
            sigmetButtonLabel = 'Masquer SIGMETs';
        }
    }

    // ===============

    let geoLayer = null; // Déclarée en global pour y accéder dans plusieurs fonctions

    // Recuperer la valeur du range bouton (épaisseur des contours)

    function valueRangeSlider(){
        const rangeInput = document.getElementById('myRange');
        const rangeValue = parseInt(rangeInput.value, 10);
        window.rangeValue=rangeValue;
        getFir();
    }
    //

    //
    
    function colorPickerFir(){
        const picker = document.getElementById('colorPicker');
        const colorFir = picker.value;
        window.colorFir=colorFir;
        getFir();
    }

    //

    function getFir(couleurFIR) {
        // Supprimer le geoLayer existant s'il est déjà affiché
        if (geoLayer) {
            map.removeLayer(geoLayer);
            geoLayer = null;
        }



        // Chargement du fichier GeoJSON
        fetch(new URL('./countries.geo.json', import.meta.url))
            .then(r => {
                if (!r.ok) throw new Error(`Erreur ${r.status} en récupérant le GeoJSON`);
                return r.json();
            })
            .then(data => {
                geoLayer = L.geoJSON(data, {
                    style: {
                        color: window.colorFir,
                        weight:window.rangeValue,
                        fillOpacity: 0,
                    },
                    onEachFeature: (f, l) => f.properties?.name && l.bindTooltip(f.properties.name),
                }).addTo(map);

                //   map.fitBounds(geoLayer.getBounds());
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

    // ===============
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

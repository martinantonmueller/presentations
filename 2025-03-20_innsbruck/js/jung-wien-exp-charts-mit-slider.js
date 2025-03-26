document.addEventListener('DOMContentLoaded', () => {
    console.log('Document is ready');

    // Lese URL-Parameter, z. B. ?year=1900
    const params = new URLSearchParams(window.location.search);
    const urlYear = params.get('year');

    // Liste der verfügbaren CSV-Dateien
    const csvFiles = {
        "Archivstücke": "https://raw.githubusercontent.com/martinantonmueller/presentations/refs/heads/main/2025-03-20_innsbruck/csv/archivstuecke.csv",
        "Verhältnis 1:1": "https://raw.githubusercontent.com/martinantonmueller/presentations/refs/heads/main/2025-03-20_innsbruck/csv/staerkere-seite.csv",
         "Schnitzler-Koeffizient": "https://raw.githubusercontent.com/martinantonmueller/presentations/refs/heads/main/2025-03-20_innsbruck/csv/schnitzler-koeffizient.csv"
    };

    // Wir speichern für jede Instanz die Update-Funktion
    const instances = [];

    // Diese Funktion initialisiert eine Instanz im Container mit eigener CSV-Dropdown,
    // lädt die CSV-Daten und kapselt die interne Logik. Das globale Jahresfeld wird
    // nicht in der Instanz angelegt, sondern später zur Aktualisierung beider Instanzen genutzt.
    function initChartWithSlider(containerId, dropdownId) {
        const container = document.getElementById(containerId);
        if (!container) {
            console.error('Container nicht gefunden: ' + containerId);
            return;
        }

        // Erstelle CSV-Dropdown und füge es oberhalb des Containers ein
        const csvDropdown = document.createElement('select');
        csvDropdown.id = dropdownId;
        for (const [label, url] of Object.entries(csvFiles)) {
            const option = document.createElement('option');
            option.value = url;
            option.textContent = label;
            csvDropdown.appendChild(option);
        }
        container.parentNode.insertBefore(csvDropdown, container);

        // Container-Styles festlegen
        container.style.display = 'flex';
        container.style.justifyContent = 'center';
        container.style.alignItems = 'center';
        container.style.width = '100%';
        container.style.height = '600px';

        // Funktion zum Anpassen der Container-Größe (Reflow)
        const resizeChartContainer = () => {
            container.style.width = '100%';
            container.style.height = window.innerHeight * 0.6 + 'px';
            container.style.margin = '0';
            container.chartInstance && container.chartInstance.reflow();
        };

        resizeChartContainer();
        window.addEventListener('resize', resizeChartContainer);

        let dataByYear = {};

        // CSV laden und nach Jahr gruppieren
        const loadCSV = (csvUrl) => {
            fetch(csvUrl)
                .then(response => response.ok ? response.text() : Promise.reject('Netzwerkfehler: ' + response.statusText))
                .then(csvText => {
                    console.log('CSV file content:', csvText);
                    Papa.parse(csvText, {
                        header: true,
                        complete: ({ data }) => {
                            if (!data.length) {
                                console.error('CSV-Daten leer oder falsch formatiert');
                                return;
                            }
                            // Gruppiere Daten nach Jahr
                            dataByYear = data.reduce((acc, row) => {
                                const rawYear = row.Year;
                                if (!rawYear) {
                                    console.warn('Zeile ohne Year-Wert:', row);
                                    return acc;
                                }
                                const year = parseInt(rawYear, 10);
                                if (isNaN(year)) {
                                    console.warn('Ungültiger Jahr-Wert:', rawYear, row);
                                    return acc;
                                }
                                if (!acc[year]) acc[year] = [];
                                acc[year].push(row);
                                return acc;
                            }, {});

                            // Ermittle min und max Jahr – wir gehen davon aus, dass beide CSVs ähnliche Werte haben
                            const years = Object.keys(dataByYear).map(y => parseInt(y, 10));
                            if (years.length === 0) {
                                console.error('Keine gültigen Jahr-Werte gefunden.');
                                return;
                            }
                            const minYear = Math.min(...years);
                            const maxYear = Math.max(...years);

                            // Aktualisiere globales Jahresfeld, falls vorhanden (nur einmal, wenn z. B. noch nicht gesetzt)
                            const globalYearField = document.getElementById('globalYearField');
                            if (globalYearField) {
                                globalYearField.min = minYear;
                                globalYearField.max = maxYear;
                                // Wenn der URL-Parameter vorhanden und gültig ist, nutze ihn; ansonsten, falls der aktuelle Wert außerhalb liegt, setze minYear
                                let currentYear = parseInt(globalYearField.value, 10);
                                if (urlYear && urlYear >= minYear && urlYear <= maxYear) {
                                    currentYear = parseInt(urlYear, 10);
                                    globalYearField.value = currentYear;
                                } else if (currentYear < minYear || currentYear > maxYear) {
                                    currentYear = minYear;
                                    globalYearField.value = currentYear;
                                }
                            }

                            // Erstelle initial den Chart für das aktuell globale Jahr
                            setTimeout(() => {
                                createChartForYear(parseInt(document.getElementById('globalYearField').value, 10));
                                forceRedraw();
                            }, 100);
                        },
                        error: error => console.error('Error parsing CSV:', error)
                    });
                })
                .catch(error => console.error('Error loading CSV:', error));
        };

        // Funktion zur Erstellung des Charts für ein bestimmtes Jahr
        const createChartForYear = (year) => {
            console.log(`Erstelle Chart für Jahr: ${year} in Container ${containerId}`);
            const nodes = {},
                  links = [],
                  nodeCorrespondences = {},
                  nodeWeightSums = {};
            const [nodeColor, linkColor, minNodeSize, maxNodeSize, minLinkWidth, maxLinkWidth] =
                  ['#3785A6', '#A63437', 5, 20, 0.1, 10];
            const yearData = dataByYear[year] || [];

            // Vordefinierte Links für Nodes
            const nodeLinks = {
                "Hugo von Hofmannsthal": "https://schnitzler-briefe.acdh.oeaw.ac.at/toc_11740.html",
                "Richard Beer-Hofmann": "https://schnitzler-briefe.acdh.oeaw.ac.at/toc_10863.html",
                "Hermann Bahr": "https://schnitzler-briefe.acdh.oeaw.ac.at/toc_10815.html",
                "Felix Salten": "https://schnitzler-briefe.acdh.oeaw.ac.at/toc_2167.html",
                "Paul Goldmann": "https://schnitzler-briefe.acdh.oeaw.ac.at/toc_11485.html"
            };

            yearData.forEach(row => {
                const source = row.Source?.trim();
                const target = row.Target?.trim();
                const weight = parseInt(row.Weight, 10) || 0;

                if (!source || !target) {
                    console.warn('Row missing source or target:', row);
                    return;
                }

                if (!nodes[source]) {
                    nodes[source] = {
                        id: source,
                        marker: { fillColor: nodeColor },
                        url: nodeLinks[source] || null
                    };
                    nodeCorrespondences[source] = {};
                    nodeWeightSums[source] = 0;
                }
                if (!nodes[target]) {
                    nodes[target] = {
                        id: target,
                        marker: { fillColor: nodeColor },
                        url: nodeLinks[target] || null
                    };
                    nodeCorrespondences[target] = {};
                    nodeWeightSums[target] = 0;
                }

                nodeCorrespondences[source][target] = (nodeCorrespondences[source][target] || 0) + weight;
                nodeCorrespondences[target][source] = (nodeCorrespondences[target][source] || 0) + weight;
                nodeWeightSums[source] += weight;
                nodeWeightSums[target] += weight;

                links.push({
                    from: source,
                    to: target,
                    value: weight,
                    color: linkColor,
                    width: weight
                });
            });

            const allNodes = Object.values(nodes);
            if (!allNodes.length || !links.length) {
                console.error('Nodes or links arrays are empty');
                return;
            }

            // Skalierung der Node-Größen
            const minNodeWeight = Math.min(...Object.values(nodeWeightSums));
            const maxNodeWeight = Math.max(...Object.values(nodeWeightSums));
            allNodes.forEach(node => {
                const totalWeight = nodeWeightSums[node.id];
                const normalizedSize = minNodeSize + ((totalWeight - minNodeWeight) / (maxNodeWeight - minNodeWeight)) * (maxNodeSize - minNodeSize);
                node.marker.radius = normalizedSize;
            });

            // Skalierung der Link-Dicken
            const minLinkWeight = Math.min(...links.map(link => link.value));
            const maxLinkWeight = Math.max(...links.map(link => link.value));
            links.forEach(link => {
                link.width = minLinkWidth + ((link.value - minLinkWeight) / (maxLinkWeight - minLinkWeight)) * (maxLinkWidth - minLinkWidth);
            });

            // Erstelle den Chart in diesem Container
            container.chartInstance = Highcharts.chart(containerId, {
                chart: {
                    type: 'networkgraph',
                    panning: { enabled: true, type: 'xy' },
                    panKey: 'shift',
                    zoomType: 'xy'
                },
                title: { text: null },
                tooltip: {
                    formatter: function () {
                        if (this.point.isNode) {
                            const correspondences = nodeCorrespondences[this.point.id];
                            let tooltipText = `<b>${this.point.id}</b>`;
                            for (const target in correspondences) {
                                tooltipText += `<br>Briefe mit ${target}: ${correspondences[target]}`;
                            }
                            return tooltipText;
                        }
                        return null;
                    }
                },
                plotOptions: {
                    networkgraph: {
                        keys: ['from', 'to'],
                        layoutAlgorithm: {
                            initialPositions: 'circle',
                            enableSimulation: true,
                            gravitationalConstant: 0,
                            linkLength: 100,
                            friction: -0.9
                        },
                        dataLabels: {
                            enabled: true,
                            linkFormat: '',
                            allowOverlap: false,
                            style: { textOutline: 'none',
                                fontSize: '30px' },
                            formatter: function () { return this.point.id; }
                        },
                        link: {
                            color: linkColor,
                            width: 'width'
                        }
                    }
                },
                series: [{
                    dataLabels: {
                        enabled: true,
                        linkFormat: '',
                        allowOverlap: false,
                        style: { textOutline: 'none',
                        fontSize: '30px' },
                        formatter: function () { return this.point.id; }
                    },
                    nodes: allNodes,
                    data: links,
                    point: {
                        events: {
                            click: function () {
                                if (this.url) {
                                    window.open(this.url, '_blank');
                                }
                            }
                        }
                    }
                }],
                exporting: { enabled: true }
            });
            forceRedraw();
        };

        // Funktion zum Redraw (Reflow)
        const forceRedraw = () => {
            container.chartInstance && container.chartInstance.reflow();
        };

        // CSV-Dropdown-Event: Bei Änderung CSV neu laden
        csvDropdown.addEventListener('change', () => {
            loadCSV(csvDropdown.value);
        });

        // Initiale CSV-Ladung anhand der ersten Dropdown-Option
        loadCSV(csvDropdown.value);

        // Gib eine Update-Funktion zurück, die später von globalen Listenern genutzt wird
        return { updateChart: createChartForYear };
    }

    // Initialisiere beide Instanzen – hier erhalten beide ihre eigene CSV-Auswahl, aber verwenden später das globale Jahr
    const chartLeft = initChartWithSlider('container-mit-slider-left', 'csvDropdown-left');
    const chartRight = initChartWithSlider('container-mit-slider-right', 'csvDropdown-right');

    // Hole das globale Jahresfeld (sollte im HTML vorhanden sein)
    const globalYearField = document.getElementById('globalYearField');
    if (!globalYearField) {
        console.error('Globales Jahresfeld nicht gefunden.');
        return;
    }

    // Falls im URL-Parameter ein Jahr übergeben wurde, setze das globale Feld
    if (urlYear) {
        globalYearField.value = urlYear;
    }

    // Globaler Event-Listener: Ändert sich das globale Jahr, so aktualisieren beide Instanzen
    globalYearField.addEventListener('input', () => {
        const year = parseInt(globalYearField.value, 10);
        console.log('Globales Jahr geändert:', year);
        chartLeft.updateChart(year);
        chartRight.updateChart(year);
    });
});

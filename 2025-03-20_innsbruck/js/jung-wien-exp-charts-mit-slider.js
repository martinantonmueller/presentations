document.addEventListener('DOMContentLoaded', () => {
    console.log('Document is ready');

    // Liste der verfügbaren CSV-Dateien
    const csvFiles = {
        "Archivstücke": "https://raw.githubusercontent.com/martinantonmueller/presentations/refs/heads/main/2025-03-20_innsbruck/csv/archivstuecke.csv",
        "Stärkere Seite": "https://raw.githubusercontent.com/martinantonmueller/presentations/refs/heads/main/2025-03-20_innsbruck/csv/staerkere-seite.csv"
    };

    // Dropdown zur CSV-Auswahl erstellen
    const csvDropdown = document.createElement('select');
    csvDropdown.id = 'csvDropdown';
    for (const [label, url] of Object.entries(csvFiles)) {
        const option = document.createElement('option');
        option.value = url;
        option.textContent = label;
        csvDropdown.appendChild(option);
    }
    // Dropdown oberhalb des Chart-Containers einfügen
    const containerMitSlider = document.getElementById('container-mit-slider');
    containerMitSlider.parentNode.insertBefore(csvDropdown, containerMitSlider);

    // Container-Styles festlegen
    containerMitSlider.style.display = 'flex';
    containerMitSlider.style.justifyContent = 'center';
    containerMitSlider.style.alignItems = 'center';
    containerMitSlider.style.width = '100%';
    containerMitSlider.style.height = '600px'; // Feste Höhe

    // Statt des Sliders nutzen wir hier das Zahlenfeld
    const yearField = document.getElementById('yearField');

    // Funktion zum Anpassen der Container-Größe
    const resizeChartContainer = () => {
        if (containerMitSlider) {
            containerMitSlider.style.width = '100%';
            containerMitSlider.style.height = window.innerHeight * 0.6 + 'px';
            containerMitSlider.style.margin = '0';
            window.chartMitSlider?.reflow();
        } else {
            console.error('Container not found');
        }
    };

    resizeChartContainer();
    window.addEventListener('resize', resizeChartContainer);

    let dataByYear = {};

    // Funktion zum Laden der CSV-Datei
    const loadCSV = (csvUrl) => {
        fetch(csvUrl)
            .then(response => response.ok ? response.text() : Promise.reject('Network response was not ok ' + response.statusText))
            .then(csvText => {
                console.log('CSV file content:', csvText);
                Papa.parse(csvText, {
                    header: true,
                    complete: ({ data }) => {
                        if (!data.length) {
                            console.error('Parsed data is empty or incorrectly formatted');
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

                        // Ermittle verfügbare Jahre
                        const years = Object.keys(dataByYear).map(y => parseInt(y, 10));
                        if (years.length === 0) {
                            console.error('Keine gültigen Jahr-Werte in der CSV gefunden.');
                            return;
                        }
                        const minYear = Math.min(...years);
                        const maxYear = Math.max(...years);
                        // Setze min, max und Standardwert (1890 falls möglich)
                        yearField.min = minYear;
                        yearField.max = maxYear;
                        yearField.value = (minYear <= 1890 && 1890 <= maxYear) ? 1890 : minYear;

                        // Erstelle initial den Chart
                        setTimeout(() => {
                            createChartForYear(parseInt(yearField.value, 10));
                            forceRedraw();
                        }, 100);
                    },
                    error: error => console.error('Error parsing the CSV file:', error)
                });
            })
            .catch(error => console.error('Error loading the CSV file:', error));
    };

    // Funktion zur Erstellung des Charts für ein bestimmtes Jahr
    const createChartForYear = (year) => {
        console.log(`Creating chart for year: ${year}`);
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
                    marker: {
                        fillColor: nodeColor
                    },
                    url: nodeLinks[source] || null
                };
                nodeCorrespondences[source] = {};
                nodeWeightSums[source] = 0;
            }
            if (!nodes[target]) {
                nodes[target] = {
                    id: target,
                    marker: {
                        fillColor: nodeColor
                    },
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

        // Erstellung des Charts mit Highcharts
        window.chartMitSlider = Highcharts.chart('container-mit-slider', {
            chart: {
                type: 'networkgraph',
                panning: {
                    enabled: true, type: 'xy'
                },
                panKey: 'shift',
                zoomType: 'xy'
            },
            title: {
                text: null
            },
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
                        style: {
                            textOutline: 'none'
                        },
                        formatter: function () {
                            return this.point.id;
                        }
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
                    style: {
                        textOutline: 'none'
                    },
                    formatter: function () {
                        return this.point.id;
                    }
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
            exporting: {
                enabled: false
            }
        });

        // Erzwinge die Neuzeichnung des Charts
        forceRedraw();
    };

    // Funktion zur Erzwingung des Redraws
    const forceRedraw = () => {
        if (window.chartMitSlider) {
            window.chartMitSlider.reflow();
        }
    };

    // Event-Listener für das Zahlenfeld (Jahresauswahl)
    yearField.addEventListener('input', () => {
        const year = parseInt(yearField.value, 10);
        createChartForYear(year);
    });

    // Event-Listener für das CSV-Dropdown
    csvDropdown.addEventListener('change', () => {
        const selectedCsvUrl = csvDropdown.value;
        loadCSV(selectedCsvUrl);
    });

    // Initiale CSV-Ladung anhand der ersten Option im Dropdown
    loadCSV(csvDropdown.value);
});

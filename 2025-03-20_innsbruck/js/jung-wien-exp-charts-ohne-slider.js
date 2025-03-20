document.addEventListener('DOMContentLoaded', () => {
    console.log('Document is ready');

    // Liste der verfügbaren CSV-Dateien (Label: URL)
    const csvFiles = {
        "Archivstücke": "https://raw.githubusercontent.com/martinantonmueller/presentations/refs/heads/main/2025-03-20_innsbruck/csv/archivstuecke.csv",
        "Verhältnis 1:1": "https://raw.githubusercontent.com/martinantonmueller/presentations/refs/heads/main/2025-03-20_innsbruck/csv/staerkere-seite.csv",
        "Schnitzler-Koeffizient": "https://raw.githubusercontent.com/martinantonmueller/presentations/refs/heads/main/2025-03-20_innsbruck/csv/schnitzler-koeffizient.csv"
    };

    // Funktion zur Initialisierung eines Charts in einem bestimmten Container
    function initChart(containerId, dropdownId) {
        const container = document.getElementById(containerId);
        if (!container) {
            console.error('Container with id ' + containerId + ' not found.');
            return;
        }
        
        // Dropdown zur CSV-Auswahl erstellen
        const csvDropdown = document.createElement('select');
        csvDropdown.id = dropdownId;
        for (const [label, url] of Object.entries(csvFiles)) {
            const option = document.createElement('option');
            option.value = url;
            option.textContent = label;
            csvDropdown.appendChild(option);
        }
        // Dropdown oberhalb des Chart-Containers einfügen
        container.parentNode.insertBefore(csvDropdown, container);

        // Container-Styles für den Chart
        container.style.display = 'flex'; 
        container.style.justifyContent = 'center'; 
        container.style.alignItems = 'center'; 

        const resizeChartContainer = () => {
            container.style.width = '100%';
            container.style.height = window.innerHeight * 0.6 + 'px';
            container.style.margin = '0';
            // Falls ein Chart-Objekt existiert, reflow
            container.chartInstance && container.chartInstance.reflow();
        };

        resizeChartContainer();
        window.addEventListener('resize', resizeChartContainer);

        // Funktion zum Laden und Parsen der CSV-Datei sowie zum Erstellen des Charts
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
                            
                            const nodes = {},
                                  links = [],
                                  nodeCorrespondences = {},
                                  nodeWeightSums = {};
                            const [nodeColor, linkColor, minNodeSize, maxNodeSize, minLinkWidth, maxLinkWidth] =
                                  ['#3785A6', '#A63437', 5, 20, 0.1, 10];

                            // Mapping für spezielle URLs
                            const nodeLinks = {
                                "Hugo von Hofmannsthal": "https://schnitzler-briefe.acdh.oeaw.ac.at/toc_11740.html",
                                "Richard Beer-Hofmann": "https://schnitzler-briefe.acdh.oeaw.ac.at/toc_10863.html",
                                "Hermann Bahr": "https://schnitzler-briefe.acdh.oeaw.ac.at/toc_10815.html",
                                "Felix Salten": "https://schnitzler-briefe.acdh.oeaw.ac.at/toc_2167.html",
                                "Paul Goldmann": "https://schnitzler-briefe.acdh.oeaw.ac.at/toc_11485.html"
                            };

                            // CSV-Daten verarbeiten
                            data.forEach(row => {
                                const [source, target, weight] = [
                                    row.Source?.trim(),
                                    row.Target?.trim(),
                                    parseInt(row.Weight, 10) || 0
                                ];

                                if (!source || !target) {
                                    return console.warn('Row missing source or target:', row);
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

                            // Normalisiere die Knotengrößen basierend auf dem Gewicht
                            const minNodeWeight = Math.min(...Object.values(nodeWeightSums));
                            const maxNodeWeight = Math.max(...Object.values(nodeWeightSums));
                            allNodes.forEach(node => {
                                const totalWeight = nodeWeightSums[node.id];
                                const normalizedSize = minNodeSize + ((totalWeight - minNodeWeight) / (maxNodeWeight - minNodeWeight)) * (maxNodeSize - minNodeSize);
                                node.marker.radius = normalizedSize;
                            });

                            // Normalisiere die Link-Breiten
                            const minLinkWeight = Math.min(...links.map(link => link.value));
                            const maxLinkWeight = Math.max(...links.map(link => link.value));
                            links.forEach(link => {
                                link.width = minLinkWidth + ((link.value - minLinkWeight) / (maxLinkWeight - minLinkWeight)) * (maxLinkWidth - minLinkWidth);
                            });

                            // Erstelle den Chart mit Highcharts in dem spezifizierten Container
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
                                            linkLength: 300,
                                            friction: -0.9
                                        },
                                        dataLabels: {
                                            enabled: true,
                                            linkFormat: '',
                                            allowOverlap: false,
                                            style: { textOutline: 'none',
                                            fontSize: '20px' },
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
                                        fontSize: '20px' },
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
                                exporting: { enabled: false }
                            });
                        },
                        error: error => console.error('Error parsing the CSV file:', error)
                    });
                })
                .catch(error => console.error('Error loading the CSV file:', error));
        };

        // Event-Listener für das Dropdown: Bei Änderung wird die ausgewählte CSV geladen
        csvDropdown.addEventListener('change', () => {
            loadCSV(csvDropdown.value);
        });

        // Initiale CSV-Ladung anhand der ersten Option im Dropdown
        loadCSV(csvDropdown.value);
    }

    // Initialisierung für beide Chart-Container
    initChart('container-ohne-slider-left', 'csvDropdown-left');
    initChart('container-ohne-slider-right', 'csvDropdown-right');
});

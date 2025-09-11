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
                                  ['#000000', '#000000', 5, 20, 1, 15];
                            console.log(`⚙️ Link width range: ${minLinkWidth}-${maxLinkWidth}`);

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

                                // Prüfe ob Link bereits existiert und aggregiere Gewichte
                                const existingLink = links.find(link => 
                                    (link.from === source && link.to === target) ||
                                    (link.from === target && link.to === source)
                                );
                                
                                if (existingLink) {
                                    existingLink.value += weight;
                                    console.log(`🔄 Aggregating: ${source}→${target} now has weight ${existingLink.value}`);
                                } else {
                                    links.push({
                                        from: source,
                                        to: target,
                                        value: weight,
                                        color: linkColor,
                                        width: weight
                                    });
                                }
                            });

                            const allNodes = Object.values(nodes);
                            if (!allNodes.length || !links.length) {
                                console.error('Nodes or links arrays are empty');
                                return;
                            }

                            // Erstelle nodes Array mit zufälligen Startpositionen
                            const dynamicNodes = Object.values(nodes).map((node, index, array) => {
                                // Verteile Knoten initial in einem Kreis um Überlappung zu vermeiden
                                const angle = (index / array.length) * 2 * Math.PI;
                                const radius = 200;
                                return {
                                    ...node,
                                    x: Math.cos(angle) * radius + Math.random() * 50 - 25,
                                    y: Math.sin(angle) * radius + Math.random() * 50 - 25
                                };
                            });

                            // Normalisiere die Knotengrößen basierend auf dem Gewicht
                            const minNodeWeight = Math.min(...Object.values(nodeWeightSums));
                            const maxNodeWeight = Math.max(...Object.values(nodeWeightSums));
                            dynamicNodes.forEach(node => {
                                const totalWeight = nodeWeightSums[node.id];
                                const normalizedSize = minNodeSize + ((totalWeight - minNodeWeight) / (maxNodeWeight - minNodeWeight)) * (maxNodeSize - minNodeSize);
                                node.marker.radius = normalizedSize;
                            });

                            // Normalisiere die Link-Breiten
                            const minLinkWeight = Math.min(...links.map(link => link.value));
                            const maxLinkWeight = Math.max(...links.map(link => link.value));
                            console.log(`📊 Links: ${links.length}, weights: ${minLinkWeight}-${maxLinkWeight}`);
                            
                            // Debug: Prüfe wichtige Verbindungen in allen Ansichten
                            const importantLinks = [
                                ['Paul Goldmann', 'Arthur Schnitzler'],
                                ['Richard Beer-Hofmann', 'Arthur Schnitzler'], 
                                ['Paul Goldmann', 'Richard Beer-Hofmann'],
                                ['Hugo von Hofmannsthal', 'Arthur Schnitzler']
                            ];
                            
                            importantLinks.forEach(([name1, name2]) => {
                                const link = links.find(l => 
                                    (l.from === name1 && l.to === name2) ||
                                    (l.from === name2 && l.to === name1)
                                );
                                if (link) {
                                    console.log(`🔍 ${name1.split(' ').pop()}-${name2.split(' ').pop()}: weight=${link.value}`);
                                }
                            });
                            
                            links.forEach(link => {
                                const normalizedWidth = minLinkWidth + ((link.value - minLinkWeight) / (maxLinkWeight - minLinkWeight)) * (maxLinkWidth - minLinkWidth);
                                link.width = normalizedWidth;
                            });
                            
                            // Debug: Zeige berechnete Breiten für wichtige Verbindungen
                            importantLinks.forEach(([name1, name2]) => {
                                const link = links.find(l => 
                                    (l.from === name1 && l.to === name2) ||
                                    (l.from === name2 && l.to === name1)
                                );
                                if (link) {
                                    console.log(`📏 ${name1.split(' ').pop()}-${name2.split(' ').pop()}: weight=${link.value} → width=${link.width.toFixed(1)}px`);
                                }
                            });
                            
                            // Zeige die 3 dicksten Linien
                            const topLinks = [...links].sort((a, b) => b.value - a.value).slice(0, 3);
                            console.log(`🏆 Top 3 thickest lines:`);
                            topLinks.forEach((link, i) => {
                                console.log(`   ${i+1}. ${link.from.split(' ').pop()}-${link.to.split(' ').pop()}: weight=${link.value} width=${link.width.toFixed(1)}px`);
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
                                xAxis: {
                                    visible: false
                                },
                                yAxis: {
                                    visible: false
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
                                            enableSimulation: true,
                                            type: 'reingold-fruchterman',
                                            initialPositions: 'random',
                                            maxIterations: 500,
                                            gravitationalConstant: 0,
                                            friction: -0.75,
                                            attractiveForce: function(d, k, link) {
                                                // Starke gewichtsbasierte Anziehung
                                                if (!link) return 0;
                                                const weight = link ? link.value || 1 : 1;
                                                // Exponentieller Anstieg für hohe Gewichte
                                                const weightFactor = Math.pow(weight / 10, 1.5);
                                                const force = Math.min(d * 0.02 * weightFactor, 50);
                                                
                                                // Debug: Log high-weight attractions
                                                if (weight >= 30 && Math.random() < 0.01) { // 1% sampling
                                                    console.log(`⚡ Attraction: weight=${weight} factor=${weightFactor.toFixed(2)} force=${force.toFixed(2)}`);
                                                }
                                                
                                                return force;
                                            },
                                            repulsiveForce: function(d, k) {
                                                // Standard Abstoßung aber verstärkt
                                                return (k * k) / Math.max(d, 5);
                                            },
                                            maxSpeed: 100
                                        },
                                        dataLabels: {
                                            enabled: true,
                                            linkFormat: '',
                                            allowOverlap: true,
                                            style: { 
                                                textOutline: '2px white',
                                                fontSize: '16px' 
                                            },
                                            formatter: function () { 
                                                // Zeige nur den Nachnamen
                                                const fullName = this.point.id;
                                                const parts = fullName.split(' ');
                                                return parts[parts.length - 1]; // Letzter Teil = Nachname
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
                                        allowOverlap: true,
                                        style: { 
                                            textOutline: '2px white',
                                            fontSize: '16px' 
                                        },
                                        formatter: function () { 
                                            // Zeige nur den Nachnamen
                                            const fullName = this.point.id;
                                            const parts = fullName.split(' ');
                                            return parts[parts.length - 1]; // Letzter Teil = Nachname
                                        }
                                    },
                                    nodes: dynamicNodes,
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
                        },
                        error: error => console.error('Error parsing the CSV file:', error)
                    });
                })
                .catch(error => console.error('Error loading the CSV file:', error));
        };

        // Event-Listener für das Dropdown: Bei Änderung wird die ausgewählte CSV geladen
        csvDropdown.addEventListener('change', (event) => {
            const selectedText = event.target.options[event.target.selectedIndex].text;
            console.log(`\n🔄 === Wechsel zu: ${selectedText} ===`);
            loadCSV(csvDropdown.value);
        });

        // Initiale CSV-Ladung anhand der ersten Option im Dropdown
        loadCSV(csvDropdown.value);
    }

    // Initialisierung für Chart-Container
    // Prüfe welche Container existieren und initialisiere entsprechend
    if (document.getElementById('container-ohne-slider')) {
        initChart('container-ohne-slider', 'csvDropdown-ohne-slider');
    }
    if (document.getElementById('container-ohne-slider-left')) {
        initChart('container-ohne-slider-left', 'csvDropdown-left');
    }
    if (document.getElementById('container-ohne-slider-right')) {
        initChart('container-ohne-slider-right', 'csvDropdown-right');
    }
});

document.addEventListener('DOMContentLoaded', () => {
    console.log('Document is ready');

    // Liste der verfügbaren CSV-Dateien (Label: URL)
    const csvFiles = {
        "Archivstücke": "https://raw.githubusercontent.com/martinantonmueller/presentations/refs/heads/main/2025-03-20_innsbruck/csv/archivstuecke.csv",
        "Verhältnis 1:1": "https://raw.githubusercontent.com/martinantonmueller/presentations/refs/heads/main/2025-03-20_innsbruck/csv/staerkere-seite.csv",
        "Schnitzler-Koeffizient": "https://raw.githubusercontent.com/martinantonmueller/presentations/refs/heads/main/2025-03-20_innsbruck/csv/schnitzler-koeffizient.csv"
    };

    // Mapping für spezielle URLs
    const nodeLinks = {
        "Hugo von Hofmannsthal": "https://schnitzler-briefe.acdh.oeaw.ac.at/toc_11740.html",
        "Richard Beer-Hofmann": "https://schnitzler-briefe.acdh.oeaw.ac.at/toc_10863.html",
        "Hermann Bahr": "https://schnitzler-briefe.acdh.oeaw.ac.at/toc_10815.html",
        "Felix Salten": "https://schnitzler-briefe.acdh.oeaw.ac.at/toc_2167.html",
        "Paul Goldmann": "https://schnitzler-briefe.acdh.oeaw.ac.at/toc_11485.html"
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
        csvDropdown.style.marginBottom = '10px';
        for (const [label, url] of Object.entries(csvFiles)) {
            const option = document.createElement('option');
            option.value = url;
            option.textContent = label;
            csvDropdown.appendChild(option);
        }
        // Dropdown oberhalb des Chart-Containers einfügen
        container.parentNode.insertBefore(csvDropdown, container);

        // Container-Styles für den Chart
        container.style.display = 'block'; 
        container.style.width = '100%';
        container.style.height = window.innerHeight * 0.6 + 'px';
        container.style.border = '1px solid #ccc';

        const width = container.offsetWidth;
        const height = container.offsetHeight;

        // D3 SVG erstellen
        const svg = d3.select(`#${containerId}`)
            .append('svg')
            .attr('width', width)
            .attr('height', height);

        // Zoom-Verhalten hinzufügen
        const zoom = d3.zoom()
            .scaleExtent([0.1, 3])
            .on('zoom', (event) => {
                g.attr('transform', event.transform);
            });

        svg.call(zoom);

        // Haupt-Gruppe für zoombare Elemente
        const g = svg.append('g');

        // Simulation für Kräfte
        const simulation = d3.forceSimulation()
            .force('link', d3.forceLink().id(d => d.id).distance(100))
            .force('charge', d3.forceManyBody().strength(0))
            .force('center', d3.forceCenter(width / 2, height / 2));

        // Funktion zum Laden und Parsen der CSV-Datei sowie zum Erstellen des Charts
        const loadCSV = (csvUrl) => {
            console.log('Loading CSV from:', csvUrl);
            fetch(csvUrl)
                .then(response => response.ok ? response.text() : Promise.reject('Network response was not ok ' + response.statusText))
                .then(csvText => {
                    console.log('CSV file loaded successfully, length:', csvText.length);
                    console.log('First 500 characters:', csvText.substring(0, 500));
                    Papa.parse(csvText, {
                        header: true,
                        complete: ({ data }) => {
                            if (!data.length) {
                                console.error('Parsed data is empty or incorrectly formatted');
                                return;
                            }
                            
                            const nodes = new Map();
                            const links = [];
                            const nodeCorrespondences = {};
                            const nodeWeightSums = {};

                            // CSV-Daten verarbeiten
                            data.forEach(row => {
                                const source = row.Source?.trim();
                                const target = row.Target?.trim();
                                const weight = parseInt(row.Weight, 10) || 0;

                                if (!source || !target) {
                                    return console.warn('Row missing source or target:', row);
                                }

                                // Debug: Log Paul Goldmann connections
                                if (source === 'Paul Goldmann' || target === 'Paul Goldmann') {
                                    console.log('Paul Goldmann connection:', source, '→', target, 'weight:', weight);
                                }

                                if (!nodes.has(source)) {
                                    nodes.set(source, {
                                        id: source,
                                        url: nodeLinks[source] || null
                                    });
                                    nodeCorrespondences[source] = {};
                                    nodeWeightSums[source] = 0;
                                }

                                if (!nodes.has(target)) {
                                    nodes.set(target, {
                                        id: target,
                                        url: nodeLinks[target] || null
                                    });
                                    nodeCorrespondences[target] = {};
                                    nodeWeightSums[target] = 0;
                                }

                                nodeCorrespondences[source][target] = (nodeCorrespondences[source][target] || 0) + weight;
                                nodeCorrespondences[target][source] = (nodeCorrespondences[target][source] || 0) + weight;

                                nodeWeightSums[source] += weight;
                                nodeWeightSums[target] += weight;

                                links.push({
                                    source: source,
                                    target: target,
                                    weight: weight
                                });
                            });

                            // Nodes Array für D3
                            const nodesArray = Array.from(nodes.values());
                            
                            // Sortiere Knoten alphabetisch für konsistente Positionierung
                            const sortedNodes = nodesArray.sort((a, b) => a.id.localeCompare(b.id));
                            const nodeCount = sortedNodes.length;
                            const radius = 250;
                            const centerX = width / 2;
                            const centerY = height / 2;

                            // Weise feste Positionen zu
                            sortedNodes.forEach((node, index) => {
                                const angle = (index / nodeCount) * 2 * Math.PI;
                                node.fx = centerX + radius * Math.cos(angle); // fx = fixed x position
                                node.fy = centerY + radius * Math.sin(angle); // fy = fixed y position
                            });

                            // Normalisiere die Knotengrößen basierend auf dem Gewicht
                            const minNodeWeight = Math.min(...Object.values(nodeWeightSums));
                            const maxNodeWeight = Math.max(...Object.values(nodeWeightSums));
                            const minNodeSize = 5;
                            const maxNodeSize = 20;

                            sortedNodes.forEach(node => {
                                const totalWeight = nodeWeightSums[node.id];
                                const normalizedSize = minNodeSize + ((totalWeight - minNodeWeight) / (maxNodeWeight - minNodeWeight)) * (maxNodeSize - minNodeSize);
                                node.radius = normalizedSize;
                            });

                            // Normalisiere die Link-Breiten
                            const minLinkWeight = Math.min(...links.map(link => link.weight));
                            const maxLinkWeight = Math.max(...links.map(link => link.weight));
                            const minLinkWidth = 1;
                            const maxLinkWidth = 8;

                            links.forEach(link => {
                                link.width = minLinkWidth + ((link.weight - minLinkWeight) / (maxLinkWeight - minLinkWeight)) * (maxLinkWidth - minLinkWidth);
                            });

                            // Lösche vorherige Visualisierung
                            g.selectAll('*').remove();

                            // Links zeichnen
                            const link = g.append('g')
                                .attr('stroke', '#000')
                                .selectAll('line')
                                .data(links)
                                .join('line')
                                .attr('stroke-width', d => d.width);

                            // Knoten zeichnen
                            const node = g.append('g')
                                .selectAll('circle')
                                .data(sortedNodes)
                                .join('circle')
                                .attr('r', d => d.radius)
                                .attr('fill', '#000')
                                .on('click', (event, d) => {
                                    if (d.url) {
                                        window.open(d.url, '_blank');
                                    }
                                })
                                .call(d3.drag()
                                    .on('start', dragstarted)
                                    .on('drag', dragged)
                                    .on('end', dragended));

                            // Labels hinzufügen - positioniert außerhalb der Knoten
                            const labels = g.append('g')
                                .selectAll('text')
                                .data(sortedNodes)
                                .join('text')
                                .text(d => d.id)
                                .attr('font-size', '16px')
                                .attr('font-family', 'Arial, sans-serif')
                                .attr('text-anchor', 'middle')
                                .attr('dy', d => d.radius + 25) // Label unterhalb des Knotens positionieren
                                .style('pointer-events', 'none')
                                .style('font-weight', 'bold')
                                .style('fill', '#333');

                            // Tooltip für Knoten
                            node.append('title')
                                .text(d => {
                                    const correspondences = nodeCorrespondences[d.id];
                                    let tooltipText = d.id;
                                    for (const target in correspondences) {
                                        tooltipText += `\nBriefe mit ${target}: ${correspondences[target]}`;
                                    }
                                    return tooltipText;
                                });

                            // Simulation aktualisieren
                            simulation
                                .nodes(sortedNodes)
                                .on('tick', ticked);

                            simulation.force('link')
                                .links(links);

                            function ticked() {
                                link
                                    .attr('x1', d => d.source.x)
                                    .attr('y1', d => d.source.y)
                                    .attr('x2', d => d.target.x)
                                    .attr('y2', d => d.target.y);

                                node
                                    .attr('cx', d => d.x)
                                    .attr('cy', d => d.y);

                                labels
                                    .attr('x', d => d.x)
                                    .attr('y', d => d.y);
                            }

                            function dragstarted(event, d) {
                                if (!event.active) simulation.alphaTarget(0.3).restart();
                                d.fx = d.x;
                                d.fy = d.y;
                            }

                            function dragged(event, d) {
                                d.fx = event.x;
                                d.fy = event.y;
                            }

                            function dragended(event, d) {
                                if (!event.active) simulation.alphaTarget(0);
                                // Knoten bleiben an festen Positionen - fx und fy nicht auf null setzen
                            }
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
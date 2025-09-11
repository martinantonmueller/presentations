document.addEventListener('DOMContentLoaded', () => {
    console.log('🚀 Document is ready - initializing chart');
    
    // Verhindere mehrfache Initialisierung
    if (window.chartInitialized) {
        console.log('⚠️ Chart already initialized, skipping');
        return;
    }
    window.chartInitialized = true;

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

        // Simulation für Kräfte - komplett deaktiviert für feste Positionen
        const simulation = d3.forceSimulation()
            .force('link', d3.forceLink().id(d => d.id).distance(100).strength(0))
            .force('charge', d3.forceManyBody().strength(0))
            .force('center', null)
            .alphaTarget(0)
            .alpha(0);

        // Funktion zum Laden und Parsen der CSV-Datei sowie zum Erstellen des Charts
        const loadCSV = (csvUrl) => {
            console.log('Loading CSV from:', csvUrl);
            // Vollständige Bereinigung vor neuem Laden
            svg.selectAll('*').remove();
            // G-Element neu erstellen und Zoom wieder anwenden
            const newG = svg.append('g');
            svg.call(zoom);
            // Zoom-Handler auf neues G-Element anwenden
            zoom.on('zoom', (event) => {
                newG.attr('transform', event.transform);
            });
            
            fetch(csvUrl)
                .then(response => response.ok ? response.text() : Promise.reject('Network response was not ok ' + response.statusText))
                .then(csvText => {
                    console.log('CSV file loaded successfully, length:', csvText.length);
                    console.log('First 500 characters:', csvText.substring(0, 500));
                    Papa.parse(csvText, {
                        header: true,
                        complete: ({ data }) => {
                            console.log(`=== Loading ${csvUrl.split('/').pop()} ===`);
                            // Global counter für Debug
                            if (!window.visualizationCounter) window.visualizationCounter = 0;
                            window.visualizationCounter++;
                            console.log(`🔢 Visualization call #${window.visualizationCounter}`);
                            
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

                                // Debug: Log very high weight connections only
                                if (weight > 50) {
                                    console.log(`🔍 Very high weight: ${source}→${target} weight:${weight}`);
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
                            
                            // Minimal dataset info
                            const weights = links.map(l => l.weight);
                            const maxWeight = Math.max(...weights);
                            if (maxWeight > 80) {
                                console.log(`📊 Dataset: ${links.length} links, max weight: ${maxWeight}`);
                            }
                            
                            // Sortiere Knoten alphabetisch für konsistente Positionierung
                            const sortedNodes = nodesArray.sort((a, b) => a.id.localeCompare(b.id));
                            
                            // Debug: Log sorted nodes
                            console.log('Sorted nodes:', sortedNodes.map(n => n.id));
                            const nodeCount = sortedNodes.length;
                            const radius = 250;
                            const centerX = width / 2;
                            const centerY = height / 2;

                            // Weise feste Positionen zu
                            sortedNodes.forEach((node, index) => {
                                const angle = (index / nodeCount) * 2 * Math.PI;
                                node.x = centerX + radius * Math.cos(angle);
                                node.y = centerY + radius * Math.sin(angle);
                                node.fx = node.x; // fx = fixed x position
                                node.fy = node.y; // fy = fixed y position
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
                                link.width = minLinkWidth + ((link.weight - minLinkWeight) / (maxLinkWeight - minLinkWeight || 1)) * (maxLinkWidth - minLinkWidth);
                            });
                            
                            // Minimal width calculation info
                            if (maxLinkWeight > 80) {
                                console.log(`🔗 Width: ${minLinkWeight}-${maxLinkWeight} → ${minLinkWidth}-${maxLinkWidth}px`);
                            }

                            // Lösche vorherige Visualisierung komplett
                            newG.selectAll('*').remove();

                            // Links zeichnen
                            const linkGroup = newG.append('g').attr('class', 'links');
                            const link = linkGroup
                                .selectAll('line')
                                .data(links)
                                .enter()
                                .append('line')
                                .attr('stroke', '#000')
                                .attr('stroke-width', d => d.width);

                            // Knoten zeichnen
                            const nodeGroup = newG.append('g').attr('class', 'nodes');
                            const node = nodeGroup
                                .selectAll('circle')
                                .data(sortedNodes)
                                .enter()
                                .append('circle')
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

                            // Knoten-Labels hinzufügen - positioniert außerhalb der Knoten
                            const labelsGroup = newG.append('g').attr('class', 'labels');
                            const labels = labelsGroup
                                .selectAll('text')
                                .data(sortedNodes)
                                .enter()
                                .append('text')
                                .text(d => d.id)
                                .attr('font-size', '16px')
                                .attr('font-family', 'Arial, sans-serif')
                                .attr('text-anchor', 'middle')
                                .attr('dy', d => d.radius + 25) // Label unterhalb des Knotens positionieren
                                .style('pointer-events', 'none')
                                .style('font-weight', 'bold')
                                .style('fill', '#333');

                            // Kanten-Labels hinzufügen (Gewichtswerte)
                            const linkLabelsGroup = newG.append('g').attr('class', 'link-labels');
                            
                            // Lösche alle vorherigen Label-Elemente explizit
                            linkLabelsGroup.selectAll('*').remove();
                            
                            // Labels werden neu erstellt
                            
                            // Weißer Hintergrund für Labels - dynamische Größe basierend auf Textlänge
                            const linkLabelBg = linkLabelsGroup
                                .selectAll('rect')
                                .data(links)
                                .enter()
                                .append('rect')
                                .attr('rx', 4)
                                .attr('ry', 4)
                                .attr('width', d => {
                                    const textLength = d.weight.toString().length;
                                    let rectWidth;
                                    if (textLength === 1) {
                                        rectWidth = 30; // Einstellig: "5" 
                                    } else if (textLength === 2) {
                                        rectWidth = 46; // Zweistellig: "24"
                                    } else if (textLength === 3) {
                                        rectWidth = 68; // Dreistellig: "156" - deutlich mehr Platz
                                    } else {
                                        rectWidth = textLength * 20 + 16; // Noch größer mit mehr Padding
                                    }
                                    // Log only very large weights to reduce spam
                                    if (d.weight >= 50) {
                                        // Removed debug output to reduce console noise
                                    }
                                    return rectWidth;
                                })
                                .attr('height', 22)
                                .style('fill', 'white')
                                .style('stroke', 'none')
                                .style('filter', 'drop-shadow(0px 1px 2px rgba(0,0,0,0.3))');

                            const linkLabels = linkLabelsGroup
                                .selectAll('text')
                                .data(links)
                                .enter()
                                .append('text')
                                .text(d => d.weight)
                                .attr('font-size', '16px')
                                .attr('font-family', 'Arial, sans-serif')
                                .attr('text-anchor', 'middle')
                                .attr('dy', '0.35em')
                                .style('pointer-events', 'none')
                                .style('font-weight', 'bold')
                                .style('fill', '#000');
                            
                            // Labels erfolgreich erstellt

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

                            // Setze Positionen ohne Simulation
                            link
                                .attr('x1', d => {
                                    const sourceNode = sortedNodes.find(n => n.id === d.source);
                                    return sourceNode ? sourceNode.x : 0;
                                })
                                .attr('y1', d => {
                                    const sourceNode = sortedNodes.find(n => n.id === d.source);
                                    return sourceNode ? sourceNode.y : 0;
                                })
                                .attr('x2', d => {
                                    const targetNode = sortedNodes.find(n => n.id === d.target);
                                    return targetNode ? targetNode.x : 0;
                                })
                                .attr('y2', d => {
                                    const targetNode = sortedNodes.find(n => n.id === d.target);
                                    return targetNode ? targetNode.y : 0;
                                });

                            node
                                .attr('cx', d => d.x)
                                .attr('cy', d => d.y);

                            labels
                                .attr('x', d => d.x)
                                .attr('y', d => d.y);

                            // Positioniere Kanten-Labels und Hintergründe in der Mitte der Linien
                            linkLabelBg
                                .attr('x', d => {
                                    const sourceNode = sortedNodes.find(n => n.id === d.source);
                                    const targetNode = sortedNodes.find(n => n.id === d.target);
                                    const textLength = d.weight.toString().length;
                                    let rectWidth;
                                    if (textLength === 1) {
                                        rectWidth = 30;
                                    } else if (textLength === 2) {
                                        rectWidth = 46;
                                    } else if (textLength === 3) {
                                        rectWidth = 68;
                                    } else {
                                        rectWidth = textLength * 20 + 16;
                                    }
                                    return sourceNode && targetNode ? (sourceNode.x + targetNode.x) / 2 - rectWidth/2 : -rectWidth/2;
                                })
                                .attr('y', d => {
                                    const sourceNode = sortedNodes.find(n => n.id === d.source);
                                    const targetNode = sortedNodes.find(n => n.id === d.target);
                                    return sourceNode && targetNode ? (sourceNode.y + targetNode.y) / 2 - 11 : -11;
                                });

                            linkLabels
                                .attr('x', d => {
                                    const sourceNode = sortedNodes.find(n => n.id === d.source);
                                    const targetNode = sortedNodes.find(n => n.id === d.target);
                                    return sourceNode && targetNode ? (sourceNode.x + targetNode.x) / 2 : 0;
                                })
                                .attr('y', d => {
                                    const sourceNode = sortedNodes.find(n => n.id === d.source);
                                    const targetNode = sortedNodes.find(n => n.id === d.target);
                                    return sourceNode && targetNode ? (sourceNode.y + targetNode.y) / 2 : 0;
                                });

                            // Simulation für Drag-Funktionalität
                            simulation
                                .nodes(sortedNodes)
                                .force('link')
                                .links(links);

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
        csvDropdown.addEventListener('change', (event) => {
            const selectedValue = event.target.value;
            const selectedText = event.target.options[event.target.selectedIndex].text;
            console.log(`🔄 Loading: ${selectedText}`);
            loadCSV(selectedValue);
        });

        // Initiale CSV-Ladung anhand der ersten Option im Dropdown
        loadCSV(csvDropdown.value);
    }

    // Initialisierung für Chart-Container
    initChart('container-ohne-slider', 'csvDropdown-ohne-slider');
});
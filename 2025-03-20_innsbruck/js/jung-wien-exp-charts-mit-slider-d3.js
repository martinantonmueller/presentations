document.addEventListener('DOMContentLoaded', () => {
    console.log('Document is ready');

    // Lese URL-Parameter, z. B. ?year=1900
    const params = new URLSearchParams(window.location.search);
    const urlYear = params.get('year');

    // Liste der verfügbaren CSV-Dateien
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

    // Wir speichern für jede Instanz die Update-Funktion
    const instances = [];

    // Diese Funktion initialisiert eine Instanz im Container mit eigener CSV-Dropdown
    function initChartWithSlider(containerId, dropdownId) {
        const container = document.getElementById(containerId);
        if (!container) {
            console.error('Container nicht gefunden: ' + containerId);
            return;
        }

        // Erstelle CSV-Dropdown und füge es oberhalb des Containers ein
        const csvDropdown = document.createElement('select');
        csvDropdown.id = dropdownId;
        csvDropdown.style.marginBottom = '10px';
        for (const [label, url] of Object.entries(csvFiles)) {
            const option = document.createElement('option');
            option.value = url;
            option.textContent = label;
            csvDropdown.appendChild(option);
        }
        container.parentNode.insertBefore(csvDropdown, container);

        // Container-Styles
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

        // Zoom-Verhalten
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
            .force('link', d3.forceLink().id(d => d.id).distance(80).strength(0))
            .force('charge', d3.forceManyBody().strength(0))
            .force('center', null)
            .alphaTarget(0)
            .alpha(0);

        let allData = []; // Speichere alle Daten für Jahr-Filterung

        // Funktion zur Aktualisierung basierend auf Jahr
        const updateVisualizationByYear = (year) => {
            if (!allData.length) return;

            // Filtere Daten nach Jahr (falls Datum verfügbar)
            const filteredData = allData.filter(row => {
                if (row.Date) {
                    const rowYear = new Date(row.Date).getFullYear();
                    return rowYear <= year;
                }
                return true; // Zeige Daten ohne Datum immer an
            });

            createVisualization(filteredData);
        };

        // Funktion zum Erstellen der Visualisierung
        const createVisualization = (data) => {
            const nodes = new Map();
            const links = [];
            const nodeCorrespondences = {};
            const nodeWeightSums = {};

            // Daten verarbeiten
            data.forEach(row => {
                const source = row.Source?.trim();
                const target = row.Target?.trim();
                const weight = parseInt(row.Weight, 10) || 0;

                if (!source || !target) return;

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
            const radius = 200; // Kleinerer Radius für Slider-Version
            const centerX = width / 2;
            const centerY = height / 2;

            // Weise feste Positionen zu
            sortedNodes.forEach((node, index) => {
                const angle = (index / nodeCount) * 2 * Math.PI;
                node.x = centerX + radius * Math.cos(angle);
                node.y = centerY + radius * Math.sin(angle);
                node.fx = node.x;
                node.fy = node.y;
            });

            // Normalisiere die Knotengrößen
            if (Object.keys(nodeWeightSums).length > 0) {
                const minNodeWeight = Math.min(...Object.values(nodeWeightSums));
                const maxNodeWeight = Math.max(...Object.values(nodeWeightSums));
                const minNodeSize = 4;
                const maxNodeSize = 16;

                sortedNodes.forEach(node => {
                    const totalWeight = nodeWeightSums[node.id] || 0;
                    const normalizedSize = minNodeSize + ((totalWeight - minNodeWeight) / (maxNodeWeight - minNodeWeight || 1)) * (maxNodeSize - minNodeSize);
                    node.radius = normalizedSize;
                });
            }

            // Normalisiere die Link-Breiten
            if (links.length > 0) {
                const minLinkWeight = Math.min(...links.map(link => link.weight));
                const maxLinkWeight = Math.max(...links.map(link => link.weight));
                const minLinkWidth = 1;
                const maxLinkWidth = 6;

                links.forEach(link => {
                    link.width = minLinkWidth + ((link.weight - minLinkWeight) / (maxLinkWeight - minLinkWeight || 1)) * (maxLinkWidth - minLinkWidth);
                });
            }

            // Lösche vorherige Visualisierung
            g.selectAll('*').remove();

            if (sortedNodes.length === 0) return;

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
                .attr('r', d => d.radius || 5)
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

            // Knoten-Labels hinzufügen
            const labels = g.append('g')
                .selectAll('text')
                .data(sortedNodes)
                .join('text')
                .text(d => d.id)
                .attr('font-size', '14px')
                .attr('font-family', 'Arial, sans-serif')
                .attr('text-anchor', 'middle')
                .attr('dy', d => (d.radius || 5) + 20)
                .style('pointer-events', 'none')
                .style('font-weight', 'bold')
                .style('fill', '#333');

            // Kanten-Labels hinzufügen (Gewichtswerte)
            const linkLabelsGroup = g.append('g');
            
            // Weißer Hintergrund für Labels - dynamische Größe basierend auf Textlänge
            const linkLabelBg = linkLabelsGroup
                .selectAll('rect')
                .data(links)
                .join('rect')
                .attr('rx', 3)
                .attr('ry', 3)
                .attr('width', d => {
                    const textLength = d.weight.toString().length;
                    if (textLength === 1) return 30;      // Einstellig: "5"
                    else if (textLength === 2) return 42; // Zweistellig: "24"  
                    else if (textLength === 3) return 54; // Dreistellig: "156"
                    else return textLength * 14 + 16;     // Noch größer
                })
                .attr('height', 18)
                .style('fill', 'white')
                .style('stroke', '#333')
                .style('stroke-width', 1.5)
                .style('opacity', 0.9);

            const linkLabels = linkLabelsGroup
                .selectAll('text')
                .data(links)
                .join('text')
                .text(d => d.weight)
                .attr('font-size', '12px')
                .attr('font-family', 'Arial, sans-serif')
                .attr('text-anchor', 'middle')
                .attr('dy', '0.35em')
                .style('pointer-events', 'none')
                .style('font-weight', 'bold')
                .style('fill', '#000');

            // Tooltip für Knoten
            node.append('title')
                .text(d => {
                    const correspondences = nodeCorrespondences[d.id] || {};
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
                    if (textLength === 1) rectWidth = 30;
                    else if (textLength === 2) rectWidth = 42; 
                    else if (textLength === 3) rectWidth = 54;
                    else rectWidth = textLength * 14 + 16;
                    return sourceNode && targetNode ? (sourceNode.x + targetNode.x) / 2 - rectWidth/2 : -rectWidth/2;
                })
                .attr('y', d => {
                    const sourceNode = sortedNodes.find(n => n.id === d.source);
                    const targetNode = sortedNodes.find(n => n.id === d.target);
                    return sourceNode && targetNode ? (sourceNode.y + targetNode.y) / 2 - 9 : -9;
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
            }
        };

        // Funktion zum Laden der CSV-Daten
        const loadCSV = (csvUrl) => {
            fetch(csvUrl)
                .then(response => response.ok ? response.text() : Promise.reject('Network response was not ok'))
                .then(csvText => {
                    Papa.parse(csvText, {
                        header: true,
                        complete: ({ data }) => {
                            allData = data.filter(row => row.Source && row.Target);
                            const currentYear = parseInt(document.getElementById('globalYearField')?.value || '1931', 10);
                            updateVisualizationByYear(currentYear);
                        },
                        error: error => console.error('Error parsing CSV:', error)
                    });
                })
                .catch(error => console.error('Error loading CSV:', error));
        };

        // Event-Listener für das Dropdown
        csvDropdown.addEventListener('change', () => {
            loadCSV(csvDropdown.value);
        });

        // Speichere Update-Funktion für globales Jahr-Update
        instances.push(updateVisualizationByYear);

        // Initiale Ladung
        loadCSV(csvDropdown.value);
    }

    // Initialisiere beide Chart-Container
    initChartWithSlider('container-mit-slider-left', 'csvDropdown-left');
    initChartWithSlider('container-mit-slider-right', 'csvDropdown-right');

    // Globales Jahresfeld-Event
    const globalYearField = document.getElementById('globalYearField');
    if (globalYearField) {
        // Setze URL-Parameter falls vorhanden
        if (urlYear && !isNaN(parseInt(urlYear, 10))) {
            globalYearField.value = urlYear;
        }

        globalYearField.addEventListener('input', () => {
            const year = parseInt(globalYearField.value, 10);
            instances.forEach(updateFunc => updateFunc(year));
        });
    }
});
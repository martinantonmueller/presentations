document.addEventListener('DOMContentLoaded', () => {
    console.log('Document is ready');
    
    const containerOhneSlider = document.getElementById('container-ohne-slider');
    containerOhneSlider.style.display = 'flex'; // Use flexbox
    containerOhneSlider.style.justifyContent = 'center'; // Center the chart horizontally
    containerOhneSlider.style.alignItems = 'center'; // Center the chart vertically
    
    const resizeChartContainer = () => {
        if (containerOhneSlider) {
            containerOhneSlider.style.width = '100%'; // Take full width
            containerOhneSlider.style.height = window.innerHeight * 0.6 + 'px';
            containerOhneSlider.style.margin = '0'; // Remove any margins
            window.chart ?.reflow();
        } else {
            console.error('Container not found');
        }
    };
    
    resizeChartContainer();
    window.addEventListener('resize', resizeChartContainer);
    
    const loadCSV = (csvUrl) => {
        fetch(csvUrl).then(response => response.ok ? response.text(): Promise.reject('Network response was not ok ' + response.statusText)).then(csvText => {
            console.log('CSV file content:', csvText);
            
            Papa.parse(csvText, {
                header: true,
                complete: ({
                    data
                }) => {
                    if (! data.length) return console.error('Parsed data is empty or incorrectly formatted');
                    
                    const nodes = {
                    },
                    links =[], nodeCorrespondences = {
                    },
                    nodeWeightSums = {
                    };
                    const[nodeColor, linkColor, minNodeSize, maxNodeSize, minLinkWidth, maxLinkWidth] =[ '#3785A6', '#A63437', 5, 20, 0.1, 10];
                    
                    // Mapping for specific URLs
                    const nodeLinks = {
                        "Hugo von Hofmannsthal": "https://schnitzler-briefe.acdh.oeaw.ac.at/toc_11740.html",
                        "Richard Beer-Hofmann": "https://schnitzler-briefe.acdh.oeaw.ac.at/toc_10863.html",
                        "Hermann Bahr": "https://schnitzler-briefe.acdh.oeaw.ac.at/toc_10815.html",
                        "Felix Salten": "https://schnitzler-briefe.acdh.oeaw.ac.at/toc_2167.html",
                        "Paul Goldmann": "https://schnitzler-briefe.acdh.oeaw.ac.at/toc_11485.html"
                    };
                    
                    // Process the data
                    data.forEach(row => {
                        const[source, target, weight] =[
                        row.Source ?.trim(),
                        row.Target ?.trim(),
                        parseInt(row.Weight, 10) || 0];
                        
                        if (! source || ! target) return console.warn('Row missing source or target:', row);
                        
                        // Initialize nodes and correspondence data if not already done
                        if (! nodes[source]) {
                            nodes[source] = {
                                id: source,
                                marker: {
                                    fillColor: nodeColor
                                },
                                url: nodeLinks[source] || null
                            };
                            nodeCorrespondences[source] = {
                            };
                            nodeWeightSums[source] = 0;
                        }
                        
                        if (! nodes[target]) {
                            nodes[target] = {
                                id: target,
                                marker: {
                                    fillColor: nodeColor
                                },
                                url: nodeLinks[target] || null
                            };
                            nodeCorrespondences[target] = {
                            };
                            nodeWeightSums[target] = 0;
                        }
                        
                        // Accumulate correspondence weight and sum of weights
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
                    
                    if (! allNodes.length || ! links.length) return console.error('Nodes or links arrays are empty');
                    
                    // Normalize node sizes based on total weight sum
                    const minNodeWeight = Math.min(...Object.values(nodeWeightSums));
                    const maxNodeWeight = Math.max(...Object.values(nodeWeightSums));
                    
                    allNodes.forEach(node => {
                        const totalWeight = nodeWeightSums[node.id];
                        const normalizedSize = minNodeSize + ((totalWeight - minNodeWeight) / (maxNodeWeight - minNodeWeight)) * (maxNodeSize - minNodeSize);
                        node.marker.radius = normalizedSize;
                    });
                    
                    // Normalize link width based on weight
                    const minLinkWeight = Math.min(...links.map(link => link.value));
                    const maxLinkWeight = Math.max(...links.map(link => link.value));
                    
                    links.forEach(link => {
                        link.width = minLinkWidth + ((link.value - minLinkWeight) / (maxLinkWeight - minLinkWeight)) * (maxLinkWidth - minLinkWidth);
                    });
                    
                    window.chart = Highcharts.chart('container-ohne-slider', {
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
                                    const correspondences = nodeCorrespondences[ this.point.id];
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
                                keys:[ 'from', 'to'],
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
                        series:[ {
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
                },
                error: error => console.error('Error parsing the CSV file:', error)
            });
        }). catch (error => console.error('Error loading the CSV file:', error));
    };
    
    // Load the CSV file from the provided URL
    loadCSV('https://raw.githubusercontent.com/arthur-schnitzler/schnitzler-briefe-charts/main/netzwerke/jung-wien-exp/jung-wien-ist-alle-per-year.csv');
});
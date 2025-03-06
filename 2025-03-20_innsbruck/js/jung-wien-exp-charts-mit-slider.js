document.addEventListener('DOMContentLoaded', () => {
    console.log('Document is ready');
    
    const containerMitSlider = document.getElementById('container-mit-slider');
    containerMitSlider.style.display = 'flex';
    containerMitSlider.style.justifyContent = 'center';
    containerMitSlider.style.alignItems = 'center';
    containerMitSlider.style.width = '100%';
    containerMitSlider.style.height = '600px'; // Ensures a fixed height
    
    const slider = document.getElementById('yearSlider');
    const yearDisplay = document.getElementById('yearDisplay');
    
    const resizeChartContainer = () => {
        if (containerMitSlider) {
            containerMitSlider.style.width = '100%';
            containerMitSlider.style.height = window.innerHeight * 0.6 + 'px';
            containerMitSlider.style.margin = '0';
            window.chartMitSlider ?.reflow();
        } else {
            console.error('Container not found');
        }
    };
    
    resizeChartContainer();
    window.addEventListener('resize', resizeChartContainer);
    
    let dataByYear = {
    };
    
    const loadCSV = (csvUrl) => {
        fetch(csvUrl).then(response => response.ok ? response.text(): Promise.reject('Network response was not ok ' + response.statusText)).then(csvText => {
            console.log('CSV file content:', csvText);
            
            Papa.parse(csvText, {
                header: true,
                complete: ({ data
                }) => {
                    if (! data.length) return console.error('Parsed data is empty or incorrectly formatted');
                    
                    dataByYear = data.reduce((acc, row) => {
                        const year = parseInt(row.Year, 10);
                        if (! acc[year]) acc[year] =[];
                        acc[year].push(row);
                        return acc;
                    }, {
                    });
                    
                    console.log('Data for 1890:', dataByYear[1890]);
                    
                    slider.min = 1890;
                    slider.max = 1931;
                    slider.value = 1900;
                    yearDisplay.textContent = 1900;
                    
                    // Create initial chart after a brief delay to ensure the container is fully ready
                    setTimeout(() => {
                        createChartForYear(1900);
                        forceRedraw();
                    },
                    100);
                },
                error: error => console.error('Error parsing the CSV file:', error)
            });
        }). catch (error => console.error('Error loading the CSV file:', error));
    };
    
    const createChartForYear = (year) => {
        console.log(`Creating chart for year: ${year}`);
        const nodes = {
        },
        links =[], nodeCorrespondences = {
        },
        nodeWeightSums = {
        };
        const[nodeColor, linkColor, minNodeSize, maxNodeSize, minLinkWidth, maxLinkWidth] =[ '#3785A6', '#A63437', 5, 20, 0.1, 10];
        const yearData = dataByYear[year] ||[];
        
        const nodeLinks = {
            "Hugo von Hofmannsthal": "https://schnitzler-briefe.acdh.oeaw.ac.at/toc_11740.html",
            "Richard Beer-Hofmann": "https://schnitzler-briefe.acdh.oeaw.ac.at/toc_10863.html",
            "Hermann Bahr": "https://schnitzler-briefe.acdh.oeaw.ac.at/toc_10815.html",
            "Felix Salten": "https://schnitzler-briefe.acdh.oeaw.ac.at/toc_2167.html",
            "Paul Goldmann": "https://schnitzler-briefe.acdh.oeaw.ac.at/toc_11485.html"
        };
        
        yearData.forEach(row => {
            const[source, target, weight] =[
            row.Source ?.trim(),
            row.Target ?.trim(),
            parseInt(row.Weight, 10) || 0];
            
            if (! source || ! target) return console.warn('Row missing source or target:', row);
            
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
        
        const minNodeWeight = Math.min(...Object.values(nodeWeightSums));
        const maxNodeWeight = Math.max(...Object.values(nodeWeightSums));
        
        allNodes.forEach(node => {
            const totalWeight = nodeWeightSums[node.id];
            const normalizedSize = minNodeSize + ((totalWeight - minNodeWeight) / (maxNodeWeight - minNodeWeight)) * (maxNodeSize - minNodeSize);
            node.marker.radius = normalizedSize;
        });
        
        const minLinkWeight = Math.min(...links.map(link => link.value));
        const maxLinkWeight = Math.max(...links.map(link => link.value));
        
        links.forEach(link => {
            link.width = minLinkWidth + ((link.value - minLinkWeight) / (maxLinkWeight - minLinkWeight)) * (maxLinkWidth - minLinkWidth);
        });
        
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
        
        // Force redraw to ensure the chart renders correctly
        forceRedraw();
    };
    
    const forceRedraw = () => {
        if (window.chartMitSlider) {
            window.chartMitSlider.reflow();
            // Forces the chart to redraw and fit within its container
        }
    };
    
    slider.addEventListener('input', () => {
        const year = parseInt(slider.value, 10);
        yearDisplay.textContent = year;
        createChartForYear(year);
    });
    
    loadCSV('https://raw.githubusercontent.com/arthur-schnitzler/schnitzler-briefe-charts/main/netzwerke/jung-wien-exp/jung-wien-ist-alle-per-year.csv');
});
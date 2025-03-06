document.addEventListener('DOMContentLoaded', () => {
    const csvUrl = 'https://raw.githubusercontent.com/arthur-schnitzler/schnitzler-briefe-charts/main/netzwerke/jung-wien-exp/jung-wien-ist-alle-per-year.csv';
    
    // Gemeinsame Konstanten für das Diagramm
    const nodeColor = '#3785A6',
          linkColor = '#A63437',
          minNodeSize = 5,
          maxNodeSize = 20,
          minLinkWidth = 0.1,
          maxLinkWidth = 10;
    
    // Mapping für spezifische URLs
    const nodeLinks = {
        "Hugo von Hofmannsthal": "https://schnitzler-briefe.acdh.oeaw.ac.at/toc_11740.html",
        "Richard Beer-Hofmann": "https://schnitzler-briefe.acdh.oeaw.ac.at/toc_10863.html",
        "Hermann Bahr": "https://schnitzler-briefe.acdh.oeaw.ac.at/toc_10815.html",
        "Felix Salten": "https://schnitzler-briefe.acdh.oeaw.ac.at/toc_2167.html",
        "Paul Goldmann": "https://schnitzler-briefe.acdh.oeaw.ac.at/toc_11485.html"
    };
    
    // Funktion: CSV-Daten verarbeiten (gemeinsam für beide Diagramme)
    function processData(dataRows) {
        const nodes = {}, links = [], nodeCorrespondences = {}, nodeWeightSums = {};
        
        dataRows.forEach(row => {
            const source = row.Source?.trim(),
                  target = row.Target?.trim(),
                  weight = parseInt(row.Weight, 10) || 0;
            
            if (!source || !target) {
                console.warn('Zeile ohne Source oder Target:', row);
                return;
            }
            
            if (!nodes[source]) {
                nodes[source] = { id: source, marker: { fillColor: nodeColor }, url: nodeLinks[source] || null };
                nodeCorrespondences[source] = {};
                nodeWeightSums[source] = 0;
            }
            if (!nodes[target]) {
                nodes[target] = { id: target, marker: { fillColor: nodeColor }, url: nodeLinks[target] || null };
                nodeCorrespondences[target] = {};
                nodeWeightSums[target] = 0;
            }
            
            nodeCorrespondences[source][target] = (nodeCorrespondences[source][target] || 0) + weight;
            nodeCorrespondences[target][source] = (nodeCorrespondences[target][source] || 0) + weight;
            
            nodeWeightSums[source] += weight;
            nodeWeightSums[target] += weight;
            
            links.push({ from: source, to: target, value: weight, color: linkColor, width: weight });
        });
        
        const allNodes = Object.values(nodes);
        if (!allNodes.length || !links.length) {
            console.error('Nodes oder Links sind leer');
            return null;
        }
        
        // Normalisierung der Knotengrößen
        const minNodeWeight = Math.min(...Object.values(nodeWeightSums)),
              maxNodeWeight = Math.max(...Object.values(nodeWeightSums));
        allNodes.forEach(node => {
            const totalWeight = nodeWeightSums[node.id];
            const normalizedSize = minNodeSize + ((totalWeight - minNodeWeight) / (maxNodeWeight - minNodeWeight)) * (maxNodeSize - minNodeSize);
            node.marker.radius = normalizedSize;
        });
        
        // Normalisierung der Linkbreiten
        const minLinkWeight = Math.min(...links.map(link => link.value)),
              maxLinkWeight = Math.max(...links.map(link => link.value));
        links.forEach(link => {
            link.width = minLinkWidth + ((link.value - minLinkWeight) / (maxLinkWeight - minLinkWeight)) * (maxLinkWidth - minLinkWidth);
        });
        
        return { nodes: allNodes, links, nodeCorrespondences };
    }
    
    // Funktion: Chart-Konfiguration aufbauen
    // linkLength wird als Parameter übergeben, sodass für das Diagramm ohne Slider (300) bzw. mit Slider (100) unterschieden werden kann.
    function buildChartConfig(chartData, linkLength) {
        return {
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
                        const correspondences = chartData.nodeCorrespondences[this.point.id];
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
                        linkLength: linkLength,
                        friction: -0.9
                    },
                    dataLabels: {
                        enabled: true,
                        linkFormat: '',
                        allowOverlap: false,
                        style: { textOutline: 'none' },
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
                    style: { textOutline: 'none' },
                    formatter: function () {
                        return this.point.id;
                    }
                },
                nodes: chartData.nodes,
                data: chartData.links,
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
        };
    }
    
    // Funktion: Container stylen und bei Resize das Diagramm neu anpassen
    function setupContainer(container, reflowCallback) {
        if (!container) {
            console.error('Container nicht gefunden');
            return;
        }
        container.style.display = 'flex';
        container.style.justifyContent = 'center';
        container.style.alignItems = 'center';
        container.style.width = '100%';
        container.style.height = window.innerHeight * 0.6 + 'px';
        
        window.addEventListener('resize', () => {
            container.style.width = '100%';
            container.style.height = window.innerHeight * 0.6 + 'px';
            if (typeof reflowCallback === 'function') {
                reflowCallback();
            }
        });
    }
    
    // Globale Variablen für die beiden Diagramme und die nach Jahr gruppierten Daten
    let chartOhneSlider, chartMitSlider;
    let dataByYear = {};
    
    // CSV-Daten einmal laden und verarbeiten
    fetch(csvUrl)
      .then(response => {
          if (!response.ok) {
              throw new Error('Network response was not ok: ' + response.statusText);
          }
          return response.text();
      })
      .then(csvText => {
          console.log('CSV-Inhalt:', csvText);
          Papa.parse(csvText, {
              header: true,
              complete: (results) => {
                  const data = results.data;
                  if (!data.length) {
                      console.error('CSV-Daten leer oder falsch formatiert');
                      return;
                  }
                  
                  // Diagramm ohne Slider erstellen (alle Daten)
                  const chartData = processData(data);
                  if (chartData) {
                      const containerOhneSlider = document.getElementById('container-ohne-slider');
                      setupContainer(containerOhneSlider, () => { if (chartOhneSlider) chartOhneSlider.reflow(); });
                      chartOhneSlider = Highcharts.chart('container-ohne-slider', buildChartConfig(chartData, 300));
                  }
                  
                  // Daten nach Jahr gruppieren für das Slider-Diagramm
                  dataByYear = data.reduce((acc, row) => {
                      const year = parseInt(row.Year, 10);
                      if (!acc[year]) acc[year] = [];
                      acc[year].push(row);
                      return acc;
                  }, {});
                  console.log('Nach Jahr gruppierte Daten:', dataByYear);
                  
                  // Container und Slider-Elemente für das Diagramm mit Slider initialisieren
                  const containerMitSlider = document.getElementById('container-mit-slider');
                  setupContainer(containerMitSlider, () => { if (chartMitSlider) chartMitSlider.reflow(); });
                  
                  const slider = document.getElementById('yearSlider');
                  const yearDisplay = document.getElementById('yearDisplay');
                  slider.min = 1890;
                  slider.max = 1931;
                  slider.value = 1900;
                  yearDisplay.textContent = 1900;
                  
                  // Initiales Diagramm für das Jahr 1900 erzeugen
                  createChartForYear(1900);
                  
                  slider.addEventListener('input', () => {
                      const year = parseInt(slider.value, 10);
                      yearDisplay.textContent = year;
                      createChartForYear(year);
                  });
              },
              error: error => console.error('Fehler beim Parsen der CSV:', error)
          });
      })
      .catch(error => console.error('Fehler beim Laden der CSV:', error));
    
    // Funktion: Diagramm für ein bestimmtes Jahr (nur für den Slider) erstellen
    function createChartForYear(year) {
        console.log(`Erzeuge Diagramm für das Jahr: ${year}`);
        const yearData = dataByYear[year] || [];
        const chartData = processData(yearData);
        if (chartData) {
            chartMitSlider = Highcharts.chart('container-mit-slider', buildChartConfig(chartData, 100));
        }
    }
});

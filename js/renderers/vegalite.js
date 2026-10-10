/**
 * vegalite.js - Renderer para Vega-Lite (v5) con vega-embed
 * 
 * Implementación de la visualización del cuerpo humano con la gramática declarativa de Vega-Lite.
 * 
 * Decisiones y Dificultades:
 * - Dificultad geométrica: Vega-Lite está diseñado para gráficos estadísticos y mapas geográficos
 *   (GeoJSON/TopoJSON). No admite inyección directa de archivos SVG vectoriales arbitrarios en marcas.
 * - Mecanismo idiomático empleado:
 *   1. Se transforman los paths del SVG maestro a un GeoJSON FeatureCollection de polígonos cerrados
 *      utilizando muestreo geométrico.
 *   2. Se utiliza la marca `geoshape` con proyección `{ type: "identity", reflectY: false }`.
 *   3. Se aplica escala declarativa `scale: { type: "sqrt" }` con condición para zonas con 0 días (gris neutro).
 *   4. La leyenda y tooltips se configuran mediante los canales declarativos de Vega-Lite (`color` y `tooltip`).
 * - Resultado en el estudio: Se clasifica como "Parcial" en el uso del SVG directo por requerir
 *   conversión previa a GeoJSON, pero "Cumple" con creces en la escala declarativa continua sqrt.
 */

import { getBodyGeoJSON, LOCATABLE_ZONES } from '../shared.js';

let currentView = null;
let currentContainer = null;

export async function render(container, aggregatedData, options = {}) {
  currentContainer = container;
  destroy();

  // 1. Obtener la geometría base del cuerpo como GeoJSON
  const baseGeoJSON = await getBodyGeoJSON();

  // 2. Enriquecer cada Feature del GeoJSON con las estadísticas actuales del jugador
  const maxDays = aggregatedData.globalMaxDays || 435;
  const enrichedFeatures = baseGeoJSON.features.map(feat => {
    const zone = feat.properties.zona;
    const zoneData = aggregatedData.locatableZones[zone];
    const days = zoneData ? zoneData.daysLost : 0;
    const count = zoneData ? zoneData.injuryCount : 0;

    let injuriesSummary = 'Sin lesiones';
    if (count > 0 && zoneData.injuries.length > 0) {
      injuriesSummary = zoneData.injuries
        .map(i => `${i.injury} (${i.season}: ${i.days_lost}d)`)
        .join(' | ');
    }

    return {
      ...feat,
      properties: {
        ...feat.properties,
        days_lost: days,
        injury_count: count,
        injuries_summary: injuriesSummary,
        estado: count > 0 ? `${count} lesiones (${days} días)` : 'Sin lesiones'
      }
    };
  });

  const geojsonData = {
    type: 'FeatureCollection',
    features: enrichedFeatures
  };

  // 3. Definir la especificación declarativa de Vega-Lite
  const spec = {
    $schema: 'https://vega.github.io/schema/vega-lite/v5.json',
    description: 'Mapa corporal de lesiones del Liverpool FC en Vega-Lite',
    width: 700,
    height: 530,
    autosize: {
      type: 'fit',
      contains: 'padding'
    },
    layer: [
      // Capa de geometrías corporales
      {
        data: {
          values: geojsonData,
          format: { type: 'json', property: 'features' }
        },
        projection: {
          type: 'identity',
          reflectY: false
        },
        mark: {
          type: 'geoshape',
          stroke: '#94a3b8',
          strokeWidth: 1.2
        },
        encoding: {
          color: {
            condition: {
              test: 'datum.properties.days_lost == 0',
              value: '#e2e8f0'
            },
            field: 'properties.days_lost',
            type: 'quantitative',
            scale: {
              type: 'sqrt',
              domain: [1, maxDays],
              range: ['#fee2e2', '#7f1d1d']
            },
            legend: {
              title: 'Días perdidos (Escala √)',
              orient: 'bottom',
              direction: 'horizontal',
              gradientLength: 240,
              labelFontSize: 10,
              titleFontSize: 11,
              titleFontWeight: 'bold',
              titleColor: '#475569',
              labelColor: '#64748b'
            }
          },
          tooltip: [
            { field: 'properties.zona', type: 'nominal', title: 'Zona' },
            { field: 'properties.injury_count', type: 'quantitative', title: 'Nº Lesiones' },
            { field: 'properties.days_lost', type: 'quantitative', title: 'Total Días' },
            { field: 'properties.injuries_summary', type: 'nominal', title: 'Detalle' }
          ]
        }
      },
      // Capa de texto para títulos "VISTA FRONTAL" y "VISTA POSTERIOR"
      {
        data: {
          values: [
            { x: 175, y: 16, text: 'VISTA FRONTAL' },
            { x: 525, y: 16, text: 'VISTA POSTERIOR' }
          ]
        },
        mark: {
          type: 'text',
          fontSize: 12,
          fontWeight: 'bold',
          fill: '#64748b'
        },
        encoding: {
          x: { field: 'x', type: 'quantitative', scale: { domain: [0, 700] }, axis: null },
          y: { field: 'y', type: 'quantitative', scale: { domain: [0, 540] }, axis: null },
          text: { field: 'text', type: 'nominal' }
        }
      }
    ],
    config: {
      view: { stroke: 'transparent' },
      background: 'transparent'
    }
  };

  // 4. Renderizar con vegaEmbed
  const embedOptions = {
    actions: false,
    renderer: 'svg',
    mode: 'vega-lite'
  };

  try {
    const result = await vegaEmbed(container, spec, embedOptions);
    currentView = result.view;
  } catch (error) {
    console.error('Error al renderizar Vega-Lite:', error);
    container.innerHTML = `<div class="error-msg">Error en Vega-Lite: ${error.message}</div>`;
  }
}

export function destroy() {
  if (currentView) {
    try {
      currentView.finalize();
    } catch (e) {
      // Ignorar excepciones al finalizar view
    }
    currentView = null;
  }
  if (currentContainer) {
    currentContainer.innerHTML = '';
    currentContainer = null;
  }
}

/**
 * plotly.js - Renderer para Plotly.js (v2)
 * 
 * Implementación de la visualización del cuerpo humano con Plotly.js.
 * 
 * Decisiones y Dificultades:
 * - Dificultad principal: Plotly carece de un tipo de serie nativo para mapas vectoriales/SVG arbitrarios
 *   (los coropletas en Plotly requieren GeoJSON con proyecciones geográficas de latitud/longitud).
 * - Mecanismo idiomático empleado:
 *   1. Los paths del SVG maestro se inyectan como `layout.shapes` de tipo 'path'.
 *   2. Se invierte el eje Y (`yaxis: { range: [500, 0] }`) para coincidir con el sistema de coordenadas SVG.
 *   3. Como `layout.shapes` no emite eventos de hover ni tooltips en Plotly, se colocan marcadores
 *      `scatter` transparentes sobre los centroides de cada zona anatómica para capturar el hover.
 *   4. La leyenda de color continua se genera vinculando una barra de color (`marker.colorbar`) a la traza scatter.
 * - Resultado en el estudio: Se clasifica como "Parcial" en el uso del SVG directo y requiere componentes auxiliares.
 */

import { getColorForDays, getSVGPathsMap, getTooltipHTML, LOCATABLE_ZONES } from '../shared.js';

let currentContainer = null;
let activeTooltip = null;

// Centroides calculados de las zonas anatómicas en el lienzo SVG (700x500)
// Permite ubicar los puntos de hover interactivo sobre las figuras frontal y posterior
const ZONE_CENTROIDS = [
  // Vista Frontal
  { zone: 'Cabeza', x: 175, y: 55 },
  { zone: 'Hombro', x: 135, y: 105 },
  { zone: 'Hombro', x: 215, y: 105 },
  { zone: 'Torso', x: 175, y: 135 },
  { zone: 'Brazo', x: 115, y: 170 },
  { zone: 'Brazo', x: 235, y: 170 },
  { zone: 'Mano', x: 105, y: 245 },
  { zone: 'Mano', x: 245, y: 245 },
  { zone: 'Cadera', x: 145, y: 205 },
  { zone: 'Cadera', x: 205, y: 205 },
  { zone: 'Pelvis e Ingle', x: 175, y: 210 },
  { zone: 'Muslo', x: 155, y: 280 },
  { zone: 'Muslo', x: 195, y: 280 },
  { zone: 'Rodilla', x: 155, y: 350 },
  { zone: 'Rodilla', x: 195, y: 350 },
  { zone: 'Pantorrilla', x: 155, y: 400 },
  { zone: 'Pantorrilla', x: 195, y: 400 },
  { zone: 'Tobillo', x: 156, y: 445 },
  { zone: 'Tobillo', x: 194, y: 445 },
  { zone: 'Pie', x: 152, y: 462 },
  { zone: 'Pie', x: 198, y: 462 },

  // Vista Posterior
  { zone: 'Cabeza', x: 525, y: 55 },
  { zone: 'Hombro', x: 485, y: 105 },
  { zone: 'Hombro', x: 565, y: 105 },
  { zone: 'Espalda', x: 525, y: 140 },
  { zone: 'Brazo', x: 465, y: 170 },
  { zone: 'Brazo', x: 585, y: 170 },
  { zone: 'Mano', x: 455, y: 245 },
  { zone: 'Mano', x: 595, y: 245 },
  { zone: 'Cadera', x: 505, y: 210 },
  { zone: 'Cadera', x: 545, y: 210 },
  { zone: 'Muslo', x: 505, y: 280 },
  { zone: 'Muslo', x: 545, y: 280 },
  { zone: 'Rodilla', x: 505, y: 350 },
  { zone: 'Rodilla', x: 545, y: 350 },
  { zone: 'Pantorrilla', x: 505, y: 400 },
  { zone: 'Pantorrilla', x: 545, y: 400 },
  { zone: 'Tobillo', x: 506, y: 445 },
  { zone: 'Tobillo', x: 544, y: 445 },
  { zone: 'Pie', x: 502, y: 462 },
  { zone: 'Pie', x: 548, y: 462 }
];

export async function render(container, aggregatedData, options = {}) {
  destroy();
  currentContainer = container;
  container.innerHTML = '';

  // 1. Obtener la lista de paths desde el SVG maestro
  const { paths } = await getSVGPathsMap();

  // 2. Construir los layout.shapes coloreados según los días perdidos
  const shapes = paths.map(p => {
    const zoneData = aggregatedData.locatableZones[p.zone];
    const days = zoneData ? zoneData.daysLost : 0;
    const fillColor = getColorForDays(days);
    const strokeColor = days > 0 ? '#b91c1c' : '#94a3b8';

    return {
      type: 'path',
      path: p.d,
      fillcolor: fillColor,
      line: {
        color: strokeColor,
        width: days > 0 ? 1.5 : 1.2
      },
      xref: 'x',
      yref: 'y',
      layer: 'below'
    };
  });

  // 3. Preparar los datos para la traza interactiva de scatter sobre centroides
  const maxDays = aggregatedData.globalMaxDays || 435;
  const scatterX = [];
  const scatterY = [];
  const scatterText = [];
  const scatterValues = [];
  const scatterZones = [];

  ZONE_CENTROIDS.forEach(c => {
    const zoneData = aggregatedData.locatableZones[c.zone];
    const days = zoneData ? zoneData.daysLost : 0;
    const count = zoneData ? zoneData.injuryCount : 0;

    scatterX.push(c.x);
    scatterY.push(c.y);
    scatterValues.push(days);
    scatterZones.push(c.zone);

    // Texto enriquecido para el tooltip nativo de Plotly
    if (count > 0) {
      let desc = `<b>${c.zone}</b><br>Lesiones: <b>${count}</b><br>Días perdidos: <b>${days} d</b>`;
      if (zoneData.injuries.length > 0) {
        desc += '<br>-------------------';
        zoneData.injuries.slice(0, 3).forEach(inj => {
          desc += `<br>• ${inj.injury} (${inj.season}) - ${inj.days_lost}d`;
        });
        if (zoneData.injuries.length > 3) {
          desc += `<br><i>+${zoneData.injuries.length - 3} más...</i>`;
        }
      }
      scatterText.push(desc);
    } else {
      scatterText.push(`<b>${c.zone}</b><br>Sin lesiones registradas`);
    }
  });

  // Traza Scatter interactiva con colorbar para la leyenda
  const trace = {
    type: 'scatter',
    mode: 'markers',
    x: scatterX,
    y: scatterY,
    text: scatterText,
    hoverinfo: 'text',
    hoverlabel: {
      bgcolor: '#ffffff',
      bordercolor: '#cbd5e1',
      font: { family: 'system-ui, sans-serif', size: 12, color: '#1e293b' },
      align: 'left'
    },
    marker: {
      size: 26,
      opacity: 0, // Transparente para no cubrir el cuerpo
      color: scatterValues,
      colorscale: [
        [0.0, '#fee2e2'],
        [0.35, '#f87171'],
        [0.65, '#dc2626'],
        [0.85, '#b91c1c'],
        [1.0, '#7f1d1d']
      ],
      cmin: 0,
      cmax: maxDays,
      colorbar: {
        title: {
          text: '<b>Días perdidos (√)</b>',
          side: 'top',
          font: { size: 11, color: '#475569' }
        },
        orientation: 'h',
        x: 0.5,
        xanchor: 'center',
        y: -0.08,
        yanchor: 'bottom',
        len: 0.55,
        thickness: 12,
        tickfont: { size: 10, color: '#64748b' },
        ticksuffix: ' d'
      }
    }
  };

  // 4. Configuración del layout de Plotly
  const layout = {
    width: 700,
    height: 520,
    autosize: false,
    margin: { l: 10, r: 10, t: 25, b: 45 },
    xaxis: {
      range: [0, 700],
      showgrid: false,
      zeroline: false,
      showticklabels: false,
      fixedrange: true,
      autorange: false
    },
    yaxis: {
      range: [540, 0], // Invierte el eje Y para coincidir exactamente con el sistema SVG
      showgrid: false,
      zeroline: false,
      showticklabels: false,
      fixedrange: true,
      autorange: false
    },
    shapes: shapes,
    annotations: [
      {
        x: 175,
        y: 16,
        xref: 'x',
        yref: 'y',
        text: '<b>VISTA FRONTAL</b>',
        showarrow: false,
        font: { size: 12, color: '#64748b', family: 'system-ui, sans-serif' }
      },
      {
        x: 525,
        y: 16,
        xref: 'x',
        yref: 'y',
        text: '<b>VISTA POSTERIOR</b>',
        showarrow: false,
        font: { size: 12, color: '#64748b', family: 'system-ui, sans-serif' }
      }
    ],
    paper_bgcolor: 'transparent',
    plot_bgcolor: 'transparent',
    hovermode: 'closest'
  };

  const config = {
    responsive: false,
    displayModeBar: false
  };

  // 5. Renderizar de forma limpia con Plotly.newPlot
  await Plotly.newPlot(container, [trace], layout, config);

  // 6. Configurar tooltip flotante HTML enriquecido adicional para paridad con D3/ECharts
  setupCustomHTMLTooltip(container, aggregatedData, scatterZones);

  // 7. Soporte para resize responsivo
  resizeHandler = () => {
    if (currentContainer) {
      try {
        Plotly.Plots.resize(currentContainer);
      } catch (e) {}
    }
  };
  window.addEventListener('resize', resizeHandler);
}

let resizeHandler = null;

function setupCustomHTMLTooltip(container, aggregatedData, scatterZones) {
  let tooltip = document.querySelector('.custom-floating-tooltip');
  if (!tooltip) {
    tooltip = document.createElement('div');
    tooltip.className = 'custom-floating-tooltip';
    tooltip.style.opacity = '0';
    tooltip.style.position = 'fixed';
    tooltip.style.pointerEvents = 'none';
    tooltip.style.zIndex = '1000';
    document.body.appendChild(tooltip);
  }
  activeTooltip = tooltip;

  container.on('plotly_hover', function (data) {
    if (data.points && data.points.length > 0) {
      const ptIndex = data.points[0].pointIndex;
      const zone = scatterZones[ptIndex];
      const zoneData = aggregatedData.locatableZones[zone];
      const html = getTooltipHTML(zone, zoneData);

      const event = data.event;
      if (event && tooltip) {
        tooltip.innerHTML = html;
        tooltip.style.opacity = '1';

        const tipWidth = tooltip.offsetWidth || 280;
        const tipHeight = tooltip.offsetHeight || 200;

        let left = event.clientX + 15;
        let top = event.clientY + 15;

        if (left + tipWidth > window.innerWidth - 20) {
          left = event.clientX - tipWidth - 15;
        }
        if (top + tipHeight > window.innerHeight - 20) {
          top = event.clientY - tipHeight - 15;
        }

        tooltip.style.left = left + 'px';
        tooltip.style.top = top + 'px';
      }
    }
  });

  container.on('plotly_unhover', function () {
    if (tooltip) {
      tooltip.style.opacity = '0';
    }
  });
}

export function destroy() {
  if (resizeHandler) {
    window.removeEventListener('resize', resizeHandler);
    resizeHandler = null;
  }
  if (activeTooltip) {
    activeTooltip.style.opacity = '0';
  }
  if (currentContainer) {
    try {
      Plotly.purge(currentContainer);
    } catch (e) {
      // Ignorar
    }
    currentContainer.innerHTML = '';
    currentContainer = null;
  }
}

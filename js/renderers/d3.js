/**
 * d3.js - Renderer para D3.js (v7)
 * 
 * Implementación de la visualización del cuerpo humano con D3.js.
 * Utiliza manipulación directa del DOM SVG, data-joins selectivos,
 * escala continua con transformación de raíz cuadrada y eventos nativos para tooltips.
 * 
 * Decisiones y Dificultades:
 * - Fácil: Inyección del SVG compartido sin conversiones geométricas; control total
 *   de estilos, transiciones fluidas de color y tooltip HTML enriquecido con CSS.
 * - Reto resuelto: Construcción de la leyenda continua con gradiente SVG y escala de
 *   raíz cuadrada personalizada para reflejar fielmente la no linealidad.
 */

import { getColorForDays, getTooltipHTML, LOCATABLE_ZONES } from '../shared.js';

let activeTooltip = null;
let currentContainer = null;

export async function render(container, aggregatedData, options = {}) {
  currentContainer = container;
  container.innerHTML = '';

  // 1. Obtener el contenido del SVG maestro
  let svgContent = options.svgText;
  if (!svgContent) {
    const res = await fetch('assets/cuerpo.svg');
    svgContent = await res.text();
  }

  // 2. Crear envoltorio del gráfico
  const wrapper = document.createElement('div');
  wrapper.className = 'd3-chart-wrapper';
  wrapper.innerHTML = svgContent;
  container.appendChild(wrapper);

  const svg = d3.select(wrapper).select('svg');
  svg.attr('width', '100%').attr('height', '100%').attr('preserveAspectRatio', 'xMidYMid meet');

  // 3. Crear tooltip flotante si no existe
  let tooltip = d3.select('body').select('.custom-floating-tooltip');
  if (tooltip.empty()) {
    tooltip = d3.select('body')
      .append('div')
      .attr('class', 'custom-floating-tooltip')
      .style('opacity', 0)
      .style('position', 'fixed')
      .style('pointer-events', 'none')
      .style('z-index', 1000);
  }
  activeTooltip = tooltip;

  // 4. Mapear y colorear cada zona anatómica
  LOCATABLE_ZONES.forEach(zone => {
    const zoneData = aggregatedData.locatableZones[zone];
    const daysLost = zoneData ? zoneData.daysLost : 0;
    const targetColor = getColorForDays(daysLost);

    const elements = svg.selectAll(`[data-zone="${zone}"]`);
    const strokeColor = daysLost > 0 ? '#b91c1c' : '#94a3b8';

    elements
      .transition()
      .duration(300)
      .style('fill', targetColor)
      .attr('fill', targetColor)
      .style('stroke', strokeColor)
      .attr('stroke', strokeColor)
      .attr('stroke-width', daysLost > 0 ? 1.5 : 1.2);

    elements
      .on('pointerenter pointerover', function (event) {
        d3.select(this)
          .raise()
          .style('stroke', '#0f172a')
          .attr('stroke', '#0f172a')
          .attr('stroke-width', 2.5)
          .style('filter', 'drop-shadow(0 4px 6px rgba(0,0,0,0.25))');

        const html = getTooltipHTML(zone, zoneData);
        tooltip
          .html(html)
          .style('opacity', 1)
          .style('left', (event.clientX + 15) + 'px')
          .style('top', (event.clientY + 15) + 'px');
      })
      .on('pointermove', function (event) {
        // Ajustar posición para evitar salirse de la ventana
        const tipNode = tooltip.node();
        const tipWidth = tipNode ? tipNode.offsetWidth : 280;
        const tipHeight = tipNode ? tipNode.offsetHeight : 200;

        let left = event.clientX + 15;
        let top = event.clientY + 15;

        if (left + tipWidth > window.innerWidth - 20) {
          left = event.clientX - tipWidth - 15;
        }
        if (top + tipHeight > window.innerHeight - 20) {
          top = event.clientY - tipHeight - 15;
        }

        tooltip
          .style('left', left + 'px')
          .style('top', top + 'px');
      })
      .on('pointerleave pointerout', function () {
        d3.select(this)
          .style('stroke', strokeColor)
          .attr('stroke', strokeColor)
          .attr('stroke-width', daysLost > 0 ? 1.5 : 1.2)
          .style('filter', 'none');

        tooltip.style('opacity', 0);
      });
  });

  // 5. Renderizar leyenda D3 continua en la parte inferior del SVG
  renderD3Legend(svg, aggregatedData.globalMaxDays);
}

/**
 * Renderiza la leyenda de color SVG continua con escala de raíz cuadrada
 */
function renderD3Legend(svg, maxDays) {
  const legendG = svg.append('g')
    .attr('class', 'd3-legend-group')
    .attr('transform', 'translate(200, 485)');

  // Fondo sutil para la leyenda
  legendG.append('rect')
    .attr('x', -10)
    .attr('y', -16)
    .attr('width', 320)
    .attr('height', 42)
    .attr('rx', 6)
    .attr('fill', 'rgba(255, 255, 255, 0.9)')
    .attr('stroke', '#e2e8f0');

  // Gradiente SVG
  const defs = svg.select('defs').empty() ? svg.append('defs') : svg.select('defs');
  const gradientId = 'd3-legend-gradient';
  defs.select('#' + gradientId).remove();

  const linearGrad = defs.append('linearGradient')
    .attr('id', gradientId)
    .attr('x1', '0%')
    .attr('y1', '0%')
    .attr('x2', '100%')
    .attr('y2', '0%');

  // Generar paradas del gradiente con la escala sqrt
  const numStops = 10;
  for (let i = 0; i <= numStops; i++) {
    const fraction = i / numStops;
    const daysVal = fraction * fraction * maxDays; // inverse sqrt mapping
    const color = getColorForDays(daysVal);
    linearGrad.append('stop')
      .attr('offset', `${fraction * 100}%`)
      .attr('stop-color', color);
  }

  // Título de la leyenda
  legendG.append('text')
    .attr('x', 0)
    .attr('y', -4)
    .attr('font-size', '10px')
    .attr('font-weight', '700')
    .attr('fill', '#475569')
    .text('Días perdidos (Escala √)');

  // Cuadro neutral '0'
  legendG.append('rect')
    .attr('x', 0)
    .attr('y', 2)
    .attr('width', 12)
    .attr('height', 10)
    .attr('fill', '#e2e8f0')
    .attr('stroke', '#cbd5e1');

  legendG.append('text')
    .attr('x', 6)
    .attr('y', 20)
    .attr('font-size', '9px')
    .attr('text-anchor', 'middle')
    .attr('fill', '#64748b')
    .text('0');

  // Barra del gradiente
  legendG.append('rect')
    .attr('x', 20)
    .attr('y', 2)
    .attr('width', 270)
    .attr('height', 10)
    .attr('fill', `url(#${gradientId})`)
    .attr('stroke', '#cbd5e1')
    .attr('rx', 2);

  // Marcas numéricas
  const ticks = [
    { label: '1', pos: Math.sqrt(1 / maxDays) },
    { label: `${Math.round(maxDays * 0.25)}`, pos: Math.sqrt(0.25) },
    { label: `${Math.round(maxDays * 0.5)}`, pos: Math.sqrt(0.5) },
    { label: `${maxDays} d`, pos: 1.0 }
  ];

  ticks.forEach(t => {
    const xPos = 20 + t.pos * 270;
    legendG.append('line')
      .attr('x1', xPos)
      .attr('y1', 12)
      .attr('x2', xPos)
      .attr('y2', 15)
      .attr('stroke', '#94a3b8');

    legendG.append('text')
      .attr('x', xPos)
      .attr('y', 23)
      .attr('font-size', '8.5px')
      .attr('text-anchor', 'middle')
      .attr('fill', '#64748b')
      .text(t.label);
  });
}

export function destroy() {
  if (activeTooltip) {
    activeTooltip.style('opacity', 0);
  }
  if (currentContainer) {
    currentContainer.innerHTML = '';
    currentContainer = null;
  }
}

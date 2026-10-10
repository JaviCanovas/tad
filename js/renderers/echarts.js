/**
 * echarts.js - Renderer para Apache ECharts (v5)
 * 
 * Implementación de la visualización del cuerpo humano con Apache ECharts.
 * Utiliza la funcionalidad nativa de registro de mapas SVG (echarts.registerMap)
 * y series de tipo 'map' con visualMap continuo y formateo de tooltips HTML.
 * 
 * Decisiones y Dificultades:
 * - Fácil: Ingesta nativa del SVG completo mediante echarts.registerMap('cuerpo', { svg }),
 *   vinculación automática de múltiples paths con el mismo atributo 'name', y tooltips HTML interactivos.
 * - Reto resuelto: ECharts aplica por defecto escala lineal en visualMap continuo; la transformación
 *   no lineal (sqrt) requeriría modificar los valores de entrada o usar visualMap piecewise. Se documenta
 *   como limitación nativa de la configuración declarativa estándar en la Ficha y Survey.
 */

import { getTooltipHTML, LOCATABLE_ZONES } from '../shared.js';

let chartInstance = null;
let resizeHandler = null;
let isMapRegistered = false;

export async function render(container, aggregatedData, options = {}) {
  // Limpiar instancia previa si existe
  destroy();

  // 1. Cargar y registrar el mapa SVG en ECharts si no está registrado
  if (!isMapRegistered) {
    let svgContent = options.svgText;
    if (!svgContent) {
      const res = await fetch('assets/cuerpo.svg');
      svgContent = await res.text();
    }
    echarts.registerMap('cuerpo_humano', { svg: svgContent });
    isMapRegistered = true;
  }

  // 2. Inicializar instancia de ECharts
  chartInstance = echarts.init(container, null, { renderer: 'svg' });

  // 3. Preparar array de datos para la serie de tipo map
  const seriesData = LOCATABLE_ZONES.map(zone => {
    const zData = aggregatedData.locatableZones[zone];
    const days = zData ? zData.daysLost : 0;
    return {
      name: zone,
      value: days,
      // Si no tiene lesiones, forzar gris neutro explícito con borde pizarra visible
      itemStyle: days === 0 ? {
        areaColor: '#e2e8f0',
        borderColor: '#94a3b8',
        borderWidth: 1.2
      } : {
        borderColor: '#b91c1c',
        borderWidth: 1.5
      }
    };
  });

  const maxDays = aggregatedData.globalMaxDays || 435;

  // 4. Configuración del gráfico
  const option = {
    animationDuration: 350,
    animationEasing: 'cubicOut',
    tooltip: {
      trigger: 'item',
      enterable: false,
      backgroundColor: 'transparent',
      borderColor: 'transparent',
      borderWidth: 0,
      padding: 0,
      extraCssText: 'box-shadow: none; pointer-events: none; z-index: 1000;',
      formatter: function (params) {
        const zoneName = params.name;
        const zoneData = aggregatedData.locatableZones[zoneName];
        return getTooltipHTML(zoneName, zoneData);
      }
    },
    visualMap: {
      type: 'continuous',
      min: 0,
      max: maxDays,
      orient: 'horizontal',
      left: 'center',
      bottom: 8,
      text: [`${maxDays} d`, '0 d'],
      itemWidth: 14,
      itemHeight: 220,
      calculable: true,
      realtime: true,
      inRange: {
        // Rampa secuencial de rojos
        color: ['#fee2e2', '#f87171', '#dc2626', '#b91c1c', '#7f1d1d']
      },
      textStyle: {
        color: '#64748b',
        fontSize: 11,
        fontWeight: 'bold'
      }
    },
    series: [
      {
        name: 'Lesiones Liverpool',
        type: 'map',
        map: 'cuerpo_humano',
        roam: false,
        aspectScale: 1.0,
        layoutCenter: ['50%', '44%'],
        layoutSize: '82%',
        emphasis: {
          label: { show: false },
          itemStyle: {
            borderColor: '#0f172a',
            borderWidth: 2,
            shadowBlur: 10,
            shadowColor: 'rgba(0, 0, 0, 0.25)'
          }
        },
        select: {
          disabled: true
        },
        data: seriesData
      }
    ]
  };

  chartInstance.setOption(option, true);

  // 5. Soporte para resize responsivo
  resizeHandler = () => {
    if (chartInstance) {
      chartInstance.resize();
    }
  };
  window.addEventListener('resize', resizeHandler);
}

export function destroy() {
  if (resizeHandler) {
    window.removeEventListener('resize', resizeHandler);
    resizeHandler = null;
  }
  if (chartInstance) {
    chartInstance.dispose();
    chartInstance = null;
  }
}

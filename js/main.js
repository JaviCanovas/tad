/**
 * main.js
 * Orquestador principal de la aplicación.
 * Maneja el estado global, la carga de datos, el selector de jugadores,
 * la botonera de librerías, la ficha de capacidades y el panel de lesiones no localizables.
 */

import {
  loadInjuriesData,
  getPlayersList,
  aggregateData,
  LOCATABLE_ZONES
} from './shared.js';

import * as D3Renderer from './renderers/d3.js';
import * as EChartsRenderer from './renderers/echarts.js';
import * as PlotlyRenderer from './renderers/plotly.js';
import * as VegaLiteRenderer from './renderers/vegalite.js';

// Mapeo de renderers disponibles
const RENDERERS = {
  d3: {
    id: 'd3',
    name: 'D3.js (v7)',
    module: D3Renderer,
    btnId: 'btn-d3'
  },
  echarts: {
    id: 'echarts',
    name: 'Apache ECharts (v5)',
    module: EChartsRenderer,
    btnId: 'btn-echarts'
  },
  plotly: {
    id: 'plotly',
    name: 'Plotly.js (v2)',
    module: PlotlyRenderer,
    btnId: 'btn-plotly'
  },
  vegalite: {
    id: 'vegalite',
    name: 'Vega-Lite (v5)',
    module: VegaLiteRenderer,
    btnId: 'btn-vegalite'
  }
};

// Datos para la Ficha de Capacidades por librería
const CAPABILITIES_DATA = {
  d3: {
    title: 'D3.js (v7) — Ficha de Capacidades',
    items: [
      {
        name: '1. Regiones corporales coloreables individualmente',
        status: 'cumple',
        label: 'Cumple',
        desc: 'Manipulación directa de nodos SVG (d3.selectAll) con data-joins y transiciones de color fluidas.'
      },
      {
        name: '2. Escala de color continua con leyenda',
        status: 'cumple',
        label: 'Cumple',
        desc: 'Soporte nativo para escalas continuas no lineales (d3.scaleSqrt) y renderizado de leyenda con gradiente SVG.'
      },
      {
        name: '3. Tooltip con contenido personalizado y multilínea por zona',
        status: 'cumple',
        label: 'Cumple',
        desc: 'Control total del DOM HTML y eventos de puntero (pointerover, pointermove) para tooltips dinámicos enriquecidos.'
      },
      {
        name: '4. Actualización al filtrar por jugador (sin recarga)',
        status: 'cumple',
        label: 'Cumple',
        desc: 'Re-renderizado instantáneo de atributos de relleno mediante transiciones D3 sin reconstruir el DOM.'
      },
      {
        name: '5. Uso del SVG compartido sin transformaciones complejas',
        status: 'cumple',
        label: 'Cumple',
        desc: 'Inyección directa del archivo SVG maestro en el DOM sin conversiones intermedias de coordenadas.'
      },
      {
        name: '6. Zonas sin datos mostradas en gris neutro',
        status: 'cumple',
        label: 'Cumple',
        desc: 'Asignación directa del color neutro #e2e8f0 a zonas con 0 días perdidos.'
      }
    ]
  },
  echarts: {
    title: 'Apache ECharts (v5) — Ficha de Capacidades',
    items: [
      {
        name: '1. Regiones corporales coloreables individualmente',
        status: 'cumple',
        label: 'Cumple',
        desc: 'Mapeo automático de elementos SVG con atributo "name" a los ítems de la serie map.'
      },
      {
        name: '2. Escala de color continua con leyenda',
        status: 'cumple',
        label: 'Cumple',
        desc: 'Componente nativo visualMap continuo con barra interactiva y rangos de color personalizables.'
      },
      {
        name: '3. Tooltip con contenido personalizado y multilínea por zona',
        status: 'cumple',
        label: 'Cumple',
        desc: 'Soporte nativo de formateador de cadenas y HTML enriquecido multilínea con tooltip.formatter.'
      },
      {
        name: '4. Actualización al filtrar por jugador (sin recarga)',
        status: 'cumple',
        label: 'Cumple',
        desc: 'Actualización reactiva y fluida mediante setOption(..., true) sin parpadeos ni recargas.'
      },
      {
        name: '5. Uso del SVG compartido sin transformaciones complejas',
        status: 'cumple',
        label: 'Cumple',
        desc: 'Registro directo del SVG como mapa vectorial mediante echarts.registerMap("cuerpo", { svg }).'
      },
      {
        name: '6. Zonas sin datos mostradas en gris neutro',
        status: 'cumple',
        label: 'Cumple',
        desc: 'Configuración explícita de itemStyle.areaColor: "#e2e8f0" para valores en cero.'
      }
    ]
  },
  plotly: {
    title: 'Plotly.js (v2) — Ficha de Capacidades',
    items: [
      {
        name: '1. Regiones corporales coloreables individualmente',
        status: 'cumple',
        label: 'Cumple',
        desc: 'Soporte mediante layout.shapes individuales de tipo "path" asignando colores calculados.'
      },
      {
        name: '2. Escala de color continua con leyenda',
        status: 'parcial',
        label: 'Parcial',
        desc: 'Plotly no asocia colorbar a shapes vectoriales; requiere una traza scatter auxiliar con marker.colorbar.'
      },
      {
        name: '3. Tooltip con contenido personalizado y multilínea por zona',
        status: 'parcial',
        label: 'Parcial',
        desc: 'layout.shapes no emite eventos hover. Requiere marcadores scatter en centroides y listeners DOM externos.'
      },
      {
        name: '4. Actualización al filtrar por jugador (sin recarga)',
        status: 'cumple',
        label: 'Cumple',
        desc: 'Actualización fluida del layout y trazas mediante Plotly.react sin recargar la página.'
      },
      {
        name: '5. Uso del SVG compartido sin transformaciones complejas',
        status: 'parcial',
        label: 'Parcial',
        desc: 'Requiere parsear los strings "d" del SVG a arrays de shapes e invertir el eje Y cartesiano.'
      },
      {
        name: '6. Zonas sin datos mostradas en gris neutro',
        status: 'cumple',
        label: 'Cumple',
        desc: 'El preprocesado en shared.js asigna el color gris base a los shapes sin lesiones.'
      }
    ]
  },
  vegalite: {
    title: 'Vega-Lite (v5) — Ficha de Capacidades',
    items: [
      {
        name: '1. Regiones corporales coloreables individualmente',
        status: 'cumple',
        label: 'Cumple',
        desc: 'Codificación declarativa de la marca "geoshape" ligada a propiedades del dataset GeoJSON.'
      },
      {
        name: '2. Escala de color continua con leyenda',
        status: 'cumple',
        label: 'Cumple',
        desc: 'Soporte declarativo nativo para scale: { type: "sqrt" } y generación automática de leyenda continua.'
      },
      {
        name: '3. Tooltip con contenido personalizado y multilínea por zona',
        status: 'parcial',
        label: 'Parcial',
        desc: 'Tooltips nativos limitados a tabla clave-valor; formateo HTML avanzado requiere handlers externos.'
      },
      {
        name: '4. Actualización al filtrar por jugador (sin recarga)',
        status: 'cumple',
        label: 'Cumple',
        desc: 'Recompilación reactiva de la vista mediante Vega View API y re-evaluación del flujo de datos.'
      },
      {
        name: '5. Uso del SVG compartido sin transformaciones complejas',
        status: 'parcial',
        label: 'Parcial',
        desc: 'No puede consumir SVG directamente; exige muestrear los paths a polígonos cerrados en formato GeoJSON.'
      },
      {
        name: '6. Zonas sin datos mostradas en gris neutro',
        status: 'cumple',
        label: 'Cumple',
        desc: 'Regla condicional declarativa condition: { test: "datum.days_lost == 0", value: "#e2e8f0" }.'
      }
    ]
  }
};

// Estado de la aplicación
const state = {
  activeLibrary: 'd3',
  selectedPlayer: 'all',
  rawData: [],
  svgText: '',
  lastRenderTime: 0
};

// Elementos del DOM
const elements = {
  chartContainer: document.getElementById('chart-container'),
  playerSelect: document.getElementById('player-select'),
  btnGroup: document.getElementById('library-buttons'),
  capabilityMatrix: document.getElementById('capability-matrix'),
  capabilityToggle: document.getElementById('capability-toggle'),
  capabilityContent: document.getElementById('capability-content'),
  nonLocatableList: document.getElementById('non-locatable-list'),
  nonLocatableSummary: document.getElementById('non-locatable-summary'),
  footerLibrary: document.getElementById('footer-library'),
  footerInjuries: document.getElementById('footer-injuries'),
  footerDays: document.getElementById('footer-days'),
  footerRenderTime: document.getElementById('footer-render-time')
};

/**
 * Inicialización de la aplicación
 */
async function init() {
  try {
    // 1. Cargar el SVG maestro
    const svgRes = await fetch('assets/cuerpo.svg');
    state.svgText = await svgRes.text();

    // 2. Cargar el dataset único compartido
    state.rawData = await loadInjuriesData('data/injuries_liverpool_mapped.csv');

    // 3. Poblar el selector de jugadores
    populatePlayerSelect();

    // 4. Configurar eventos de controles
    setupEventListeners();

    // 5. Renderizar vista inicial
    await updateVisualization();
  } catch (err) {
    console.error('Error durante la inicialización:', err);
    if (elements.chartContainer) {
      elements.chartContainer.innerHTML = `
        <div class="error-container">
          <h3>Error de Inicialización</h3>
          <p>${err.message}</p>
        </div>
      `;
    }
  }
}

/**
 * Puebla el desplegable de jugadores con los 23 jugadores ordenados
 */
function populatePlayerSelect() {
  const players = getPlayersList(state.rawData);
  elements.playerSelect.innerHTML = '';

  const allOption = document.createElement('option');
  allOption.value = 'all';
  allOption.textContent = '⚽ Todos los jugadores (23)';
  elements.playerSelect.appendChild(allOption);

  players.forEach(p => {
    const opt = document.createElement('option');
    opt.value = p.slug;
    opt.textContent = p.name;
    elements.playerSelect.appendChild(opt);
  });
}

/**
 * Configura los event listeners para botones, selector y acordión
 */
function setupEventListeners() {
  // Botonera de librerías
  elements.btnGroup.addEventListener('click', async (e) => {
    const btn = e.target.closest('.lib-btn');
    if (!btn) return;

    const libId = btn.getAttribute('data-lib');
    if (libId && libId !== state.activeLibrary) {
      // Destruir el renderer previo
      const prevRenderer = RENDERERS[state.activeLibrary];
      if (prevRenderer && prevRenderer.module.destroy) {
        prevRenderer.module.destroy();
      }

      state.activeLibrary = libId;
      updateActiveButton();
      await updateVisualization();
    }
  });

  // Selector de jugador
  elements.playerSelect.addEventListener('change', async (e) => {
    state.selectedPlayer = e.target.value;
    await updateVisualization();
  });

  // Desplegable de la ficha de capacidades
  if (elements.capabilityToggle) {
    elements.capabilityToggle.addEventListener('click', () => {
      const isCollapsed = elements.capabilityContent.classList.toggle('collapsed');
      elements.capabilityToggle.setAttribute('aria-expanded', !isCollapsed);
      const icon = elements.capabilityToggle.querySelector('.toggle-icon');
      if (icon) {
        icon.textContent = isCollapsed ? '▼' : '▲';
      }
    });
  }
}

/**
 * Actualiza la clase activa en la botonera de librerías
 */
function updateActiveButton() {
  const buttons = elements.btnGroup.querySelectorAll('.lib-btn');
  buttons.forEach(b => {
    if (b.getAttribute('data-lib') === state.activeLibrary) {
      b.classList.add('active');
    } else {
      b.classList.remove('active');
    }
  });
}

/**
 * Actualiza y renderiza la visualización activa
 */
async function updateVisualization() {
  const rendererInfo = RENDERERS[state.activeLibrary];
  if (!rendererInfo) return;

  // 1. Agregar los datos para la selección actual
  const aggregated = aggregateData(state.rawData, state.selectedPlayer);

  // 2. Medir tiempo de renderizado con performance.now()
  const tStart = performance.now();

  try {
    // Limpieza total del contenedor para prevenir solapamientos entre librerías
    elements.chartContainer.innerHTML = '';
    await rendererInfo.module.render(elements.chartContainer, aggregated, {
      svgText: state.svgText
    });
  } catch (renderError) {
    console.error(`Error al renderizar con ${rendererInfo.name}:`, renderError);
    elements.chartContainer.innerHTML = `
      <div class="error-container">
        <h3>Error al renderizar con ${rendererInfo.name}</h3>
        <p>${renderError.message}</p>
      </div>
    `;
  }

  const tEnd = performance.now();
  state.lastRenderTime = (tEnd - tStart).toFixed(2);

  // 3. Actualizar paneles secundarios y métricas
  updateNonLocatablePanel(aggregated);
  updateCapabilityMatrix(state.activeLibrary);
  updateFooter(rendererInfo.name, aggregated, state.lastRenderTime);
}

/**
 * Actualiza el panel de Lesiones No Localizables
 */
function updateNonLocatablePanel(aggregated) {
  const nl = aggregated.nonLocatable;
  const gm = nl.generalMultiple;
  const sys = nl.systemic;

  elements.nonLocatableSummary.innerHTML = `
    <div class="summary-metric">
      <span class="metric-num">${nl.totalNonLocatableInjuries}</span>
      <span class="metric-label">Episodios no localizables</span>
    </div>
    <div class="summary-metric">
      <span class="metric-num highlight">${nl.totalNonLocatableDays}</span>
      <span class="metric-label">Días perdidos acumulados</span>
    </div>
  `;

  let html = '';

  // Tarjeta General / Múltiple
  html += `
    <div class="nl-card ${gm.injuryCount === 0 ? 'empty' : ''}">
      <div class="nl-card-header">
        <span class="nl-card-title">🩹 General / Múltiple</span>
        <span class="nl-badge ${gm.injuryCount > 0 ? 'active' : 'zero'}">${gm.injuryCount} (${gm.daysLost} d)</span>
      </div>
      <div class="nl-card-body">
        ${gm.injuryCount === 0 ? '<p class="nl-empty">Sin episodios registrados</p>' : `
          <ul class="nl-injuries-list">
            ${gm.injuries.map(inj => `
              <li>
                <strong>${inj.injury}</strong> <span class="nl-season">(${inj.season})</span>
                <div class="nl-item-details">
                  <span class="nl-chip">${inj.injury_type}</span>
                  ${inj.injury_severity ? `<span class="nl-chip severity">${inj.injury_severity}</span>` : ''}
                  <span class="nl-days">${inj.days_lost} días</span>
                </div>
              </li>
            `).join('')}
          </ul>
        `}
      </div>
    </div>
  `;

  // Tarjeta Sistémico (Enfermedad)
  html += `
    <div class="nl-card ${sys.injuryCount === 0 ? 'empty' : ''}">
      <div class="nl-card-header">
        <span class="nl-card-title">🦠 Sistémico (Enfermedad)</span>
        <span class="nl-badge ${sys.injuryCount > 0 ? 'active' : 'zero'}">${sys.injuryCount} (${sys.daysLost} d)</span>
      </div>
      <div class="nl-card-body">
        ${sys.injuryCount === 0 ? '<p class="nl-empty">Sin episodios registrados</p>' : `
          <ul class="nl-injuries-list">
            ${sys.injuries.map(inj => `
              <li>
                <strong>${inj.injury}</strong> <span class="nl-season">(${inj.season})</span>
                <div class="nl-item-details">
                  <span class="nl-chip">${inj.injury_type}</span>
                  <span class="nl-days">${inj.days_lost} días</span>
                </div>
              </li>
            `).join('')}
          </ul>
        `}
      </div>
    </div>
  `;

  elements.nonLocatableList.innerHTML = html;
}

/**
 * Actualiza la Ficha de Capacidades para la librería activa
 */
function updateCapabilityMatrix(libId) {
  const cap = CAPABILITIES_DATA[libId];
  if (!cap) return;

  const headerTitle = elements.capabilityMatrix.querySelector('.capability-header-title');
  if (headerTitle) {
    headerTitle.textContent = cap.title;
  }

  const rowsHTML = cap.items.map(item => {
    const badgeClass = `status-badge status-${item.status}`;
    return `
      <div class="capability-row">
        <div class="cap-name">${item.name}</div>
        <div class="cap-status"><span class="${badgeClass}">${item.label}</span></div>
        <div class="cap-desc">${item.desc}</div>
      </div>
    `;
  }).join('');

  elements.capabilityContent.innerHTML = `
    <div class="capability-table">
      <div class="capability-table-header">
        <div>Requisito Evaluado</div>
        <div>Estado</div>
        <div>Evidencia y Justificación Técnica</div>
      </div>
      ${rowsHTML}
    </div>
  `;
}

/**
 * Actualiza las métricas del pie de página
 */
function updateFooter(libName, aggregated, renderTimeMs) {
  elements.footerLibrary.textContent = libName;
  elements.footerInjuries.textContent = `${aggregated.totalInjuries} lesiones`;
  elements.footerDays.textContent = `${aggregated.totalDaysLost} días perdidos`;
  elements.footerRenderTime.textContent = `${renderTimeMs} ms`;
}

// Iniciar aplicación al cargar el DOM
document.addEventListener('DOMContentLoaded', init);

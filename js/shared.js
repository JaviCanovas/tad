/**
 * shared.js
 * Módulo común para carga de datos, transformaciones, agregaciones,
 * escala de color con transformación sqrt y formateo de tooltips.
 */

// Lista fija de las 13 zonas corporales localizables
export const LOCATABLE_ZONES = [
  'Cabeza',
  'Hombro',
  'Brazo',
  'Mano',
  'Torso',
  'Espalda',
  'Cadera',
  'Pelvis e Ingle',
  'Muslo',
  'Rodilla',
  'Pantorrilla',
  'Tobillo',
  'Pie'
];

// Lista de las 2 zonas no localizables
export const NON_LOCATABLE_ZONES = [
  'General / Múltiple',
  'Sistémico (Enfermedad)'
];

// Variable global para almacenar el dataset crudo
let rawDataset = [];
let globalMaxDays = 450; // Se calculará dinámicamente con el dataset

/**
 * Formatea un slug de jugador (ej. 'adam-lallana') a nombre legible ('Adam Lallana')
 */
export function formatPlayerName(slug) {
  if (!slug) return '';
  if (slug === 'all') return 'Todos los jugadores';

  const specialCases = {
    'virgil-van-dijk': 'Virgil van Dijk',
    'alex-oxlade-chamberlain': 'Alex Oxlade-Chamberlain',
    'trent-alexander-arnold': 'Trent Alexander-Arnold',
    'naby-keita': 'Naby Keïta',
    'sadio-mane': 'Sadio Mané'
  };

  if (specialCases[slug]) {
    return specialCases[slug];
  }

  return slug
    .split('-')
    .map(word => word.charAt(0).toUpperCase() + word.slice(1).toLowerCase())
    .join(' ');
}

/**
 * Carga el archivo CSV de lesiones una sola vez.
 */
export async function loadInjuriesData(csvPath = 'data/injuries_liverpool_mapped.csv') {
  if (rawDataset.length > 0) {
    return rawDataset;
  }

  const response = await fetch(csvPath);
  if (!response.ok) {
    throw new Error(`Error al cargar el CSV (${response.status}): ${response.statusText}`);
  }

  const text = await response.text();
  const rows = parseCSV(text);

  // Mapeo y tipado de campos
  rawDataset = rows.map(r => ({
    player_name: (r.player_name || '').trim(),
    player_id: Number(r.player_id) || 0,
    season: (r.season || '').trim(),
    from: (r.from || '').trim(),
    until: (r.until || '').trim(),
    days_lost: Math.max(0, parseInt(r.days_lost, 10) || 0),
    games_lost: r.games_lost !== '' && !isNaN(Number(r.games_lost)) ? Number(r.games_lost) : null,
    injury: (r.injury || '').trim(),
    injury_acl: (r.injury_acl || '').trim(),
    injury_type: (r.injury_type || '').trim(),
    injury_severity: (r.injury_severity || '').trim(),
    zona_anatomica: (r.zona_anatomica || '').trim()
  }));

  // Calcular el dominio global máximo (sumatorio de días perdidos por zona en 'all')
  const allAggregated = aggregateData(rawDataset, 'all');
  let maxDays = 0;
  for (const zone of LOCATABLE_ZONES) {
    const d = allAggregated.locatableZones[zone]?.daysLost || 0;
    if (d > maxDays) maxDays = d;
  }
  globalMaxDays = maxDays > 0 ? maxDays : 450;

  return rawDataset;
}

/**
 * Parseador simple de CSV compatible con comas y comillas
 */
function parseCSV(text) {
  const lines = text.split(/\r?\n/).filter(line => line.trim().length > 0);
  if (lines.length === 0) return [];

  const headers = splitCSVLine(lines[0]);
  const result = [];

  for (let i = 1; i < lines.length; i++) {
    const values = splitCSVLine(lines[i]);
    if (values.length === headers.length) {
      const obj = {};
      for (let j = 0; j < headers.length; j++) {
        obj[headers[j]] = values[j];
      }
      result.push(obj);
    }
  }

  return result;
}

function splitCSVLine(line) {
  const values = [];
  let current = '';
  let insideQuotes = false;

  for (let i = 0; i < line.length; i++) {
    const char = line[i];
    if (char === '"') {
      if (insideQuotes && line[i + 1] === '"') {
        current += '"';
        i++;
      } else {
        insideQuotes = !insideQuotes;
      }
    } else if (char === ',' && !insideQuotes) {
      values.push(current);
      current = '';
    } else {
      current += char;
    }
  }
  values.push(current);
  return values;
}

/**
 * Obtiene la lista única de jugadores formateada con slug y nombre
 */
export function getPlayersList(data = rawDataset) {
  const slugs = Array.from(new Set(data.map(d => d.player_name))).filter(Boolean).sort();
  return slugs.map(slug => ({
    slug,
    name: formatPlayerName(slug)
  }));
}

/**
 * Agrega los datos para un jugador específico o para 'all'
 */
export function aggregateData(data = rawDataset, selectedPlayer = 'all') {
  const filtered = selectedPlayer === 'all'
    ? data
    : data.filter(d => d.player_name === selectedPlayer);

  // Inicializar zonas anatómicas
  const locatableZones = {};
  LOCATABLE_ZONES.forEach(zone => {
    locatableZones[zone] = {
      zone,
      daysLost: 0,
      injuryCount: 0,
      injuries: []
    };
  });

  const nonLocatable = {
    generalMultiple: {
      zone: 'General / Múltiple',
      daysLost: 0,
      injuryCount: 0,
      injuries: []
    },
    systemic: {
      zone: 'Sistémico (Enfermedad)',
      daysLost: 0,
      injuryCount: 0,
      injuries: []
    },
    totalNonLocatableInjuries: 0,
    totalNonLocatableDays: 0
  };

  let totalInjuries = 0;
  let totalDaysLost = 0;

  filtered.forEach(row => {
    totalInjuries++;
    totalDaysLost += row.days_lost;

    const zone = row.zona_anatomica;
    const injuryItem = {
      injury: row.injury,
      injury_type: row.injury_type,
      injury_severity: row.injury_severity,
      injury_acl: row.injury_acl,
      days_lost: row.days_lost,
      games_lost: row.games_lost,
      season: row.season,
      from: row.from,
      until: row.until,
      player_name: row.player_name,
      player_display: formatPlayerName(row.player_name)
    };

    if (locatableZones[zone]) {
      locatableZones[zone].daysLost += row.days_lost;
      locatableZones[zone].injuryCount++;
      locatableZones[zone].injuries.push(injuryItem);
    } else if (zone === 'General / Múltiple') {
      nonLocatable.generalMultiple.daysLost += row.days_lost;
      nonLocatable.generalMultiple.injuryCount++;
      nonLocatable.generalMultiple.injuries.push(injuryItem);
      nonLocatable.totalNonLocatableDays += row.days_lost;
      nonLocatable.totalNonLocatableInjuries++;
    } else if (zone === 'Sistémico (Enfermedad)') {
      nonLocatable.systemic.daysLost += row.days_lost;
      nonLocatable.systemic.injuryCount++;
      nonLocatable.systemic.injuries.push(injuryItem);
      nonLocatable.totalNonLocatableDays += row.days_lost;
      nonLocatable.totalNonLocatableInjuries++;
    }
  });

  return {
    selectedPlayer,
    playerNameFormatted: formatPlayerName(selectedPlayer),
    totalInjuries,
    totalDaysLost,
    locatableZones,
    nonLocatable,
    globalMaxDays
  };
}

/**
 * Escala de color secuencial de un solo tono con transformación de raíz cuadrada (sqrt)
 * - 0 días: gris neutro (#e2e8f0)
 * - >0 días: escala secuencial roja [ #fee2e2 -> #ef4444 -> #b91c1c -> #7f1d1d ]
 */
export const COLOR_RAMP = [
  { t: 0.0, color: [254, 226, 226] }, // #fee2e2 (rojo muy claro)
  { t: 0.35, color: [248, 113, 113] }, // #f87171
  { t: 0.65, color: [220, 38, 38] },   // #dc2626
  { t: 0.85, color: [185, 28, 28] },   // #b91c1c
  { t: 1.0, color: [127, 29, 29] }     // #7f1d1d (rojo oscuro intenso)
];

export const NEUTRAL_GRAY = '#e2e8f0';
export const NEUTRAL_STROKE = '#cbd5e1';

/**
 * Devuelve el color hexadecimal correspondiente a un número de días perdidos
 * usando la escala sqrt con respecto al máximo global.
 */
export function getColorForDays(days) {
  if (!days || days <= 0) {
    return NEUTRAL_GRAY;
  }

  // Transformación raíz cuadrada: t = sqrt(days / max)
  const normalized = Math.min(1, Math.max(0, days / globalMaxDays));
  const tSqrt = Math.sqrt(normalized);

  // Interpolar en el COLOR_RAMP
  return interpolateColorRamp(tSqrt);
}

function interpolateColorRamp(t) {
  if (t <= 0) return rgbToHex(COLOR_RAMP[0].color);
  if (t >= 1) return rgbToHex(COLOR_RAMP[COLOR_RAMP.length - 1].color);

  for (let i = 0; i < COLOR_RAMP.length - 1; i++) {
    const c1 = COLOR_RAMP[i];
    const c2 = COLOR_RAMP[i + 1];
    if (t >= c1.t && t <= c2.t) {
      const segmentT = (t - c1.t) / (c2.t - c1.t);
      const r = Math.round(c1.color[0] + segmentT * (c2.color[0] - c1.color[0]));
      const g = Math.round(c1.color[1] + segmentT * (c2.color[1] - c1.color[1]));
      const b = Math.round(c1.color[2] + segmentT * (c2.color[2] - c1.color[2]));
      return rgbToHex([r, g, b]);
    }
  }

  return rgbToHex(COLOR_RAMP[COLOR_RAMP.length - 1].color);
}

function rgbToHex([r, g, b]) {
  return '#' + [r, g, b].map(x => x.toString(16).padStart(2, '0')).join('');
}

/**
 * Devuelve los metadatos de la escala de color para leyendas
 */
export function getColorScaleMetadata() {
  return {
    domain: [0, globalMaxDays],
    neutralColor: NEUTRAL_GRAY,
    colors: ['#fee2e2', '#f87171', '#dc2626', '#b91c1c', '#7f1d1d'],
    getColor: getColorForDays
  };
}

/**
 * Genera el HTML del tooltip multilínea enriquecido para una zona anatómica
 */
export function getTooltipHTML(zoneName, zoneData) {
  if (!zoneData || zoneData.injuryCount === 0 || zoneData.daysLost === 0) {
    return `
      <div class="tooltip-container">
        <div class="tooltip-header">
          <span class="tooltip-title">${zoneName}</span>
          <span class="tooltip-badge zero">0 lesiones</span>
        </div>
        <div class="tooltip-empty">Sin lesiones registradas</div>
      </div>
    `;
  }

  const injuriesListHTML = zoneData.injuries.map(inj => `
    <div class="tooltip-injury-row">
      <div class="tooltip-injury-main">
        <span class="tooltip-injury-name">${inj.injury}</span>
        <span class="tooltip-injury-season">${inj.season}</span>
      </div>
      <div class="tooltip-injury-details">
        <span class="tooltip-chip type">${inj.injury_type}</span>
        ${inj.injury_severity ? `<span class="tooltip-chip severity">${inj.injury_severity}</span>` : ''}
        <span class="tooltip-days-lost"><strong>${inj.days_lost}</strong> días</span>
      </div>
    </div>
  `).join('');

  return `
    <div class="tooltip-container">
      <div class="tooltip-header">
        <span class="tooltip-title">${zoneName}</span>
        <span class="tooltip-badge highlight">${zoneData.injuryCount} ${zoneData.injuryCount === 1 ? 'lesión' : 'lesiones'}</span>
      </div>
      <div class="tooltip-summary">
        Total días perdidos: <strong>${zoneData.daysLost} días</strong>
      </div>
      <div class="tooltip-list-header">Desglose de lesiones:</div>
      <div class="tooltip-injuries-list">
        ${injuriesListHTML}
      </div>
    </div>
  `;
}

/**
 * Extrae los paths y datos del SVG maestro para uso en Plotly y Vega-Lite
 */
let cachedSVGPaths = null;

export async function getSVGPathsMap(svgUrl = 'assets/cuerpo.svg') {
  if (cachedSVGPaths) return cachedSVGPaths;

  const res = await fetch(svgUrl);
  const svgText = await res.text();
  const parser = new DOMParser();
  const doc = parser.parseFromString(svgText, 'image/svg+xml');
  const pathElements = doc.querySelectorAll('path.body-zone');

  const paths = [];
  pathElements.forEach(el => {
    const zone = el.getAttribute('data-zone') || el.getAttribute('name');
    const id = el.getAttribute('id');
    const d = el.getAttribute('d');
    paths.push({ id, zone, d });
  });

  cachedSVGPaths = { rawText: svgText, paths };
  return cachedSVGPaths;
}

/**
 * Convierte los paths del SVG maestro a un GeoJSON FeatureCollection para Vega-Lite.
 * Realiza muestreo geométrico de los paths para obtener polígonos cerrados.
 */
let cachedGeoJSON = null;

export async function getBodyGeoJSON(svgUrl = 'assets/cuerpo.svg') {
  if (cachedGeoJSON) return cachedGeoJSON;

  const { paths } = await getSVGPathsMap(svgUrl);
  
  // Crear un contenedor SVG oculto en el DOM temporal para muestrear puntos con getPointAtLength
  const tempSvg = document.createElementNS('http://www.w3.org/2000/svg', 'svg');
  tempSvg.setAttribute('viewBox', '0 0 700 540');
  tempSvg.style.position = 'absolute';
  tempSvg.style.top = '-9999px';
  tempSvg.style.left = '-9999px';
  document.body.appendChild(tempSvg);

  const features = [];

  paths.forEach(p => {
    const pathEl = document.createElementNS('http://www.w3.org/2000/svg', 'path');
    pathEl.setAttribute('d', p.d);
    tempSvg.appendChild(pathEl);

    const totalLen = pathEl.getTotalLength();
    const sampleCount = Math.max(30, Math.min(80, Math.round(totalLen / 5)));
    const coordinates = [];

    for (let i = 0; i <= sampleCount; i++) {
      const pt = pathEl.getPointAtLength((i / sampleCount) * totalLen);
      // Vega-Lite identidad en coordenadas (X, Y)
      coordinates.push([Math.round(pt.x * 10) / 10, Math.round(pt.y * 10) / 10]);
    }

    // Cerrar el polígono si no está cerrado
    if (coordinates.length > 0) {
      const first = coordinates[0];
      const last = coordinates[coordinates.length - 1];
      if (first[0] !== last[0] || first[1] !== last[1]) {
        coordinates.push([first[0], first[1]]);
      }
    }

    // Calcular centroide simple para etiquetas/tooltips
    let sumX = 0, sumY = 0;
    coordinates.forEach(c => { sumX += c[0]; sumY += c[1]; });
    const centroid = [sumX / coordinates.length, sumY / coordinates.length];

    features.push({
      type: 'Feature',
      id: p.id,
      properties: {
        id: p.id,
        zona: p.zone,
        centroidX: centroid[0],
        centroidY: centroid[1]
      },
      geometry: {
        type: 'Polygon',
        coordinates: [coordinates]
      }
    });

    tempSvg.removeChild(pathEl);
  });

  document.body.removeChild(tempSvg);

  cachedGeoJSON = {
    type: 'FeatureCollection',
    features
  };

  return cachedGeoJSON;
}

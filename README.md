# 🩺 Estudio Comparativo de Visualización: Mapa Anatómico de Lesiones (Liverpool FC)

Este proyecto es un trabajo académico que compara **4 librerías líderes de visualización de datos para la web** (**D3.js**, **Apache ECharts**, **Plotly.js** y **Vega-Lite**) implementando exactamente la misma visualización: un mapa anatómico interactivo del cuerpo humano (vista frontal y posterior) que representa la distribución y severidad de las lesiones de la plantilla del Liverpool FC durante las temporadas 17/18 y 18/19.

---

## 🚀 Puesta en Marcha Rápida

La aplicación es **100% estática** (HTML5 + CSS3 + Vanilla JavaScript con Módulos ES). No requiere Node.js, empaquetadores (`npm`/`vite`/`webpack`) ni procesos de compilación.

Para ejecutarla localmente con cualquier servidor HTTP estático (por ejemplo, Python):

```bash
# Navegar a la carpeta raíz del proyecto y ejecutar:
python -m http.server 8080
```

Abre en tu navegador la URL:
👉 **[http://localhost:8080](http://localhost:8080)** (o [http://localhost:8080/index.html](http://localhost:8080/index.html))

---

## 📊 Descripción del Dataset

- **Archivo:** `data/injuries_liverpool_mapped.csv` (82 registros de lesiones, 12 columnas).
- **Columnas clave:** `player_name`, `season`, `from`, `until`, `days_lost`, `games_lost`, `injury`, `injury_type`, `injury_severity`, `zona_anatomica`.
- **Zonas Anatómicas:**
  - **13 zonas corporales localizables:** Cabeza, Hombro, Brazo, Mano, Torso (*frontal*), Espalda (*posterior*), Cadera, Pelvis e Ingle (*frontal*), Muslo, Rodilla, Pantorrilla, Tobillo, Pie.
  - **2 categorías no localizables:** *General / Múltiple* y *Sistémico (Enfermedad)* (mostradas en el panel lateral independiente).
- **Carga única:** El CSV se carga y parsea una sola vez en `js/shared.js`, compartiendo la misma estructura de datos agregados en las cuatro vistas.

---

## 🎨 Características de la Visualización

1. **Figura Anatómica Compartida:** Diseñada en `assets/cuerpo.svg` con vista frontal y posterior lado a lado en un único lienzo (`viewBox="0 0 700 500"`).
2. **Escala de Color Secuencial con Raíz Cuadrada ($\sqrt{\text{días}}$):** Mismo dominio global $[0, 431\text{ días}]$ en las 4 librerías, evitando que el valor atípico de 316 días (rotura de ligamento cruzado) aplaste visualmente el resto de lesiones.
3. **Zonas Neutras en Gris:** Las regiones anatómicas sin lesiones registradas para el jugador seleccionado se muestran en gris neutro (`#e2e8f0`).
4. **Tooltips Multilínea Enriquecidos:** Detalle por zona de número de episodios, días acumulados y desglose de cada lesión con nombre, temporada y tipo.
5. **Selector de Jugadores Reactivo:** Desplegable con los 23 jugadores del plantel más la opción *"Todos los jugadores"*, con reactividad inmediata y sin recargas.
6. **Botonera de Conmutación de Librerías:** Permite alternar al instante entre **D3.js**, **Apache ECharts**, **Plotly.js** y **Vega-Lite**, midiendo el tiempo de renderizado con `performance.now()` en el pie de página.
7. **Ficha de Capacidades Dinámica:** Matriz desplegable que evalúa los 6 criterios fundamentales de visualización para la librería activa (*Cumple*, *Parcial*, *No cumple*).

---

## 🏗️ Estructura del Proyecto

```
/
├── index.html                           # Estructura semántica, controles y contenedor único
├── css/
│   └── styles.css                       # Diseño responsive, paleta accesible, ficha y tooltips
├── assets/
│   └── cuerpo.svg                       # SVG vectorial maestro con vistas frontal y posterior
├── data/
│   └── injuries_liverpool_mapped.csv    # Dataset único compartido (82 filas)
├── js/
│   ├── main.js                          # Control de estado, selectores, ficha y métricas
│   ├── shared.js                        # Carga CSV, agregaciones, escala de color sqrt y adaptadores
│   └── renderers/
│       ├── d3.js                        # Renderer D3.js (v7)
│       ├── echarts.js                   # Renderer Apache ECharts (v5)
│       ├── plotly.js                    # Renderer Plotly.js (v2)
│       └── vegalite.js                  # Renderer Vega-Lite (v5) con vega-embed
├── README.md                            # Documentación de uso y arquitectura
└── NOTAS_SURVEY.md                      # Informe académico profundo con análisis por librería
```

---

## 📚 Dependencias (CDN con Versión Fija)

- **D3.js:** `v7.9.0`
- **Apache ECharts:** `v5.5.0`
- **Plotly.js:** `v2.30.0`
- **Vega:** `v5.28.0` / **Vega-Lite:** `v5.18.0` / **vega-embed:** `v6.25.0`

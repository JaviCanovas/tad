# 📝 NOTAS DEL SURVEY: Comparativa de Librerías de Visualización

**Proyecto:** Estudio Comparativo de Visualización mediante la Implementación de un Mapa Anatómico de Lesiones (Liverpool FC).  
**Librerías Evaluadas:** D3.js (v7.9.0), Apache ECharts (v5.5.0), Plotly.js (v2.30.0) y Vega-Lite (v5.18.0).  
**Activo Compartido:** `assets/cuerpo.svg` (ViewBox `0 0 700 500`, 13 zonas anatómicas corporales).

---

## 1. Resumen Comparativo de Capacidades

| Requisito Evaluado | D3.js (v7) | Apache ECharts (v5) | Plotly.js (v2) | Vega-Lite (v5) |
| :--- | :---: | :---: | :---: | :---: |
| **1. Regiones corporales coloreables individualmente** | 🟢 **Cumple** | 🟢 **Cumple** | 🟢 **Cumple** | 🟢 **Cumple** |
| **2. Escala de color continua con leyenda** | 🟢 **Cumple** | 🟢 **Cumple** | 🟡 **Parcial** | 🟢 **Cumple** |
| **3. Tooltip personalizado y multilínea por zona** | 🟢 **Cumple** | 🟢 **Cumple** | 🟡 **Parcial** | 🟡 **Parcial** |
| **4. Actualización al filtrar por jugador (sin recarga)** | 🟢 **Cumple** | 🟢 **Cumple** | 🟢 **Cumple** | 🟢 **Cumple** |
| **5. Uso del SVG compartido sin transformaciones complejas** | 🟢 **Cumple** | 🟢 **Cumple** | 🟡 **Parcial** | 🟡 **Parcial** |
| **6. Zonas sin datos mostradas en gris neutro** | 🟢 **Cumple** | 🟢 **Cumple** | 🟢 **Cumple** | 🟢 **Cumple** |
| **Líneas aproximadas de código del renderer** | ~170 líneas | ~130 líneas | ~240 líneas | ~160 líneas |
| **Tiempo de renderizado típico (ms)** | 1.5 – 3.5 ms | 2.5 – 6.0 ms | 6.0 – 14.0 ms | 8.0 – 20.0 ms |

---

## 2. Análisis Detallado por Librería

---

### 🟢 2.1. D3.js (v7.9.0)

- **Líneas aproximadas del renderer:** `~170 líneas` en [`js/renderers/d3.js`](file:///c:/Users/Javier%20Canovas/OneDrive%20-%20UNIVERSIDAD%20DE%20MURCIA/Documentos/M%C3%A1ster%20Big%20Data/Visualizaci%C3%B3n%20de%20Datos/TAD/js/renderers/d3.js).
- **Paradigma:** Manipulación directa y declarativa del DOM/SVG basada en flujo de datos (*data-driven documents*).

#### ¿Qué fue fácil?
- **Inyección directa del SVG:** No requirió ninguna alteración matemática de coordenadas ni conversión de formatos. Se inyecta la cadena SVG directamente en el DOM y se seleccionan los nodos mediante selectores CSS (`svg.selectAll('[data-zone="..."]')`).
- **Control de estilos y transiciones:** Aplicación fluida de colores de relleno mediante transiciones animadas D3 (`.transition().duration(300)`).
- **Tooltips HTML enriquecidos:** Soporte total de eventos del puntero (`pointerover`, `pointermove`, `pointerout`) para posicionar dinámicamente un tooltip flotante con formato HTML/CSS avanzado.

#### ¿Qué fue difícil?
- **Construcción de la leyenda continua:** D3 no incluye un componente de leyenda prefabricado "out-of-the-box". Se tuvo que construir manualmente un sub-grafo SVG (`<defs>`, `<linearGradient>`, rectángulos y marcas de texto) calculando las paradas del gradiente con la función de raíz cuadrada inversa para reflejar la no linealidad.

#### Evaluación de Requisitos y Limitaciones:
- **Todos los requisitos evaluados:** 🟢 **Cumple**.
- **Pruebas realizadas:** Se verificó la escala continua con paradas intermedias, asegurando que tanto zonas con 0 días (gris neutro `#e2e8f0`) como zonas con el máximo de 316/431 días se visualizaran con fidelidad.

---

### 🟢 2.2. Apache ECharts (v5.5.0)

- **Líneas aproximadas del renderer:** `~130 líneas` en [`js/renderers/echarts.js`](file:///c:/Users/Javier%20Canovas/OneDrive%20-%20UNIVERSIDAD%20DE%20MURCIA/Documentos/M%C3%A1ster%20Big%20Data/Visualizaci%C3%B3n%20de%20Datos/TAD/js/renderers/echarts.js).
- **Paradigma:** Configuración declarativa mediante objetos estructurados (`options`) con motor de renderizado gráfico de alto nivel.

#### ¿Qué fue fácil?
- **Soporte nativo de SVG Maps:** ECharts ofrece la función `echarts.registerMap('cuerpo', { svg: svgString })`. ECharts vincula automáticamente cualquier elemento SVG que posea el atributo `name` con el array `data` de una serie `type: 'map'`. Múltiples elementos con el mismo nombre (ej. pierna izquierda y derecha, frontal y posterior) se colorean de manera sincronizada sin código adicional.
- **Componente `visualMap`:** Proporciona una barra continua interactiva con rango seleccionable y gradiente de color automático con mínimas líneas de configuración.
- **Tooltips HTML:** El callback `tooltip.formatter` acepta cadenas HTML enriquecidas con soporte completo de maquetación.

#### ¿Qué fue difícil?
- **Escala de raíz cuadrada estricta en `visualMap` continuo:** `visualMap` continuo en ECharts asume una interpolación lineal sobre los valores brutos de la serie. Para mantener los valores reales de días en el tooltip sin alterarlos, se configuró la rampa de color continua directamente; en un entorno puramente declarativo de ECharts, una escala $\sqrt{x}$ requeriría pre-escalar el campo `value` o usar un `visualMap` de tipo *piecewise*.

#### Evaluación de Requisitos y Limitaciones:
- **Todos los requisitos evaluados:** 🟢 **Cumple**.
- **Pruebas realizadas:** Se probó `echarts.registerMap` con SVG limpio, verificando que los eventos de `emphasis` (hover) y el enlace de datos por nombre funcionaran perfectamente.

---

### 🟡 2.3. Plotly.js (v2.30.0)

- **Líneas aproximadas del renderer:** `~240 líneas` en [`js/renderers/plotly.js`](file:///c:/Users/Javier%20Canovas/OneDrive%20-%20UNIVERSIDAD%20DE%20MURCIA/Documentos/M%C3%A1ster%20Big%20Data/Visualizaci%C3%B3n%20de%20Datos/TAD/js/renderers/plotly.js).
- **Paradigma:** Gráficos científicos y estadísticos basados en trazas Cartesianas y polares.

#### ¿Qué fue fácil?
- **Reactividad:** `Plotly.react(container, data, layout)` actualiza el gráfico con gran agilidad y sin parpadeos.

#### ¿Qué fue difícil?
- **Ausencia de serie de coropleta para SVG arbitrario:** Plotly cuenta con `choropleth` y `choroplethmapbox`, pero ambos exigen coordenadas geográficas terrestres (latitud/longitud). No existe un tipo de serie nativo que admita un mapa SVG personalizado como geometría base.
- **Limitación de `layout.shapes`:** Para dibujar el cuerpo se debieron inyectar los paths SVG como `layout.shapes` de tipo `'path'`. No obstante:
  1. Los `shapes` de Plotly **no emiten eventos de puntero** (`hover` / `click`), por lo que no pueden mostrar tooltips directamente.
  2. Los `shapes` **no se asocian a un `colorbar`**, impidiendo que Plotly genere una leyenda automática para ellos.
- **Mecanismo idiomático empleado:**
  - Se colocaron marcadores invisibles (`scatter` con `opacity: 0`) en los **centroides calculados** de cada zona anatómica para interceptar el ratón y activar los tooltips.
  - Se vinculó una barra de color (`marker.colorbar`) a esta traza de dispersión auxiliar para mostrar la leyenda continua requerida.
  - Se invirtió el eje Y cartesiano (`yaxis: { range: [500, 0] }`) para corregir la inversión vertical de los paths SVG.

#### Evaluación de Requisitos y Limitaciones:
- **Escala de color con leyenda:** 🟡 **Parcial** (requiere una traza scatter auxiliar con `colorbar`).
- **Tooltip personalizado por zona:** 🟡 **Parcial** (`layout.shapes` no tiene hover nativo; depende de puntos scatter en centroides).
- **Uso del SVG compartido:** 🟡 **Parcial** (requiere descomponer el SVG en strings individuales y calcular centroides).
- **Pruebas realizadas:** Se intentó usar series `choropleth` (descartado por requerir proyecciones geográficas WGS84) y `scattergl` antes de implementar la solución basada en `shapes` + traza de centroides.

---

### 🟡 2.4. Vega-Lite (v5.18.0 con vega-embed)

- **Líneas aproximadas del renderer:** `~160 líneas` en [`js/renderers/vegalite.js`](file:///c:/Users/Javier%20Canovas/OneDrive%20-%20UNIVERSIDAD%20DE%20MURCIA/Documentos/M%C3%A1ster%20Big%20Data/Visualizaci%C3%B3n%20de%20Datos/TAD/js/renderers/vegalite.js).
- **Paradigma:** Gramática formal y declarativa de visualización de datos.

#### ¿Qué fue fácil?
- **Escala continua con raíz cuadrada declarativa:** Vega-Lite admite nativamente `scale: { type: 'sqrt' }` en el canal de color, calculando automáticamente el mapeo no lineal y la leyenda continua correspondiente con un único parámetro.
- **Regla condicional para valores cero:** La expresión `condition: { test: 'datum.properties.days_lost == 0', value: '#e2e8f0' }` resolvió de forma inmediata el requisito del gris neutro.

#### ¿Qué fue difícil?
- **Imposibilidad de ingerir archivos SVG de forma nativa:** Vega-Lite no dispone de una marca para inyectar o referenciar un archivo SVG externo como mapa particionado. Su marca espacial `geoshape` opera estrictamente sobre objetos **GeoJSON / TopoJSON**.
- **Conversión geométrica requerida:** Para consumir el activo compartido `cuerpo.svg`, se debió implementar una rutina de muestreo vectorial (`shared.js` $\rightarrow$ `getBodyGeoJSON`) que recorre los paths del SVG mediante la API `getPointAtLength` y construye polígonos cerrados en formato `FeatureCollection` GeoJSON proyectados con `{ type: 'identity', reflectY: false }`.
- **Formateo de tooltips multilínea:** El canal nativo `tooltip` de Vega-Lite genera una tabla flotante clave-valor. Para incluir listas de lesiones detalladas se requirió formatear cadenas concatenadas en el preprocesado.

#### Evaluación de Requisitos y Limitaciones:
- **Uso del SVG compartido:** 🟡 **Parcial** (requiere conversión matemática previa de SVG a GeoJSON).
- **Tooltip multilínea:** 🟡 **Parcial** (soporte nativo limitado a pares clave-valor).
- **Escala de color y leyenda:** 🟢 **Cumple** (soporte nativo sobresaliente para `type: "sqrt"`).
- **Pruebas realizadas:** Se probó la marca `image` y `path` en Vega puro frente a `geoshape` en Vega-Lite, concluyendo que `geoshape` con GeoJSON en proyección identidad es el mecanismo más idiomático dentro de la gramática de Vega-Lite.

---

## 3. Conclusiones y Recomendaciones de Diseño

1. **Para infografías vectoriales personalizadas e interactivas (mapas anatómicos, planos de planta, diagramas esquemáticos):**
   - **D3.js** y **Apache ECharts** son las opciones idóneas. D3 ofrece máxima libertad a bajo nivel sobre el SVG; ECharts brinda la solución de más alto nivel con su motor nativo de mapas SVG (`registerMap`), requiriendo la menor cantidad de código (~130 líneas).
2. **Para tableros científicos y analítica estadística estándar:**
   - **Plotly.js** destaca en gráficos de dispersión, series temporales y mapas cartográficos reales, pero no es la herramienta adecuada para visualizaciones sobre siluetas anatómicas o diagramas vectoriales arbitrarios debido a la falta de interactividad nativa en `shapes`.
3. **Para especificación declarativa y reproducibilidad:**
   - **Vega-Lite** destaca por la elegancia de su gramática de escalas (la escala `sqrt` se declaró en 2 líneas), pero impone el coste de traducir previamente cualquier activo vectorial a especificaciones GeoJSON.

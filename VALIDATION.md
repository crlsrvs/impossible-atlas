# Validación del Proyecto

Validado con Node 24+ y Vitest 5 sobre las **ocho familias de mundos** y el esquema **v2**.

## Comprobaciones técnicas

| Comando                           | Resultado                                   |
| --------------------------------- | ------------------------------------------- |
| `npm test`                        | 82 pruebas aprobadas en tres archivos       |
| `npm run typecheck`               | TypeScript estricto sin errores             |
| `npm run lint`                    | Sin errores ni advertencias                 |
| `npm run build`                   | Compilación de producción correcta          |
| `npm audit`                       | Cero vulnerabilidades en el árbol instalado |
| Respuesta HTTP del servidor local | 200 OK                                      |

El código de la escena se divide en un chunk independiente (~923 kB antes de gzip, ~249 kB comprimido). La interfaz inicial ronda ~265 kB antes de gzip (~84 kB comprimido). No se descargan modelos, texturas ni archivos de audio externos.

## Funcionalidades verificadas

- **Ocho familias procedurales**: _Floating Archipelago_, _Tiny Alien Planet_, _Pink Ocean Sanctuary_, _Crystal Wilderness_, _Cloudborne Citadel_, _Desert of Suns_, _Jellyfish Garden_ y _Obsidian Caldera_, con tres variantes estructurales cada una y huellas de regresión intactas para las cuatro familias originales.
- **Personalización v2 y Calidad Gráfica**: Composición (`auto`, `minimal`, `balanced`, `complex`), escala de vegetación, fragmentos flotantes, densidad de partículas, velocidad de animación, intensidad de luz y selector de calidad gráfica (`auto`, `eco`, `high`).
- **World Studio**:
  - Historial de sesión de hasta 50 mundos con navegación atrás/adelante y truncado al ramificar.
  - Exportación de postales PNG editoriales (`1600 × 1000 px`) renderizadas bajo demanda desde el Canvas WebGL.
  - Colección con búsqueda por nombre o semilla, filtrado por familia, y exportación/importación JSON con deduplicación y límite de 100 mundos.
- **Living Worlds**:
  - Sintetizador de paisaje sonoro ambiental mediante Web Audio API (`AmbientSoundscape`) con parámetros deterministas por familia, atmósfera, semilla y surrealismo.
  - Tres encuadres de cámara (_Vista orbital_, _Enfoque de anomalía_ y _Vista cenital_).
- **Higiene de recursos y accesibilidad**:
  - Liberación explícita de geometrías dinámicas (`BufferGeometry` de islas, cristales y `TubeGeometry` de tentáculos y canales de lava).
  - Diálogos modales nativos con `closedby="any"`, `aria-labelledby` y respaldo por caja delimitadora (`getBoundingClientRect`) para navegadores sin `closedBy`.

## Cobertura automatizada

Determinismo de los ocho generadores, secuencia de referencia del PRNG, tres variantes por familia, diferencias entre semillas, densidad y surrealismo, datos finitos, límites de objetos, paletas, plantas sobre la esfera, mutaciones sucesivas y semillas largas, serialización íntegra de URLs v1 y v2, versión desconocida, valores inválidos, historial de sesión, filtrado y exportación/importación JSON de favoritos, perfiles de calidad gráfica, poses de cámara y síntesis armónica determinista.

## Límites de esta validación

No se realizaron benchmarks de FPS, pruebas prolongadas de memoria, inspección visual en una ventana de escritorio completa, pruebas con dispositivos táctiles físicos ni auditoría con lector de pantalla. No se cambió la preferencia de movimiento reducido del sistema ni se desactivó WebGL deliberadamente. La implementación contempla estos casos; no se presentan como pruebas manuales ejecutadas.

La reproducción se valida sobre los datos del mundo; no se garantiza una captura idéntica píxel a píxel entre GPUs. No se publicó en un hosting externo: la entrega y la vista previa son locales.

# Impossible Atlas

**The Art of Impossible Worlds.** Una experiencia local para generar, contemplar, explorar y coleccionar dioramas 3D surrealistas.

## Ejecutar

Requiere Node.js **22.12 o superior** (recomendado Node 24 LTS), npm y un navegador con WebGL 2 y aceleración gráfica.

```bash
cd "/Users/pablomarmol/Desktop/projects/impossible-atlas"
npm install
npm run dev
```

Abre la dirección local que imprime Vite, normalmente **http://localhost:5173**. Para instalaciones reproducibles con el lockfile, usa `npm ci` en lugar de `npm install`.

```bash
npm run typecheck
npm run lint
npm test
npm run build
npm run preview
```

`npm run preview` sirve la compilación de `dist/`, normalmente en http://localhost:4173. No es necesario backend, cuenta, clave de API ni modelo 3D externo. La tipografía de Google Fonts es opcional: sin conexión se usan las fuentes de respaldo del sistema.

## Explorar

- Arrastra para orbitar y usa el scroll o un gesto de pinza para acercarte. La cámara tiene límites de distancia e inclinación.
- Con el lienzo enfocado mediante Tab: **flechas** para orbitar, **+ / −** para acercar o alejar y **R** para restablecer. El botón de las esquinas también restablece la cámara.
- **Generar mundo** crea una semilla nueva. Selecciona **Sorpréndeme** para variar también la familia.
- **Tipo de mundo** ofrece ocho familias. Usa las flechas debajo del selector para recorrerlas conservando la semilla y comparar sus composiciones.
- **Aleatorizar todo** cambia la semilla, la familia, la paleta, la atmósfera y todos los ajustes en un clic.
- **Mutar** conserva familia, nombre, composición principal y paleta; cambia vegetación, tamaños de detalles y objetos ambientales. El sufijo `~n` de la semilla identifica la variación.
- Los ajustes de surrealismo, densidad, paleta y atmósfera se aplican directamente. La semilla se aplica con Enter o la flecha del campo.
- **Enfoque y vistas de cámara**: El botón de encuadre alterna entre **Vista orbital**, **Enfoque de anomalía** y **Vista cenital**.
- **Historial de exploración**: Las flechas de la barra de herramientas de la escena permiten retroceder y avanzar por hasta 50 mundos visitados durante la sesión.
- **Postal fotográfica**: El botón **Postal** (o el icono de cámara) renderiza y descarga una postal PNG en alta resolución (`1600 × 1000 px`) con el diorama, número de mundo, nombre, familia y semilla.
- **Paisaje sonoro generativo**: El control de sonido activa un sintetizador ambiental mediante Web Audio API cuyos acordes, armónicos y filtros responden a la familia, atmósfera, surrealismo y velocidad del mundo, sin descargar archivos de audio externos.
- En **Más personalización** puedes elegir una de tres composiciones, ajustar vegetación, fragmentos flotantes, partículas, velocidad e intensidad de luz, y seleccionar el perfil de **Calidad gráfica** (_Automática_, _Eco_ o _Alta_).
- **Guardar** conserva la configuración completa en este navegador; vuelve a pulsarlo para retirarla. **Mi colección** permite buscar por nombre o semilla, filtrar por familia, abrir o eliminar favoritos (máximo 100), y **exportar o importar** toda la colección en formato JSON.
- **Compartir** copia una URL con todos los parámetros. Si el portapapeles está bloqueado, muestra un campo seleccionable para copiarla manualmente. La dirección también se actualiza al cambiar de mundo.
- Puedes pausar los movimientos ambientales. Se respeta `prefers-reduced-motion`, que también desactiva las transiciones y la inercia de la cámara.

Los enlaces usan el origen del servidor actual. Un enlace de `localhost` necesita que la aplicación se ejecute en esa dirección en el ordenador de quien lo abre. Para compartir por internet, sirve `dist/` en un hosting estático y copia el enlace desde allí.

## Ocho familias

| Familia              | Composición                                                                                            | Anomalías                                                                                    |
| -------------------- | ------------------------------------------------------------------------------------------------------ | -------------------------------------------------------------------------------------------- |
| Floating Archipelago | Isla principal con portal, camino de losas e islas satélite; tres disposiciones                        | Rocas en órbita, portal suspendido y, con surrealismo alto, árbol invertido e isla invertida |
| Tiny Alien Planet    | Esfera facetada, hongos distribuidos sobre su superficie; tres inclinaciones y cantidades de satélites | Vegetación desmesurada, satélites orbitales                                                  |
| Pink Ocean Sanctuary | Disco de agua rosa con ondas, islas y monumento; tres cantidades de islas                              | Fragmentos de agua suspendida y santuario flotante                                           |
| Crystal Wilderness   | Terreno rocoso con prismas y un grupo central de tres, cuatro o cinco cristales                        | Cristales suspendidos y anillo luminoso                                                      |
| Cloudborne Citadel   | Ciudad sobre plataformas de roca, torres con ventanas luminosas y puentes transitables visualmente     | Puentes sin soporte y coronas de torres suspendidas                                          |
| Desert of Suns       | Dunas, vegetación desértica, obeliscos, un reloj de arena y uno, dos o tres soles                      | Arena que asciende dentro del reloj y soles suspendidos                                      |
| Jellyfish Garden     | Arrecife luminoso bajo medusas facetadas con tentáculos curvos                                         | Medusas que flotan en el aire y burbujas en órbita                                           |
| Obsidian Caldera     | Cráter abierto, lava emisiva, columnas basálticas y variación con dos volcanes                         | Cascadas de lava en el vacío y obsidiana orbital                                             |

Cinco paletas coordinan terreno, vegetación, fondo, agua, luces y acentos. Tres atmósferas cambian la iluminación. El motor impone límites incluso con densidad y surrealismo al máximo.

## Decisiones técnicas

React 19, TypeScript estricto, Vite, Three.js, React Three Fiber 9, Drei, CSS y Lucide. El estado cabe en React y no requiere Zustand. Vitest comprueba el núcleo puro sin WebGL; ESLint verifica el código y las reglas de React.

El PRNG Mulberry32 parte de un hash FNV-1a de la semilla. Estructura, detalles y nombres usan flujos separados. Solo la creación de semillas usa `crypto.getRandomValues`. La configuración actual usa el esquema v2; los enlaces y favoritos v1 se convierten con valores de personalización neutros. Las versiones desconocidas se rechazan con un mensaje.

La vegetación, rocas y partículas usan mallas instanciadas. No hay texturas ni postprocesamiento pesado. En pantallas estrechas se desactivan sombras y se limita el DPR a 1.3; en escritorio se limita a 1.75. Al pausar, el lienzo renderiza bajo demanda. Las geometrías se liberan al sustituirlas y los eventos del contexto se limpian al desmontar.

## Verificación y límites

Las pruebas cubren determinismo, secuencia de referencia del PRNG, diferencias por semilla, las tres variantes de cada familia, límites, orientación/distribución esférica, mutación, paletas, URLs, datos incompatibles y fallos de almacenamiento. Consulta [VALIDATION.md](VALIDATION.md) para los resultados y el recorrido visual realizado.

No se garantiza una tasa de 60 FPS: depende del dispositivo, navegador, resolución y GPU. El perfil de calidad usa el ancho de pantalla, sin medir la capacidad real de la GPU. El fallback WebGL conserva el acceso a controles y favoritos, pero no sustituye el render 3D. Los favoritos pertenecen al origen y perfil del navegador y no se sincronizan; borrar datos del sitio los elimina.

La reproducibilidad cubre los datos procedurales, no píxeles idénticos entre GPUs, momentos de la animación o versiones de Three.js. Las cuatro familias originales conservan su geometría de referencia, comprobada con huellas de regresión; las nuevas se añaden sin modificar esos algoritmos.

## Extender

Lee [ARCHITECTURE.md](ARCHITECTURE.md) para añadir un arquetipo. Las expansiones futuras están en [ROADMAP.md](ROADMAP.md); no forman parte de esta versión.

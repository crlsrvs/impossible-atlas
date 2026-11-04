# Arquitectura

## Flujo

```text
URL / controles / favorito
          ↓
normalizeConfig → WorldConfig v2 (admite enlaces/favoritos v1)
          ↓
generateWorld → datos puros WorldData
          ↓
WorldScene → geometrías, materiales e instancias Three.js
```

## Responsabilidades

- `src/core/world.ts`: tipos, validación, paletas, PRNG, semillas, nombres, mutación, aleatorización completa y registro de ocho generadores. No importa React ni Three.js.
- `src/core/expeditions.ts`: generadores puros de ciudad, desierto, medusas y volcán. Solo importa tipos del núcleo y usa los flujos aleatorios recibidos.
- `src/core/audio.ts`: poses deterministas de cámara (`orbit`, `closeup`, `zenith`), cálculo puro de frecuencias armónicas (`computeSoundscape`) y sintetizador ambiental Web Audio API (`AmbientSoundscape`).
- `src/core/storage.ts`: serialización de enlaces, validación de versiones, historial de sesión (`createHistory`, `pushHistory`, `stepHistory`), filtrado y exportación/importación JSON de favoritos, perfil de calidad gráfica y persistencia inyectable mediante `StorageLike`.
- `src/scene/WorldScene.tsx`: Canvas, luces, cámara con vistas enfocadas, exportador de postales PNG (`PostcardExporter`), perfiles de calidad (`auto`, `eco`, `high`), mallas instanciadas, geometría facetada, monumentos, animación y recuperación visual de errores. Se carga en un chunk independiente.
- `src/scene/ExpeditionElements.tsx`: torres, ventanas instanciadas, puentes, reloj con arena ascendente, soles, medusas con curvas de tentáculos y volcanes con canales de lava, con liberación explícita de geometrías `TubeGeometry`. Las animaciones respetan pausa, velocidad y movimiento reducido.
- `src/components/WorldCustomization.tsx`: selector de composición, cinco controles adicionales de escala, partículas, velocidad y luz, y selector de perfil de calidad gráfica.
- `src/App.tsx`: configuración, historial de exploración, paisaje sonoro, acciones, colección con búsqueda/filtro y exportación/importación JSON, estados accesibles y paneles. Solo la cámara y los grupos animados cambian por frame; React no recibe actualizaciones por frame.
- `src/styles.css`: composición editorial, panel móvil plegable, miniaturas CSS por familia, foco visible y movimiento reducido.
- `src/core/*.test.ts`: contratos de reproducción, sonido/cámara, historial y persistencia que no requieren GPU.

## Contrato del generador

Una configuración contiene `schemaVersion`, `seed`, `archetype`, `palette`, `surrealism`, `density` y `atmosphere`. Los valores numéricos se redondean y limitan a 0–100. La raíz de la semilla se limita a 72 caracteres, con espacio adicional para el sufijo de mutación. `~` seguido por uno a seis dígitos al final se reserva para mutaciones.

El esquema v2 añade `composition` (`auto`, `minimal`, `balanced`, `complex`), `vegetationSize`, `fragmentSize`, `particleDensity`, `animationSpeed` y `lightIntensity`. Los valores neutros son composición automática y 50 en cada deslizador. `randomizeWorld` asigna una semilla nueva y valores concretos a todas las propiedades editables con un flujo PRNG separado; conserva reproducibilidad en pruebas cuando se le proporciona la semilla.

El arquetipo se elige antes de llamar al generador. Una configuración siempre contiene una familia concreta, incluso en modo sorpresa. `auto` selecciona la paleta de forma determinista desde la semilla raíz.

Los flujos de estructura y nombre dependen de la raíz; el de detalles usa la semilla completa. Mutar incrementa el sufijo, preservando la composición y resolviendo la paleta automática al mismo color. La densidad afecta la cantidad; el surrealismo afecta escalas, elevación, tamaño de fragmentos o anomalías adicionales, según la familia. No hay `Math.random()` dentro de la generación ni del renderizado.

Los objetos se expresan como datos serializables: islas, plantas, rocas, monumentos, anillos y partículas. Las nuevas familias añaden `features`, una lista opcional de estructuras con tipo, posición, escala, rotación, variante y fase de movimiento. Las familias originales omiten ese campo para preservar su salida de referencia. En el planeta, la posición de una planta también define su normal; el render usa `Quaternion.setFromUnitVectors` para orientar su eje local a esa normal. En las demás familias se usa la rotación Euler almacenada.

## Añadir una familia

1. Añadir el identificador a `ARCHETYPES` y sus metadatos a `archetypeInfo`.
2. Implementar una función pura que reciba `GenerationContext` y rellene `WorldData`, e incorporarla a `generators`. Usar solo los PRNG recibidos y mantener límites explícitos.
3. Definir tres variantes de composición y dos anomalías visibles. Registrar únicamente fenómenos realmente renderizados en `anomalies`; la descripción se construye a partir de esa lista.
4. Añadir vocabulario y una frase descriptiva para la familia.
5. Reutilizar las primitivas existentes del render o incorporar un componente específico en `Diorama`. Si necesita datos nuevos, añadir un tipo concreto; evitar un sistema genérico de plugins.
6. Añadir estilo de miniatura en la galería y comprobar la cámara inicial y la densidad máxima en pantalla estrecha y escritorio.
7. Extender las pruebas: el conjunto parametrizado ya recorre los identificadores de `ARCHETYPES`.

## Versionado

Los cambios que alteren la salida de una configuración existente requieren una nueva versión de generador/esquema. La versión actual escribe v2 y admite v1: sus controles nuevos reciben valores neutros para conservar su geometría, sin cambiar los flujos de estructura/detalles. Cuatro huellas de regresión verifican la salida previa de los arquetipos originales. Las nuevas familias amplían el registro sin cambiar esos generadores. Antes de modificar en el futuro sus algoritmos, conservar la implementación antigua y despachar por versión. Las versiones desconocidas se rechazan con un aviso.

El almacenamiento se limita a 100 favoritos y deduplica configuraciones normalizadas. Las entradas corruptas o incompatibles se omiten con un aviso. No se ejecuta contenido de semillas, nombres ni parámetros de URL.

## Calidad y recursos

Geometrías repetidas se agrupan en instancias. R3F libera recursos declarativos; las geometrías creadas manualmente tienen su propio cleanup. El listener de pérdida de contexto también se retira al desmontar para no confundir el cierre de un Canvas de desarrollo con un fallo del siguiente. No hay modelos, descargas de texturas, física, redes de estado ni backend.

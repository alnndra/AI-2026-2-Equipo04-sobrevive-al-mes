# Un día de Camila: ¿le alcanza la plata hasta fin de quincena?

Trabajo Final de Agentes Inteligentes, USIL 2026 2, parte 1. Todos los datos son simulados.

**Demo:** https://alnndra.github.io/AI-2026-2-Equipo04-sobrevive-al-mes/
**Repositorio:** https://github.com/alnndra/AI-2026-2-Equipo04-sobrevive-al-mes.git

## Problema y quién lo sufre

Muchas estudiantes universitarias de Lima viven con un presupuesto limitado, ya sea una mesada, un sueldo pequeño o lo que les queda de la quincena, y lo van gastando en cosas pequeñas que parecen inofensivas: un antojo a la salida de clase, una impresión de último minuto, una colecta para el cumpleaños de una compañera, un café para estudiar, un taxi cuando ya es de noche. Cada gasto por separado no parece grave, pero juntos hacen que el dinero se acabe antes de tiempo, y entonces aparecen las consecuencias reales: dejar de almorzar, no tener para el pasaje de regreso o volver caminando por la noche. Casi nadie lo planea, porque no se sabe cuánto se puede gastar cada día para llegar al final de la quincena. Este proyecto simula ese problema con Camila, una estudiante de USIL, para comparar distintas formas de decidir en qué gastar y ver cuál le permite llegar al final sin quedarse sin pasaje.

## Cómo funciona la simulación

El juego es un simulador en pixel art, visto desde arriba, ambientado en una ciudad peruana donde está la universidad USIL con su puerta de ingreso, la casa de Camila con su perro y su gato, un Tambo, paraderos, la biblioteca, la tienda de impresiones y copias, la cafetería, un Starbucks y un Bembos. Por la pista que rodea la ciudad circulan buses, taxis y mototaxis, y Camila camina por las calles peatonales con su mochila.

Cada día empieza en la casa de Camila con el saldo que le quedó del día anterior. Antes de que salga, el juego sortea con una semilla cómo será ese día: si llueve, si hay paro de transporte, si tiene examen o un trabajo para imprimir, si hay comida en casa y qué eventos le aparecerán en cada lugar. Como la semilla es la misma para todos, cada técnica vive exactamente el mismo día.

Camila sale a caminar y sobre su cabeza aparece una nubecita con lo que piensa, siempre sobre el lugar al que va a llegar: "ya tengo hambre", "ese bubble tea me está mirando" o "mi billetera me dijo que ya basta". Pasa por el Tambo, donde si no hubo desayuno en casa puede comprar algo, y llega al paradero. Ahí elige cómo viajar entre bus, mototaxi y taxi, del más barato al más caro. A veces el bus pasa lleno o no hay taxis a esa hora, y esa opción aparece apagada con su razón. El vehículo la lleva por la pista y la deja en el punto de acceso más cercano a la universidad, desde donde sigue a pie.

En el campus y alrededor recorre Atención al alumno, el aula y el patio, la biblioteca, Impresiones y Copias, la cafetería, Starbucks y Bembos. En cada lugar puede aparecer un evento de tres tipos: una necesidad, como el almuerzo o una impresión urgente, un antojo, como un emoliente o una hamburguesa, o una sorpresa, como una multa de biblioteca o un yapeo equivocado. Camila decide aceptar o rechazar. Rechazar una necesidad tiene consecuencias, como más hambre o llegar tarde, y si no le alcanza el dinero el juego se lo avisa en lugar de dejarla gastar.

En pantalla se ve su saldo, su hambre, su energía, la batería del celular, el clima y una referencia de cuánto debería gastar ese día. Al final regresa a casa en bus, mototaxi o taxi, y de noche el taxi es más seguro pero más caro. El resumen del día le muestra cuánto gastó frente a la referencia y le advierte que, si se pasó, mañana tendrá menos. Si un día no le alcanza ni para el pasaje del bus, el dinero se acabó y la simulación termina para esa técnica.

Se puede usar de tres formas: jugar tú mismo moviendo a Camila con el teclado o arrastrando con el dedo, ver a un agente jugar solo, o comparar todos los agentes con el botón Comparar.

## Modo base y técnicas comparadas

Todas las técnicas viven los mismos eventos y se miden con el mismo puntaje: bienestar acumulado más bonos por puntualidad y por llegar al último día, menos penalizaciones por no volver en transporte o quedarse sin dinero. Usamos varias métricas porque, si solo midiéramos el saldo, ganaría quien nunca gasta.

| Técnica | Cómo decide |
|---|---|
| Modo base | Compra todo lo que puede pagar sin mirar el saldo y viaja en bus si le alcanza. |
| Reflejo | Reglas fijas sin memoria: acepta necesidades y sorpresas, rechaza antojos de más de S/ 4 y elige el transporte según la hora y el clima. |
| Modelo | Reserva el dinero del regreso y de los días que faltan antes de aceptar un gasto. |
| Objetivos | Sigue metas en orden: llegar puntual, comer, volver a casa, terminar con saldo y no deber. |
| Utilidad | Puntúa cada opción con bienestar, tiempo, seguridad, riesgo de quedarse sin dinero y días restantes, con pesos ajustables. |

## Tabla de resultados

Presupuesto medio de S/ 390, 15 días, 200 corridas por técnica con semillas base 2025 a 2224.

| Técnica | Métrica: puntaje promedio (% que llegó al final) | Tiempo total | Corridas |
|---|---|---|---|
| Modo base | −41.3 ± 3.2 (0 %) | 24 ms | 200 |
| Reflejo | 0.5 ± 3.4 (0 %) | 27 ms | 200 |
| Modelo | 43.5 ± 5.0 (97 %) | 80 ms | 200 |
| Objetivos | 53.6 ± 6.6 (88 %) | 66 ms | 200 |
| **Utilidad** | **64.0 ± 5.5 (96 %)** | 78 ms | 200 |

El ± es el margen de error del promedio con 95 % de confianza. El tiempo es el total de las 200 corridas medido en el navegador y cambia un poco según el computador.

Con este presupuesto la utilidad obtiene el mayor puntaje y llega al final en el 96 % de las corridas, mientras que el modo base nunca llega. Con presupuesto holgado la utilidad también gana, y con presupuesto ajustado ninguna técnica llega al final de forma confiable. El botón Comparar de la demo repite estas corridas.

## Cómo ejecutarlo

En línea: abre el enlace de la demo. En tu computador: ejecuta `python -m http.server 8765` en la carpeta del proyecto y abre `http://localhost:8765/index.html`, o abre `index.html` con doble clic. La única dependencia externa es sql.js desde un CDN, con respaldo en memoria si no carga.

## Qué código se generó con IA y qué se modificó

El código del juego, incluidos los agentes, fue generado con Claude Code a partir de prompts escritos por el equipo, y las imágenes se crearon con herramientas de IA y se procesaron con un script. Nosotras definimos el problema, el recorrido, los eventos y las reglas, y revisamos el código por etapas.

Modificaciones propias del equipo: entre las tres trabajamos los agentes y dejamos sus reglas como parámetros que podemos cambiar. Alondra se encargó del modo base y del agente reflejo. Yasmin se encargó del agente de modelo y del agente de objetivos. Ashley se encargó del agente de utilidad.

## Rol de cada integrante

| Integrante | Rol |
|---|---|
| Gonzales Cuaresma, Alondra Yamileth | Modo base y agente reflejo |
| Haji Taira, Yasmin Akemi | Agentes de modelo y de objetivos |
| Kuniyoshi Zambrano, Ashley Misae | Agente de utilidad |

**Cómo trabajamos el repositorio.** Usamos ramas para no tocar la versión publicada:

| Rama | Para qué sirve |
|---|---|
| `main` | Versión final que publica GitHub Pages. Solo recibe `develop` cuando todo funciona. |
| `develop` | Rama de integración: aquí se junta el trabajo de las tres y se prueba el juego completo. |
| `feature/alondra`, `feature/yasmin`, `feature/ashley` | Rama de cada integrante. Cada una sube ahí sus commits y luego los une a `develop`. |

El código está separado por capas: `css` para los estilos, `assets` para las imágenes, y dentro de `js` las carpetas `nucleo` (generador con semilla, base de datos y motor del día), `transporte`, `agentes` (un archivo por técnica), `simulador` (corridas y comparación), `mapa` (mundo, personaje y vehículos) e `interfaz` (paneles, tabla y gráfico), con `principal.js` para el arranque.

// archivo: mundo.js, carpeta mapa.
// qué hace: define el mundo del mapa: su tamaño, el tamaño de la cámara, las filas de edificios, los
// carriles, la carga de imágenes desde la carpeta assets, la posición de cada edificio y su puerta, la
// pista de los vehículos, los puntos de acceso y las zonas por donde camila puede caminar.
// el mapa solo dibuja y camina lo que el motor decide. su mecánica viene de un mapa de pueblo de prueba:
// mundo de 1800 por 1300 píxeles, cámara de 800 por 500, suelo dibujado una sola vez, tres calles,
// tres carriles y orden de dibujo por profundidad.
// se relaciona con: atlas.js de assets, que dice dónde está cada imagen, con caminos.js, suelo.js y
// decoracion.js, que usan estas medidas, y con vehiculos.js y movimiento.js, que respetan las zonas.
// responsable: ashley misae kuniyoshi zambrano.
"use strict";

// tamaño del mundo y de la vista de la cámara, en píxeles.
const WW = 1800, WH = 1300, VW = 800, VH = 500;
const BASES = [330, 640, 950];                                  // línea base de cada fila de edificios
const SEG = [[98, 420], [480, 870], [930, 1320], [1380, 1702]]; // tramos de cada fila donde va un edificio
const CX = [450, 900, 1350];                                    // centro de los carriles verticales
const VEL = 85;                                                 // velocidad de camila en píxeles por segundo

// mezcla fija de dos números que da siempre el mismo resultado. sirve para repartir la decoración en el
// mapa sin usar el azar del motor, así el generador de los eventos nunca se toca.
const H = (a, b) => { let v = a * 374761393 + b * 668265263; v = (v ^ (v >> 13)) * 1274126177; return ((v ^ (v >> 16)) >>> 0) % 1000; };
// crea una imagen del navegador y le da la ruta del archivo. la ruta es relativa a index.html, por ejemplo
// assets, tiles y el nombre del archivo, así funciona en github pages y al abrir el archivo con doble clic.
// las imágenes solo se dibujan, nunca se leen sus píxeles, por eso no hay problemas al abrirlas sin servidor.
const cargar = src => { const i = new Image(); i.src = src; return i; };

// imágenes de cada edificio: la normal y la de ventanas encendidas, que se usa de noche.
const IMG = {};
for (const [k, o] of Object.entries(IMAGENES.edificios)) IMG[k] = { ...o, img: cargar(o.src), luz: cargar(o.luces) };
// imágenes de los tiles del suelo, la pista y las veredas.
const TILE = Object.fromEntries(Object.entries(IMAGENES.tiles).map(([k, s]) => [k, cargar(s)]));
// hoja con los cuadros de camila caminando.
const HOJA = cargar(IMAGENES.camila.src);
// vehículos: por cada vista, frente, espalda, izquierda y derecha, hay cuadros llenos, con camila
// adentro, y vacíos.
const VEHI = {};
for (const [tipo, vistas] of Object.entries(IMAGENES.vehiculos)) {
  VEHI[tipo] = {};
  for (const [vista, d] of Object.entries(vistas)) VEHI[tipo][vista] = { w: d.w, h: d.h, lleno: d.lleno.map(cargar), vacio: d.vacio.map(cargar) };
}

// edificios del mapa. arriba, con posiciones puestas a mano para dejar pasos libres hacia la pista:
// paradero de regreso, bembos, atención al alumno y usil. en medio: starbucks, cafetería, impresiones y
// biblioteca. abajo: paradero de ida, tambo y casa. el paradero de ida queda lejos de usil para que el
// viaje se note.
const LUGARES = [
  { id: "paradero_regreso", img: "paradero", fila: 0, x: 110 },
  { id: "bembos", img: "bembos", fila: 0, x: 380 },
  { id: "atencion", img: "atencion", fila: 0, x: 1030 },
  { id: "usil", img: "usil", fila: 0, x: 1330 },
  { id: "starbucks", img: "starbucks", fila: 1, seg: 0 },
  { id: "cafeteria", img: "cafeteria", fila: 1, seg: 1 },
  { id: "impresiones", img: "impresiones", fila: 1, seg: 2 },
  { id: "biblioteca", img: "biblioteca", fila: 1, seg: 3 },
  { id: "paradero_ida", img: "paradero", fila: 2, seg: 0 },
  { id: "tambo", img: "tambo", fila: 2, seg: 1 },
  { id: "casa", img: "casa", fila: 2, seg: 3 },
];
// nombre que se muestra en pantalla para cada lugar.
const NOMBRE_LUGAR = { casa: "Casa", paradero_ida: "Paradero de ida", tambo: "Tambo", usil: "USIL", atencion: "Atención al alumno",
  starbucks: "Starbucks", cafeteria: "Cafetería", impresiones: "Impresiones y Copias", biblioteca: "Biblioteca", bembos: "Bembos", paradero_regreso: "Paradero de regreso" };

// apoya cada edificio en su línea base y calcula el punto de su puerta, donde camila entra.
LUGARES.forEach(L => {
  const o = IMG[L.img];
  L.w = o.w; L.h = o.h;
  if (L.seg !== undefined) { const [s0, s1] = SEG[L.seg]; L.x = Math.round(s0 + (s1 - s0 - o.w) / 2); }
  L.base = BASES[L.fila];
  L.y = L.base + 10 - o.h;
  L.sx = L.x + o.dx;
  L.sy = L.y + o.by;
});
// los mismos lugares, pero se pueden buscar por su nombre.
const LUGAR = Object.fromEntries(LUGARES.map(L => [L.id, L]));

// lugares donde sube y donde baja camila en cada tramo. el vehículo no entra a las calles: para en el
// punto de acceso de la pista que deja la caminata más corta hasta esos lugares, como calcula la función
// mejor acceso de caminos.js.
const PUNTOS_VIAJE = {
  ida: { sube: "paradero_ida", baja: "usil" },
  vuelta: { sube: "paradero_regreso", baja: "casa" },
};
const CARRIL = { arriba: 36, abajo: WH - 36, izq: 35, der: WW - 35 }; // centro de cada tramo de la pista
const ANCHO_PISTA = 70;   // ancho del asfalto de la pista en píxeles

// máscaras: la pista es de los vehículos, y las veredas y calles son de camila.
// máscara de vehículos: solo el asfalto del anillo de afuera, cuatro bandas de 70 píxeles.
const MASCARA_PISTA = [[0, 0, WW, ANCHO_PISTA], [0, WH - ANCHO_PISTA, WW, ANCHO_PISTA], [0, 0, ANCHO_PISTA, WH], [WW - ANCHO_PISTA, 0, ANCHO_PISTA, WH]];

// puntos de acceso entre la pista y las calles peatonales. cada uno tiene un tramo corto de vereda que se
// puede caminar, con un cruce peatonal en la pista, el punto de la vereda donde camila sube o baja, y el
// lado de la pista y la altura donde frena el vehículo. hay uno en cada extremo de las tres calles, uno al
// final de abajo de cada carril y uno al final de arriba del carril del medio. arriba, los carriles 1 y 3
// quedan tapados por bembos y usil.
const PUNTOS_ACCESO = [
  ...BASES.flatMap((b, f) => [
    { id: `calle${f + 1}_izq`, lado: "izq", pos: b + 35, vereda: { x: 84, y: b + 35 }, tramo: [70, b + 2, 30, 66] },
    { id: `calle${f + 1}_der`, lado: "der", pos: b + 35, vereda: { x: WW - 84, y: b + 35 }, tramo: [WW - 100, b + 2, 30, 66] },
  ]),
  ...CX.map((c, i) => ({ id: `carril${i + 1}_abajo`, lado: "abajo", pos: c, vereda: { x: c, y: WH - 84 }, tramo: [c - 30, BASES[2] + 66, 60, WH - 70 - BASES[2] - 66] })),
  { id: "carril2_arriba", lado: "arriba", pos: CX[1], vereda: { x: CX[1], y: 84 }, tramo: [CX[1] - 30, 70, 60, BASES[0] + 4 - 70] },
];

// máscara peatonal: tres calles, tres carriles y los tramos de vereda de los puntos de acceso.
// la pista no se camina.
const MASCARA_PEATONAL = [...BASES.map(b => [98, b + 2, 1604, 66]), ...CX.map(c => [c - 30, 332, 60, 686]), ...PUNTOS_ACCESO.map(a => a.tramo)];
const WALK = MASCARA_PEATONAL;   // otro nombre para la misma máscara, el que usa el movimiento de camila
// dice si camila puede pararse en ese punto: tiene que estar dentro de alguna zona peatonal, sin tocar el borde.
const caminable = (x, y) => WALK.some(r => x > r[0] && x < r[0] + r[2] && y > r[1] && y < r[1] + r[3]);
// verdadero si el punto está dentro de algún rectángulo de la máscara, contando el borde.
const enMascara = (m, x, y) => m.some(r => x >= r[0] && x <= r[0] + r[2] && y >= r[1] && y <= r[1] + r[3]);
// verdadero si todo el rectángulo está dentro de la máscara. revisa puntos cada 2 píxeles y los bordes.
// se usa para comprobar que un vehículo nunca se sale de la pista.
function rectEnMascara(m, [x, y, w, h]) {
  for (let i = 0; i <= w + 1; i += 2) for (let j = 0; j <= h + 1; j += 2)
    if (!enMascara(m, x + Math.min(i, w), y + Math.min(j, h))) return false;
  return true;
}

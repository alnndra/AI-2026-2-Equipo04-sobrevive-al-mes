// archivo: caminos.js, carpeta mapa.
// qué hace: arma la red de caminos peatonales y busca el camino más corto a pie con el algoritmo de
// dijkstra. también mide distancias a lo largo de la pista y elige el punto de acceso donde conviene que
// el vehículo deje o recoja a camila.
// se relaciona con: mundo.js, que define calles, carriles, puertas y puntos de acceso, con movimiento.js,
// que hace caminar a camila por estas rutas, con vehiculos.js, que usa la medida de la pista, y con
// animacion viaje.js, que pide el mejor acceso al empezar cada viaje.
// responsable: ashley misae kuniyoshi zambrano.
"use strict";

// red peatonal: líneas por el centro de las calles, hasta la vereda de sus extremos, de los carriles, de los
// tramos de acceso y de la entrada de cada puerta. todas quedan dentro de la máscara peatonal, así un camino
// por estas líneas nunca pisa la pista.
const LINEAS_PEATONALES = [
  ...BASES.map(b => ({ eje: "h", fijo: b + 35, desde: 84, hasta: WW - 84 })),
  ...CX.map(c => ({ eje: "v", fijo: c, desde: BASES[0] + 35, hasta: BASES[2] + 35 })),
  ...PUNTOS_ACCESO.filter(a => a.lado === "abajo").map(a => ({ eje: "v", fijo: a.vereda.x, desde: BASES[2] + 35, hasta: a.vereda.y })),
  ...PUNTOS_ACCESO.filter(a => a.lado === "arriba").map(a => ({ eje: "v", fijo: a.vereda.x, desde: a.vereda.y, hasta: BASES[0] + 35 })),
  ...LUGARES.map(L => ({ eje: "v", fijo: L.sx, desde: L.base + 16, hasta: L.base + 35 })),
];
// dice si el punto está sobre la línea, con un pequeño margen por los decimales.
const sobreLinea = (l, p) => (l.eje === "h" ? Math.abs(p.y - l.fijo) < 0.01 && p.x >= l.desde - 0.01 && p.x <= l.hasta + 0.01
  : Math.abs(p.x - l.fijo) < 0.01 && p.y >= l.desde - 0.01 && p.y <= l.hasta + 0.01);

// punto de la red más cercano a un punto cualquiera: lo proyecta sobre la línea más cercana.
function pegarARed(p) {
  let mejor = null;
  for (const l of LINEAS_PEATONALES) {
    const q = l.eje === "h" ? { x: limitar(p.x, l.desde, l.hasta), y: l.fijo } : { x: l.fijo, y: limitar(p.y, l.desde, l.hasta) };
    const d = Math.hypot(q.x - p.x, q.y - p.y);
    if (!mejor || d < mejor.d) mejor = { x: q.x, y: q.y, d };
  }
  return mejor;
}

// camino más corto a pie entre dos puntos por la red, con el algoritmo de dijkstra.
// devuelve la distancia en píxeles y la ruta: la lista de puntos de paso, donde el primero es el punto de
// la red más cercano al inicio y el último es el destino.
function caminoPeatonal(a, b) {
  const pa = pegarARed(a), pb = pegarARed(b);
  const nodos = [], vecinos = [];
  const nodo = p => {   // número del nodo en ese punto, lo crea si todavía no existe
    let i = nodos.findIndex(n => Math.abs(n.x - p.x) < 0.01 && Math.abs(n.y - p.y) < 0.01);
    if (i < 0) { i = nodos.push({ x: p.x, y: p.y }) - 1; vecinos.push([]); }
    return i;
  };
  // en cada línea: sus extremos, los cruces con las líneas perpendiculares y los puntos pegados,
  // ordenados a lo largo de la línea y unidos de a dos
  for (const l of LINEAS_PEATONALES) {
    const punto = v => (l.eje === "h" ? { x: v, y: l.fijo } : { x: l.fijo, y: v });
    const pts = [punto(l.desde), punto(l.hasta), pa, pb];
    for (const o of LINEAS_PEATONALES) if (o.eje !== l.eje) {
      const c = l.eje === "h" ? { x: o.fijo, y: l.fijo } : { x: l.fijo, y: o.fijo };
      if (sobreLinea(o, c)) pts.push(c);
    }
    const orden = pts.filter(p => sobreLinea(l, p)).sort((p, q) => (l.eje === "h" ? p.x - q.x : p.y - q.y)).map(nodo);
    for (let i = 1; i < orden.length; i++) if (orden[i] !== orden[i - 1]) {
      const d = Math.hypot(nodos[orden[i]].x - nodos[orden[i - 1]].x, nodos[orden[i]].y - nodos[orden[i - 1]].y);
      vecinos[orden[i]].push([orden[i - 1], d]); vecinos[orden[i - 1]].push([orden[i], d]);
    }
  }
  // dijkstra: desde el inicio, toma cada vez el nodo pendiente más cercano y actualiza a sus vecinos,
  // hasta llegar al destino. después recorre los nodos previos hacia atrás para armar la ruta
  const ia = nodo(pa), ib = nodo(pb);
  const dist = nodos.map(() => Infinity), previo = nodos.map(() => -1), hecho = nodos.map(() => false);
  dist[ia] = 0;
  for (;;) {
    let k = -1;
    dist.forEach((d, i) => { if (!hecho[i] && d < Infinity && (k < 0 || d < dist[k])) k = i; });
    if (k < 0 || k === ib) break;
    hecho[k] = true;
    for (const [v, d] of vecinos[k]) if (dist[k] + d < dist[v]) { dist[v] = dist[k] + d; previo[v] = k; }
  }
  const ruta = [];
  for (let k = ib; k >= 0; k = previo[k]) ruta.unshift({ x: nodos[k].x, y: nodos[k].y });
  ruta.push({ x: b.x, y: b.y });
  return { dist: pa.d + dist[ib] + pb.d, ruta };
}

// recorrido por la pista.
// cada posición de la pista se mide con una sola coordenada: la distancia a lo largo del anillo en sentido
// horario, desde la esquina de arriba a la izquierda. primero el lado de arriba de izquierda a derecha, luego
// el derecho de arriba hacia abajo, luego el de abajo de derecha a izquierda y al final el izquierdo de abajo
// hacia arriba. así es fácil saber qué sentido es más corto.
const LARGO_H = CARRIL.der - CARRIL.izq, LARGO_V = CARRIL.abajo - CARRIL.arriba, PERIMETRO = 2 * (LARGO_H + LARGO_V);
// coordenada de cada esquina y los dos lados que une en sentido horario, el de antes y el de después
const ESQUINAS = [
  { s: 0, antes: "izq", despues: "arriba" },
  { s: LARGO_H, antes: "arriba", despues: "der" },
  { s: LARGO_H + LARGO_V, antes: "der", despues: "abajo" },
  { s: 2 * LARGO_H + LARGO_V, antes: "abajo", despues: "izq" },
];
// deja la coordenada dentro de una vuelta del anillo, aunque sea negativa o pase de una vuelta.
const modP = s => ((s % PERIMETRO) + PERIMETRO) % PERIMETRO;
// coordenada de la pista para un lado y una posición: horizontal en los lados de arriba y abajo, vertical en los costados.
function sPista(lado, pos) {
  if (lado === "arriba") return pos - CARRIL.izq;
  if (lado === "der") return LARGO_H + (pos - CARRIL.arriba);
  if (lado === "abajo") return LARGO_H + LARGO_V + (CARRIL.der - pos);
  return modP(2 * LARGO_H + LARGO_V + (CARRIL.abajo - pos));
}
// lado y posición de una coordenada de la pista, lo inverso de la función anterior.
function ladoDeS(s) {
  s = modP(s);
  if (s < LARGO_H) return { lado: "arriba", pos: CARRIL.izq + s };
  if (s < LARGO_H + LARGO_V) return { lado: "der", pos: CARRIL.arriba + s - LARGO_H };
  if (s < 2 * LARGO_H + LARGO_V) return { lado: "abajo", pos: CARRIL.der - (s - LARGO_H - LARGO_V) };
  return { lado: "izq", pos: CARRIL.abajo - (s - 2 * LARGO_H - LARGO_V) };
}
// recorrido del vehículo entre dos puntos de acceso por el sentido más corto, en píxeles de pista.
const recorridoPista = (a, b) => { const d = modP(sPista(b.lado, b.pos) - sPista(a.lado, a.pos)); return Math.min(d, PERIMETRO - d); };

// punto de acceso con la caminata más corta hasta o desde un punto. si hay empate, con un píxel de margen,
// gana el que deja menos recorrido al vehículo desde el acceso donde subió. devuelve el acceso y la
// distancia a pie.
function mejorAcceso(p, otro) {
  const opciones = PUNTOS_ACCESO.map(a => ({ a, d: caminoPeatonal(a.vereda, p).dist, v: otro ? recorridoPista(otro, a) : 0 }));
  const minimo = Math.min(...opciones.map(o => o.d));
  return opciones.filter(o => o.d <= minimo + 1).sort((x, y) => x.v - y.v)[0];
}

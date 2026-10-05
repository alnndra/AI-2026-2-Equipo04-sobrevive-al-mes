// archivo: suelo.js, carpeta mapa.
// qué hace: dibuja una sola vez todo el suelo del mundo en un lienzo aparte: pasto, pista, cruces
// peatonales, veredas, patios, carriles, calles, rampas y tramos de acceso. después, en cada cuadro, solo se
// copia el pedazo que ve la cámara, así el juego no redibuja miles de tiles sesenta veces por segundo.
// se relaciona con: mundo.js, que da las medidas, las imágenes de los tiles y los puntos de acceso, con
// decoracion.js, que define los patios, y con dibujo.js, que copia este suelo en pantalla.
// responsable: ashley misae kuniyoshi zambrano.
"use strict";

// lienzo con el suelo completo. queda vacío hasta que cargan todas las imágenes de los tiles.
let SUELO = null;
// pinta el suelo completo en su lienzo, por capas, de abajo hacia arriba.
function construirSuelo() {
  SUELO = document.createElement("canvas"); SUELO.width = WW; SUELO.height = WH;
  const w = SUELO.getContext("2d"); w.imageSmoothingEnabled = false;
  // pasto con variantes repartidas con la mezcla fija de mundo.js
  const pastos = [TILE.pasto0, TILE.pasto1, TILE.pasto2, TILE.pasto0, TILE.pasto2, TILE.pasto3];
  for (let gx = 0; gx < WW / 64; gx++) for (let gy = 0; gy < WH / 64; gy++) {
    const h = H(gx, gy);
    w.drawImage(h < 25 ? TILE.flores : pastos[h % pastos.length], gx * 64, gy * 64);
  }
  // pista perimetral: asfalto, líneas discontinuas y esquinas
  const asf = w.createPattern(TILE.asfalto, "repeat");
  w.fillStyle = asf;
  w.fillRect(0, 0, WW, 70); w.fillRect(0, WH - 70, WW, 70); w.fillRect(0, 0, 70, WH); w.fillRect(WW - 70, 0, 70, WH);
  for (let x = 70; x < WW - 70; x += TILE.linea_h.width) { w.drawImage(TILE.linea_h, x, 0); w.drawImage(TILE.linea_h, x, WH - 70); }
  for (let y = 70; y < WH - 70; y += TILE.linea_v.height) { w.drawImage(TILE.linea_v, 0, y); w.drawImage(TILE.linea_v, WW - 70, y); }
  const esquina = (x, y, giro) => { w.save(); w.translate(x + 35, y + 35); w.rotate(giro * Math.PI / 2); w.drawImage(TILE.esquina, -35, -35); w.restore(); };
  esquina(0, 0, 2); esquina(WW - 70, 0, 3); esquina(0, WH - 70, 1); esquina(WW - 70, WH - 70, 0);
  // un cruce peatonal en cada punto de acceso, con las franjas a lo largo de la pista: girado en los costados
  for (const a of PUNTOS_ACCESO) {
    if (a.lado === "izq" || a.lado === "der") w.drawImage(TILE.cruce_v, a.lado === "izq" ? 0 : WW - 70, a.pos - 28);
    else w.drawImage(TILE.cruce, a.pos - 28, a.lado === "arriba" ? 0 : WH - 70);
  }
  // vereda alrededor del pueblo
  const ver = w.createPattern(TILE.vereda, "repeat");
  w.fillStyle = ver;
  w.fillRect(70, 70, WW - 140, 28); w.fillRect(70, WH - 98, WW - 140, 28); w.fillRect(70, 98, 28, WH - 196); w.fillRect(WW - 98, 98, 28, WH - 196);
  w.fillStyle = "#2a3140";
  w.fillRect(70, 98, WW - 140, 2); w.fillRect(70, WH - 100, WW - 140, 2); w.fillRect(98, 98, 2, WH - 196); w.fillRect(WW - 100, 98, 2, WH - 196);
  // patio de ladrillo en la fila de abajo, con un borde gris
  const lad = w.createPattern(TILE.ladrillo, "repeat");
  for (const [x, y, an, al] of PATIOS) {
    w.fillStyle = "#8f9aa8"; w.fillRect(x - 4, y - 4, an + 8, al + 8);
    w.fillStyle = lad; w.fillRect(x, y, an, al);
  }
  // carriles entre calles: vereda con borde de pasto, girada, recortada a su largo exacto
  for (const c of CX) for (let y = 332; y < 1018; y += TILE.calle_v.height) {
    const alto = Math.min(TILE.calle_v.height, 1018 - y);
    w.drawImage(TILE.calle_v, 0, 0, TILE.calle_v.width, alto, c - TILE.calle_v.width / 2, y, TILE.calle_v.width, alto);
  }
  // calles peatonales: vereda con borde de pasto arriba y abajo
  for (const b of BASES) for (let x = 98; x < 1702; x += TILE.calle_h.width) {
    const ancho = Math.min(TILE.calle_h.width, 1702 - x);
    w.drawImage(TILE.calle_h, 0, 0, ancho, TILE.calle_h.height, x, b - 7, ancho, TILE.calle_h.height);
  }
  // cruces entre calle y carril: un parche de vereda tapa los bordes de pasto
  w.fillStyle = ver;
  for (const c of CX) for (const b of BASES) {
    const arriba = b === BASES[0] ? b + 2 : b - 8, abajo = b === BASES[2] ? b + 68 : b + 78;
    w.fillRect(c - 30, arriba, 60, abajo - arriba);
  }
  // rampas al inicio de cada calle
  BASES.forEach(b => { w.drawImage(TILE.rampa, 98, b + 15); });
  // tramos de vereda de los accesos de los carriles: el mismo tile del carril desde la calle hasta la
  // vereda que rodea el pueblo, y un parche de vereda donde se juntan con la calle. los accesos de los
  // extremos de las calles no necesitan nada, porque ya son vereda
  for (const a of PUNTOS_ACCESO.filter(q => q.lado === "arriba" || q.lado === "abajo")) {
    const y0 = a.lado === "arriba" ? 98 : BASES[2] + 66, y1 = a.lado === "arriba" ? BASES[0] + 2 : WH - 98;
    for (let y = y0; y < y1; y += TILE.calle_v.height) {
      const alto = Math.min(TILE.calle_v.height, y1 - y);
      w.drawImage(TILE.calle_v, 0, 0, TILE.calle_v.width, alto, a.pos - TILE.calle_v.width / 2, y, TILE.calle_v.width, alto);
    }
    w.fillStyle = ver;
    w.fillRect(a.pos - 30, a.lado === "arriba" ? BASES[0] - 10 : BASES[2] + 60, 60, 16);
  }
}

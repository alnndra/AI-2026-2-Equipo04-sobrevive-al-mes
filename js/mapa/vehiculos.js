// archivo: vehiculos.js, carpeta mapa.
// qué hace: mueve y dibuja el bus, el mototaxi y el taxi. arma el recorrido de cada vehículo solo por la
// pista, lo acelera y lo frena suave, lo hace girar en las esquinas sin salirse del asfalto y lo detiene
// con su puerta frente al cruce peatonal donde camila sube o baja.
// se relaciona con: mundo.js, que define la pista y los tamaños de las imágenes, con caminos.js, que mide
// la pista, con animacion viaje.js, que crea el vehículo de cada viaje, y con escena.js, que lo dibuja.
// responsable: alondra yamileth gonzales cuaresma.
"use strict";

// vehículos: bus, mototaxi y taxi, siempre por la pista.
// velocidad máxima en píxeles por segundo, aceleración y dónde queda la puerta respecto al centro.
const VEH_CFG = {
  bus: { vmax: 140, acel: 90, puerta: { derecha: 70, izquierda: -70 } },
  taxi: { vmax: 190, acel: 170, puerta: { derecha: 0, izquierda: 0 } },
  mototaxi: { vmax: 160, acel: 140, puerta: { derecha: 0, izquierda: 0 } },
};
// distancia de la puerta al centro del vehículo según hacia dónde mira. el bus tiene la puerta adelante.
const puertaVeh = (tipo, vista) => (VEH_CFG[tipo].puerta[vista] || 0);

// margen que ocupa cada vehículo al dibujarse fuera de su imagen: arriba por el rebote y la inclinación,
// abajo por la sombra y a los lados por la inclinación del bus.
const MARGEN_VEH = { bus: { x: 3, arriba: 5, abajo: 5 }, taxi: { x: 0, arriba: 1, abajo: 3 }, mototaxi: { x: 0, arriba: 1, abajo: 3 } };
// rectángulo que ocupa el vehículo con esa vista y ese centro: la imagen más el rebote y la sombra.
function rectVehiculo(tipo, vista, x, y) {
  const s = VEHI[tipo][vista], m = MARGEN_VEH[tipo];
  return [x - s.w / 2 - m.x, y - s.h / 2 - m.arriba, s.w + 2 * m.x, s.h + m.arriba + m.abajo];
}

// dónde puede ir el centro del vehículo para que su rectángulo quepa en el asfalto de 70 píxeles.
// calcula la distancia mínima al borde del mundo cuando va de lado, la altura en la pista de arriba y en la
// de abajo, el centro en las pistas de los costados cuando va de frente o de espalda, y la altura mínima y
// máxima en los costados, que es donde gira en las esquinas.
function geometriaPista(tipo) {
  const rel = v => rectVehiculo(tipo, v, 0, 0);
  const lados = ["derecha", "izquierda"].map(rel), frentes = ["frente", "espalda"].map(rel);
  const ancho = rs => Math.max(...rs.map(q => -q[0]));                       // medio ancho, es igual a los dos lados
  const arr = rs => Math.max(...rs.map(q => -q[1])), abj = rs => Math.max(...rs.map(q => q[1] + q[3]));
  const xh = Math.max(CARRIL.izq, ancho(lados));
  return {
    xh,
    yArrH: limitar(CARRIL.arriba, arr(lados), ANCHO_PISTA - abj(lados)),
    yAbjH: limitar(CARRIL.abajo, WH - ANCHO_PISTA + arr(lados), WH - abj(lados)),
    xv: limitar(xh, ancho(frentes), ANCHO_PISTA - ancho(frentes)),   // lo más cerca posible del valor de lado
    yArr: Math.max(CARRIL.arriba, arr(frentes)), yAbj: Math.min(CARRIL.abajo, WH - abj(frentes)),
  };
}
// centro del vehículo en un lado de la pista a una posición dada: horizontal arriba y abajo, vertical en los costados.
function puntoPista(lado, pos, tipo) {
  const g = geometriaPista(tipo);
  if (lado === "arriba" || lado === "abajo") return { x: limitar(pos, g.xh, WW - g.xh), y: lado === "arriba" ? g.yArrH : g.yAbjH };
  return { x: lado === "izq" ? g.xv : WW - g.xv, y: limitar(pos, g.yArr, g.yAbj) };
}
// vista con la que avanza el vehículo en cada lado, primero en sentido horario y después en el contrario.
const VISTA_LADO = { arriba: ["derecha", "izquierda"], der: ["frente", "espalda"], abajo: ["izquierda", "derecha"], izq: ["espalda", "frente"] };
// punto donde frena el vehículo en un acceso, con su puerta frente al cruce peatonal.
function paradaEn(a, tipo, sentido) {
  const vista = VISTA_LADO[a.lado][sentido > 0 ? 0 : 1];
  return puntoPista(a.lado, a.pos - puertaVeh(tipo, vista), tipo);
}
// posición de una esquina medida sobre un lado: horizontal si es arriba o abajo, vertical si es un costado.
const posEsquina = (e, lado) => {
  const x = e.s === 0 || e.s === 2 * LARGO_H + LARGO_V ? CARRIL.izq : CARRIL.der;
  const y = e.s === 0 || e.s === LARGO_H ? CARRIL.arriba : CARRIL.abajo;
  return lado === "arriba" || lado === "abajo" ? x : y;
};

// recorrido del vehículo solo por la pista: entra desde 650 píxeles antes del acceso donde sube camila, va
// por el sentido más corto hasta el acceso donde baja y sigue 750 píxeles más.
// en cada esquina hay un punto de curva, donde frena un poco, al final del lado por donde llega, y si su
// vista nueva no cabe ahí mismo, un punto de salto al inicio del lado siguiente: así gira sobre la esquina
// sin salirse del asfalto. el bus es tan largo que necesita ese salto.
function trazadoVehiculo(tipo, sube, baja) {
  const s1 = sPista(sube.lado, sube.pos), s2 = sPista(baja.lado, baja.pos);
  const sentido = modP(s2 - s1) <= PERIMETRO / 2 ? 1 : -1;   // 1 es horario y menos 1 es el sentido contrario
  const pts = [];
  // agrega un punto. si cae donde mismo que el anterior, solo le suma sus marcas
  const poner = p => {
    const u = pts[pts.length - 1];
    if (u && Math.hypot(p.x - u.x, p.y - u.y) < 0.5) Object.assign(u, p); else pts.push(p);
  };
  // agrega los puntos de las esquinas que hay entre dos posiciones de la pista, en el sentido del viaje
  const avanzar = (desde, hasta) => {
    const largo = modP(sentido * (hasta - desde));
    ESQUINAS.map(e => ({ e, d: modP(sentido * (e.s - desde)) })).filter(o => o.d > 0 && o.d < largo).sort((a, b) => a.d - b.d)
      .forEach(({ e }) => {
        const [de, a] = sentido > 0 ? [e.antes, e.despues] : [e.despues, e.antes];
        const p1 = puntoPista(de, posEsquina(e, de), tipo), p2 = puntoPista(a, posEsquina(e, a), tipo);
        poner({ ...p1, curva: true });
        if (Math.hypot(p2.x - p1.x, p2.y - p1.y) > 0.5) poner({ ...p2, salto: true });
      });
  };
  const inicio = s1 - sentido * 650, fin = s2 + sentido * 750;
  const pIni = ladoDeS(inicio), pFin = ladoDeS(fin);
  poner(puntoPista(pIni.lado, pIni.pos, tipo));
  avanzar(inicio, s1); poner({ ...paradaEn(sube, tipo, sentido), parar: "subir" });
  avanzar(s1, s2); poner({ ...paradaEn(baja, tipo, sentido), parar: "bajar" });
  avanzar(s2, fin); poner(puntoPista(pFin.lado, pFin.pos, tipo));
  // el primer punto no es una esquina ni un salto: el vehículo ya aparece en su lado
  delete pts[0].curva;
  if (pts[1] && pts[1].salto) { pts.shift(); delete pts[0].salto; }
  return pts;
}

// vista que corresponde a la dirección del movimiento: de lado si se mueve más en horizontal, de frente o
// de espalda si se mueve más en vertical.
const vistaHacia = (dx, dy) => (Math.abs(dx) > Math.abs(dy) ? (dx > 0 ? "derecha" : "izquierda") : (dy > 0 ? "frente" : "espalda"));

// crea un vehículo al inicio de su recorrido, vacío y detenido, mirando hacia donde va a avanzar.
function crearVehiculo(tipo, sube, baja) {
  const pts = trazadoVehiculo(tipo, sube, baja);
  return { tipo, pts, i: 1, x: pts[0].x, y: pts[0].y, v: 0, vista: vistaHacia(pts[1].x - pts[0].x, pts[1].y - pts[0].y),
    t: 0, lleno: false, parado: false, fin: false, inclinacion: 0 };
}

// avanza el vehículo un cuadro: acelera suave, baja la velocidad en las esquinas y frena suave antes de cada
// parada. devuelve subir o bajar al detenerse en esos puntos, fin al terminar su recorrido, o nulo mientras avanza.
function moverVehiculo(veh, dt, mult) {
  if (veh.parado || veh.fin) return null;
  const cfg = VEH_CFG[veh.tipo], vmax = cfg.vmax * mult, acel = cfg.acel * mult;
  // distancia hasta la próxima parada, la próxima esquina o el final.
  // con ella se calcula la velocidad máxima que todavía permite frenar a tiempo
  let d = Math.hypot(veh.pts[veh.i].x - veh.x, veh.pts[veh.i].y - veh.y), j = veh.i;
  while (!veh.pts[j].parar && !veh.pts[j].curva && j < veh.pts.length - 1) { d += Math.hypot(veh.pts[j + 1].x - veh.pts[j].x, veh.pts[j + 1].y - veh.pts[j].y); j++; }
  const vFinal = veh.pts[j].parar ? 0 : veh.pts[j].curva ? 0.35 * vmax : vmax;
  const frenando = Math.sqrt(vFinal * vFinal + 2 * acel * d) + 6;
  const vAntes = veh.v;
  veh.v = Math.min(vmax, veh.v + acel * dt, frenando);
  // inclinación suavizada: positiva al acelerar y negativa al frenar, la usa el bus al dibujarse
  if (dt > 0) veh.inclinacion = veh.inclinacion * 0.85 + 0.15 * limitar((veh.v - vAntes) / dt / acel, -1, 1);
  let paso = veh.v * dt;
  while (paso > 0) {
    const p = veh.pts[veh.i];
    if (p.salto) {   // giro en la esquina: pasa al inicio del lado siguiente con la vista nueva
      veh.x = p.x; veh.y = p.y; veh.i++;
      const q = veh.pts[veh.i];
      if (q) veh.vista = vistaHacia(q.x - p.x, q.y - p.y);
      continue;
    }
    const dx = p.x - veh.x, dy = p.y - veh.y, dist = Math.hypot(dx, dy);
    if (dist > 0.01) veh.vista = vistaHacia(dx, dy);
    if (paso < dist) { veh.x += dx / dist * paso; veh.y += dy / dist * paso; break; }
    veh.x = p.x; veh.y = p.y; paso -= dist;
    veh.i++;
    if (p.parar) { veh.v = 0; veh.parado = true; veh.inclinacion = -0.6; return p.parar; }   // frenazo final
    if (veh.i >= veh.pts.length) { veh.fin = true; return "fin"; }
    // en una esquina sin salto la vista nueva se pone apenas llega, así no queda de lado en el costado
    const q = veh.pts[veh.i];
    if (p.curva && !q.salto) veh.vista = vistaHacia(q.x - p.x, q.y - p.y);
  }
  veh.t += dt * (veh.v / vmax);
  return null;
}

// dibuja el vehículo con su sombra y un rebote leve usando sus cuadros, lleno si camila va adentro.
function dibujarVehiculo(veh) {
  const s = VEHI[veh.tipo][veh.vista], cuadros = s[veh.lleno ? "lleno" : "vacio"];
  const f = Math.floor(veh.t * 10) % Math.max(2, cuadros.length);
  const rebote = veh.tipo !== "bus" && veh.v > 5 && f % 2 ? -1 : 0;   // el taxi y el mototaxi rebotan con sus cuadros
  const X = Math.round(veh.x - s.w / 2 - camX), Y = Math.round(veh.y - s.h / 2 - camY) + rebote;
  if (X > VW || X + s.w < 0 || Y > VH || Y + s.h < 0) return;
  ctx.fillStyle = "rgba(0,0,0,.3)";
  ctx.beginPath(); ctx.ellipse(veh.x - camX, veh.y + s.h / 2 - camY - 2, s.w * 0.48, 5, 0, 0, 7); ctx.fill();
  if (veh.tipo !== "bus") { ctx.drawImage(cuadros[f % cuadros.length], X, Y); return; }
  // el bus tiene una sola imagen por vista: se simula el movimiento con un rebote vertical leve y una pequeña
  // inclinación, que sube la trompa al acelerar y la baja al frenar.
  const bote = veh.v > 5 && Math.sin(veh.t * 22) > 0.5 ? -1 : 0;
  const k = veh.inclinacion;
  ctx.save();
  if (veh.vista === "derecha" || veh.vista === "izquierda") {
    const giro = (veh.vista === "derecha" ? -1 : 1) * 0.035 * k;     // gira sobre el punto de apoyo de las ruedas
    ctx.translate(X + s.w / 2, Y + s.h + bote); ctx.rotate(giro); ctx.drawImage(cuadros[0], -s.w / 2, -s.h);
  } else {
    // de frente o de espalda: al frenar el bus se hunde un poco hacia adelante
    const hunde = Math.round((veh.vista === "frente" ? -1 : 1) * 1.5 * k);
    ctx.drawImage(cuadros[0], X, Y + bote + hunde);
  }
  ctx.restore();
}

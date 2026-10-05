// archivo: escena.js, carpeta mapa.
// qué hace: dibuja un cuadro completo del mapa. centra la cámara en camila o en el vehículo, dibuja el
// suelo, ordena edificios, adornos, postes, camila y el vehículo por profundidad para que lo de adelante
// tape a lo de atrás, y al final agrega el cielo y la lluvia.
// se relaciona con: dibujo.js, que dibuja el suelo y los edificios, con personaje.js y vehiculos.js, que
// dibujan a camila y al vehículo, y con principal.js, que llama a esta función en cada cuadro.
// responsable: ashley misae kuniyoshi zambrano.
"use strict";

// dibuja un cuadro completo: mueve la cámara sin salirse del mundo, dibuja el suelo, las cosas ordenadas
// por su línea de apoyo, que es la profundidad, y los efectos del cielo y la lluvia.
function dibujarEscena(t, marcador, clima, minutos, veh, foco) {
  foco = foco || cam;
  camX = Math.round(Math.max(0, Math.min(WW - VW, foco.x - VW / 2)));
  camY = Math.round(Math.max(0, Math.min(WH - VH, foco.y - VH / 2)));
  dibujarSuelo();
  if (marcador) dibujarMarcador(marcador, t);
  const L = [
    ...LUGARES.map(l => ({ y: l.base, f: () => dibujarEdificio(l) })),
    ...DEC.map(d => ({ y: d[2], f: () => dibujarSprite(d[0], d[1], d[2]) })),
    ...POSTES.flatMap(fila => fila.map((q, i) => ({ y: q[1], f: () => dibujarPoste(q, i, fila) }))),
    { y: cam.y, f: dibujarCamila },
    ...(veh ? [{ y: veh.y + VEHI[veh.tipo][veh.vista].h / 2, f: () => dibujarVehiculo(veh) }] : []),
  ].sort((a, b) => a.y - b.y);
  L.forEach(o => o.f());
  dibujarCielo(minutos);
  if (clima === "Garúa") dibujarLluvia(t);
}

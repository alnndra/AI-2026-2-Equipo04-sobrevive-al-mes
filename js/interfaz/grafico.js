// archivo: grafico.js, carpeta interfaz.
// qué hace: dibuja el gráfico de líneas del saldo al final de cada día de cada agente, a mano en un lienzo
// y sin librerías. una equis roja marca el día en que el agente se quedó sin dinero.
// se relaciona con: comparacion.js de la interfaz, que le pasa una serie por agente leída del historial
// diario de la base de datos, y con comparar.css.
// responsable: yasmin akemi haji taira.
"use strict";

// gráfico de líneas del saldo por día: rejilla, ejes, una línea por agente, marcas de quiebre y leyenda.
function pintarGraficoSaldo(series) {
  const cvG = $("graficoSaldo"), g = cvG.getContext("2d"), W = cvG.width, Hh = cvG.height;
  const izq = 64, der = 18, arriba = 64, abajo = 46, ancho = W - izq - der, alto = Hh - arriba - abajo;
  g.clearRect(0, 0, W, Hh);
  const dias = CONFIG.duracion, maxS = Math.max(1, ...series.flatMap(s => s.puntos.map(p => p.saldo)));
  const paso = [5, 10, 20, 25, 50, 100, 200, 250, 500].find(p => maxS / p <= 6) || 1000, tope = Math.ceil(maxS / paso) * paso;
  const X = d => izq + ancho * d / dias, Y = v => arriba + alto * (1 - v / tope);
  // rejilla y ejes
  g.font = "12px system-ui"; g.lineWidth = 1;
  for (let v = 0; v <= tope + 1e-9; v += paso) {
    g.strokeStyle = "#2a3956"; g.beginPath(); g.moveTo(izq, Y(v)); g.lineTo(W - der, Y(v)); g.stroke();
    g.fillStyle = "#93a3bd"; g.textAlign = "right"; g.fillText("S/ " + v, izq - 8, Y(v) + 4);
  }
  g.textAlign = "center";
  const cada = dias > 15 ? 5 : 1;
  for (let d = 0; d <= dias; d += cada) g.fillText(d, X(d), Hh - abajo + 18);
  g.fillText("día", izq + ancho / 2, Hh - 8);
  // líneas
  series.forEach(s => {
    g.strokeStyle = s.color; g.lineWidth = s.nombre === "Persona" ? 3 : 2; g.setLineDash(s.nombre === "Persona" ? [6, 4] : []);
    g.beginPath(); s.puntos.forEach((p, i) => (i ? g.lineTo(X(p.dia), Y(p.saldo)) : g.moveTo(X(p.dia), Y(p.saldo)))); g.stroke();
    g.setLineDash([]);
    if (s.quiebre) {   // marca de quiebre
      const p = s.puntos.find(q => q.dia === s.quiebre) || s.puntos[s.puntos.length - 1], x = X(p.dia), y = Y(p.saldo);
      g.strokeStyle = "#f87171"; g.lineWidth = 3;
      g.beginPath(); g.moveTo(x - 7, y - 7); g.lineTo(x + 7, y + 7); g.moveTo(x + 7, y - 7); g.lineTo(x - 7, y + 7); g.stroke();
      g.fillStyle = "#f87171"; g.font = "bold 11px system-ui"; g.fillText("día " + s.quiebre, x, y - 12); g.font = "12px system-ui";
    }
  });
  // leyenda
  let lx = izq;
  g.textAlign = "left"; g.font = "13px system-ui";
  series.forEach(s => {
    const t = s.nombre.replace("Basado en ", "B. ");
    if (lx + g.measureText(t).width + 30 > W - der) lx = izq;
    g.fillStyle = s.color; g.fillRect(lx, 18, 14, 4); g.fillStyle = "#e9eef7"; g.fillText(t, lx + 20, 24);
    lx += g.measureText(t).width + 40;
  });
  g.fillStyle = "#93a3bd"; g.fillText("Saldo al final de cada día (S/)", izq, 48);
}

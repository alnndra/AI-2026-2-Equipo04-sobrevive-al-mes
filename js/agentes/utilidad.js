// archivo: utilidad.js, carpeta agentes.
// qué hace: define el agente basado en utilidad. calcula un número de utilidad para aceptar y otro para
// rechazar, sumando con pesos el bienestar, el hambre, la puntualidad, la seguridad y el riesgo de quedarse
// sin dinero, y elige lo que tenga mayor utilidad. para viajar calcula la utilidad de cada medio y elige el mayor.
// a diferencia del reflejo, mira el saldo, lo que falta pagar y los días que quedan.
// se relaciona con: comun.js, de donde toma las reservas, percibir en el paradero y actuar, con motor.js,
// que aplica sus decisiones, con corridas.js del simulador, y con comparacion.js de la interfaz, donde
// los deslizadores cambian sus pesos.
// responsable: ashley misae kuniyoshi zambrano.
"use strict";

// cuánto pesa cada sol que faltaría para los gastos fijos de los días restantes. si se sube, el agente se
// vuelve más ahorrador y llega al final más seguido, pero disfruta menos cada día.
let PESO_DIAS = 2;

// agente basado en utilidad: compara la utilidad esperada de aceptar y de rechazar.
AGENTES.utilidad = {
  nombre: "Basado en utilidad",
  descripcion: "Calcula una utilidad que combina bienestar, hambre, puntualidad, seguridad y riesgo de quedarse sin dinero.",
  pesos: { bienestar: 1, hambre: 1, puntualidad: 1, seguridad: 3, riesgo: 1 },   // se cambian con los deslizadores
  // aquí percibe: mira el evento, el saldo, el hambre, si es antes de clase, lo que debe reservar hoy, los
  // imprevistos probables y los días que quedan. en el paradero usa la percepción común.
  percibir(dia, est, ev) {
    if (ev.tipo === "transporte") return percibirViaje(dia, est, ev);
    const antesDeClase = est.paso <= dia.paradas.findIndex(q => q.id === "aula");
    return { ev, saldo: est.saldo, hambre: est.hambre, antesDeClase,
      reservaFija: reservaFija(dia, est, ev), imprevistos: 0.6 * sorpresasEsperadas(dia, est),
      reservaDias: reservaFutura(dia, est), fraccionRestante: est.duracion > 1 ? est.diasRestantes / (est.duracion - 1) : 0 };
  },
  // utilidad de aceptar o de rechazar: suma con pesos de sus efectos.
  // riesgo duro: no cubrir los gastos fijos de hoy, que cuesta como no volver en transporte.
  // riesgo de los días restantes: soles que faltarían para los fijos hasta el final.
  // riesgo blando: soles que faltarían para los imprevistos probables de hoy.
  // colchón: cada sol gastado pesa más cuanto más falta para el final del periodo.
  utilidadDe(p, acepta) {
    const w = this.pesos, ev = p.ev, c = acepta ? ev.efecto : ev.consecuencia;
    const saldoDespues = p.saldo - (acepta ? ev.costo : c.deuda || 0);   // la deuda se paga esta noche
    const faltaFijo = Math.max(0, p.reservaFija - saldoDespues);
    const faltaDias = Math.max(0, p.reservaFija + p.reservaDias - saldoDespues);
    const faltante = Math.max(0, p.reservaFija + p.reservaDias + p.imprevistos - saldoDespues);
    // el colchón pesa más cuanto más falta para el final, y menos cuanto más le sobra la plata
    const holgura = Math.min(1, (p.reservaFija + p.reservaDias + p.imprevistos) / Math.max(1, saldoDespues));
    const colchon = 0.25 * (1 + 2 * p.fraccionRestante) * holgura;
    const u = {
      bienestar: w.bienestar * ((acepta ? ev.bienestar : 0) + (c.bienestar || 0)),
      hambre: -w.hambre * 0.8 * (c.hambre || 0) * (p.hambre > 5 ? 1.5 : 1),
      puntualidad: p.antesDeClase && (c.minutos || 0) > 0 ? -w.puntualidad * 8 : 0,
      seguridad: w.seguridad * 2 * (c.seguridad || 0),
      // además, cada sol gastado reduce un poco el colchón para imprevistos y para mañana
      riesgo: -w.riesgo * ((faltaFijo > 0 ? REGLAS.penalSinTransporte + 2 * faltaFijo : 0) + PESO_DIAS * faltaDias
        + 1.5 * faltante + colchon * (acepta ? ev.costo : 0)),
      // si la deuda no se puede pagar esta noche, termina en saldo negativo y la métrica la penaliza
      deuda: c.deuda && saldoDespues < p.reservaFija ? -REGLAS.penalSaldoNegativo : 0,
    };
    u.total = u.bienestar + u.hambre + u.puntualidad + u.seguridad + u.riesgo + u.deuda;
    u.faltante = faltante; u.faltaDias = faltaDias;
    return u;
  },
  // aquí decide: calcula la utilidad de aceptar y la de rechazar, y acepta solo si aceptar vale más.
  decidir(p) {
    if (p.esViaje) return this.decidirViaje(p);
    if (p.ev.costo > p.saldo) return { acepta: false, razon: "No le alcanza.", corta: "No me alcanza" };
    const a = this.utilidadDe(p, true), r = this.utilidadDe(p, false);
    const acepta = a.total > r.total;
    const corta = acepta ? `Vale la pena (+${(a.total - r.total).toFixed(1)})`
      : a.faltaDias > 0 ? `Me faltarían ${S(a.faltaDias)}, mejor no` : `No me conviene (${(a.total - r.total).toFixed(1)})`;
    return { acepta, corta, razon: `Utilidad si acepta ${a.total.toFixed(1)} vs. si rechaza ${r.total.toFixed(1)}.` +
      (a.faltaDias > 0 ? ` Si acepta le faltarían ${S(a.faltaDias)} para los fijos de los ${p.reservaDias ? "días que quedan" : "de hoy"}.`
        : a.faltante > 0 ? ` Si acepta le faltarían ${S(a.faltante)} para imprevistos.` : " Aceptar no pone en riesgo lo que falta.") };
  },
  // aquí actúa: usa la función actuar común, que le pide al motor aplicar la decisión.
  actuar: actuarComun,
};

// utilidad de una opción de transporte: bienestar, tiempo, seguridad y riesgo de quedarse sin dinero para
// hoy y para los días restantes, cada uno con su peso.
AGENTES.utilidad.utilidadViaje = function (p, o) {
  const w = this.pesos, e = o.efecto, saldoDespues = p.saldo - o.costo;
  const faltaFijo = Math.max(0, p.reservaFija - saldoDespues), faltaDias = Math.max(0, p.reservaFija + p.reservaDias - saldoDespues);
  const holgura = Math.min(1, (p.reservaFija + p.reservaDias) / Math.max(1, saldoDespues));
  return w.bienestar * (e.bienestar || 0) + 0.3 * (e.energia || 0)
    + (p.antesDeClase && (e.minutos || 0) > 0 ? -8 * w.puntualidad : 0) - 0.02 * w.puntualidad * o.minutos   // tiempo
    + 2 * w.seguridad * (e.seguridad || 0)
    - (e.sin_transporte ? REGLAS.penalSinTransporte : 0)
    - w.riesgo * ((faltaFijo > 0 ? REGLAS.penalSinTransporte + 2 * faltaFijo : 0) + PESO_DIAS * faltaDias
      + 0.25 * (1 + 2 * p.fraccionRestante) * holgura * o.costo);
};
// decisión de transporte de utilidad: calcula la utilidad de cada opción que puede pagar y elige la mayor.
// devuelve también la tabla de utilidades, que el panel del paradero muestra.
AGENTES.utilidad.decidirViaje = function (p) {
  const tabla = p.opciones.map(o => ({ modo: o.modo, nombre: o.nombre,
    u: o.disponible && !o.descartada && o.alcanza ? this.utilidadViaje(p, o) : null,
    motivo: !o.disponible ? "no disponible" : !o.alcanza ? "no alcanza" : "" }));
  const mejor = tabla.filter(t => t.u !== null).sort((a, b) => b.u - a.u)[0];
  const d = eleccion(mejor.modo, "Utilidad: " + tabla.map(t => `${t.nombre} ${t.u === null ? "(" + t.motivo + ")" : t.u.toFixed(1)}`).join(" · ") + `. Elige ${mejor.nombre.toLowerCase()}.`,
    mejor.modo === "taxi" ? (p.noche ? "De noche vale más ir segura" : "El taxi me conviene más") : mejor.modo === "mototaxi" ? "El mototaxi me conviene más" : mejor.modo === "bus" ? "El bus me conviene más" : "No me alcanza, camino");
  d.utilidades = tabla;
  return d;
};

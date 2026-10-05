// archivo: objetivos.js, carpeta agentes.
// qué hace: define el agente basado en objetivos. tiene cinco objetivos ordenados por importancia:
// llegar puntual, comer, volver hoy en transporte, llegar al último día con saldo y no quedar debiendo.
// acepta un gasto solo si no pone en riesgo un objetivo más importante que todavía está pendiente.
// para viajar elige la opción más barata que cumple el objetivo del tramo.
// se relaciona con: comun.js, de donde toma la reserva de los días que faltan, percibir en el paradero y
// actuar, con motor.js, que le dice qué falta pagar y aplica sus decisiones, y con corridas.js del simulador.
// responsable: ashley misae kuniyoshi zambrano.
"use strict";

// agente basado en objetivos: objetivos ordenados, acepta solo si no pone en riesgo uno pendiente.
AGENTES.objetivos = {
  nombre: "Basado en objetivos",
  descripcion: "Objetivos: 1) llegar puntual, 2) comer, 3) volver hoy en transporte, 4) llegar al último día con saldo, 5) no deber.",
  nombresObj: ["llegar puntual", "comer", "volver hoy en transporte", "llegar al último día con saldo positivo", "no quedar debiendo"],
  // aquí percibe: calcula cuánto dinero necesita cada objetivo y a qué objetivo sirve este evento.
  // en el paradero usa la percepción común.
  percibir(dia, est, ev) {
    if (ev.tipo === "transporte") return percibirViaje(dia, est, ev);
    const antesDeClase = est.paso <= dia.paradas.findIndex(q => q.id === "aula");
    const pend = Motor.pendientes(dia, est).filter(p => p.id !== ev.id);
    const necesidad = [
      0, // llegar puntual no requiere reservar dinero fijo
      pend.filter(p => p.id === "almuerzo").reduce((s, p) => s + p.monto, 0),
      ev.tramo === "vuelta" ? 0 : pend.filter(p => p.id === "pasaje_vuelta").reduce((s, p) => s + p.monto, 0),
      reservaFutura(dia, est),   // llegar al último día: los fijos de los días que faltan
      0,
    ];
    // a qué objetivo sirve este evento: llegar puntual, comer o no deber. si no sirve a ninguno queda en menos uno
    let sirve = -1;
    if (antesDeClase && (ev.consecuencia.minutos || 0) > 0) sirve = 0;
    else if ((ev.efecto.hambre || 0) <= -3 && ev.tipo !== "antojo") sirve = 1;
    // el taxi de noche no sirve al objetivo volver en transporte, porque el bus también lo cumple
    else if ((ev.consecuencia.deuda || 0) > 0) sirve = 4;
    return { costo: ev.costo, saldo: est.saldo, tipo: ev.tipo, necesidad, sirve };
  },
  // aquí decide: reserva el dinero de los objetivos más importantes que el que sirve este evento.
  // si el evento no sirve a ningún objetivo, reserva para todos, y a un antojo le exige además un margen.
  decidir(p) {
    if (p.esViaje) return this.decidirViaje(p);
    const queda = p.saldo - p.costo;
    if (queda < 0) return { acepta: false, razon: "No le alcanza.", corta: "No me alcanza" };
    // se reserva el dinero de los objetivos más importantes que el que sirve este evento
    const hasta = p.sirve >= 0 ? p.sirve : p.necesidad.length;
    const reserva = p.necesidad.slice(0, hasta).reduce((s, v) => s + v, 0)
      + (p.sirve < 0 ? p.necesidad.slice(hasta).reduce((s, v) => s + v, 0) : 0);
    const obj = p.sirve >= 0 ? `Sirve al objetivo "${this.nombresObj[p.sirve]}". ` : "No sirve a ningún objetivo. ";
    if (p.sirve < 0 && p.tipo === "antojo" && queda < reserva + 3)
      return { acepta: false, razon: obj + `Quedaría poco margen sobre ${S(reserva)} para sus objetivos.`, corta: "Poco margen para mis objetivos" };
    if (queda >= reserva) return { acepta: true, razon: obj + `Aun así le quedan ${S(queda)} para lo pendiente (${S(reserva)}).`,
      corta: p.sirve >= 0 ? "Me ayuda a cumplir un objetivo" : "No pone en riesgo mis objetivos" };
    return { acepta: false, razon: obj + `Pondría en riesgo un objetivo pendiente: necesita ${S(reserva)} y le quedarían ${S(queda)}.`,
      corta: `Arriesga mis objetivos: no` };
  },
  // aquí actúa: usa la función actuar común, que le pide al motor aplicar la decisión.
  actuar: actuarComun,
};

// decisión de transporte de objetivos: la opción más barata que cumple el objetivo pendiente del tramo,
// llegar puntual en la ida y volver a casa en transporte en el regreso.
AGENTES.objetivos.decidirViaje = function (p) {
  const ops = pagables(p), cumple = o => (p.tramo === "ida" ? !(o.efecto.minutos > 0) : true);
  const ok = ops.find(cumple);
  const objetivo = p.tramo === "ida" ? "llegar puntual" : "volver a casa en transporte";
  if (ok) return eleccion(ok.modo, `${ok.nombre} es lo más barato que cumple "${objetivo}".`, `${ok.nombre}: lo más barato que cumple`);
  if (ops.length) return eleccion(ops[0].modo, `Nada pagable cumple "${objetivo}": toma lo más barato, ${nombreMin(ops[0])}.`, `Llegaré tarde, pero ${nombreMin(ops[0])}`);
  return eleccion("caminar", "No le alcanza para ninguna opción: camina.", "No me alcanza, camino");
};

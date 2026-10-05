// archivo: reflejo.js, carpeta agentes.
// qué hace: define el agente reflejo, que decide con reglas fijas de condición y acción y sin memoria:
// acepta necesidades y sorpresas, acepta antojos solo si son baratos y para viajar sigue reglas simples
// según la hora, la lluvia y el paro. no mira el saldo ni los días que faltan.
// se relaciona con: comun.js, de donde toma percibir en el paradero y actuar, con motor.js, que aplica sus
// decisiones, y con corridas.js del simulador.
// responsable: yasmin akemi haji taira.
"use strict";

// agente reflejo: reglas de condición y acción, sin memoria.
AGENTES.reflejo = {
  nombre: "Agente reflejo",
  descripcion: "Si es necesidad o sorpresa, acepta. Si es antojo, solo si cuesta S/ 4 o menos.",
  limiteAntojo: 4,   // precio máximo en soles de un antojo que sí acepta
  // aquí percibe: mira el costo, el saldo y el tipo de evento. en el paradero usa la percepción común.
  percibir(dia, est, ev) {
    if (ev.tipo === "transporte") return percibirViaje(dia, est, ev); return { costo: ev.costo, saldo: est.saldo, tipo: ev.tipo }; },
  // aquí decide con reglas de condición y acción: no mira el saldo antes de intentar. si no alcanza, el
  // motor responde sin fondos y entonces rechaza.
  decidir(p) {
    if (p.esViaje) return this.decidirViaje(p);
    if (p.tipo === "necesidad" || p.tipo === "sorpresa") return { acepta: true, razon: `Regla: es ${p.tipo}, se acepta.`, corta: `Regla: es ${p.tipo}, acepto` };
    if (p.costo <= this.limiteAntojo) return { acepta: true, razon: `Regla: antojo barato (≤ ${S(this.limiteAntojo)}).`, corta: "Antojo barato, va" };
    return { acepta: false, razon: `Regla: antojo de más de ${S(this.limiteAntojo)}, se rechaza.`, corta: `Antojo de más de ${S(this.limiteAntojo)}: no` };
  },
  // aquí actúa: usa la función actuar común, que le pide al motor aplicar la decisión.
  actuar: actuarComun,
};

// decisión de transporte del reflejo: de noche taxi si le alcanza, si llueve o hay paro mototaxi si le
// alcanza, y si no, bus. si su regla no aplica, toma lo único que puede pagar o camina.
AGENTES.reflejo.decidirViaje = function (p) {
  const bus = usable(p, "bus"), moto = usable(p, "mototaxi"), taxi = usable(p, "taxi");
  if (p.noche && taxi && alcanzaOp(p, taxi)) return eleccion("taxi", "Regla: de noche, taxi.", "Regla: de noche, taxi");
  if ((p.lluvia || p.paro) && moto && alcanzaOp(p, moto)) return eleccion("mototaxi", `Regla: si ${p.paro ? "hay paro" : "llueve"}, mototaxi.`, p.paro ? "Regla: con paro, mototaxi" : "Regla: llueve, mototaxi");
  if (bus && alcanzaOp(p, bus)) return eleccion("bus", "Regla: por defecto, bus.", "Regla: bus");
  const barata = pagables(p)[0];
  if (barata) return eleccion(barata.modo, `Su regla no aplica: toma ${nombreMin(barata)}, lo único que puede pagar.`, `Solo me alcanza ${nombreMin(barata)}`);
  return eleccion("caminar", "No le alcanza para ninguna opción: camina.", "No me alcanza, camino");
};

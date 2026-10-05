// archivo: base.js, carpeta agentes.
// qué hace: define el modo base, la forma de resolver el problema sin técnica: acepta todo gasto que puede
// pagar en el momento, como alguien que no planea, y para viajar toma el bus de siempre.
// sirve para saber si las técnicas aportan algo: si una técnica no le gana al modo base, no sirve.
// se relaciona con: comun.js, de donde toma percibir en el paradero y actuar, con motor.js, que aplica sus
// decisiones, y con corridas.js del simulador, que lo hace vivir los mismos días que a los demás agentes.
// responsable: yasmin akemi haji taira.
"use strict";

// modo base: acepta todo lo que puede pagar en el momento, como alguien que no planea.
AGENTES.base = {
  nombre: "Modo base",
  descripcion: "Acepta todo gasto que pueda pagar en el momento.",
  // aquí percibe: en un evento solo mira el costo y su saldo, en el paradero usa la percepción común.
  percibir(dia, est, ev) {
    if (ev.tipo === "transporte") return percibirViaje(dia, est, ev); return { costo: ev.costo, saldo: est.saldo }; },
  // aquí decide: no planea ni revisa el saldo, intenta aceptar todo. si no alcanza, el motor responde sin fondos.
  decidir(p) {
    if (p.esViaje) return this.decidirViaje(p);
    return { acepta: true, razon: `Lo quiere y lo intenta comprar sin pensar (tiene ${S(p.saldo)}).`, corta: "Lo quiero, lo compro" };
  },
  // aquí actúa: usa la función actuar común, que le pide al motor aplicar la decisión.
  actuar: actuarComun,
};

// decisión de transporte del modo base: el bus si le alcanza, sin pensar. si no hay bus, lo más barato que
// pueda pagar, y si no le alcanza para nada, camina.
AGENTES.base.decidirViaje = function (p) {
  const bus = usable(p, "bus"), barata = pagables(p)[0];
  if (bus && alcanzaOp(p, bus)) return eleccion("bus", "Toma el bus porque le alcanza; no lo piensa más.", "Tomo el bus de siempre");
  if (barata) return eleccion(barata.modo, `No hay bus: toma lo más barato que puede pagar (${nombreMin(barata)}).`, `No hay bus: ${nombreMin(barata)}`);
  return eleccion("caminar", "No le alcanza para ninguna opción: camina.", "No me alcanza, camino");
};

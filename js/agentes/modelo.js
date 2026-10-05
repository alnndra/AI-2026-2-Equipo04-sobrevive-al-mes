// archivo: modelo.js, carpeta agentes.
// qué hace: define el agente basado en modelo. mantiene un modelo interno de lo que falta: pasajes y
// almuerzo de hoy, sorpresas probables y los gastos fijos de los días que quedan, y reserva ese dinero
// antes de gastar en otra cosa. para viajar elige la opción más cara que todavía respeta esa reserva.
// se relaciona con: comun.js, de donde toma las reservas, percibir en el paradero y actuar, con motor.js,
// que aplica sus decisiones, y con corridas.js del simulador.
// responsable: ashley misae kuniyoshi zambrano.
"use strict";

// agente basado en modelo: reserva el dinero de lo que falta antes de gastar.
AGENTES.modelo = {
  nombre: "Basado en modelo",
  descripcion: "Reserva dinero para lo que falta de hoy y para los pasajes y almuerzos de los días restantes.",
  // aquí percibe: arma su modelo interno del mundo con lo que falta pagar hoy, lo que probablemente
  // aparezca y los días que quedan. en el paradero usa la percepción común.
  percibir(dia, est, ev) {
    if (ev.tipo === "transporte") return percibirViaje(dia, est, ev);
    // modelo interno del mundo: lo que falta pagar hoy, lo que probablemente aparezca y los días que quedan
    return { costo: ev.costo, saldo: est.saldo, tipo: ev.tipo, reservaFija: reservaFija(dia, est, ev),
      reservaSorpresas: sorpresasEsperadas(dia, est), reservaDias: reservaFutura(dia, est), diasRestantes: est.diasRestantes,
      deudaSiRechaza: ev.consecuencia.deuda || 0 };
  },
  // aquí decide: acepta solo si después de pagar le queda lo que su modelo dice que debe reservar.
  // si rechazar le deja una deuda igual al costo, paga ya, porque igual lo pagaría esta noche.
  // para las necesidades no reserva sorpresas, para lo demás sí.
  decidir(p) {
    if (p.esViaje) return this.decidirViaje(p);
    const queda = p.saldo - p.costo;
    if (queda < 0) return { acepta: false, razon: "No le alcanza.", corta: "No me alcanza" };
    if (p.deudaSiRechaza >= p.costo)
      return { acepta: true, razon: "Si no paga ahora queda debiendo lo mismo y lo paga esta noche: mejor pagar ya.", corta: "Si no pago, igual lo debo" };
    const base = p.reservaFija + p.reservaDias;
    const reserva = p.tipo === "necesidad" ? base : base + p.reservaSorpresas;
    const dias = p.diasRestantes ? ` y ${S(p.reservaDias)} para los ${p.diasRestantes} días que faltan` : "";
    if (queda >= reserva) return { acepta: true, razon: `Le quedarían ${S(queda)}; reserva ${S(p.reservaFija)} para hoy${dias}. Le alcanza.`, corta: "Me alcanza y guardo lo que falta" };
    return { acepta: false, razon: `Le quedarían ${S(queda)}, pero su modelo pide reservar ${S(reserva)} (hoy${dias}${p.tipo === "necesidad" ? "" : ", más imprevistos"}).`,
      corta: `Me faltarían ${S(reserva - queda)}, mejor no` };
  },
  // aquí actúa: usa la función actuar común, que le pide al motor aplicar la decisión.
  actuar: actuarComun,
};

// decisión de transporte del modelo: la opción más cara que todavía deja reservado lo que falta de hoy y de
// la quincena. si ninguna respeta la reserva, toma la más barata, y si no le alcanza para nada, camina.
AGENTES.modelo.decidirViaje = function (p) {
  const reserva = p.reservaFija + p.reservaDias, ops = pagables(p);
  const ok = ops.filter(o => p.saldo - o.costo >= reserva);
  if (ok.length) { const o = ok[ok.length - 1];
    return eleccion(o.modo, `Elige ${nombreMin(o)}: le quedan ${S(p.saldo - o.costo)} y sigue reservado lo que falta (${S(reserva)}).`, `${o.nombre} y guardo lo que falta`); }
  if (ops.length) return eleccion(ops[0].modo, `Ninguna opción respeta la reserva (${S(reserva)}): toma la más barata, ${nombreMin(ops[0])}.`, `La reserva no da: ${nombreMin(ops[0])}`);
  return eleccion("caminar", "No le alcanza para ninguna opción: camina.", "No me alcanza, camino");
};

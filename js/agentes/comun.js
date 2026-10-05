// archivo: comun.js, carpeta agentes.
// qué hace: reúne lo que comparten todos los agentes: la forma de actuar, la percepción en el paradero,
// el cálculo de reservas de dinero, el formato de soles y el objeto donde se registra cada agente.
// cada agente tiene tres pasos: percibir, que lee del estado solo lo que le importa, decidir, que elige
// aceptar o rechazar y explica por qué, y actuar, que le pide al motor aplicar esa decisión.
// se relaciona con: motor.js y eleccion.js de transporte, a los que les pide aplicar decisiones, con los
// archivos base.js, reflejo.js, modelo.js, objetivos.js y utilidad.js, que usan estas funciones, y con
// corridas.js del simulador, que hace correr a los agentes.
// responsable: yasmin akemi haji taira.
"use strict";

// aquí actúa cada agente: actuar es igual para todos, el agente le pide al motor que aplique su decisión.
// en el paradero elige un medio de transporte, en los demás eventos acepta o rechaza.
function actuarComun(dia, est, ev, decision) {
  if (ev.tipo === "transporte") return Motor.elegirViaje(dia, est, ev, decision.opcion);
  return Motor.aplicar(dia, est, ev, decision.acepta);
}

// dinero que todavía hay que reservar hoy: gastos fijos pendientes, sin contar el evento actual,
// y las deudas del día, que se pagan al llegar a casa.
function reservaFija(dia, est, evActual) {
  return Motor.pendientes(dia, est).filter(p => p.id !== evActual.id && !(evActual.tramo && p.tramo === evActual.tramo))
    .reduce((s, p) => s + p.monto, 0);
}

// percepción común en el paradero: las opciones de transporte y lo que el agente necesita saber, como si
// llueve, si hay paro, si es de noche, cuánto tiene que reservar y cuántos días faltan.
function percibirViaje(dia, est, ev) {
  return { esViaje: true, ev, tramo: ev.tramo, opciones: Motor.opcionesViaje(dia, est, ev), saldo: est.saldo,
    lluvia: !!dia.cond.lluvia, paro: !!dia.cond.paro, noche: ev.tramo === "vuelta", antesDeClase: ev.tramo === "ida",
    reservaFija: reservaFija(dia, est, ev), reservaDias: reservaFutura(dia, est), diasRestantes: est.diasRestantes,
    fraccionRestante: est.duracion > 1 ? est.diasRestantes / (est.duracion - 1) : 0 };
}
// devuelve la opción de ese medio si está disponible y no fue descartada por un intento sin fondos.
const usable = (p, m) => { const o = p.opciones.find(x => x.modo === m); return o && o.disponible && !o.descartada ? o : null; };
// dice si una opción alcanza con el saldo que percibió el agente.
const alcanzaOp = (p, o) => !!o && o.costo <= p.saldo + 1e-9;
// arma una elección de transporte con su explicación larga para el panel y la corta para la nube.
const eleccion = (opcion, razon, corta) => ({ opcion, razon, corta: corta || razon });

// gasto esperado en necesidades y sorpresas de las paradas que faltan: suma la probabilidad por el costo
// de cada evento posible. lo usan los agentes de modelo y de utilidad para no gastar lo que podrían necesitar.
function sorpresasEsperadas(dia, est) {
  let total = 0;
  for (let i = est.paso + 1; i < dia.paradas.length; i++) {
    for (const ev of dia.catalogo.eventos) {
      if (ev.parada !== dia.paradas[i].id) continue;
      if ((ev.tipo === "necesidad" || ev.tipo === "sorpresa") && !ev.tramo && Motor.cumple(ev.condicion, dia.cond))
        total += ev.probabilidad * ev.costo;
    }
  }
  return total;
}

// dinero para los días que faltan después de hoy: pasajes y almuerzo de cada día, como si ningún día
// hubiera comida en casa, más lo que en promedio llega solo, como desayuno y deudas inevitables.
// reservar solo el promedio deja sin plata los últimos días. mientras queden días se guarda además
// un día extra de colchón. lo usan los agentes de modelo, objetivos y utilidad.
function reservaFutura(dia, est) {
  const d = est.diasRestantes;
  return (d > 0 ? d + 1 : 0) * Motor.gastoFijoDiario(dia.catalogo).prudente;
}

// escribe un monto en soles con dos decimales. lo usan los agentes en sus razones y también la interfaz.
const S = v => "S/ " + v.toFixed(2);

// objeto donde se registra cada agente. cada archivo de agente agrega el suyo, en este orden: base,
// reflejo, modelo, objetivos y utilidad. ese orden es el de la tabla comparativa.
const AGENTES = {};

// opciones que el agente puede pagar ahora, de la más barata a la más cara, sin las descartadas.
const pagables = p => p.opciones.filter(o => o.modo !== "caminar" && o.disponible && !o.descartada && alcanzaOp(p, o)).sort((a, b) => a.costo - b.costo);
// nombre de una opción en minúsculas, para usarlo dentro de una frase.
const nombreMin = o => o.nombre.toLowerCase();

// archivo: opciones.js, carpeta transporte.
// qué hace: define las opciones de bus, mototaxi y taxi de cada paradero, con su costo, sus minutos y su
// efecto, y los parámetros que dicen con qué probabilidad el bus pasa lleno o no hay taxi ni mototaxi.
// también define la lista de medios que se ofrecen en el paradero.
// se relaciona con: catalogos.js del núcleo, porque completa el objeto de datos semilla, con base de datos.js,
// que guarda estas filas en sus tablas, con motor.js, que sortea la disponibilidad con estos parámetros, y
// con eleccion.js, que usa estas opciones para armar las tarjetas del paradero.
// responsable: alondra yamileth gonzales cuaresma.
"use strict";

// opciones de transporte en los paraderos. los valores fueron aprobados por el equipo y se pueden editar aquí.
// para cada tramo y medio se usa la primera fila cuya condición se cumple: por eso primero van las de no
// disponible, como paro, bus lleno, sin taxi o sin mototaxi, luego lluvia y paro, y al final la normal.
// el efecto guarda el bienestar del viaje, la seguridad entre menos uno y uno, los minutos de retraso, la
// energía y si no vuelve en transporte. cada punto de seguridad suma al bienestar según el parámetro peso de
// seguridad.
// columnas: id, tramo, parada, modo, nombre, costo, minutos, condición, disponible, nota, orden y efecto.
DATOS.opciones_transporte = [
  ["bus_ida_paro", "ida", "paradero_ida", "bus", "Bus", 2.50, 55, "paro", 0, "Hay paro de transporte: el bus no pasa.", 1, {}],
  ["bus_ida_lleno", "ida", "paradero_ida", "bus", "Bus", 2.50, 55, "bus_lleno_ida", 0, "El bus pasa lleno y no para.", 2, {}],
  ["bus_ida_lluvia", "ida", "paradero_ida", "bus", "Bus", 2.50, 75, "lluvia", 1, "Barato, pero con la garúa el tráfico va lento: llega tarde.", 3, { minutos: 20, bienestar: -1, seguridad: 0 }],
  ["bus_ida", "ida", "paradero_ida", "bus", "Bus", 2.50, 55, "", 1, "Lo más barato. Tarda más, pero llega a tiempo.", 4, { bienestar: 0, seguridad: 0 }],
  ["moto_ida_no", "ida", "paradero_ida", "mototaxi", "Mototaxi", 5.00, 45, "moto_no_ida", 0, "No hay mototaxis cerca ahora.", 5, {}],
  ["moto_ida_lluvia", "ida", "paradero_ida", "mototaxi", "Mototaxi", 7.00, 50, "lluvia", 1, "Con lluvia sube el precio y te mojas un poco, pero llega a tiempo.", 6, { bienestar: -1.5, seguridad: -0.3 }],
  ["moto_ida_paro", "ida", "paradero_ida", "mototaxi", "Mototaxi", 7.00, 45, "paro", 1, "Con el paro cobra más, pero sí está circulando.", 7, { bienestar: 0, seguridad: 0 }],
  ["moto_ida", "ida", "paradero_ida", "mototaxi", "Mototaxi", 5.00, 45, "", 1, "Más rápido que el bus y más barato que el taxi.", 8, { bienestar: 0, seguridad: 0 }],
  ["taxi_ida_no", "ida", "paradero_ida", "taxi", "Taxi", 9.00, 40, "taxi_no_ida", 0, "No hay taxis disponibles a esta hora.", 9, {}],
  ["taxi_ida_paro", "ida", "paradero_ida", "taxi", "Taxi", 12.00, 40, "paro", 1, "Con el paro la tarifa sube, pero es rápido y seguro.", 10, { bienestar: 0.5, seguridad: 0.5 }],
  ["taxi_ida_lluvia", "ida", "paradero_ida", "taxi", "Taxi", 10.00, 40, "lluvia", 1, "La opción cómoda y cara: seca y a tiempo.", 11, { bienestar: 0.5, seguridad: 0.5 }],
  ["taxi_ida", "ida", "paradero_ida", "taxi", "Taxi", 9.00, 40, "", 1, "El más caro, el más rápido y el más cómodo.", 12, { bienestar: 0.5, seguridad: 0.5 }],
  ["caminar_ida", "ida", "paradero_ida", "caminar", "Caminar", 0, 100, "", 1, "Gratis, pero llega tarde y cansada.", 13, { minutos: 45, energia: -2, bienestar: -2, seguridad: 0 }],
  ["bus_vuelta_paro", "vuelta", "paradero_regreso", "bus", "Bus", 2.50, 45, "paro", 0, "Hay paro de transporte: el bus no pasa.", 14, {}],
  ["bus_vuelta_lleno", "vuelta", "paradero_regreso", "bus", "Bus", 2.50, 45, "bus_lleno_vuelta", 0, "El bus pasa lleno y no para.", 15, {}],
  ["bus_vuelta_lluvia", "vuelta", "paradero_regreso", "bus", "Bus", 2.50, 50, "lluvia", 1, "El más barato, pero de noche y con lluvia se pone inseguro.", 16, { bienestar: -1, seguridad: -1 }],
  ["bus_vuelta", "vuelta", "paradero_regreso", "bus", "Bus", 2.50, 45, "", 1, "El más barato, pero de noche el paradero es inseguro.", 17, { bienestar: 0, seguridad: -1 }],
  ["moto_vuelta_no", "vuelta", "paradero_regreso", "mototaxi", "Mototaxi", 5.50, 38, "moto_no_vuelta", 0, "No hay mototaxis cerca ahora.", 18, {}],
  ["moto_vuelta_lluvia", "vuelta", "paradero_regreso", "mototaxi", "Mototaxi", 7.50, 42, "lluvia", 1, "Con lluvia cobra más y se moja; de noche es intermedio en seguridad.", 19, { bienestar: -1.5, seguridad: -0.8 }],
  ["moto_vuelta_paro", "vuelta", "paradero_regreso", "mototaxi", "Mototaxi", 7.50, 38, "paro", 1, "Con el paro cobra más, pero sí está circulando.", 20, { bienestar: 0, seguridad: -0.5 }],
  ["moto_vuelta", "vuelta", "paradero_regreso", "mototaxi", "Mototaxi", 5.50, 38, "", 1, "Intermedio: más barato que el taxi, más seguro que el bus.", 21, { bienestar: 0, seguridad: -0.5 }],
  ["taxi_vuelta_no", "vuelta", "paradero_regreso", "taxi", "Taxi por aplicación", 9.00, 30, "taxi_no_vuelta", 0, "No hay taxis disponibles a esta hora.", 22, {}],
  ["taxi_vuelta_paro", "vuelta", "paradero_regreso", "taxi", "Taxi por aplicación", 12.00, 30, "paro", 1, "Con el paro la tarifa sube, pero es lo más seguro de noche.", 23, { bienestar: 0, seguridad: 1 }],
  ["taxi_vuelta_lluvia", "vuelta", "paradero_regreso", "taxi", "Taxi por aplicación", 10.00, 32, "lluvia", 1, "Caro, pero seco y lo más seguro de noche.", 24, { bienestar: 0, seguridad: 1 }],
  ["taxi_vuelta", "vuelta", "paradero_regreso", "taxi", "Taxi por aplicación", 9.00, 30, "", 1, "El más caro, pero el más seguro de noche.", 25, { bienestar: 0, seguridad: 1 }],
  ["caminar_vuelta", "vuelta", "paradero_regreso", "caminar", "Caminar", 0, 90, "", 1, "Gratis, pero de noche es inseguro y agotador: no vuelve en transporte.", 26, { sin_transporte: 1, bienestar: -6, energia: -2, seguridad: -1 }],
];
// parámetros editables del transporte: probabilidades de disponibilidad y cuánto pesa la seguridad en el
// bienestar. la disponibilidad se sortea en el calendario de cada día, dentro de la función nuevo día del
// motor, antes de cualquier decisión. si se sube una de estas probabilidades, el bus pasará lleno más seguido
// y los agentes tendrán que pagar mototaxi o taxi más veces.
DATOS.parametros = [
  ["p_bus_lleno_ida", 0.25, "Probabilidad de que el bus pase lleno en la ida (hora punta de la mañana)"],
  ["p_bus_lleno_vuelta", 0.20, "Probabilidad de que el bus pase lleno en el regreso (final de la tarde)"],
  ["p_bus_lleno_lluvia", 0.30, "Probabilidad extra de bus lleno si llueve"],
  ["p_taxi_no_ida", 0.05, "Probabilidad de que no haya taxi en la ida"],
  ["p_taxi_no_vuelta", 0.20, "Probabilidad de que no haya taxi de noche"],
  ["p_taxi_no_lluvia", 0.15, "Probabilidad extra de que no haya taxi si llueve"],
  ["p_taxi_no_paro", 0.25, "Probabilidad extra de que no haya taxi si hay paro"],
  ["p_moto_no", 0.03, "Probabilidad de que no haya mototaxi (casi siempre hay)"],
  ["peso_seguridad", 2, "Cuánto suma al bienestar cada punto de seguridad del viaje"],
];

// medios de transporte que se ofrecen en el paradero. caminar no está en la lista porque aparece solo si
// no alcanza para ninguno de estos.
const MEDIOS = ["bus", "mototaxi", "taxi"];

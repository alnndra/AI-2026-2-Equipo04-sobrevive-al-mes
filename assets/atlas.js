// archivo: atlas.js, carpeta assets.
// qué hace: dice dónde está cada imagen del juego y qué medidas tiene: la hoja de camila, cada edificio
// con su imagen de luces, los tiles del suelo y los cuadros de cada vehículo en cada vista.
// las rutas son relativas a index.html y no empiezan con barra, porque github pages sirve el juego desde
// una subcarpeta con el nombre del repositorio. tiene los mismos datos que atlas.json, pero como archivo
// de javascript, porque un archivo json no se puede leer al abrir el juego con doble clic.
// las imágenes son los mismos png que estaban incrustados en el juego original, sin ningún cambio.
// se relaciona con: mundo.js del mapa, que carga cada imagen desde estas rutas, y con personaje.js y
// nube.js, que usan las medidas de camila.
// responsable: alondra yamileth gonzales cuaresma.
"use strict";
// índice de imágenes: camila, edificios, vehículos y tiles.
const IMAGENES = {
  "camila": {
    "src": "assets/camila/camila.png",
    "w": 30,
    "h": 48
  },
  "edificios": {
    "casa": {
      "w": 230,
      "h": 146,
      "dx": 143,
      "by": 126,
      "src": "assets/edificios/casa.png",
      "luces": "assets/edificios/casa_luces.png"
    },
    "paradero": {
      "w": 200,
      "h": 126,
      "dx": 90,
      "by": 101,
      "src": "assets/edificios/paradero.png",
      "luces": "assets/edificios/paradero_luces.png"
    },
    "tambo": {
      "w": 220,
      "h": 131,
      "dx": 114,
      "by": 122,
      "src": "assets/edificios/tambo.png",
      "luces": "assets/edificios/tambo_luces.png"
    },
    "usil": {
      "w": 360,
      "h": 181,
      "dx": 169,
      "by": 159,
      "src": "assets/edificios/usil.png",
      "luces": "assets/edificios/usil_luces.png"
    },
    "atencion": {
      "w": 210,
      "h": 147,
      "dx": 50,
      "by": 116,
      "src": "assets/edificios/atencion.png",
      "luces": "assets/edificios/atencion_luces.png"
    },
    "biblioteca": {
      "w": 250,
      "h": 156,
      "dx": 90,
      "by": 103,
      "src": "assets/edificios/biblioteca.png",
      "luces": "assets/edificios/biblioteca_luces.png"
    },
    "impresiones": {
      "w": 250,
      "h": 156,
      "dx": 105,
      "by": 140,
      "src": "assets/edificios/impresiones.png",
      "luces": "assets/edificios/impresiones_luces.png"
    },
    "cafeteria": {
      "w": 250,
      "h": 156,
      "dx": 100,
      "by": 125,
      "src": "assets/edificios/cafeteria.png",
      "luces": "assets/edificios/cafeteria_luces.png"
    },
    "starbucks": {
      "w": 260,
      "h": 103,
      "dx": 143,
      "by": 98,
      "src": "assets/edificios/starbucks.png",
      "luces": "assets/edificios/starbucks_luces.png"
    },
    "bembos": {
      "w": 230,
      "h": 163,
      "dx": 34,
      "by": 158,
      "src": "assets/edificios/bembos.png",
      "luces": "assets/edificios/bembos_luces.png"
    }
  },
  "vehiculos": {
    "bus": {
      "espalda": {
        "w": 46,
        "h": 65,
        "lleno": [
          "assets/vehiculos/bus_espalda_lleno_0.png"
        ],
        "vacio": [
          "assets/vehiculos/bus_espalda_vacio_0.png"
        ]
      },
      "frente": {
        "w": 46,
        "h": 51,
        "lleno": [
          "assets/vehiculos/bus_frente_lleno_0.png"
        ],
        "vacio": [
          "assets/vehiculos/bus_frente_vacio_0.png"
        ]
      },
      "derecha": {
        "w": 170,
        "h": 53,
        "lleno": [
          "assets/vehiculos/bus_derecha_lleno_0.png"
        ],
        "vacio": [
          "assets/vehiculos/bus_derecha_vacio_0.png"
        ]
      },
      "izquierda": {
        "w": 170,
        "h": 48,
        "lleno": [
          "assets/vehiculos/bus_izquierda_lleno_0.png"
        ],
        "vacio": [
          "assets/vehiculos/bus_izquierda_vacio_0.png"
        ]
      }
    },
    "taxi": {
      "frente": {
        "w": 44,
        "h": 34,
        "lleno": [
          "assets/vehiculos/taxi_frente_lleno_0.png",
          "assets/vehiculos/taxi_frente_lleno_1.png",
          "assets/vehiculos/taxi_frente_lleno_2.png",
          "assets/vehiculos/taxi_frente_lleno_3.png"
        ],
        "vacio": [
          "assets/vehiculos/taxi_frente_vacio_0.png",
          "assets/vehiculos/taxi_frente_vacio_1.png",
          "assets/vehiculos/taxi_frente_vacio_2.png",
          "assets/vehiculos/taxi_frente_vacio_3.png"
        ]
      },
      "espalda": {
        "w": 44,
        "h": 35,
        "lleno": [
          "assets/vehiculos/taxi_espalda_lleno_0.png",
          "assets/vehiculos/taxi_espalda_lleno_1.png",
          "assets/vehiculos/taxi_espalda_lleno_2.png",
          "assets/vehiculos/taxi_espalda_lleno_3.png"
        ],
        "vacio": [
          "assets/vehiculos/taxi_espalda_vacio_0.png",
          "assets/vehiculos/taxi_espalda_vacio_1.png",
          "assets/vehiculos/taxi_espalda_vacio_2.png",
          "assets/vehiculos/taxi_espalda_vacio_3.png"
        ]
      },
      "izquierda": {
        "w": 95,
        "h": 45,
        "lleno": [
          "assets/vehiculos/taxi_izquierda_lleno_0.png",
          "assets/vehiculos/taxi_izquierda_lleno_1.png",
          "assets/vehiculos/taxi_izquierda_lleno_2.png"
        ],
        "vacio": [
          "assets/vehiculos/taxi_izquierda_vacio_0.png",
          "assets/vehiculos/taxi_izquierda_vacio_1.png",
          "assets/vehiculos/taxi_izquierda_vacio_2.png"
        ]
      },
      "derecha": {
        "w": 95,
        "h": 45,
        "lleno": [
          "assets/vehiculos/taxi_derecha_lleno_0.png",
          "assets/vehiculos/taxi_derecha_lleno_1.png",
          "assets/vehiculos/taxi_derecha_lleno_2.png",
          "assets/vehiculos/taxi_derecha_lleno_3.png",
          "assets/vehiculos/taxi_derecha_lleno_4.png"
        ],
        "vacio": [
          "assets/vehiculos/taxi_derecha_vacio_0.png",
          "assets/vehiculos/taxi_derecha_vacio_1.png",
          "assets/vehiculos/taxi_derecha_vacio_2.png",
          "assets/vehiculos/taxi_derecha_vacio_3.png",
          "assets/vehiculos/taxi_derecha_vacio_4.png"
        ]
      }
    },
    "mototaxi": {
      "frente": {
        "w": 34,
        "h": 38,
        "lleno": [
          "assets/vehiculos/mototaxi_frente_lleno_0.png"
        ],
        "vacio": [
          "assets/vehiculos/mototaxi_frente_vacio_0.png"
        ]
      },
      "espalda": {
        "w": 34,
        "h": 43,
        "lleno": [
          "assets/vehiculos/mototaxi_espalda_lleno_0.png"
        ],
        "vacio": [
          "assets/vehiculos/mototaxi_espalda_vacio_0.png"
        ]
      },
      "izquierda": {
        "w": 70,
        "h": 56,
        "lleno": [
          "assets/vehiculos/mototaxi_izquierda_lleno_0.png"
        ],
        "vacio": [
          "assets/vehiculos/mototaxi_izquierda_vacio_0.png"
        ]
      },
      "derecha": {
        "w": 70,
        "h": 57,
        "lleno": [
          "assets/vehiculos/mototaxi_derecha_lleno_0.png"
        ],
        "vacio": [
          "assets/vehiculos/mototaxi_derecha_vacio_0.png"
        ]
      }
    }
  },
  "tiles": {
    "pasto0": "assets/tiles/pasto0.png",
    "pasto1": "assets/tiles/pasto1.png",
    "pasto2": "assets/tiles/pasto2.png",
    "pasto3": "assets/tiles/pasto3.png",
    "flores": "assets/tiles/flores.png",
    "calle_h": "assets/tiles/calle_h.png",
    "calle_v": "assets/tiles/calle_v.png",
    "vereda": "assets/tiles/vereda.png",
    "ladrillo": "assets/tiles/ladrillo.png",
    "asfalto": "assets/tiles/asfalto.png",
    "linea_h": "assets/tiles/linea_h.png",
    "linea_v": "assets/tiles/linea_v.png",
    "cruce": "assets/tiles/cruce.png",
    "cruce_v": "assets/tiles/cruce_v.png",
    "esquina": "assets/tiles/esquina.png",
    "rampa": "assets/tiles/rampa.png"
  }
};

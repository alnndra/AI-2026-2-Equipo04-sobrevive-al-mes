// archivo: catalogos.js, carpeta núcleo.
// qué hace: guarda los datos con los que se llena la base de datos al arrancar: las paradas del recorrido,
// los gastos fijos, los pensamientos de camila y el catálogo de eventos que pueden salir cada día.
// también define qué eventos están retirados y con qué probabilidad sale cada condición del día.
// se relaciona con: base de datos.js, que copia estos datos a sus tablas, con motor.js, que sortea el día
// con ellos, y con opciones.js de la carpeta transporte, que agrega las opciones de bus, mototaxi y taxi.
// responsable: alondra yamileth gonzales cuaresma.
"use strict";

// datos semilla del juego. los montos están en soles, son realistas para lima, pero son simulados.
// este objeto se completa en opciones.js de transporte con las opciones de viaje y sus parámetros.
const DATOS = {
  paradas: [
    // columnas: id, orden, nombre, lugar o edificio del mapa, hora programada en minutos desde la medianoche y descripción
    ["casa", 0, "Casa", "casa", 390, "Camila se alista para salir. Revisa su billetera y su celular."],
    ["tambo", 1, "Tambo", "tambo", 400, "La tienda de la esquina, camino al paradero."],
    ["paradero_ida", 2, "Paradero de ida", "paradero_ida", 410, "Toca tomar el bus a la universidad."],
    ["puerta", 3, "Puerta de la universidad", "usil", 465, "Ingreso a USIL. Afuera venden emoliente y salchipapa."],
    ["atencion", 4, "Atención al alumno", "atencion", 470, "Trámites, constancias y pases provisionales."],
    ["aula", 5, "Aula y patio", "usil", 480, "Clases de 8:00 a 13:00 y el patio en el receso."],
    ["biblioteca", 6, "Biblioteca", "biblioteca", 790, "Devolver libros y estudiar un rato."],
    ["impresiones", 7, "Impresiones y Copias", "impresiones", 810, "Impresiones, anillados y fotocopias."],
    ["cafeteria", 8, "Cafetería", "cafeteria", 830, "Hora de almorzar."],
    ["starbucks", 9, "Starbucks", "starbucks", 990, "Un café para la tarde de estudio."],
    ["bembos", 10, "Bembos", "bembos", 1080, "Huele a hamburguesa…"],
    ["paradero_regreso", 11, "Paradero de regreso", "paradero_regreso", 1170, "Ya es de noche. Toca volver."],
    ["casa_fin", 12, "Casa (regreso)", "casa", 1215, "Fin del día."],
  ],
  // gastos fijos obligatorios: no se pueden rechazar, solo se pagan si alcanza el dinero.
  gastos_fijos: [
    // columnas: id, nombre, parada, monto, condición, tramo, orden, efecto si paga y consecuencia si no le alcanza
    ["pasaje_ida", "Pasaje de ida (bus)", "paradero_ida", 2.50, "", "ida", 50, {}, { minutos: 45, energia: -2, bienestar: -2, texto: "Camina 45 minutos hasta la universidad." }],
    ["almuerzo", "Menú del día", "cafeteria", 12.00, "!comida_en_casa", "", 50, { hambre: -5, energia: 2 }, { hambre: 3, bienestar: -2, texto: "Se queda sin almorzar." }],
    ["pasaje_vuelta", "Pasaje de vuelta (bus)", "paradero_regreso", 2.50, "", "vuelta", 50, {}, { bienestar: -6, energia: -2, sin_transporte: 1, texto: "Camina de noche hasta su casa: cansado e inseguro." }],
  ],
  // pensamientos de camila. son solo de presentación: nunca cambian eventos ni resultados.
  // columnas: id, parada, condición, prioridad, texto y tipo. la condición junta varios términos que se
  // tienen que cumplir todos a la vez, por ejemplo hambre alta y que sea de mañana.
  // los de tipo plan, antojo y preocupación que tienen parada solo salen mientras esa parada es la siguiente
  // pendiente, nunca una más lejana ni una ya visitada, y se descartan en cuanto camila entra a esa parada.
  // el término hay seguido del nombre de un evento exige que ese evento esté en el calendario ya sorteado
  // del día para esa parada, así camila no piensa en algo que hoy no va a pasar.
  // los de cuerpo y preocupación sin parada dependen del estado actual: hambre, saldo, batería, clima y hora.
  // los recuerdos van en pasado y solo salen si eso ya ocurrió hoy: lo hizo, lo rechazó o le faltó dinero.
  // las razones recomiendan qué hacer, por eso no se usan cuando juega la persona.
  // cada pensamiento aparece como máximo una vez por día.
  pensamientos: [
    // pensamientos del cuerpo
    ["c_hambre_8", "", "hambre>=8&!comioRecien", 8, "Mi estómago ya está dando concierto", "cuerpo"],
    ["c_hambre_7", "", "hambre>=7&!comioRecien", 7, "Ya tengo hambre", "cuerpo"],
    ["c_desayuno_aire", "", "hambre>=6&!comioRecien&manana", 6, "Desayuné aire y esperanza", "cuerpo"],
    ["c_snack", "", "hambre>=5&hambre<7&!comioRecien", 4, "Un snack no me caería nada mal…", "cuerpo"],
    ["c_panza_feliz", "", "comioRecien", 3, "Ahora sí, panza feliz", "cuerpo"],
    ["c_ojos", "", "energia<=3", 7, "Mis ojos piden vacaciones", "cuerpo"],
    ["c_cafe_vena", "", "energia<=4&manana", 5, "Necesito café en la vena", "cuerpo"],
    ["c_me_duermo", "", "energia<=2", 8, "Si me siento, me duermo", "cuerpo"],
    ["c_bateria_0", "", "bateria<=0", 9, "Celular muerto. Modo ermitaña activado", "cuerpo"],
    ["c_bateria_roja", "", "bateria<10&bateria>0", 8, "Batería en rojo: me toca hablar con humanos", "cuerpo"],
    ["c_bateria_poca", "", "bateria<20&bateria>=10", 6, "Me queda poca batería", "cuerpo"],
    ["c_garua", "", "lluvia&manana", 4, "Esta garúa no moja, pero fastidia", "cuerpo"],
    ["c_garua_noche", "", "lluvia&noche", 4, "Garúa de noche: combo para resfriarme", "cuerpo"],
    ["c_buen_dia", "", "!lluvia&manana", 2, "Qué buen día para no llegar tarde", "cuerpo"],
    ["c_tarde", "", "retraso", 8, "Voy tarde. Muy tarde. Tardísimo", "cuerpo"],
    // pensamientos sobre la plata que le queda
    ["s_eco", "", "saldo<3", 10, "Mi billetera hace eco", "preocupacion"],
    ["s_volver", "", "saldo<6&saldo>=3", 9, "¿Me alcanzará para volver?", "preocupacion"],
    ["s_monje", "", "saldoDia<8", 8, "Modo ahorro extremo: nivel monje", "preocupacion"],
    ["s_cuidar", "", "saldoDia<12&saldoDia>=8", 7, "Tengo que cuidar la plata hasta fin de mes", "preocupacion"],
    ["s_finde", "", "gastoHoy>=25", 6, "Hoy gasté como si fuera fin de semana", "preocupacion"],
    ["s_calma", "", "gastoHoy>=15&gastoHoy<25", 5, "Ya van varios soles hoy… calma, Camila", "preocupacion"],
    ["s_reina", "", "saldoDia>=30", 2, "Esta quincena voy como reina", "plan"],
    ["s_sigo_viva", "", "diasRestantes<=2&saldoDia>=15", 4, "Ya casi termina la quincena y sigo viva", "plan"],
    ["s_ultimo", "", "diasRestantes=0", 6, "Último día. Que no me falle el pasaje", "preocupacion"],
    ["s_dia_uno", "", "dia=1&manana", 4, "Día uno con presupuesto. Esta vez sí", "plan"],
    // examen, trabajo impreso y carné, ligados a la parada donde se resuelven
    ["e_fe", "aula", "examen", 6, "Mañana es el examen y yo con pura fe", "preocupacion"],
    ["e_llorar", "aula", "examen", 5, "¿Estudiar o llorar? Primero estudiar", "preocupacion"],
    ["e_impreso", "impresiones", "hay:impresion", 7, "No me puedo olvidar del trabajo impreso", "preocupacion"],
    ["e_cero", "impresiones", "hay:impresion", 6, "Si no imprimo, la profe me imprime un cero", "preocupacion"],
    ["e_carne_casa", "atencion", "hay:tramite_carne", 7, "Mi carné se quedó en casa durmiendo", "preocupacion"],
    ["e_carne_vida", "atencion", "hay:tramite_carne", 7, "¿Dónde dejé mi carné? ¿En otra vida?", "preocupacion"],
    // transporte, ligados a los paraderos pendientes
    ["t_moto_lluvia", "paradero_ida", "lluvia&!moto_no_ida", 6, "Con esta lluvia el mototaxi saldrá caro", "preocupacion"],
    ["t_huequito", "paradero_ida", "manana", 5, "Que el bus traiga aunque sea un huequito", "preocupacion"],
    ["t_paro_piernas", "paradero_ida", "paro", 8, "Paro hoy… mis piernas ya lo saben", "preocupacion"],
    ["t_moto_barato", "paradero_ida", "", 3, "El mototaxi me sale más barato que un taxi", "plan"],
    ["t_segunda_clase", "paradero_ida", "retraso", 7, "Con este ritmo llego a la segunda clase", "preocupacion"],
    ["t_miedito", "paradero_regreso", "noche", 6, "Este paradero de noche da miedito", "preocupacion"],
    ["t_taxi_ojo", "paradero_regreso", "noche&lluvia&!taxi_no_vuelta", 7, "Noche y lluvia: el taxi me guiña el ojo", "antojo"],
    ["t_paro_vuelta", "paradero_regreso", "paro", 8, "Paro de regreso. Ruta de las piernas", "preocupacion"],
    ["t_alcance_bus", "paradero_regreso", "saldo<6", 8, "Que alcance para el bus, por favor", "preocupacion"],
    ["t_moto_medio", "paradero_regreso", "", 3, "Mototaxi: ni tan caro ni tan peligroso", "plan"],
    ["t_cama", "casa_fin", "noche", 4, "Ya quiero mi cama y mis cinco cobijas", "plan"],
    ["t_deporte", "casa_fin", "", 3, "Llegar a casa es mi deporte favorito", "plan"],
    // paradas: antojos y planes antes de llegar a cada una
    ["p_desayunar", "tambo", "hay:desayuno", 7, "Algo tengo que desayunar", "plan"],
    ["p_olla_visto", "tambo", "hay:desayuno", 6, "En casa la olla me dejó en visto", "plan"],
    ["p_galletas", "tambo", "hay:galletas", 4, "Esas galletas me están coqueteando", "antojo"],
    ["p_cargador", "tambo", "bateria<30", 5, "¿Venderán cargadores en el Tambo?", "plan"],
    ["p_emoliente", "puerta", "manana&lluvia&hay:emoliente", 5, "Un emoliente calientito me salvaría", "antojo"],
    ["p_salchipapa", "puerta", "hambre>=5&hay:salchipapa", 5, "La salchipapa huele a mala decisión rica", "antojo"],
    ["p_torniquete", "puerta", "", 3, "Otra vez la cola del torniquete", "plan"],
    ["p_cola_atencion", "atencion", "", 3, "Siempre hay cola en Atención…", "plan"],
    ["p_ticket", "atencion", "", 2, "Sacaré ticket y paciencia", "plan"],
    ["p_clase", "aula", "", 3, "A ver qué toca hoy en clase", "plan"],
    ["p_ocho_am", "aula", "energia<5", 5, "Clase de 8 am: prueba de supervivencia", "preocupacion"],
    ["p_companera", "biblioteca", "", 6, "En la biblioteca por fin hay silencio", "plan"],
    ["p_libro_vencido", "biblioteca", "hay:multa", 4, "¿Ese libro ya se venció? Uy", "preocupacion"],
    ["p_gimnasio", "biblioteca", "examen", 5, "Biblioteca: el gimnasio del cerebro", "plan"],
    ["p_impresora", "impresiones", "", 3, "Ojalá la impresora no esté en huelga", "preocupacion"],
    ["p_fotocopias", "impresiones", "hay:fotocopias", 5, "Fotocopias del libro: mi tesoro", "plan"],
    ["p_menu", "cafeteria", "hay:almuerzo", 6, "Huele rico el menú de hoy", "antojo"],
    ["p_taper", "cafeteria", "comida", 5, "Mi táper y yo: amor verdadero", "plan"],
    ["p_menu_pasaje", "cafeteria", "hay:almuerzo&saldoDia<12", 7, "¿Menú o pasaje? Dilema existencial", "preocupacion"],
    ["p_cafe_estudiar", "starbucks", "", 5, "Un café me ayudaría a estudiar", "antojo"],
    ["p_frappe_tema", "starbucks", "hay:cafe_examen", 6, "Un frappé por cada tema del examen", "antojo"],
    ["p_frappe_pasaje", "starbucks", "hay:cafe_examen&saldoDia<15", 6, "Ese frappé cuesta cuatro días de pasaje", "preocupacion"],
    ["p_bubble_ahorro", "starbucks", "hay:bubble_tea", 4, "Bubble tea 2x1: la mitad es ahorro, ¿no?", "antojo"],
    ["p_hamburguesa", "bembos", "hambre>=4", 6, "Se me antoja una hamburguesa", "antojo"],
    ["p_bembos_no", "bembos", "saldoDia<15", 7, "Bembos, hoy no. Mi billetera tampoco", "preocupacion"],
    ["p_papas", "bembos", "", 4, "Huele a papas fritas y a tentación", "antojo"],
    ["p_abrazo", "bembos", "hambre>=6", 7, "Una hamburguesa sería un abrazo al alma", "antojo"],
    ["p_me_compro", "bembos", "hambre>=5&saldoDia>=20&hay:bembos_promo", 6, "Hoy me compro la hamburguesa, me la gané", "antojo"],
    // generales: dependen del estado y de la hora
    ["g_grupal", "", "tarde", 2, "Tengo que avanzar el trabajo grupal", "plan"],
    ["g_visto", "", "tarde", 2, "Mi grupo de trabajo: visto y nada", "plan"],
    ["g_organizo", "", "manana", 2, "Hoy sí me organizo. Creo", "plan"],
    ["g_mama", "", "noche&saldo>=3", 2, "Le aviso a mi mamá que ya salgo", "plan"],
    ["g_siesta", "", "tarde&energia<5", 3, "Una siesta de cinco minutos… o cinco horas", "cuerpo"],
    ["g_maraton", "", "paro", 6, "Con el paro, Lima se volvió maratón", "preocupacion"],
    ["g_lluvia_lima", "", "lluvia", 3, "Lima y su lluvia que no es lluvia", "cuerpo"],
    ["g_indice", "", "examen&tarde", 4, "Ya estudié… el índice", "preocupacion"],
    ["g_repaso", "", "examen&noche", 5, "Esta noche repaso. O lo intento", "plan"],
    ["g_solcito", "", "manana&!lluvia", 1, "Solcito en Lima: milagro del día", "cuerpo"],
    // referencia de gasto del día: la clave de uso es lo gastado hoy dividido entre la referencia de hoy
    ["f_ref_bien", "", "refUso<0.3&tarde", 3, "Voy bajo la referencia. Soy una genia financiera", "plan"],
    ["f_ref_mitad", "", "refUso>=0.5&refUso<0.7", 5, "Ya va la mitad de mi referencia. Activo modo calculadora", "preocupacion"],
    ["f_ref_mitad_temprano", "", "refUso>=0.5&refUso<1&manana", 6, "Mitad de la referencia y ni es mediodía. Bravo, Camila", "preocupacion"],
    ["f_ref_casi", "", "refUso>=0.85&refUso<=1", 7, "Ya casi toco mi referencia. Billetera, aguanta", "preocupacion"],
    ["f_ref_pasada", "", "refUso>1", 8, "Me pasé de la referencia. Mi yo de mañana me va a odiar", "preocupacion"],
    ["f_ref_muy_pasada", "", "refUso>1.3", 9, "Muy pasada de la referencia. Mañana desayuno aire otra vez", "preocupacion"],
    // recuerdos: en pasado, solo si ya pasó hoy
    ["r_multa", "", "hizo:multa", 4, "Ya pagué la multa. Adiós, S/ 3", "recuerdo"],
    ["r_hamburguesa", "", "hizo:bembos_promo", 4, "Esa hamburguesa estuvo buenaza", "recuerdo"],
    ["r_frappe", "", "hizo:cafe_examen", 4, "El frappé ya hizo efecto, creo", "recuerdo"],
    ["r_stickers", "", "rechazo:accesorios", 3, "Bien hecho: no compré stickers", "recuerdo"],
    ["r_presté", "", "hizo:prestamo", 4, "Presté S/ 10… adiós, amigos míos", "recuerdo"],
    ["r_corta", "", "sinfondos", 5, "Hoy me quedé corta. Qué roche", "recuerdo"],
    // razones: recomiendan qué hacer, solo en el modo ver a un agente
    ["z_taxi_noche", "paradero_regreso", "noche&saldo>=12&!taxi_no_vuelta", 6, "Ya es tarde, mejor tomo un taxi", "razon"],
    ["z_antojos", "", "saldoDia<12&tarde", 6, "Mejor no gasto en antojos hoy", "razon"],
  ],
  // catálogo de eventos posibles en cada parada. el tipo puede ser necesidad, antojo o sorpresa.
  // columnas: id, parada, título, texto, costo, tipo, probabilidad, condición, bienestar si acepta, tramo,
  // orden, efecto si acepta y consecuencia si rechaza.
  // la condición es una de las condiciones del día, puede ir negada, o queda vacía si el evento siempre puede salir.
  catalogo_eventos: [
    // paradero de ida
    ["paro_taxi", "paradero_ida", "Paro de transporte", "Hoy hay paro y casi no pasan buses. Un taxi colectivo a la universidad cobra S/ 8. La otra opción es caminar 45 minutos.", 8.00, "necesidad", 1, "paro", 0, "ida", 10,
      { energia: 0 }, { minutos: 45, energia: -2, bienestar: -1, resuelve_tramo: 1, texto: "Camina y llega tarde." }],
    ["lluvia_mototaxi", "paradero_ida", "Garúa y bus lleno", "Está garuando y el bus pasa repleto. Un mototaxi hasta la avenida principal te deja a tiempo por S/ 5.", 5.00, "necesidad", 1, "lluvia", 0.5, "ida", 20,
      {}, { minutos: 20, bienestar: -1, texto: "Espera otro bus y llega tarde." }],
    // tambo
    ["desayuno", "tambo", "No hubo desayuno en casa", "No había nada para desayunar. Un pan con pollo y un yogurt cuestan S/ 4.50.", 4.50, "necesidad", 1, "!comida_en_casa", 1, "", 10,
      { hambre: -3, energia: 1 }, { hambre: 3, energia: -1, bienestar: -1, texto: "Va a clases con el estómago vacío." }],
    ["recarga", "tambo", "Sin datos en el celular", "Se acabaron tus datos y los necesitas para coordinar el trabajo grupal. Recarga de S/ 5.", 5.00, "necesidad", 0.25, "", 1, "", 20,
      { bateria: 0 }, { bienestar: -2, texto: "No puede coordinar con su grupo." }],
    ["galletas", "tambo", "Promo de galletas y gaseosa", "Combo de galletas con gaseosa a S/ 3.90. No lo necesitas, pero se ve rico.", 3.90, "antojo", 0.5, "", 1, "", 30,
      { hambre: -1, energia: 1 }, {}],
    // puerta de la universidad
    ["emoliente", "puerta", "Emoliente calientito", "La señora del carrito vende emoliente con linaza a S/ 1.50.", 1.50, "antojo", 0.6, "", 1, "", 10,
      { hambre: -1, energia: 1 }, {}],
    ["salchipapa", "puerta", "Salchipapa al paso", "Una salchipapa para el camino cuesta S/ 6.", 6.00, "antojo", 0.35, "", 1.5, "", 20,
      { hambre: -3, energia: -1 }, {}],
    // atención al alumno
    ["tramite_carne", "atencion", "Olvidaste tu carné", "Sin carné no puedes ingresar. El pase provisional cuesta S/ 5.", 5.00, "necesidad", 1, "olvido_carne", 0, "", 10,
      { minutos: 0 }, { minutos: 60, bienestar: -3, texto: "Espera a que le traigan el carné y pierde la primera clase." }],
    ["constancia", "atencion", "Constancia para la beca", "Te piden una constancia de estudios para renovar tu beca: S/ 8.", 8.00, "necesidad", 0.15, "", 1, "", 20,
      {}, { bienestar: -3, texto: "Arriesga su renovación de beca." }],
    // aula y patio
    ["colecta", "aula", "Colecta de cumpleaños", "Están juntando para el cumpleaños de una compañera: S/ 5 cada una.", 5.00, "sorpresa", 0.3, "", 2, "", 10,
      {}, { bienestar: -1.5, texto: "Se siente incómoda con el grupo." }],
    ["prestamo", "aula", "Una amiga te pide prestado", "Una amiga te pide S/ 10 \"hasta mañana\". La última vez no te devolvió.", 10.00, "sorpresa", 0.2, "", 0.5, "", 20,
      {}, { bienestar: -0.5, texto: "Dice que no con algo de culpa." }],
    ["bateria", "aula", "Se acaba la batería", "Tu celular está en 3%. Un cargador portátil cuesta S/ 15. Sin batería no puedes yapear ni avisar en casa.", 15.00, "necesidad", 0.25, "", 1, "", 30,
      { bateria: 80 }, { bateria: -100, bienestar: -2, texto: "Se queda sin celular el resto del día." }],
    ["audifono", "aula", "Se rompió tu audífono", "Lo necesitas para la clase de inglés con audios. Unos básicos cuestan S/ 12.", 12.00, "necesidad", 0.15, "", 1, "", 40,
      {}, { bienestar: -1.5, texto: "Sigue la clase como puede." }],
    ["accesorios", "aula", "Oferta de accesorios", "En el patio venden fundas y stickers: 3 por S/ 10. ¡Están bonitos!", 10.00, "antojo", 0.35, "", 1.5, "", 50,
      {}, {}],
    // biblioteca
    ["multa", "biblioteca", "Multa por devolución tardía", "Devolviste un libro con 3 días de retraso: S/ 3 de multa.", 3.00, "sorpresa", 0.3, "", 0, "", 10,
      {}, { deuda: 3, bienestar: -2, texto: "Queda debiendo y no puede sacar libros." }],
    // impresiones y copias
    ["impresion", "impresiones", "Trabajo impreso urgente", "La profesora pidió el trabajo impreso y anillado para hoy: S/ 6.", 6.00, "necesidad", 1, "entrega_impreso", 1, "", 10,
      {}, { bienestar: -4, texto: "Entrega tarde y le bajan la nota." }],
    ["fotocopias", "impresiones", "Fotocopias para el examen", "Fotocopias de dos capítulos del libro para el examen: S/ 3.50.", 3.50, "necesidad", 0.8, "examen", 1, "", 20,
      {}, { bienestar: -2, texto: "Estudia solo de sus apuntes." }],
    // cafetería
    ["menu_economico", "cafeteria", "No te alcanza para el menú", "Un pan con pollo y refresco cuesta S/ 5. No es un almuerzo completo, pero ayuda.", 5.00, "necesidad", 1, "!comida_en_casa", 0.5, "", 60,
      { hambre: -3 }, { hambre: 1, bienestar: -1, texto: "Se aguanta el hambre." }],
    ["postre", "cafeteria", "Postre de la cafetería", "Hay pye de manzana a S/ 4.", 4.00, "antojo", 0.4, "", 1, "", 70,
      { hambre: -1 }, {}],
    // starbucks
    ["cafe_examen", "starbucks", "Café para estudiar", "Mañana es el examen. Un frappuccino y una mesa para estudiar: S/ 14.", 14.00, "antojo", 0.9, "examen", 2, "", 10,
      { energia: 3 }, { energia: -1, texto: "Estudia con sueño." }],
    ["bubble_tea", "starbucks", "Bubble tea 2x1", "Tu amiga te invita a compartir un bubble tea 2x1 al frente: S/ 9 tu parte.", 9.00, "antojo", 0.4, "", 2.5, "", 20,
      { energia: 1 }, { bienestar: -0.5, texto: "Tu amiga va sola." }],
    // bembos
    ["bembos_promo", "bembos", "Promo Bembos", "Hamburguesa clásica + papas + gaseosa: S/ 13.90 solo por hoy.", 13.90, "antojo", 0.7, "", 3, "", 10,
      { hambre: -4 }, {}],
    ["yapeo_error", "bembos", "Yapeo equivocado", "Yapeaste la cuota del grupo a un número equivocado. Debes volver a pagar S/ 10.", 10.00, "sorpresa", 0.15, "", 0, "", 20,
      {}, { deuda: 10, bienestar: -2, texto: "Queda debiendo al grupo." }],
    // paradero de regreso
    ["taxi_noche", "paradero_regreso", "Regreso de noche", "Ya es de noche y el paradero está oscuro. Un taxi por aplicación cuesta S/ 9. El bus cuesta S/ 2.50.", 9.00, "necesidad", 1, "", 0, "vuelta", 10,
      { seguridad: 1 }, { seguridad: -1, bienestar: -2, texto: "Toma el bus en una zona poco segura." }],
  ],
};

// eventos de transporte que fueron reemplazados por la elección de medio en el paradero.
// se siguen sorteando aunque no se usen: si se quitaran, cambiaría la secuencia del generador y una misma
// semilla ya no produciría los mismos eventos en las demás paradas.
const EVENTOS_RETIRADOS = new Set(["paro_taxi", "lluvia_mototaxi", "taxi_noche"]);

// probabilidad con que se sortea cada condición del día, por ejemplo hay comida en casa en el 55 por ciento
// de los días. el saldo no se sortea: lo pone la persona como presupuesto del periodo.
const PROB_CONDICIONES = { comida_en_casa: 0.55, lluvia: 0.2, paro: 0.1, entrega_impreso: 0.4, examen: 0.35, olvido_carne: 0.15 };

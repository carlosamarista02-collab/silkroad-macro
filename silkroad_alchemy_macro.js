"ui";

var URL_ACTUALIZACION = "https://raw.githubusercontent.com/TU_USUARIO/TU_REPOSITORIO/main/main.js";
var VERSION_ACTUAL = "1.1.1";

try {
  activity.resizeTask && activity.resizeTask(700, 1100);
} catch (e) {}

var prefs = storages.create("SilkroadAlchemyApp");
var workerThread = null;
var contadorThread = null;
var floatWin = null;
var miniIconWin = null;
var running = false;
var alchemyActiva = false;
var paused = false;
var vistaActual = "alchemy";
var disparoAutoHora = "";
var capturaLista = false;

var ALCHEMY_ITEM_SLOT = { x: 305, y: 640, size: 72 };

var PLUS_OPCIONES = [
  "+1", "+2", "+3", "+4", "+5", "+6", "+7", "+8",
  "+9", "+10", "+11", "+12", "+13", "+14", "+15"
];

var ELIXIR_OPCIONES = [
  { label: "Weapon Elixir", key: "weapon" },
  { label: "Shield Elixir", key: "shield" },
  { label: "Protector Elixir", key: "protector" },
  { label: "Accessory Elixir", key: "accessory" },
  { label: "Astral / Immortal", key: "special" }
];

var LUCKY_DEGREES = [
  "1th", "2th", "3th", "4th", "5th", "6th", "7th", "8th"
];

var colaItensDetec = [];
var indiceItemActual = 0;

var logsHistorial = [];
var statsSesion = {
  modo: "Alchemy",
  personaje: "",
  nivel: "",
  itemDetectado: "Auriga Elegant Staff",
  plusActual: "+0",
  cantidadMismoItem: 0,
  descripcionItem: "Ítem: Auriga Elegant Staff | Estado: +0",
  intentos: 0,
  fallos: 0,
  roto: false,
  sinElixir: false,
  sinLucky: false,
  metaAlcanzada: false
};

function horaActual() {
  var d = new Date();
  var h = ("0" + d.getHours()).slice(-2);
  var m = ("0" + d.getMinutes()).slice(-2);
  var s = ("0" + d.getSeconds()).slice(-2);
  return h + ":" + m + ":" + s;
}

function agregarLog(msg) {
  var linea = "[" + horaActual() + "] " + msg;
  logsHistorial.push(linea);
  if (logsHistorial.length > 300) {
    logsHistorial.shift();
  }
  log(linea);
}

function reiniciarStats(modo) {
  var nombreBase = String(prefs.get("itemName", "") || "").trim() || statsSesion.itemDetectado || "Item";
  statsSesion = {
    modo: modo || "Alchemy",
    personaje: "",
    nivel: "",
    itemDetectado: nombreBase,
    plusActual: "+0",
    cantidadMismoItem: colaItensDetec.length,
    descripcionItem: "Ítem: " + nombreBase + " | Estado: +0",
    intentos: 0,
    fallos: 0,
    roto: false,
    sinElixir: false,
    sinLucky: false,
    metaAlcanzada: false
  };
}

function comprobarYActualizarScript() {
  toast("Buscando actualización...");
  agregarLog("Buscando actualización en " + URL_ACTUALIZACION);

  threads.start(function () {
    try {
      var res = http.get(URL_ACTUALIZACION);
      if (!res || res.statusCode !== 200) {
        toast("No se pudo conectar para actualizar");
        agregarLog("Error de conexión al buscar actualización");
        return;
      }

      var nuevoCodigo = res.body.string();
      if (!nuevoCodigo || nuevoCodigo.length < 50) {
        toast("El archivo remoto no contiene código válido");
        agregarLog("Actualización omitida: contenido vacío o inválido");
        return;
      }

      var fuente = engines.myEngine().getSource();
      var rutaScript = fuente ? String(fuente.toString()) : "";
      if (!rutaScript || !files.exists(rutaScript)) {
        toast("No se encontró la ruta del script local");
        agregarLog("No se pudo localizar la ruta del script para sobrescribir");
        return;
      }

      var codigoActual = files.read(rutaScript);
      if (codigoActual === nuevoCodigo) {
        toast("Ya tienes la última versión");
        agregarLog("Sin cambios nuevos disponibles");
        return;
      }

      files.write(rutaScript, nuevoCodigo);
      toast("Actualización aplicada. Reiniciando...");
      agregarLog("Actualización descargada y guardada. Reiniciando script...");
      sleep(800);
      engines.execScriptFile(rutaScript);
      engines.myEngine().forceStop();
    } catch (e) {
      toast("Error al actualizar: " + e.message);
      agregarLog("Error al actualizar: " + e.message);
    }
  });
}

function normalizarHoraHHMM(texto) {
  var limpio = String(texto || "").trim();
  var partes = limpio.split(":");
  if (partes.length !== 2) return "20:00";
  var h = parseInt(partes[0], 10);
  var m = parseInt(partes[1], 10);
  if (isNaN(h) || h < 0 || h > 23) h = 20;
  if (isNaN(m) || m < 0 || m > 59) m = 0;
  return ("0" + h).slice(-2) + ":" + ("0" + m).slice(-2);
}

function segundosHastaHora(horaHHMM) {
  var normal = normalizarHoraHHMM(horaHHMM);
  var partes = normal.split(":");
  var targetH = parseInt(partes[0], 10);
  var targetM = parseInt(partes[1], 10);

  var ahora = new Date();
  var objetivo = new Date(
    ahora.getFullYear(),
    ahora.getMonth(),
    ahora.getDate(),
    targetH,
    targetM,
    0,
    0
  );

  return Math.floor((objetivo.getTime() - ahora.getTime()) / 1000);
}

function formatearContador(segs) {
  if (segs <= 0) {
    return "00h 00m 00s (Hora de registro)";
  }
  var hrs = Math.floor(segs / 3600);
  var mins = Math.floor((segs % 3600) / 60);
  var s = segs % 60;
  return (
    ("0" + hrs).slice(-2) + "h " +
    ("0" + mins).slice(-2) + "m " +
    ("0" + s).slice(-2) + "s"
  );
}

function formatearSoloDetectado(nombre, nivel) {
  var partes = [];
  if (nombre && String(nombre).trim()) {
    partes.push("PJ: " + String(nombre).trim());
  }
  if (nivel && String(nivel).trim()) {
    partes.push("Lv. " + String(nivel).trim());
  }
  return partes.length > 0 ? partes.join(" | ") : "Detectando personaje en juego...";
}

function actualizarDeteccionPantallaUI(nombre, nivel) {
  statsSesion.personaje = nombre ? String(nombre).trim() : "";
  statsSesion.nivel = nivel ? String(nivel).trim() : "";
  var texto = formatearSoloDetectado(statsSesion.personaje, statsSesion.nivel);

  ui.run(function () {
    if (ui.tv_char_info) ui.tv_char_info.setText(texto);
    if (ui.tv_ev_char_info) ui.tv_ev_char_info.setText(texto);
    if (floatWin && floatWin.tv_mini_char) {
      try {
        floatWin.tv_mini_char.setText(texto);
      } catch (e) {}
    }
  });
}

function actualizarInfoItemDetalladaUI(nombreItem, plusActual, cantidad) {
  var limpioNombre = (nombreItem && String(nombreItem).trim())
    ? String(nombreItem).trim()
    : (String(prefs.get("itemName", "") || "").trim() || statsSesion.itemDetectado || "Item");
  var limpioPlus = (plusActual && String(plusActual).trim())
    ? String(plusActual).trim()
    : "+0";
  var qtyNum = Math.max(0, parseInt(cantidad, 10) || 0);

  statsSesion.itemDetectado = limpioNombre;
  statsSesion.plusActual = limpioPlus;
  statsSesion.cantidadMismoItem = qtyNum;
  statsSesion.descripcionItem = "Ítem: " + limpioNombre + " | Estado: " + limpioPlus;

  ui.run(function () {
    if (ui.tv_top_item) {
      ui.tv_top_item.setText(statsSesion.descripcionItem + " | Detec: " + qtyNum);
    }
    if (floatWin && floatWin.tv_mini_info) {
      try {
        floatWin.tv_mini_info.setText(limpioNombre + " [" + limpioPlus + "] x" + qtyNum);
      } catch (e) {}
    }
  });
}

function autoDetectarCantidadesEnPantalla(cfg) {
  var elixirDetectado = cfg.elixirQty || 0;
  var luckyDetectado = cfg.luckyQty || 0;

  try {
    var screen = captureScreen();
    if (!screen) {
      actualizarContadoresUI(elixirDetectado, luckyDetectado);
      return { elixir: elixirDetectado, lucky: luckyDetectado };
    }

    var candidatosElixir = obtenerCandidatosElixir(cfg.elixirKey);
    var candidatosLucky = obtenerCandidatosLucky(cfg.luckyDegree);

    var hitElixir = buscarEnCaptura(screen, cfg, candidatosElixir);
    if (hitElixir) {
      agregarLog("Elixir detectado (" + hitElixir.name + ".png) en (" + hitElixir.x + "," + hitElixir.y + ")");
    } else {
      agregarLog("Elixir no detectado con plantillas: " + candidatosElixir.join(", "));
    }

    var hitLucky = buscarEnCaptura(screen, cfg, candidatosLucky);
    if (hitLucky) {
      agregarLog("Lucky detectado (" + hitLucky.name + ".png) en (" + hitLucky.x + "," + hitLucky.y + ")");
    } else {
      agregarLog("Lucky no detectado con plantillas: " + candidatosLucky.join(", "));
    }
  } catch (e) {
    agregarLog("Error detectando elixir/lucky: " + e.message);
  }

  actualizarContadoresUI(elixirDetectado, luckyDetectado);
  return { elixir: elixirDetectado, lucky: luckyDetectado };
}

function renderizarListaItensDetecUI() {
  if (vistaActual !== "alchemy" || !ui.container_itens_detec) return;

  ui.run(function () {
    ui.container_itens_detec.removeAllViews();

    if (!colaItensDetec || colaItensDetec.length === 0) {
      var vacio = ui.inflate(
        <text text="Sin ítems detectados aún. Coloca el arma y toca Escanear." textSize="11sp" textColor="#9CA3AF" padding="4" />
      );
      ui.container_itens_detec.addView(vacio);
      return;
    }

    for (var i = 0; i < colaItensDetec.length; i++) {
      (function (idx) {
        var entry = colaItensDetec[idx];
        var fila = ui.inflate(
          <horizontal gravity="center_vertical" bg="#1F2937" padding="6" marginBottom="4">
            <checkbox id="cb_item_sel" checked={Boolean(entry.selected)} textColor="#FFFFFF" textSize="11sp" layout_weight="1" />
            <spinner id="sp_item_meta" entries="+1|+2|+3|+4|+5|+6|+7|+8|+9|+10|+11|+12|+13|+14|+15" bg="#111827" />
          </horizontal>
        );

        var etiquetaFila = entry.nombre + " " + entry.plusActual + " #" + (idx + 1);
        fila.cb_item_sel.setText(etiquetaFila);

        var metaIdx = PLUS_OPCIONES.indexOf(entry.plusObjetivo || "+2");
        if (metaIdx < 0) metaIdx = 1;
        fila.sp_item_meta.setSelection(metaIdx);

        fila.cb_item_sel.setOnCheckedChangeListener(function (_, isChecked) {
          colaItensDetec[idx].selected = Boolean(isChecked);
        });

        fila.sp_item_meta.setOnItemSelectedListener(new android.widget.AdapterView.OnItemSelectedListener({
          onItemSelected: function (_, __, pos) {
            var chosen = PLUS_OPCIONES[pos] || "+2";
            colaItensDetec[idx].plusObjetivo = chosen;
            colaItensDetec[idx].metaNumero = parseInt(chosen.replace("+", ""), 10) || 2;
          },
          onNothingSelected: function () {}
        }));

        ui.container_itens_detec.addView(fila);
      })(i);
    }
  });
}

function leerSoloLoVistoEnPantalla(cfg) {
  var nombreVisto = "";
  var nivelVisto = "";

  try {
    var screen = captureScreen();
    var vioLvImg = screen ? (buscarEnCaptura(screen, cfg, ["lv"]) != null) : false;
    var vioNombreImg = screen ? (buscarEnCaptura(screen, cfg, ["nombre"]) != null) : false;

    if (vioLvImg) {
      nivelVisto = "Lv";
    }
    if (vioNombreImg) {
      nombreVisto = "Detectado";
    }
  } catch (e) {}

  return {
    personaje: nombreVisto,
    nivel: nivelVisto
  };
}

function esperarCuentaEnJuego(cfg) {
  setEstado("Verificando pantalla en juego...");
  var visto = leerSoloLoVistoEnPantalla(cfg);
  if (visto.personaje || visto.nivel) {
    actualizarDeteccionPantallaUI(visto.personaje, visto.nivel);
    agregarLog("Visto en pantalla -> " + formatearSoloDetectado(visto.personaje, visto.nivel));
  }
  return true;
}

function actualizarContadorYAutoActivar() {
  var horaProg = normalizarHoraHHMM(prefs.get("evHora", "20:00"));
  var segs = segundosHastaHora(horaProg);
  var texto = "Guild Boss (" + horaProg + "): " + formatearContador(segs);

  ui.run(function () {
    if (vistaActual === "eventos" && ui.tv_ev_countdown) {
      ui.tv_ev_countdown.setText(texto);
    }
    if (floatWin && running) {
      try {
        floatWin.tv_mini_info.setText("Guild Boss | " + formatearContador(segs));
      } catch (e) {}
    }
  });

  var ahora = new Date();
  var claveDisparo =
    ahora.getFullYear() + "-" +
    (ahora.getMonth() + 1) + "-" +
    ahora.getDate() + " " +
    horaProg;

  if (segs === 0 && (!running || !alchemyActiva) && disparoAutoHora !== claveDisparo) {
    disparoAutoHora = claveDisparo;
    alchemyActiva = false;
    agregarLog("Activación automática de Guild Boss (" + horaProg + ")");
    var cfgEv = leerConfigEventos();
    cfgEv.modo = "Eventos";
    running = true;
    paused = false;
    threads.start(function () {
      try {
        prepararEntornoYPermisos(cfgEv);
        esperarCuentaEnJuego(cfgEv);
        ejecutarEventos(cfgEv);
      } catch (err) {
        agregarLog("Error en Eventos automático: " + err.message);
      }
    });
  }
}

function iniciarRelojContador() {
  if (contadorThread && contadorThread.isAlive()) return;
  contadorThread = threads.start(function () {
    while (true) {
      actualizarContadorYAutoActivar();
      sleep(1000);
    }
  });
}

function tieneAccesibilidad() {
  return auto.service != null;
}

function tieneSuperposicion() {
  try {
    return Boolean(floaty.checkPermission());
  } catch (e) {
    return false;
  }
}

function abrirAjusteAccesibilidad() {
  toast("Activa Accesibilidad para AutoJs6");
  try {
    app.startActivity({ action: "android.settings.ACCESSIBILITY_SETTINGS" });
  } catch (e) {
    log("Error accesibilidad: " + e.message);
  }
}

function abrirAjusteSuperposicion() {
  try {
    floaty.requestPermission();
  } catch (e) {
    log("Error superposición: " + e.message);
  }
}

function refrescarEstadoPermisos() {
  var acc = tieneAccesibilidad();
  var ovl = tieneSuperposicion();
  var msg = "Accesibilidad: " + (acc ? "OK" : "Falta") + " | Flotante: " + (ovl ? "OK" : "Falta");
  ui.run(function () {
    if (ui.tv_perms) ui.tv_perms.setText(msg);
    if (ui.tv_ev_perms) ui.tv_ev_perms.setText(msg);
  });
  return acc && ovl;
}

// Envía directo a configuración si falta Accesibilidad, pide flotante sin frenar y activa captura
function prepararEntornoYPermisos(cfg) {
  try {
    files.createWithDirs(cfg.dir);
  } catch (e) {}

  if (!tieneAccesibilidad()) {
    ui.run(function () { abrirAjusteAccesibilidad(); });
    for (var w = 0; w < 20 && !tieneAccesibilidad() && running; w++) {
      sleep(500);
    }
    if (!tieneAccesibilidad()) {
      detenerMacro("Activa Accesibilidad y vuelve a tocar INICIAR");
      return false;
    }
  }

  if (!tieneSuperposicion()) {
    ui.run(function () { abrirAjusteSuperposicion(); });
    sleep(800);
  }

  if (!capturaLista) {
    try {
      var capOk = requestScreenCapture();
      if (capOk) {
        capturaLista = true;
      } else {
        detenerMacro("Permite la captura de pantalla para continuar");
        return false;
      }
    } catch (e) {
      detenerMacro("Error captura: " + e.message);
      return false;
    }
  }

  refrescarEstadoPermisos();
  return true;
}

function setEstado(texto) {
  ui.run(function () {
    if (ui.tv_status) ui.tv_status.setText("Estado: " + texto);
    if (ui.tv_ev_status) ui.tv_ev_status.setText("Estado: " + texto);
    if (floatWin) {
      try {
        floatWin.tv_mini_status.setText(texto);
      } catch (e) {}
    }
  });
}

function actualizarContadoresUI(elixirRest, luckyRest) {
  ui.run(function () {
    if (vistaActual === "alchemy" && ui.et_elixir_qty && ui.et_lucky_qty) {
      ui.et_elixir_qty.setText(String(elixirRest));
      ui.et_lucky_qty.setText(String(luckyRest));
    }
  });
  prefs.put("elixirQty", elixirRest);
  prefs.put("luckyQty", luckyRest);
}

function mostrarVentanaLog() {
  var resumenStats =
    "Pantalla: " + formatearSoloDetectado(statsSesion.personaje, statsSesion.nivel) + "\n" +
    statsSesion.descripcionItem + " | Detec: " + statsSesion.cantidadMismoItem + "\n" +
    "Modo: " + statsSesion.modo + " | Intentos: " + statsSesion.intentos + " | Fallos: " + statsSesion.fallos + "\n" +
    "Roto: " + (statsSesion.roto ? "SÍ" : "NO") +
    " | Sin Elixir: " + (statsSesion.sinElixir ? "SÍ" : "NO") +
    " | Sin Lucky: " + (statsSesion.sinLucky ? "SÍ" : "NO") +
    " | Meta: " + (statsSesion.metaAlcanzada ? "SÍ" : "NO");

  var detalle = logsHistorial.length > 0
    ? logsHistorial.slice().reverse().join("\n")
    : "Aún no hay registros en esta sesión.";

  dialogs.build({
    title: "Registro de Actividad SRO",
    content: resumenStats + "\n------------------------------\n" + detalle,
    positive: "Cerrar",
    neutral: "Limpiar LOG"
  }).on("neutral", function () {
    logsHistorial = [];
    reiniciarStats("Alchemy");
    toast("LOG limpiado");
  }).show();
}

function cargarUIAlchemy() {
  var itemName = prefs.get("itemName", "");
  var plusIdx = prefs.get("plusIdx", 5);
  var elixirIdx = prefs.get("elixirIdx", 0);
  var luckyDegIdx = prefs.get("luckyDegIdx", 0);

  if (plusIdx < 0 || plusIdx >= PLUS_OPCIONES.length) plusIdx = 5;
  if (elixirIdx < 0 || elixirIdx >= ELIXIR_OPCIONES.length) elixirIdx = 0;
  if (luckyDegIdx < 0 || luckyDegIdx >= LUCKY_DEGREES.length) luckyDegIdx = 0;

  actualizarDeteccionPantallaUI(statsSesion.personaje, statsSesion.nivel);

  ui.et_item_name.setText(String(itemName));
  actualizarInfoItemDetalladaUI(
    itemName || statsSesion.itemDetectado,
    statsSesion.plusActual,
    colaItensDetec.length
  );

  ui.sp_plus.setSelection(plusIdx);
  ui.sp_elixir.setSelection(elixirIdx);
  ui.sp_lucky_deg.setSelection(luckyDegIdx);

  ui.et_elixir_qty.setText(String(prefs.get("elixirQty", 0)));
  ui.et_lucky_qty.setText(String(prefs.get("luckyQty", 0)));
  ui.cb_use_lucky.setChecked(Boolean(prefs.get("useLucky", true)));
  ui.cb_use_confirm.setChecked(Boolean(prefs.get("useConfirm", false)));

  ui.et_threshold.setText(String(prefs.get("threshold", 0.70)));
  ui.et_max_tries.setText(String(prefs.get("maxTries", 300)));
  ui.et_delay_tap.setText(String(prefs.get("delayTap", 550)));
  ui.et_delay_res.setText(String(prefs.get("delayRes", 2600)));

  renderizarListaItensDetecUI();
}

function leerConfigAlchemy() {
  var itemNameRaw = String(ui.et_item_name.text() || "").trim();
  var itemName = itemNameRaw || statsSesion.itemDetectado || "Item";
  actualizarInfoItemDetalladaUI(itemName, statsSesion.plusActual, colaItensDetec.length);

  var plusIdx = ui.sp_plus.getSelectedItemPosition();
  var elixirIdx = ui.sp_elixir.getSelectedItemPosition();
  var luckyDegIdx = ui.sp_lucky_deg.getSelectedItemPosition();

  var plusTexto = PLUS_OPCIONES[plusIdx] || "+6";
  var plusNumero = parseInt(plusTexto.replace("+", ""), 10) || 6;
  var elixirObj = ELIXIR_OPCIONES[elixirIdx] || ELIXIR_OPCIONES[0];
  var luckyDegTexto = LUCKY_DEGREES[luckyDegIdx] || "1th";

  var th = parseFloat(ui.et_threshold.text());
  if (isNaN(th) || th < 0.40 || th > 0.99) th = 0.70;

  var cfg = {
    modo: "Alchemy",
    itemName: itemName,
    evName: "Guild Boss",
    evHora: normalizarHoraHHMM(prefs.get("evHora", "20:00")),
    evCycles: 3,
    evWait: 1200,
    plusIdx: plusIdx,
    plusTexto: plusTexto,
    plusNumero: plusNumero,
    elixirIdx: elixirIdx,
    elixirLabel: elixirObj.label,
    elixirKey: elixirObj.key,
    luckyDegIdx: luckyDegIdx,
    luckyDegree: luckyDegTexto,
    elixirQty: Math.max(0, parseInt(ui.et_elixir_qty.text(), 10) || 0),
    luckyQty: Math.max(0, parseInt(ui.et_lucky_qty.text(), 10) || 0),
    useLucky: ui.cb_use_lucky.isChecked(),
    useConfirm: ui.cb_use_confirm.isChecked(),
    threshold: th,
    maxTries: Math.max(1, parseInt(ui.et_max_tries.text(), 10) || 300),
    delayTap: Math.max(150, parseInt(ui.et_delay_tap.text(), 10) || 550),
    delayRes: Math.max(500, parseInt(ui.et_delay_res.text(), 10) || 2600),
    dir: "/sdcard/SilkroadMacro/"
  };

  prefs.put("itemName", itemNameRaw);
  prefs.put("plusIdx", cfg.plusIdx);
  prefs.put("elixirIdx", cfg.elixirIdx);
  prefs.put("luckyDegIdx", cfg.luckyDegIdx);
  prefs.put("elixirQty", cfg.elixirQty);
  prefs.put("luckyQty", cfg.luckyQty);
  prefs.put("useLucky", cfg.useLucky);
  prefs.put("useConfirm", cfg.useConfirm);
  prefs.put("threshold", cfg.threshold);
  prefs.put("maxTries", cfg.maxTries);
  prefs.put("delayTap", cfg.delayTap);
  prefs.put("delayRes", cfg.delayRes);

  return cfg;
}

function leerConfigEventos() {
  var evHora = normalizarHoraHHMM(ui.et_ev_hora ? ui.et_ev_hora.text() : prefs.get("evHora", "20:00"));
  if (ui.et_ev_hora) ui.et_ev_hora.setText(evHora);
  prefs.put("evName", "Guild Boss");
  prefs.put("evHora", evHora);

  var th = parseFloat(prefs.get("threshold", 0.70));
  if (isNaN(th) || th < 0.40 || th > 0.99) th = 0.70;

  var plusIdx = prefs.get("plusIdx", 5);
  var plusTexto = PLUS_OPCIONES[plusIdx] || "+6";
  var elixirIdx = prefs.get("elixirIdx", 0);
  var elixirObj = ELIXIR_OPCIONES[elixirIdx] || ELIXIR_OPCIONES[0];
  var luckyDegIdx = prefs.get("luckyDegIdx", 0);

  return {
    modo: "Eventos",
    itemName: String(prefs.get("itemName", "") || "").trim() || statsSesion.itemDetectado || "Item",
    evName: "Guild Boss",
    evHora: evHora,
    evCycles: 3,
    evWait: 1200,
    plusIdx: plusIdx,
    plusTexto: plusTexto,
    plusNumero: parseInt(plusTexto.replace("+", ""), 10) || 6,
    elixirIdx: elixirIdx,
    elixirLabel: elixirObj.label,
    elixirKey: elixirObj.key,
    luckyDegIdx: luckyDegIdx,
    luckyDegree: LUCKY_DEGREES[luckyDegIdx] || "1th",
    elixirQty: Math.max(0, parseInt(prefs.get("elixirQty", 0), 10) || 0),
    luckyQty: Math.max(0, parseInt(prefs.get("luckyQty", 0), 10) || 0),
    useLucky: Boolean(prefs.get("useLucky", true)),
    useConfirm: Boolean(prefs.get("useConfirm", false)),
    threshold: th,
    maxTries: Math.max(1, parseInt(prefs.get("maxTries", 300), 10) || 300),
    delayTap: Math.max(150, parseInt(ui.et_delay_tap ? ui.et_delay_tap.text() : prefs.get("delayTap", 550), 10) || 550),
    delayRes: Math.max(500, parseInt(ui.et_delay_res ? ui.et_delay_res.text() : prefs.get("delayRes", 2600), 10) || 2600),
    dir: "/sdcard/SilkroadMacro/"
  };
}

function mostrarVistaAlchemy() {
  vistaActual = "alchemy";
  var viewAlchemy = ui.inflate(
    <vertical padding="12" bg="#0A0C14">
      <horizontal gravity="center_vertical" marginBottom="6">
        <text text={"v" + VERSION_ACTUAL} textSize="11sp" textColor="#9CA3AF" layout_weight="1" />
        <button id="btn_update" text="ACTUALIZACIÓN" textSize="10sp" bg="#2563EB" textColor="#FFFFFF" h="32" padding="4" />
      </horizontal>

      <card cardCornerRadius="8dp" cardBackgroundColor="#1E1B18" strokeWidth="1dp" strokeColor="#D97706" marginBottom="8">
        <vertical padding="8">
          <text id="tv_char_info" text="Detectando personaje en juego..." textSize="12sp" textColor="#10B981" textStyle="bold" />
          <text id="tv_top_item" text="Ítem: Item | Estado: +0 | Detec: 0" textSize="12sp" textColor="#FBBF24" textStyle="bold" marginTop="2" />
        </vertical>
      </card>

      <horizontal marginBottom="10">
        <text id="tv_perms" text="Permisos: ..." textSize="10sp" textColor="#9CA3AF" layout_weight="1" gravity="center_vertical" />
        <button id="btn_perms" text="Permisos" textSize="10sp" bg="#374151" textColor="#FFFFFF" h="34" padding="4" marginRight="4" />
        <button id="btn_go_eventos" text="EVENTOS" textSize="10sp" bg="#0284C7" textColor="#FFFFFF" h="34" padding="4" marginRight="4" />
        <button id="btn_log" text="LOG" textSize="10sp" bg="#7C3AED" textColor="#FFFFFF" h="34" padding="4" />
      </horizontal>

      <scroll layout_weight="1">
        <vertical>
          <card cardCornerRadius="10dp" cardBackgroundColor="#111827" strokeWidth="1dp" strokeColor="#374155" marginBottom="10">
            <vertical padding="12">
              <horizontal gravity="center_vertical" marginBottom="8">
                <text text="CONFIGURACIÓN DE ALCHEMY" textSize="12sp" textColor="#F59E0B" textStyle="bold" layout_weight="1" />
                <button id="btn_fuse" text="FUSE" textSize="11sp" bg="#2563EB" textColor="#FFFFFF" textStyle="bold" h="34" padding="6" />
              </horizontal>

              <text text="Nombre del ítem detectado / filtro" textSize="11sp" textColor="#9CA3AF" marginBottom="2" />
              <input id="et_item_name" hint="Ej: Auriga Elegant Staff" textColor="#FFFFFF" textColorHint="#4B5563" bg="#1F2937" padding="8" marginBottom="8" />

              <horizontal marginBottom="8">
                <vertical layout_weight="1" marginRight="4">
                  <text text="Plus Objetivo por defecto" textSize="11sp" textColor="#9CA3AF" />
                  <spinner id="sp_plus" entries="+1|+2|+3|+4|+5|+6|+7|+8|+9|+10|+11|+12|+13|+14|+15" bg="#1F2937" />
                </vertical>
                <vertical layout_weight="1" marginLeft="4">
                  <text text="Degree Lucky" textSize="11sp" textColor="#9CA3AF" />
                  <spinner id="sp_lucky_deg" entries="1th|2th|3th|4th|5th|6th|7th|8th" bg="#1F2937" />
                </vertical>
              </horizontal>

              <text text="Tipo de Elixir a colocar" textSize="11sp" textColor="#9CA3AF" marginBottom="2" />
              <spinner id="sp_elixir" entries="Weapon Elixir|Shield Elixir|Protector Elixir|Accessory Elixir|Astral / Immortal" bg="#1F2937" marginBottom="8" />

              <horizontal marginBottom="8">
                <vertical layout_weight="1" marginRight="4">
                  <text text="Elixires Disp. (Auto)" textSize="11sp" textColor="#9CA3AF" />
                  <input id="et_elixir_qty" inputType="number" textColor="#FFFFFF" bg="#1F2937" padding="6" />
                </vertical>
                <vertical layout_weight="1" marginLeft="4">
                  <text text="Lucky Disp. (Auto)" textSize="11sp" textColor="#9CA3AF" />
                  <input id="et_lucky_qty" inputType="number" textColor="#FFFFFF" bg="#1F2937" padding="6" />
                </vertical>
              </horizontal>

              <checkbox id="cb_use_lucky" text="Colocar automáticamente Lucky Powder del degree" textColor="#D1D5DB" marginBottom="2" />
              <checkbox id="cb_use_confirm" text="Tocar Confirmar si sale emergente" textColor="#D1D5DB" />
            </vertical>
          </card>

          <card cardCornerRadius="10dp" cardBackgroundColor="#111827" strokeWidth="1dp" strokeColor="#D97706" marginBottom="10">
            <vertical padding="12">
              <horizontal gravity="center_vertical" marginBottom="6">
                <text text="Itens detec (mismo ícono/nombre)" textSize="13sp" textColor="#F59E0B" textStyle="bold" layout_weight="1" />
                <button id="btn_scan_itens" text="Escanear" textSize="10sp" bg="#D97706" textColor="#FFFFFF" h="32" padding="4" />
              </horizontal>
              <text text="Marca la casilla de cada ítem y elige su + objetivo. Al terminar o romperse, pasa al siguiente en orden." textSize="11sp" textColor="#9CA3AF" marginBottom="6" />
              <vertical id="container_itens_detec" />
            </vertical>
          </card>

          <card cardCornerRadius="10dp" cardBackgroundColor="#111827" strokeWidth="1dp" strokeColor="#374155" marginBottom="10">
            <vertical padding="12">
              <text text="TIEMPOS Y RECONOCIMIENTO VISUAL" textSize="14sp" textColor="#38BDF8" textStyle="bold" marginBottom="8" />

              <horizontal marginBottom="8">
                <vertical layout_weight="1" marginRight="4">
                  <text text="Precisión (0.40-0.95)" textSize="11sp" textColor="#9CA3AF" />
                  <input id="et_threshold" inputType="numberDecimal" textColor="#FFFFFF" bg="#1F2937" padding="6" />
                </vertical>
                <vertical layout_weight="1" marginLeft="4">
                  <text text="Máx Intentos" textSize="11sp" textColor="#9CA3AF" />
                  <input id="et_max_tries" inputType="number" textColor="#FFFFFF" bg="#1F2937" padding="6" />
                </vertical>
              </horizontal>

              <horizontal marginBottom="6">
                <vertical layout_weight="1" marginRight="4">
                  <text text="Pausa toques (ms)" textSize="11sp" textColor="#9CA3AF" />
                  <input id="et_delay_tap" inputType="number" textColor="#FFFFFF" bg="#1F2937" padding="6" />
                </vertical>
                <vertical layout_weight="1" marginLeft="4">
                  <text text="Espera resultado (ms)" textSize="11sp" textColor="#9CA3AF" />
                  <input id="et_delay_res" inputType="number" textColor="#FFFFFF" bg="#1F2937" padding="6" />
                </vertical>
              </horizontal>

              <text id="tv_status" text="Estado: Listo" textSize="12sp" textColor="#F59E0B" marginTop="4" textStyle="bold" />
            </vertical>
          </card>
        </vertical>
      </scroll>

      <horizontal marginTop="6">
        <button id="btn_save" layout_weight="1" text="GUARDAR" bg="#D97706" textColor="#FFFFFF" textStyle="bold" marginRight="4" />
        <button id="btn_start" layout_weight="1" text="INICIAR" bg="#059669" textColor="#FFFFFF" textStyle="bold" marginRight="4" />
        <button id="btn_stop" layout_weight="1" text="STOP" bg="#DC2626" textColor="#FFFFFF" textStyle="bold" />
      </horizontal>
    </vertical>
  );

  ui.setContentView(viewAlchemy);
  cargarUIAlchemy();
  refrescarEstadoPermisos();

  ui.btn_update.click(function () { comprobarYActualizarScript(); });

  ui.et_item_name.addTextChangedListener(new android.text.TextWatcher({
    beforeTextChanged: function () {},
    onTextChanged: function (s) {
      var val = String(s || "").trim() || "Item";
      for (var k = 0; k < colaItensDetec.length; k++) {
        colaItensDetec[k].nombre = val;
      }
      actualizarInfoItemDetalladaUI(val, statsSesion.plusActual, colaItensDetec.length);
      renderizarListaItensDetecUI();
    },
    afterTextChanged: function () {}
  }));

  ui.btn_scan_itens.click(function () {
    threads.start(function () {
      var cfg = leerConfigAlchemy();
      if (!prepararEntornoYPermisos(cfg)) return;
      autoDetectarCantidadesEnPantalla(cfg);
      escanearItensYConstruirCola(cfg, true);
    });
  });

  ui.btn_go_eventos.click(function () {
    leerConfigAlchemy();
    mostrarVistaEventos();
  });

  ui.btn_log.click(function () { mostrarVentanaLog(); });
  ui.btn_perms.click(function () {
    refrescarEstadoPermisos();
    if (!tieneAccesibilidad()) abrirAjusteAccesibilidad();
    else if (!tieneSuperposicion()) abrirAjusteSuperposicion();
    else toast("Permisos listos");
  });

  ui.btn_save.click(function () {
    leerConfigAlchemy();
    toast("Configuración guardada");
  });

  ui.btn_fuse.click(function () {
    var cfg = leerConfigAlchemy();
    cfg.modo = "Alchemy";
    threads.start(function () {
      try {
        if (!prepararEntornoYPermisos(cfg)) return;
        var prevRunning = running;
        var prevActiva = alchemyActiva;
        var prevPaused = paused;
        running = true;
        alchemyActiva = true;
        paused = false;

        var ok = detectarYTocar(cfg, ["Fuse", "fuse"], "Fuse.png", cfg.delayTap);

        running = prevRunning;
        alchemyActiva = prevActiva;
        paused = prevPaused;

        if (ok) {
          agregarLog("FUSE: tocado dentro del juego");
          toast("Fuse ejecutado");
        } else {
          agregarLog("FUSE: no se encontró Fuse.png en " + cfg.dir);
          toast("No se encontró Fuse.png en pantalla");
        }
      } catch (err) {
        agregarLog("Error al buscar Fuse en juego: " + err.message);
      }
    });
  });

  ui.btn_start.click(function () {
    var cfg = leerConfigAlchemy();
    cfg.modo = "Alchemy";
    running = true;
    alchemyActiva = true;
    paused = false;

    if (workerThread && workerThread.isAlive()) {
      try { workerThread.interrupt(); } catch (e) {}
    }

    workerThread = threads.start(function () {
      try {
        reiniciarStats("Alchemy");
        if (!prepararEntornoYPermisos(cfg)) return;

        esperarCuentaEnJuego(cfg);
        mostrarFlotante(
          "Abriendo menú -> Alchemy",
          formatearSoloDetectado(statsSesion.personaje, statsSesion.nivel)
        );

        var abierto = abrirMenuYTocarAlchemy(cfg);
        agregarLog("Resultado abrir menú -> Alchemy: " + (abierto ? "OK" : "Sin match de imagen"));

        autoDetectarCantidadesEnPantalla(cfg);
        ejecutarAlchemy(cfg);
      } catch (err) {
        detenerMacro("Error: " + err.message);
      }
    });
  });

  ui.btn_stop.click(function () {
    detenerMacro("Detenido manualmente");
    if (workerThread && workerThread.isAlive()) workerThread.interrupt();
  });
}

function mostrarVistaEventos() {
  vistaActual = "eventos";

  var viewEventos = ui.inflate(
    <vertical padding="14" bg="#0A0C14">
      <horizontal gravity="center_vertical" marginBottom="6">
        <text text={"v" + VERSION_ACTUAL} textSize="11sp" textColor="#9CA3AF" layout_weight="1" />
        <button id="btn_ev_update" text="ACTUALIZACIÓN" textSize="10sp" bg="#2563EB" textColor="#FFFFFF" h="32" padding="4" />
      </horizontal>

      <text text="EVENTOS DE GUILD Y AUTO-JOIN" textSize="18sp" textColor="#F59E0B" textStyle="bold" marginBottom="4" />
      <text id="tv_ev_char_info" text="Detectando personaje en juego..." textSize="12sp" textColor="#10B981" textStyle="bold" marginBottom="8" />

      <card cardCornerRadius="8dp" cardBackgroundColor="#1E1B18" strokeWidth="1dp" strokeColor="#D97706" marginBottom="10">
        <horizontal padding="8" gravity="center_vertical">
          <text id="tv_ev_perms" layout_weight="1" text="Permisos: ..." textSize="11sp" textColor="#9CA3AF" />
          <button id="btn_go_alchemy" text="ALCHEMY" textSize="10sp" bg="#059669" textColor="#FFFFFF" h="34" padding="4" marginRight="4" />
          <button id="btn_ev_log" text="LOG" textSize="10sp" bg="#7C3AED" textColor="#FFFFFF" h="34" padding="4" />
        </horizontal>
      </card>

      <card cardCornerRadius="10dp" cardBackgroundColor="#111827" strokeWidth="1dp" strokeColor="#374155" marginBottom="12">
        <vertical padding="14">
          <text text="Guild Boss Auto-Register" textSize="15sp" textColor="#F59E0B" textStyle="bold" marginBottom="6" />
          <text id="tv_ev_countdown" text="Guild Boss: calculando..." textSize="13sp" textColor="#10B981" textStyle="bold" marginBottom="12" />

          <text text="Hora Programada de Evento (HH:MM)" textSize="11sp" textColor="#9CA3AF" marginBottom="4" />
          <input id="et_ev_hora" hint="20:00" textColor="#FFFFFF" textColorHint="#4B5563" bg="#1F2937" padding="8" marginBottom="10" />

          <text id="tv_ev_status" text="Estado: Listo" textSize="12sp" textColor="#38BDF8" />
        </vertical>
      </card>

      <horizontal>
        <button id="btn_ev_save" layout_weight="1" text="GUARDAR HORA" bg="#D97706" textColor="#FFFFFF" textStyle="bold" marginRight="8" />
        <button id="btn_ev_stop" layout_weight="1" text="STOP" bg="#DC2626" textColor="#FFFFFF" textStyle="bold" />
      </horizontal>
    </vertical>
  );

  ui.setContentView(viewEventos);
  ui.et_ev_hora.setText(String(prefs.get("evHora", "20:00")));
  actualizarDeteccionPantallaUI(statsSesion.personaje, statsSesion.nivel);
  refrescarEstadoPermisos();
  actualizarContadorYAutoActivar();

  ui.btn_ev_update.click(function () { comprobarYActualizarScript(); });

  ui.et_ev_hora.addTextChangedListener(new android.text.TextWatcher({
    beforeTextChanged: function () {},
    onTextChanged: function (s) {
      var val = String(s || "").trim();
      if (/^\d{1,2}:\d{2}$/.test(val)) {
        prefs.put("evHora", normalizarHoraHHMM(val));
        actualizarContadorYAutoActivar();
      }
    },
    afterTextChanged: function () {}
  }));

  ui.btn_go_alchemy.click(function () {
    leerConfigEventos();
    mostrarVistaAlchemy();
  });

  ui.btn_ev_log.click(function () { mostrarVentanaLog(); });
  ui.btn_ev_save.click(function () {
    leerConfigEventos();
    actualizarContadorYAutoActivar();
    toast("Hora guardada");
  });

  ui.btn_ev_stop.click(function () {
    detenerMacro("Detenido manualmente");
    if (workerThread && workerThread.isAlive()) workerThread.interrupt();
  });
}

function cerrarFlotante() {
  if (floatWin) {
    try { floatWin.close(); } catch (e) {}
    floatWin = null;
  }
  if (miniIconWin) {
    try { miniIconWin.close(); } catch (e) {}
    miniIconWin = null;
  }
}

function mostrarFlotante(resumen, fichaPj) {
  cerrarFlotante();
  if (!tieneSuperposicion()) return;
  try {
    floatWin = floaty.rawWindow(
      <frame bg="#EE0A0C14" padding="6">
        <vertical>
          <text id="tv_mini_char" text={fichaPj || "Detectando personaje en juego..."} textSize="10sp" textColor="#10B981" textStyle="bold" />
          <text id="tv_mini_info" text={resumen} textSize="10sp" textColor="#F59E0B" marginBottom="2" />
          <text id="tv_mini_status" text={paused ? "En pausa" : "Macro activo"} textSize="10sp" textColor="#F8FAFC" marginBottom="4" />
          <horizontal>
            <button id="btn_float_toggle" text={paused ? "Inicio" : "Pausa"} textSize="10sp" bg="#D97706" textColor="#FFFFFF" w="60" h="32" marginRight="4" />
            <button id="btn_float_stop" text="Stop" textSize="10sp" bg="#DC2626" textColor="#FFFFFF" w="50" h="32" />
          </horizontal>
        </vertical>
      </frame>
    );
    floatWin.setPosition(40, 120);

    floatWin.btn_float_toggle.click(function () {
      if (!running) return;
      paused = !paused;
      ui.run(function () {
        if (floatWin) floatWin.btn_float_toggle.setText(paused ? "Inicio" : "Pausa");
      });
      var estadoPausa = paused ? "En pausa" : "Reanudado";
      setEstado(estadoPausa);
      agregarLog(estadoPausa);
    });

    floatWin.btn_float_stop.click(function () {
      detenerMacro("Detenido desde flotante");
    });
  } catch (e) {
    agregarLog("Aviso flotante: " + e.message);
  }
}

function esperarSiPausado() {
  while (running && paused) sleep(200);
}

function tapPunto(x, y, delayTap) {
  esperarSiPausado();
  if (!running) return;
  click(x + random(-4, 4), y + random(-4, 4));
  sleep(delayTap + random(0, 160));
}

function buscarImagenEscalada(screen, tplBase, threshold) {
  if (!screen || !tplBase) return null;

  var match = images.findImage(screen, tplBase, { threshold: threshold });
  if (match) {
    return {
      x: match.x + Math.floor(tplBase.getWidth() / 2),
      y: match.y + Math.floor(tplBase.getHeight() / 2),
      left: match.x,
      top: match.y,
      w: tplBase.getWidth(),
      h: tplBase.getHeight()
    };
  }

  var escalas = [0.45, 0.55, 0.65, 0.75, 0.85, 0.95, 1.1, 1.25, 1.4];
  var baseW = tplBase.getWidth();
  var baseH = tplBase.getHeight();
  var scrW = screen.getWidth();
  var scrH = screen.getHeight();

  for (var i = 0; i < escalas.length; i++) {
    var r = escalas[i];
    var nw = Math.max(8, Math.round(baseW * r));
    var nh = Math.max(8, Math.round(baseH * r));
    if (nw >= scrW || nh >= scrH) continue;

    var tplScaled = images.resize(tplBase, [nw, nh]);
    if (!tplScaled) continue;
    var m2 = images.findImage(screen, tplScaled, { threshold: Math.max(0.42, threshold - 0.12) });
    var res = m2 ? {
      x: m2.x + Math.floor(nw / 2),
      y: m2.y + Math.floor(nh / 2),
      left: m2.x,
      top: m2.y,
      w: nw,
      h: nh
    } : null;
    tplScaled.recycle();
    if (res) return res;
  }

  return null;
}

function buscarEnCaptura(screen, cfg, nombres) {
  if (!screen) return null;
  for (var i = 0; i < nombres.length; i++) {
    var nombre = nombres[i];
    var ruta = cfg.dir + nombre + ".png";
    if (!files.exists(ruta)) {
      var rutaJpg = cfg.dir + nombre + ".jpg";
      if (!files.exists(rutaJpg)) continue;
      ruta = rutaJpg;
    }
    var tpl = images.read(ruta);
    if (!tpl) continue;
    var hit = buscarImagenEscalada(screen, tpl, cfg.threshold);
    tpl.recycle();
    if (hit) return { x: hit.x, y: hit.y, name: nombre };
  }
  return null;
}

function encontrarPuntosPlantilla(screen, tplPath, threshold) {
  var puntos = [];
  if (!screen || !tplPath || !files.exists(tplPath)) return puntos;
  var tpl = images.read(tplPath);
  if (!tpl) return puntos;

  try {
    var matches = images.matchTemplate(screen, tpl, {
      threshold: Math.max(0.50, threshold),
      level: 1
    });
    if (matches && matches.matches) {
      var raw = matches.matches;
      for (var i = 0; i < raw.length; i++) {
        var m = raw[i];
        var cx = m.point.x + Math.floor(tpl.getWidth() / 2);
        var cy = m.point.y + Math.floor(tpl.getHeight() / 2);
        var repetido = false;
        for (var j = 0; j < puntos.length; j++) {
          var dx = puntos[j].x - cx;
          var dy = puntos[j].y - cy;
          if (Math.sqrt(dx * dx + dy * dy) < 42) {
            repetido = true;
            break;
          }
        }
        if (!repetido) {
          puntos.push({ x: cx, y: cy });
        }
      }
    }
  } catch (e) {
    var single = buscarImagenEscalada(screen, tpl, threshold);
    if (single) puntos.push({ x: single.x, y: single.y });
  }

  tpl.recycle();
  puntos.sort(function (a, b) {
    if (Math.abs(a.y - b.y) > 45) return a.y - b.y;
    return a.x - b.x;
  });
  return puntos;
}

function capturarIconoRanuraAlchemy(cfg) {
  try {
    var screen = captureScreen();
    if (!screen) return false;

    var half = Math.floor(ALCHEMY_ITEM_SLOT.size / 2);
    var left = Math.max(0, ALCHEMY_ITEM_SLOT.x - half);
    var top = Math.max(0, ALCHEMY_ITEM_SLOT.y - half);
    var w = Math.min(screen.getWidth() - left, ALCHEMY_ITEM_SLOT.size);
    var h = Math.min(screen.getHeight() - top, ALCHEMY_ITEM_SLOT.size);

    if (w < 16 || h < 16) return false;
    var clip = images.clip(screen, left, top, w, h);
    if (!clip) return false;

    images.save(clip, cfg.dir + "item_auto.png", "png", 100);
    clip.recycle();
    return true;
  } catch (e) {
    return false;
  }
}

function detectarPlusActualEnPantalla(screen, cfg) {
  for (var n = 15; n >= 0; n--) {
    var rutaPng = cfg.dir + "plus_" + n + ".png";
    var rutaJpg = cfg.dir + "plus_" + n + ".jpg";
    var ruta = files.exists(rutaPng) ? rutaPng : (files.exists(rutaJpg) ? rutaJpg : null);
    if (!ruta) continue;
    var tpl = images.read(ruta);
    if (!tpl) continue;
    var hit = buscarImagenEscalada(screen, tpl, cfg.threshold);
    tpl.recycle();
    if (hit) return "+" + n;
  }

  if (buscarEnCaptura(screen, cfg, ["plus_0_1", "estado_plus_0"])) {
    return "+0";
  }

  return "+0";
}

function detectarNombreItemEnPantalla(screen, cfg) {
  var etiquetaManual = String(prefs.get("itemName", "") || "").trim();
  if (etiquetaManual) return etiquetaManual;
  return statsSesion.itemDetectado || "Auriga Elegant Staff";
}

function escanearItensYConstruirCola(cfg, mostrarToast) {
  capturarIconoRanuraAlchemy(cfg);
  try {
    var screen = captureScreen();
    if (!screen) return;

    var nombreDet = detectarNombreItemEnPantalla(screen, cfg);
    var plusAct = detectarPlusActualEnPantalla(screen, cfg);

    var rutaAuto = cfg.dir + "item_auto.png";
    var rutaItems = cfg.dir + "items.png";
    var puntos = [];

    if (files.exists(rutaAuto)) {
      puntos = encontrarPuntosPlantilla(screen, rutaAuto, cfg.threshold);
    }
    if (puntos.length === 0 && files.exists(rutaItems)) {
      puntos = encontrarPuntosPlantilla(screen, rutaItems, cfg.threshold);
    }

    var metasPrevias = {};
    for (var prev = 0; prev < colaItensDetec.length; prev++) {
      metasPrevias[prev] = {
        selected: colaItensDetec[prev].selected,
        plusObjetivo: colaItensDetec[prev].plusObjetivo,
        metaNumero: colaItensDetec[prev].metaNumero
      };
    }

    var nuevaCola = [];
    var totalSlots = Math.max(puntos.length, 1);
    for (var i = 0; i < totalSlots; i++) {
      var pt = puntos[i] || { x: ALCHEMY_ITEM_SLOT.x, y: ALCHEMY_ITEM_SLOT.y };
      var ant = metasPrevias[i];
      var defaultPlus = ant ? ant.plusObjetivo : cfg.plusTexto;
      var defaultNum = ant ? ant.metaNumero : cfg.plusNumero;
      var defaultSel = ant ? ant.selected : true;

      nuevaCola.push({
        id: i + 1,
        nombre: nombreDet,
        plusActual: i === 0 ? plusAct : "+0",
        plusObjetivo: defaultPlus,
        metaNumero: defaultNum,
        selected: defaultSel,
        x: pt.x,
        y: pt.y,
        terminado: false
      });
    }

    colaItensDetec = nuevaCola;
    actualizarInfoItemDetalladaUI(nombreDet, plusAct, colaItensDetec.length);
    renderizarListaItensDetecUI();
    setEstado(statsSesion.descripcionItem + " | En cola: " + colaItensDetec.length);
    agregarLog("Escaneo -> " + statsSesion.descripcionItem + " | Ítems detectados: " + colaItensDetec.length);

    if (mostrarToast) {
      toast("Detectados: " + colaItensDetec.length + " (" + nombreDet + ")");
    }
  } catch (e) {
    agregarLog("Error al escanear ítems: " + e.message);
  }
}

function seleccionarSiguienteItemEnCola(cfg) {
  while (indiceItemActual < colaItensDetec.length) {
    var item = colaItensDetec[indiceItemActual];
    if (item && item.selected && !item.terminado) {
      if (item.x && item.y && (Math.abs(item.x - ALCHEMY_ITEM_SLOT.x) > 15 || Math.abs(item.y - ALCHEMY_ITEM_SLOT.y) > 15)) {
        tapPunto(item.x, item.y, cfg.delayTap);
      }
      actualizarInfoItemDetalladaUI(item.nombre, item.plusActual, colaItensDetec.length);
      agregarLog("Trabajando ítem #" + item.id + " (" + item.nombre + " " + item.plusActual + ") -> Meta: +" + item.metaNumero);
      return item;
    }
    indiceItemActual++;
  }
  return null;
}

function buscarYTocarTextoUI(palabrasClave, delayTap) {
  try {
    for (var i = 0; i < palabrasClave.length; i++) {
      var w = textContains(palabrasClave[i]).findOnce() || descContains(palabrasClave[i]).findOnce();
      if (w) {
        var b = w.bounds();
        if (b && b.width() > 0 && b.height() > 0) {
          tapPunto(b.centerX(), b.centerY(), delayTap);
          return true;
        }
      }
    }
  } catch (e) {}
  return false;
}

function detectarYTocar(cfg, nombresCandidatos, etiqueta, delayTap) {
  esperarSiPausado();
  if (!running || !alchemyActiva) return false;

  try {
    var screen = captureScreen();
    var hit = buscarEnCaptura(screen, cfg, nombresCandidatos);
    if (!hit) return false;
    tapPunto(hit.x, hit.y, delayTap);
    return true;
  } catch (e) {
    agregarLog("Error buscando " + etiqueta + ": " + e.message);
    return false;
  }
}

function abrirMenuYTocarAlchemy(cfg) {
  setEstado("Buscando botón de menú en juego...");
  var tocoMenu = detectarYTocar(cfg, ["menu", "Menu", "btn_menu"], "menu.png", cfg.delayTap);
  if (tocoMenu) {
    agregarLog("Menú tocado, esperando opciones...");
    sleep(800);
  } else {
    agregarLog("No se encontró menu.png, intentando tocar botón Alchemy directamente...");
  }

  setEstado("Buscando botón Alchemy...");
  var tocoAlchemy = detectarYTocar(cfg, ["alchemy", "Alchemy", "btn_alchemy"], "alchemy.png", cfg.delayTap);
  if (!tocoAlchemy) {
    tocoAlchemy = buscarYTocarTextoUI(["Alchemy", "ALCHEMY"], cfg.delayTap);
  }
  if (tocoAlchemy) {
    agregarLog("Botón Alchemy tocado");
    sleep(900);
    return true;
  }
  return false;
}

function revisarEstadoVisual(cfg, metaNumeroActual, esPostIntento) {
  try {
    var screen = captureScreen();
    if (!screen) return { metaAlcanzada: false, nombreConfig: "", roto: false, sinElixir: false };

    var candidatosMeta = ["plus_" + metaNumeroActual, "target"];
    var metaMatch = buscarEnCaptura(screen, cfg, candidatosMeta);
    var rotoMatch = esPostIntento ? buscarEnCaptura(screen, cfg, ["broken"]) : null;
    var sinElixirMatch = esPostIntento ? buscarEnCaptura(screen, cfg, ["sin_elixir"]) : null;

    return {
      metaAlcanzada: metaMatch != null,
      nombreConfig: metaMatch ? (metaMatch.name + ".png") : "",
      roto: rotoMatch != null,
      sinElixir: sinElixirMatch != null
    };
  } catch (e) {
    return { metaAlcanzada: false, nombreConfig: "", roto: false, sinElixir: false };
  }
}

function detenerSoloAlchemy(motivo) {
  alchemyActiva = false;
  paused = false;
  setEstado(motivo + " (Alchemy detenida; otras funciones siguen)");
  agregarLog("ALCHEMY DETENIDA: " + motivo);
  toast(motivo);
  try { device.vibrate(400); } catch (e) {}
}

function detenerMacro(motivo) {
  running = false;
  alchemyActiva = false;
  paused = false;
  cerrarFlotante();
  setEstado(motivo);
  agregarLog("FIN: " + motivo);
  toast(motivo);
  try { device.vibrate(500); } catch (e) {}
}

function buscarYTocarConPaginas(cfg, candidatos, etiqueta) {
  if (!alchemyActiva) return false;
  if (detectarYTocar(cfg, candidatos, etiqueta, cfg.delayTap)) return true;

  var paginas = ["page_3", "page_1", "page_2"];
  for (var i = 0; i < paginas.length && running && alchemyActiva; i++) {
    esperarSiPausado();
    if (!running || !alchemyActiva) return false;

    var cambioPagina = detectarYTocar(cfg, [paginas[i]], paginas[i], cfg.delayTap);
    if (cambioPagina) {
      sleep(350);
      if (detectarYTocar(cfg, candidatos, etiqueta + " (" + paginas[i] + ")", cfg.delayTap)) {
        return true;
      }
    }
  }
  return false;
}

function ejecutarEventos(cfg) {
  var fichaPj = formatearSoloDetectado(statsSesion.personaje, statsSesion.nivel);
  agregarLog("Registro automático Guild Boss (" + cfg.evHora + ") | " + fichaPj);
  mostrarFlotante("Guild Boss (" + cfg.evHora + ")", fichaPj);
  setEstado("Preparando Eventos...");

  for (var ciclo = 1; ciclo <= cfg.evCycles && running; ciclo++) {
    esperarSiPausado();
    if (!running) return;

    statsSesion.intentos = ciclo;
    var accionHecha = detectarYTocar(
      cfg,
      ["event_register", "event_claim", "event_icon"],
      "registro guild boss",
      cfg.delayTap
    );

    if (!accionHecha) {
      accionHecha = buscarYTocarTextoUI(["Register", "Registrar", "Join", "Guild Boss"], cfg.delayTap);
    }

    if (accionHecha) {
      agregarLog("Guild Boss registro #" + ciclo + " enviado");
    } else {
      statsSesion.fallos++;
      agregarLog("Guild Boss registro #" + ciclo + " falló en pantalla");
    }

    setEstado("Guild Boss registro #" + ciclo + "/" + cfg.evCycles);
    sleep(cfg.evWait);
  }

  if (running) {
    setEstado("Registro de Guild Boss completado");
    agregarLog("Registro de Guild Boss completado");
  }
}

function obtenerCandidatosElixir(elixirKey) {
  if (elixirKey === "accessory") return ["elixir_acceaorio"];
  return ["elixir_" + elixirKey];
}

function obtenerCandidatosLucky(luckyDegree) {
  return ["Lucky_Power_" + luckyDegree];
}

function ejecutarAlchemy(cfg) {
  agregarLog("Inicio ALCHEMY -> Elixir: " + cfg.elixirLabel + (cfg.useLucky ? " | Lucky: " + cfg.luckyDegree : " | Sin Lucky"));

  var elixirRest = cfg.elixirQty;
  var luckyRest = cfg.luckyQty;

  var candidatosElixir = obtenerCandidatosElixir(cfg.elixirKey);
  var candidatosLucky = obtenerCandidatosLucky(cfg.luckyDegree);

  mostrarFlotante(statsSesion.descripcionItem, formatearSoloDetectado(statsSesion.personaje, statsSesion.nivel));
  esperarSiPausado();
  if (!running || !alchemyActiva) return;

  escanearItensYConstruirCola(cfg, false);
  indiceItemActual = 0;

  var itemActivo = seleccionarSiguienteItemEnCola(cfg);
  if (!itemActivo) {
    statsSesion.metaAlcanzada = true;
    detenerSoloAlchemy("No hay ítems marcados para Alchemy");
    return;
  }

  for (var intento = 1; intento <= cfg.maxTries && running && alchemyActiva; intento++) {
    esperarSiPausado();
    if (!running || !alchemyActiva) return;

    itemActivo = seleccionarSiguienteItemEnCola(cfg);
    if (!itemActivo) {
      statsSesion.metaAlcanzada = true;
      detenerSoloAlchemy("Todos los ítems marcados completaron su + o se rompieron");
      return;
    }

    if (elixirRest <= 0) {
      statsSesion.sinElixir = true;
      detenerSoloAlchemy("Sin elixires disponibles (0)");
      return;
    }
    if (cfg.useLucky && luckyRest <= 0) {
      statsSesion.sinLucky = true;
      detenerSoloAlchemy("Sin Lucky " + cfg.luckyDegree + " (0)");
      return;
    }

    var metaActualItem = itemActivo.metaNumero || cfg.plusNumero;
    var metaTextoItem = itemActivo.plusObjetivo || ("+" + metaActualItem);

    var pre = revisarEstadoVisual(cfg, metaActualItem, false);
    if (pre.metaAlcanzada) {
      itemActivo.terminado = true;
      itemActivo.plusActual = metaTextoItem;
      actualizarInfoItemDetalladaUI(itemActivo.nombre, metaTextoItem, colaItensDetec.length);
      renderizarListaItensDetecUI();
      agregarLog("Ítem #" + itemActivo.id + " ya está en " + metaTextoItem + "; pasando al siguiente.");
      indiceItemActual++;
      continue;
    }

    var elixirOk = buscarYTocarConPaginas(cfg, candidatosElixir, "elixir");
    if (!elixirOk) {
      statsSesion.sinElixir = true;
      detenerSoloAlchemy("No se detectó " + cfg.elixirLabel + " en pantalla");
      return;
    }
    elixirRest--;

    if (cfg.useLucky) {
      var luckyOk = buscarYTocarConPaginas(cfg, candidatosLucky, "lucky " + cfg.luckyDegree);
      if (!luckyOk) {
        statsSesion.sinLucky = true;
        detenerSoloAlchemy("No se detectó Lucky " + cfg.luckyDegree + " en pantalla");
        return;
      }
      luckyRest--;
    }

    actualizarContadoresUI(elixirRest, luckyRest);

    var fuseTocado = detectarYTocar(cfg, ["Fuse", "fuse"], "Fuse.png", cfg.delayTap);
    if (!fuseTocado) {
      detenerSoloAlchemy("No se encontró Fuse.png en la ventana");
      return;
    }

    if (cfg.useConfirm) {
      detectarYTocar(cfg, ["confirm", "ok", "btn_confirm"], "confirmar", cfg.delayTap);
    }

    statsSesion.intentos = intento;
    setEstado("Ítem #" + itemActivo.id + " (" + itemActivo.nombre + " -> " + metaTextoItem + ") #" + intento + " E:" + elixirRest + (cfg.useLucky ? " L:" + luckyRest : ""));
    sleep(cfg.delayRes);

    var post = revisarEstadoVisual(cfg, metaActualItem, true);
    if (post.metaAlcanzada) {
      itemActivo.terminado = true;
      itemActivo.plusActual = metaTextoItem;
      actualizarInfoItemDetalladaUI(itemActivo.nombre, metaTextoItem, colaItensDetec.length);
      renderizarListaItensDetecUI();
      agregarLog("Ítem #" + itemActivo.id + " alcanzó " + metaTextoItem + " (" + post.nombreConfig + "); pasando al siguiente.");
      indiceItemActual++;
      continue;
    }

    if (post.roto) {
      itemActivo.terminado = true;
      statsSesion.roto = true;
      statsSesion.fallos++;
      renderizarListaItensDetecUI();
      agregarLog("Ítem #" + itemActivo.id + " se rompió en intento #" + intento + "; pasando al siguiente.");
      indiceItemActual++;
      continue;
    }

    if (post.sinElixir) {
      statsSesion.sinElixir = true;
      detenerSoloAlchemy("Sin elixires suficientes en el juego");
      return;
    }

    statsSesion.fallos++;
    agregarLog("Intento #" + intento + " | Ítem #" + itemActivo.id + " (" + itemActivo.nombre + ") no llegó a " + metaTextoItem + " (Fallos: " + statsSesion.fallos + ")");
  }

  if (running && alchemyActiva) {
    detenerSoloAlchemy("Límite de " + cfg.maxTries + " intentos alcanzado");
  }
}

function ejecutarBucle(cfg) {
  reiniciarStats(cfg.modo);
  if (!prepararEntornoYPermisos(cfg)) return;

  if (cfg.modo === "Eventos") {
    esperarCuentaEnJuego(cfg);
    ejecutarEventos(cfg);
  } else {
    ejecutarAlchemy(cfg);
  }
}

mostrarVistaAlchemy();
iniciarRelojContador();

events.observeKey();
events.onKeyDown("volume_down", function () {
  if (running) detenerMacro("Detenido con botón Volumen Abajo");
});

events.on("exit", function () {
  running = false;
  alchemyActiva = false;
  cerrarFlotante();
});

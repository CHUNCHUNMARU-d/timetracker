# Guía del Operador · Cronometraje de Carreras

Esta guía es para la persona que va a usar el sistema el día de la carrera.
No necesitas saber nada de programación. Solo seguir los pasos.

---

## 1. ¿Qué es esto?

Es un programa para tomar el tiempo de carreras (triatlones, duatlones,
carreras). Funciona en cualquier laptop con un navegador web (Chrome,
Firefox, Edge). **No necesita internet el día de la carrera** — todo se
guarda en la misma laptop.

---

## 2. Lo que necesitas el día de la carrera

| Cosa | ¿Para qué? |
|------|------------|
| **Una laptop cargada** | Donde corre el programa. |
| **Cargador + extensión** | Por si la batería se acaba. |
| **Un lector de códigos** (opcional) | Para escanear dorsales más rápido. Sirve cualquier lector de código de barras o QR que se conecte por **Bluetooth o USB** y que funcione como un teclado (la mayoría lo hacen). |
| **Un segundo monitor o pantalla** (opcional) | Para mostrar resultados al público. |

> No necesitas wifi ni señal de celular. El programa funciona aunque no
> haya internet en la zona.

---

## 3. Antes de la carrera — preparar el evento

### Paso 1 · Abrir el programa

1. Prende la laptop.
2. Abre el navegador (Chrome, Firefox o Edge).
3. Ve a la dirección del programa (la persona que lo instaló te dirá cuál).
4. Vas a ver la pantalla **Inicio** con la lista de eventos.

### Paso 2 · Crear el evento

1. Haz clic en **➕ Nuevo evento**.
2. Llena los datos: nombre, fecha, lugar, tipo de carrera.
3. Guarda.

### Paso 3 · Agregar categorías

Las categorías son los grupos en los que compiten los atletas (Élite,
Sub‑23, Veteranos, etc).

1. Dentro del evento, ve a la sección de **Categorías**.
2. Agrega cada categoría con su nombre.

> **Importante:** Necesitas al menos **una categoría** antes de iniciar
> la carrera, o el programa no te dejará empezar.

### Paso 4 · Agregar atletas

Tienes dos opciones:

**Opción A — Uno por uno**

- Haz clic en **➕ Atleta** y llena los datos: dorsal, nombre, apellido,
  categoría.

**Opción B — Cargar desde Excel/CSV** (más rápido si son muchos)

1. Prepara un archivo CSV con las columnas:
   `dorsal, nombre, apellido, genero, categoria` (y opcionalmente más).
2. Haz clic en **📂 Importar CSV** y elige el archivo.
3. El programa te avisará si hay dorsales duplicados antes de guardar.

> **Importante:** Necesitas al menos **un atleta** antes de iniciar la
> carrera.

---

## 4. El día de la carrera — tomando tiempos

### Paso 1 · Conectar el lector (si tienes uno)

- **Lector USB:** conéctalo a la laptop. Listo, ya funciona.
- **Lector Bluetooth:** enciéndelo y pídele a la laptop que lo conecte
  como teclado (Configuración → Bluetooth → Agregar dispositivo).

> Para probar el lector: abre cualquier campo de texto y escanea un
> código. Si los números aparecen, está bien conectado.

### Paso 2 · Abrir la ventana de cronometraje

1. Entra al evento que vas a correr.
2. Haz clic en **▶ Cronometraje**.
3. La pantalla mostrará el botón **🚀 Iniciar carrera** y el reloj en
   ceros.

### Paso 3 · Iniciar la carrera

Cuando suene el disparo (o cuando empiecen a correr):

- Haz clic en **🚀 Iniciar carrera**.
- El reloj empieza a correr. Ya no se puede detener (solo pausar o
  terminar).

### Paso 4 · Registrar llegadas

Conforme van llegando los atletas a la meta:

**Con lector:**
- Apunta al dorsal del atleta y dispara el lector. Se registra solo.

**Sin lector (a mano):**
- Escribe el número del dorsal en el cuadro grande y presiona **Enter**
  (o el botón **✓ Registrar llegada**).

Cada vez que registras un dorsal verás un mensaje verde con el nombre
del atleta y su tiempo. Si el dorsal **no está en la lista de atletas**,
también se guarda, pero con un aviso amarillo de "no listado" — corrígelo
después de la carrera.

### Paso 5 (NUEVO) · Ventana de escaneo dedicada

Si no quieres tener la pantalla de cronometraje siempre al frente,
puedes abrir una **ventana separada solo para escanear**:

1. En la barra superior de la pantalla de cronometraje, haz clic en
   **🎯 Escaneo**.
2. Se abre una pestaña nueva con un cuadro grande para los dorsales.
3. Pon esa pestaña al frente. El lector escribe ahí.
4. **La otra pestaña (la principal)** puede quedarse mostrando resultados,
   o lo que quieras.
5. Si la pestaña de escaneo pierde el foco (por ejemplo, hiciste clic en
   otra parte), haz clic en cualquier zona vacía de la página y el
   cursor vuelve solo al cuadro de dorsales.

> Las dos pestañas comparten los datos automáticamente. Lo que escaneas
> en una aparece en la otra al instante.

### Paso 6 · Pausar (si pasa algo)

Si tienes que parar la carrera temporalmente (un atleta lesionado, un
problema en la pista):

1. Haz clic en **⏸ Pausar**.
2. Confirma. El reloj se congela.
3. Mientras está pausado **no se pueden registrar llegadas**.
4. Cuando todo esté arreglado, haz clic en **▶ Reanudar**.

> El tiempo que la carrera estuvo pausada se descuenta del tiempo final
> de cada atleta. No hay que hacer nada manual.

### Paso 7 · Pantalla para el público (opcional)

Si tienes un segundo monitor o una TV conectada:

1. En la barra superior, haz clic en **📺 Pantalla**.
2. Se abre una nueva ventana con los resultados actualizados en vivo,
   sin botones de operador (modo solo lectura, para proyectar).
3. Arrastra esa ventana al segundo monitor y ponla en pantalla completa
   (tecla `F11`).

### Paso 8 · Terminar la carrera

Cuando ya llegaron todos (o cuando decidas cerrar):

1. Haz clic en **⏹ Terminar**.
2. El programa te pide confirmar — haz clic en **DETENER CARRERA**.
3. El reloj se congela en el tiempo final.
4. Después de esto **ya no se pueden registrar más llegadas**. Solo se
   pueden editar tiempos.

---

## 5. Después de la carrera — resultados

### Ver y revisar resultados

1. Desde el evento, haz clic en **📊 Resultados**.
2. Verás la lista ordenada por tiempo, con lugar general y por categoría.
3. Puedes filtrar por categoría usando las pestañas de arriba.

### Editar un tiempo (si te equivocaste)

1. En la lista de llegadas, pasa el cursor sobre la fila del atleta.
2. Haz clic en el icono ✏️.
3. Cambia el tiempo y escribe el motivo de la corrección.
4. Guarda. El tiempo queda marcado como "editado" para que se sepa.

### Exportar resultados

- **PDF para imprimir:** botón **📄 Exportar PDF**.
- **Excel/CSV:** botón **📊 Exportar CSV** (también funciona JSON si te
  lo piden).
- **WhatsApp individual:** en la lista de resultados, cada atleta tiene
  un botón de compartir que abre WhatsApp con su tiempo listo para enviar.

---

## 6. Problemas comunes

| Lo que pasa | Qué hacer |
|-------------|-----------|
| **El lector no escribe nada** | Revisa que esté conectado (USB o Bluetooth). Asegúrate de que el cuadro de dorsales esté seleccionado (verás el cursor parpadeando ahí). |
| **El programa dice "Dorsal ya registrado"** | El atleta ya pasó la meta. Si fue un error, ve a editarlo en la lista. |
| **El programa dice "Falta: ≥1 atleta y ≥1 categoría"** | Aún no has cargado atletas o no creaste categorías. Vuelve al paso 3 y 4. |
| **El programa dice "Carrera en pausa"** | Está pausada. Haz clic en **▶ Reanudar**. |
| **Se cerró la pestaña del navegador por accidente** | No pasa nada. Vuelve a abrir el navegador en la misma dirección. Todos los tiempos están guardados en la laptop. |
| **Se acabó la batería de la laptop** | Conéctala. Cuando prenda otra vez, abre el navegador en la misma dirección y todo va a estar como lo dejaste. |
| **El reloj se ve diferente entre las dos pestañas** | Refresca (`F5`) la pestaña que se vea mal. Los datos están sincronizados; solo la vista necesita actualizarse. |
| **No aparece el nombre del atleta cuando escaneo** | El dorsal no está en la lista. Se guardó como "no listado" — al terminar, edita ese registro o agrega al atleta y vuelve a asociar. |

---

## 7. Reglas importantes (no las rompas)

1. **No cierres la laptop durante la carrera.** Mantenla abierta y
   conectada a la corriente.
2. **No instales actualizaciones de Windows / del navegador** justo
   antes o durante el evento.
3. **No borres el historial del navegador** durante la carrera —
   ahí están guardados los tiempos hasta exportarlos.
4. **Exporta los resultados** (PDF y CSV) **antes de cerrar todo**.
   Es tu respaldo.
5. **Antes del evento, haz una prueba completa** con 3 o 4 dorsales
   falsos para familiarizarte con los botones.

---

## 8. Atajos útiles del teclado

| Tecla | Qué hace |
|-------|----------|
| `Enter` | Registrar el dorsal escrito en el cuadro |
| `Tab` | Mover el cursor (úsalo solo si sabes lo que haces) |
| `F5` | Refrescar la página si algo se ve raro |
| `F11` | Pantalla completa (útil para la pantalla del público) |

---

## 9. Si algo se rompe en pleno evento

**Lo más importante:** los tiempos ya registrados **están guardados** en
la laptop. No se pierden aunque cierres la pestaña o se trabe el
navegador.

Pasos en orden:

1. Toma una foto de la pantalla (por si acaso).
2. Refresca con `F5`.
3. Si no funciona, cierra el navegador y vuelve a abrirlo en la misma
   dirección.
4. Si tampoco, reinicia la laptop. Cuando prenda, abre el navegador
   en la misma dirección. Vas a ver todo como lo dejaste.
5. Si nada funciona, llama a quien instaló el sistema.

Mientras tanto, **apunta los dorsales y la hora exacta en papel**.
Después se pueden meter a mano editando tiempos.

---

## 10. Glosario rápido

- **Dorsal:** el número que lleva pegado el atleta.
- **Categoría:** el grupo de competencia (Élite, Sub‑23, etc).
- **Ola:** un grupo que arranca a una hora distinta (en triatlones
  grandes). Si tu carrera arranca todos al mismo tiempo, ignora esta
  palabra.
- **Tiempo neto:** el tiempo que tardó el atleta en correr (la hora de
  llegada menos la hora de inicio, menos pausas).
- **Pantalla:** la ventana de solo lectura para mostrar al público.
- **Cronometraje:** la pantalla del operador con los botones para
  tomar tiempos.
- **Escaneo:** la ventana dedicada al lector de códigos (la nueva).

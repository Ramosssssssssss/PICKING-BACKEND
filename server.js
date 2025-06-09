const express = require('express');
const PDFDocument = require('pdfkit');

const cors = require('cors');
const bodyParser = require('body-parser');
const Firebird = require('node-firebird');

const {
    fileTypeFromBuffer
} = require('file-type');

const app = express();
const PORT = 3051;

app.use(cors({
    origin: '*',
    methods: ['GET', 'POST'],
}));
app.use(bodyParser.json());

const firebirdConfig = {
    host: '85.215.109.213',
    port: 3050,
    database: 'D:\\Microsip datos\\GUIMAR.FDB',
    // database: 'D:\\Microsip datos\\GUIMARTEST.FDB',
    user: 'SYSDBA',
    password: 'BlueMamut$23',
    lowercase_keys: false,
    role: null,
    pageSize: 4096,
    timelife: 60000,
};

function readBlob(blob) {
    return new Promise((resolve, reject) => {
        if (!blob) return resolve(null);

        const chunks = [];
        blob((err, name, eventEmitter) => {
            if (err || !eventEmitter) return reject(err || new Error("No blob stream"));

            eventEmitter.on('data', chunk => chunks.push(chunk));
            eventEmitter.on('end', () => resolve(Buffer.concat(chunks)));
            eventEmitter.on('error', err => reject(err));
        });
    });
}

function dbQuery(db, sql, params = []) {
    return new Promise((resolve, reject) => {
        db.query(sql, params, (err, result) => {
            if (err) reject(err);
            else resolve(result);
        });
    });
}

function obtenerRangoSemanal() {
    const hoy = new Date();
    const diaSemana = hoy.getDay();

    const diasDesdeViernes = (diaSemana + 7 - 5) % 7;
    const viernes = new Date(hoy);
    viernes.setDate(hoy.getDate() - diasDesdeViernes);

    const jueves = new Date(viernes);
    jueves.setDate(viernes.getDate() + 6);

    const formato = (fecha) => {
        const mm = String(fecha.getMonth() + 1).padStart(2, '0');
        const dd = String(fecha.getDate()).padStart(2, '0');
        const yyyy = fecha.getFullYear();
        return `${mm}/${dd}/${yyyy}`;
    };

    return {
        fechaInicio: formato(viernes),
        fechaFin: formato(jueves),
    };
}
const COLABORADORES_POR_AREA = {
    ALMACEN: [{ nombre: "Uriel Fuentes Negrete", telefono: "5215580081079" }],

    B2G: [{
        nombre: "José Eduardo Trejo Aguilar",
        telefono: "5215580409415"
    },
    {
        nombre: "Isidro Correa Rosales",
        telefono: "5215580058192"
    }
    ],

    CEDIS: [{
        nombre: "Uriel Fuentes Negrete",
        telefono: "5215580081079"
    }],
    COMERCIAL: [{
        nombre: "Ivonne Espejel Navarro",
        telefono: "5215515292038"
    }],
    COMEX: [{
        nombre: "Raul Hernandez",
        telefono: "5215525154668"
    },
    {
        nombre: "Erik Ramos",
        telefono: "5215513849706"
    },
    {
        nombre: "Luis Rodrigo Urrutia Parra",
        telefono: "5215580058190"
    },
    {
        nombre: "Sergio Moncayo Arcos",
        telefono: "5215580058194"
    },
    {
        nombre: "Comex Tepexpan",
        telefono: "5215579079466"
    },
    ],
    CONTABILIDAD: [{
        nombre: "Midory Elizabeth Cantellan Barrales",
        telefono: "5215519186598"
    },
    {
        nombre: "Yanci Vargas",
        telefono: "5215619885095"
    },
    {
        nombre: "Luis Fernando Cruz Hernandez",
        telefono: "521580058183"
    },
    {
        nombre: "Jose De Jesus Cortes Badillo",
        telefono: "5215639602729"
    },
    {
        nombre: "Ignacio Tovar Garfias",
        telefono: "5215562541648"
    },
    ],
    CxC: [{
        nombre: "Jose Luis Lievano Hernandez",
        telefono: "5215515292079"
    },
    {
        nombre: "Samuel Jimenez",
        telefono: "5215571862205"
    },
    {
        nombre: "Estephanie Anguiano Castillo",
        telefono: "5215551993949"
    },
    ],
    DESARROLLO: [{
        nombre: "Anahi Jasmin Bautista Gomez",
        telefono: "5215537571252"
    },
    {
        nombre: "Teresa Dominguez",
        telefono: "5215511403981"
    },
    {
        nombre: "Luis Daniel Luna Hernandez",
        telefono: "5215610204718"
    },
    {
        nombre: "Joaquin Chacon",
        telefono: "5215581010843"
    },
    {
        nombre: "Evelin Huerta Ocana",
        telefono: "5215580274770"
    },
    ],
    DIRECCIÓN: [{
        nombre: "Jeroboam Sanchez Lopez",
        telefono: "5215526536608"
    },
    {
        nombre: "Guillermo Sanchez",
        telefono: "5215580059964"
    },
    ],
    FLOTILLA: [{
        nombre: "Carlos Caballero",
        telefono: "5215514452510"
    }],
    INVENTARIOS: [{
        nombre: "Miguel Angel Tolentino Pedraza",
        telefono: "5215580058187"
    },
    {
        nombre: "Hector Ramirez",
        telefono: "5215580409314"
    },
    ],
    MANTENIMIENTO: [{
        nombre: "Samuel Martinez",
        telefono: "5215575611800"
    },
    {
        nombre: "Luis Angel Castellanos Vigueras",
        telefono: "5215515648223"
    },
    {
        nombre: "Miguel Angel Coronel Calvo",
        telefono: "5215618569222"
    },
    ],
    MAYORISTA: [{
        nombre: "Susana Lazcano Campos",
        telefono: "5215545100424"
    },
    {
        nombre: "Uriel Torres",
        telefono: "5215554015539"
    },
    {
        nombre: "J Mercedes Serrano Moreno",
        telefono: "5215579213456"
    },
    ],
    MERCADOTECNIA: [{
        nombre: "Ruth Rebeca Fernandez Montoya",
        telefono: "5215576338433"
    },
    {
        nombre: "Rubi Tovar",
        telefono: "5215951096570"
    },
    {
        nombre: "Javier Hernandez Castillo",
        telefono: "5215529637383"
    },
    ],
    PDS: [{
        nombre: "Marisol Vazquez Gallardo",
        telefono: "5215519099986"
    },
    {
        nombre: "Paola Vazquez",
        telefono: "52155807076"
    },
    {
        nombre: "Norma Espinoza Rojas",
        telefono: "5215619885100"
    },
    {
        nombre: "Auric Saul Morales Hernandez",
        telefono: "5215662207015"
    },
    {
        nombre: "Marco Jonathan Osorio De La Cruz",
        telefono: "5215563333115"
    },

    ],
    PROGRAMACIÓN: [{
        nombre: "Jorge Alfredo Jones Spindola",
        telefono: "5215534161524"
    },
    {
        nombre: "Celeste Guadalupe Zenteno Roldan",
        telefono: "5215560410509"
    },
    {
        nombre: "Daniel Garcia",
        telefono: "5215637803290"
    },
    {
        nombre: "Jonathan Noe Gallardo Villegas",
        telefono: "5215641138710"
    },
    {
        nombre: "Diego Mauricio Ramos Cordova",
        telefono: "5215665596672"
    },
    ],
    RETAIL: [{
        nombre: "Jennifer Salazar Salamanca",
        telefono: "5215544788591"
    },
    {
        nombre: "Maria Guadalupe Contreras Cruz",
        telefono: "5215566773395"
    },
    {
        nombre: "Arandi Ramirez",
        telefono: "5215569720764"
    },
    ],
    SEGURIDAD: [{
        nombre: "C B",
        telefono: "5215625595483"
    },
    {
        nombre: "Cerevro DFR",
        telefono: "5215612660130"
    },
    {
        nombre: "C A",
        telefono: "5215625595483"
    },
    ],
    SAC: [{
        nombre: "Sheilin Calete",
        telefono: "5215563228516"
    },],
    SISTEMAS: [{
        nombre: "Ivan Rios",
        telefono: "5215518497251"
    },
    {
        nombre: "Isaac Cortes",
        telefono: "5215547644716"
    },
    ],

};
//SEGURIDAD
app.post('/login-seguridad', (req, res) => {
    const {
        usuario,
        contrasena
    } = req.body;

    if (!usuario || !contrasena) {
        return res.status(400).json({
            error: 'Faltan credenciales'
        });
    }

    Firebird.attach(firebirdConfig, (err, db) => {
        if (err) {
            console.error('Error de conexión a Firebird:', err);
            return res.status(500).json({
                error: 'Error de conexión'
            });
        }

        const sql = `SELECT * FROM COLABORADORES WHERE USUARIO = ? AND CLAVE = ?`;

        db.query(sql, [usuario, contrasena], (err, result) => {
            db.detach();

            if (err) {
                console.error('Error en query:', err);
                return res.status(500).json({
                    error: 'Error en consulta'
                });
            }

            if (result.length === 0) {
                return res.status(401).json({
                    error: 'Credenciales inválidas'
                });
            }

            return res.json({
                ok: true,
                colaborador: result[0]
            });
        });
    });
});

//registrar visita para guardias con credencial
app.post('/registrar-visita', (req, res) => {
    const {
        nombre,
        numero_celular,
        motivo,
        area_a_visitar,
        colaborador_a_visitar,
        credencial,
        guardia
    } = req.body;

    if (!nombre || !numero_celular || !motivo || !area_a_visitar || !colaborador_a_visitar || !credencial || !guardia) {
        return res.status(400).json({
            error: 'Faltan datos obligatorios'
        });
    }

    Firebird.attach(firebirdConfig, (err, db) => {
        if (err) {
            console.error('Conexión Firebird fallida:', err);
            return res.status(500).json({
                error: 'Error de conexión'
            });
        }

        const insertQuery = `
      INSERT INTO VISITAS_FYTTSANET 
      (NOMBRE, NUMERO_CELULAR, MOTIVO, AREA_A_VISITAR, COLABORADOR_A_VISITAR, HORA_ENTRADA, FECHA_ENTRADA, CREDENCIAL, ACTIVO, GUARDIA)
      VALUES (UPPER(?), UPPER(?), UPPER(?), UPPER(?), UPPER(?), CURRENT_TIME, CURRENT_DATE, UPPER(?), TRUE, UPPER(?))
    `;

        const params = [
            nombre,
            numero_celular,
            motivo,
            area_a_visitar,
            colaborador_a_visitar,
            credencial,
            guardia
        ];

        db.query(insertQuery, params, (err) => {
            db.detach();

            if (err) {
                console.error('Error al insertar visita:', err);
                return res.status(500).json({
                    error: 'Error al registrar visita'
                });
            }

            const colaboradoresArea = COLABORADORES_POR_AREA[area_a_visitar.toUpperCase()] || [];
            const colaborador = colaboradoresArea.find(
                (c) => c.nombre.toUpperCase() === colaborador_a_visitar.toUpperCase()
            );

            if (!colaborador) {
                console.warn('Colaborador no encontrado para envío de WhatsApp');
                return res.json({
                    ok: true,
                    mensaje: 'Visita registrada. WhatsApp no enviado (colaborador no encontrado)'
                });
            }

            // Preparar datos para WhatsApp
            const whatsappPayload = {
                recipients: colaborador.telefono,
                template_id: 'e5602145-7741-48aa-9b59-26a6bfe559a1',
                contact_type: 'phone',
                from_id: 7857,
                body_vars: [{
                    text: '{{1}}',
                    val: nombre
                }],
                chatbot_status: 'disable',
                conversation_status: 'unchanged'
            };

            fetch('https://api.wasapi.io/prod/api/v1/whatsapp-messages/send-template', {
                method: 'POST',
                headers: {
                    'Authorization': 'Bearer 12724|csP77b05JMVWwjuJw7fKgUxQRmh5RpYxx1sPO4Cw',
                    'Content-Type': 'application/json'
                },
                body: JSON.stringify(whatsappPayload)
            })
                .then(response => response.json())
                .then(data => {
                    console.log('WhatsApp enviado:', data);
                    res.json({
                        ok: true,
                        mensaje: 'Visita registrada y WhatsApp enviado'
                    });
                })
                .catch(error => {
                    console.error('Error al enviar WhatsApp:', error);
                    res.json({
                        ok: true,
                        mensaje: 'Visita registrada. Error al enviar WhatsApp'
                    });
                });
        });
    });
});

//VISITAS ACTIVAS
app.get('/visitas-activas', (req, res) => {
    Firebird.attach(firebirdConfig, (err, db) => {
        if (err) {
            console.error('Conexión Firebird fallida:', err);
            return res.status(500).json({
                error: 'Error de conexión'
            });
        }

        const sql = `
      SELECT 
        VISITA_ID,
        NOMBRE,
        MOTIVO,
        AREA_A_VISITAR AS AREA,
        COLABORADOR_A_VISITAR AS COLABORADOR,
        HORA_ENTRADA,
        FECHA_ENTRADA, GUARDIA
      FROM VISITAS_FYTTSANET
      WHERE ACTIVO = TRUE
      ORDER BY FECHA_ENTRADA DESC, HORA_ENTRADA DESC
    `;

        db.query(sql, (err, result) => {
            db.detach();
            if (err) {
                console.error('Error al consultar visitas activas:', err);
                return res.status(500).json({
                    error: 'Error al obtener visitas'
                });
            }

            return res.json(result);
        });
    });
});
app.post('/marcar-salida-por-credencial', (req, res) => {
    const { credencial, enviar_mensaje = true } = req.body;

    if (!credencial) {
        return res.status(400).json({ error: 'Falta credencial' });
    }

    Firebird.attach(firebirdConfig, (err, db) => {
        if (err) {
            console.error('Conexión Firebird fallida:', err);
            return res.status(500).json({ error: 'Error de conexión' });
        }

        const selectSql = `
            SELECT FIRST 1 NOMBRE, AREA_A_VISITAR, COLABORADOR_A_VISITAR
            FROM VISITAS_FYTTSANET
            WHERE CREDENCIAL = ? AND ACTIVO = TRUE
        `;

        db.query(selectSql, [credencial], (err, result) => {
            if (err || result.length === 0) {
                db.detach();
                console.error('No se pudo obtener visita activa:', err || 'No encontrada');
                return res.status(404).json({ error: 'No se encontró visita activa con esa credencial' });
            }

            const { NOMBRE, AREA_A_VISITAR, COLABORADOR_A_VISITAR } = result[0];

            const updateSql = `
                UPDATE VISITAS_FYTTSANET
                SET ACTIVO = FALSE
                WHERE CREDENCIAL = ? AND ACTIVO = TRUE
            `;

            db.query(updateSql, [credencial], (err) => {
                db.detach();

                if (err) {
                    console.error('Error al marcar salida:', err);
                    return res.status(500).json({ error: 'Error al actualizar la visita' });
                }

                if (!enviar_mensaje) {
                    return res.json({
                        ok: true,
                        mensaje: 'Salida marcada sin WhatsApp (modo silencioso)'
                    });
                }

                const colaboradoresArea = COLABORADORES_POR_AREA[AREA_A_VISITAR.toUpperCase()] || [];
                const colaborador = colaboradoresArea.find(
                    (c) => c.nombre.toUpperCase() === COLABORADOR_A_VISITAR.toUpperCase()
                );

                if (!colaborador) {
                    console.warn('Colaborador no encontrado para WhatsApp');
                    return res.json({
                        ok: true,
                        mensaje: 'Salida marcada. WhatsApp no enviado (colaborador no encontrado)'
                    });
                }

                const whatsappPayload = {
                    recipients: colaborador.telefono,
                    template_id: 'e5602145-7741-48aa-9b59-26a6bfe559a1',
                    contact_type: 'phone',
                    from_id: 7857,
                    body_vars: [{
                        text: '{{1}}',
                        val: NOMBRE
                    }],
                    chatbot_status: 'disable',
                    conversation_status: 'unchanged'
                };

                fetch('https://api.wasapi.io/prod/api/v1/whatsapp-messages/send-template', {
                    method: 'POST',
                    headers: {
                        'Authorization': 'Bearer 12724|csP77b05JMVWwjuJw7fKgUxQRmh5RpYxx1sPO4Cw',
                        'Content-Type': 'application/json'
                    },
                    body: JSON.stringify(whatsappPayload)
                })
                    .then(response => response.json())
                    .then(data => {
                        console.log('WhatsApp de salida enviado:', data);
                        res.json({
                            ok: true,
                            mensaje: 'Salida marcada y WhatsApp enviado'
                        });
                    })
                    .catch(error => {
                        console.error('Error al enviar WhatsApp de salida:', error);
                        res.json({
                            ok: true,
                            mensaje: 'Salida marcada. Error al enviar WhatsApp'
                        });
                    });
            });
        });
    });
});



app.post('/verificar-credencial-activa', (req, res) => {
    const {
        credencial
    } = req.body;

    if (!credencial) {
        return res.status(400).json({
            error: 'Falta credencial'
        });
    }

    Firebird.attach(firebirdConfig, (err, db) => {
        if (err) {
            console.error('Conexión Firebird fallida:', err);
            return res.status(500).json({
                error: 'Error de conexión a la base de datos'
            });
        }

        const sql = `
            SELECT FIRST 1 VISITA_ID, NOMBRE, FECHA_ENTRADA, HORA_ENTRADA
            FROM VISITAS_FYTTSANET
            WHERE CREDENCIAL = ? AND ACTIVO = TRUE
        `;

        db.query(sql, [credencial], (err, result) => {
            db.detach();

            if (err) {
                console.error('Error al verificar credencial activa:', err);
                return res.status(500).json({
                    error: 'Error al consultar visitas activas'
                });
            }

            if (result.length > 0) {
                // Devuelve también el VISITAS_ID y otros datos útiles si se desea
                const visita = result[0];
                return res.json({
                    activa: true,
                    visitas_id: visita.VISITAS_ID,
                    nombre: visita.NOMBRE,
                    fecha_entrada: visita.FECHA_ENTRADA,
                    hora_entrada: visita.HORA_ENTRADA
                });
            } else {
                return res.json({
                    activa: false
                });
            }
        });
    });
});

//DAR SALIDA DE VISITANTES
app.post('/marcar-salida', (req, res) => {
    const {
        visitas_id
    } = req.body;

    if (!visitas_id) {
        return res.status(400).json({
            error: 'Falta visitas_id'
        });
    }

    Firebird.attach(firebirdConfig, (err, db) => {
        if (err) {
            console.error('Conexión Firebird fallida:', err);
            return res.status(500).json({
                error: 'Error de conexión a la base de datos'
            });
        }

        const sql = `
            UPDATE VISITAS_FYTTSANET
            SET ACTIVO = FALSE
            WHERE VISITA_ID = ?
        `;

        const idNum = parseInt(visitas_id);
        if (isNaN(idNum)) {
            db.detach();
            return res.status(400).json({
                error: 'visitas_id debe ser un número válido'
            });
        }

        db.query(sql, [idNum], (err, result) => {
            db.detach(); // Siempre liberar conexión

            if (err) {
                console.error('Error al marcar salida:', err);
                return res.status(500).json({
                    error: 'Error al actualizar la salida de la visita'
                });
            }

            return res.json({
                ok: true,
                mensaje: 'Salida marcada correctamente'
            });
        });
    });
});

//VISITA ACTIVA POR CREDENCIAL PARA MOSTRAR ALERTA
app.post('/obtener-visita-activa', (req, res) => {
    const {
        credencial
    } = req.body;

    if (!credencial) {
        return res.status(400).json({
            error: 'Falta credencial'
        });
    }

    Firebird.attach(firebirdConfig, (err, db) => {
        if (err) {
            console.error('Conexión Firebird fallida:', err);
            return res.status(500).json({
                error: 'Error de conexión a la base de datos'
            });
        }

        const sql = `
      SELECT FIRST 1 * FROM VISITAS_FYTTSANET
      WHERE CREDENCIAL = ? AND ACTIVO = TRUE
    `;

        db.query(sql, [credencial], (err, result) => {
            db.detach();

            if (err) {
                console.error('Error al obtener visita activa:', err);
                return res.status(500).json({
                    error: 'Error al consultar visita activa'
                });
            }

            if (result.length > 0) {
                return res.json({
                    activa: true,
                    visita: result[0]
                });
            } else {
                return res.json({
                    activa: false
                });
            }
        });
    });
});
//VISITAS QUE YA FUERON MARCADAS COMO SALIDA
app.get('/historial', (req, res) => {
    Firebird.attach(firebirdConfig, (err, db) => {
        if (err) {
            console.error('Conexión Firebird fallida:', err);
            return res.status(500).json({
                error: 'Error de conexión'
            });
        }

        const sql = `
      SELECT 
        VISITA_ID,
        NOMBRE,
        MOTIVO,
        AREA_A_VISITAR AS AREA,
        COLABORADOR_A_VISITAR AS COLABORADOR,
        HORA_ENTRADA,
        FECHA_ENTRADA
      FROM VISITAS_FYTTSANET
      WHERE ACTIVO = FALSE
      ORDER BY FECHA_ENTRADA DESC, HORA_ENTRADA DESC
    `;

        db.query(sql, (err, result) => {
            db.detach();
            if (err) {
                console.error('Error al consultar visitas activas:', err);
                return res.status(500).json({
                    error: 'Error al obtener visitas'
                });
            }

            return res.json(result);
        });
    });
});
app.get('/descargar-pdf', (req, res) => {
  const { fecha } = req.query;

  if (!fecha) {
    return res.status(400).json({ error: 'Falta el parámetro "fecha" (YYYY-MM-DD)' });
  }

  Firebird.attach(firebirdConfig, (err, db) => {
    if (err) {
      console.error('Conexión Firebird fallida:', err);
      return res.status(500).json({ error: 'Error de conexión a la base de datos' });
    }

    const sql = `
      SELECT 
        VISITA_ID,
        NOMBRE,
        MOTIVO,
        AREA_A_VISITAR AS AREA,
        COLABORADOR_A_VISITAR AS COLABORADOR,
        HORA_ENTRADA,
        FECHA_ENTRADA
      FROM VISITAS_FYTTSANET
      WHERE ACTIVO = FALSE AND FECHA_ENTRADA = ?
      ORDER BY HORA_ENTRADA DESC
    `;

    db.query(sql, [fecha], (err, result) => {
      db.detach();

      if (err) {
        console.error('Error al consultar visitas:', err);
        return res.status(500).json({ error: 'Error al obtener visitas' });
      }

      if (!result || result.length === 0) {
        return res.status(404).json({ error: 'No hay visitas para la fecha indicada' });
      }

      const visitasNormalizadas = result.map((v) => ({
        visita_id: v.VISITA_ID,
        nombre: v.NOMBRE || '',
        motivo: v.MOTIVO || '',
        area: v.AREA || '',
        colaborador: v.COLABORADOR || '',
        hora_entrada: v.HORA_ENTRADA || '',
        fecha_entrada: v.FECHA_ENTRADA || '',
      }));

      const doc = new PDFDocument({ margin: 50, size: 'A4', bufferPages: true });

      res.setHeader('Content-Type', 'application/pdf');
      res.setHeader('Content-Disposition', `attachment; filename=visitas_${fecha}.pdf`);
      doc.pipe(res);

      // --- HEADER ---
      function drawHeader() {
        doc
          .fillColor('#34495e')
          .fontSize(24)
          .font('Helvetica-Bold')
          .text('Historial de Visitas', 50, 40);

        const fechaFormatted = new Date(fecha).toLocaleDateString('es-ES', {
          weekday: 'long', year: 'numeric', month: 'long', day: 'numeric'
        });
        doc
          .fontSize(12)
          .fillColor('#7f8c8d')
          .font('Helvetica-Oblique')
          .text(fechaFormatted, 50, 70);

        // Línea decorativa
        doc
          .moveTo(50, 95)
          .lineTo(545, 95)
          .lineWidth(2)
          .strokeColor('#2980b9')
          .stroke();

        // (Opcional) Logo: descomenta y cambia ruta si tienes uno
        // doc.image('path/to/logo.png', 480, 30, { width: 50 });
      }

      // --- TABLE ---
      
     function drawTable(headers, rows, startY) {
 const columnWidths = [50, 140, 130, 90, 110];
  const startX = 50;
  let y = startY;

  // Header background
  doc.fillColor('#2980b9');
  doc.rect(startX, y, columnWidths.reduce((a, b) => a + b, 0), 30).fill();

  // Header text
  doc.fillColor('white').fontSize(12).font('Helvetica-Bold');
  let x = startX;
  headers.forEach((header, i) => {
    doc.text(header, x + 5, y + 8, { width: columnWidths[i] - 10, align: 'center' });
    x += columnWidths[i];
  });

  y += 30;

  // Rows
  doc.font('Helvetica').fontSize(10);
  rows.forEach((row, index) => {
    // Alternar color de fila
    if (index % 2 === 0) {
      doc.fillColor('#ecf0f1');
      doc.rect(startX, y, columnWidths.reduce((a, b) => a + b, 0), 30).fill();
    }
    doc.fillColor('#2c3e50');
 const fechaFormateada = row.fecha_entrada
      ? new Date(row.fecha_entrada).toLocaleDateString('es-ES')
      : '';
    x = startX;
    [
      row.visita_id,
      row.nombre,
      row.motivo,
      row.area,
      row.colaborador,
    ].forEach((text, i) => {
      doc.text(String(text), x + 5, y + 8, { width: columnWidths[i] - 10, align: 'left' });
      x += columnWidths[i];
    });

    y += 30;

    // Salto de página si se acerca al final
    if (y > 700) { // un poco antes para más margen
      doc.addPage();
      y = 50;
    }
  });

  return y;
}

      // --- FOOTER ---
      function addFooter(pageNumber, totalPages) {
        doc.fontSize(9).fillColor('#7f8c8d');
        const footerText = `Página ${pageNumber} de ${totalPages}`;
        doc.text(footerText, 50, 780, { align: 'center', width: 500 });
      }

      // --- CREAR PDF ---
      drawHeader();
const headers = ['ID', 'Nombre', 'Motivo', 'Área', 'Colaborador'];
      drawTable(headers, visitasNormalizadas, 150);

      // Agregar números de página
      const pages = doc.bufferedPageRange();
      for (let i = 0; i < pages.count; i++) {
        doc.switchToPage(i);
        addFooter(i + 1, pages.count);
      }

      doc.end();
    });
  });
});
//OPERADORES
app.get('/buscar-usuario', (req, res) => {
    const searchQuery = req.query.query;

    if (!searchQuery) {
        return res.status(400).json({
            error: 'Falta el parámetro de búsqueda'
        });
    }

    const likeValue = `%${searchQuery.toString().toUpperCase()}%`;

    Firebird.attach(firebirdConfig, (err, db) => {
        if (err) {
            console.error('Conexión Firebird fallida:', err);
            return res.status(500).json({
                error: 'Error de conexión'
            });
        }

        const sql = `
          SELECT TRIM(UPPER(NOMBRE_COMPLETO)) AS NOMBRE_COMPLETO
          FROM USUARIOS_LOG
          WHERE UPPER(NOMBRE_COMPLETO) LIKE ?
          ORDER BY NOMBRE_COMPLETO
      `;

        db.query(sql, [likeValue], (err, result) => {
            db.detach();

            if (err) {
                console.error('Error al buscar usuario:', err);
                return res.status(500).json({
                    error: 'Error al consultar usuarios'
                });
            }

            return res.json(result);
        });
    });
});

//CAPTURAR FOLIOS DE UN QR (VARIOS)
app.get('/folio', (req, res) => {
    const { folio } = req.query;
    if (!folio) return res.status(400).json({ error: 'Folio es requerido' });

    const match = folio.match(/^([A-Z]+)[0-9]+$/i);
    if (!match) return res.status(400).json({ error: `Formato de folio inválido: ${folio}` });

    const prefix = match[1].toUpperCase();

    let sql = '';
    const params = [folio];
    let sistema = '';
    let origenTabla = '';
    let origenCampo = '';

    switch (prefix) {
        case 'ZAP':
        case 'D':
            sistema = 'PV';
            origenTabla = 'DOCTOS_PV';
            origenCampo = 'DOCTO_PV_ID';
            sql = `SELECT DISTINCT 
                    DP.FOLIO, 
                    CAST(DP.FECHA AS VARCHAR(30)) AS FECHA_HORA_CREACION,
                    DPD.CLAVE_ARTICULO, 
                    DPD.UNIDADES,
                    CL.NOMBRE,
                    (
                        SELECT FIRST 1 DC.TELEFONO1
                        FROM DIRS_CLIENTES DC
                        WHERE DC.CLIENTE_ID = CL.CLIENTE_ID AND DC.TELEFONO1 IS NOT NULL
                    ) AS TELEFONO1
                FROM DOCTOS_PV DP
                INNER JOIN DOCTOS_PV_DET DPD ON DPD.DOCTO_PV_ID = DP.DOCTO_PV_ID
                INNER JOIN CLIENTES CL ON CL.CLIENTE_ID = DP.CLIENTE_ID
                WHERE DP.FOLIO = ?`; 
            break;

        case 'VMA':
        case 'VMB':
        case 'VMC':
        case 'VMD':
            sistema = 'IN';
            origenTabla = 'DOCTOS_IN';
            origenCampo = 'DOCTO_IN_ID';
            sql = `SELECT DISTINCT 
                    DV.FOLIO, 
                    CAST(DV.FECHA_HORA_CREACION AS VARCHAR(30)) AS FECHA_HORA_CREACION,
                    DVD.CLAVE_ARTICULO, 
                    DVD.UNIDADES,
                    CL.NOMBRE,
                    (
                        SELECT FIRST 1 DC.TELEFONO1
                        FROM DIRS_CLIENTES DC
                        WHERE DC.CLIENTE_ID = CL.CLIENTE_ID AND DC.TELEFONO1 IS NOT NULL
                    ) AS TELEFONO1
                FROM DOCTOS_IN DV
                INNER JOIN DOCTOS_IN_DET DVD ON DVD.DOCTO_IN_ID = DV.DOCTO_IN_ID
                INNER JOIN CLIENTES CL ON CL.CLIENTE_ID = DV.CLIENTE_ID
                WHERE DV.FOLIO = ?`; 
            break;

        case 'FCT':
        case 'PC':
        case 'PPM':
        case 'FPM':
            sistema = 'PM';
            origenTabla = 'DOCTOS_VE';
            origenCampo = 'DOCTO_VE_ID';
            sql = ` SELECT DISTINCT 
                    CL.CLIENTE_ID AS CLIENTE_ID, 
                    CL.NOMBRE, 
                    DCL.CALLE, 
                    DCL.COLONIA, 
                    DV.FOLIO,       
                    CAST(DV.FECHA_HORA_CREACION AS VARCHAR(30)) AS FECHA_HORA_CREACION,
                    DVD.CLAVE_ARTICULO,
                    DVD.UNIDADES,
                    DV.IMPORTE_NETO,
                    DV.TOTAL_IMPUESTOS,
                    (DV.IMPORTE_NETO + DV.TOTAL_IMPUESTOS) AS TOTAL,
                    (
                        SELECT FIRST 1 DC.TELEFONO1
                        FROM DIRS_CLIENTES DC
                        WHERE DC.CLIENTE_ID = CL.CLIENTE_ID AND DC.TELEFONO1 IS NOT NULL
                    ) AS TELEFONO1
                FROM DOCTOS_VE DV
                INNER JOIN CLIENTES CL ON CL.CLIENTE_ID = DV.CLIENTE_ID
                INNER JOIN DIRS_CLIENTES DCL ON DCL.CLIENTE_ID = CL.CLIENTE_ID
                INNER JOIN DOCTOS_VE_DET DVD ON DVD.DOCTO_VE_ID = DV.DOCTO_VE_ID
                WHERE DV.FOLIO = ?`; 
            break;

        case 'TC':
        case 'TST':
        case 'TVM':
        case 'TSV':
            sistema = 'TR';
            origenTabla = 'TRASPASOS_IN';
            origenCampo = 'TRASPASO_IN_ID';
            sql = `SELECT 
                    TI.DOCTO_IN_ID AS DOCTO_ID, 
                    TI.FOLIO, 
                    TD.CLAVE_ARTICULO,
                    TD.UNIDADES,
                    SUC.NOMBRE 
                FROM TRASPASOS_IN TI
                INNER JOIN SUCURSALES SUC ON SUC.SUCURSAL_ID = TI.SUCURSAL_DESTINO_ID
                LEFT JOIN TRASPASOS_DET TD ON TD.TRASPASO_IN_ID = TI.TRASPASO_IN_ID
                WHERE TI.FOLIO = ?`; 
            break;

        default:
            return res.status(400).json({ error: `Prefijo de folio no reconocido: ${prefix}` });
    }

    Firebird.attach(firebirdConfig, (err, db) => {
        if (err) {
            console.error('Conexión Firebird fallida:', err);
            return res.status(500).json({ error: 'Error de conexión a base de datos' });
        }

        db.query(sql, params, (err, result) => {
            if (err) {
                db.detach();
                console.error(`Error al consultar FOLIO (${folio}):`, err);
                return res.status(500).json({ error: 'Error al consultar FOLIO' });
            }

            res.json(result);

            if (!sistema || !origenTabla || !origenCampo) {
                console.warn(`No se pudo identificar sistema/origen para: ${folio}`);
                db.detach();
                return;
            }

            const idQuery = `SELECT ${origenCampo} AS DOCTO_ID FROM ${origenTabla} WHERE FOLIO = ?`;

            db.query(idQuery, [folio], (err, idRes) => {
                if (err || !idRes.length) {
                    console.error(`Error obteniendo ID para ${folio}:`, err);
                    db.detach();
                    return;
                }

                const doctoId = idRes[0].DOCTO_ID;

                const checkSqlAll = `SELECT PROCESO_ID FROM CTRL_INF_ENV WHERE DOCTO_DEST_ID = ?`;

                db.query(checkSqlAll, [doctoId], (checkErr, checkRes) => {
                    if (checkErr) {
                        console.error('Error verificando CTRL_INF_ENV:', checkErr);
                        db.detach();
                        return;
                    }

                    if (checkRes.length === 0) {
                        // No existe, insertamos
                        const insertSql = `
                            INSERT INTO CTRL_INF_ENV (
                                DOCTO_DEST_ID,
                                PROCESO_ID,
                                FECHA_PROC_5,
                                SISTEMA
                            ) VALUES (?, ?, CURRENT_DATE, ?)
                        `;

                        db.query(insertSql, [doctoId, 5, 'FN'], (insertErr) => {
                            db.detach();
                            if (insertErr) {
                                console.error('❌ Error insertando en CTRL_INF_ENV:', insertErr);
                            } else {
                                console.log(`📥 Insertado nuevo registro con PROCESO_ID = 5 para DOCTO_DEST_ID = ${doctoId}`);
                            }
                        });
                    } else {
                        // Ya existe registro(s)
                        const hasProceso5 = checkRes.some(row => row.PROCESO_ID === 5);

                        if (hasProceso5) {
                            // Ya existe con proceso 5, no hacemos nada
                            console.log(`✔️ Ya existe registro con PROCESO_ID = 5 para DOCTO_DEST_ID = ${doctoId}`);
                            db.detach();
                        } else {
                            // Existe con otro proceso, actualizamos a 5
                            const updateSql = `
                                UPDATE CTRL_INF_ENV
                                SET PROCESO_ID = 5,
                                    FECHA_PROC_5 = CURRENT_DATE,
                                    SISTEMA = ?
                                WHERE DOCTO_DEST_ID = ?
                            `;

                            db.query(updateSql, ['FN', doctoId], (updateErr) => {
                                db.detach();
                                if (updateErr) {
                                    console.error('❌ Error actualizando CTRL_INF_ENV:', updateErr);
                                } else {
                                    console.log(`♻️ Actualizado registro a PROCESO_ID = 5 para DOCTO_DEST_ID = ${doctoId}`);
                                }
                            });
                        }
                    }
                });
            });
        });
    });
});




//array de salidas para dar salida a varios documentos a la vez (en un solo grupo)
app.post('/registrar-salida-multiple', (req, res) => {
    const { registros } = req.body;

    if (!Array.isArray(registros) || registros.length === 0) {
        return res.status(400).json({ error: 'No se recibieron registros' });
    }

    Firebird.attach(firebirdConfig, (err, db) => {
        if (err) {
            console.error('Error al conectar con Firebird:', err);
            return res.status(500).json({ error: 'Error de conexión a Firebird' });
        }

        db.transaction(Firebird.ISOLATION_READ_COMMITTED, async (err, transaction) => {
            if (err) {
                console.error('Error iniciando transacción:', err);
                db.detach();
                return res.status(500).json({ error: 'Error iniciando transacción' });
            }

            try {
                for (const item of registros) {
                    const { tipoDocumento, docInfo, operador, guardia } = item;

                    if (!tipoDocumento || !docInfo || !operador || !guardia) {
                        throw new Error('Faltan datos en uno de los registros');
                    }

                    const insertQuery = `
            INSERT INTO FOLIOS_ENTREGA (
              FOLIO, NOMBRE_CLIENTE, FECHA_SALIDA, OPERADOR, GUARDIA, ESTADO
            ) VALUES (?, ?, CURRENT_TIMESTAMP, ?, ?, 'PENDIENTE')
          `;

                    const docIdField = tipoDocumento === 'DOCTO_VE' ? 'DOCTO_VE_ID'
                        : tipoDocumento === 'TRASPASO_IN' ? 'DOCTO_IN_ID'
                            : 'DOCTO_PV_ID';

                    const docId = docInfo[docIdField];

                    const updateQuery = `
            UPDATE CTRL_INF_ENV
            SET PROCESO_ID = 5,
                FECHA_PROC_5 = CURRENT_TIMESTAMP
            WHERE DOCTO_ORIGEN_ID = ?
          `;

                    await new Promise((resolve, reject) => {
                        transaction.query(insertQuery, [
                            docInfo.FOLIO,
                            docInfo.NOMBRE_CLIENTE,
                            operador,
                            guardia
                        ], (err) => err ? reject(err) : resolve());
                    });

                    await new Promise((resolve, reject) => {
                        transaction.query(updateQuery, [docId], (err) => err ? reject(err) : resolve());
                    });
                    const numero = docInfo.TELEFONO1?.trim();
                    const nombre = docInfo.NOMBRE_CLIENTE?.trim();
                    const folioRaw = docInfo.FOLIO?.trim() || '';

                    let folio = folioRaw;
                    const match = folioRaw.match(/^([A-Z]+)(\d+)$/i);
                    if (match) {
                        const letras = match[1];
                        const numeroFolio = parseInt(match[2], 10);
                        folio = `${letras}${numeroFolio}`;
                    }

                    if (numero && nombre && folio) {
                        const wasapiPayload = {
                            recipients: numero,
                            template_id: "ae2a4610-651f-4995-aa5a-f1a369d3b472",
                            contact_type: "phone",
                            from_id: 7857,
                            body_vars: [
                                { text: "{{1}}", val: nombre },
                                { text: "{{2}}", val: folio }
                            ],
                            chatbot_status: "disable",
                            conversation_status: "unchanged"
                        };

                        try {
                            const response = await globalThis.fetch('https://api.wasapi.io/prod/api/v1/whatsapp-messages/send-template', {
                                method: 'POST',
                                headers: {
                                    'Authorization': 'Bearer 12724|csP77b05JMVWwjuJw7fKgUxQRmh5RpYxx1sPO4Cw',
                                    'Content-Type': 'application/json'
                                },
                                body: JSON.stringify(wasapiPayload)
                            });

                            const data = await response.json();
                            console.log(` WhatsApp enviado a ${numero}:`, data);
                        } catch (err) {
                            console.error(`Error al enviar WhatsApp a ${numero}:`, err);
                        }
                    } else {
                        console.warn(`No se envió WhatsApp: datos incompletos (numero/nombre/folio)`);
                    }
                }

                transaction.commit((err) => {
                    if (err) {
                        console.error('Error al confirmar transacción:', err);
                        db.detach();
                        return res.status(500).json({ error: 'Error al confirmar transacción' });
                    }
                    db.detach();
                    return res.json({ success: true, message: 'Todas las salidas fueron registradas' });
                });

            } catch (e) {
                console.error('Error procesando registros:', e);
                transaction.rollback(() => db.detach());
                return res.status(500).json({ error: e.message || 'Error al procesar los registros' });
            }
        });
    });
});




//recibos: 
app.post('/consulta-recibos', (req, res) => {
    const { folio, sucursalDestinoId } = req.body;

    Firebird.attach(firebirdConfig, function (err, db) {
        if (err) {
            console.error('Error de conexión a Firebird:', err);
            return res.status(500).json({ error: 'Error al conectar a la base de datos.' });
        }

        const caratulaQuery = `
            SELECT TRASPASO_IN_ID, FOLIO, FECHA, A.NOMBRE AS ORIGEN, A2.NOMBRE AS DESTINO, TI.ESTATUS 
            FROM TRASPASOS_IN TI
            INNER JOIN ALMACENES A ON A.ALMACEN_ID = TI.ALMACEN_ORIGEN_ID
            INNER JOIN ALMACENES A2 ON A2.ALMACEN_ID = TI.ALMACEN_DESTINO_ID
            WHERE FOLIO = ? AND ESTATUS = 'E' AND TI.SUCURSAL_DESTINO_ID = ?
        `;

        db.query(caratulaQuery, [folio, sucursalDestinoId], function (err, result) {
            if (err) {
                db.detach();
                console.error('Error en la consulta de carátula:', err);
                return res.status(500).json({ error: 'Error al consultar carátula del traspaso.' });
            }

            if (result.length === 0) {
                db.detach();
                return res.status(404).json({ error: 'Traspaso no encontrado o no autorizado para esta sucursal.' });
            }

            const traspaso = result[0]; // Tiene TRASPASO_IN_ID

            const detallesQuery = `
              SELECT TID.CLAVE_ARTICULO,A.NOMBRE,TID.UNIDADES,A.UNIDAD_VENTA AS UMED,CA.CLAVE_ARTICULO AS CODIGOB FROM TRASPASOS_IN_DET TID
LEFT JOIN ARTICULOS A ON A.ARTICULO_ID = TID.ARTICULO_ID
LEFT JOIN CLAVES_ARTICULOS CA ON CA.ARTICULO_ID = TID.ARTICULO_ID AND CA.ROL_CLAVE_ART_ID = 58486
WHERE TID.TRASPASO_IN_ID = ?
            `;

            db.query(detallesQuery, [traspaso.TRASPASO_IN_ID], function (err, detalles) {
                db.detach();
                if (err) {
                    console.error('Error en la consulta de detalles:', err);
                    return res.status(500).json({ error: 'Error al consultar detalles del traspaso.' });
                }

                return res.json({
                    caratula: traspaso,
                    detalles: detalles,
                });
            });
        });
    });
});
app.post('/recibo-correcto', (req, res) => {
    const { traspasoId } = req.body;

    if (!traspasoId) {
        return res.status(400).json({ error: 'Falta el ID del traspaso.' });
    }

    Firebird.attach(firebirdConfig, function (err, db) {
        if (err) {
            console.error('Error de conexión a Firebird:', err);
            return res.status(500).json({ error: 'Error al conectar a la base de datos.' });
        }

        const updateQuery = `UPDATE TRASPASOS_IN SET ESTATUS = 'R' WHERE TRASPASO_IN_ID = ?`;

        db.query(updateQuery, [traspasoId], function (err, result) {
            db.detach();
            if (err) {
                console.error('Error al actualizar traspaso:', err);
                return res.status(500).json({ error: 'Error al actualizar el traspaso.' });
            }

            return res.json({ message: 'Traspaso recibido correctamente.' });
        });
    });
});





//PICKING

// LOGIN
app.post('/login', async (req, res) => {
    const {
        user,
        password
    } = req.body;

    if (!user || !password) {
        return res.status(400).json({
            message: 'Usuario y contraseña requeridos'
        });
    }

    Firebird.attach(firebirdConfig, async (err, db) => {
        if (err) {
            console.error('Error al conectar a Firebird:', err);
            return res.status(500).json({
                message: 'Error al conectar a base de datos'
            });
        }

        const query = `
            SELECT PIKER_ID, NOMBRE, USUARIO, ESTATUS, PASS, IMAGEN_COLAB, ROL 
            FROM PICKERS 
            WHERE USUARIO = ? AND PASS = ?
        `;

        db.query(query, [user, password], async (err, result) => {
            if (err) {
                db.detach();
                console.error('Error en la consulta SQL:', err);
                return res.status(500).json({
                    message: 'Error en la consulta'
                });
            }

            if (result.length === 0) {
                db.detach();
                return res.status(401).json({
                    message: 'Credenciales inválidas'
                });
            }

            const userRow = result[0];
            let imageBase64 = null;
            let mime = null;

            try {
                const imageBuffer = await readBlob(userRow.IMAGEN_COLAB);
                if (imageBuffer) {
                    const type = await fileTypeFromBuffer(imageBuffer);
                    mime = type ? type.mime : 'image/jpeg';
                    imageBase64 = imageBuffer.toString('base64');
                }
            } catch (error) {
                console.error('Error leyendo imagen BLOB:', error);
            }

            db.detach();

            return res.status(200).json({
                message: 'Login exitoso',
                user: {
                    PIKER_ID: userRow.PIKER_ID,
                    NOMBRE: userRow.NOMBRE,
                    USUARIO: userRow.USUARIO,
                    ESTATUS: userRow.ESTATUS,
                    IMAGEN_COLAB: imageBase64,
                    IMAGEN_COLAB_MIME: mime,
                    ROL: userRow.ROL
                }
            });
        });
    });
});

//metricas x user:
app.post('/metrics', async (req, res) => {
    const {
        pikerId
    } = req.body;

    if (!pikerId) {
        return res.status(400).json({
            message: 'PIKER_ID requerido'
        });
    }

    Firebird.attach(firebirdConfig, async (err, db) => {
        if (err) {
            console.error('Error al conectar a Firebird:', err);
            return res.status(500).json({
                message: 'Vuelve a intentarlo'
            });
        }

        let bono = {};
        let rank = null;

        try {
            const {
                fechaInicio,
                fechaFin
            } = obtenerRangoSemanal();

            const bonoQuery = `
                SELECT * FROM DET_BONO_X_PICKER_BS(?, ?) 
                WHERE R_PICKER_ID = ?
            `;
            const bonoResult = await dbQuery(db, bonoQuery, [fechaInicio, fechaFin, pikerId]);

            if (bonoResult.length > 0) {
                bono = bonoResult[0];
            }

            const rankQuery = `
                SELECT RANK
                FROM (
                    SELECT R_PICKER_ID, ROW_NUMBER() OVER (ORDER BY R_TOTAL_SCORE_GRAL DESC) AS RANK
                    FROM DET_BONO_X_PICKER_BS(?, ?)
                ) AS Ranking
                WHERE R_PICKER_ID = ?
            `;
            const rankResult = await dbQuery(db, rankQuery, [fechaInicio, fechaFin, pikerId]);

            if (rankResult.length > 0) {
                rank = rankResult[0].RANK;
            }

            db.detach();

            return res.status(200).json({
                message: 'Métricas obtenidas exitosamente',
                fechaInicio,
                fechaFin,
                bono,
                rank
            });
        } catch (error) {
            db.detach();
            console.error('Error al obtener métricas:', error);
            return res.status(500).json({
                message: 'Error al obtener métricas'
            });
        }
    });
});


//PIKERS parte admin
app.get('/pikers', async (req, res) => {
    Firebird.attach(firebirdConfig, async (err, db) => {
        if (err) {
            console.error('Error al conectar a Firebird:', err);
            return res.status(500).json({
                message: 'No se realizo ningun cambio, vuelve a intentarlo'
            });
        }

        const query = `SELECT PIKER_ID, NOMBRE, USUARIO, ESTATUS, IMAGEN_COLAB, ROL FROM PICKERS WHERE ESTATUS = 'A'`;

        db.query(query, async (err, result) => {
            if (err) {
                db.detach();
                console.error('Error en la consulta:', err);
                return res.status(500).json({
                    message: 'Error en la consulta'
                });
            }

            const pikers = await Promise.all(
                result.map(async (row) => {
                    let imageBuffer = null;
                    let mime = null;
                    let imageBase64 = null;

                    try {
                        imageBuffer = await readBlob(row.IMAGEN_COLAB);

                        if (imageBuffer) {
                            const type = await fileTypeFromBuffer(imageBuffer);
                            mime = type ? type.mime : 'image/jpeg';
                            imageBase64 = imageBuffer.toString('base64');
                        }
                    } catch (error) {
                        console.error('Error leyendo imagen BLOB:', error);
                    }

                    return {
                        PIKER_ID: row.PIKER_ID,
                        NOMBRE: row.NOMBRE,
                        USUARIO: row.USUARIO,
                        ESTATUS: row.ESTATUS,
                        IMAGEN_COLAB: imageBase64,
                        IMAGEN_COLAB_MIME: mime,
                        ROL: row.ROL,
                    };
                })
            );

            db.detach();
            return res.status(200).json({
                pikers
            });
        });
    });
});

// AÑADIR PICKER
app.post('/anadir-picker', (req, res) => {
    const {
        nombre,
        usuario,
        password
    } = req.body;

    if (!nombre || !usuario || !password) {
        return res.status(400).json({
            message: 'Nombre, usuario y contraseña son requeridos'
        });
    }

    Firebird.attach(firebirdConfig, (err, db) => {
        if (err) {
            console.error('Error al conectar a Firebird:', err);
            return res.status(500).json({
                message: 'No se realizo ningun cambio, vuelve a intentarlo'
            });
        }

        const updateQuery = `
      INSERT INTO PICKERS (NOMBRE, USUARIO, PASS, ESTATUS, IMAGEN_COLAB, ROL)
      VALUES (?, ?, ?, 'A', NULL, 1)
    `;

        db.query(updateQuery, [nombre, usuario, password], (err) => {
            db.detach();

            if (err) {
                console.error('Error añadir picker:', err);
                return res.status(500).json({
                    message: 'No se pudo añadir'
                });
            }

            return res.status(200).json({
                message: 'Traspaso tomado con éxito'
            });
        });
    });
});

app.post('/eliminar-picker', (req, res) => {
    const {
        pickerId
    } = req.body;

    if (!pickerId) {
        return res.status(400).json({
            message: 'El ID del picker es requerido'
        });
    }

    Firebird.attach(firebirdConfig, (err, db) => {
        if (err) {
            console.error('Error al conectar a Firebird:', err);
            return res.status(500).json({
                message: 'No se realizo ningun cambio, vuelve a intentarlo'
            });
        }

        const deleteQuery = `
      DELETE FROM PICKERS
      WHERE PIKER_ID = ?
    `;

        db.query(deleteQuery, [pickerId], (err) => {
            db.detach();

            if (err) {
                console.error('Error al eliminar picker:', err);
                return res.status(500).json({
                    message: 'No se pudo eliminar el picker'
                });
            }

            return res.status(200).json({
                message: 'Picker eliminado con éxito'
            });
        });
    });
});

//EDITAR PIKER
app.post('/editar-picker', (req, res) => {
    const {
        pickerId,
        nuevoPass,
        nuevoEstatus
    } = req.body;

    if (!pickerId || !nuevoPass || !nuevoEstatus) {
        return res.status(400).json({
            message: 'Faltan datos obligatorios para editar el picker'
        });
    }

    Firebird.attach(firebirdConfig, (err, db) => {
        if (err) {
            console.error('Error al conectar a Firebird:', err);
            return res.status(500).json({
                message: 'No se realizo ningun cambio, vuelve a intentarlo'
            });
        }

        const updateQuery = `
      UPDATE PICKERS
      SET PASS = ?, ESTATUS = ?
      WHERE PIKER_ID = ?
    `;

        db.query(updateQuery, [nuevoPass, nuevoEstatus, pickerId], (err) => {
            db.detach();

            if (err) {
                console.error('Error al editar picker:', err);
                return res.status(500).json({
                    message: 'No se pudo editar el picker'
                });
            }

            return res.status(200).json({
                message: 'Picker editado con éxito'
            });
        });
    });
});


// VENTANILLA
app.get('/ventanilla', (req, res) => {
    Firebird.attach(firebirdConfig, (err, db) => {
        if (err) {
            console.error('Error al conectar a Firebird:', err);
            return res.status(500).json({
                message: 'No se realizo ningun cambio, vuelve a intentarlo'
            });
        }

        const query = `SELECT TRASPASO_IN_ID, FOLIO, ALMACEN, FECHA, HORA FROM VENTANILLA_PENDIENTES WHERE ESTATUS = 'P'`;

        db.query(query, (err, result) => {
            db.detach();

            if (err) {
                console.error('Error en la consulta de ventanilla:', err);
                return res.status(500).json({
                    message: 'Error al obtener datos de ventanilla'
                });
            }

            return res.status(200).json({
                pendientes: result
            });
        });
    });
});

// DETALLE DE TRASPASO 
app.post('/detalle-traspaso', (req, res) => {
    const {
        traspasoInId
    } = req.body;

    if (!traspasoInId) {
        return res.status(400).json({
            message: 'TRASPASO_IN_ID es requerido'
        });
    }

    Firebird.attach(firebirdConfig, (err, db) => {
        if (err) {
            console.error('Error al conectar a Firebird:', err);
            return res.status(500).json({
                message: 'No se realizo ningun cambio, vuelve a intentarlo'
            });
        }

        const detalleQuery = `
      SELECT
        COALESCE(CA.CLAVE_ARTICULO, 'NA') AS CODIGO_BARRAS,
        TID.CLAVE_ARTICULO AS CODIGO,
        CAST(ROUND(UNIDADES, 1) AS NUMERIC(18,1)) AS UNIDADES,
        TID.ARTICULO_ID,
        TID.TRASPASO_IN_ID,
        A.NOMBRE,
        COALESCE(NA.LOCALIZACION, 'NA') AS LOCALIZACION,
        A.UNIDAD_VENTA
      FROM TRASPASOS_IN_DET TID
      INNER JOIN CLAVES_ARTICULOS CA ON CA.ARTICULO_ID = TID.ARTICULO_ID
      INNER JOIN ARTICULOS A ON A.ARTICULO_ID = TID.ARTICULO_ID
      INNER JOIN NIVELES_ARTICULOS NA ON NA.ARTICULO_ID = TID.ARTICULO_ID
      WHERE TID.TRASPASO_IN_ID = ? AND CA.ROL_CLAVE_ART_ID = 58486 AND NA.ALMACEN_ID = 188104
      ORDER BY COALESCE(NA.LOCALIZACION, 'NA') ASC
    `;

        db.query(detalleQuery, [traspasoInId], (err, result) => {
            db.detach();

            if (err) {
                console.error('Error en la consulta detalle:', err);
                return res.status(500).json({
                    message: 'Error al obtener detalle del traspaso'
                });
            }

            return res.status(200).json({
                detalles: result
            });
        });
    });
});

// TOMAR TRASPASO
app.post('/tomar-traspaso', (req, res) => {
    const {
        traspasoInId,
        pikerId,
        fechaIni,
        horaIni
    } = req.body;

    if (!traspasoInId || !pikerId) {
        return res.status(400).json({
            message: 'TRASPASO_IN_ID y PIKER_ID son requeridos'
        });
    }

    Firebird.attach(firebirdConfig, (err, db) => {
        if (err) {
            console.error('Error al conectar a Firebird:', err);
            return res.status(500).json({
                message: 'No se realizó ningún cambio, vuelve a intentarlo'
            });
        }

        // Verificar si el picker ya está surtiendo
        const checkSurtidoQuery = `SELECT SURTIENDO FROM PICKERS WHERE PIKER_ID = ?`;

        db.query(checkSurtidoQuery, [pikerId], (err, pickerResult) => {
            if (err || pickerResult.length === 0) {
                db.detach();
                console.error('Error al verificar el estado de SURTIENDO:', err);
                return res.status(500).json({
                    message: 'Error al verificar si el picker está surtiendo'
                });
            }

            const { SURTIENDO } = pickerResult[0];
            if (SURTIENDO) {
                db.detach();
                return res.status(400).json({
                    message: 'Este picker ya está surtiendo otro traspaso'
                });
            }

            // Validar traspaso disponible
            const checkQuery = `SELECT ESTATUS, PICKER_ID FROM VENTANILLA_PENDIENTES WHERE TRASPASO_IN_ID = ?`;

            db.query(checkQuery, [traspasoInId], (err, result) => {
                if (err || result.length === 0) {
                    db.detach();
                    console.error('Error en la verificación de estatus:', err);
                    return res.status(500).json({
                        message: 'Error al verificar el estatus'
                    });
                }

                const { ESTATUS: estatus, PICKER_ID: currentPickerId } = result[0];

                if (estatus === 'E' || estatus === 'S') {
                    db.detach();
                    return res.status(409).json({
                        message: `Este traspaso ya fue enviado o surtido (estatus actual: ${estatus}). No se puede tomar.`
                    });
                }

                if (estatus !== 'P') {
                    db.detach();
                    return res.status(409).json({
                        message: `El traspaso no está disponible para tomar (estatus actual: ${estatus})`
                    });
                }

                if (currentPickerId !== null && currentPickerId !== pikerId) {
                    db.detach();
                    return res.status(403).json({
                        message: `Este traspaso ya fue tomado por otro picker (ID: ${currentPickerId})`
                    });
                }

                // Ejecutar ambos updates: traspaso + SURTIENDO
                const updateTraspasoQuery = `
                    UPDATE VENTANILLA_PENDIENTES
                    SET ESTATUS = 'T',
                        PICKER_ID = ?,
                        FECHA_INI = ?,
                        HORA_INI = ?
                    WHERE TRASPASO_IN_ID = ?
                `;

              const updateSurtidoQuery = `
    UPDATE PICKERS
    SET SURTIENDO = TRUE
    WHERE PIKER_ID = ?
`;

                db.query(updateTraspasoQuery, [pikerId, fechaIni, horaIni, traspasoInId], (err) => {
                    if (err) {
                        db.detach();
                        console.error('Error actualizando traspaso:', err);
                        return res.status(500).json({
                            message: 'No se pudo actualizar el traspaso'
                        });
                    }

                    // Ahora actualizar SURTIENDO en PICKERS
                    db.query(updateSurtidoQuery, [pikerId], (err) => {
                        db.detach();

                        if (err) {
                            console.error('Error actualizando estado SURTIENDO del picker:', err);
                            return res.status(500).json({
                                message: 'Traspaso tomado, pero no se pudo actualizar el estado del picker'
                            });
                        }

                        return res.status(200).json({
                            message: 'Traspaso tomado con éxito y picker actualizado'
                        });
                    });
                });
            });
        });
    });
});



// ACTUALIZAR TRASPASO
app.post('/update-traspaso', (req, res) => {
    const { traspasoInId, estatus } = req.body;

    if (!traspasoInId || !estatus) {
        return res.status(400).json({
            message: 'TRASPASO_IN_ID y ESTATUS son requeridos'
        });
    }

    Firebird.attach(firebirdConfig, (err, db) => {
        if (err) {
            console.error('Error al conectar a Firebird:', err);
            return res.status(500).json({
                message: 'No se realizó ningún cambio, vuelve a intentarlo'
            });
        }

        const selectQuery = `
            SELECT ESTATUS, PICKER_ID FROM VENTANILLA_PENDIENTES WHERE TRASPASO_IN_ID = ?
        `;

        db.query(selectQuery, [traspasoInId], (err, result) => {
            if (err || result.length === 0) {
                db.detach();
                console.error('Error al consultar el estatus:', err);
                return res.status(500).json({
                    message: 'No se pudo verificar el estatus actual'
                });
            }

            const { ESTATUS: currentStatus, PICKER_ID: currentPickerId } = result[0];

            if (currentStatus === 'S' || currentStatus === 'E') {
                db.detach();
                return res.status(200).json({
                    message: `El traspaso ya tiene estatus "${currentStatus}". No se realizaron cambios.`
                });
            }

            if (currentStatus === 'T' && estatus === 'P') {
                const updateQuery = `
                    UPDATE VENTANILLA_PENDIENTES
                    SET ESTATUS = 'P',
                        PICKER_ID = NULL
                    WHERE TRASPASO_IN_ID = ?
                `;

                db.query(updateQuery, [traspasoInId], (err) => {
                    if (err) {
                        db.detach();
                        console.error('Error actualizando el estatus a P:', err);
                        return res.status(500).json({
                            message: 'No se pudo actualizar el estatus a P'
                        });
                    }

                    // Si tenía un picker, actualizar también su estado SURTIENDO
                    if (currentPickerId) {
                        const updatePickerQuery = `
                            UPDATE PICKERS
                            SET SURTIENDO = FALSE
                            WHERE PIKER_ID = ?
                        `;

                        db.query(updatePickerQuery, [currentPickerId], (err) => {
                            db.detach();

                            if (err) {
                                console.error('Error actualizando SURTIENDO del picker:', err);
                                return res.status(200).json({
                                    message: 'Traspaso liberado correctamente, pero no se pudo actualizar SURTIENDO del picker'
                                });
                            }

                            return res.status(200).json({
                                message: 'Traspaso liberado correctamente (estatus cambiado a P)'
                            });
                        });
                    } else {
                        db.detach();
                        return res.status(200).json({
                            message: 'Traspaso liberado correctamente (estatus cambiado a P)'
                        });
                    }
                });
            } else {
                db.detach();
                return res.status(400).json({
                    message: `No se puede salir con estatus actual: "${currentStatus}"`
                });
            }
        });
    });
});


//MANDAR PEDIDO
app.post('/enviar-pedido', (req, res) => {
    const {
        traspasoId,
        nuevoEstatus,
        productos,
        fechaFin,
        horaFin
    } = req.body;

    if (!traspasoId || !nuevoEstatus || !productos || productos.length === 0) {
        return res.status(400).json({
            message: 'Faltan datos obligatorios para actualizar el traspaso y los productos'
        });
    }

    if (nuevoEstatus !== 'S') {
        return res.status(400).json({
            message: 'El estatus solo puede actualizarse a "S".'
        });
    }

    Firebird.attach(firebirdConfig, (err, db) => {
        if (err) {
            console.error('Error al conectar a Firebird:', err);
            return res.status(500).json({
                message: 'No se realizó ningún cambio, vuelve a intentarlo'
            });
        }

        db.transaction((err, transaction) => {
            if (err) {
                console.error('Error al iniciar la transacción:', err);
                db.detach();
                return res.status(500).json({
                    message: 'Error al iniciar la transacción'
                });
            }

            const selectEstatusQuery = `
                SELECT ESTATUS, PICKER_ID FROM VENTANILLA_PENDIENTES WHERE TRASPASO_IN_ID = ?
            `;

            transaction.query(selectEstatusQuery, [traspasoId], (err, result) => {
                if (err || !result.length) {
                    console.error('Error al consultar el estatus actual:', err);
                    transaction.rollback(() => db.detach());
                    return res.status(500).json({
                        message: 'Error al consultar el estatus actual del traspaso'
                    });
                }

                const { ESTATUS: estatusActual, PICKER_ID: pickerId } = result[0];

                if (estatusActual === 'E' || estatusActual === 'S') {
                    transaction.rollback(() => db.detach());
                    return res.status(400).json({
                        message: 'El pedido ya fue enviado. Sal de este pedido.'
                    });
                }

                // Insertar productos
                const insertQuery = `
                    INSERT INTO VENTANILLA_DET (TRASPASO_IN_ID, ARTICULO_ID, CLAVE_ARTICULO, UNIDADES, SURTIDAS)
                    VALUES (?, ?, ?, ?, ?)
                `;

                const promises = productos.map((producto) => {
                    const {
                        ARTICULO_ID,
                        CLAVE_ARTICULO,
                        UNIDADES,
                        SURTIDAS
                    } = producto;

                    if (!ARTICULO_ID || !CLAVE_ARTICULO || isNaN(UNIDADES) || isNaN(SURTIDAS)) {
                        console.error('Error en producto:', producto);
                        return Promise.reject('Datos de producto inválidos');
                    }

                    return new Promise((resolve, reject) => {
                        transaction.query(
                            insertQuery,
                            [traspasoId, ARTICULO_ID, CLAVE_ARTICULO, UNIDADES, SURTIDAS],
                            (err) => err ? reject(err) : resolve()
                        );
                    });
                });

                Promise.all(promises)
                    .then(() => {
                        const updateTraspasoQuery = `
                            UPDATE VENTANILLA_PENDIENTES
                            SET ESTATUS = ?, FECHA_FIN = ?, HORA_FIN = ?
                            WHERE TRASPASO_IN_ID = ?
                        `;

                        transaction.query(updateTraspasoQuery, [nuevoEstatus, fechaFin, horaFin, traspasoId], (err) => {
                            if (err) {
                                console.error('Error al actualizar traspaso:', err);
                                transaction.rollback(() => db.detach());
                                return res.status(500).json({
                                    message: 'No se pudo actualizar el traspaso'
                                });
                            }

                            // Actualizar SURTIENDO del picker si existía
                            if (pickerId) {
                                const updatePickerQuery = `
                                    UPDATE PICKERS
                                    SET SURTIENDO = FALSE
                                    WHERE PIKER_ID = ?
                                `;

                                transaction.query(updatePickerQuery, [pickerId], (err) => {
                                    if (err) {
                                        console.error('Error actualizando SURTIENDO:', err);
                                        // Commit aún si falla esto
                                    }

                                    transaction.commit((err) => {
                                        db.detach();
                                        if (err) {
                                            console.error('Commit fallido:', err);
                                            return res.status(500).json({
                                                message: 'Error al confirmar la transacción'
                                            });
                                        }

                                        return res.status(200).json({
                                            message: 'Pedido enviado correctamente.'
                                        });
                                    });
                                });
                            } else {
                                // No hay picker asignado, solo commit
                                transaction.commit((err) => {
                                    db.detach();
                                    if (err) {
                                        console.error('Commit fallido:', err);
                                        return res.status(500).json({
                                            message: 'Error al confirmar la transacción'
                                        });
                                    }

                                    return res.status(200).json({
                                        message: 'Pedido enviado correctamente.'
                                    });
                                });
                            }
                        });
                    })
                    .catch((error) => {
                        console.error('Error al insertar productos:', error);
                        transaction.rollback(() => db.detach());
                        return res.status(500).json({
                            message: 'Error al insertar productos'
                        });
                    });
            });
        });
    });
});




app.post('/traspaso-pedido-enviado', (req, res) => {
    const { traspasoId, nuevoEstatus, productos, fechaFin, horaFin } = req.body;

    if (!traspasoId || !nuevoEstatus || !productos || productos.length === 0) {
        return res.status(400).json({
            message: 'Faltan datos obligatorios para actualizar el traspaso y los productos'
        });
    }

    if (nuevoEstatus !== 'S') {
        return res.status(400).json({
            message: 'El estatus solo puede actualizarse a "S".'
        });
    }

    Firebird.attach(firebirdConfig, (err, db) => {
        if (err) {
            console.error('Error al conectar a Firebird:', err);
            return res.status(500).json({
                message: 'No se realizó ningún cambio, vuelve a intentarlo'
            });
        }

        db.transaction((err, transaction) => {
            if (err) {
                console.error('Error al iniciar la transacción:', err);
                db.detach();
                return res.status(500).json({
                    message: 'Error al iniciar la transacción'
                });
            }

            const selectEstatusQuery = `
                SELECT ESTATUS, PICKER_ID FROM TRASPASOS_PENDIENTES WHERE TRASPASO_IN_ID = ?
            `;

            transaction.query(selectEstatusQuery, [traspasoId], (err, result) => {
                if (err || result.length === 0) {
                    console.error('Error al consultar estatus:', err);
                    transaction.rollback(() => db.detach());
                    return res.status(500).json({
                        message: 'Error al consultar el estatus actual del traspaso'
                    });
                }

                const { ESTATUS: estatusActual, PICKER_ID } = result[0];

                if (estatusActual === 'E' || estatusActual === 'S') {
                    transaction.rollback(() => db.detach());
                    return res.status(400).json({
                        message: `El pedido ya fue enviado (estatus "${estatusActual}"). Sal de este pedido.`
                    });
                }

                const insertQuery = `
                    INSERT INTO TRASPASOS_DET (TRASPASO_IN_ID, ARTICULO_ID, CLAVE_ARTICULO, UNIDADES, SURTIDAS)
                    VALUES (?, ?, ?, ?, ?)
                `;

                const insertPromises = productos.map(({ ARTICULO_ID, CLAVE_ARTICULO, UNIDADES, SURTIDAS }) => {
                    if (!ARTICULO_ID || !CLAVE_ARTICULO || isNaN(UNIDADES) || isNaN(SURTIDAS)) {
                        console.error('Producto inválido:', { ARTICULO_ID, CLAVE_ARTICULO, UNIDADES, SURTIDAS });
                        return Promise.reject('Producto inválido');
                    }

                    return new Promise((resolve, reject) => {
                        transaction.query(insertQuery, [traspasoId, ARTICULO_ID, CLAVE_ARTICULO, UNIDADES, SURTIDAS], (err) => {
                            err ? reject(err) : resolve();
                        });
                    });
                });

                Promise.all(insertPromises)
                    .then(() => {
                        const updateTraspasoQuery = `
                            UPDATE TRASPASOS_PENDIENTES
                            SET ESTATUS = ?, FECHA_FIN = ?, HORA_FIN = ?
                            WHERE TRASPASO_IN_ID = ?
                        `;

                        transaction.query(updateTraspasoQuery, [nuevoEstatus, fechaFin, horaFin, traspasoId], (err) => {
                            if (err) {
                                console.error('Error al actualizar traspaso:', err);
                                transaction.rollback(() => db.detach());
                                return res.status(500).json({
                                    message: 'Error al actualizar el traspaso'
                                });
                            }

                            const updatePickerQuery = `
                                UPDATE PICKERS SET SURTIENDO = FALSE WHERE PIKER_ID = ?
                            `;

                            transaction.query(updatePickerQuery, [PICKER_ID], (err) => {
                                if (err) {
                                    console.error('Error al actualizar picker:', err);
                                    transaction.rollback(() => db.detach());
                                    return res.status(500).json({
                                        message: 'Error al actualizar el picker'
                                    });
                                }

                                transaction.commit((err) => {
                                    db.detach();
                                    if (err) {
                                        console.error('Error al hacer commit:', err);
                                        return res.status(500).json({
                                            message: 'Error al finalizar la transacción'
                                        });
                                    }

                                    return res.status(200).json({
                                        message: 'Pedido enviado correctamente.'
                                    });
                                });
                            });
                        });
                    })
                    .catch((error) => {
                        console.error('Error al insertar productos:', error);
                        transaction.rollback(() => db.detach());
                        return res.status(500).json({
                            message: 'Error al insertar productos'
                        });
                    });
            });
        });
    });
});




//pedidos
app.get('/pedidos', (req, res) => {
    Firebird.attach(firebirdConfig, (err, db) => {
        if (err) {
            console.error('Error al conectar a Firebird:', err);
            return res.status(500).json({
                message: 'No se realizo ningun cambio, vuelve a intentarlo'
            });
        }

        const query = `SELECT * FROM PEDIDOS_PENDIENTES WHERE ESTATUS IN ('P') ORDER BY HORA DESC`;

        db.query(query, (err, result) => {
            db.detach();

            if (err) {
                console.error('Error en la consulta de pedidos:', err);
                return res.status(500).json({
                    message: 'Error al obtener datos de pedidos'
                });
            }

            return res.status(200).json({
                pendientes: result
            });
        });
    });
});
app.post('/tomar-pedido', (req, res) => {
    const { doctoVeId, pikerId, fechaIni, horaIni } = req.body;

    if (!doctoVeId || !pikerId) {
        return res.status(400).json({
            message: 'DOCTO_VE_ID y PIKER_ID son requeridos'
        });
    }

    Firebird.attach(firebirdConfig, (err, db) => {
        if (err) {
            console.error('Error al conectar a Firebird:', err);
            return res.status(500).json({
                message: 'No se realizó ningún cambio, vuelve a intentarlo'
            });
        }

        // Verificar si el picker ya está surtindo
        const checkSurtidoQuery = `SELECT SURTIENDO FROM PICKERS WHERE PIKER_ID = ?`;

        db.query(checkSurtidoQuery, [pikerId], (err, surtidoResult) => {
            if (err || surtidoResult.length === 0) {
                db.detach();
                console.error('Error verificando SURTIENDO del picker:', err);
                return res.status(500).json({
                    message: 'Error al verificar estado del picker'
                });
            }

            const { SURTIENDO } = surtidoResult[0];

            if (SURTIENDO === true) {
                db.detach();
                return res.status(409).json({
                    message: 'Ya tienes un pedido surtindo, no puedes tomar otro'
                });
            }

            // Continuar con la verificación del estatus del pedido
            const checkQuery = `SELECT ESTATUS, PICKER_ID FROM PEDIDOS_PENDIENTES WHERE DOCTO_VE_ID = ?`;

            db.query(checkQuery, [doctoVeId], (err, result) => {
                if (err || result.length === 0) {
                    db.detach();
                    console.error('Error en la verificación de estatus:', err);
                    return res.status(500).json({
                        message: 'Error al verificar el estatus'
                    });
                }

                const { ESTATUS: estatus, PICKER_ID: currentPickerId } = result[0];

                if (estatus !== 'P') {
                    db.detach();
                    return res.status(409).json({
                        message: `El pedido ya fue tomado (estatus actual: ${estatus})`
                    });
                }

                if (currentPickerId !== null && currentPickerId !== pikerId) {
                    db.detach();
                    return res.status(403).json({
                        message: `Este pedido ya fue tomado por otro picker (ID: ${currentPickerId})`
                    });
                }

                const updateQuery = `
                    UPDATE PEDIDOS_PENDIENTES
                    SET ESTATUS = 'T',
                        PICKER_ID = ?,
                        FECHA_INI = ?,
                        HORA_INI = ?
                    WHERE DOCTO_VE_ID = ?
                `;

                db.query(updateQuery, [pikerId, fechaIni, horaIni, doctoVeId], (err) => {
                    if (err) {
                        db.detach();
                        console.error('Error actualizando pedido:', err);
                        return res.status(500).json({
                            message: 'No se pudo actualizar el pedido'
                        });
                    }

                    // Actualizar SURTIENDO a TRUE porque ya está tomando un pedido
                    const updateSurtidoQuery = `
                        UPDATE PICKERS
                        SET SURTIENDO = TRUE
                        WHERE PIKER_ID = ?
                    `;

                    db.query(updateSurtidoQuery, [pikerId], (err) => {
                        db.detach();

                        if (err) {
                            console.error('Error actualizando estado SURTIENDO del picker:', err);
                            return res.status(200).json({
                                message: 'Pedido tomado con éxito, pero no se pudo actualizar estado SURTIENDO del picker'
                            });
                        }

                        return res.status(200).json({
                            message: 'Pedido tomado con éxito'
                        });
                    });
                });
            });
        });
    });
});



app.post('/detalle-pedido', (req, res) => {
    const {
        doctoVeId
    } = req.body;

    if (!doctoVeId) {
        return res.status(400).json({
            message: 'DOCTO_VE_ID es requerido'
        });
    }

    Firebird.attach(firebirdConfig, (err, db) => {
        if (err) {
            console.error('Error al conectar a Firebird:', err);
            return res.status(500).json({
                message: 'No se realizo ningun cambio, vuelve a intentarlo'
            });
        }

        const detalleQuery = `
     SELECT 
                    COALESCE(CA.CLAVE_ARTICULO, 'NA') AS CODBAR, 
                    DVD.CLAVE_ARTICULO, 
        			DVD.UNIDADES_COMPROM AS UNIDADES,
                    DVD.ARTICULO_ID, 
                    DOCTO_VE_ID, 
                    A.NOMBRE, 
                    COALESCE(NA.LOCALIZACION, 'NA') AS LOCALIZACION, 
                    A.UNIDAD_VENTA
                FROM 
                    DOCTOS_VE_DET DVD
                    INNER JOIN CLAVES_ARTICULOS CA ON CA.ARTICULO_ID = DVD.ARTICULO_ID
                    INNER JOIN ARTICULOS A ON A.ARTICULO_ID = DVD.ARTICULO_ID
                    INNER JOIN NIVELES_ARTICULOS NA ON NA.ARTICULO_ID = DVD.ARTICULO_ID
                WHERE 
                    DOCTO_VE_ID = ?
                    AND CA.ROL_CLAVE_ART_ID = 58486 
                    AND NA.ALMACEN_ID = 188104 
                    AND DVD.UNIDADES_COMPROM > 0
                ORDER BY 
                    COALESCE(NA.LOCALIZACION, 'NA') ASC
    `;

        db.query(detalleQuery, [doctoVeId], (err, result) => {
            db.detach();

            if (err) {
                console.error('Error en la consulta detalle:', err);
                return res.status(500).json({
                    message: 'Error al obtener detalle del pedido'
                });
            }

            return res.status(200).json({
                detalles: result
            });
        });
    });
});
app.post('/update-pedido', (req, res) => {
    const { doctoVeId, estatus } = req.body;

    if (!doctoVeId || !estatus) {
        return res.status(400).json({
            message: 'DOCTO_VE_ID y ESTATUS son requeridos'
        });
    }

    Firebird.attach(firebirdConfig, (err, db) => {
        if (err) {
            console.error('Error al conectar a Firebird:', err);
            return res.status(500).json({
                message: 'No se realizó ningún cambio, vuelve a intentarlo'
            });
        }

        // Primero obtener ESTATUS y PICKER_ID para saber qué hacer y a quién liberar
        const selectQuery = `
            SELECT ESTATUS, PICKER_ID FROM PEDIDOS_PENDIENTES WHERE DOCTO_VE_ID = ?
        `;

        db.query(selectQuery, [doctoVeId], (err, result) => {
            if (err || result.length === 0) {
                db.detach();
                console.error('Error al consultar el estatus:', err);
                return res.status(500).json({
                    message: 'No se pudo verificar el estatus actual'
                });
            }

            const { ESTATUS: currentStatus, PICKER_ID: currentPickerId } = result[0];

            if (currentStatus === 'S' || currentStatus === 'E') {
                db.detach();
                return res.status(200).json({
                    message: `El pedido ya tiene estatus "${currentStatus}". No se realizaron cambios.`
                });
            }

            if (currentStatus === 'T') {
                // Actualizar PEDIDOS_PENDIENTES y luego actualizar SURTIENDO en PICKERS
                const updatePedidoQuery = `
                    UPDATE PEDIDOS_PENDIENTES
                    SET ESTATUS = 'P',
                        PICKER_ID = NULL
                    WHERE DOCTO_VE_ID = ?
                `;

                db.query(updatePedidoQuery, [doctoVeId], (err) => {
                    if (err) {
                        db.detach();
                        console.error('Error actualizando el estatus a P:', err);
                        return res.status(500).json({
                            message: 'No se pudo actualizar el estatus a P'
                        });
                    }

                    // Si había un picker asignado, actualizar SURTIENDO a FALSE para ese picker
                    if (currentPickerId) {
                        const updateSurtidoQuery = `
                            UPDATE PICKERS
                            SET SURTIENDO = FALSE
                            WHERE PIKER_ID = ?
                        `;

                        db.query(updateSurtidoQuery, [currentPickerId], (err) => {
                            db.detach();

                            if (err) {
                                console.error('Error actualizando estado SURTIENDO del picker:', err);
                                return res.status(200).json({
                                    message: 'Pedido liberado correctamente, pero no se pudo actualizar SURTIENDO del picker'
                                });
                            }

                            return res.status(200).json({
                                message: 'Pedido liberado correctamente (estatus cambiado a P)'
                            });
                        });
                    } else {
                        db.detach();
                        return res.status(200).json({
                            message: 'Pedido liberado correctamente (estatus cambiado a P)'
                        });
                    }
                });
            } else {
                db.detach();
                return res.status(400).json({
                    message: `No se puede salir con estatus actual: "${currentStatus}"`
                });
            }
        });
    });
});

app.post('/pedido-enviado', (req, res) => {
    const { doctoId, nuevoEstatus, productos, fechaFin, horaFin } = req.body;

    if (!doctoId || !nuevoEstatus || !productos || productos.length === 0) {
        return res.status(400).json({
            message: 'Faltan datos obligatorios para actualizar el pedido y los productos'
        });
    }

    if (nuevoEstatus !== 'S') {
        return res.status(400).json({
            message: 'El estatus solo puede actualizarse a "S".'
        });
    }

    Firebird.attach(firebirdConfig, (err, db) => {
        if (err) {
            console.error('Error al conectar a Firebird:', err);
            return res.status(500).json({
                message: 'No se realizó ningún cambio, vuelve a intentarlo'
            });
        }

        db.transaction((err, transaction) => {
            if (err) {
                console.error('Error al iniciar la transacción:', err);
                db.detach();
                return res.status(500).json({
                    message: 'Error al iniciar la transacción'
                });
            }

            const selectQuery = `SELECT ESTATUS, PICKER_ID FROM PEDIDOS_PENDIENTES WHERE DOCTO_VE_ID = ?`;

            transaction.query(selectQuery, [doctoId], (err, result) => {
                if (err || result.length === 0) {
                    console.error('Error al consultar el estatus actual:', err);
                    transaction.rollback(() => db.detach());
                    return res.status(500).json({
                        message: 'Error al consultar el estatus actual del pedido'
                    });
                }

                const { ESTATUS: estatusActual, PICKER_ID } = result[0];

                if (estatusActual === 'E' || estatusActual === 'S') {
                    transaction.rollback(() => db.detach());
                    return res.status(400).json({
                        message: 'El pedido ya fue enviado. Sal de este pedido.'
                    });
                }

                const insertQuery = `
                    INSERT INTO PEDIDOS_DET (DOCTO_VE_ID, ARTICULO_ID, CLAVE_ARTICULO, UNIDADES, SURTIDAS)
                    VALUES (?, ?, ?, ?, ?)
                `;

                const promises = productos.map(({ ARTICULO_ID, CLAVE_ARTICULO, UNIDADES, SURTIDAS }) => {
                    if (!ARTICULO_ID || !CLAVE_ARTICULO || isNaN(UNIDADES) || isNaN(SURTIDAS)) {
                        console.error('Error en datos del producto:', { ARTICULO_ID, CLAVE_ARTICULO, UNIDADES, SURTIDAS });
                        return Promise.reject('Datos inválidos del producto');
                    }

                    return new Promise((resolve, reject) => {
                        transaction.query(insertQuery, [doctoId, ARTICULO_ID, CLAVE_ARTICULO, UNIDADES, SURTIDAS], (err) => {
                            err ? reject(err) : resolve();
                        });
                    });
                });

                Promise.all(promises)
                    .then(() => {
                        const updatePedidoQuery = `
                            UPDATE PEDIDOS_PENDIENTES
                            SET ESTATUS = ?, FECHA_FIN = ?, HORA_FIN = ?
                            WHERE DOCTO_VE_ID = ?
                        `;

                        transaction.query(updatePedidoQuery, [nuevoEstatus, fechaFin, horaFin, doctoId], (err) => {
                            if (err) {
                                console.error('Error al actualizar pedido:', err);
                                transaction.rollback(() => db.detach());
                                return res.status(500).json({
                                    message: 'No se pudo actualizar el estatus del pedido'
                                });
                            }

                            const updatePickerQuery = `
                                UPDATE PICKERS SET SURTIENDO = FALSE WHERE PIKER_ID = ?
                            `;

                            transaction.query(updatePickerQuery, [PICKER_ID], (err) => {
                                if (err) {
                                    console.error('Error al actualizar picker:', err);
                                    transaction.rollback(() => db.detach());
                                    return res.status(500).json({
                                        message: 'Error al actualizar el picker'
                                    });
                                }

                                transaction.commit((err) => {
                                    db.detach();
                                    if (err) {
                                        console.error('Error al hacer commit:', err);
                                        return res.status(500).json({
                                            message: 'Error al finalizar la transacción'
                                        });
                                    }

                                    return res.status(200).json({
                                        message: 'Pedido enviado correctamente.'
                                    });
                                });
                            });
                        });
                    })
                    .catch((error) => {
                        console.error('Error al insertar productos:', error);
                        transaction.rollback(() => db.detach());
                        return res.status(500).json({
                            message: 'Error al insertar productos'
                        });
                    });
            });
        });
    });
});




//traspasos
app.get('/traspasos', (req, res) => {
    Firebird.attach(firebirdConfig, (err, db) => {
        if (err) {
            console.error('Error al conectar a Firebird:', err);
            return res.status(500).json({
                message: 'No se realizo ningun cambio, vuelve a intentarlo'
            });
        }

        const query = `SELECT * FROM TRASPASOS_PENDIENTES WHERE ESTATUS IN ('P') ORDER BY HORA DESC`;

        db.query(query, (err, result) => {
            db.detach();

            if (err) {
                console.error('Error en la consulta de pedidos:', err);
                return res.status(500).json({
                    message: 'Error al obtener datos de pedidos'
                });
            }

            return res.status(200).json({
                pendientes: result
            });
        });
    });
});
app.post('/traspaso-tomado', (req, res) => {
    const {
        traspasoInId,
        pikerId,
        fechaIni,
        horaIni
    } = req.body;

    if (!traspasoInId || !pikerId) {
        return res.status(400).json({
            message: 'traspaso_in_id y PIKER_ID son requeridos'
        });
    }

    Firebird.attach(firebirdConfig, (err, db) => {
        if (err) {
            console.error('Error al conectar a Firebird:', err);
            return res.status(500).json({
                message: 'No se realizo ningun cambio, vuelve a intentarlo'
            });
        }

        // Verificar si el picker ya está surtindo
        const checkSurtidoQuery = `SELECT SURTIENDO FROM PICKERS WHERE PIKER_ID = ?`;

        db.query(checkSurtidoQuery, [pikerId], (err, surtidoResult) => {
            if (err || surtidoResult.length === 0) {
                db.detach();
                console.error('Error verificando SURTIENDO del picker:', err);
                return res.status(500).json({
                    message: 'Error al verificar estado del picker'
                });
            }

            const { SURTIENDO } = surtidoResult[0];

            if (SURTIENDO === true) {
                db.detach();
                return res.status(409).json({
                    message: 'Ya tienes un pedido surtindo, no puedes tomar otro'
                });
            }

            // Continuar con la verificación del estatus del traspaso
            const checkQuery = `SELECT ESTATUS, PICKER_ID FROM TRASPASOS_PENDIENTES WHERE TRASPASO_IN_ID = ?`;

            db.query(checkQuery, [traspasoInId], (err, result) => {
                if (err || result.length === 0) {
                    db.detach();
                    console.error('Error en la verificación de estatus:', err);
                    return res.status(500).json({
                        message: 'Error al verificar el estatus'
                    });
                }

                const { ESTATUS: estatus, PICKER_ID: currentPickerId } = result[0];

                if (estatus !== 'P') {
                    db.detach();
                    return res.status(409).json({
                        message: `El pedido ya fue tomado (estatus actual: ${estatus})`
                    });
                }

                if (currentPickerId !== null && currentPickerId !== pikerId) {
                    db.detach();
                    return res.status(403).json({
                        message: `Este traspaso ya fue tomado por otro picker (ID: ${currentPickerId})`
                    });
                }

                const updateQuery = `
                    UPDATE TRASPASOS_PENDIENTES
                    SET ESTATUS = 'T',
                        PICKER_ID = ?,
                        FECHA_INI = ?,
                        HORA_INI = ?
                    WHERE TRASPASO_IN_ID = ?
                `;

                db.query(updateQuery, [pikerId, fechaIni, horaIni, traspasoInId], (err) => {
                    if (err) {
                        db.detach();
                        console.error('Error actualizando pedido:', err);
                        return res.status(500).json({
                            message: 'No se pudo actualizar el pedido'
                        });
                    }

                    // Actualizar SURTIENDO a TRUE porque ya está tomando un pedido
                    const updateSurtidoQuery = `
                        UPDATE PICKERS
                        SET SURTIENDO = TRUE
                        WHERE PIKER_ID = ?
                    `;

                    db.query(updateSurtidoQuery, [pikerId], (err) => {
                        db.detach();

                        if (err) {
                            console.error('Error actualizando estado SURTIENDO del picker:', err);
                            // Aun así respondemos éxito porque el pedido fue tomado
                            return res.status(200).json({
                                message: 'Pedido tomado con éxito, pero no se pudo actualizar estado SURTIENDO del picker'
                            });
                        }

                        return res.status(200).json({
                            message: 'Pedido tomado con éxito'
                        });
                    });
                });
            });
        });
    });
});


app.post('/tras-detalle', (req, res) => {
    const {
        traspasoInId
    } = req.body;

    if (!traspasoInId) {
        return res.status(400).json({
            message: 'DOCTO_VE_ID es requerido'
        });
    }

    Firebird.attach(firebirdConfig, (err, db) => {
        if (err) {
            console.error('Error al conectar a Firebird:', err);
            return res.status(500).json({
                message: 'No se realizo ningun cambio, vuelve a intentarlo'
            });
        }

        const detalleQuery = `
     SELECT
    COALESCE(CA.CLAVE_ARTICULO, 'NA') AS CODBAR,
    TID.CLAVE_ARTICULO,
    UNIDADES,
    TID.ARTICULO_ID,
    TRASPASO_IN_ID,
    A.NOMBRE,
    COALESCE(NA.LOCALIZACION, 'NA') AS LOCALIZACION,
    A.UNIDAD_VENTA
FROM
    TRASPASOS_IN_DET TID
    INNER JOIN CLAVES_ARTICULOS CA ON CA.ARTICULO_ID = TID.ARTICULO_ID
    INNER JOIN ARTICULOS A ON A.ARTICULO_ID = TID.ARTICULO_ID
    INNER JOIN NIVELES_ARTICULOS NA ON NA.ARTICULO_ID = TID.ARTICULO_ID
WHERE
    TRASPASO_IN_ID = ?
    AND CA.ROL_CLAVE_ART_ID = 58486
    AND NA.ALMACEN_ID = 188104
ORDER BY
    COALESCE(NA.LOCALIZACION, 'NA') ASC
    `;

        db.query(detalleQuery, [traspasoInId], (err, result) => {
            db.detach();

            if (err) {
                console.error('Error en la consulta detalle:', err);
                return res.status(500).json({
                    message: 'Error al obtener detalle del pedido'
                });
            }

            return res.status(200).json({
                detalles: result
            });
        });
    });
});

app.post('/traspaso-update', (req, res) => {
    const { traspasoInId, estatus } = req.body;

    if (!traspasoInId || !estatus) {
        return res.status(400).json({
            message: 'TRASPASO_IN_ID y ESTATUS son requeridos'
        });
    }

    Firebird.attach(firebirdConfig, (err, db) => {
        if (err) {
            console.error('Error al conectar a Firebird:', err);
            return res.status(500).json({
                message: 'No se realizó ningún cambio, vuelve a intentarlo'
            });
        }

        // Obtener el ESTATUS y PICKER_ID actual
        const selectQuery = `
            SELECT ESTATUS, PICKER_ID FROM TRASPASOS_PENDIENTES WHERE TRASPASO_IN_ID = ?
        `;

        db.query(selectQuery, [traspasoInId], (err, result) => {
            if (err || result.length === 0) {
                db.detach();
                console.error('Error al consultar el estatus:', err);
                return res.status(500).json({
                    message: 'No se pudo verificar el estatus actual'
                });
            }

            const { ESTATUS: currentStatus, PICKER_ID: currentPickerId } = result[0];

            if (currentStatus === 'S' || currentStatus === 'E') {
                db.detach();
                return res.status(200).json({
                    message: `El traspaso ya tiene estatus "${currentStatus}". No se realizaron cambios.`
                });
            }

            if (currentStatus === 'T') {
                const updateQuery = `
                    UPDATE TRASPASOS_PENDIENTES
                    SET ESTATUS = 'P',
                        PICKER_ID = NULL
                    WHERE TRASPASO_IN_ID = ?
                `;

                db.query(updateQuery, [traspasoInId], (err) => {
                    if (err) {
                        db.detach();
                        console.error('Error actualizando el estatus a P:', err);
                        return res.status(500).json({
                            message: 'No se pudo actualizar el estatus a P'
                        });
                    }

                    // Si había un picker asignado, actualizar SURTIENDO a FALSE
                    if (currentPickerId) {
                        const updateSurtidoQuery = `
                            UPDATE PICKERS
                            SET SURTIENDO = FALSE
                            WHERE PIKER_ID = ?
                        `;

                        db.query(updateSurtidoQuery, [currentPickerId], (err) => {
                            db.detach();

                            if (err) {
                                console.error('Error actualizando estado SURTIENDO del picker:', err);
                                return res.status(200).json({
                                    message: 'Traspaso liberado correctamente, pero no se pudo actualizar SURTIENDO del picker'
                                });
                            }

                            return res.status(200).json({
                                message: 'Traspaso liberado correctamente (estatus cambiado a P)'
                            });
                        });
                    } else {
                        db.detach();
                        return res.status(200).json({
                            message: 'Traspaso liberado correctamente (estatus cambiado a P)'
                        });
                    }
                });
            } else {
                db.detach();
                return res.status(400).json({
                    message: `No se puede salir con estatus actual: "${currentStatus}"`
                });
            }
        });
    });
});


app.post('/traspaso-enviado', (req, res) => {
    const {
        traspasoId,
        nuevoEstatus,
        productos
    } = req.body;

    // Validar que los datos necesarios se pasen en la solicitud
    if (!traspasoId || !nuevoEstatus || !productos || productos.length === 0) {
        return res.status(400).json({
            message: 'Faltan datos obligatorios para actualizar el pedido y los productos'
        });
    }

    // Verificar que el estatus sea 'S' como se requiere
    if (nuevoEstatus !== 'S') {
        return res.status(400).json({
            message: 'El estatus solo puede actualizarse a "S".'
        });
    }

    Firebird.attach(firebirdConfig, (err, db) => {
        if (err) {
            console.error('Error al conectar a Firebird:', err);
            return res.status(500).json({
                message: 'No se realizo ningun cambio, vuelve a intentarlo'
            });
        }

        // Iniciar transacción para asegurar que ambas acciones sean atómicas
        db.transaction((err, transaction) => {
            if (err) {
                console.error('Error al iniciar la transacción:', err);
                db.detach();
                return res.status(500).json({
                    message: 'Error al iniciar la transacción'
                });
            }

            // Paso 1: Actualizar el estatus del pedido en la tabla VENTANILLA_PENDIENTES
            const updateQuery = `
        UPDATE TRASPASOS_PENDIENTES
        SET ESTATUS = ?
        WHERE TRASPASO_IN_ID = ?
      `;

            transaction.query(updateQuery, [nuevoEstatus, traspasoId], (err) => {
                if (err) {
                    console.error('Error al actualizar pedido:', err);
                    transaction.rollback((rollbackErr) => {
                        if (rollbackErr) {
                            console.error('Error al hacer rollback de la transacción:', rollbackErr);
                        }
                        db.detach();
                        return res.status(500).json({
                            message: 'No se pudo actualizar el pedido'
                        });
                    });
                    return;
                }

                const insertQuery = `
          INSERT INTO TRASPASOS_DET (TRASPASO_IN_ID, ARTICULO_ID, CLAVE_ARTICULO, UNIDADES, SURTIDAS)
          VALUES (?, ?, ?, ?, ?)
        `;

                const promises = productos.map((producto) => {
                    const {
                        ARTICULO_ID,
                        CLAVE_ARTICULO,
                        UNIDADES,
                        SURTIDAS
                    } = producto;

                    console.log('Producto recibido:', producto);

                    if (!ARTICULO_ID || !CLAVE_ARTICULO) {
                        console.error('Error: ARTICULO_ID o CLAVE_ARTICULO son inválidos', producto);
                        return Promise.reject('Faltan valores de ARTICULO_ID o CLAVE_ARTICULO');
                    }

                    if (isNaN(UNIDADES) || isNaN(SURTIDAS)) {
                        console.error('Error: UNIDADES o SURTIDAS no son números válidos', producto);
                        return Promise.reject('Unidades o Surtidas no son válidos');
                    }

                    return new Promise((resolve, reject) => {
                        transaction.query(insertQuery, [traspasoId, ARTICULO_ID, CLAVE_ARTICULO, UNIDADES, SURTIDAS], (err) => {
                            if (err) {
                                console.error('Error al insertar detalle en VENTANILLA_DET:', err);
                                reject(err);
                            } else {
                                resolve();
                            }
                        });
                    });
                });

                Promise.all(promises)
                    .then(() => {
                        transaction.commit((err) => {
                            if (err) {
                                console.error('Error al hacer commit de la transacción:', err);
                                db.detach();
                                return res.status(500).json({
                                    message: 'Error al hacer commit de la transacción'
                                });
                            }

                            db.detach();
                            return res.status(200).json({
                                message: 'Traspaso enviado correctamente.'
                            });
                        });
                    })
                    .catch((error) => {
                        console.error('Error al insertar los productos:', error);
                        transaction.rollback((rollbackErr) => {
                            if (rollbackErr) {
                                console.error('Error al hacer rollback de la transacción:', rollbackErr);
                            }
                            db.detach();
                            return res.status(500).json({
                                message: 'Error al insertar productos'
                            });
                        });
                    });
            });
        });
    });
});

//endpoint para verificar el estado del servidor
app.get('/checar-server', (req, res) => {
    console.log('Health check recibido - Servidor activo');
    res.status(200).json({
        status: 'active',
        server: 'Firebird Gateway API',
        timestamp: new Date().toISOString(),
        firebirdConnection: firebirdConfig.host,
        version: '1.0.0'
    });
});
app.listen(PORT, '0.0.0.0', () => {
    console.log(`Servidor backend escuchando en http://0.0.0.0:${PORT}`);
});
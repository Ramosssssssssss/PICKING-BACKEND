const express = require('express');
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
    user: 'SYSDBA',
    password: 'BlueMamut$23',
    lowercase_keys: false,
    role: null,
    pageSize: 4096,
    // timelife: 25,
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
                SELECT TID.CLAVE_ARTICULO, NOMBRE, UNIDADES, A.UNIDAD_VENTA AS UMED, CA.CLAVE_ARTICULO AS CODIGOB 
                FROM TRASPASOS_IN_DET TID
                INNER JOIN ARTICULOS A ON A.ARTICULO_ID = TID.ARTICULO_ID
                INNER JOIN CLAVES_ARTICULOS CA ON CA.ARTICULO_ID = TID.ARTICULO_ID
                WHERE TRASPASO_IN_ID = ? AND CA.ROL_CLAVE_ART_ID = 58486
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

        const checkQuery = `SELECT ESTATUS FROM VENTANILLA_PENDIENTES WHERE TRASPASO_IN_ID = ?`;

        db.query(checkQuery, [traspasoInId], (err, result) => {
            if (err || result.length === 0) {
                db.detach();
                console.error('Error en la verificación de estatus:', err);
                return res.status(500).json({
                    message: 'Error al verificar el estatus'
                });
            }

            const estatus = result[0].ESTATUS;

            if (estatus !== 'P') {
                db.detach();
                return res.status(409).json({
                    message: `El traspaso ya fue tomado (estatus actual: ${estatus})`
                });
            }

            const updateQuery = `
        UPDATE VENTANILLA_PENDIENTES
        SET ESTATUS = 'T',
            PICKER_ID = ?,
            FECHA_INI = ?,
            HORA_INI = ?
        WHERE TRASPASO_IN_ID = ?
      `;

            db.query(updateQuery, [pikerId, fechaIni, horaIni, traspasoInId], (err) => {
                db.detach();

                if (err) {
                    console.error('Error actualizando traspaso:', err);
                    return res.status(500).json({
                        message: 'No se pudo actualizar el traspaso'
                    });
                }

                return res.status(200).json({
                    message: 'Traspaso tomado con éxito'
                });
            });
        });
    });
});

// ACTUALIZAR TRASPASO
app.post('/update-traspaso', (req, res) => {
    const {
        traspasoInId,
        estatus
    } = req.body;

    if (!traspasoInId || !estatus) {
        return res.status(400).json({
            message: 'TRASPASO_IN_ID y ESTATUS son requeridos'
        });
    }
    console.log('TRASPASO_IN_ID:', traspasoInId);
    console.log('ESTATUS:', estatus);
    Firebird.attach(firebirdConfig, (err, db) => {
        if (err) {
            console.error('Error al conectar a Firebird:', err);
            return res.status(500).json({
                message: 'No se realizo ningun cambio, vuelve a intentarlo'
            });
        }

        const query =
            `
        UPDATE VENTANILLA_PENDIENTES
        SET ESTATUS = ? 
        WHERE TRASPASO_IN_ID = ?
      `;
        //DEBBUGING, la borrare dsps
        db.query(query, [estatus, traspasoInId], (err, result) => {
            if (err) {


                console.error('Error al ejecutar el UPDATE:', err);

                return res.status(500).json({
                    message: 'Error al actualizar el traspaso'
                });
            }
            db.detach();

            console.log('Resultado del UPDATE:', result);
            res.status(200).json({
                message: 'Traspaso actualizado'
            });
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
                message: 'No se realizo ningun cambio, vuelve a intentarlo'
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

            const updateQuery = `
        UPDATE VENTANILLA_PENDIENTES
        SET ESTATUS = ?,
            FECHA_FIN = ?,
            HORA_FIN = ?
        WHERE TRASPASO_IN_ID = ?
      `;

            transaction.query(updateQuery, [nuevoEstatus, fechaFin, horaFin, traspasoId], (err) => {
                if (err) {
                    console.error('Error al actualizar traspaso:', err);
                    transaction.rollback((rollbackErr) => {
                        if (rollbackErr) {
                            console.error('Error al hacer rollback de la transacción:', rollbackErr);
                        }
                        db.detach();
                        return res.status(500).json({
                            message: 'No se pudo actualizar el traspaso'
                        });
                    });
                    return;
                }

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
                                message: 'Pedido enviado correctamente.'
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


app.post('/traspaso-pedido-enviado', (req, res) => {
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
                message: 'No se realizo ningun cambio, vuelve a intentarlo'
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

            const updateQuery = `
        UPDATE TRASPASOS_PENDIENTES
        SET ESTATUS = ?,
            FECHA_FIN = ?,
            HORA_FIN = ?
        WHERE TRASPASO_IN_ID = ?
      `;

            transaction.query(updateQuery, [nuevoEstatus, fechaFin, horaFin, traspasoId], (err) => {
                if (err) {
                    console.error('Error al actualizar traspaso:', err);
                    transaction.rollback((rollbackErr) => {
                        if (rollbackErr) {
                            console.error('Error al hacer rollback de la transacción:', rollbackErr);
                        }
                        db.detach();
                        return res.status(500).json({
                            message: 'No se pudo actualizar el traspaso'
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
                                console.error('Error al insertar detalle en TRASPASOS_DET:', err);
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
                                message: 'Pedido enviado correctamente.'
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
    const {
        doctoVeId,
        pikerId,
        fechaIni,
        horaIni
    } = req.body;

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

        const checkQuery = `SELECT ESTATUS FROM PEDIDOS_PENDIENTES WHERE DOCTO_VE_ID = ?`;

        db.query(checkQuery, [doctoVeId], (err, result) => {
            if (err || result.length === 0) {
                db.detach();
                console.error('Error en la verificación de estatus:', err);
                return res.status(500).json({
                    message: 'Error al verificar el estatus'
                });
            }

            const estatus = result[0].ESTATUS;

            if (estatus !== 'P') {
                db.detach();
                return res.status(409).json({
                    message: `El pedido ya fue tomado (estatus actual: ${estatus})`
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
                db.detach();

                if (err) {
                    console.error('Error actualizando pedido:', err);
                    return res.status(500).json({
                        message: 'No se pudo actualizar el pedido'
                    });
                }

                return res.status(200).json({
                    message: 'Pedido tomado con éxito'
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
    const {
        doctoVeId,
        estatus
    } = req.body;

    if (!doctoVeId || !estatus) {
        return res.status(400).json({
            message: 'DOCTO_VE_ID y ESTATUS son requeridos'
        });
    }
    console.log('DOCTO_VE_ID:', doctoVeId);
    console.log('ESTATUS:', estatus);
    Firebird.attach(firebirdConfig, (err, db) => {
        if (err) {
            console.error('Error al conectar a Firebird:', err);
            return res.status(500).json({
                message: 'No se realizo ningun cambio, vuelve a intentarlo'
            });
        }

        const query =
            `
        UPDATE PEDIDOS_PENDIENTES
        SET ESTATUS = ? 
        WHERE DOCTO_VE_ID = ?
      `;
        //DEBBUGING, la borrare dsps
        db.query(query, [estatus, doctoVeId], (err, result) => {
            if (err) {

                console.error('Error al ejecutar el UPDATE:', err);
                return res.status(500).json({
                    message: 'Error al actualizar el pedido'
                });
            }
            db.detach();

            console.log('Resultado del UPDATE:', result);
            res.status(200).json({
                message: 'pedido actualizado'
            });
        });
    });
});
app.post('/pedido-enviado', (req, res) => {
    const {
        doctoId,
        nuevoEstatus,
        productos,
        fechaFin,
        horaFin
    } = req.body;

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
                message: 'No se realizo ningun cambio, vuelve a intentarlo'
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

            const updateQuery = `
        UPDATE PEDIDOS_PENDIENTES
        SET ESTATUS = ?,
            FECHA_FIN = ?,
            HORA_FIN = ?
        WHERE DOCTO_VE_ID = ?
      `;

            transaction.query(updateQuery, [nuevoEstatus, fechaFin, horaFin, doctoId], (err) => {
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
          INSERT INTO PEDIDOS_DET (DOCTO_VE_ID, ARTICULO_ID, CLAVE_ARTICULO, UNIDADES, SURTIDAS)
          VALUES (?, ?, ?, ?, ?)
        `;

                const promises = productos.map((producto) => {
                    const {
                        ARTICULO_ID,
                        CLAVE_ARTICULO,
                        UNIDADES,
                        SURTIDAS
                    } = producto;

                    if (!ARTICULO_ID || !CLAVE_ARTICULO) {
                        console.error('Error: ARTICULO_ID o CLAVE_ARTICULO son inválidos', producto);
                        return Promise.reject('Faltan valores de ARTICULO_ID o CLAVE_ARTICULO');
                    }

                    if (isNaN(UNIDADES) || isNaN(SURTIDAS)) {
                        console.error('Error: UNIDADES o SURTIDAS no son números válidos', producto);
                        return Promise.reject('Unidades o Surtidas no son válidos');
                    }

                    return new Promise((resolve, reject) => {
                        transaction.query(insertQuery, [doctoId, ARTICULO_ID, CLAVE_ARTICULO, UNIDADES, SURTIDAS], (err) => {
                            if (err) {
                                console.error('Error al insertar detalle en PEDIDOS_DET:', err);
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
                                message: 'Pedido enviado correctamente.'
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
            message: 'transpaso_in_id y PIKER_ID son requeridos'
        });
    }

    Firebird.attach(firebirdConfig, (err, db) => {
        if (err) {
            console.error('Error al conectar a Firebird:', err);
            return res.status(500).json({
                message: 'No se realizo ningun cambio, vuelve a intentarlo'
            });
        }

        const checkQuery = `SELECT ESTATUS FROM TRASPASOS_PENDIENTES WHERE TRASPASO_IN_ID = ?`;

        db.query(checkQuery, [traspasoInId], (err, result) => {
            if (err || result.length === 0) {
                db.detach();
                console.error('Error en la verificación de estatus:', err);
                return res.status(500).json({
                    message: 'Error al verificar el estatus'
                });
            }

            const estatus = result[0].ESTATUS;

            if (estatus !== 'P') {
                db.detach();
                return res.status(409).json({
                    message: `El pedido ya fue tomado (estatus actual: ${estatus})`
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
                db.detach();

                if (err) {
                    console.error('Error actualizando pedido:', err);
                    return res.status(500).json({
                        message: 'No se pudo actualizar el pedido'
                    });
                }

                return res.status(200).json({
                    message: 'pedido tomado con éxito'
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
    const {
        traspasoInId,
        estatus
    } = req.body;

    if (!traspasoInId || !estatus) {
        return res.status(400).json({
            message: 'DOCTO_VE_ID y ESTATUS son requeridos'
        });
    }
    console.log('TRASPASO_IN_ID:', traspasoInId);
    console.log('ESTATUS:', estatus);
    Firebird.attach(firebirdConfig, (err, db) => {
        if (err) {
            console.error('Error al conectar a Firebird:', err);
            return res.status(500).json({
                message: 'No se realizo ningun cambio, vuelve a intentarlo'
            });
        }

        const query =
            `
        UPDATE TRASPASOS_PENDIENTES
        SET ESTATUS = ? 
        WHERE TRASPASO_IN_ID = ?
      `;
        //DEBBUGING, la borrare dsps
        db.query(query, [estatus, traspasoInId], (err, result) => {
            if (err) {
                db.detach();

                console.error('Error al ejecutar el UPDATE:', err);
                return res.status(500).json({
                    message: 'Error al actualizar el pedido'
                });
            }
            db.detach();

            console.log('Resultado del UPDATE:', result);
            res.status(200).json({
                message: 'pedido actualizado Y ACTUALIZADO A S'
            });
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
const express = require('express');
const path = require('path');
const nodemailer = require('nodemailer');
const crypto = require('crypto');
const fs = require('fs');
require('dotenv').config();

const app = express();
const port = process.env.PORT || 3001;

// Middleware
app.use(express.json());
app.use(express.static(path.join(__dirname, 'public')));

// Almacenamiento temporal de reservas (en producción usaríamos una base de datos)
const reservas = new Map();

// Configuración del transporter de email
let transporter;

const configPath = path.join(__dirname, 'config.json');

// Leer configuración
function leerConfig() {
    try {
        if (!fs.existsSync(configPath)) {
            // Configuración por defecto
            return { pago_tarjeta: false, pago_bizum: true };
        }
        const data = fs.readFileSync(configPath, 'utf-8');
        return JSON.parse(data);
    } catch (e) {
        return { pago_tarjeta: false, pago_bizum: true };
    }
}

// Guardar configuración
function guardarConfig(config) {
    fs.writeFileSync(configPath, JSON.stringify(config, null, 2));
}

async function initializeTransporter() {
    try {
        transporter = nodemailer.createTransport({
            service: 'gmail',
            auth: {
                user: 'labarberiadeomar@gmail.com',
                pass: 'dlxmcnmdvppkctcf'
            }
        });

        // Verificar la conexión
        await transporter.verify();
        console.log('El servidor está listo para enviar emails');
        return true;
    } catch (error) {
        console.error('Error al inicializar el transporter:', error);
        return false;
    }
}

// Función para obtener el nombre completo del servicio
function getNombreServicio(servicio) {
    switch(servicio) {
        case 'corte':
            return 'Corte de Pelo';
        case 'barba':
            return 'Arreglo de Barba';
        case 'corte-barba':
            return 'Corte + Barba';
        default:
            return servicio;
    }
}

// Función para generar un ID único para la reserva
function generarIdReserva() {
    return crypto.randomBytes(16).toString('hex');
}

// Ruta para manejar las reservas
app.post('/api/reservas', async (req, res) => {
    try {
        if (!transporter) {
            const initialized = await initializeTransporter();
            if (!initialized) {
                throw new Error('El servicio de email no está disponible');
            }
        }

        const { nombre, telefono, email, servicio, fecha, hora } = req.body;
        
        // Validación básica de datos
        if (!nombre || !telefono || !email || !servicio || !fecha || !hora) {
            return res.status(400).json({
                success: false,
                message: 'Todos los campos son obligatorios'
            });
        }

        // Validación y formateo del nombre
        const nombreFormateado = nombre.trim()
            .split(' ')
            .map(palabra => palabra.charAt(0).toUpperCase() + palabra.slice(1).toLowerCase())
            .join(' ');

        if (nombreFormateado.length < 3) {
            return res.status(400).json({
                success: false,
                message: 'El nombre debe tener al menos 3 caracteres'
            });
        }

        // Validación del número de teléfono
        if (!/^\d{9}$/.test(telefono)) {
            return res.status(400).json({
                success: false,
                message: 'El número de teléfono debe tener exactamente 9 dígitos'
            });
        }

        const nombreServicio = getNombreServicio(servicio);
        const idReserva = generarIdReserva();

        // Guardar la reserva
        reservas.set(idReserva, {
            nombre: nombreFormateado,
            telefono,
            email,
            servicio,
            fecha,
            hora,
            estado: 'confirmada',
            fechaCreacion: new Date().toISOString()
        });

        // URL de cancelación
        const urlCancelacion = `http://localhost:${port}/cancelar/${idReserva}`;

        // Email para el cliente
        const mailOptionsCliente = {
            from: 'labarberiadeomar@gmail.com',
            to: email,
            subject: 'Confirmación de Reserva - Barbería Omar',
            html: `
                <h2>¡Gracias por tu reserva!</h2>
                <p>Hola ${nombreFormateado},</p>
                <p>Tu reserva ha sido confirmada con los siguientes detalles:</p>
                <ul style="list-style: none; padding: 0;">
                    <li style="margin-bottom: 10px;">
                        <span style="font-size: 20px;">✂️</span>
                        <strong>Servicio:</strong> ${nombreServicio}
                    </li>
                    <li style="margin-bottom: 10px;">
                        <span style="font-size: 20px;">📅</span>
                        <strong>Fecha:</strong> ${fecha}
                    </li>
                    <li style="margin-bottom: 10px;">
                        <span style="font-size: 20px;">⏰</span>
                        <strong>Hora:</strong> ${hora}
                    </li>
                </ul>
                <p>Si necesitas cancelar tu reserva, puedes hacerlo haciendo clic en el siguiente enlace:</p>
                <p style="text-align: center; margin: 20px 0;">
                    <a href="${urlCancelacion}" 
                       style="background-color: #dc3545; 
                              color: white; 
                              padding: 10px 20px; 
                              text-decoration: none; 
                              border-radius: 5px;
                              display: inline-block;
                              font-weight: bold;
                              font-size: 16px;">
                        Cancelar Reserva
                    </a>
                </p>
                <p style="color: #666; font-size: 14px;">Este enlace es único y personal para tu reserva.</p>
                <p>¡Te esperamos!</p>
                <br>
                <p>Saludos,</p>
                <p>Barbería Omar</p>
            `
        };

        // Email para la barbería
        const mailOptionsBarberia = {
            from: 'labarberiadeomar@gmail.com',
            to: 'labarberiadeomar@gmail.com',
            subject: 'Nueva Reserva',
            html: `
                <h2>Nueva Reserva Recibida</h2>
                <p>Detalles de la reserva:</p>
                <ul style="list-style: none; padding: 0;">
                    <li style="margin-bottom: 10px;">
                        <span style="font-size: 20px;">👤</span>
                        <strong>Cliente:</strong> ${nombreFormateado}
                    </li>
                    <li style="margin-bottom: 10px;">
                        <span style="font-size: 20px;">📱</span>
                        <strong>Teléfono:</strong> ${telefono}
                    </li>
                    <li style="margin-bottom: 10px;">
                        <span style="font-size: 20px;">📧</span>
                        <strong>Email:</strong> ${email}
                    </li>
                    <li style="margin-bottom: 10px;">
                        <span style="font-size: 20px;">✂️</span>
                        <strong>Servicio:</strong> ${nombreServicio}
                    </li>
                    <li style="margin-bottom: 10px;">
                        <span style="font-size: 20px;">📅</span>
                        <strong>Fecha:</strong> ${fecha}
                    </li>
                    <li style="margin-bottom: 10px;">
                        <span style="font-size: 20px;">⏰</span>
                        <strong>Hora:</strong> ${hora}
                    </li>
                    <li style="margin-bottom: 10px;">
                        <span style="font-size: 20px;">🔑</span>
                        <strong>ID de Reserva:</strong> ${idReserva}
                    </li>
                </ul>
            `
        };

        try {
            // Enviar emails
            await transporter.sendMail(mailOptionsCliente);
            await transporter.sendMail(mailOptionsBarberia);
        } catch (emailError) {
            console.error('Error al enviar emails:', emailError);
            // Continuamos aunque falle el email
        }

        res.json({ success: true, message: 'Reserva realizada con éxito' });
    } catch (error) {
        console.error('Error al procesar la reserva:', error);
        res.status(500).json({ 
            success: false, 
            message: 'Error al procesar la reserva',
            error: error.message 
        });
    }
});

// Ruta para cancelar una reserva
app.get('/cancelar/:id', async (req, res) => {
    try {
        const { id } = req.params;
        const reserva = reservas.get(id);

        if (!reserva) {
            return res.status(404).send(`
                <html>
                    <head>
                        <title>Reserva no encontrada</title>
                        <style>
                            body { font-family: Arial, sans-serif; text-align: center; padding: 50px; }
                            .error { color: #dc3545; }
                        </style>
                    </head>
                    <body>
                        <h1 class="error">Reserva no encontrada</h1>
                        <p>La reserva que intentas cancelar no existe o ya ha sido cancelada.</p>
                    </body>
                </html>
            `);
        }

        // Enviar email de confirmación de cancelación
        const mailOptionsCancelacion = {
            from: 'labarberiadeomar@gmail.com',
            to: reserva.email,
            subject: 'Reserva Cancelada - Barbería Omar',
            html: `
                <h2>Reserva Cancelada</h2>
                <p>Hola ${reserva.nombre},</p>
                <p>Tu reserva ha sido cancelada exitosamente.</p>
                <p>Detalles de la reserva cancelada:</p>
                <ul style="list-style: none; padding: 0;">
                    <li style="margin-bottom: 10px;">
                        <span style="font-size: 20px;">✂️</span>
                        <strong>Servicio:</strong> ${getNombreServicio(reserva.servicio)}
                    </li>
                    <li style="margin-bottom: 10px;">
                        <span style="font-size: 20px;">📅</span>
                        <strong>Fecha:</strong> ${reserva.fecha}
                    </li>
                    <li style="margin-bottom: 10px;">
                        <span style="font-size: 20px;">⏰</span>
                        <strong>Hora:</strong> ${reserva.hora}
                    </li>
                </ul>
                <p>Si necesitas hacer una nueva reserva, puedes hacerlo en nuestra web:</p>
                <p style="text-align: center; margin: 20px 0;">
                    <a href="http://localhost:${port}/#reservas" 
                       style="background-color: #28a745; 
                              color: white; 
                              padding: 10px 20px; 
                              text-decoration: none; 
                              border-radius: 5px;
                              display: inline-block;
                              font-weight: bold;
                              font-size: 16px;">
                        Hacer Nueva Reserva
                    </a>
                </p>
                <br>
                <p>Saludos,</p>
                <p>Barbería Omar</p>
            `
        };

        try {
            await transporter.sendMail(mailOptionsCancelacion);
        } catch (emailError) {
            console.error('Error al enviar email de cancelación:', emailError);
            // Continuamos aunque falle el email
        }

        // Eliminar la reserva
        reservas.delete(id);

        // Enviar página de confirmación
        res.send(`
            <html>
                <head>
                    <title>Reserva Cancelada</title>
                    <style>
                        body { 
                            font-family: Arial, sans-serif; 
                            text-align: center; 
                            padding: 50px;
                            background-color: #f8f9fa;
                        }
                        .success {
                            color: #28a745;
                            margin-bottom: 20px;
                        }
                        .details {
                            background-color: white;
                            padding: 20px;
                            border-radius: 10px;
                            box-shadow: 0 2px 4px rgba(0,0,0,0.1);
                            max-width: 500px;
                            margin: 0 auto;
                        }
                    </style>
                </head>
                <body>
                    <h1 class="success">¡Reserva Cancelada!</h1>
                    <div class="details">
                        <p>Tu reserva ha sido cancelada exitosamente.</p>
                        <p>Te hemos enviado un email de confirmación.</p>
                        <p>Si necesitas hacer una nueva reserva, puedes hacerlo en nuestra web:</p>
                        <p style="text-align: center; margin: 20px 0;">
                            <a href="http://localhost:${port}/#reservas" 
                               style="background-color: #28a745; 
                                      color: white; 
                                      padding: 10px 20px; 
                                      text-decoration: none; 
                                      border-radius: 5px;
                                      display: inline-block;
                                      font-weight: bold;
                                      font-size: 16px;">
                                Hacer Nueva Reserva
                            </a>
                        </p>
                    </div>
                </body>
            </html>
        `);
    } catch (error) {
        console.error('Error al cancelar la reserva:', error);
        res.status(500).send(`
            <html>
                <head>
                    <title>Error</title>
                    <style>
                        body { font-family: Arial, sans-serif; text-align: center; padding: 50px; }
                        .error { color: #dc3545; }
                    </style>
                </head>
                <body>
                    <h1 class="error">Error al cancelar la reserva</h1>
                    <p>Ha ocurrido un error al procesar tu cancelación.</p>
                    <p>Por favor, intenta de nuevo o contacta con nosotros al 632 656 251.</p>
                </body>
            </html>
        `);
    }
});

// Ruta principal
app.get('/', (req, res) => {
    res.sendFile(path.join(__dirname, 'public', 'index.html'));
});

// Endpoint para obtener la configuración
app.get('/api/config', (req, res) => {
    res.json(leerConfig());
});

// Endpoint para actualizar la configuración
app.post('/api/config', (req, res) => {
    const { pago_tarjeta, pago_bizum } = req.body;
    const nuevaConfig = {
        pago_tarjeta: !!pago_tarjeta,
        pago_bizum: !!pago_bizum
    };
    guardarConfig(nuevaConfig);
    res.json({ success: true });
});

// Manejador de errores global
app.use((err, req, res, next) => {
    console.error('Error no manejado:', err);
    res.status(500).json({
        success: false,
        message: 'Error interno del servidor'
    });
});

// Inicializar el transporter al arrancar
initializeTransporter().then(success => {
    if (success) {
        console.log('Servidor de email inicializado correctamente');
    } else {
        console.log('El servidor continuará sin el servicio de email');
    }
});

// Iniciar el servidor
app.listen(port, () => {
    console.log(`Servidor corriendo en http://localhost:${port}`);
}); 
// Configuración del calendario
const fp = flatpickr("#fecha", {
    locale: "es",
    dateFormat: "Y-m-d",
    minDate: "today",
    disable: [
        function(date) {
            // Deshabilitar domingos
            return (date.getDay() === 0);
        }
    ],
    onChange: function(selectedDates, dateStr) {
        console.log('Fecha seleccionada:', dateStr);
        actualizarHorasDisponibles(dateStr);
    }
});

// Estado de las reservas
let reservas = [];

// Función para asignar peluquero
function asignarPeluquero(fecha) {
    const peluqueros = [
        { id: 1, nombre: "Barbero 1", reservas: [] },
        { id: 2, nombre: "Barbero 2", reservas: [] },
        { id: 3, nombre: "Barbero 3", reservas: [] }
    ];

    // Contar reservas de cada peluquero para la fecha seleccionada
    reservas.forEach(reserva => {
        if (reserva.fecha === fecha) {
            const peluquero = peluqueros.find(p => p.id === reserva.peluqueroId);
            if (peluquero) {
                peluquero.reservas.push(reserva);
            }
        }
    });

    // Asignar al peluquero con menos reservas
    return peluqueros.reduce((prev, curr) => 
        prev.reservas.length < curr.reservas.length ? prev : curr
    );
}

// Función para enviar emails
function enviarEmails(reserva) {
    // Email al cliente
    const emailCliente = {
        to: reserva.email,
        subject: "Confirmación de reserva - Peluquería Omar",
        body: `Hola ${reserva.nombre},\n\nTu reserva ha sido confirmada:\n\nServicio: ${reserva.servicio}\nFecha: ${reserva.fecha}\nPeluquero: ${reserva.peluquero.nombre}\n\n¡Te esperamos!\n\nSaludos,\nBarbería Omar`
    };

    // Email a la empresa
    const emailEmpresa = {
        to: "peluqueriaomar@gmail.com",
        subject: "Nueva reserva",
        body: `Nueva reserva recibida:\n\nCliente: ${reserva.nombre}\nTeléfono: ${reserva.telefono}\nEmail: ${reserva.email}\nServicio: ${reserva.servicio}\nFecha: ${reserva.fecha}\nPeluquero asignado: ${reserva.peluquero.nombre}`
    };

    // Aquí iría la lógica real para enviar emails
    console.log("Email al cliente:", emailCliente);
    console.log("Email a la empresa:", emailEmpresa);
}

// Manejo del formulario
document.addEventListener('DOMContentLoaded', function() {
    // Inicializar Flatpickr para el selector de fecha
    flatpickr("#fecha", {
        locale: "es",
        dateFormat: "Y-m-d",
        minDate: "today",
        disable: [
            function(date) {
                // Deshabilitar domingos
                return (date.getDay() === 0);
            }
        ],
        onChange: function(selectedDates, dateStr) {
            actualizarHorasDisponibles(dateStr);
        }
    });

    // Función para actualizar las horas disponibles
    function actualizarHorasDisponibles(fecha) {
        const selectHora = document.getElementById('hora');
        selectHora.innerHTML = '<option value="">Seleccione la hora</option>';

        const diaSemana = new Date(fecha).getDay();
        let horasDisponibles = [];

        if (diaSemana === 6) { // Sábado
            horasDisponibles = generarHoras('10:00', '14:00');
        } else { // Lunes a Viernes
            horasDisponibles = [
                ...generarHoras('10:00', '14:00'),
                ...generarHoras('16:00', '20:00')
            ];
        }

        horasDisponibles.forEach(hora => {
            const option = document.createElement('option');
            option.value = hora;
            option.textContent = hora;
            selectHora.appendChild(option);
        });
    }

    // Función para generar array de horas
    function generarHoras(inicio, fin) {
        const horas = [];
        const [horaInicio, minutoInicio] = inicio.split(':').map(Number);
        const [horaFin, minutoFin] = fin.split(':').map(Number);

        for (let hora = horaInicio; hora < horaFin; hora++) {
            for (let minuto = 0; minuto < 60; minuto += 30) {
                if (hora === horaInicio && minuto < minutoInicio) continue;
                if (hora === horaFin - 1 && minuto > minutoFin) continue;
                
                const horaFormateada = `${hora.toString().padStart(2, '0')}:${minuto.toString().padStart(2, '0')}`;
                horas.push(horaFormateada);
            }
        }
        return horas;
    }

    // Leer configuración de métodos de pago
    fetch('/api/config')
        .then(res => res.json())
        .then(config => {
            const tarjetaDiv = document.querySelector('.payment-method input[value="tarjeta"]').parentElement;
            const bizumDiv = document.querySelector('.payment-method input[value="bizum"]').parentElement;
            if (!config.pago_tarjeta) {
                tarjetaDiv.style.display = 'none';
                document.getElementById('tarjeta-details').style.display = 'none';
            }
            if (!config.pago_bizum) {
                bizumDiv.style.display = 'none';
                document.getElementById('bizum-details').style.display = 'none';
            }
            // Si solo hay un método, seleccionarlo automáticamente
            if (config.pago_tarjeta && !config.pago_bizum) {
                document.getElementById('pago-tarjeta').checked = true;
            } else if (!config.pago_tarjeta && config.pago_bizum) {
                document.getElementById('pago-bizum').checked = true;
            }
        });

    // Manejo de métodos de pago
    const metodoPagoInputs = document.querySelectorAll('input[name="metodo-pago"]');
    const tarjetaDetails = document.getElementById('tarjeta-details');
    const bizumDetails = document.getElementById('bizum-details');
    const servicioSelect = document.getElementById('servicio');
    const precioTotal = document.getElementById('precio-total');

    // Actualizar precio total cuando se selecciona un servicio
    servicioSelect.addEventListener('change', function() {
        const precio = this.value.split('-')[1] || '0';
        precioTotal.textContent = `${precio}€`;
    });

    // Manejar cambio de método de pago
    metodoPagoInputs.forEach(input => {
        input.addEventListener('change', function() {
            if (this.value === 'tarjeta') {
                tarjetaDetails.style.display = 'block';
                bizumDetails.style.display = 'none';
                // Hacer requeridos los campos de tarjeta
                document.getElementById('card-number').required = true;
                document.getElementById('card-expiry').required = true;
                document.getElementById('card-cvv').required = true;
            } else {
                tarjetaDetails.style.display = 'none';
                bizumDetails.style.display = 'block';
                // Quitar required de los campos de tarjeta
                document.getElementById('card-number').required = false;
                document.getElementById('card-expiry').required = false;
                document.getElementById('card-cvv').required = false;
            }
        });
    });

    // Formatear número de tarjeta
    const cardNumber = document.getElementById('card-number');
    cardNumber.addEventListener('input', function(e) {
        let value = e.target.value.replace(/\D/g, '');
        value = value.replace(/(\d{4})/g, '$1 ').trim();
        e.target.value = value;
    });

    // Formatear fecha de expiración
    const cardExpiry = document.getElementById('card-expiry');
    cardExpiry.addEventListener('input', function(e) {
        let value = e.target.value.replace(/\D/g, '');
        if (value.length >= 2) {
            value = value.slice(0,2) + '/' + value.slice(2,4);
        }
        e.target.value = value;
    });

    // Formatear CVV
    const cardCvv = document.getElementById('card-cvv');
    cardCvv.addEventListener('input', function(e) {
        e.target.value = e.target.value.replace(/\D/g, '').slice(0,3);
    });

    // Modificar el manejo del formulario para incluir el pago
    const form = document.getElementById('reservationForm');
    const mensajeReserva = document.getElementById('mensajeReserva');

    form.addEventListener('submit', function(e) {
        e.preventDefault();

        const formData = new FormData(form);
        const reserva = Object.fromEntries(formData.entries());
        const metodoPago = formData.get('metodo-pago');

        // Validar método de pago
        if (metodoPago === 'tarjeta') {
            const cardNumber = formData.get('card-number').replace(/\s/g, '');
            const cardExpiry = formData.get('card-expiry');
            const cardCvv = formData.get('card-cvv');

            if (!cardNumber || cardNumber.length !== 16) {
                mostrarMensaje('Por favor, introduce un número de tarjeta válido', 'error');
                return;
            }
            if (!cardExpiry || !cardExpiry.match(/^\d{2}\/\d{2}$/)) {
                mostrarMensaje('Por favor, introduce una fecha de expiración válida', 'error');
                return;
            }
            if (!cardCvv || cardCvv.length !== 3) {
                mostrarMensaje('Por favor, introduce un CVV válido', 'error');
                return;
            }
        }

        // Simular procesamiento del pago
        mostrarMensaje('Procesando pago...', 'info');
        
        setTimeout(() => {
            mostrarMensaje(`¡Reserva y pago realizados con éxito! Te esperamos el ${reserva.fecha} a las ${reserva.hora}`, 'exito');
            form.reset();
            tarjetaDetails.style.display = 'block'; // Mostrar tarjeta por defecto
            bizumDetails.style.display = 'none';
            precioTotal.textContent = '0€';
            // Restaurar required en campos de tarjeta
            document.getElementById('card-number').required = true;
            document.getElementById('card-expiry').required = true;
            document.getElementById('card-cvv').required = true;
        }, 2000);
    });

    function mostrarMensaje(texto, tipo) {
        mensajeReserva.textContent = texto;
        mensajeReserva.className = `mensaje-reserva ${tipo}`;
        mensajeReserva.style.display = 'block';

        if (tipo !== 'info') {
            setTimeout(() => {
                mensajeReserva.style.display = 'none';
            }, 5000);
        }
    }

    // Animaciones al hacer scroll
    const elementos = document.querySelectorAll('.animate');

    function verificarElementos() {
        elementos.forEach(elemento => {
            const posicion = elemento.getBoundingClientRect().top;
            const alturaVentana = window.innerHeight;

            if (posicion < alturaVentana * 0.8) {
                elemento.classList.add('visible');
            }
        });
    }

    // Verificar elementos al cargar y al hacer scroll
    window.addEventListener('scroll', verificarElementos);
    verificarElementos();

    // Smooth scroll para los enlaces de navegación
    document.querySelectorAll('a[href^="#"]').forEach(anchor => {
        anchor.addEventListener('click', function (e) {
            e.preventDefault();
            const target = document.querySelector(this.getAttribute('href'));
            if (target) {
                target.scrollIntoView({
                    behavior: 'smooth',
                    block: 'start'
                });
            }
        });
    });
}); 
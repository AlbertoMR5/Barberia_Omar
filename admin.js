document.addEventListener('DOMContentLoaded', () => {
    const form = document.getElementById('configForm');
    const pagoTarjeta = document.getElementById('pago-tarjeta');
    const pagoBizum = document.getElementById('pago-bizum');
    const mensaje = document.getElementById('mensaje');

    // Cargar configuración actual
    fetch('/api/config')
        .then(res => res.json())
        .then(config => {
            pagoTarjeta.checked = !!config.pago_tarjeta;
            pagoBizum.checked = !!config.pago_bizum;
        });

    // Guardar cambios
    form.addEventListener('submit', function(e) {
        e.preventDefault();
        const nuevaConfig = {
            pago_tarjeta: pagoTarjeta.checked,
            pago_bizum: pagoBizum.checked
        };
        fetch('/api/config', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(nuevaConfig)
        })
        .then(res => res.json())
        .then(data => {
            mensaje.textContent = '¡Configuración guardada correctamente!';
            mensaje.style.display = 'block';
            setTimeout(() => mensaje.style.display = 'none', 3000);
        })
        .catch(() => {
            mensaje.textContent = 'Error al guardar la configuración.';
            mensaje.style.display = 'block';
            setTimeout(() => mensaje.style.display = 'none', 3000);
        });
    });
}); 
// CONSTANTES Y VARIABLES GLOBALES
//const API_BASE = 'http://localhost:5194/api/';
const API_BASE = 'http://192.168.1.190:5194/api/'

let isEditing = false;
let editingReparacionId = null;
let editingProductId = null;
let confirmModal = null;

// ==================== FUNCIONES UTILITARIAS ====================

/**
 * Muestra una alerta en la pantalla
 * @param {string} message - Mensaje a mostrar
 * @param {string} type - Tipo de alerta (success, danger, warning, etc.)
 */
function showAlert(message, type) {
    const alertDiv = document.createElement('div');
    alertDiv.className = `alert alert-${type} alert-dismissible fade show position-fixed top-0 end-0 m-3`;
    alertDiv.style.zIndex = '1100';
    alertDiv.innerHTML = `
        ${message}
        <button type="button" class="btn-close" data-bs-dismiss="alert" aria-label="Close"></button>`;
    
    document.body.appendChild(alertDiv);
    
    setTimeout(() => {
        const bsAlert = new bootstrap.Alert(alertDiv);
        bsAlert.close();
    }, 5000);
}

/**
 * Muestra u oculta el indicador de carga
 * @param {boolean} show - Mostrar u ocultar
 * @param {string} message - Mensaje a mostrar
 */

function showLoading(show, message = 'Cargando...') {
    /*
    let loadingDiv = document.getElementById('loadingDiv');
    
    if (!loadingDiv) {
        loadingDiv = document.createElement('div');
        loadingDiv.id = 'loadingDiv';
        loadingDiv.className = 'position-fixed top-0 start-0 w-100 h-100 d-flex justify-content-center align-items-center';
        loadingDiv.style.backgroundColor = 'rgba(0,0,0,0.5)';
        loadingDiv.style.zIndex = '1050';
        loadingDiv.innerHTML = `
            <div class="text-center bg-white p-4 rounded shadow">
                <div class="spinner-border text-primary mb-3" role="status">
                    <span class="visually-hidden">Cargando...</span>
                </div>
                <p class="loading-message mb-0">${message}</p>
            </div>`;
        document.body.appendChild(loadingDiv);
    }
    
    loadingDiv.style.display = show ? 'flex' : 'none';
    loadingDiv.querySelector('.loading-message').textContent = message;

    
    */
}
    

/**
 * Formatea una fecha a string legible
 * @param {string} dateString - Fecha en formato string
 * @returns {string} Fecha formateada
 */
function formatDateTime(dateString) {
    if (!dateString) return 'N/A';
    const date = new Date(dateString);
    return date.toLocaleDateString() + ' ' + date.toLocaleTimeString([], {hour: '2-digit', minute:'2-digit'});
}

// ==================== FUNCIONES PARA REPARACIONES ====================

/**
 * Calcula el monto restante automáticamente
 */
function calcularRestante() {
    const costo = parseFloat(document.getElementById('reparacion-costo').value) || 0;
    const anticipo = parseFloat(document.getElementById('reparacion-anticipo').value) || 0;
    const restante = costo - anticipo;
    document.getElementById('reparacion-restante').value = restante.toFixed(2);
}

/**
 * Carga las reparaciones desde la API
 */
async function loadReparaciones() {
    try {
        showLoading(true, 'Cargando reparaciones...');
        
        const response = await fetch(API_BASE + 'Reparacion');
        
        if (!response.ok) {
            const errorText = await response.text();
            throw new Error(`Error HTTP: ${response.status} - ${errorText}`);
        }
        
        const reparaciones = await response.json();
        renderReparacionesTable(reparaciones);
    } catch (error) {
        console.error('Error al cargar reparaciones:', error);
        showAlert('Error al cargar las reparaciones: ' + error.message, 'danger');
    } finally {
        showLoading(false);
    }
}

/**
 * Renderiza la tabla de reparaciones
 * @param {Array} reparaciones - Lista de reparaciones
 */
function renderReparacionesTable(reparaciones) {
    const tbody = document.querySelector('#reparaciones-table tbody');
    if (!tbody) return;
    
    tbody.innerHTML = '';
    
    if (!reparaciones || reparaciones.length === 0) {
        tbody.innerHTML = `
            <tr>
                <td colspan="12" class="text-center text-muted py-4">
                    No hay reparaciones registradas
                </td>
            </tr>`;
        return;
    }
    
    reparaciones.forEach(reparacion => {
        const row = document.createElement('tr');
        row.innerHTML = `
            <td>${reparacion.id}</td>
            <td>${reparacion.nombre || 'N/A'}</td>
            <td>${reparacion.telefono || 'N/A'}</td>
            <td>${reparacion.modeloCelular || 'N/A'}</td>
            <td class="text-truncate" style="max-width: 200px;" title="${reparacion.problema || ''}">
                ${reparacion.problema || 'N/A'}
            </td>
            <td class="text-end">$${(reparacion.costo || 0).toFixed(2)}</td>
            <td class="text-end">$${(reparacion.anticipo || 0).toFixed(2)}</td>
            <td class="text-end">$${(reparacion.restante || 0).toFixed(2)}</td>
            <td>
                <select class="form-select form-select-sm" onchange="updateReparacionEstado(${reparacion.id}, this.value)">
                    <option value="Por reparar" ${reparacion.estado === 'Por reparar' ? 'selected' : ''}>Por reparar</option>
                    <option value="En proceso" ${reparacion.estado === 'En proceso' ? 'selected' : ''}>En proceso</option>
                    <option value="Listo" ${reparacion.estado === 'Listo' ? 'selected' : ''}>Listo</option>
                    <option value="Entregado" ${reparacion.estado === 'Entregado' ? 'selected' : ''}>Entregado</option>
                    <option value="No pasó" ${reparacion.estado === 'No pasó' ? 'selected' : ''}>No pasó</option>
                    <option value="Cancelado" ${reparacion.estado === 'Cancelado' ? 'selected' : ''}>Cancelado</option>
                </select>
            </td>
            <td>${formatDateTime(reparacion.fechaCreacion)}</td>
            <td>${formatDateTime(reparacion.fechaModificacion)}</td>
            <td class="text-nowrap">
                <button class="btn btn-sm btn-outline-primary me-1" onclick="editReparacion(${reparacion.id})" title="Editar">
                    <i class="bi bi-pencil"></i>
                </button>
                <button class="btn btn-sm btn-outline-success me-1" onclick="printRecibo(${reparacion.id})" title="Imprimir recibo">
                    <i class="bi bi-printer"></i>
                </button>
                <button class="btn btn-sm btn-outline-danger" onclick="confirmDeleteReparacion(${reparacion.id})" title="Eliminar">
                    <i class="bi bi-trash"></i>
                </button>
            </td>`;
        tbody.appendChild(row);
    });
}

/**
 * Maneja el envío del formulario de reparaciones
 * @param {Event} event - Evento de submit
 */
function handleReparacionSubmit(event) {
    event.preventDefault();
    event.stopPropagation();
    
    const form = event.target;
    if (form.checkValidity()) {
        if (isEditing) {
            saveEditReparacion(event);
        } else {
            addReparacion(event);
        }
    }
    
    form.classList.add('was-validated');
}

/**
 * Agrega una nueva reparación
 * @param {Event} event - Evento de submit
 */
async function addReparacion(event) {
    try {
        showLoading(true);
        
        const reparacionData = {
            nombre: document.getElementById('reparacion-nombre').value.trim(),
            telefono: document.getElementById('reparacion-telefono').value.trim(),
            modeloCelular: document.getElementById('reparacion-modelo').value.trim(),
            problema: document.getElementById('reparacion-problema').value.trim(),
            costo: parseFloat(document.getElementById('reparacion-costo').value),
            anticipo: parseFloat(document.getElementById('reparacion-anticipo').value),
            estado: document.getElementById('reparacion-estado').value
        };
        
        reparacionData.restante = reparacionData.costo - reparacionData.anticipo;
        
        const response = await fetch(API_BASE + 'Reparacion', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json'
            },
            body: JSON.stringify(reparacionData)
        });
        
        if (!response.ok) {
            const error = await response.json();
            throw new Error(error.message || 'Error al agregar la reparación');
        }
        
        showAlert('Reparación agregada correctamente', 'success');
        resetReparacionForm();
        loadReparaciones();
    } catch (error) {
        console.error('Error al agregar reparación:', error);
        showAlert(error.message || 'Error al agregar la reparación', 'danger');
    } finally {
        showLoading(false);
    }
}

/**
 * Edita una reparación existente
 * @param {number} id - ID de la reparación
 */
async function editReparacion(id) {
    try {
        showLoading(true);
        const response = await fetch(API_BASE + `Reparacion/${id}`);
        
        if (!response.ok) {
            throw new Error('Error al obtener los datos de la reparación');
        }
        
        const reparacion = await response.json();
        
        // Prellenar el formulario
        document.getElementById('reparacion-nombre').value = reparacion.nombre;
        document.getElementById('reparacion-telefono').value = reparacion.telefono;
        document.getElementById('reparacion-modelo').value = reparacion.modeloCelular;
        document.getElementById('reparacion-problema').value = reparacion.problema;
        document.getElementById('reparacion-costo').value = reparacion.costo;
        document.getElementById('reparacion-anticipo').value = reparacion.anticipo;
        document.getElementById('reparacion-restante').value = reparacion.restante.toFixed(2);
        document.getElementById('reparacion-estado').value = reparacion.estado;
        
        // Cambiar a modo edición
        isEditing = true;
        editingReparacionId = id;
        toggleReparacionButtons();
        
        // Desplazarse al formulario
        document.getElementById('reparaciones-form').scrollIntoView({ behavior: 'smooth' });
    } catch (error) {
        console.error('Error al cargar reparación para editar:', error);
        showAlert('Error al cargar la reparación para editar', 'danger');
    } finally {
        showLoading(false);
    }
}

/**
 * Guarda los cambios al editar una reparación
 * @param {Event} event - Evento de submit
 */
async function saveEditReparacion(event) {
    event.preventDefault();
    
    try {
        showLoading(true);
        
        const reparacionData = {
            id: editingReparacionId,
            nombre: document.getElementById('reparacion-nombre').value.trim(),
            telefono: document.getElementById('reparacion-telefono').value.trim(),
            modeloCelular: document.getElementById('reparacion-modelo').value.trim(),
            problema: document.getElementById('reparacion-problema').value.trim(),
            costo: parseFloat(document.getElementById('reparacion-costo').value),
            anticipo: parseFloat(document.getElementById('reparacion-anticipo').value),
            estado: document.getElementById('reparacion-estado').value
        };
        
        reparacionData.restante = reparacionData.costo - reparacionData.anticipo;
        
        const response = await fetch(API_BASE + 'Reparacion/' + editingReparacionId, {
            method: 'PUT',
            headers: {
                'Content-Type': 'application/json'
            },
            body: JSON.stringify(reparacionData)
        });
        
        if (!response.ok) {
            const error = await response.json();
            throw new Error(error.message || 'Error al actualizar la reparación');
        }
        
        showAlert('Reparación actualizada correctamente', 'success');
        resetReparacionForm();
        loadReparaciones();
    } catch (error) {
        console.error('Error al actualizar reparación:', error);
        showAlert(error.message || 'Error al actualizar la reparación', 'danger');
    } finally {
        showLoading(false);
    }
}

/**
 * Alterna los botones de edición en el formulario
 */
function toggleReparacionButtons() {
    const guardarBtn = document.querySelector('#reparaciones-form button[type="submit"]');
    const guardarEdicionBtn = document.getElementById('guardar-edicion-reparacion');
    
    if (guardarBtn && guardarEdicionBtn) {
        guardarBtn.disabled = isEditing;
        guardarEdicionBtn.style.display = isEditing ? 'inline-block' : 'none';
    }
}

/**
 * Resetea el formulario de reparaciones
 */
function resetReparacionForm() {
    const form = document.getElementById('reparaciones-form');
    if (form) {
        form.reset();
        form.classList.remove('was-validated');
    }
    isEditing = false;
    editingReparacionId = null;
    toggleReparacionButtons();
}

/**
 * Actualiza el estado de una reparación
 * @param {number} id - ID de la reparación
 * @param {string} nuevoEstado - Nuevo estado a asignar
 */
async function updateReparacionEstado(id, nuevoEstado) {
    try {
        showLoading(true, `Actualizando estado a ${nuevoEstado}...`);
        
        // Obtener datos actuales
        const responseGet = await fetch(API_BASE + `Reparacion/${id}`);
        if (!responseGet.ok) throw new Error('Error al obtener la reparación');
        
        const reparacionActual = await responseGet.json();
        
        // Actualizar solo el estado
        const responsePut = await fetch(API_BASE + `Reparacion/${id}`, {
            method: 'PUT',
            headers: {
                'Content-Type': 'application/json'
            },
            body: JSON.stringify({
                ...reparacionActual,
                estado: nuevoEstado
            })
        });
        
        if (!responsePut.ok) {
            const error = await responsePut.json();
            throw new Error(error.message || 'Error al actualizar el estado');
        }
        
        loadReparaciones();
    } catch (error) {
        console.error('Error al actualizar estado:', error);
        showAlert(error.message || 'Error al actualizar el estado', 'danger');
    } finally {
        showLoading(false);
    }
}
// ----------------------------------------------------------------------------------


/**
 * Muestra un modal para capturar daños físicos y contraseña
 */
function mostrarModalCaptura(reparacion) {
    return new Promise((resolve, reject) => {
        // Crear modal
        const modalHtml = `
            <div class="modal fade" id="modalCaptura" tabindex="-1" aria-labelledby="modalCapturaLabel" aria-hidden="true">
                <div class="modal-dialog modal-lg">
                    <div class="modal-content">
                        <div class="modal-header">
                            <h5 class="modal-title" id="modalCapturaLabel">Información del Equipo - ${reparacion.modeloCelular}</h5>
                            <button type="button" class="btn-close" data-bs-dismiss="modal" aria-label="Close"></button>
                        </div>
                        <div class="modal-body">
                            <div class="row">
                                <div class="col-md-6">
                                    <div class="mb-3">
                                        <label for="danosFisicos" class="form-label">
                                            <strong>Daños Físicos Observados:</strong>
                                        </label>
                                        <textarea 
                                            class="form-control" 
                                            id="danosFisicos" 
                                            rows="6" 
                                            placeholder="Describa detalladamente los daños físicos del dispositivo..."
                                            required
                                        ></textarea>
                                        <div class="form-text">
                                            Ej: Pantalla rota, marco rayado, botones dañados, etc.
                                        </div>
                                    </div>
                                </div>
                                <div class="col-md-6">
                                    <div class="mb-3">
                                        <label for="password" class="form-label">
                                            <strong>Contraseña de Desbloqueo:</strong>
                                        </label>
                                        <input 
                                            type="text" 
                                            class="form-control" 
                                            id="password" 
                                            placeholder="Ingrese la contraseña"
                                            required
                                        >
                                    </div>
                                    
                                    <div class="mb-3">
                                        <label class="form-label">
                                            <strong>Patrón de Desbloqueo:</strong>
                                        </label>
                                        <div class="pattern-grid text-center">
                                            <div class="pattern-row">
                                                <button type="button" class="pattern-dot" data-dot="1">1</button>
                                                <button type="button" class="pattern-dot" data-dot="2">2</button>
                                                <button type="button" class="pattern-dot" data-dot="3">3</button>
                                            </div>
                                            <div class="pattern-row">
                                                <button type="button" class="pattern-dot" data-dot="4">4</button>
                                                <button type="button" class="pattern-dot" data-dot="5">5</button>
                                                <button type="button" class="pattern-dot" data-dot="6">6</button>
                                            </div>
                                            <div class="pattern-row">
                                                <button type="button" class="pattern-dot" data-dot="7">7</button>
                                                <button type="button" class="pattern-dot" data-dot="8">8</button>
                                                <button type="button" class="pattern-dot" data-dot="9">9</button>
                                            </div>
                                        </div>
                                        <div class="form-text">
                                            Haga clic en los puntos en el orden del patrón
                                        </div>
                                        <input type="hidden" id="pattern" value="">
                                    </div>
                                </div>
                            </div>
                            
                            <div class="alert alert-info">
                                <small>
                                    <strong>Nota:</strong> Esta información se incluirá en el recibo impreso. 
                                    Verifique que sea correcta antes de continuar.
                                </small>
                            </div>
                        </div>
                        <div class="modal-footer">
                            <button type="button" class="btn btn-secondary" data-bs-dismiss="modal">Cancelar</button>
                            <button type="button" class="btn btn-primary" id="btnContinuar">Continuar e Imprimir</button>
                        </div>
                    </div>
                </div>
            </div>
        `;

        // Agregar modal al DOM
        document.body.insertAdjacentHTML('beforeend', modalHtml);
        
        // Mostrar modal
        const modal = new bootstrap.Modal(document.getElementById('modalCaptura'));
        modal.show();

        // Variables para el patrón
        let selectedPattern = [];

        // Event listeners para los puntos del patrón
        document.querySelectorAll('.pattern-dot').forEach(dot => {
            dot.addEventListener('click', function() {
                const dotNumber = this.getAttribute('data-dot');
                if (!selectedPattern.includes(dotNumber)) {
                    selectedPattern.push(dotNumber);
                    this.classList.add('active');
                    document.getElementById('pattern').value = selectedPattern.join('-');
                }
            });
        });

        // Event listener para el botón continuar
        document.getElementById('btnContinuar').addEventListener('click', function() {
            const danosFisicos = document.getElementById('danosFisicos').value.trim();
            const password = document.getElementById('password').value.trim();
            const pattern = document.getElementById('pattern').value;

            if (!danosFisicos) {
                showAlert('Por favor, describa los daños físicos del equipo', 'warning');
                return;
            }

            if (!password && !pattern) {
                showAlert('Por favor, ingrese la contraseña o seleccione el patrón de desbloqueo', 'warning');
                return;
            }

            // Cerrar modal y resolver la promesa
            modal.hide();
            setTimeout(() => {
                document.getElementById('modalCaptura').remove();
                resolve({
                    danosFisicos: danosFisicos,
                    password: password,
                    pattern: pattern
                });
            }, 300);
        });

        // Limpiar cuando se cierre el modal
        document.getElementById('modalCaptura').addEventListener('hidden.bs.modal', function() {
            this.remove();
            reject(new Error('Modal cerrado por el usuario'));
        });
    });
}

/**
 * Función principal actualizada para imprimir recibo
 */
async function printRecibo(id) {
    try {
        showLoading(true, 'Cargando información de la reparación...');
        
        const response = await fetch(API_BASE + `Reparacion/${id}`);
        if (!response.ok) throw new Error('Error al obtener la reparación');
        const reparacion = await response.json();
        
        showLoading(false);
        
        // Mostrar modal para capturar información
        const { danosFisicos, password, pattern } = await mostrarModalCaptura(reparacion);
        
        // Generar recibo con la información capturada
        await generarRecibo(reparacion, danosFisicos, password, pattern);
        
    } catch (error) {
        if (error.message !== 'Modal cerrado por el usuario') {
            console.error('Error al generar recibo:', error);
            showAlert('Error al generar el recibo', 'danger');
        }
        showLoading(false);
    }
}

/**
 * Función para generar el recibo con la información capturada
 */
async function generarRecibo(reparacion, danosFisicos, password, pattern) {
    try {
        showLoading(true, 'Generando recibo...');
        
        const fechaActual = new Date();
        const fecha = fechaActual.toLocaleDateString();
        const hora = fechaActual.toLocaleTimeString([], {hour: '2-digit', minute:'2-digit'});
        
        // Generar representación visual del patrón si existe
        let patternVisual = '';
        if (pattern) {
            const patternNumbers = pattern.split('-');
            patternVisual = `Patrón: ${patternNumbers.join(' → ')}`;
        }

        const reciboHtml = `
            <!DOCTYPE html>
            <html>
            <head>
                <title>Recibo de Reparación #${reparacion.id}</title>
                <style>
                    @page {
                        size: A4;
                        margin: 0.5in;
                    }
                    body { 
                        font-family: Arial, sans-serif; 
                        margin: 0; 
                        padding: 0;
                        width: 210mm;
                        height: 297mm;
                        box-sizing: border-box;
                    }
                    .recibo { 
                        width: 100%;
                        height: 100%;
                        padding: 15mm;
                        box-sizing: border-box;
                        border: 1px solid #ddd;
                        position: relative;
                    }
                    .header { 
                        text-align: center; 
                        margin-bottom: 15px;
                        border-bottom: 2px solid #333;
                        padding-bottom: 8px;
                    }
                    .title { 
                        font-size: 22px; 
                        font-weight: bold; 
                        margin-bottom: 3px; 
                    }
                    .subtitle {
                        font-size: 16px;
                        margin-bottom: 8px;
                    }
                    .info-section {
                        display: flex;
                        gap: 15px;
                        margin-bottom: 15px;
                    }
                    .client-info {
                        flex: 1;
                        border: 1px solid #ddd;
                        padding: 12px;
                        background: #f9f9f9;
                        font-size: 12px;
                    }
                    .damage-info {
                        flex: 1;
                        border: 1px solid #ddd;
                        padding: 12px;
                        background: #f9f9f9;
                    }
                    .info p {
                        margin: 4px 0;
                        line-height: 1.2;
                    }
                    .total {
                        font-weight: bold;
                        margin-top: 8px;
                    }
                    .footer { 
                        text-align: center; 
                        margin: 15px 0;
                        font-size: 11px; 
                        color: #666;
                    }
                    hr { 
                        border-top: 1px dashed #ddd; 
                        margin: 10px 0; 
                    }
                    .phone-diagram {
                        text-align: center;
                    }
                    .phone-diagram img {
                        max-width: 100%;
                        height: auto;
                    }
                    .damage-notes {
                        margin-top: 8px;
                        font-size: 10px;
                    }
                    .damage-text {
                        border: 1px solid #ddd;
                        padding: 8px;
                        background: white;
                        min-height: 50px;
                        font-size: 10px;
                        line-height: 1.3;
                    }
                    .policies {
                        border: 1px solid #ddd;
                        padding: 12px;
                        background: #f9f9f9;
                        margin-bottom: 15px;
                        font-size: 9px;
                    }
                    .policies h3 {
                        font-size: 11px;
                        margin-bottom: 8px;
                        border-bottom: 1px solid #ddd;
                        padding-bottom: 4px;
                        text-align: center;
                    }
                    .policies-columns {
                        display: flex;
                        gap: 12px;
                    }
                    .policy-column {
                        flex: 1;
                    }
                    .policies h4 {
                        font-size: 10px;
                        margin: 6px 0 3px 0;
                        color: #333;
                    }
                    .policies ul {
                        padding-left: 12px;
                        margin: 2px 0 6px 0;
                    }
                    .policies li {
                        margin-bottom: 2px;
                        line-height: 1.2;
                    }
                    
                    /* Estilos para el espacio recortable */
                    .cutout-section {
                        border-top: 2px dashed #000;
                        padding: 8px;
                        background: #f0f0f0;
                        margin-top: 10px;
                    }
                    .cutout-content {
                        display: flex;
                        justify-content: space-between;
                        align-items: flex-start;
                    }
                    .cutout-info {
                        text-align: left;
                        font-size: 12px;
                        font-weight: bold;
                        flex: 1;
                    }
                    .cutout-unlock {
                        flex: 1;
                        text-align: center;
                    }
                    .pattern-container {
                        display: inline-block;
                        margin: 5px 0;
                    }
                    .pattern-image img {
                        width: 80px;
                        height: 80px;
                        border: 2px solid #333;
                        background-color: white;
                    }
                    .password-field {
                        margin-top: 5px;
                    }
                    .password-display {
                        font-size: 10px;
                        margin: 3px 0;
                        padding: 2px 5px;
                        background: white;
                        border: 1px solid #ddd;
                        display: inline-block;
                    }
                    .cutout-signature {
                        flex: 1;
                        text-align: center;
                    }
                    .cutout-signature-line {
                        width: 120px;
                        border-bottom: 1px solid #000;
                        margin: 8px auto 3px auto;
                    }
                    .cutout-instruction {
                        font-size: 9px;
                        color: #666;
                        margin-top: 3px;
                        font-style: italic;
                        text-align: center;
                    }
                    .section-title {
                        font-size: 11px;
                        font-weight: bold;
                        margin: 8px 0 4px 0;
                        color: #333;
                    }
                    
                    .print-only {
                        display: block;
                    }
                    @media screen {
                        body {
                            margin: 20px auto;
                            box-shadow: 0 0 10px rgba(0,0,0,0.1);
                        }
                        .cutout-section {
                            background-color: #f9f9f9;
                        }
                    }
                    @media print {
                        .cutout-section {
                            border: 2px dashed #000 !important;
                            page-break-inside: avoid;
                        }
                    }
                </style>
            </head>
            <body>
                <div class="recibo">
                    <div class="header">
                        <div class="title">DLTEC</div>
                        <div class="subtitle">Recibo de Reparación</div>
                    </div>
                    
                    <div class="info-section">
                        <div class="client-info">
                            <div class="info">
                                <p><strong>ID:</strong> ${reparacion.id}</p>
                                <p><strong>Cliente:</strong> ${reparacion.nombre}</p>
                                <p><strong>Teléfono:</strong> ${reparacion.telefono}</p>
                                <p><strong>Modelo:</strong> ${reparacion.modeloCelular}</p>
                                <p><strong>Problema:</strong> ${reparacion.problema}</p>
                                <hr>
                                <p><strong>Costo:</strong> $${reparacion.costo.toFixed(2)}</p>
                                <p><strong>Anticipo:</strong> $${reparacion.anticipo.toFixed(2)}</p>
                                <p class="total"><strong>Restante:</strong> $${reparacion.restante.toFixed(2)}</p>
                                <p><strong>Estado:</strong> ${reparacion.estado}</p>
                                <hr>
                                <p><strong>Fecha:</strong> ${fecha}</p>
                                <p><strong>Hora:</strong> ${hora}</p>
                            </div>
                        </div>
                        
                        <div class="damage-info">
                            <div class="phone-diagram">
                                <p class="section-title">Diagrama para marcar daños físicos:</p>
                                <img src="img/DiagramaCelular.png" alt="Diagrama de celular 360°">
                                <div class="damage-notes">
                                    <p class="section-title">Notas sobre daños físicos:</p>
                                    <div class="damage-text">${danosFisicos}</div>
                                </div>
                            </div>
                        </div>
                    </div>
                    
                    <div class="policies">
                        <h3>POLÍTICAS DE REPARACIÓN</h3>
                        <div class="policies-columns">
                            <div class="policy-column">
                                <h4>1. Garantía</h4>
                                <ul>
                                    <li>Todas las reparaciones cuentan con garantía únicamente sobre la pieza o servicio reemplazado.</li>
                                    <li>La garantía no cubre daños ocasionados por:
                                        <ul>
                                            <li>Golpes, caídas o humedad.</li>
                                            <li>Manipulación por terceros después de la reparación.</li>
                                            <li>Mal uso o accesorios defectuosos.</li>
                                        </ul>
                                    </li>
                                    <li>Tiempo de garantía: 30 días.</li>
                                </ul>
                                
                                <h4>2. Piezas y Componentes</h4>
                                <ul>
                                    <li>El cliente puede elegir entre piezas originales, OEM o genéricas, sujeto a disponibilidad.</li>
                                    <li>Las piezas genéricas pueden presentar variaciones en brillo, color y sensibilidad, lo cual el cliente acepta al solicitar dicha opción.</li>
                                </ul>
                                
                                <h4>3. Equipos con Golpe o Humedad</h4>
                                <ul>
                                    <li>Equipos con daño por humedad o golpe no tienen garantía, incluso si la pieza nueva falla posteriormente.</li>
                                    <li>La intervención en equipos mojados es una recuperación tentativa, no un resultado garantizado.</li>
                                </ul>
                            </div>
                            <div class="policy-column">
                                <h4>4. Tiempos de Entrega</h4>
                                <ul>
                                    <li>El tiempo de reparación puede variar según disponibilidad de piezas y nivel de daño interno.</li>
                                    <li>Se avisará al cliente si se requiere más tiempo o piezas adicionales.</li>
                                </ul>
                                
                                <h4>5. Abonos y Pagos</h4>
                                <ul>
                                    <li>Se puede solicitar anticipo en reparaciones que requieran compra de piezas.</li>
                                    <li>El pago completo se realiza al momento de la entrega del equipo.</li>
                                </ul>
                                
                                <h4>6. Equipos No Reclamados</h4>
                                <ul>
                                    <li>Equipos no reclamados en 15 días se considerarán abandonados y podrán ser usados para cubrir costos o almacenaje.</li>
                                </ul>
                            </div>
                        </div>
                    </div>
                    
                    <div class="footer">
                        ¡Gracias por su preferencia!<br>
                        Tel: 395-123-22-11
                    </div>
                    
                    <!-- Sección recortable -->
                    <div class="cutout-section">
                        <div class="cutout-content">
                            <div class="cutout-info">
                                <p>ID: ${reparacion.id}</p>
                                <p>Cliente: ${reparacion.nombre}</p>
                                <p>Fecha: ${fecha}</p>
                                <p>Hora: ${hora}</p>
                            </div>
                            
                            <div class="cutout-unlock">
                                <p class="section-title">Información de Desbloqueo</p>
                                <div class="pattern-container">
                                    <div class="pattern-image">
                                        <img src="data:image/svg+xml;base64,PHN2ZyB3aWR0aD0iODAiIGhlaWdodD0iODAiIHZpZXdCb3g9IjAgMCA4MCA4MCIgeG1sbnM9Imh0dHA6Ly93d3cudzMub3JnLzIwMDAvc3ZnIj48cmVjdCB3aWR0aD0iODAiIGhlaWdodD0iODAiIGZpbGw9IiNmZmYiLz48Y2lyY2xlIGN4PSIyMCIgY3k9IjIwIiByPSI0IiBmaWxsPSJub25lIiBzdHJva2U9IiMzMzMiIHN0cm9rZS13aWR0aD0iMS41Ii8+PGNpcmNsZSBjeD0iNDAiIGN5PSIyMCIgcj0iNCIgZmlsbD0ibm9uZSIgc3Ryb2tlPSIjMzMzIiBzdHJva2Utd2lkdGg9IjEuNSIvPjxjaXJjbGUgY3g9IjYwIiBjeT0iMjAiIHI9IjQiIGZpbGw9Im5vbmUiIHN0cm9rZT0iIzMzMyIgc3Ryb2tlLXdpZHRoPSIxLjUiLz48Y2lyY2xlIGN4PSIyMCIgY3k9IjQwIiByPSI0IiBmaWxsPSJub25lIiBzdHJva2U9IiMzMzMiIHN0cm9rZS13aWR0aD0iMS41Ii8+PGNpcmNsZSBjeD0iNDAiIGN5PSI0MCIgcj0iNCIgZmlsbD0ibm9uZSIgc3Ryb2tlPSIjMzMzIiBzdHJva2Utd2lkdGg9IjEuNSIvPjxjaXJjbGUgY3g9IjYwIiBjeT0iNDAiIHI9IjQiIGZpbGw9Im5vbmUiIHN0cm9rZT0iIzMzMyIgc3Ryb2tlLXdpZHRoPSIxLjUiLz48Y2lyY2xlIGN4PSIyMCIgY3k9IjYwIiByPSI0IiBmaWxsPSJub25lIiBzdHJva2U9IiMzMzMiIHN0cm9rZS13aWR0aD0iMS41Ii8+PGNpcmNsZSBjeD0iNDAiIGN5PSI2MCIgcj0iNCIgZmlsbD0ibm9uZSIgc3Ryb2tlPSIjMzMzIiBzdHJva2Utd2lkdGg9IjEuNSIvPjxjaXJjbGUgY3g9IjYwIiBjeT0iNjAiIHI9IjQiIGZpbGw9Im5vbmUiIHN0cm9rZT0iIzMzMyIgc3Ryb2tlLXdpZHRoPSIxLjUiLz48L3N2Zz4=" alt="Patrón de 9 puntos">
                                    </div>
                                </div>
                                <div class="password-field">
                                    ${password ? `
                                        <div class="password-display">
                                            <strong>Contraseña:</strong> ${password}
                                        </div>
                                    ` : ''}
                                    ${pattern ? `
                                        <div class="password-display">
                                            <strong>${patternVisual}</strong>
                                        </div>
                                    ` : ''}
                                </div>
                            </div>
                            
                            <div class="cutout-signature">
                                <p>Firma del cliente:</p>
                            </div>
                        </div>
                        <div class="cutout-instruction">
                            ★ RECORTAR POR ESTA LÍNEA PUNTEADA ★
                        </div>
                    </div>
                </div>
            </body>
            </html>`;

        const ventana = window.open('', '_blank', 'width=794,height=1123');
        ventana.document.write(reciboHtml);
        ventana.document.close();
        
        ventana.onload = function() {
            ventana.print();
            showLoading(false);
        };
        
    } catch (error) {
        console.error('Error al generar recibo:', error);
        showAlert('Error al generar el recibo', 'danger');
        showLoading(false);
    }
}


// --------------------------------------------------------

/**
 * Confirma la eliminación de una reparación
 * @param {number} id - ID de la reparación
 */
function confirmDeleteReparacion(id) {
    if (!confirmModal) return;
    
    document.getElementById('confirmModalBody').innerHTML = `
        ¿Está seguro de que desea eliminar esta reparación?<br><br>
        <small class="text-muted">La reparación se moverá al historial de eliminadas.</small>`;
    
    const confirmBtn = document.getElementById('confirmAction');
    if (confirmBtn) {
        confirmBtn.onclick = () => deleteReparacion(id);
        confirmModal.show();
    }
}

/**
 * Elimina una reparación (mueve a borradas)
 * @param {number} id - ID de la reparación
 */
async function deleteReparacion(id) {
    try {
        if (confirmModal) confirmModal.hide();
        showLoading(true, 'Eliminando reparación...');
        
        // Obtener datos de la reparación
        const responseGet = await fetch(API_BASE + `Reparacion/${id}`);
        if (!responseGet.ok) throw new Error('Error al obtener la reparación');
        
        const reparacion = await responseGet.json();
        
        // Crear reparación borrada
        const reparacionBorrada = {
            idReparacion: reparacion.id,
            nombre: reparacion.nombre,
            telefono: reparacion.telefono,
            modeloCelular: reparacion.modeloCelular,
            problema: reparacion.problema,
            costo: reparacion.costo,
            anticipo: reparacion.anticipo,
            restante: reparacion.restante,
            estado: reparacion.estado,
            fechaCreacion: reparacion.fechaCreacion,
            fechaModificacion: reparacion.fechaModificacion,
            fechaEliminacion: new Date().toISOString()
        };
        
        // Mover a borradas
        const responseBorrado = await fetch(API_BASE + 'ReparacionBorrada', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json'
            },
            body: JSON.stringify(reparacionBorrada)
        });
        
        if (!responseBorrado.ok) throw new Error('Error al mover a reparaciones borradas');
        
        // Eliminar de reparaciones activas
        const responseDelete = await fetch(API_BASE + `Reparacion/${id}`, {
            method: 'DELETE'
        });
        
        if (!responseDelete.ok) throw new Error('Error al eliminar la reparación');
        
        showAlert('Reparación eliminada correctamente', 'success');
        loadReparaciones();
    } catch (error) {
        console.error('Error al eliminar reparación:', error);
        showAlert(error.message || 'Error al eliminar la reparación', 'danger');
    } finally {
        showLoading(false);
    }
}

/**
 * Confirma la eliminación de todas las reparaciones
 */
function confirmDeleteAllReparaciones() {
    if (!confirmModal) return;
    
    document.getElementById('confirmModalBody').innerHTML = `
        <div class="alert alert-danger">
            <i class="bi bi-exclamation-triangle-fill me-2"></i>
            <strong>¡ADVERTENCIA!</strong> ¿Está seguro de que desea eliminar TODAS las reparaciones?
            <br><br>
            <small class="text-muted">Esta acción no se puede deshacer. Todas las reparaciones se moverán al historial de eliminadas.</small>
        </div>`;
    
    const confirmBtn = document.getElementById('confirmAction');
    if (confirmBtn) {
        confirmBtn.onclick = deleteAllReparaciones;
        confirmModal.show();
    }
}

/**
 * Elimina todas las reparaciones
 */
async function deleteAllReparaciones() {
    try {
        if (confirmModal) confirmModal.hide();
        showLoading(true, 'Eliminando todas las reparaciones...');
        
        const response = await fetch(API_BASE + 'Reparacion', {
            method: 'DELETE'
        });
        
        if (!response.ok) {
            const error = await response.json();
            throw new Error(error.message || 'Error al eliminar las reparaciones');
        }
        
        showAlert('Todas las reparaciones han sido eliminadas', 'success');
        loadReparaciones();
    } catch (error) {
        console.error('Error al eliminar todas las reparaciones:', error);
        showAlert(error.message || 'Error al eliminar todas las reparaciones', 'danger');
    } finally {
        showLoading(false);
    }
}

/**
 * Inicializa la funcionalidad de reparaciones
 */
function initReparaciones() {
    const form = document.getElementById('reparaciones-form');
    if (!form) return;
    
    form.addEventListener('submit', handleReparacionSubmit);
    
    document.getElementById('reparacion-anticipo').addEventListener('input', calcularRestante);
    document.getElementById('reparacion-costo').addEventListener('input', calcularRestante);
    
    const guardarEdicionBtn = document.getElementById('guardar-edicion-reparacion');
    if (guardarEdicionBtn) {
        guardarEdicionBtn.addEventListener('click', saveEditReparacion);
    }
    
    const borrarBtn = document.getElementById('borrar-reparaciones');
    if (borrarBtn) {
        borrarBtn.addEventListener('click', confirmDeleteAllReparaciones);
    }
    
    loadReparaciones();
}

// ==================== FUNCIONES PARA PRODUCTOS ====================

/**
 * Carga los productos desde la API
 */
async function loadProductos() {
    try {
        showLoading(true, 'Cargando productos...');
        const response = await fetch(API_BASE + 'Producto');
        if (!response.ok) throw new Error('Error al cargar productos');
        
        const productos = await response.json();
        renderProductosTable(productos);
    } catch (error) {
        console.error('Error al cargar productos:', error);
        showAlert('Error al cargar los productos', 'danger');
    } finally {
        showLoading(false);
    }
}

/**
 * Renderiza la tabla de productos
 * @param {Array} productos - Lista de productos
 */
function renderProductosTable(productos) {
    const table = document.getElementById('productos-table');
    if (!table) return;
    
    // Limpiar tabla completamente
    table.innerHTML = `
        <thead class="table-dark">
            <tr>
                <th>ID</th>
                <th>Nombre</th>
                <th>Modelo</th>
                <th>Stock</th>
                <th>Costo</th>
                <th>Precio</th>
                <th>Ganancia</th>
                <th>Acciones</th>
            </tr>
        </thead>
        <tbody>
            ${!productos || productos.length === 0 ? 
                `<tr>
                    <td colspan="8" class="text-center text-muted py-4">
                        No hay productos registrados
                    </td>
                </tr>` : 
                productos.map(producto => `
                <tr>
                    <td>${producto.id}</td>
                    <td>${producto.nombre || 'N/A'}</td>
                    <td>${producto.modeloCelular || 'N/A'}</td>
                    <td>${producto.stock}</td>
                    <td>$${(producto.costo || 0).toFixed(2)}</td>
                    <td>$${(producto.precio || 0).toFixed(2)}</td>
                    <td>$${((producto.precio || 0) - (producto.costo || 0)).toFixed(2)}</td>
                    <td class="text-nowrap">
                        <button class="btn btn-sm btn-outline-primary me-1" onclick="editProducto(${producto.id})" title="Editar">
                            <i class="bi bi-pencil"></i>
                        </button>
                        <button class="btn btn-sm btn-outline-danger" onclick="confirmDeleteProducto(${producto.id})" title="Eliminar">
                            <i class="bi bi-trash"></i>
                        </button>
                    </td>
                </tr>
                `).join('')}
        </tbody>`;
}

/**
 * Maneja el envío del formulario de productos
 * @param {Event} event - Evento de submit
 */
function handleProductoSubmit(event) {
    event.preventDefault();
    event.stopPropagation();
    
    const form = event.target;
    if (form.checkValidity()) {
        if (isEditing) {
            saveEditProducto(event);
        } else {
            addProducto(event);
        }
    }
    
    form.classList.add('was-validated');
}

/**
 * Agrega un nuevo producto
 * @param {Event} event - Evento de submit
 */
async function addProducto(event) {
    try {
        showLoading(true);
        
        const productoData = {
            nombre: document.getElementById('producto-nombre').value.trim(),
            modeloCelular: document.getElementById('producto-modelo').value.trim(),
            stock: parseInt(document.getElementById('producto-stock').value) || 0,  // Asegurar que sea número
            costo: parseFloat(document.getElementById('producto-costo').value) || 0,
            precio: parseFloat(document.getElementById('producto-precio').value) || 0
        };

        // Validación adicional
        if (!productoData.nombre || !productoData.modeloCelular) {
            throw new Error('Nombre y modelo son campos requeridos');
        }

        if (productoData.stock < 0 || productoData.costo < 0 || productoData.precio < 0) {
            throw new Error('Los valores no pueden ser negativos');
        }

        productoData.ganancia = productoData.precio - productoData.costo;
        
        const response = await fetch(API_BASE + 'Producto', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json'
            },
            body: JSON.stringify(productoData)
        });
        
        if (!response.ok) {
            const error = await response.text();  // Cambiado de json() a text() para manejar mejor los errores
            throw new Error(error || 'Error al agregar el producto');
        }
        
        showAlert('Producto agregado correctamente', 'success');
        resetProductoForm();
        loadProductos();
    } catch (error) {
        console.error('Error al agregar producto:', error);
        showAlert(error.message || 'Error al agregar el producto', 'danger');
    } finally {
        showLoading(false);
    }
}

/**
 * Edita un producto existente
 * @param {number} id - ID del producto
 */
async function editProducto(id) {
    try {
        showLoading(true);
        const response = await fetch(API_BASE + `Producto/${id}`);
        
        if (!response.ok) {
            throw new Error('Error al obtener los datos del producto');
        }
        
        const producto = await response.json();
        
        // Prellenar el formulario
        document.getElementById('producto-nombre').value = producto.nombre;
        document.getElementById('producto-modelo').value = producto.modeloCelular;
        document.getElementById('producto-stock').value = producto.stock;
        document.getElementById('producto-costo').value = producto.costo;
        document.getElementById('producto-precio').value = producto.precio;
        
        // Cambiar a modo edición
        isEditing = true;
        editingProductId = producto.id;
        toggleProductoButtons();
        
        // Desplazarse al formulario
        document.getElementById('productos-form').scrollIntoView({ behavior: 'smooth' });
    } catch (error) {
        console.error('Error al cargar producto para editar:', error);
        showAlert('Error al cargar el producto para editar', 'danger');
    } finally {
        showLoading(false);
    }
}

/**
 * Guarda los cambios al editar un producto
 * @param {Event} event - Evento de submit
 */
async function saveEditProducto(event) {
    event.preventDefault();
    
    try {
        showLoading(true);
        
        const productoData = {
            id: editingProductId,
            nombre: document.getElementById('producto-nombre').value.trim(),
            modeloCelular: document.getElementById('producto-modelo').value.trim(),
            stock: parseInt(document.getElementById('producto-stock').value),
            costo: parseFloat(document.getElementById('producto-costo').value),
            precio: parseFloat(document.getElementById('producto-precio').value)
        };
        
        productoData.ganancia = productoData.precio - productoData.costo;
        
        const response = await fetch(API_BASE + 'Producto/' + editingProductId, {
            method: 'PUT',
            headers: {
                'Content-Type': 'application/json'
            },
            body: JSON.stringify(productoData)
        });
        
        if (!response.ok) {
            const error = await response.json();
            throw new Error(error.message || 'Error al actualizar el producto');
        }
        
        showAlert('Producto actualizado correctamente', 'success');
        resetProductoForm();
        loadProductos();
    } catch (error) {
        console.error('Error al actualizar producto:', error);
        showAlert(error.message || 'Error al actualizar el producto', 'danger');
    } finally {
        showLoading(false);
    }
}

/**
 * Alterna los botones de edición en el formulario de productos
 */
function toggleProductoButtons() {
    const guardarBtn = document.querySelector('#productos-form button[type="submit"]');
    const guardarEdicionBtn = document.getElementById('guardar-edicion');
    
    if (guardarBtn && guardarEdicionBtn) {
        guardarBtn.disabled = isEditing;
        guardarEdicionBtn.style.display = isEditing ? 'inline-block' : 'none';
    }
}

/**
 * Resetea el formulario de productos
 */
function resetProductoForm() {
    const form = document.getElementById('productos-form');
    if (form) {
        form.reset();
        form.classList.remove('was-validated');
    }
    isEditing = false;
    editingProductId = null;
    toggleProductoButtons();
}

/**
 * Confirma la eliminación de un producto
 * @param {number} id - ID del producto
 */
function confirmDeleteProducto(id) {
    if (!confirmModal) return;
    
    document.getElementById('confirmModalBody').innerHTML = `
        ¿Está seguro de que desea eliminar este producto?<br><br>
        <small class="text-muted">El producto se moverá al historial de eliminados.</small>`;
    
    const confirmBtn = document.getElementById('confirmAction');
    if (confirmBtn) {
        confirmBtn.onclick = () => deleteProducto(id);
        confirmModal.show();
    }
}

/**
 * Elimina un producto (mueve a borrados)
 * @param {number} id - ID del producto
 */
async function deleteProducto(id) {
    try {
        if (confirmModal) confirmModal.hide();
        showLoading(true, 'Eliminando producto...');
        
        // Obtener datos del producto
        const responseGet = await fetch(API_BASE + `Producto/${id}`);
        if (!responseGet.ok) throw new Error('Error al obtener el producto');
        
        const producto = await responseGet.json();
        
        // Crear producto borrado
        const productoBorrado = {
            idProducto: producto.id,
            nombre: producto.nombre,
            modeloCelular: producto.modeloCelular,
            stock: producto.stock,
            costo: producto.costo,
            precio: producto.precio,
            ganancia: producto.ganancia
        };
        
        // Mover a borrados
        const responseBorrado = await fetch(API_BASE + 'ProductoBorrado', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json'
            },
            body: JSON.stringify(productoBorrado)
        });
        
        if (!responseBorrado.ok) throw new Error('Error al mover a productos borrados');
        
        // Eliminar de productos activos
        const responseDelete = await fetch(API_BASE + `Producto/${id}`, {
            method: 'DELETE'
        });
        
        if (!responseDelete.ok) throw new Error('Error al eliminar el producto');
        
        showAlert('Producto eliminado correctamente', 'success');
        loadProductos();
    } catch (error) {
        console.error('Error al eliminar producto:', error);
        showAlert(error.message || 'Error al eliminar el producto', 'danger');
    } finally {
        showLoading(false);
    }
}

/**
 * Confirma la eliminación de todos los productos
 */
function confirmDeleteAllProductos() {
    if (!confirmModal) return;
    
    document.getElementById('confirmModalBody').innerHTML = `
        <div class="alert alert-danger">
            <i class="bi bi-exclamation-triangle-fill me-2"></i>
            <strong>¡ADVERTENCIA!</strong> ¿Está seguro de que desea eliminar TODOS los productos?
            <br><br>
            <small class="text-muted">Esta acción no se puede deshacer. Todos los productos se moverán al historial de eliminados.</small>
        </div>`;
    
    const confirmBtn = document.getElementById('confirmAction');
    if (confirmBtn) {
        confirmBtn.onclick = deleteAllProductos;
        confirmModal.show();
    }
}

/**
 * Elimina todos los productos
 */
async function deleteAllProductos() {
    try {
        if (confirmModal) confirmModal.hide();
        showLoading(true, 'Eliminando todos los productos...');
        
        const response = await fetch(API_BASE + 'Producto', {
            method: 'DELETE'
        });
        
        if (!response.ok) {
            const error = await response.json();
            throw new Error(error.message || 'Error al eliminar los productos');
        }
        
        showAlert('Todos los productos han sido eliminados', 'success');
        loadProductos();
    } catch (error) {
        console.error('Error al eliminar todos los productos:', error);
        showAlert(error.message || 'Error al eliminar todos los productos', 'danger');
    } finally {
        showLoading(false);
    }
}

/**
 * Inicializa la funcionalidad de productos
 */
function initProductos() {
    const form = document.getElementById('productos-form');
    if (!form) return;
    
    form.addEventListener('submit', handleProductoSubmit);
    
    const guardarEdicionBtn = document.getElementById('guardar-edicion');
    if (guardarEdicionBtn) {
        guardarEdicionBtn.addEventListener('click', saveEditProducto);
    }
    
    const borrarBtn = document.getElementById('borrar-productos');
    if (borrarBtn) {
        borrarBtn.addEventListener('click', confirmDeleteAllProductos);
    }
    
    loadProductos();
}

// ==================== FUNCIONES PARA NOTAS ====================

/**
 * Carga las notas desde la API
 */
async function loadNotas() {
    try {
        showLoading(true, 'Cargando notas...');
        const response = await fetch(API_BASE + 'Nota');
        if (!response.ok) throw new Error('Error al cargar notas');
        
        const notas = await response.json();
        renderNotasList(notas);
    } catch (error) {
        console.error('Error al cargar notas:', error);
        showAlert('Error al cargar las notas', 'danger');
    } finally {
        showLoading(false);
    }
}

/**
 * Renderiza la lista de notas
 * @param {Array} notas - Lista de notas
 */
function renderNotasList(notas) {
    const notasList = document.getElementById('notas-list');
    if (!notasList) return;
    
    notasList.innerHTML = '';
    
    if (!notas || notas.length === 0) {
        notasList.innerHTML = `
            <div class="alert alert-info">
                No hay notas registradas
            </div>`;
        return;
    }
    
    notas.forEach(nota => {
        const notaCard = document.createElement('div');
        notaCard.className = 'card mb-3';
        notaCard.innerHTML = `
            <div class="card-body">
                <h5 class="card-title">${nota.asunto}</h5>
                <p class="card-text">${nota.contenido}</p>
                <button class="btn btn-sm btn-outline-danger" onclick="confirmDeleteNota(${nota.id})">
                    <i class="bi bi-trash"></i> Eliminar
                </button>
            </div>`;
        notasList.appendChild(notaCard);
    });
}

/**
 * Maneja el envío del formulario de notas
 * @param {Event} event - Evento de submit
 */
function handleNotaSubmit(event) {
    event.preventDefault();
    event.stopPropagation();
    
    const form = event.target;
    if (form.checkValidity()) {
        addNota(event);
    }
    
    form.classList.add('was-validated');
}

/**
 * Agrega una nueva nota
 * @param {Event} event - Evento de submit
 */
async function addNota(event) {
    try {
        showLoading(true);
        
        const notaData = {
            asunto: document.getElementById('nota-asunto').value.trim(),
            contenido: document.getElementById('nota-contenido').value.trim()
        };
        
        const response = await fetch(API_BASE + 'Nota', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json'
            },
            body: JSON.stringify(notaData)
        });
        
        if (!response.ok) {
            const error = await response.json();
            throw new Error(error.message || 'Error al agregar la nota');
        }
        
        showAlert('Nota agregada correctamente', 'success');
        document.getElementById('notas-form').reset();
        loadNotas();
    } catch (error) {
        console.error('Error al agregar nota:', error);
        showAlert(error.message || 'Error al agregar la nota', 'danger');
    } finally {
        showLoading(false);
    }
}

/**
 * Confirma la eliminación de una nota
 * @param {number} id - ID de la nota
 */
function confirmDeleteNota(id) {
    if (!confirmModal) return;
    
    document.getElementById('confirmModalBody').innerHTML = `
        ¿Está seguro de que desea eliminar esta nota?<br><br>
        <small class="text-muted">La nota se moverá al historial de eliminadas.</small>`;
    
    const confirmBtn = document.getElementById('confirmAction');
    if (confirmBtn) {
        confirmBtn.onclick = () => deleteNota(id);
        confirmModal.show();
    }
}

/**
 * Elimina una nota (mueve a borradas)
 * @param {number} id - ID de la nota
 */
async function deleteNota(id) {
    try {
        if (confirmModal) confirmModal.hide();
        showLoading(true, 'Eliminando nota...');
        
        // Obtener datos de la nota
        const responseGet = await fetch(API_BASE + `Nota/${id}`);
        if (!responseGet.ok) throw new Error('Error al obtener la nota');
        
        const nota = await responseGet.json();
        
        // Crear nota borrada
        const notaBorrada = {
            idNota: nota.id,
            asunto: nota.asunto,
            contenido: nota.contenido
        };
        
        // Mover a borradas
        const responseBorrado = await fetch(API_BASE + 'NotaBorrada', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json'
            },
            body: JSON.stringify(notaBorrada)
        });
        
        if (!responseBorrado.ok) throw new Error('Error al mover a notas borradas');
        
        // Eliminar de notas activas
        const responseDelete = await fetch(API_BASE + `Nota/${id}`, {
            method: 'DELETE'
        });
        
        if (!responseDelete.ok) throw new Error('Error al eliminar la nota');
        
        showAlert('Nota eliminada correctamente', 'success');
        loadNotas();
    } catch (error) {
        console.error('Error al eliminar nota:', error);
        showAlert(error.message || 'Error al eliminar la nota', 'danger');
    } finally {
        showLoading(false);
    }
}

/**
 * Confirma la eliminación de todas las notas
 */
function confirmDeleteAllNotas() {
    if (!confirmModal) return;
    
    document.getElementById('confirmModalBody').innerHTML = `
        <div class="alert alert-danger">
            <i class="bi bi-exclamation-triangle-fill me-2"></i>
            <strong>¡ADVERTENCIA!</strong> ¿Está seguro de que desea eliminar TODAS las notas?
            <br><br>
            <small class="text-muted">Esta acción no se puede deshacer. Todas las notas se moverán al historial de eliminadas.</small>
        </div>`;
    
    const confirmBtn = document.getElementById('confirmAction');
    if (confirmBtn) {
        confirmBtn.onclick = deleteAllNotas;
        confirmModal.show();
    }
}

/**
 * Elimina todas las notas
 */
async function deleteAllNotas() {
    try {
        if (confirmModal) confirmModal.hide();
        showLoading(true, 'Eliminando todas las notas...');
        
        const response = await fetch(API_BASE + 'Nota', {
            method: 'DELETE'
        });
        
        if (!response.ok) {
            const error = await response.json();
            throw new Error(error.message || 'Error al eliminar las notas');
        }
        
        showAlert('Todas las notas han sido eliminadas', 'success');
        loadNotas();
    } catch (error) {
        console.error('Error al eliminar todas las notas:', error);
        showAlert(error.message || 'Error al eliminar todas las notas', 'danger');
    } finally {
        showLoading(false);
    }
}

/**
 * Inicializa la funcionalidad de notas
 */
function initNotas() {
    const form = document.getElementById('notas-form');
    if (!form) return;
    
    form.addEventListener('submit', handleNotaSubmit);
    
    const borrarBtn = document.getElementById('borrar-notas');
    if (borrarBtn) {
        borrarBtn.addEventListener('click', confirmDeleteAllNotas);
    }
    
    loadNotas();
}

// ==================== FUNCIONES PARA ELEMENTOS BORRADOS ====================

/**
 * Carga los productos borrados
 */
async function loadProductosBorrados() {
    try {
        showLoading(true, 'Cargando productos eliminados...');
        const response = await fetch(API_BASE + 'ProductoBorrado');
        if (!response.ok) throw new Error('Error al cargar productos borrados');
        
        const productos = await response.json();
        renderProductosBorradosTable(productos);
    } catch (error) {
        console.error('Error al cargar productos borrados:', error);
        showAlert('Error al cargar productos eliminados', 'danger');
    } finally {
        showLoading(false);
    }
}

/**
 * Renderiza la tabla de productos borrados
 * @param {Array} productos - Lista de productos borrados
 */
function renderProductosBorradosTable(productos) {
    const table = document.getElementById('productos-borrados-table');
    if (!table) return;
    
    // Limpiar tabla
    const tbody = table.querySelector('tbody') || document.createElement('tbody');
    tbody.innerHTML = '';
    
    if (!productos || productos.length === 0) {
        tbody.innerHTML = `
            <tr>
                <td colspan="8" class="text-center text-muted py-4">
                    No hay productos eliminados
                </td>
            </tr>`;
        table.appendChild(tbody);
        return;
    }
    
    productos.forEach(producto => {
        const row = document.createElement('tr');
        row.innerHTML = `
            <td>${producto.id}</td>
            <td>${producto.idProducto}</td>
            <td>${producto.nombre}</td>
            <td>${producto.modeloCelular}</td>
            <td>${producto.stock}</td>
            <td>$${producto.costo.toFixed(2)}</td>
            <td>$${producto.precio.toFixed(2)}</td>
            <td>$${(producto.precio - producto.costo).toFixed(2)}</td>`;
        tbody.appendChild(row);
    });
    
    table.appendChild(tbody);
}

/**
 * Carga las notas borradas
 */
async function loadNotasBorradas() {
    try {
        showLoading(true, 'Cargando notas eliminadas...');
        const response = await fetch(API_BASE + 'NotaBorrada');
        if (!response.ok) throw new Error('Error al cargar notas borradas');
        
        const notas = await response.json();
        renderNotasBorradasTable(notas);
    } catch (error) {
        console.error('Error al cargar notas borradas:', error);
        showAlert('Error al cargar notas eliminadas', 'danger');
    } finally {
        showLoading(false);
    }
}

/**
 * Renderiza la tabla de notas borradas
 * @param {Array} notas - Lista de notas borradas
 */
function renderNotasBorradasTable(notas) {
    const table = document.getElementById('notas-borradas-table');
    if (!table) return;
    
    // Limpiar tabla
    const tbody = table.querySelector('tbody') || document.createElement('tbody');
    tbody.innerHTML = '';
    
    if (!notas || notas.length === 0) {
        tbody.innerHTML = `
            <tr>
                <td colspan="4" class="text-center text-muted py-4">
                    No hay notas eliminadas
                </td>
            </tr>`;
        table.appendChild(tbody);
        return;
    }
    
    notas.forEach(nota => {
        const row = document.createElement('tr');
        row.innerHTML = `
            <td>${nota.id}</td>
            <td>${nota.idNota}</td>
            <td>${nota.asunto}</td>
            <td>${nota.contenido}</td>`;
        tbody.appendChild(row);
    });
    
    table.appendChild(tbody);
}

/**
 * Carga las reparaciones borradas
 */
async function loadReparacionesBorradas() {
    try {
        showLoading(true, 'Cargando reparaciones eliminadas...');
        const response = await fetch(API_BASE + 'ReparacionBorrada');
        if (!response.ok) throw new Error('Error al cargar reparaciones borradas');
        
        const reparaciones = await response.json();
        renderReparacionesBorradasTable(reparaciones);
    } catch (error) {
        console.error('Error al cargar reparaciones borradas:', error);
        showAlert('Error al cargar reparaciones eliminadas', 'danger');
    } finally {
        showLoading(false);
    }
}

/**
 * Renderiza la tabla de reparaciones borradas
 * @param {Array} reparaciones - Lista de reparaciones borradas
 */
function renderReparacionesBorradasTable(reparaciones) {
    const table = document.getElementById('reparaciones-borradas-table');
    if (!table) return;
    
    // Limpiar tabla
    const tbody = table.querySelector('tbody') || document.createElement('tbody');
    tbody.innerHTML = '';
    
    if (!reparaciones || reparaciones.length === 0) {
        tbody.innerHTML = `
            <tr>
                <td colspan="13" class="text-center text-muted py-4">
                    No hay reparaciones eliminadas
                </td>
            </tr>`;
        table.appendChild(tbody);
        return;
    }
    
    reparaciones.forEach(reparacion => {
        const row = document.createElement('tr');
        row.innerHTML = `
            <td>${reparacion.id}</td>
            <td>${reparacion.idReparacion}</td>
            <td>${reparacion.nombre}</td>
            <td>${reparacion.telefono}</td>
            <td>${reparacion.modeloCelular}</td>
            <td>${reparacion.problema}</td>
            <td>$${reparacion.costo.toFixed(2)}</td>
            <td>$${reparacion.anticipo.toFixed(2)}</td>
            <td>$${reparacion.restante.toFixed(2)}</td>
            <td>${reparacion.estado}</td>
            <td>${formatDateTime(reparacion.fechaCreacion)}</td>
            <td>${formatDateTime(reparacion.fechaModificacion)}</td>
            <td>${formatDateTime(reparacion.fechaEliminacion)}</td>`;
        tbody.appendChild(row);
    });
    
    table.appendChild(tbody);
}

// ==================== INICIALIZACIÓN ====================

/**
 * Inicializa la aplicación
 */
function initApp() {
    // Inicializar modal de confirmación
    const modalElement = document.getElementById('confirmModal');
    if (modalElement) {
        confirmModal = new bootstrap.Modal(modalElement);
    }
    
    // Inicializar módulos según la página actual
    const path = window.location.pathname;
    
    if (path.endsWith('reparaciones.html')) {
        initReparaciones();
    } else if (path.endsWith('productos.html')) {
        initProductos();
    } else if (path.endsWith('index.html') || path.endsWith('/')) {
        initNotas();
    } else if (path.endsWith('eliminadas.html')) {
        loadProductosBorrados();
        loadNotasBorradas();
        loadReparacionesBorradas();
    }
    
    // Seguridad para ocultar loading si persiste
    setTimeout(() => {
        const loadingDiv = document.getElementById('loadingDiv');
        if (loadingDiv && loadingDiv.style.display !== 'none') {
            loadingDiv.style.display = 'none';
            console.warn('Loading ocultado por timeout');
        }
    }, 10000); // 10 segundos máximo
}

// Iniciar la aplicación cuando el DOM esté listo
document.addEventListener('DOMContentLoaded', initApp);

// Asegurar que el loading se oculte incluso si hay un error no capturado
window.addEventListener('error', () => {
    const loadingDiv = document.getElementById('loadingDiv');
    if (loadingDiv) loadingDiv.style.display = 'none';
});

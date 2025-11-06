// CONSTANTES Y VARIABLES GLOBALES
const API_BASE = 'http://localhost:5194/api/';
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

/**
 * Imprime un recibo de reparación
 * @param {number} id - ID de la reparación
 */
async function printRecibo(id) {
    try {
        showLoading(true, 'Generando recibo...');
        
        const response = await fetch(API_BASE + `Reparacion/${id}`);
        if (!response.ok) throw new Error('Error al obtener la reparación');
        
        const reparacion = await response.json();
        
        const fechaActual = new Date();
        const fecha = fechaActual.toLocaleDateString();
        const hora = fechaActual.toLocaleTimeString([], {hour: '2-digit', minute:'2-digit'});
        
        const reciboHtml = `
            <!DOCTYPE html>
            <html>
            <head>
                <title>Recibo de Reparación #${reparacion.id}</title>
                <style>
                    body { font-family: Arial, sans-serif; margin: 0; padding: 20px; }
                    .recibo { max-width: 300px; margin: 0 auto; border: 1px solid #ddd; padding: 20px; }
                    .header { text-align: center; margin-bottom: 20px; }
                    .logo { max-width: 80px; margin-bottom: 10px; }
                    .title { font-size: 18px; font-weight: bold; margin-bottom: 5px; }
                    .info { margin-bottom: 15px; }
                    .info p { margin: 5px 0; }
                    .total { font-weight: bold; margin-top: 10px; }
                    .footer { text-align: center; margin-top: 20px; font-size: 12px; color: #666; }
                    hr { border-top: 1px dashed #ddd; margin: 15px 0; }
                </style>
            </head>
            <body>
                <div class="recibo">
                    <div class="header">
                        <div class="title">DLTEC</div>
                        <div>Recibo de Reparación</div>
                    </div>
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
                    <div class="footer">
                        ¡Gracias por su preferencia!<br>
                        Tel: 395-123-22-11
                    </div>
                </div>
            </body>
            </html>`;
        
        const ventana = window.open('', '_blank', 'width=400,height=600');
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
    } finally {
        showLoading(false); // Esto debe estar presente en todas las funciones async
    }
}

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
// Solo previene submit de forms invisibles o ajenos (¡NUNCA el generado!)
window.addEventListener(
  "submit",
  function (ev) {
    if (
      ev.target.tagName === "FORM" &&
      ev.target.id &&
      ev.target.id.startsWith("formEtiqueta-")
    )
      return;
    ev.preventDefault();
    console.log("🔥 Previniendo un submit global fantasma!");
  },
  true
);

document.addEventListener("DOMContentLoaded", function () {
  // --------- Variables y referencias
  const dropArea = document.getElementById("drop-area");
  const fileInput = document.getElementById("pdfInput");
  const btnUpload = document.getElementById("btnUpload");
  let lastFile = null;

  // --------- Drag & Drop área
  dropArea.addEventListener("click", () => fileInput.click());
  dropArea.addEventListener("dragover", (e) => {
    e.preventDefault();
    dropArea.classList.add("dragover");
  });
  dropArea.addEventListener("dragleave", (e) => {
    e.preventDefault();
    dropArea.classList.remove("dragover");
  });
  dropArea.addEventListener("drop", async (e) => {
    e.preventDefault();
    dropArea.classList.remove("dragover");
    if (e.dataTransfer.files.length) {
      fileInput.files = e.dataTransfer.files;
      lastFile = fileInput.files[0];
      await procesarPDF(lastFile);
    }
  });

  // --------- Input tradicional
  fileInput.addEventListener("change", async function () {
    if (!fileInput.files.length) return;
    lastFile = fileInput.files[0];
    await procesarPDF(lastFile);
  });

  // --------- Botón subir (opcional)
  btnUpload.addEventListener("click", async function () {
    if (!lastFile) return alert("Selecciona o arrastra un PDF primero.");
    await procesarPDF(lastFile);
  });

  // --------- Procesar PDF - Versión mejorada
  async function procesarPDF(file) {
    mostrarPreviewLoading();
    const formData = new FormData();
    formData.append("file", file);

    try {
      const resp = await fetch("http://127.0.0.1:8000/extract_pdf_data", {
        method: "POST",
        body: formData,
      });
      
      if (!resp.ok) {
        const errorData = await resp.json().catch(() => ({}));
        throw new Error(errorData.detail || "Error al procesar el PDF (Código: " + resp.status + ")");
      }
      
      const data = await resp.json();
      renderEditableForm(data);
    } catch (e) {
      console.error("Error procesando PDF:", e);
      mostrarPreviewError(`
        <div style="display:flex;align-items:center;gap:10px;margin-bottom:15px;">
          <i class="fas fa-exclamation-triangle" style="font-size:24px;color:#d32f2f;"></i>
          <h3 style="margin:0;color:#d32f2f;">Error al procesar el PDF</h3>
        </div>
        <p><strong>Detalles:</strong> ${e.message}</p>
        <p style="margin-top:10px;font-size:0.9em;">
          <i class="fas fa-lightbulb"></i> Asegúrate de que:
          <ul style="margin-top:5px;padding-left:20px;">
            <li>El archivo es un PDF válido</li>
            <li>Contiene texto (no es un PDF escaneado)</li>
            <li>Tiene el formato de una Ficha de Seguridad</li>
          </ul>
        </p>
        <button onclick="location.reload()" class="btn btn-outline" style="margin-top:15px;">
          <i class="fas fa-sync-alt"></i> Intentar de nuevo
        </button>
      `);
    }
  }

  // --------- Mostrar preview de carga/error
  function mostrarPreviewLoading() {
    document.getElementById(
      "previewEtiqueta"
    ).innerHTML = `
      <div class="card" style="padding:30px;text-align:center;">
        <div style="display:inline-flex;align-items:center;gap:10px;margin-bottom:15px;">
          <i class="fas fa-spinner fa-spin" style="font-size:28px;"></i>
          <h3 style="margin:0;">Procesando PDF...</h3>
        </div>
        <p>Extrayendo datos de seguridad del documento</p>
        <div class="progress-bar" style="margin-top:20px;">
          <div class="progress" style="width:70%;"></div>
        </div>
      </div>
      <style>
        .progress-bar {
          height: 6px;
          background: #e0e0e0;
          border-radius: 3px;
          overflow: hidden;
        }
        .progress {
          height: 100%;
          background: #4CAF50;
          animation: progress 2s ease-in-out infinite;
        }
        @keyframes progress {
          0% { transform: translateX(-100%); }
          100% { transform: translateX(200%); }
        }
      </style>
    `;
  }

  function mostrarPreviewError(msg) {
    document.getElementById("previewEtiqueta").innerHTML = `
      <div class="card" style="padding:25px;border-left:4px solid #d32f2f;">
        ${msg}
      </div>
    `;
  }

  // --------- Renderiza formulario editable + preview etiqueta + botón imprimir
  function renderEditableForm(data) {
    try {
      const getText = (v) => (typeof v === "string" ? v : "");
      const getArr = (v) => (Array.isArray(v) ? v : []);
      const preview = document.getElementById("previewEtiqueta");
      
      // Variable modificable para pictogramas (con opción de eliminar)
      let pictos = getArr(data.pictogramas);
      
      // HTML para pictogramas con botón de eliminar
      let pictosHtml = pictos.length > 0 
        ? pictos.map((pic, index) => `
            <div style="position:relative;display:inline-block;">
              <img src="../../images/${pic}.png" alt="${pic}" title="${pic}" 
                   style="height:60px;margin:4px;background:#f5f5f5;padding:5px;border-radius:4px;"
                   onerror="this.src='../../images/default-pictogram.png';this.title='Pictograma no disponible'">
              <button class="btn-remove-picto" data-index="${index}" 
                      style="position:absolute;top:-8px;right:-8px;background:#ff4444;color:white;border:none;border-radius:50%;width:20px;height:20px;font-size:12px;cursor:pointer;">
                ×
              </button>
            </div>
          `).join("")
        : '<div style="color:#666;padding:10px;background:#f5f5f5;border-radius:4px;">' +
          '<i class="fas fa-info-circle"></i> No se detectaron pictogramas</div>';

      const formId = "formEtiqueta-" + Date.now();

      preview.innerHTML = `
        <div class="card" style="padding:25px;">
          <div style="display:flex;align-items:center;gap:10px;margin-bottom:20px;">
            <i class="fas fa-file-alt" style="font-size:24px;color:#4CAF50;"></i>
            <h3 style="margin:0;">Datos extraídos del PDF</h3>
          </div>
          
          <p style="margin-bottom:20px;color:#666;">
            <i class="fas fa-info-circle"></i> Revisa y edita los datos detectados antes de guardar
          </p>
          
          <form id="${formId}" autocomplete="off">
            <div class="form-group">
              <label>Nombre del producto *</label>
              <input name="nombre_producto" value="${escapeHtml(getText(data.nombre_producto))}" 
                     class="form-control" required>
            </div>
            
            <div class="form-group">
              <label>Indicaciones de peligro (Frases H)</label>
              <textarea name="indicaciones_peligro" rows="3" class="form-control">${
                getArr(data.indicaciones_peligro).join("\n")
              }</textarea>
            </div>
            
            <div class="form-group">
              <label>Consejos de prudencia (Frases P)</label>
              <textarea name="consejos_prudencia" rows="3" class="form-control">${
                getArr(data.consejos_prudencia).join("\n")
              }</textarea>
            </div>
            
            <div class="form-group">
              <label>Información de emergencia</label>
              <textarea name="informacion_emergencia" rows="2" class="form-control">${
                getArr(data.informacion_emergencia).join("\n")
              }</textarea>
            </div>
            
            <div style="display:grid;grid-template-columns:1fr 1fr;gap:20px;margin-bottom:20px;">
              <div class="form-group">
                <label>Palabra de advertencia</label>
                <input name="palabra_advertencia" value="${escapeHtml(getText(data.palabra_advertencia))}" 
                       class="form-control">
              </div>
              
              <div class="form-group">
                <label>Número CAS</label>
                <input name="cas" value="${escapeHtml(getText(data.cas))}" 
                       class="form-control">
              </div>
            </div>
            
            <div class="form-group">
              <label>Pictogramas detectados</label>
              <div style="display:flex;flex-wrap:wrap;gap:10px;margin-top:10px;">
                ${pictosHtml}
              </div>
            </div>
            
            <div style="display:flex;gap:15px;margin-top:25px;">
              <button type="button" class="btn btn-success" id="btnGuardarEtiqueta">
                <i class="fas fa-save"></i> Guardar Etiqueta
              </button>
              <button type="button" class="btn btn-primary" id="btnImprimirEtiqueta">
                <i class="fas fa-print"></i> Vista para Imprimir
              </button>
            </div>
          </form>
          
          <div id="previewImprimir" style="margin-top:30px; display:none;"></div>
        </div>
        
        <style>
          .form-group {
            margin-bottom: 20px;
          }
          .form-group label {
            display: block;
            margin-bottom: 8px;
            font-weight: 600;
            color: #333;
          }
          .form-control {
            width: 100%;
            padding: 10px;
            border: 1px solid #ddd;
            border-radius: 4px;
            font-size: 14px;
          }
          .form-control:focus {
            border-color: #4CAF50;
            outline: none;
            box-shadow: 0 0 0 2px rgba(76, 175, 80, 0.2);
          }
          textarea.form-control {
            min-height: 80px;
            resize: vertical;
          }
          .btn-remove-picto:hover {
            background: #cc0000 !important;
          }
        </style>
      `;

      // Función para escapar HTML (seguridad básica)
      function escapeHtml(unsafe) {
        if (!unsafe) return '';
        return unsafe
          .toString()
          .replace(/&/g, "&amp;")
          .replace(/</g, "&lt;")
          .replace(/>/g, "&gt;")
          .replace(/"/g, "&quot;")
          .replace(/'/g, "&#039;");
      }

      const formEtiqueta = document.getElementById(formId);
      const btnGuardar = document.getElementById("btnGuardarEtiqueta");
      const btnImprimir = document.getElementById("btnImprimirEtiqueta");

      if (!formEtiqueta || !btnGuardar || !btnImprimir) {
        throw new Error("Elementos del formulario no encontrados");
      }

      // Manejador para eliminar pictogramas
      document.querySelectorAll('.btn-remove-picto').forEach(btn => {
        btn.addEventListener('click', function() {
          const index = parseInt(this.getAttribute('data-index'));
          pictos.splice(index, 1); // Elimina el pictograma del array
          
          // Vuelve a renderizar el formulario con los datos actuales
          renderEditableForm({
            nombre_producto: formEtiqueta.nombre_producto.value,
            indicaciones_peligro: formEtiqueta.indicaciones_peligro.value,
            consejos_prudencia: formEtiqueta.consejos_prudencia.value,
            informacion_emergencia: formEtiqueta.informacion_emergencia.value,
            palabra_advertencia: formEtiqueta.palabra_advertencia.value,
            cas: formEtiqueta.cas.value,
            pictogramas: pictos
          });
        });
      });

      btnGuardar.addEventListener("click", async function () {
        const datos = Object.fromEntries(new FormData(formEtiqueta).entries());
        
        // Validación básica
        if (!datos.nombre_producto.trim()) {
          alert("El nombre del producto es requerido");
          return;
        }

        try {
          const res = await fetch("http://127.0.0.1:8000/etiquetas", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({
              id_etiqueta: datos.cas || datos.nombre_producto,
              p_advertencia: datos.palabra_advertencia,
              inf_cas: datos.cas,
              fecha: new Date().toISOString().slice(0, 10),
              id_producto: datos.nombre_producto,
              frases_h: (datos.indicaciones_peligro || "").split("\n").filter(x => x),
              frases_p: (datos.consejos_prudencia || "").split("\n").filter(x => x),
              pictogramas: pictos, // Usamos el array actualizado de pictogramas
            }),
          });

          if (!res.ok) {
            throw new Error(await res.text());
          }

          // Mostrar mensaje de éxito
          const successMsg = document.createElement("div");
          successMsg.className = "alert alert-success";
          successMsg.style.marginTop = "20px";
          successMsg.style.padding = "15px";
          successMsg.style.borderRadius = "4px";
          successMsg.style.backgroundColor = "#4CAF50";
          successMsg.style.color = "white";
          successMsg.innerHTML = `
            <div style="display:flex;align-items:center;gap:10px;">
              <i class="fas fa-check-circle"></i>
              <span>Etiqueta guardada correctamente en la base de datos</span>
            </div>
          `;
          formEtiqueta.parentNode.insertBefore(successMsg, formEtiqueta.nextSibling);

          // Desaparecer después de 3 segundos
          setTimeout(() => {
            successMsg.style.transition = "opacity 0.5s";
            successMsg.style.opacity = "0";
            setTimeout(() => successMsg.remove(), 500);
          }, 3000);

        } catch (error) {
          console.error("Error al guardar:", error);
          alert("Error al guardar etiqueta: " + error.message);
        }
      });

      btnImprimir.addEventListener("click", function () {
        const datos = Object.fromEntries(new FormData(formEtiqueta).entries());
        
        // Generar HTML para imprimir (incluye los pictogramas actualizados)
        let printPictosHtml = pictos.map(pic => `
          <img src="../../images/${pic}.png" alt="${pic}" 
               style="height:50px;margin:5px;background:#f5f5f5;padding:3px;border-radius:3px;">
        `).join("");
        
        let html = `
          <div style="border:2px solid #b30000;padding:20px;max-width:440px;font-family:sans-serif;background:white;">
            <h2 style="text-align:center;letter-spacing:1px;margin-top:0;color:#333;">${
              escapeHtml(datos.nombre_producto)
            }</h2>
            
            <div style="display:flex;justify-content:space-between;margin-bottom:15px;">
              <div style="font-weight:bold;color:#b30000;font-size:1.1em;">${
                escapeHtml(datos.palabra_advertencia || "Advertencia")
              }</div>
              <div style="font-weight:bold;">CAS: ${
                escapeHtml(datos.cas || "N/A")
              }</div>
            </div>
            
            <div style="margin-bottom:15px;">
              <div style="font-weight:bold;margin-bottom:5px;">Indicaciones de peligro:</div>
              <div style="padding-left:10px;">${
                (datos.indicaciones_peligro || "No especificado").replace(/\n/g, "<br>")
              }</div>
            </div>
            
            <div style="margin-bottom:15px;">
              <div style="font-weight:bold;margin-bottom:5px;">Consejos de prudencia:</div>
              <div style="padding-left:10px;">${
                (datos.consejos_prudencia || "No especificado").replace(/\n/g, "<br>")
              }</div>
            </div>
            
            <div style="margin-bottom:15px;">
              <div style="font-weight:bold;margin-bottom:5px;">Emergencia:</div>
              <div>${escapeHtml(datos.informacion_emergencia || "No especificado")}</div>
            </div>
            
            <div style="margin:15px 0;text-align:center;">
              ${printPictosHtml}
            </div>
          </div>
        `;

        let printWindow = window.open("", "PrintEtiqueta_" + Date.now(), "width=600,height=700");
        printWindow.document.write(`
          <!DOCTYPE html>
          <html>
          <head>
            <title>Imprimir Etiqueta</title>
            <link rel="stylesheet" href="https://cdnjs.cloudflare.com/ajax/libs/font-awesome/6.0.0-beta3/css/all.min.css">
            <style>
              body { 
                font-family: Arial, sans-serif; 
                margin: 0; 
                padding: 20px; 
                display: flex; 
                justify-content: center; 
                align-items: center; 
                min-height: 100vh; 
                background-color: #f5f5f5; 
              }
              .etiqueta-container { 
                background-color: white; 
                box-shadow: 0 0 10px rgba(0,0,0,0.1); 
                padding: 20px; 
              }
              @media print {
                body { background: none; }
                .etiqueta-container { box-shadow: none; }
              }
            </style>
          </head>
          <body>
            <div class="etiqueta-container">${html}</div>
            <script>
              setTimeout(() => {
                window.print();
                window.onafterprint = function() {
                  setTimeout(() => window.close(), 300);
                };
              }, 300);
            <\/script>
          </body>
          </html>
        `);
        printWindow.document.close();
      });

    } catch (err) {
      console.error("Error en renderEditableForm:", err);
      mostrarPreviewError(`
        <strong>Error al mostrar el formulario:</strong><br>
        ${err.message}<br><br>
        <button onclick="location.reload()" class="btn btn-outline">
          <i class="fas fa-sync-alt"></i> Recargar página
        </button>
      `);
    }
  }
});
document.addEventListener("DOMContentLoaded", function() {
  // Variables y referencias
  const dropArea = document.getElementById("drop-area");
  const fileInput = document.getElementById("pdfInput");
  const btnUpload = document.getElementById("btnUpload");
  let lastFile = null;

  // Manejo de drag and drop
  setupDragAndDrop();
  
  // Event listeners
  fileInput.addEventListener("change", handleFileSelect);
  btnUpload.addEventListener("click", handleUploadClick);

  function setupDragAndDrop() {
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
  }

  async function handleFileSelect() {
    if (!fileInput.files.length) return;
    lastFile = fileInput.files[0];
    await procesarPDF(lastFile);
  }

  async function handleUploadClick() {
    if (!lastFile) return alert("Selecciona o arrastra un PDF primero.");
    await procesarPDF(lastFile);
  }

  async function procesarPDF(file) {
    mostrarPreviewLoading();
    const formData = new FormData();
    formData.append("file", file);

    try {
      const resp = await fetch("http://127.0.0.1:8000/extract_pdf_data", {
        method: "POST",
        body: formData,
      });
      if (!resp.ok) throw new Error(await resp.text());
      const data = await resp.json();
      renderEditableForm(data);
    } catch (e) {
      mostrarPreviewError("No se pudo analizar el PDF.<br>" + e.message);
    }
  }

  function mostrarPreviewLoading() {
    document.getElementById("previewEtiqueta").innerHTML = `
      <div class="card" style="padding:30px;text-align:center;">
        <i class="fas fa-spinner fa-spin" style="font-size:28px"></i><br>Cargando y extrayendo datos...
      </div>`;
  }

  function mostrarPreviewError(msg) {
    document.getElementById("previewEtiqueta").innerHTML = `
      <div class="card" style="padding:30px;color:#b30000">${msg}</div>`;
  }

  function renderEditableForm(data) {
    try {
      const getText = (v) => (typeof v === "string" ? v : "");
      const getArr = (v) => (Array.isArray(v) ? v : []);
      const preview = document.getElementById("previewEtiqueta");
      const pictos = getArr(data.pictogramas);
      let pictosHtml = pictos
        .map(
          (pic) =>
            `<img src="../../images/${pic}.png" alt="${pic}" title="${pic}" style="height:60px;margin:4px;" onerror="this.style.display='none';">`
        )
        .join("");
      if (!pictosHtml) pictosHtml = '<i style="color:gray">Sin pictogramas detectados</i>';
      const formId = "formEtiqueta-" + Date.now();

      preview.innerHTML = `
        <div class="card">
          <h3>Datos extraídos (puedes editar)</h3>
          <form id="${formId}" autocomplete="off">
            <label>Nombre del producto:<br>
              <input name="nombre_producto" value="${getText(data.nombre_producto)}" required>
            </label>
            <label>Indicaciones de peligro:<br>
              <textarea name="indicaciones_peligro" rows="2">${getArr(data.indicaciones_peligro).join("\n")}</textarea>
            </label>
            <label>Consejos de prudencia:<br>
              <textarea name="consejos_prudencia" rows="2">${getArr(data.consejos_prudencia).join("\n")}</textarea>
            </label>
            <label>Información de emergencia:<br>
              <textarea name="informacion_emergencia" rows="1">${getArr(data.informacion_emergencia).join("\n")}</textarea>
            </label>
            <div class="form-row">
              <label>Palabra de advertencia:
                <input name="palabra_advertencia" value="${getText(data.palabra_advertencia)}">
              </label>
              <label>CAS:
                <input name="cas" value="${getText(data.cas)}">
              </label>
            </div>
            <div class="pictograms-container">
              <label>Pictogramas detectados:</label><br>
              ${pictosHtml}
            </div>
            <div class="form-actions">
              <button type="button" class="btn btn-success" id="btnGuardarEtiqueta">Guardar Etiqueta</button>
              <button type="button" class="btn btn-outline" id="btnImprimirEtiqueta">
                <i class="fas fa-print"></i> Imprimir Etiqueta
              </button>
            </div>
          </form>
          <div id="previewImprimir"></div>
        </div>`;

      setupFormActions(formId, pictos);
    } catch (err) {
      alert("❌ Error inesperado en renderEditableForm: " + err.message);
    }
  }

  function setupFormActions(formId, pictos) {
    const formEtiqueta = document.getElementById(formId);
    const btnGuardar = document.getElementById("btnGuardarEtiqueta");
    const btnImprimir = document.getElementById("btnImprimirEtiqueta");

    if (!formEtiqueta || !btnGuardar || !btnImprimir) {
      alert("❌ Elementos del formulario no encontrados");
      return;
    }

    btnGuardar.addEventListener("click", async function() {
      await guardarEtiqueta(formEtiqueta, pictos);
    });

    btnImprimir.addEventListener("click", function() {
      imprimirEtiqueta(formEtiqueta, pictos);
    });
  }

  async function guardarEtiqueta(form, pictos) {
    const datos = Object.fromEntries(new FormData(form).entries());
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
          frases_h: (datos.indicaciones_peligro || "").split("\n").filter((x) => x),
          frases_p: (datos.consejos_prudencia || "").split("\n").filter((x) => x),
          pictogramas: pictos,
        }),
      });

      if (!res.ok) throw new Error(await res.text());
      
      mostrarMensajeExito(form);
    } catch (error) {
      alert("Error al guardar etiqueta: " + error.message);
    }
  }

  function mostrarMensajeExito(form) {
    const successMsg = document.createElement("div");
    successMsg.className = "alert alert-success";
    successMsg.innerHTML = '<i class="fas fa-check-circle"></i> Etiqueta guardada correctamente en la base de datos';
    form.parentNode.insertBefore(successMsg, form.nextSibling);
    
    setTimeout(() => {
      successMsg.style.opacity = "0";
      setTimeout(() => successMsg.remove(), 300);
    }, 3000);
  }

  function imprimirEtiqueta(form, pictos) {
    const datos = Object.fromEntries(new FormData(form).entries());
    const pictosHtml = pictos.map(pic => 
      `<img src="../../images/${pic}.png" alt="${pic}" style="height:60px;margin:4px;">`
    ).join("");
    
    const html = `
      <div class="print-label">
        <h2>${datos.nombre_producto}</h2>
        <div class="cas-number">CAS: ${datos.cas}</div>
        <div class="clear"></div>
        <div class="warning">${datos.palabra_advertencia}</div>
        <div>
          <b>Indicaciones de peligro:</b><br>
          ${(datos.indicaciones_peligro || "").replace(/\n/g, "<br>")}
        </div>
        <div>
          <b>Consejos de prudencia:</b><br>
          ${(datos.consejos_prudencia || "").replace(/\n/g, "<br>")}
        </div>
        <div><b>Emergencia:</b> ${datos.informacion_emergencia || ""}</div>
        <div class="pictograms">${pictosHtml}</div>
      </div>`;
    
    const printWindow = window.open("", "PrintEtiqueta_" + Date.now(), "width=600,height=700");
    printWindow.document.write(`
      <!DOCTYPE html>
      <html>
      <head>
        <title>Imprimir Etiqueta</title>
        <link rel="stylesheet" href="https://cdnjs.cloudflare.com/ajax/libs/font-awesome/6.0.0-beta3/css/all.min.css">
        <style>
          body { font-family: Arial, sans-serif; margin: 0; padding: 20px; display: flex; justify-content: center; align-items: center; min-height: 100vh; background-color: #f5f5f5; }
          .etiqueta-container { background-color: white; box-shadow: 0 0 10px rgba(0,0,0,0.1); padding: 20px; }
          .clear { clear: both; }
        </style>
      </head>
      <body>
        <div class="etiqueta-container">${html}</div>
        <script>
          setTimeout(() => {
            window.print();
            window.onafterprint = function() {
              window.close();
            };
          }, 500);
        <\/script>
      </body>
      </html>
    `);
    printWindow.document.close();
  }
});

// Previene submit de forms no deseados
window.addEventListener("submit", function(ev) {
  if (ev.target.tagName === "FORM" && ev.target.id && ev.target.id.startsWith("formEtiqueta-")) return;
  ev.preventDefault();
  console.log("🔥 Previniendo un submit global fantasma!");
}, true);
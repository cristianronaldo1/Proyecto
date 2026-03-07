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
  },
  true
);

document.addEventListener("DOMContentLoaded", function () {
  const API = "http://127.0.0.1:8000";
  const dropArea = document.getElementById("drop-area");
  const fileInput = document.getElementById("pdfInput");
  const btnUpload = document.getElementById("btnUpload");
  const tablaEtiquetasBody = document.getElementById("tablaEtiquetasBody");
  const tablaSdsBody = document.getElementById("tablaSdsBody");
  const totalEtiquetas = document.getElementById("totalEtiquetas");
  const totalSds = document.getElementById("totalSds");

  let lastFile = null;

  if (dropArea && fileInput) {
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

    fileInput.addEventListener("change", async function () {
      if (!fileInput.files.length) return;
      lastFile = fileInput.files[0];
      await procesarPDF(lastFile);
    });
  }

  if (btnUpload) {
    btnUpload.addEventListener("click", async function () {
      if (!lastFile) return alert("Selecciona o arrastra un PDF primero.");
      await procesarPDF(lastFile);
    });
  }

  cargarResumen();

  async function cargarResumen() {
    await Promise.all([cargarEtiquetasGuardadas(), cargarSdsGuardadas(), cargarContadorEtiquetas()]);
  }

  async function procesarPDF(file) {
    mostrarPreviewLoading();
    const formData = new FormData();
    formData.append("file", file);

    try {
      const resp = await fetch(`${API}/extract_pdf_data`, {
        method: "POST",
        body: formData,
      });

      if (!resp.ok) {
        const errorData = await resp.json().catch(() => ({}));
        throw new Error(errorData.detail || `Error al procesar el PDF (${resp.status})`);
      }

      const data = await resp.json();
      renderEditableForm(data);
      await cargarSdsGuardadas();
    } catch (e) {
      mostrarPreviewError(`<strong>Error al procesar:</strong> ${e.message}`);
    }
  }

  function mostrarPreviewLoading() {
    const preview = document.getElementById("previewEtiqueta");
    if (!preview) return;
    preview.innerHTML = `
      <div class="card" style="padding:30px;text-align:center;">
        <i class="fas fa-spinner fa-spin" style="font-size:28px;"></i>
        <h3>Procesando PDF...</h3>
      </div>`;
  }

  function mostrarPreviewError(msg) {
    const preview = document.getElementById("previewEtiqueta");
    if (!preview) return;
    preview.innerHTML = `<div class="card" style="padding:25px;border-left:4px solid #d32f2f;">${msg}</div>`;
  }

  function escapeHtml(unsafe) {
    if (!unsafe) return "";
    return unsafe
      .toString()
      .replace(/&/g, "&amp;")
      .replace(/</g, "&lt;")
      .replace(/>/g, "&gt;")
      .replace(/"/g, "&quot;")
      .replace(/'/g, "&#039;");
  }

  function renderEditableForm(data) {
    const preview = document.getElementById("previewEtiqueta");
    if (!preview) return;

    const getText = (v) => (typeof v === "string" ? v : "");
    const getArr = (v) => (Array.isArray(v) ? v : []);
    let pictos = getArr(data.pictogramas);
    const formId = "formEtiqueta-" + Date.now();

    const pictosHtml = pictos.length
      ? pictos
          .map(
            (pic, index) => `
        <div style="position:relative;display:inline-block;">
          <img src="../../images/${pic}.png" alt="${pic}" title="${pic}" style="height:60px;margin:4px;background:#f5f5f5;padding:5px;border-radius:4px;">
          <button class="btn-remove-picto" data-index="${index}" style="position:absolute;top:-8px;right:-8px;background:#ff4444;color:white;border:none;border-radius:50%;width:20px;height:20px;">×</button>
        </div>`
          )
          .join("")
      : "<i>Sin pictogramas</i>";

    preview.innerHTML = `
      <div class="card" style="padding:25px;">
        <h3>Datos extraídos del PDF</h3>
        <form id="${formId}" autocomplete="off">
          <label>Nombre del producto *</label>
          <input name="nombre_producto" class="form-control" value="${escapeHtml(getText(data.nombre_producto))}" required>

          <label>Indicaciones de peligro</label>
          <textarea name="indicaciones_peligro" rows="3" class="form-control">${getArr(data.indicaciones_peligro).join("\n")}</textarea>

          <label>Consejos de prudencia</label>
          <textarea name="consejos_prudencia" rows="3" class="form-control">${getArr(data.consejos_prudencia).join("\n")}</textarea>

          <label>Información de emergencia</label>
          <textarea name="informacion_emergencia" rows="2" class="form-control">${getArr(data.informacion_emergencia).join("\n")}</textarea>

          <label>Palabra de advertencia</label>
          <input name="palabra_advertencia" class="form-control" value="${escapeHtml(getText(data.palabra_advertencia))}">

          <label>Número CAS</label>
          <input name="cas" class="form-control" value="${escapeHtml(getText(data.cas))}">

          <input type="hidden" name="id_sds" value="${data.id_sds || ""}">

          <div style="margin-top:10px;">${pictosHtml}</div>
          <div style="display:flex;gap:12px;margin-top:20px;">
            <button type="button" class="btn btn-success" id="btnGuardarEtiqueta">Guardar Etiqueta</button>
            <button type="button" class="btn btn-primary" id="btnImprimirEtiqueta">Imprimir</button>
          </div>
        </form>
      </div>`;

    const formEtiqueta = document.getElementById(formId);
    const btnGuardar = document.getElementById("btnGuardarEtiqueta");
    const btnImprimir = document.getElementById("btnImprimirEtiqueta");

    document.querySelectorAll(".btn-remove-picto").forEach((btn) => {
      btn.addEventListener("click", function () {
        pictos.splice(parseInt(this.getAttribute("data-index"), 10), 1);
        renderEditableForm({ ...Object.fromEntries(new FormData(formEtiqueta).entries()), pictogramas: pictos, indicaciones_peligro: formEtiqueta.indicaciones_peligro.value.split("\n"), consejos_prudencia: formEtiqueta.consejos_prudencia.value.split("\n"), informacion_emergencia: formEtiqueta.informacion_emergencia.value.split("\n") });
      });
    });

    btnGuardar.addEventListener("click", async function () {
      const datos = Object.fromEntries(new FormData(formEtiqueta).entries());
      if (!datos.nombre_producto.trim()) return alert("El nombre del producto es requerido");
      try {
        const res = await fetch(`${API}/etiquetas/guardar`, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            nombre_producto: datos.nombre_producto,
            indicaciones_peligro: (datos.indicaciones_peligro || "").split("\n").map((x) => x.trim()).filter(Boolean),
            consejos_prudencia: (datos.consejos_prudencia || "").split("\n").map((x) => x.trim()).filter(Boolean),
            informacion_emergencia: (datos.informacion_emergencia || "").split("\n").map((x) => x.trim()).filter(Boolean),
            pictogramas: pictos,
            palabra_advertencia: datos.palabra_advertencia,
            cas: datos.cas,
            id_sds: datos.id_sds ? Number(datos.id_sds) : null,
          }),
        });
        if (!res.ok) throw new Error(await res.text());
        alert("Etiqueta guardada correctamente.");
        await cargarEtiquetasGuardadas();
        await cargarContadorEtiquetas();
      } catch (error) {
        alert("Error al guardar etiqueta: " + error.message);
      }
    });

    btnImprimir.addEventListener("click", function () {
      imprimirEtiqueta({
        nombre_producto: formEtiqueta.nombre_producto.value,
        palabra_advertencia: formEtiqueta.palabra_advertencia.value,
        cas: formEtiqueta.cas.value,
        indicaciones_peligro: formEtiqueta.indicaciones_peligro.value,
        consejos_prudencia: formEtiqueta.consejos_prudencia.value,
        informacion_emergencia: formEtiqueta.informacion_emergencia.value,
        pictogramas: pictos,
      });
    });
  }

  function imprimirEtiqueta(datos) {
    const pictosHtml = (datos.pictogramas || []).map((pic) => `<img src="../../images/${pic}.png" style="height:50px;margin:5px;">`).join("");
    const html = `
      <div style="border:2px solid #b30000;padding:20px;max-width:440px;font-family:sans-serif;">
        <h2 style="text-align:center;">${escapeHtml(datos.nombre_producto)}</h2>
        <b>${escapeHtml(datos.palabra_advertencia || "Advertencia")}</b> - <b>CAS: ${escapeHtml(datos.cas || "N/A")}</b>
        <p><b>Indicaciones:</b><br>${escapeHtml(datos.indicaciones_peligro || "").replace(/\n/g, "<br>")}</p>
        <p><b>Consejos:</b><br>${escapeHtml(datos.consejos_prudencia || "").replace(/\n/g, "<br>")}</p>
        <p><b>Emergencia:</b> ${escapeHtml(datos.informacion_emergencia || "")}</p>
        <div>${pictosHtml}</div>
      </div>`;

    const w = window.open("", "PrintEtiqueta_" + Date.now(), "width=600,height=700");
    w.document.write(`<!doctype html><html><body style="display:flex;justify-content:center;padding:20px;">${html}<script>setTimeout(()=>{window.print();},300);<\/script></body></html>`);
    w.document.close();
  }

  async function cargarContadorEtiquetas() {
    if (!totalEtiquetas) return;
    try {
      const resp = await fetch(`${API}/etiquetas/contador`);
      const data = await resp.json();
      totalEtiquetas.textContent = data.total_guardadas ?? 0;
    } catch {
      totalEtiquetas.textContent = "0";
    }
  }

  async function cargarEtiquetasGuardadas() {
    if (!tablaEtiquetasBody) return;
    try {
      const resp = await fetch(`${API}/etiquetas/guardadas`);
      const data = await resp.json();
      const rows = data.etiquetas || [];
      tablaEtiquetasBody.innerHTML = rows.length
        ? rows
            .map((item) => {
              const fecha = new Date(item.fecha_registro).toLocaleDateString("es-CO");
              return `
                <tr>
                  <td>${escapeHtml(item.nombre_producto)}</td>
                  <td>${escapeHtml(item.cas || "N/A")}</td>
                  <td>${fecha}</td>
                  <td>
                    <button class="btn btn-primary btn-sm" data-action="ver-etiqueta" data-id="${item.id_guardado}"><i class="fas fa-eye"></i> Ver</button>
                    <button class="btn btn-outline btn-sm" data-action="descargar-etiqueta" data-id="${item.id_guardado}"><i class="fas fa-download"></i> Descargar</button>
                    <button class="btn btn-outline btn-sm" data-action="imprimir-etiqueta" data-id="${item.id_guardado}"><i class="fas fa-print"></i> Imprimir</button>
                  </td>
                </tr>`;
            })
            .join("")
        : '<tr><td colspan="4">No hay etiquetas guardadas.</td></tr>';

      tablaEtiquetasBody.querySelectorAll("button[data-action]").forEach((btn) => {
        btn.addEventListener("click", () => manejarAccionEtiqueta(btn, rows));
      });
    } catch (e) {
      tablaEtiquetasBody.innerHTML = `<tr><td colspan="4">Error cargando etiquetas: ${escapeHtml(e.message)}</td></tr>`;
    }
  }

  function manejarAccionEtiqueta(btn, rows) {
    const id = Number(btn.getAttribute("data-id"));
    const etiqueta = rows.find((x) => Number(x.id_guardado) === id);
    if (!etiqueta) return;

    const payload = {
      nombre_producto: etiqueta.nombre_producto,
      palabra_advertencia: etiqueta.palabra_advertencia,
      cas: etiqueta.cas,
      indicaciones_peligro: etiqueta.indicaciones_peligro || "",
      consejos_prudencia: etiqueta.consejos_prudencia || "",
      informacion_emergencia: etiqueta.informacion_emergencia || "",
      pictogramas: Array.isArray(etiqueta.pictogramas) ? etiqueta.pictogramas : [],
    };

    const action = btn.getAttribute("data-action");
    if (action === "imprimir-etiqueta") return imprimirEtiqueta(payload);

    const contenido = `Etiqueta: ${payload.nombre_producto}\nCAS: ${payload.cas || "N/A"}\nAdvertencia: ${payload.palabra_advertencia || ""}\n\nIndicaciones:\n${payload.indicaciones_peligro}\n\nConsejos:\n${payload.consejos_prudencia}\n\nEmergencia:\n${payload.informacion_emergencia}`;
    if (action === "ver-etiqueta") {
      alert(contenido);
      return;
    }

    const blob = new Blob([contenido], { type: "text/plain;charset=utf-8" });
    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");
    link.href = url;
    link.download = `${payload.nombre_producto || "etiqueta"}.txt`;
    link.click();
    URL.revokeObjectURL(url);
  }

  async function cargarSdsGuardadas() {
    if (!tablaSdsBody || !totalSds) return;
    try {
      const resp = await fetch(`${API}/sds`);
      const data = await resp.json();
      const rows = data.sds || [];
      totalSds.textContent = data.total_sds ?? rows.length;
      tablaSdsBody.innerHTML = rows.length
        ? rows
            .map((sds) => {
              const fecha = new Date(sds.fecha_registro).toLocaleDateString("es-CO");
              return `<tr>
                <td>${sds.id_sds}</td>
                <td>${escapeHtml(sds.nombre_archivo)}</td>
                <td>${fecha}</td>
                <td>
                  <button class="btn btn-primary btn-sm" data-action="ver-sds" data-id="${sds.id_sds}"><i class="fas fa-eye"></i> Ver</button>
                  <button class="btn btn-outline btn-sm" data-action="descargar-sds" data-id="${sds.id_sds}"><i class="fas fa-download"></i> Descargar</button>
                  <button class="btn btn-outline btn-sm" data-action="imprimir-sds" data-id="${sds.id_sds}"><i class="fas fa-print"></i> Imprimir</button>
                </td>
              </tr>`;
            })
            .join("")
        : '<tr><td colspan="4">No hay SDS guardadas.</td></tr>';

      tablaSdsBody.querySelectorAll("button[data-action]").forEach((btn) => {
        const id = btn.getAttribute("data-id");
        btn.addEventListener("click", () => {
          const action = btn.getAttribute("data-action");
          if (action === "ver-sds") window.open(`${API}/sds/${id}/view`, "_blank");
          if (action === "descargar-sds") window.open(`${API}/sds/${id}/download`, "_blank");
          if (action === "imprimir-sds") {
            const win = window.open(`${API}/sds/${id}/view`, "_blank");
            if (win) win.onload = () => win.print();
          }
        });
      });
    } catch (e) {
      totalSds.textContent = "0";
      tablaSdsBody.innerHTML = `<tr><td colspan="4">Error cargando SDS: ${escapeHtml(e.message)}</td></tr>`;
    }
  }
});

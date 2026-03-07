document.addEventListener("DOMContentLoaded", () => {
  const API = "http://127.0.0.1:8000";
  const tablaEtiquetas = document.getElementById("tablaEtiquetasEmpleado");
  const tablaSds = document.getElementById("tablaSdsEmpleado");
  const totalEtiquetas = document.getElementById("empTotalEtiquetas");
  const totalSds = document.getElementById("empTotalSds");

  const escapeHtml = (value) =>
    (value || "")
      .toString()
      .replace(/&/g, "&amp;")
      .replace(/</g, "&lt;")
      .replace(/>/g, "&gt;")
      .replace(/"/g, "&quot;")
      .replace(/'/g, "&#039;");

  cargarEtiquetas();
  cargarSds();

  async function cargarEtiquetas() {
    try {
      const resp = await fetch(`${API}/etiquetas/guardadas`);
      const data = await resp.json();
      const rows = data.etiquetas || [];
      totalEtiquetas.textContent = data.total_guardadas ?? rows.length;
      tablaEtiquetas.innerHTML = rows.length
        ? rows
            .map((item) => {
              const fecha = new Date(item.fecha_registro).toLocaleDateString("es-CO");
              return `<tr>
                <td>${escapeHtml(item.nombre_producto)}</td>
                <td>${escapeHtml(item.cas || "N/A")}</td>
                <td>${fecha}</td>
                <td>
                  <button class="btn btn-primary btn-sm" data-action="ver" data-id="${item.id_guardado}"><i class="fas fa-eye"></i> Ver</button>
                  <button class="btn btn-outline btn-sm" data-action="imprimir" data-id="${item.id_guardado}"><i class="fas fa-print"></i> Imprimir</button>
                </td>
              </tr>`;
            })
            .join("")
        : '<tr><td colspan="4">No hay etiquetas guardadas.</td></tr>';

      tablaEtiquetas.querySelectorAll("button[data-action]").forEach((btn) => {
        btn.addEventListener("click", () => {
          const id = Number(btn.getAttribute("data-id"));
          const etiqueta = rows.find((x) => Number(x.id_guardado) === id);
          if (!etiqueta) return;

          const mensaje = `Producto: ${etiqueta.nombre_producto}\nCAS: ${etiqueta.cas || "N/A"}\n\nIndicaciones:\n${etiqueta.indicaciones_peligro || ""}\n\nConsejos:\n${etiqueta.consejos_prudencia || ""}`;
          if (btn.getAttribute("data-action") === "ver") {
            alert(mensaje);
            return;
          }

          const w = window.open("", "printEtiquetaEmpleado", "width=700,height=700");
          w.document.write(`<html><body style="font-family:sans-serif;padding:20px;white-space:pre-line;">${escapeHtml(mensaje)}<script>setTimeout(()=>window.print(),250);<\/script></body></html>`);
          w.document.close();
        });
      });
    } catch (e) {
      totalEtiquetas.textContent = "0";
      tablaEtiquetas.innerHTML = `<tr><td colspan="4">Error: ${escapeHtml(e.message)}</td></tr>`;
    }
  }

  async function cargarSds() {
    try {
      const resp = await fetch(`${API}/sds`);
      const data = await resp.json();
      const rows = data.sds || [];
      totalSds.textContent = data.total_sds ?? rows.length;
      tablaSds.innerHTML = rows.length
        ? rows
            .map((sds) => {
              const fecha = new Date(sds.fecha_registro).toLocaleDateString("es-CO");
              return `<tr>
                <td>${escapeHtml(sds.nombre_archivo)}</td>
                <td>${sds.id_sds}</td>
                <td>${fecha}</td>
                <td>
                  <button class="btn btn-primary btn-sm" data-id="${sds.id_sds}"><i class="fas fa-eye"></i> Ver</button>
                </td>
              </tr>`;
            })
            .join("")
        : '<tr><td colspan="4">No hay SDS guardadas.</td></tr>';

      tablaSds.querySelectorAll("button[data-id]").forEach((btn) => {
        btn.addEventListener("click", () => {
          const id = btn.getAttribute("data-id");
          window.open(`${API}/sds/${id}/view`, "_blank");
        });
      });
    } catch (e) {
      totalSds.textContent = "0";
      tablaSds.innerHTML = `<tr><td colspan="4">Error: ${escapeHtml(e.message)}</td></tr>`;
    }
  }
});

document.addEventListener("DOMContentLoaded", function () {

  // 1. Registrar Usuario

  document.getElementById("createUserForm").addEventListener("submit", function (e) {
    e.preventDefault(); 

    const id = document.getElementById("userId").value;
    const user = document.getElementById("username").value;
    const password = document.getElementById("password").value;
    const email = document.getElementById("email").value;
    const nombre = document.getElementById("firstName").value;
    const apellido = document.getElementById("lastName").value;
    const rol = document.getElementById("role").value;
    const status = document.querySelector('input[name="status"]:checked').value;

    console.log("Datos a enviar:", {
      id_usuario: id,
      usu: user,
      contra: password,
      correo: email,
      nombre: nombre,
      apellido: apellido,
      id_rol: rol,
      estado: status === "active" ? "activo" : "inactivo", // formato correcto
    });

    axios({
      method: "POST",
      url: "http://127.0.0.1:8000/insertarusuarios",
      data: {
        id_usuario: id,
        usu: user,
        contra: password,
        correo: email,
        nombre: nombre,
        apellido: apellido,
        id_rol: rol,
        estado: status === "active" ? "activo" : "inactivo",
      },
    })
      .then(function (response) {
        console.log("Respuesta del servidor:", response);
        alert("Usuario agregado");
        window.location.href = "/frond-end/html/super/superadmin.html";
      })
      .catch((err) => {
        console.error("Error:", err);
        alert("Error al agregar usuario: " + err.message);
      });
  });

  // 2. Tabla dinámica de usuarios y contador en tiempo real
  cargarUsuarios();

  function cargarUsuarios() {
    axios.get("http://127.0.0.1:8000/usuarios")
      .then(response => {
        const usuarios = response.data.usuarios || [];
        const tbody = document.getElementById('tbodyUsuarios');
        tbody.innerHTML = "";

        const adminsEmpleados = usuarios
          .filter(
            u => u.id_rol && 
            (u.id_rol.toLowerCase() === 'administrador' || u.id_rol.toLowerCase() === 'empleado')
          );

        const total = adminsEmpleados.length;
        document.getElementById("usuariosRegistrados").textContent = total;

        const activos = adminsEmpleados.filter(u => u.estado === 'activo').length;
        document.getElementById("usuariosActivos").textContent = `${activos} activos hoy`;

        
         adminsEmpleados.forEach(u =>{
            const tr = document.createElement('tr');
            const isAdmin = u.id_rol.toLowerCase() === 'administrador';
            const badgeCLass = isAdmin ? 'badge-admin' : 'badge-employee';
            const badgeLabel = u.id_rol;
            const isActivo = u.estado === 'activo';
            const badgeEstado = isActivo ? 'badge-succes' : 'badge-danger';
            const iconEstado = isActivo ? 'fa-eye' : 'fa-eye-slash';
            const titleEstado = isActivo ? 'Activo' : 'Inactivo';
            tr.innerHTML = `
                <td>${u.id_usuario}</td>
                <td>${u.nombre}</td>
                <td>${u.apellido}</td>
                <td>${u.usu}</td>
                
                <td> <span class="badge ${badgeCLass}">${badgeLabel}</span> </td>
                <td>
                    <span class="badge ${badgeEstado}">${u.estado.charAt(0).toUpperCase() + u.estado.slice(1)}</span>
                    <button class="btn-icon btn-estado" title="${titleEstado}" data-id="${u.id_usuario}" data-estado="${u.estado}">
                        <i class="fas ${iconEstado}"></i>
                    </button>
                </td>
            `;
            tbody.appendChild(tr);
          });

          // asignar eventos a los botones de cambiar estado
          document.querySelectorAll('.btn-icon').forEach(btn => {
            btn.addEventListener('click', function() {
              const id_usuario = this.getAttribute('data-id');
              const estadoActual = this.getAttribute('data-estado');
              cambiarEstadoUsuario(id_usuario, estadoActual);
            })
          });
      })
      .catch(err => {
        alert("Error al cargar usuarios: " + err.message);
      });
  }

  // 3. Cambiar estado de usuario

  window.cambiarEstadoUsuario = function(id_usuario, estadoActual) {
    const nuevoEstado = estadoActual === 'activo' ? 'inactivo' : 'activo';
    axios.patch(`http://127.0.0.1:8000/usuarios/${id_usuario}/estado`, { estado: nuevoEstado })
      .then(res => {
        cargarUsuarios();
      })
      .catch(err => {
        alert("Error al cambiar estado: " + err.message);
      });
  }
});

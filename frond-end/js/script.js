document.addEventListener('DOMContentLoaded', function() {
    const usuario = JSON.parse(localStorage.getItem('usuario'));

    if(!localStorage.getItem('usuario')){
        window.location.href = "../../index.html";
        return;
    }

    if(usuario) {
        // Colocando el nombre y el apellido real de los usuarios
        document.getElementById('nombreUsuario').textContent = usuario.nombre + " " + usuario.apellido;
        // Muestro el rol del usuario
        document.getElementById('rolUsuario').textContent = usuario.rol;

        const iniciales = 
            (usuario.nombre?.[0] || "") +
            (usuario.apellido?.[0] || "");
        const avatarDiv = document.getElementById('userAvatar');
        if(avatarDiv) avatarDiv.textContent = iniciales.toUpperCase();

    } else{
        document.getElementById('nombreUsuario').textContent = "Invitado";
        document.getElementById('rolUsuario').textContent = "N/A";
        
        const avatarDiv = document.getElementById('userAvatar');
        if(avatarDiv) avatarDiv.textContent = "??";
    }

    // Cerrar sesión

    const logoutBtn = document.getElementById('logoutBtn');
    const logoutLogo = document.getElementById('logoutLogo');
    if(logoutBtn && logoutLogo){
        logoutBtn.addEventListener('click', function(){
            localStorage.removeItem('usuario');
            localStorage.removeItem('rol');

            window.location.href = "../../index.html";
        })
    }

    // Toggle del modo oscuro
    const themeToggle = document.getElementById('themeToggle');
    if (themeToggle) {
        themeToggle.addEventListener('click', () => {
            document.body.classList.toggle('modo-oscuro');
            
            if (document.body.classList.contains('modo-oscuro')) {
                themeToggle.innerHTML = '<i class="fas fa-sun"></i>';
                localStorage.setItem('theme', 'dark');
            } else {
                themeToggle.innerHTML = '<i class="fas fa-moon"></i>';
                localStorage.setItem('theme', 'light');
            }
        });

        // Cargar tema guardado
        if (localStorage.getItem('theme') === 'dark') {
            document.body.classList.add('modo-oscuro');
            themeToggle.innerHTML = '<i class="fas fa-sun"></i>';
        }
    }

    // Toggle del menú móvil
    const mobileMenuToggle = document.getElementById('mobileMenuToggle');
    const sidebar = document.querySelector('.sidebar');
    const overlay = document.querySelector('.overlay');

    if (mobileMenuToggle && sidebar && overlay) {
        mobileMenuToggle.addEventListener('click', () => {
            sidebar.classList.toggle('active');
            overlay.classList.toggle('active');
        });

        overlay.addEventListener('click', () => {
            sidebar.classList.remove('active');
            overlay.classList.remove('active');
        });
    }

    // Activar elemento del menú según la página actual
    const currentPage = window.location.pathname.split('/').pop().replace('.html', '') || 'index';
    const menuItems = document.querySelectorAll('.menu-item');
    
    menuItems.forEach(item => {
        if (item.textContent.trim().toLowerCase().includes(currentPage)) {
            item.classList.add('active');
        }
        
        item.addEventListener('click', function() {
            menuItems.forEach(i => i.classList.remove('active'));
            this.classList.add('active');
        });
    });
});

from fastapi import FastAPI
from fastapi import Request
from fastapi import File, UploadFile
from pydantic import BaseModel
from typing import List, Optional
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import JSONResponse
from fastapi import FastAPI, UploadFile, File, HTTPException #deep
from fastapi.responses import Response
import mysql.connector
import pdfplumber
import os
import re
import json
import tempfile #deep

app = FastAPI()

origins = [
    "http://localhost",
    "http://127.0.0.1:5500",  
    "http://127.0.0.1",      
    "*"                      
]

# Permitir todas las conexiones (CORS)
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)


# Conexión a la base de datos
def get_connection():
    try:
        connection = mysql.connector.connect(
            host="localhost",
            user="root",
            password="",  # contraseña de la
            database="proyecto", #name del db
            auth_plugin='mysql_native_password'  
        )
        print("¡Conexión exitosa a la base de datos!")
        return connection
    except mysql.connector.Error as err:
        print(f"Error de conexión: {err}")
        raise

# =========================
# MODELOS
# =========================

class UsuarioLogin(BaseModel):
    usu: str
    contra: str

class Producto(BaseModel):
    id_producto: str
    nombre: str
    id_fds: str

class FDS(BaseModel):
    id_fds: str
    proveedor: str
    id_etiqueta: str

class Recipiente(BaseModel):
    id_recipiente: str
    tipo: str
    tamaño: int
    id_etiqueta: str

class Etiqueta(BaseModel):
    id_etiqueta: str
    p_advertencia: str
    inf_cas: str
    fecha: str
    id_producto: str
    frases_h: List[str]
    frases_p: List[str]
    pictogramas: List[str]
    id_sds: Optional[int] = None

class EtiquetaGuardada(BaseModel):
    nombre_producto: str
    indicaciones_peligro: List[str]
    consejos_prudencia: List[str]
    informacion_emergencia: List[str]
    pictogramas: List[str]
    palabra_advertencia: str
    cas: str
    id_sds: Optional[int] = None


@app.on_event("startup")
def ensure_extra_tables():
    db = get_connection()
    cursor = db.cursor()
    try:
        cursor.execute(
            """
            CREATE TABLE IF NOT EXISTS sds_archivos (
                id_sds INT AUTO_INCREMENT PRIMARY KEY,
                nombre_archivo VARCHAR(255) NOT NULL,
                tipo_mime VARCHAR(100),
                contenido LONGBLOB NOT NULL,
                datos_extraidos JSON,
                fecha_registro TIMESTAMP DEFAULT CURRENT_TIMESTAMP
            )
            """
        )
        cursor.execute(
            """
            CREATE TABLE IF NOT EXISTS etiquetas_guardadas (
                id_guardado INT AUTO_INCREMENT PRIMARY KEY,
                nombre_producto VARCHAR(255) NOT NULL,
                palabra_advertencia VARCHAR(100),
                cas VARCHAR(100),
                indicaciones_peligro TEXT,
                consejos_prudencia TEXT,
                informacion_emergencia TEXT,
                pictogramas TEXT,
                html_etiqueta LONGTEXT,
                id_sds INT NULL,
                fecha_registro TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
                CONSTRAINT fk_etiquetas_guardadas_sds
                  FOREIGN KEY (id_sds) REFERENCES sds_archivos(id_sds)
                  ON DELETE SET NULL
            )
            """
        )
        db.commit()
    finally:
        cursor.close()
        db.close()

class FraseH(BaseModel):
    descripcion: str

class FraseP(BaseModel):
    descripcion: str

class Pictograma(BaseModel):
    nombre: str
    imagen: str

# =========================
# RUTAS
# =========================

# 
class Usuario(BaseModel):
    id_usuario: str
    usu: str
    contra: str
    correo: str
    nombre: str
    apellido: str
    id_rol: str
    estado: str

# -------- USUARIO --------
@app.post("/login")
def login(data: UsuarioLogin):
    try:
        db = get_connection()
        cursor = db.cursor(dictionary=True)
        cursor.execute("SELECT * FROM usuario WHERE usu = %s AND contra = %s", (data.usu, data.contra))
        result = cursor.fetchone()
        if result:
            return {
                "login": True,
                "usuario": {
                    "id_usuario": result["id_usuario"],
                    "nombre": result["nombre"],
                    "apellido": result["apellido"],
                    "rol": result["id_rol"],
                }
            }
        else:
            return {"login": False, "error": "Credenciales incorrectas o usuario inactivo"}
    except Exception as e:
        return JSONResponse(status_code=500, content={"error": str(e)})
    finally:
        cursor.close()
        db.close()

# -------- PRODUCTOS --------
@app.get("/productos")
def listar_productos():
    try:
        db = get_connection()
        cursor = db.cursor(dictionary=True)
        cursor.execute("SELECT * FROM pro")
        return {"productos": cursor.fetchall()}
    except Exception as e:
        return JSONResponse(status_code=500, content={"error": str(e)})
    finally:
        cursor.close()
        db.close()

@app.post("/productos")
def crear_producto(prod: Producto):
    try:
        db = get_connection()
        cursor = db.cursor()
        cursor.execute("INSERT INTO pro (id_producto, nombre, id_fds) VALUES (%s, %s, %s)",
                       (prod.id_producto, prod.nombre, prod.id_fds))
        db.commit()
        return {"mensaje": "Producto creado"}
    except Exception as e:
        db.rollback()
        return JSONResponse(status_code=500, content={"error": str(e)})
    finally:
        cursor.close()
        db.close()

# -------- FDS --------
@app.get("/fds")
def listar_fds():
    try:
        db = get_connection()
        cursor = db.cursor(dictionary=True)
        cursor.execute("SELECT * FROM fds")
        return {"fds": cursor.fetchall()}
    except Exception as e:
        return JSONResponse(status_code=500, content={"error": str(e)})
    finally:
        cursor.close()
        db.close()

@app.post("/fds")
def crear_fds(fds: FDS):
    try:
        db = get_connection()
        cursor = db.cursor()
        cursor.execute("INSERT INTO fds (id_fds, proveedor, id_etiqueta) VALUES (%s, %s, %s)",
                       (fds.id_fds, fds.proveedor, fds.id_etiqueta))
        db.commit()
        return {"mensaje": "FDS creado"}
    except Exception as e:
        db.rollback()
        return JSONResponse(status_code=500, content={"error": str(e)})
    finally:
        cursor.close()
        db.close()

# -------- RECIPIENTES --------
@app.get("/recipientes")
def listar_recipientes():
    try:
        db = get_connection()
        cursor = db.cursor(dictionary=True)
        cursor.execute("SELECT * FROM recipiente")
        return {"recipientes": cursor.fetchall()}
    except Exception as e:
        return JSONResponse(status_code=500, content={"error": str(e)})
    finally:
        cursor.close()
        db.close()

@app.post("/recipientes")
def crear_recipiente(r: Recipiente):
    try:
        db = get_connection()
        cursor = db.cursor()
        cursor.execute("INSERT INTO recipiente (id_recipiente, tipo, tamaño, id_etiqueta) VALUES (%s, %s, %s, %s)",
                       (r.id_recipiente, r.tipo, r.tamaño, r.id_etiqueta))
        db.commit()
        return {"mensaje": "Recipiente creado"}
    except Exception as e:
        db.rollback()
        return JSONResponse(status_code=500, content={"error": str(e)})
    finally:
        cursor.close()
        db.close()

# -------- FRASES H --------
@app.get("/frasesh")
def obtener_frases_h():
    try:
        db = get_connection()
        cursor = db.cursor(dictionary=True)
        cursor.execute("SELECT * FROM frases_h")
        return {"frases_h": cursor.fetchall()}
    except Exception as e:
        return JSONResponse(status_code=500, content={"error": str(e)})
    finally:
        cursor.close()
        db.close()

@app.post("/frasesh")
def registrar_frase_h(fh: FraseH):
    try:
        db = get_connection()
        cursor = db.cursor()
        cursor.execute("INSERT INTO frases_h (descripcion) VALUES (%s)", (fh.descripcion,))
        db.commit()
        return {"mensaje": "Frase H registrada"}
    except Exception as e:
        db.rollback()
        return JSONResponse(status_code=500, content={"error": str(e)})
    finally:
        cursor.close()
        db.close()

# -------- FRASES P --------
@app.get("/frasesp")
def obtener_frases_p():
    try:
        db = get_connection()
        cursor = db.cursor(dictionary=True)
        cursor.execute("SELECT * FROM frases_p")
        return {"frases_p": cursor.fetchall()}
    except Exception as e:
        return JSONResponse(status_code=500, content={"error": str(e)})
    finally:
        cursor.close()
        db.close()

@app.post("/frasesp")
def registrar_frase_p(fp: FraseP):
    try:
        db = get_connection()
        cursor = db.cursor()
        cursor.execute("INSERT INTO frases_p (descripcion) VALUES (%s)", (fp.descripcion,))
        db.commit()
        return {"mensaje": "Frase P registrada"}
    except Exception as e:
        db.rollback()
        return JSONResponse(status_code=500, content={"error": str(e)})
    finally:
        cursor.close()
        db.close()

# -------- PICTOGRAMAS --------
@app.get("/pictogramas")
def obtener_pictogramas():
    try:
        db = get_connection()
        cursor = db.cursor(dictionary=True)
        cursor.execute("SELECT * FROM pictograma")
        return {"pictogramas": cursor.fetchall()}
    except Exception as e:
        return JSONResponse(status_code=500, content={"error": str(e)})
    finally:
        cursor.close()
        db.close()

@app.post("/pictogramas")
def registrar_pictograma(picto: Pictograma):
    try:
        db = get_connection()
        cursor = db.cursor()
        cursor.execute("INSERT INTO pictograma (nombre, imagen) VALUES (%s, %s)", (picto.nombre, picto.imagen))
        db.commit()
        return {"mensaje": "Pictograma registrado"}
    except Exception as e:
        db.rollback()
        return JSONResponse(status_code=500, content={"error": str(e)})
    finally:
        cursor.close()
        db.close()

# -------- ETIQUETAS COMPLETAS --------
@app.post("/etiquetas")
def registrar_etiqueta(data: Etiqueta):
    try:
        db = get_connection()
        cursor = db.cursor()
        cursor.execute("INSERT INTO etiqueta (id_etiqueta, `p.advertencia`, `inf.cas`, fecha, id_producto) VALUES (%s, %s, %s, %s, %s)",
                       (data.id_etiqueta, data.p_advertencia, data.inf_cas, data.fecha, data.id_producto))

        for id_h in data.frases_h:
            cursor.execute("INSERT INTO etiquetas_frases_h (id_etiqueta, id_h) VALUES (%s, %s)",
                           (data.id_etiqueta, id_h))

        for id_p in data.frases_p:
            cursor.execute("INSERT INTO etiquetas_frases_p (id_etiqueta, id_p) VALUES (%s, %s)",
                           (data.id_etiqueta, id_p))

        for id_picto in data.pictogramas:
            cursor.execute("INSERT INTO etiqueta_pictograma (id_etiqueta, id_picto) VALUES (%s, %s)",
                           (data.id_etiqueta, id_picto))

        db.commit()
        return {"mensaje": "Etiqueta registrada correctamente"}
    except Exception as e:
        db.rollback()
        return JSONResponse(status_code=500, content={"error": str(e)})
    finally:
        cursor.close()
        db.close()


@app.post("/etiquetas/guardar")
def guardar_etiqueta(data: EtiquetaGuardada):
    try:
        db = get_connection()
        cursor = db.cursor(dictionary=True)
        cursor.execute(
            """
            INSERT INTO etiquetas_guardadas (
                nombre_producto,
                palabra_advertencia,
                cas,
                indicaciones_peligro,
                consejos_prudencia,
                informacion_emergencia,
                pictogramas,
                html_etiqueta,
                id_sds
            ) VALUES (%s,%s,%s,%s,%s,%s,%s,%s,%s)
            """,
            (
                data.nombre_producto,
                data.palabra_advertencia,
                data.cas,
                "\n".join(data.indicaciones_peligro),
                "\n".join(data.consejos_prudencia),
                "\n".join(data.informacion_emergencia),
                json.dumps(data.pictogramas, ensure_ascii=False),
                "",
                data.id_sds,
            ),
        )
        db.commit()
        return {"mensaje": "Etiqueta guardada", "id_guardado": cursor.lastrowid}
    except Exception as e:
        db.rollback()
        return JSONResponse(status_code=500, content={"error": str(e)})
    finally:
        cursor.close()
        db.close()


@app.get("/etiquetas/guardadas")
def listar_etiquetas_guardadas():
    try:
        db = get_connection()
        cursor = db.cursor(dictionary=True)
        cursor.execute(
            """
            SELECT id_guardado, nombre_producto, palabra_advertencia, cas, indicaciones_peligro,
                   consejos_prudencia, informacion_emergencia, pictogramas, id_sds, fecha_registro
            FROM etiquetas_guardadas
            ORDER BY fecha_registro DESC
            """
        )
        filas = cursor.fetchall()
        for fila in filas:
            fila["pictogramas"] = json.loads(fila["pictogramas"] or "[]")
        return {"etiquetas": filas, "total_guardadas": len(filas)}
    except Exception as e:
        return JSONResponse(status_code=500, content={"error": str(e)})
    finally:
        cursor.close()
        db.close()


@app.get("/etiquetas/contador")
def contador_etiquetas_guardadas():
    try:
        db = get_connection()
        cursor = db.cursor(dictionary=True)
        cursor.execute("SELECT COUNT(*) AS total FROM etiquetas_guardadas")
        total = cursor.fetchone()["total"]
        return {"total_guardadas": total}
    except Exception as e:
        return JSONResponse(status_code=500, content={"error": str(e)})
    finally:
        cursor.close()
        db.close()


@app.get("/sds")
def listar_sds_archivos():
    try:
        db = get_connection()
        cursor = db.cursor(dictionary=True)
        cursor.execute(
            """
            SELECT id_sds, nombre_archivo, tipo_mime, fecha_registro
            FROM sds_archivos
            ORDER BY fecha_registro DESC
            """
        )
        filas = cursor.fetchall()
        return {"sds": filas, "total_sds": len(filas)}
    except Exception as e:
        return JSONResponse(status_code=500, content={"error": str(e)})
    finally:
        cursor.close()
        db.close()


@app.get("/sds/{id_sds}/download")
def descargar_sds(id_sds: int):
    try:
        db = get_connection()
        cursor = db.cursor(dictionary=True)
        cursor.execute(
            "SELECT nombre_archivo, tipo_mime, contenido FROM sds_archivos WHERE id_sds = %s",
            (id_sds,),
        )
        row = cursor.fetchone()
        if not row:
            raise HTTPException(status_code=404, detail="SDS no encontrada")
        headers = {"Content-Disposition": f'attachment; filename="{row["nombre_archivo"]}"'}
        return Response(content=row["contenido"], media_type=row["tipo_mime"] or "application/pdf", headers=headers)
    except HTTPException:
        raise
    except Exception as e:
        return JSONResponse(status_code=500, content={"error": str(e)})
    finally:
        cursor.close()
        db.close()


@app.get("/sds/{id_sds}/view")
def ver_sds(id_sds: int):
    try:
        db = get_connection()
        cursor = db.cursor(dictionary=True)
        cursor.execute(
            "SELECT nombre_archivo, tipo_mime, contenido FROM sds_archivos WHERE id_sds = %s",
            (id_sds,),
        )
        row = cursor.fetchone()
        if not row:
            raise HTTPException(status_code=404, detail="SDS no encontrada")
        headers = {"Content-Disposition": f'inline; filename="{row["nombre_archivo"]}"'}
        return Response(content=row["contenido"], media_type=row["tipo_mime"] or "application/pdf", headers=headers)
    except HTTPException:
        raise
    except Exception as e:
        return JSONResponse(status_code=500, content={"error": str(e)})
    finally:
        cursor.close()
        db.close()


# -------- OBTENER TODOS LOS USUARIOS --------
@app.get("/usuarios")
def listar_usuarios():
    try:
        db = get_connection()
        cursor = db.cursor(dictionary=True)
        cursor.execute("SELECT * FROM usuario")
        usuarios = cursor.fetchall()
        return {"usuarios": usuarios}
    except Exception as e:
        return JSONResponse(status_code=500, content={"error": str(e)})
    finally:
        cursor.close()
        db.close()

@app.patch("/usuarios/{id_usuario}/estado")
async def cambiar_estado_usuario(id_usuario: str, request: Request):
    try:
        datos = await request.json()
        nuevo_estado = datos.get("estado")
        db = get_connection()
        cursor = db.cursor()
        cursor.execute("UPDATE usuario SET estado=%s WHERE id_usuario=%s", (nuevo_estado, id_usuario) )
        db.commit()
        return {"mensaje": "Estado actualizado"}
    except Exception as e:
        db.rollback()
        print("ERROR EN PATCH ESTADO:", str(e))
        return JSONResponse(status_code=500, content={"error": str(e)})
    finally:
        cursor.close()
        db.close()

# -------- REGISTRAR UN USUARIO NUEVO --------
@app.post("/insertarusuarios")
def crear_usuario(u: Usuario):
    try:
        print(f"Intentando insertar usuario: {u}")
        
        db = get_connection()
        cursor = db.cursor()
        
        query = """
            INSERT INTO usuario (id_usuario, usu, contra, correo, nombre, apellido, id_rol, estado)
            VALUES (%s, %s, %s, %s, %s, %s, %s, %s)
        """
        values = (u.id_usuario, u.usu, u.contra, u.correo, u.nombre, u.apellido, u.id_rol, u.estado)
        
        print(f"Ejecutando query: {query} con valores: {values}")
        
        cursor.execute(query, values)
        db.commit()
        
        print("Usuario insertado correctamente")
        return {"mensaje": "Usuario registrado correctamente"}
    except Exception as e:
        print(f"Error al insertar usuario: {e}")
        db.rollback()
        return JSONResponse(status_code=500, content={"error": str(e)})
    finally:
        if 'cursor' in locals():
            cursor.close()
        if 'db' in locals():
            db.close()

# -------- PDF --------
@app.post("/extract_pdf_data")
async def extract_pdf_data(file: UploadFile = File(...)):
    try:
        with tempfile.NamedTemporaryFile(delete=False, suffix=".pdf") as temp_file:
            temp_filename = temp_file.name
            contents = await file.read()
            temp_file.write(contents)
        
        try:
            with pdfplumber.open(temp_filename) as pdf:
                texto = "\n".join([page.extract_text() or "" for page in pdf.pages])
            
            if not texto.strip():
                raise ValueError("No se pudo extraer texto del PDF. ¿Está escaneado?")

            # 1. Nombre del producto (se mantiene igual)
            nombre = "NO DETECTADO"
            patrones_nombre = [
                r'(?i)(?:Identificación del producto|Nombre del producto|Producto|Nombre comercial)[\s:*-]+([^\n]+)',
                r'(?i)1\s*\.\s*IDENTIFICACI[ÓO]N[^\n]*\n([^\n]+)',
                r'(?i)^\s*([A-Z][A-Z0-9ÁÉÍÓÚÑ\s\-/%&\.\(\)]{5,})\s*$'
            ]
            
            for patron in patrones_nombre:
                match = re.search(patron, texto, re.MULTILINE)
                if match:
                    nombre = match.group(1).strip()
                    if len(nombre) > 5:
                        break

            # 2. Indicaciones de peligro (H)
            indicaciones = []

            # Caso 1: Hxxx + descripción en la misma línea
            for codigo, descripcion in re.findall(
                r'\bH\s*[-:]?\s*(\d{3,4}[A-Za-z]?)\b\s*[:\-]?\s*([^\n]+)',
                texto,
                re.IGNORECASE,
            ):
                descripcion = descripcion.strip(" .;:-")
                if descripcion:
                    indicaciones.append(f"H{codigo.upper()}: {descripcion}")
                else:
                    indicaciones.append(f"H{codigo.upper()}")

            # Caso 2: encabezado de sección + líneas con Hxxx
            if not indicaciones:
                seccion_peligro = re.search(
                    r'(?is)(?:2\s*\.\s*IDENTIFICACI[ÓO]N\s*DE\s*LOS\s*PELIGROS|indicaci[ÓO]n(?:es)?\s+de\s+peligro|frases\s*h|hazard\s+identification)(.*?)(?=\n\s*\d+\s*\.|\Z)',
                    texto,
                )

                if seccion_peligro:
                    for linea in seccion_peligro.group(1).splitlines():
                        match_h = re.search(r'\b(H\s*\d{3,4}[A-Za-z]?)\b\s*[:\-]?\s*(.*)', linea, re.IGNORECASE)
                        if match_h:
                            codigo = re.sub(r'\s+', '', match_h.group(1).upper())
                            descripcion = match_h.group(2).strip(" .;:-")
                            indicaciones.append(f"{codigo}: {descripcion}" if descripcion else codigo)

            # 3. Consejos de prudencia (P)
            consejos = []

            # Caso 1: Pxxx + descripción en la misma línea
            for codigo, descripcion in re.findall(
                r'\bP\s*[-:]?\s*(\d{3,4}[A-Za-z]?)\b\s*[:\-]?\s*([^\n]+)',
                texto,
                re.IGNORECASE,
            ):
                descripcion = descripcion.strip(" .;:-")
                if descripcion:
                    consejos.append(f"P{codigo.upper()}: {descripcion}")
                else:
                    consejos.append(f"P{codigo.upper()}")

            # Caso 2: encabezado de sección + líneas con Pxxx
            if not consejos:
                seccion_prudencia = re.search(
                    r'(?is)(?:consejos\s+de\s+prudencia|frases\s*p|precautionary\s+statements)(.*?)(?=\n\s*\d+\s*\.|\Z)',
                    texto,
                )

                if seccion_prudencia:
                    for linea in seccion_prudencia.group(1).splitlines():
                        match_p = re.search(r'\b(P\s*\d{3,4}[A-Za-z]?)\b\s*[:\-]?\s*(.*)', linea, re.IGNORECASE)
                        if match_p:
                            codigo = re.sub(r'\s+', '', match_p.group(1).upper())
                            descripcion = match_p.group(2).strip(" .;:-")
                            consejos.append(f"{codigo}: {descripcion}" if descripcion else codigo)

            # Eliminar duplicados manteniendo orden
            indicaciones = list(dict.fromkeys(indicaciones))
            consejos = list(dict.fromkeys(consejos))

            # Resto del código se mantiene igual (emergencia, pictogramas, etc.)
            emergencia = re.findall(
                r'(?:Tel[ée]fono|Contacto|EMERGENCIA|N[ÚU]MERO).*?[:\-]\s*([^\n]+)',
                texto, re.IGNORECASE
            )
            emergencia = [e.strip() for e in emergencia if e.strip()]

            pictogramas = []
            texto_lower = texto.lower()
            pictogramas_mapping = {
                "llama": "inflamable",
                "llama sobre círculo": "oxidante",
                "bomba explotando": "explosivo",
                "calavera": "toxico",
                "corrosión": "corrosivo",
                "peligro para la salud": "peligroso para la salud",
                "exclamación": "irritante",
                "medio ambiente": "daño ambiente",
                "cilindro de gas": "gas presurizado"
            }

            for keyword, picto in pictogramas_mapping.items():
                if keyword in texto_lower:
                    pictogramas.append(picto)

            advertencia = re.search(
                r'(PELIGRO|ADVERTENCIA|PRECAUCI[ÓO]N|ATENCI[ÓO]N|WARNING|DANGER)',
                texto, re.IGNORECASE
            )
            advertencia = advertencia.group(1).capitalize() if advertencia else "No detectada"

            cas = re.search(r'\b\d{2,7}-\d{2}-\d\b', texto)
            cas = cas.group() if cas else "No detectado"

            db = get_connection()
            cursor = db.cursor()
            cursor.execute(
                """
                INSERT INTO sds_archivos (nombre_archivo, tipo_mime, contenido, datos_extraidos)
                VALUES (%s, %s, %s, %s)
                """,
                (
                    file.filename or "sds.pdf",
                    file.content_type or "application/pdf",
                    contents,
                    json.dumps(
                        {
                            "nombre_producto": nombre,
                            "indicaciones_peligro": indicaciones,
                            "consejos_prudencia": consejos,
                            "informacion_emergencia": emergencia,
                            "pictogramas": list(set(pictogramas)),
                            "palabra_advertencia": advertencia,
                            "cas": cas,
                        },
                        ensure_ascii=False,
                    ),
                ),
            )
            db.commit()
            id_sds = cursor.lastrowid
            cursor.close()
            db.close()

            return {
                "nombre_producto": nombre,
                "indicaciones_peligro": indicaciones,
                "consejos_prudencia": consejos,
                "informacion_emergencia": emergencia,
                "pictogramas": list(set(pictogramas)),
                "palabra_advertencia": advertencia,
                "cas": cas,
                "id_sds": id_sds,
            }

        except Exception as e:
            raise HTTPException(
                status_code=400,
                detail=f"Error procesando el PDF: {str(e)}"
            )
        finally:
            if os.path.exists(temp_filename):
                os.unlink(temp_filename)

    except Exception as e:
        raise HTTPException(
            status_code=500,
            detail=f"Error en el servidor: {str(e)}"
        )

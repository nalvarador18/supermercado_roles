"""database.py — SQLite con usuarios, notificaciones y sesiones."""
import sqlite3, hashlib, os
from datetime import datetime

DB_PATH = os.getenv("DB_PATH", "data/supermercado.db")


def _conn():
    os.makedirs(os.path.dirname(DB_PATH), exist_ok=True)
    c = sqlite3.connect(DB_PATH, check_same_thread=False)
    c.row_factory = sqlite3.Row
    return c


def init_db():
    c = _conn()
    c.executescript("""
        CREATE TABLE IF NOT EXISTS usuarios (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            nombres TEXT NOT NULL, apellidos TEXT,
            correo TEXT NOT NULL UNIQUE, fecha_nac TEXT,
            usuario TEXT NOT NULL UNIQUE,
            password_hash TEXT NOT NULL,
            rol TEXT NOT NULL DEFAULT 'empleado',
            creado_en TEXT NOT NULL
        );
        CREATE TABLE IF NOT EXISTS notificaciones (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            usuario TEXT NOT NULL, tipo TEXT NOT NULL,
            titulo TEXT NOT NULL, mensaje TEXT NOT NULL,
            leida INTEGER NOT NULL DEFAULT 0,
            creada TEXT NOT NULL
        );
        CREATE TABLE IF NOT EXISTS sesiones (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            usuario TEXT NOT NULL, inicio TEXT NOT NULL, fin TEXT
        );
    """)
    if not c.execute("SELECT 1 FROM usuarios WHERE usuario='Admin'").fetchone():
        c.execute(
            "INSERT INTO usuarios (nombres,apellidos,correo,fecha_nac,usuario,password_hash,rol,creado_en)"
            " VALUES (?,?,?,?,?,?,?,?)",
            ("Administrador","Principal","admin@empresa.com","2000-01-01",
             "Admin", _hash("1234"), "admin", datetime.now().isoformat())
        )
    c.commit(); c.close()


def _hash(p): return hashlib.sha256(p.encode()).hexdigest()


def verificar_usuario(usuario, password):
    c = _conn()
    row = c.execute("SELECT * FROM usuarios WHERE usuario=? AND password_hash=?",
                    (usuario, _hash(password))).fetchone()
    c.close()
    return dict(row) if row else None


def registrar_usuario(nombres, apellidos, correo, fecha_nac, usuario, password, rol="empleado"):
    c = _conn()
    if c.execute("SELECT 1 FROM usuarios WHERE usuario=?", (usuario,)).fetchone():
        c.close(); return False, "Usuario ya existe."
    if c.execute("SELECT 1 FROM usuarios WHERE correo=?", (correo,)).fetchone():
        c.close(); return False, "Correo ya registrado."
    if not all([nombres, correo, usuario, password]):
        c.close(); return False, "Campos obligatorios incompletos."
    c.execute(
        "INSERT INTO usuarios (nombres,apellidos,correo,fecha_nac,usuario,password_hash,rol,creado_en)"
        " VALUES (?,?,?,?,?,?,?,?)",
        (nombres, apellidos, correo, fecha_nac, usuario, _hash(password), rol,
         datetime.now().isoformat())
    )
    c.commit(); c.close()
    return True, "Cuenta creada."


def guardar_notificacion(usuario, tipo, titulo, mensaje):
    c = _conn()
    c.execute("INSERT INTO notificaciones (usuario,tipo,titulo,mensaje,creada) VALUES (?,?,?,?,?)",
              (usuario, tipo, titulo, mensaje, datetime.now().isoformat()))
    c.commit(); c.close()


def obtener_notificaciones(usuario):
    c = _conn()
    rows = c.execute(
        "SELECT * FROM notificaciones WHERE usuario=? ORDER BY creada DESC LIMIT 50",
        (usuario,)).fetchall()
    c.close()
    return [dict(r) for r in rows]


def limpiar_notificaciones(usuario):
    c = _conn()
    c.execute("DELETE FROM notificaciones WHERE usuario=?", (usuario,))
    c.commit(); c.close()


def listar_empleados():
    c = _conn()
    rows = c.execute(
        "SELECT id, nombres, apellidos, correo, usuario, rol, creado_en "
        "FROM usuarios WHERE rol='empleado' ORDER BY creado_en DESC"
    ).fetchall()
    c.close()
    return [dict(r) for r in rows]


def eliminar_usuario(usuario: str):
    c = _conn()
    if not c.execute("SELECT 1 FROM usuarios WHERE usuario=?", (usuario,)).fetchone():
        c.close(); return False, "Usuario no encontrado."
    if usuario == "Admin":
        c.close(); return False, "No se puede eliminar al administrador principal."
    c.execute("DELETE FROM usuarios WHERE usuario=?", (usuario,))
    c.commit(); c.close()
    return True, f"Usuario '{usuario}' eliminado."

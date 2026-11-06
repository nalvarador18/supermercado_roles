"""routers/auth.py"""
from fastapi import APIRouter, HTTPException
from pydantic import BaseModel
from app.modules.database import (
    verificar_usuario, registrar_usuario,
    listar_empleados, eliminar_usuario
)

router = APIRouter(prefix="/auth", tags=["auth"])


class LoginIn(BaseModel):
    usuario: str
    password: str


class RegisterIn(BaseModel):
    nombres: str
    apellidos: str = ""
    correo: str
    fecha_nac: str = ""
    usuario: str
    password: str
    rol: str = "empleado"


class CrearEmpleadoIn(BaseModel):
    admin_usuario: str          # quien hace la solicitud (validación extra)
    nombres: str
    apellidos: str = ""
    correo: str
    usuario: str
    password: str


@router.post("/login")
def login(body: LoginIn):
    user = verificar_usuario(body.usuario, body.password)
    if not user:
        raise HTTPException(status_code=401, detail="Credenciales incorrectas.")
    return {"ok": True, "usuario": user["usuario"], "rol": user["rol"],
            "nombres": user["nombres"]}


@router.post("/register")
def register(body: RegisterIn):
    ok, msg = registrar_usuario(body.nombres, body.apellidos, body.correo,
                                body.fecha_nac, body.usuario, body.password)
    if not ok:
        raise HTTPException(status_code=400, detail=msg)
    return {"ok": True, "mensaje": msg}


# ── Admin-only endpoints ──────────────────────────────────────────────────────

@router.post("/empleados")
def crear_empleado(body: CrearEmpleadoIn):
    """Crea un usuario con rol 'empleado'. Solo debe llamarse autenticado como admin."""
    ok, msg = registrar_usuario(
        body.nombres, body.apellidos, body.correo,
        "", body.usuario, body.password, rol="empleado"
    )
    if not ok:
        raise HTTPException(status_code=400, detail=msg)
    return {"ok": True, "mensaje": msg}


@router.get("/empleados")
def get_empleados():
    """Lista todos los usuarios con rol 'empleado'."""
    return listar_empleados()


@router.delete("/empleados/{usuario}")
def delete_empleado(usuario: str):
    """Elimina un empleado por nombre de usuario."""
    ok, msg = eliminar_usuario(usuario)
    if not ok:
        raise HTTPException(status_code=400, detail=msg)
    return {"ok": True, "mensaje": msg}

"""routers/analytics.py — endpoints de análisis, modelos y dashboard."""
import io
from fastapi import APIRouter, UploadFile, File, Form, HTTPException
from pydantic import BaseModel
import pandas as pd
from app.modules import ml_engine as ml
from app.modules.database import (guardar_notificacion, obtener_notificaciones,
                                   limpiar_notificaciones)

router = APIRouter(prefix="/analytics", tags=["analytics"])

# Cache en memoria (simple, suficiente para una sesión)
_cache: dict = {}


def _get_df(session_id: str):
    if session_id not in _cache:
        raise HTTPException(404, "Sesión no encontrada. Sube el archivo primero.")
    return _cache[session_id]["df_clean"]


# ── Upload ────────────────────────────────────────────────────────────────────
@router.post("/upload")
async def upload(file: UploadFile = File(...),
                 session_id: str = Form(...),
                 usuario: str = Form(...),
                 dias_historial: int = Form(30)):
    content = await file.read()
    df_raw   = pd.read_excel(io.BytesIO(content))
    df_clean = ml.limpiar_datos(df_raw)
    _cache[session_id] = {"df_clean": df_clean, "df_raw": df_raw}

    # Escaneo automático de alertas
    try:
        mod, df_ag, X = ml.entrenar_modelo_final(df_clean)
        criticos = ml.inventario_critico(mod, X, df_ag, dias_historial)
        limpiar_notificaciones(usuario)
        for c in criticos:
            tipo   = "critica" if c["estado"] == "sin_stock" else "alerta"
            titulo = f"Stock bajo: {c['producto']}"
            msg    = (f"Stock: {c['stock_actual']} uds | "
                      f"ROP: {c['punto_reorden']} uds | "
                      f"Cobertura: {c['dias_restantes']} días")
            guardar_notificacion(usuario, tipo, titulo, msg)
        n_alertas = len(criticos)
    except Exception:
        n_alertas = 0

    return {"ok": True, "registros": len(df_clean),
            "columnas": df_clean.columns.tolist(),
            "alertas_generadas": n_alertas}


# ── EDA ───────────────────────────────────────────────────────────────────────
@router.get("/eda/{session_id}")
def eda(session_id: str):
    df = _get_df(session_id)
    return ml.resumen_exploratorio(df)


# ── Modelos ───────────────────────────────────────────────────────────────────
@router.get("/modelos/{session_id}")
def modelos(session_id: str):
    df    = _get_df(session_id)
    datos = ml.preparar_datos_ml(df)
    res, _ = ml.entrenar_y_evaluar(datos)
    # No enviar arrays grandes de y_real/y_pred en este endpoint
    for r in res:
        r.pop("y_real", None); r.pop("y_pred", None)
    return {"resultados": res, "advertencia": datos["advertencia"]}


@router.get("/modelos/{session_id}/scatter")
def scatter(session_id: str):
    df    = _get_df(session_id)
    datos = ml.preparar_datos_ml(df)
    res, _ = ml.entrenar_y_evaluar(datos)
    # Solo enviar los puntos para las gráficas scatter
    return [{"modelo": r["modelo"],
             "puntos": list(zip(r["y_real"], r["y_pred"]))} for r in res]


@router.get("/modelos/{session_id}/cv")
def cross_val(session_id: str):
    df    = _get_df(session_id)
    datos = ml.preparar_datos_ml(df)
    return ml.validacion_cruzada(datos["X"], datos["y"])


@router.get("/modelos/{session_id}/hiperparametros")
def hiperparametros(session_id: str):
    df    = _get_df(session_id)
    datos = ml.preparar_datos_ml(df)
    tabla, mejor = ml.buscar_hiperparametros(
        datos["X_train"], datos["X_test"],
        datos["y_train"], datos["y_test"])
    return {"tabla": tabla, "mejor": mejor}


@router.get("/modelos/{session_id}/curvas")
def curvas(session_id: str):
    df    = _get_df(session_id)
    datos = ml.preparar_datos_ml(df)
    return ml.curvas_aprendizaje(datos["X"], datos["y"])


@router.get("/modelos/{session_id}/importancia")
def importancia(session_id: str):
    df    = _get_df(session_id)
    datos = ml.preparar_datos_ml(df)
    _, mods = ml.entrenar_y_evaluar(datos)
    rf   = mods["Random Forest"]
    feat = sorted(zip(datos["X"].columns.tolist(),
                      rf.feature_importances_.tolist()),
                  key=lambda x: x[1], reverse=True)[:15]
    return [{"variable": v, "importancia": round(i, 6)} for v, i in feat]


# ── Dashboard predictivo ──────────────────────────────────────────────────────
@router.get("/dashboard/{session_id}/productos")
def productos(session_id: str):
    df   = _get_df(session_id)
    mod, df_ag, X = ml.entrenar_modelo_final(df)
    _cache[session_id]["modelo"] = mod
    _cache[session_id]["df_ag"]  = df_ag
    _cache[session_id]["X_pred"] = X
    return sorted(df_ag["Producto"].unique().tolist())


@router.get("/dashboard/{session_id}/predecir")
def predecir(session_id: str, producto: str,
             dias_historial: int = 30, dias_proyectar: int = 7):
    c = _cache.get(session_id, {})
    if "modelo" not in c:
        # Entrenar si no está cacheado
        df = _get_df(session_id)
        mod, df_ag, X = ml.entrenar_modelo_final(df)
        c["modelo"] = mod; c["df_ag"] = df_ag; c["X_pred"] = X
        _cache[session_id] = c
    return ml.calcular_prediccion(c["modelo"], c["X_pred"], c["df_ag"],
                                  producto, dias_historial, dias_proyectar)


@router.get("/dashboard/{session_id}/criticos")
def criticos(session_id: str, dias_historial: int = 30):
    c = _cache.get(session_id, {})
    if "modelo" not in c:
        df = _get_df(session_id)
        mod, df_ag, X = ml.entrenar_modelo_final(df)
        c["modelo"] = mod; c["df_ag"] = df_ag; c["X_pred"] = X
        _cache[session_id] = c
    return ml.inventario_critico(c["modelo"], c["X_pred"], c["df_ag"], dias_historial)


# ── Notificaciones ────────────────────────────────────────────────────────────
@router.get("/notificaciones/{usuario}")
def get_notifs(usuario: str):
    return obtener_notificaciones(usuario)


@router.post("/notificaciones/{usuario}")
def post_notif(usuario: str, tipo: str, titulo: str, mensaje: str):
    guardar_notificacion(usuario, tipo, titulo, mensaje)
    return {"ok": True}


@router.delete("/notificaciones/{usuario}")
def del_notifs(usuario: str):
    limpiar_notificaciones(usuario)
    return {"ok": True}

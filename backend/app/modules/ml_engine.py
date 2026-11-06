"""ml_engine.py — Pipeline ML completo alineado con AnalisisSupermercado.ipynb"""
import math, warnings, io
import numpy as np
import pandas as pd
warnings.filterwarnings("ignore")

from sklearn.linear_model import LinearRegression
from sklearn.preprocessing import PolynomialFeatures
from sklearn.ensemble import RandomForestRegressor
from sklearn.metrics import mean_squared_error, r2_score, mean_absolute_error
from sklearn.model_selection import train_test_split, cross_val_score, learning_curve


# ── 1. Limpieza ───────────────────────────────────────────────────────────────
def limpiar_datos(df_raw: pd.DataFrame) -> pd.DataFrame:
    df = df_raw.copy()
    df.columns = df.columns.str.strip()
    if "%ventas" in df.columns:
        df.drop(columns=["%ventas"], inplace=True)
    df = df.fillna(0)
    for col in ["Producto", "Categoría", "Marca"]:
        if col in df.columns:
            df[col] = df[col].astype(str).str.strip().str.upper()
    if "Fecha" in df.columns:
        df["Fecha"] = pd.to_datetime(df["Fecha"], errors="coerce")
    return df


# ── 2. Feature Engineering (exacto del notebook) ─────────────────────────────
def feature_engineering(df: pd.DataFrame) -> pd.DataFrame:
    df = df.copy()
    if all(c in df.columns for c in ["Stock Inicial", "Entradas"]):
        df["Disponibilidad"] = df["Stock Inicial"] + df["Entradas"]
    if all(c in df.columns for c in ["Disponibilidad", "Costo Unitario"]):
        df["ValorInventario"] = df["Disponibilidad"] * df["Costo Unitario"]
    if all(c in df.columns for c in ["Salidas", "Disponibilidad"]):
        df["Rotacion"] = df["Salidas"] / (df["Disponibilidad"] + 1)
    if all(c in df.columns for c in ["PVP", "Costo Unitario"]):
        df["MargenBruto"]      = df["PVP"] - df["Costo Unitario"]
        df["RatioPrecioCosto"] = df["PVP"] / df["Costo Unitario"].replace(0, 1)
    return df


# ── 3. Preparación para ML ────────────────────────────────────────────────────
def preparar_datos_ml(df_clean: pd.DataFrame) -> dict:
    df = feature_engineering(df_clean)
    df_enc = pd.get_dummies(df, columns=["Producto", "Categoría", "Marca"], drop_first=True)
    drop   = ["Salidas", "Fecha", "Código SKU", "Rotacion", "Stock Final"]
    X      = df_enc.drop(columns=[c for c in drop if c in df_enc.columns])
    y      = df_enc["Salidas"]
    X_s    = df[["Disponibilidad"]] if "Disponibilidad" in df.columns else X.iloc[:, :1]

    if len(X) > 5:
        X_tr, X_te, y_tr, y_te = train_test_split(X,   y, test_size=.2, random_state=42)
        Xs_tr, Xs_te, ys_tr, ys_te = train_test_split(X_s, y, test_size=.2, random_state=42)
        warn = None
    else:
        X_tr = X_te = X; y_tr = y_te = y
        Xs_tr = Xs_te = X_s; ys_tr = ys_te = y
        warn = "Dataset pequeño, evaluado con 100% de los datos."

    return dict(X=X, y=y, X_simple=X_s,
                X_train=X_tr, X_test=X_te, y_train=y_tr, y_test=y_te,
                X_train_s=Xs_tr, X_test_s=Xs_te, y_train_s=ys_tr, y_test_s=ys_te,
                advertencia=warn)


# ── 4. Entrenamiento y evaluación ─────────────────────────────────────────────
def entrenar_y_evaluar(datos: dict):
    Xtr, Xte, ytr, yte   = datos["X_train"], datos["X_test"], datos["y_train"], datos["y_test"]
    Xstr,Xste,ystr,yste  = datos["X_train_s"], datos["X_test_s"], datos["y_train_s"], datos["y_test_s"]

    # Lineal simple
    ml_lin = LinearRegression().fit(Xstr, ystr)
    p_lin  = ml_lin.predict(Xste)

    # Polinómica g=2
    poly   = PolynomialFeatures(degree=2)
    ml_pol = LinearRegression().fit(poly.fit_transform(Xstr), ystr)
    p_pol  = ml_pol.predict(poly.transform(Xste))

    # Múltiple
    ml_mul = LinearRegression().fit(Xtr, ytr)
    p_mul  = ml_mul.predict(Xte)

    # Random Forest
    ml_rf  = RandomForestRegressor(n_estimators=300, max_depth=10,
                                   min_samples_split=5, min_samples_leaf=2,
                                   random_state=42).fit(Xtr, ytr)
    p_rf   = ml_rf.predict(Xte)

    def met(nombre, yr, yp):
        mse = mean_squared_error(yr, yp)
        return {"modelo": nombre, "mse": round(mse,2),
                "rmse": round(math.sqrt(mse),2),
                "mae":  round(mean_absolute_error(yr,yp),2),
                "r2":   round(r2_score(yr,yp),4),
                "y_real": yr.tolist(), "y_pred": yp.tolist()}

    resultados = [
        met("Regresión Lineal Simple",    yste, p_lin),
        met("Regresión Polinómica (g=2)", yste, p_pol),
        met("Regresión Múltiple",         yte,  p_mul),
        met("Random Forest",              yte,  p_rf),
    ]
    return resultados, {"Regresión Múltiple": ml_mul, "Random Forest": ml_rf}


# ── 5. Validación cruzada ─────────────────────────────────────────────────────
def validacion_cruzada(X, y):
    out = []
    for nombre, mod in [("Regresión Múltiple", LinearRegression()),
                         ("Random Forest", RandomForestRegressor(n_estimators=300,
                                          max_depth=10, random_state=42))]:
        s = cross_val_score(mod, X, y, cv=5, scoring="r2")
        out.append({"modelo": nombre, "folds": [round(v,4) for v in s],
                    "promedio": round(s.mean(),4), "std": round(s.std(),4)})
    return out


# ── 6. Hiperparámetros ────────────────────────────────────────────────────────
def buscar_hiperparametros(Xtr, Xte, ytr, yte):
    rows = []
    for n in [50, 100, 200, 300]:
        for d in [5, 10, 15]:
            mod = RandomForestRegressor(n_estimators=n, max_depth=d, random_state=42)
            mod.fit(Xtr, ytr)
            rows.append({"n_estimators": n, "max_depth": d,
                         "r2": round(r2_score(yte, mod.predict(Xte)), 6)})
    df = pd.DataFrame(rows).sort_values("r2", ascending=False).reset_index(drop=True)
    return df.to_dict("records"), df.iloc[0].to_dict()


# ── 7. Curvas de aprendizaje ──────────────────────────────────────────────────
def curvas_aprendizaje(X, y):
    out = []
    for nombre, mod in [("Regresión Múltiple", LinearRegression()),
                         ("Random Forest", RandomForestRegressor(n_estimators=100,
                                          max_depth=10, random_state=42))]:
        sizes, tr_sc, te_sc = learning_curve(mod, X, y, cv=5,
            scoring="neg_mean_squared_error",
            train_sizes=np.linspace(0.1, 1.0, 8), n_jobs=-1)
        out.append({"modelo": nombre,
                    "sizes":        sizes.tolist(),
                    "train_errors": (-tr_sc.mean(axis=1)).tolist(),
                    "test_errors":  (-te_sc.mean(axis=1)).tolist()})
    return out


# ── 8. Modelo final y predicciones del dashboard ──────────────────────────────
def _agrupar(df_clean):
    df = feature_engineering(df_clean)
    agg = {"Salidas":"sum","Stock Final":"last","Categoría":"first","Marca":"first"}
    for c in ["Stock Inicial","Entradas","PVP","Costo Unitario",
              "Disponibilidad","ValorInventario","MargenBruto","RatioPrecioCosto"]:
        if c in df.columns: agg[c] = "mean"
    return df.groupby("Producto", as_index=False).agg(agg)


def _X_pred(df_ag):
    enc = pd.get_dummies(df_ag, columns=["Categoría","Marca","Producto"], drop_first=True)
    return enc.drop(columns=[c for c in ["Salidas","Stock Final"] if c in enc.columns])


def entrenar_modelo_final(df_clean):
    df_ag = _agrupar(df_clean)
    X     = _X_pred(df_ag)
    y     = df_ag["Salidas"]
    mod   = RandomForestRegressor(n_estimators=300, max_depth=10,
                                  min_samples_split=5, min_samples_leaf=2,
                                  random_state=42).fit(X, y)
    return mod, df_ag, X


def calcular_prediccion(mod, X, df_ag, producto, dias_hist, dias_proy):
    idx  = df_ag[df_ag["Producto"] == producto].index[0]
    pred = mod.predict(X.loc[[idx]])[0]
    vpd  = max(pred / dias_hist, 0.001)
    dem  = math.ceil(vpd * dias_proy)
    stk  = int(df_ag.loc[idx, "Stock Final"])
    cob  = math.floor(stk / vpd) if vpd > 0 else 999
    rop  = math.ceil((vpd * 3) * 1.2)
    estado = "sin_stock" if stk == 0 else "critico" if stk <= rop else \
             "alerta" if stk <= dem else "optimo"
    return {"ventas_diarias": round(vpd, 2), "demanda_proyectada": dem,
            "stock_actual": stk, "cobertura_dias": cob,
            "punto_reorden": rop, "estado": estado,
            "velocidad": "rapido" if vpd > 2 else "lento"}


def inventario_critico(mod, X, df_ag, dias_hist):
    rows = []
    for prod in df_ag["Producto"].unique():
        try:
            m = calcular_prediccion(mod, X, df_ag, prod, dias_hist, 30)
            if m["stock_actual"] <= m["punto_reorden"]:
                rows.append({"producto": prod, "estado": m["estado"],
                             "stock_actual": m["stock_actual"],
                             "punto_reorden": m["punto_reorden"],
                             "dias_restantes": m["cobertura_dias"],
                             "velocidad": m["velocidad"]})
        except Exception: pass
    return sorted(rows, key=lambda r: r["dias_restantes"])


# ── 9. Resumen exploratorio ───────────────────────────────────────────────────
def resumen_exploratorio(df_clean: pd.DataFrame) -> dict:
    cols = [c for c in ["Stock Inicial","Entradas","Salidas",
                        "Costo Unitario","PVP","Stock Final"] if c in df_clean.columns]
    top = (df_clean.groupby("Producto")["Salidas"].sum()
           .reset_index().sort_values("Salidas", ascending=False).head(10)
           .to_dict("records")) if "Producto" in df_clean.columns else []
    cat = (df_clean.groupby("Categoría")["Salidas"].sum()
           .reset_index().sort_values("Salidas", ascending=False)
           .to_dict("records")) if "Categoría" in df_clean.columns else []
    stats = df_clean[cols].describe().round(2).to_dict() if cols else {}
    corr  = df_clean[cols].corr().round(3).to_dict() if len(cols) >= 2 else {}
    nulos = df_clean.isnull().sum().to_dict()
    return {"estadisticas": stats, "nulos": nulos,
            "top_productos": top, "ventas_categoria": cat,
            "correlaciones": corr, "total_registros": len(df_clean)}

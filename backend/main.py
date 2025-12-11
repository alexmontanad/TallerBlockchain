from fastapi import FastAPI, HTTPException
from fastapi.middleware.cors import CORSMiddleware
from pydantic import BaseModel
from typing import List, Dict
import hashlib
import json
import time
import os

# Importar blockchain
from blockchain import Blockchain, Bloque, INDICE_POLINOMIO

app = FastAPI(title="Blockchain API", version="1.0.0")

# ============== CONFIGURACIÓN DE CORS ==============
# 🔧 Detecta automáticamente si estás en local o producción
def get_allowed_origins():
    """Obtiene los orígenes permitidos según el entorno"""
    # Variable de entorno de Railway (si existe)
    env_origins = os.getenv("ALLOWED_ORIGINS", "")
    
    if env_origins:
        # Producción: usar variable de Railway
        origins = env_origins.split(",")
        print(f"🌐 CORS (Producción): {origins}")
        return origins
    else:
        # Local: permitir localhost
        origins = [
            "http://localhost:4321",
            "http://localhost:3000",
            "http://127.0.0.1:4321"
        ]
        print(f"🏠 CORS (Local): {origins}")
        return origins

allowed_origins = get_allowed_origins()

app.add_middleware(
    CORSMiddleware,
    allow_origins=allowed_origins,
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# Almacenamiento
blockchains: Dict[str, Blockchain] = {}

# ============== MODELOS ==============
class CreateBlockchainRequest(BaseModel):
    projectName: str
    primeraObservacion: str = "Acta de inicio del contrato."
    codigoInicial: str = "// Código inicial del proyecto"

class AprobarEtapaRequest(BaseModel):
    codigo: str
    etapa: int
    observaciones: List[str]

class ValidarBloqueRequest(BaseModel):
    bloque: dict

class RecalcularNonceRequest(BaseModel):
    hash_codigo: str
    fecha: str
    observaciones: List[str]

class RecalcularHashActualRequest(BaseModel):
    hash_anterior: str
    nonce: int
    hash_codigo: str
    fecha: str
    lista_verificacion: List[bool]
    observaciones: List[dict]
    pow_hash: str

# ✅ NUEVOS MODELOS PARA FRAUDE
class CodigoRequest(BaseModel):
    codigo: str

class TextoRequest(BaseModel):
    texto: str


# ============== ENDPOINTS ==============

@app.get("/")
def root():
    return {"status": "running", "message": "Blockchain API v1.0"}

@app.post("/blockchain/create")
def create_blockchain(request: CreateBlockchainRequest):
    try:
        blockchain_id = f"bc_{len(blockchains)}"
        
        # ✅ Pasar el código inicial desde el request
        bc = Blockchain(request.projectName, request.codigoInicial)
        blockchains[blockchain_id] = bc
        
        print(f"✅ Blockchain guardada con ID: {blockchain_id}")
        print(f"📊 Total de blockchains: {len(blockchains)}")
        
        genesis = bc.cadena[0]
        
        return {
            "success": True,
            "blockchain_id": blockchain_id,
            "blockchain": {
                "name": bc.nombre_proyecto,
                "rsaBits": 512,
                "createdAt": genesis.fecha_hora
            },
            "genesis_block": serialize_block(genesis, 0),
            "logs": [
                {"type": "success", "message": f"✅ Blockchain creada: {request.projectName}"},
                {"type": "info", "message": f"🆔 ID: {blockchain_id}"},
                {"type": "success", "message": f"✅ Bloque génesis (nonce={genesis.nonce})"},
                {"type": "success", "message": f"✅ {len(genesis.observaciones)} observación inicial firmada"},
                {"type": "info", "message": f"💾 Hash del código inicial: {genesis.hash_codigo[:16]}..."}
            ]
        }
    except Exception as e:
        print(f"❌ Error: {str(e)}")
        import traceback
        traceback.print_exc()
        raise HTTPException(status_code=500, detail=str(e))

@app.get("/blockchain/{blockchain_id}/blocks")
def get_blocks(blockchain_id: str):
    if blockchain_id not in blockchains:
        raise HTTPException(status_code=404, detail="Blockchain not found")
    
    bc = blockchains[blockchain_id]
    return {
        "blocks": [serialize_block(block, idx) for idx, block in enumerate(bc.cadena)]
    }

@app.post("/blockchain/{blockchain_id}/aprobar-etapa")
def aprobar_etapa(blockchain_id: str, request: AprobarEtapaRequest):
    print(f"🔍 Buscando blockchain: {blockchain_id}")
    
    if blockchain_id not in blockchains:
        raise HTTPException(status_code=404, detail=f"Blockchain not found")
    
    bc = blockchains[blockchain_id]
    
    try:
        # ✅ CORREGIDO: Pasar lista de observaciones directamente
        print(f"📝 Recibidas {len(request.observaciones)} observaciones")
        for i, obs in enumerate(request.observaciones, 1):
            print(f"   {i}. {obs[:50]}...")
        
        nuevo_bloque = bc.agregar_etapa(
            request.codigo, 
            request.etapa, 
            request.observaciones  # ✅ Lista completa, no concatenada
        )
        
        if nuevo_bloque is None:
            raise HTTPException(status_code=400, detail="No se pudo agregar el bloque")
        
        return {
            "success": True,
            "block": serialize_block(nuevo_bloque, len(bc.cadena) - 1),
            "logs": [
                {"type": "success", "message": f"✅ Etapa {request.etapa + 1} completada"},
                {"type": "success", "message": f"✅ {len(nuevo_bloque.observaciones)} observaciones firmadas con RSA-512"},
                {"type": "info", "message": f"⛏️ Nonce: {nuevo_bloque.nonce}"},
                {"type": "info", "message": f"🔐 Hash PoW: {nuevo_bloque.prueba_trabajo[:16]}..."}
            ]
        }
    except HTTPException:
        raise
    except Exception as e:
        print(f"❌ Error: {str(e)}")
        import traceback
        traceback.print_exc()
        raise HTTPException(status_code=500, detail=str(e))


@app.post("/blockchain/{blockchain_id}/validate")
def validate_blockchain(blockchain_id: str):
    if blockchain_id not in blockchains:
        raise HTTPException(status_code=404, detail="Blockchain not found")
    
    bc = blockchains[blockchain_id]
    valida, mensaje = bc.validar_cadena()
    
    return {
        "valid": valida,
        "message": mensaje,
        "logs": [
            {"type": "info", "message": "🔍 Validando blockchain..."},
            {"type": "success" if valida else "error", "message": mensaje}
        ]
    }

@app.delete("/blockchain/{blockchain_id}")
def delete_blockchain(blockchain_id: str):
    if blockchain_id not in blockchains:
        raise HTTPException(status_code=404, detail="Blockchain not found")
    del blockchains[blockchain_id]
    return {"success": True}


# ============== ENDPOINTS PARA SIMULADOR DE FRAUDE ==============

@app.post("/fraude/validar-bloque")
def validar_bloque_fraude(request: ValidarBloqueRequest):
    """Valida un bloque individualmente (para simulador de fraude)"""
    try:
        bloque_data = request.bloque
        
        print(f"\n🔍 Validando bloque fraude...")
        print(f"   Bloque ID: {bloque_data.get('id', 'N/A')}")
        
        resultados = {
            "valido": True,
            "errores": [],
            "validaciones": {}
        }
        
        # 1. Validar hash del código
        codigo_texto = bloque_data.get('codigo_texto', bloque_data.get('codigo', ''))
        hash_codigo_calculado = hashlib.sha256(codigo_texto.encode('utf-8')).hexdigest()
        hash_codigo_match = hash_codigo_calculado == bloque_data['codigo_hash']
        resultados['validaciones']['hash_codigo'] = {
            "valido": hash_codigo_match,
            "esperado": bloque_data['codigo_hash'],
            "calculado": hash_codigo_calculado
        }
        if not hash_codigo_match:
            resultados['valido'] = False
            resultados['errores'].append("Hash del código no coincide")
        
        # 2. Validar PoW (MD5)
        obs_text = " | ".join([obs['texto'] for obs in bloque_data['observaciones']])
        data_pow = f"{bloque_data['nonce']}{bloque_data['codigo_hash']}{bloque_data['fecha']}{obs_text}"
        pow_calculado = hashlib.md5(data_pow.encode('utf-8')).hexdigest()
        pow_match = pow_calculado == bloque_data['pow_hash']
        pow_valido = pow_calculado.startswith("00")
        
        resultados['validaciones']['pow'] = {
            "valido": pow_match and pow_valido,
            "hash_match": pow_match,
            "prefijo_valido": pow_valido,
            "esperado": bloque_data['pow_hash'],
            "calculado": pow_calculado
        }
        if not pow_match:
            resultados['valido'] = False
            resultados['errores'].append("Hash PoW no coincide")
        if not pow_valido:
            resultados['valido'] = False
            resultados['errores'].append("PoW no tiene prefijo '00'")
        
        # 3. Validar hash actual - USAR EL MISMO MÉTODO QUE LA BLOCKCHAIN
        # ✅ IMPORTANTE: Ordenar las observaciones igual que en blockchain.py
        observaciones_ordenadas = [
            {
                'texto': obs['texto'],
                'hash_md5': obs['hash_md5'],
                'firma': obs.get('firma_rsa', obs.get('firma', '')),
                'timestamp': obs['timestamp']
            }
            for obs in bloque_data['observaciones']
        ]
        
        obs_json = json.dumps(observaciones_ordenadas, sort_keys=True)
        lista_ver = "".join(["1" if x else "0" for x in bloque_data['lista_verificacion']])
        data_hash = (f"{bloque_data['hash_anterior']}{bloque_data['nonce']}{bloque_data['codigo_hash']}"
                     f"{bloque_data['fecha']}{lista_ver}{obs_json}{bloque_data['pow_hash']}")
        hash_actual_calculado = hashlib.sha512(data_hash.encode('utf-8')).hexdigest()
        hash_actual_match = hash_actual_calculado == bloque_data['hash_actual']
        
        # Debug para ver qué está pasando
        if not hash_actual_match:
            print(f"   ❌ Hash no coincide:")
            print(f"      Esperado: {bloque_data['hash_actual'][:32]}...")
            print(f"      Calculado: {hash_actual_calculado[:32]}...")
            print(f"      Data para hash: {data_hash[:100]}...")
            print(f"      Obs JSON: {obs_json[:100]}...")
        
        resultados['validaciones']['hash_actual'] = {
            "valido": hash_actual_match,
            "esperado": bloque_data['hash_actual'],
            "calculado": hash_actual_calculado
        }
        if not hash_actual_match:
            resultados['valido'] = False
            resultados['errores'].append("Hash actual no coincide")
        
        # 4. Validar firmas RSA de observaciones
        firmas_validas = []
        for idx, obs in enumerate(bloque_data['observaciones']):
            hash_obs = hashlib.md5(obs['texto'].encode('utf-8')).hexdigest()
            firma_valida = hash_obs == obs['hash_md5']
            firmas_validas.append(firma_valida)
            if not firma_valida:
                resultados['valido'] = False
                resultados['errores'].append(f"Hash MD5 de observación {idx} no coincide")
        
        resultados['validaciones']['firmas'] = {
            "validas": firmas_validas,
            "todas_validas": all(firmas_validas)
        }
        
        print(f"   Resultado: {'✅ VÁLIDO' if resultados['valido'] else '❌ CORRUPTO'}")
        if resultados['errores']:
            print(f"   Errores: {', '.join(resultados['errores'])}")
        
        return resultados
        
    except Exception as e:
        print(f"❌ Error en validar-bloque: {str(e)}")
        import traceback
        traceback.print_exc()
        raise HTTPException(status_code=500, detail=str(e))


@app.post("/fraude/recalcular-hash-codigo")
async def recalcular_hash_codigo(request: CodigoRequest):
    """Recalcula el hash SHA-256 del código"""
    try:
        print(f"\n🔄 Recalculando hash código ({len(request.codigo)} caracteres)...")
        hash_calculado = hashlib.sha256(request.codigo.encode('utf-8')).hexdigest()
        print(f"   Hash: {hash_calculado[:32]}...")
        return {"hash": hash_calculado}
    except Exception as e:
        print(f"❌ Error: {str(e)}")
        import traceback
        traceback.print_exc()
        raise HTTPException(status_code=500, detail=str(e))

@app.post("/fraude/recalcular-hash-observacion")
async def recalcular_hash_observacion(request: TextoRequest):
    """Recalcula el hash MD5 de una observación"""
    try:
        print(f"\n🔄 Recalculando hash observación...")
        hash_md5 = hashlib.md5(request.texto.encode('utf-8')).hexdigest()
        print(f"   Hash: {hash_md5}")
        return {"hash": hash_md5}
    except Exception as e:
        print(f"❌ Error: {str(e)}")
        import traceback
        traceback.print_exc()
        raise HTTPException(status_code=500, detail=str(e))

@app.post("/fraude/recalcular-nonce")
def recalcular_nonce(request: RecalcularNonceRequest):
    """Recalcula el nonce para PoW"""
    try:
        print(f"\n⛏️ Recalculando nonce...")
        obs_text = " | ".join(request.observaciones)
        nonce = 0
        inicio = time.time()
        
        while True:
            data = f"{nonce}{request.hash_codigo}{request.fecha}{obs_text}"
            hash_md5 = hashlib.md5(data.encode('utf-8')).hexdigest()
            if hash_md5.startswith("00"):
                tiempo = time.time() - inicio
                print(f"   ✅ Nonce encontrado: {nonce} en {tiempo:.2f}s")
                return {
                    "nonce": nonce,
                    "pow_hash": hash_md5,
                    "tiempo": round(tiempo, 2),
                    "intentos": nonce
                }
            nonce += 1
            
            # Límite de seguridad
            if nonce > 10000000:
                raise HTTPException(status_code=500, detail="No se encontró nonce válido (límite excedido)")
                
    except Exception as e:
        print(f"❌ Error: {str(e)}")
        import traceback
        traceback.print_exc()
        raise HTTPException(status_code=500, detail=str(e))

@app.post("/fraude/recalcular-hash-actual")
def recalcular_hash_actual(request: RecalcularHashActualRequest):
    """Recalcula el hash SHA-512 del bloque"""
    try:
        print(f"\n🔄 Recalculando hash actual del bloque...")
        
        # ✅ IMPORTANTE: Normalizar las observaciones a la estructura correcta
        observaciones_normalizadas = []
        for obs in request.observaciones:
            obs_normalizada = {
                'texto': obs.get('texto', ''),
                'hash_md5': obs.get('hash_md5', ''),
                'firma': obs.get('firma_rsa', obs.get('firma', '')),  # Manejar ambos nombres
                'timestamp': obs.get('timestamp', '')
            }
            observaciones_normalizadas.append(obs_normalizada)
        
        # Serializar con sort_keys=True (igual que blockchain.py)
        obs_json = json.dumps(observaciones_normalizadas, sort_keys=True)
        lista_ver = "".join(["1" if x else "0" for x in request.lista_verificacion])
        
        data = (f"{request.hash_anterior}{request.nonce}{request.hash_codigo}"
                f"{request.fecha}{lista_ver}{obs_json}{request.pow_hash}")
        
        hash_actual = hashlib.sha512(data.encode('utf-8')).hexdigest()
        
        # Debug
        print(f"   Nonce: {request.nonce}")
        print(f"   Hash código: {request.hash_codigo[:32]}...")
        print(f"   Lista verificación: {lista_ver}")
        print(f"   Observaciones JSON: {obs_json[:100]}...")
        print(f"   Hash calculado: {hash_actual[:32]}...")
        
        return {"hash": hash_actual}
    except Exception as e:
        print(f"❌ Error: {str(e)}")
        import traceback
        traceback.print_exc()
        raise HTTPException(status_code=500, detail=str(e))

@app.post("/debug/comparar-hash")
def debug_comparar_hash(request: dict):
    """Debug: compara cómo se calcula el hash"""
    try:
        bloque_data = request['bloque']
        
        # Método 1: Normalizado
        obs_normalizadas = []
        for obs in bloque_data['observaciones']:
            obs_normalizada = {
                'texto': obs.get('texto', ''),
                'hash_md5': obs.get('hash_md5', ''),
                'firma': obs.get('firma_rsa', obs.get('firma', '')),
                'timestamp': obs.get('timestamp', '')
            }
            obs_normalizadas.append(obs_normalizada)
        
        obs_json_normalizado = json.dumps(obs_normalizadas, sort_keys=True)
        
        # Método 2: Directo
        obs_json_directo = json.dumps(bloque_data['observaciones'], sort_keys=True)
        
        lista_ver = "".join(["1" if x else "0" for x in bloque_data['lista_verificacion']])
        
        data_normalizado = (f"{bloque_data['hash_anterior']}{bloque_data['nonce']}{bloque_data['codigo_hash']}"
                           f"{bloque_data['fecha']}{lista_ver}{obs_json_normalizado}{bloque_data['pow_hash']}")
        
        data_directo = (f"{bloque_data['hash_anterior']}{bloque_data['nonce']}{bloque_data['codigo_hash']}"
                       f"{bloque_data['fecha']}{lista_ver}{obs_json_directo}{bloque_data['pow_hash']}")
        
        hash_normalizado = hashlib.sha512(data_normalizado.encode('utf-8')).hexdigest()
        hash_directo = hashlib.sha512(data_directo.encode('utf-8')).hexdigest()
        
        return {
            "hash_esperado": bloque_data['hash_actual'],
            "hash_normalizado": hash_normalizado,
            "hash_directo": hash_directo,
            "normalizado_coincide": hash_normalizado == bloque_data['hash_actual'],
            "directo_coincide": hash_directo == bloque_data['hash_actual'],
            "obs_json_normalizado": obs_json_normalizado[:200],
            "obs_json_directo": obs_json_directo[:200],
            "data_normalizado": data_normalizado[:200],
            "data_directo": data_directo[:200]
        }
    except Exception as e:
        import traceback
        traceback.print_exc()
        raise HTTPException(status_code=500, detail=str(e))

@app.post("/fraude/validar-cadena-completa")
def validar_cadena_completa(request: dict):
    """Valida la cadena completa considerando los enlaces entre bloques"""
    try:
        bloques = request['bloques']
        resultados = []
        
        print(f"\n🔍 Validando cadena completa ({len(bloques)} bloques)...")
        
        for index, bloque_data in enumerate(bloques):
            resultado = {
                "valido": True,
                "errores": [],
                "validaciones": {}
            }
            
            # 1. Validar hash del código
            codigo_texto = bloque_data.get('codigo_texto', bloque_data.get('codigo', ''))
            hash_codigo_calculado = hashlib.sha256(codigo_texto.encode('utf-8')).hexdigest()
            hash_codigo_match = hash_codigo_calculado == bloque_data['codigo_hash']
            resultado['validaciones']['hash_codigo'] = {
                "valido": hash_codigo_match,
                "esperado": bloque_data['codigo_hash'],
                "calculado": hash_codigo_calculado
            }
            if not hash_codigo_match:
                resultado['valido'] = False
                resultado['errores'].append("Hash del código no coincide")
            
            # 2. Validar PoW (MD5)
            obs_text = " | ".join([obs['texto'] for obs in bloque_data['observaciones']])
            data_pow = f"{bloque_data['nonce']}{bloque_data['codigo_hash']}{bloque_data['fecha']}{obs_text}"
            pow_calculado = hashlib.md5(data_pow.encode('utf-8')).hexdigest()
            pow_match = pow_calculado == bloque_data['pow_hash']
            pow_valido = pow_calculado.startswith("00")
            
            resultado['validaciones']['pow'] = {
                "valido": pow_match and pow_valido,
                "hash_match": pow_match,
                "prefijo_valido": pow_valido,
                "esperado": bloque_data['pow_hash'],
                "calculado": pow_calculado
            }
            if not pow_match:
                resultado['valido'] = False
                resultado['errores'].append("Hash PoW no coincide")
            if not pow_valido:
                resultado['valido'] = False
                resultado['errores'].append("PoW no tiene prefijo '00'")
            
            # 3. Validar hash actual del bloque
            observaciones_normalizadas = []
            for obs in bloque_data['observaciones']:
                obs_normalizada = {
                    'texto': obs.get('texto', ''),
                    'hash_md5': obs.get('hash_md5', ''),
                    'firma': obs.get('firma_rsa', obs.get('firma', '')),
                    'timestamp': obs.get('timestamp', '')
                }
                observaciones_normalizadas.append(obs_normalizada)
            
            obs_json = json.dumps(observaciones_normalizadas, sort_keys=True)
            lista_ver = "".join(["1" if x else "0" for x in bloque_data['lista_verificacion']])
            data_hash = (f"{bloque_data['hash_anterior']}{bloque_data['nonce']}{bloque_data['codigo_hash']}"
                        f"{bloque_data['fecha']}{lista_ver}{obs_json}{bloque_data['pow_hash']}")
            hash_actual_calculado = hashlib.sha512(data_hash.encode('utf-8')).hexdigest()
            hash_actual_match = hash_actual_calculado == bloque_data['hash_actual']
            
            resultado['validaciones']['hash_actual'] = {
                "valido": hash_actual_match,
                "esperado": bloque_data['hash_actual'],
                "calculado": hash_actual_calculado
            }
            if not hash_actual_match:
                resultado['valido'] = False
                resultado['errores'].append("Hash actual no coincide")
            
            # 4. ✅ VALIDAR ENLACE CON EL BLOQUE ANTERIOR (EFECTO CASCADA)
            if index > 0:
                bloque_anterior = bloques[index - 1]
                enlace_valido = bloque_data['hash_anterior'] == bloque_anterior['hash_actual']
                
                resultado['validaciones']['enlace_anterior'] = {
                    "valido": enlace_valido,
                    "hash_anterior_esperado": bloque_anterior['hash_actual'],
                    "hash_anterior_actual": bloque_data['hash_anterior']
                }
                
                if not enlace_valido:
                    resultado['valido'] = False
                    resultado['errores'].append(f"Cadena rota: hash_anterior no coincide con hash_actual del Bloque #{index - 1}")
                    print(f"   ❌ Bloque #{index}: CADENA ROTA")
            
            # 5. Validar firmas MD5 de observaciones
            firmas_validas = []
            for idx, obs in enumerate(bloque_data['observaciones']):
                hash_obs = hashlib.md5(obs['texto'].encode('utf-8')).hexdigest()
                firma_valida = hash_obs == obs['hash_md5']
                firmas_validas.append(firma_valida)
                if not firma_valida:
                    resultado['valido'] = False
                    resultado['errores'].append(f"Hash MD5 de observación {idx} no coincide")
            
            resultado['validaciones']['firmas'] = {
                "validas": firmas_validas,
                "todas_validas": all(firmas_validas)
            }
            
            print(f"   Bloque #{index}: {'✅ VÁLIDO' if resultado['valido'] else '❌ CORRUPTO'}")
            if resultado['errores']:
                print(f"      Errores: {', '.join(resultado['errores'])}")
            
            resultados.append(resultado)
        
        return {"resultados": resultados}
        
    except Exception as e:
        print(f"❌ Error en validar-cadena-completa: {str(e)}")
        import traceback
        traceback.print_exc()
        raise HTTPException(status_code=500, detail=str(e))

@app.post("/blockchain/{blockchain_id}/descifrar-bloque/{bloque_index}")
def descifrar_bloque(blockchain_id: str, bloque_index: int):
    """Descifra los datos de un bloque específico"""
    try:
        print(f"\n🔓 Descifrar bloque solicitado:")
        print(f"  Blockchain ID: {blockchain_id}")
        print(f"  Bloque index: {bloque_index}")
        
        if blockchain_id not in blockchains:
            print(f"  ❌ Blockchain no encontrada")
            raise HTTPException(status_code=404, detail="Blockchain not found")
        
        bc = blockchains[blockchain_id]
        print(f"  ✅ Blockchain encontrada: {bc.nombre_proyecto}")
        print(f"  Total bloques: {len(bc.cadena)}")
        
        if bloque_index >= len(bc.cadena):
            print(f"  ❌ Índice {bloque_index} fuera de rango")
            raise HTTPException(status_code=404, detail="Bloque no encontrado")
        
        bloque = bc.cadena[bloque_index]
        print(f"  ✅ Bloque obtenido - Etapa: {bloque.etapa_actual}")
        print(f"  Datos cifrados (hex): {bloque.datos_cifrados[:64]}...")
        
        # Intentar descifrar
        print(f"  🔄 Intentando descifrar...")
        datos_descifrados = bloque.descifrar_bloque()
        print(f"  ✅ Descifrado exitoso")
        print(f"  Datos: {str(datos_descifrados)[:100]}...")
        
        return {
            "success": True,
            "bloque_index": bloque_index,
            "datos_cifrados_hex": bloque.datos_cifrados[:128] + "...",
            "datos_descifrados": datos_descifrados,
            "algoritmo": f"AES-128 ECB (Polinomio índice {INDICE_POLINOMIO})",
            "longitud_cifrado": len(bloque.datos_cifrados),
            "logs": [
                {"type": "info", "message": f"🔓 Descifrando bloque #{bloque_index}..."},
                {"type": "success", "message": f"✅ AES-128 descifrado exitosamente"},
                {"type": "info", "message": f"📊 Polinomio: {INDICE_POLINOMIO}"},
                {"type": "info", "message": f"🔑 Datos recuperados: {len(str(datos_descifrados))} caracteres"}
            ]
        }
    except HTTPException:
        raise
    except Exception as e:
        print(f"  ❌ Error al descifrar: {str(e)}")
        import traceback
        traceback.print_exc()
        raise HTTPException(status_code=500, detail=f"Error al descifrar: {str(e)}")



# ============== SERIALIZACIÓN ==============
def serialize_block(bloque: Bloque, index: int):
    """Serializa un bloque para JSON"""
    return {
        "id": index,
        "etapa": bloque.etapa_actual,
        "fecha": bloque.fecha_hora,
        "hash_anterior": bloque.hash_anterior,
        "codigo_hash": bloque.hash_codigo,
        "codigo_texto": bloque.codigo,
        "nonce": bloque.nonce,
        "pow_hash": bloque.prueba_trabajo,
        "hash_actual": bloque.hash_actual,
        "lista_verificacion": bloque.lista_verificacion,
        "observaciones": [
            {
                "texto": obs['texto'],
                "hash_md5": obs['hash_md5'],
                "firma_rsa": obs['firma'],
                "timestamp": obs['timestamp']
            }
            for obs in bloque.observaciones
        ],
        "cifrado_aes": bloque.datos_cifrados[:64] + "..." if len(bloque.datos_cifrados) > 64 else bloque.datos_cifrados
        # ✅ datos_cifrados (sin "a") es el correcto
    }

if __name__ == "__main__":
    import uvicorn
    print("\n🚀 Backend en http://localhost:8000")
    print("📚 Docs en http://localhost:8000/docs\n")
    uvicorn.run(app, host="0.0.0.0", port=8000)

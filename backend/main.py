# -*- coding: utf-8 -*-
"""
Created on Wed Dec 10 22:11:04 2025

@author: Alex
"""

#!/usr/bin/env python3
# -*- coding: utf-8 -*-
"""
API FastAPI para Sistema Blockchain
"""

from fastapi import FastAPI, HTTPException
from fastapi.middleware.cors import CORSMiddleware
from pydantic import BaseModel
from typing import List, Optional
import json

from blockchain import Blockchain, Bloque

app = FastAPI(title="Blockchain API", version="1.0.0")

# Configurar CORS
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],  # En producción, especifica dominios
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# Almacenamiento en memoria (en producción usa DB)
blockchains = {}

# Modelos Pydantic
class CreateBlockchainRequest(BaseModel):
    projectName: str

class AddBlockRequest(BaseModel):
    codigo: str
    etapa: int
    observacion: str

class BlockchainResponse(BaseModel):
    name: str
    rsaBits: int

class BlockResponse(BaseModel):
    id: int
    hash_anterior: str
    codigo: str
    etapa: int
    fecha: str
    nonce: int
    hash_actual: str
    observaciones: List[str]
    cifrado: bool
    fraudulento: bool = False

@app.get("/")
def read_root():
    return {"message": "Blockchain API v1.0", "status": "running"}

@app.post("/blockchain/create")
def create_blockchain(request: CreateBlockchainRequest):
    """Crea una nueva blockchain"""
    try:
        blockchain_id = f"bc_{len(blockchains)}"
        bc = Blockchain(request.projectName)
        blockchains[blockchain_id] = bc
        
        return {
            "success": True,
            "blockchain_id": blockchain_id,
            "blockchain": {
                "name": bc.nombre_proyecto,
                "rsaBits": 512
            },
            "genesis_block": serialize_block(bc.cadena[0])
        }
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))

@app.get("/blockchain/{blockchain_id}")
def get_blockchain(blockchain_id: str):
    """Obtiene información de la blockchain"""
    if blockchain_id not in blockchains:
        raise HTTPException(status_code=404, detail="Blockchain not found")
    
    bc = blockchains[blockchain_id]
    return {
        "blockchain": {
            "name": bc.nombre_proyecto,
            "rsaBits": 512
        },
        "blocks": [serialize_block(block) for block in bc.cadena]
    }

@app.post("/blockchain/{blockchain_id}/add-block")
def add_block(blockchain_id: str, request: AddBlockRequest):
    """Agrega un nuevo bloque a la blockchain"""
    if blockchain_id not in blockchains:
        raise HTTPException(status_code=404, detail="Blockchain not found")
    
    bc = blockchains[blockchain_id]
    
    try:
        nuevo_bloque = bc.agregar_etapa(
            request.codigo,
            request.etapa,
            request.observacion
        )
        
        if nuevo_bloque is None:
            raise HTTPException(status_code=400, detail="No se pudo agregar el bloque")
        
        return {
            "success": True,
            "block": serialize_block(nuevo_bloque),
            "notifications": bc.notificaciones[-3:]
        }
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))

@app.post("/blockchain/{blockchain_id}/validate")
def validate_blockchain(blockchain_id: str):
    """Valida la integridad de la blockchain"""
    if blockchain_id not in blockchains:
        raise HTTPException(status_code=404, detail="Blockchain not found")
    
    bc = blockchains[blockchain_id]
    valida, mensaje = bc.validar_cadena()
    
    return {
        "valid": valida,
        "message": mensaje,
        "notifications": bc.notificaciones[-5:]
    }

@app.post("/blockchain/{blockchain_id}/simulate-fraud/{block_id}")
def simulate_fraud(blockchain_id: str, block_id: int):
    """Simula un intento de fraude"""
    if blockchain_id not in blockchains:
        raise HTTPException(status_code=404, detail="Blockchain not found")
    
    bc = blockchains[blockchain_id]
    
    try:
        bc.intentar_modificacion(block_id)
        return {
            "success": True,
            "notifications": bc.notificaciones[-5:]
        }
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))

@app.get("/blockchain/{blockchain_id}/decrypt/{block_id}")
def decrypt_block(blockchain_id: str, block_id: int):
    """Descifra los datos de un bloque"""
    if blockchain_id not in blockchains:
        raise HTTPException(status_code=404, detail="Blockchain not found")
    
    bc = blockchains[blockchain_id]
    
    if block_id >= len(bc.cadena):
        raise HTTPException(status_code=404, detail="Block not found")
    
    bloque = bc.cadena[block_id]
    datos_descifrados = bloque.descifrar_bloque()
    
    return {
        "block_id": block_id,
        "decrypted_data": datos_descifrados
    }

@app.delete("/blockchain/{blockchain_id}")
def delete_blockchain(blockchain_id: str):
    """Elimina una blockchain"""
    if blockchain_id not in blockchains:
        raise HTTPException(status_code=404, detail="Blockchain not found")
    
    del blockchains[blockchain_id]
    return {"success": True, "message": "Blockchain deleted"}

def serialize_block(block: Bloque) -> dict:
    """Serializa un bloque para la respuesta JSON"""
    return {
        "id": block.cadena.index(block) if hasattr(block, 'cadena') else 0,
        "hash_anterior": block.hash_anterior,
        "codigo": block.codigo,
        "etapa": block.etapa_actual,
        "fecha": block.fecha_hora,
        "nonce": block.nonce,
        "hash_actual": block.hash_actual,
        "observaciones": [obs['texto'] for obs in block.observaciones],
        "cifrado": True,
        "fraudulento": False
    }

if __name__ == "__main__":
    import uvicorn
    uvicorn.run(app, host="0.0.0.0", port=8000)
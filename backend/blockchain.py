#!/usr/bin/env python3
# -*- coding: utf-8 -*-
"""
Sistema Blockchain Completo para Contratos Inteligentes
- Importa RSA-512 desde módulo externo
- AES-128 Propietario
- SHA-256, SHA-512, MD5
- Prueba de Trabajo
- Validación completa
"""

import hashlib
import time
from datetime import datetime
import json
import sys

# ============== IMPORTAR RSA-512 ==============
try:
    from rsa512 import RSA512
    RSA_DISPONIBLE = True
    print("✓ Módulo RSA-512 importado correctamente")
except ImportError:
    print("⚠️ Error: No se pudo importar rsa512.py")
    print("   Coloca el archivo rsa512.py en el mismo directorio")
    RSA_DISPONIBLE = False
    sys.exit(1)

# ============== IMPORTAR AES DEL TALLER 4 ==============
try:
    from aes128_propietario import AES128, calcular_polinomio
    AES_DISPONIBLE = True
except ImportError:
    print("⚠️ Advertencia: No se pudo importar aes128_propietario.py")
    print("   Coloca el archivo en el mismo directorio para cifrado AES")
    AES_DISPONIBLE = False
    
    # Implementación simulada
    class AES128:
        def __init__(self, poly_index):
            self.poly_index = poly_index
        
        def pkcs7_pad(self, data):
            if isinstance(data, str):
                data = data.encode('utf-8')
            padding_length = 16 - (len(data) % 16)
            return data + bytes([padding_length] * padding_length)
        
        def pkcs7_unpad(self, data):
            padding_length = data[-1]
            return data[:-padding_length]
        
        def encrypt_ecb(self, data, key):
            if isinstance(data, str):
                data = data.encode('utf-8')
            padded = self.pkcs7_pad(data)
            result = bytes([b ^ key[i % len(key)] for i, b in enumerate(padded)])
            return result
        
        def decrypt_ecb(self, data, key):
            decrypted = bytes([b ^ key[i % len(key)] for i, b in enumerate(data)])
            return self.pkcs7_unpad(decrypted)
    
    def calcular_polinomio(codigos):
        suma = sum(int(str(cod)[-2:]) for cod in codigos)
        indice = suma % 30
        return indice if indice != 0 else max(int(str(cod)[-1]) for cod in codigos)

# ============== CONFIGURACIÓN AES ==============
CODIGOS_GRUPO = [20242678042, 20242678015, 20242678026]
INDICE_POLINOMIO = calcular_polinomio(CODIGOS_GRUPO)
aes_cipher = AES128(INDICE_POLINOMIO)
CLAVE_AES = [0x2b, 0x7e, 0x15, 0x16,
             0x28, 0xae, 0xd2, 0xa6,
             0xab, 0xf7, 0x15, 0x88,
             0x09, 0xcf, 0x4f, 0x3c]

# ============== CLASE BLOQUE ==============
class Bloque:
    """Bloque de blockchain con cifrado AES."""
    
    ETAPAS = [
        "Establecimiento de requerimientos funcionales",
        "Presentación del primer prototipo funcional",
        "Presentación del prototipo final",
        "Presentación del producto para despliegue",
        "Entrega final y liquidación"
    ]

    def __init__(self, hash_anterior, codigo, etapa_actual, observaciones_lista, rsa_interventor):
        """
        Args:
            hash_anterior: Hash SHA-512 del bloque anterior
            codigo: Código del proyecto
            etapa_actual: Número de etapa (0-4)
            observaciones_lista: Lista de strings con las observaciones
            rsa_interventor: Instancia RSA512 para firmar
        """
        self.hash_anterior = hash_anterior
        self.codigo = codigo
        self.etapa_actual = etapa_actual
        self.fecha_hora = datetime.now().isoformat()
        self.lista_verificacion = [True if i <= etapa_actual else False
                                   for i in range(len(self.ETAPAS))]
        self.hash_codigo = self._calcular_hash_codigo()
        self.observaciones = []
        
        # Agregar cada observación individualmente
        if isinstance(observaciones_lista, str):
            observaciones_lista = [observaciones_lista]
        
        for obs_texto in observaciones_lista:
            self.agregar_observacion(obs_texto, rsa_interventor)
        
        self.nonce = 0
        self.prueba_trabajo = ""
        self._calcular_pow()
        self.hash_actual = self._calcular_hash_actual()
        self.datos_cifrados = self._cifrar_bloque()

    def _calcular_hash_codigo(self):
        """SHA-256 del código."""
        return hashlib.sha256(self.codigo.encode('utf-8')).hexdigest()

    def _calcular_pow(self):
        """Prueba de Trabajo con MD5."""
        obs_text = " | ".join([obs['texto'] for obs in self.observaciones])
        while True:
            data = f"{self.nonce}{self.hash_codigo}{self.fecha_hora}{obs_text}"
            hash_md5 = hashlib.md5(data.encode('utf-8')).hexdigest()
            if hash_md5.startswith("00"):
                self.prueba_trabajo = hash_md5
                break
            self.nonce += 1

    def _calcular_hash_actual(self):
        """SHA-512 del bloque."""
        obs_json = json.dumps(self.observaciones, sort_keys=True)
        lista_ver = "".join(["1" if x else "0" for x in self.lista_verificacion])
        data = (f"{self.hash_anterior}{self.nonce}{self.hash_codigo}"
                f"{self.fecha_hora}{lista_ver}{obs_json}{self.prueba_trabajo}")
        return hashlib.sha512(data.encode('utf-8')).hexdigest()

    def _cifrar_bloque(self):
        """Cifra datos del bloque con AES."""
        datos = {
            'codigo': self.codigo,
            'etapa': self.etapa_actual,
            'fecha': self.fecha_hora,
            'observaciones': [obs['texto'] for obs in self.observaciones]
        }
        datos_json = json.dumps(datos)
        datos_bytes = datos_json.encode('utf-8')
        datos_cifrados = aes_cipher.encrypt_ecb(datos_bytes, CLAVE_AES)
        return datos_cifrados.hex()

    def descifrar_bloque(self):
        """Descifra datos del bloque."""
        try:
            datos_bytes = bytes.fromhex(self.datos_cifrados)
            datos_descifrados = aes_cipher.decrypt_ecb(datos_bytes, CLAVE_AES)
            if isinstance(datos_descifrados, bytes):
                datos_json = datos_descifrados.decode('utf-8', errors='ignore')
            else:
                datos_json = str(datos_descifrados)
            return json.loads(datos_json)
        except json.JSONDecodeError as e:
            return {
                "nota": "Datos cifrados (no se pudo descifrar completamente)",
                "datos_hex": self.datos_cifrados[:64] + "...",
                "etapa": self.etapa_actual,
                "fecha": self.fecha_hora
            }
        except Exception as e:
            return {
                "error": f"Error al descifrar: {type(e).__name__}",
                "etapa": self.etapa_actual,
                "fecha": self.fecha_hora
            }

    def agregar_observacion(self, texto, rsa_interventor):
        """Agrega observación con firma RSA-512."""
        hash_obs = hashlib.md5(texto.encode('utf-8')).hexdigest()
        firma = rsa_interventor.firmar(hash_obs)
        observacion = {
            'texto': texto,
            'hash_md5': hash_obs,
            'firma': firma,
            'timestamp': datetime.now().isoformat()
        }
        self.observaciones.append(observacion)

    def verificar_firma(self, indice_obs, rsa_interventor):
        """Verifica firma RSA-512."""
        if indice_obs >= len(self.observaciones):
            return False
        obs = self.observaciones[indice_obs]
        return rsa_interventor.verificar(obs['hash_md5'], obs['firma'])

    def validar_bloque(self):
        """Valida integridad del bloque."""
        hash_codigo_calc = hashlib.sha256(self.codigo.encode('utf-8')).hexdigest()
        if hash_codigo_calc != self.hash_codigo:
            return False, "Hash del código no coincide"
        
        obs_text = " | ".join([obs['texto'] for obs in self.observaciones])
        data = f"{self.nonce}{self.hash_codigo}{self.fecha_hora}{obs_text}"
        hash_md5 = hashlib.md5(data.encode('utf-8')).hexdigest()
        if not hash_md5.startswith("00"):
            return False, "PoW inválido"
        if hash_md5 != self.prueba_trabajo:
            return False, "Hash PoW no coincide"
        
        hash_actual_calc = self._calcular_hash_actual()
        if hash_actual_calc != self.hash_actual:
            return False, "Hash actual no coincide"
        
        return True, "Bloque válido"

    def __str__(self):
        return (f"\n{'='*70}\n"
                f"BLOQUE - Etapa {self.etapa_actual + 1}: {self.ETAPAS[self.etapa_actual]}\n"
                f"{'='*70}\n"
                f"Hash Anterior: {self.hash_anterior[:32]}...\n"
                f"Hash Código: {self.hash_codigo[:32]}...\n"
                f"Fecha/Hora: {self.fecha_hora}\n"
                f"Nonce: {self.nonce}\n"
                f"Prueba Trabajo: {self.prueba_trabajo}\n"
                f"Lista Verificación: {['✓' if x else '✗' for x in self.lista_verificacion]}\n"
                f"Observaciones: {len(self.observaciones)}\n"
                f"Datos Cifrados: {self.datos_cifrados[:32]}... (AES-128)\n"
                f"Hash Actual: {self.hash_actual[:32]}...\n"
                f"{'='*70}")

# ============== CLASE BLOCKCHAIN ==============
class Blockchain:
    """Blockchain completa con RSA-512 y AES."""
    
    def __init__(self, nombre_proyecto, codigo_inicial=None):
        self.nombre_proyecto = nombre_proyecto
        self.cadena = []
        self.notificaciones = []  # ✅ Inicializar ANTES de usar _notificar
        
        print("\n🔐 Generando claves RSA-512 del interventor...")
        self.rsa_interventor = RSA512()
        print(f"   ✓ RSA-512 generado (n = {self.rsa_interventor.n.bit_length()} bits)")
        print(f"\n🔒 Configurando cifrado AES-128")
        print(f"   Códigos grupo: {CODIGOS_GRUPO}")
        print(f"   Polinomio índice: {INDICE_POLINOMIO}")
        print(f"   Clave AES: {bytes(CLAVE_AES).hex()[:32]}...")
        self._crear_bloque_genesis(codigo_inicial)

    def _crear_bloque_genesis(self, codigo_inicial=None):
        """Crea bloque génesis."""
        hash_anterior = "0" * 128
        
        # Usar código del frontend o valor por defecto
        if codigo_inicial is None:
            codigo_inicial = f"// PROYECTO: {self.nombre_proyecto}\n// Código inicial\n"
        
        print(f"\n⏳ Creando bloque génesis...")
        print(f"   📝 Código inicial ({len(codigo_inicial)} caracteres)")
        
        # Lista con la observación inicial
        observaciones_genesis = ["Acta de inicio del contrato. Proyecto aprobado para desarrollo."]
        
        bloque_genesis = Bloque(
            hash_anterior=hash_anterior,
            codigo=codigo_inicial,
            etapa_actual=0,
            observaciones_lista=observaciones_genesis,
            rsa_interventor=self.rsa_interventor
        )
        
        self.cadena.append(bloque_genesis)
        self._notificar(f"Blockchain inicializada: {self.nombre_proyecto}")
        print(f"✓ Blockchain inicializada")
        print(f"✓ Hash código inicial (SHA-256): {bloque_genesis.hash_codigo[:32]}...")
        print(f"✓ Bloque génesis: {bloque_genesis.hash_actual[:32]}...")

    def agregar_etapa(self, codigo, etapa_actual, observaciones_lista):
        """
        Agrega nueva etapa.
        Args:
            codigo: Código del proyecto
            etapa_actual: Número de etapa (0-4)
            observaciones_lista: Lista de strings con las observaciones
        """
        if etapa_actual < 0 or etapa_actual >= len(Bloque.ETAPAS):
            self._notificar(f"ERROR: Etapa {etapa_actual} inválida", tipo="error")
            return None

        if etapa_actual > 0:
            ultimo_bloque = self.cadena[-1]
            if ultimo_bloque.etapa_actual != etapa_actual - 1:
                self._notificar(
                    f"ERROR: Debe completar etapa {ultimo_bloque.etapa_actual + 1} primero",
                    tipo="error"
                )
                return None

        hash_anterior = self.cadena[-1].hash_actual
        
        # Convertir a lista si viene un string
        if isinstance(observaciones_lista, str):
            observaciones_lista = [observaciones_lista]
        
        print(f"\n⏳ Creando bloque etapa {etapa_actual + 1}...")
        print(f"   📝 {len(observaciones_lista)} observaciones a firmar...")
        print(f"   ⛏️ Calculando PoW...")
        
        inicio = time.time()
        
        nuevo_bloque = Bloque(
            hash_anterior=hash_anterior,
            codigo=codigo,
            etapa_actual=etapa_actual,
            observaciones_lista=observaciones_lista,
            rsa_interventor=self.rsa_interventor
        )
        
        tiempo_pow = time.time() - inicio
        print(f"   ✓ PoW calculado en {tiempo_pow:.2f}s (nonce={nuevo_bloque.nonce})")
        print(f"   ✓ {len(nuevo_bloque.observaciones)} observaciones firmadas individualmente")
        print(f"   ✓ Datos cifrados con AES-128")

        valido, mensaje = nuevo_bloque.validar_bloque()
        if not valido:
            self._notificar(f"ERROR: {mensaje}", tipo="error")
            return None

        self.cadena.append(nuevo_bloque)
        self._notificar(
            f"Etapa {etapa_actual + 1} completada: {Bloque.ETAPAS[etapa_actual]}",
            tipo="success"
        )
        print(f"✓ Bloque agregado exitosamente")
        
        return nuevo_bloque

    def validar_cadena(self):
        """Valida toda la cadena."""
        print(f"\n{'='*70}")
        print("VALIDANDO BLOCKCHAIN COMPLETA")
        print(f"{'='*70}")
        
        for i, bloque in enumerate(self.cadena):
            valido, mensaje = bloque.validar_bloque()
            if not valido:
                return False, f"Bloque {i} inválido: {mensaje}"
            
            if i > 0:
                if bloque.hash_anterior != self.cadena[i-1].hash_actual:
                    return False, f"Bloque {i}: hash anterior no coincide"
            
            for j in range(len(bloque.observaciones)):
                if not bloque.verificar_firma(j, self.rsa_interventor):
                    return False, f"Bloque {i}: firma RSA-512 inválida en observación {j}"
            
            print(f"✓ Bloque {i} (Etapa {bloque.etapa_actual + 1}): VÁLIDO")
        
        return True, "Blockchain íntegra y válida"

    def _notificar(self, mensaje, tipo="info"):
        """Registra notificación."""
        notificacion = {
            'timestamp': datetime.now().isoformat(),
            'tipo': tipo,
            'mensaje': mensaje
        }
        self.notificaciones.append(notificacion)

    def mostrar_notificaciones(self):
        """Muestra todas las notificaciones."""
        print(f"\n{'='*70}")
        print("NOTIFICACIONES DEL SISTEMA")
        print(f"{'='*70}")
        iconos = {
            'info': 'ℹ️',
            'success': '✅',
            'warning': '⚠️',
            'error': '❌'
        }
        for notif in self.notificaciones:
            icono = iconos.get(notif['tipo'], 'ℹ️')
            print(f"{icono} [{notif['timestamp']}] {notif['mensaje']}")


# ============== DEMO COMPLETA ==============
def demo_completa():
    """Demostración completa del sistema."""
    print("\n" + "="*70)
    print("SISTEMA BLOCKCHAIN PARA CONTRATOS INTELIGENTES")
    print("- RSA-512 Manual (módulo importado)")
    print("- AES-128 Propietario para Cifrado")
    print("- SHA-256, SHA-512, MD5 para Hashing")
    print("- Prueba de Trabajo (PoW)")
    print("="*70)
    
    bc = Blockchain("Sistema de Gestión ERP Empresarial v3.0")
    
    print("\n" + "-"*70)
    print("REGISTRANDO ETAPAS DEL CONTRATO")
    print("-"*70)
    
    etapas = [
        ("Core_Module_v1.0", 1,
         ["Requerimientos funcionales aprobados. 15 funcionalidades core identificadas."]),
        ("Prototype_Alpha_v0.5", 2,
         ["Primer prototipo presentado y aprobado con observaciones menores."]),
        ("Prototype_Beta_v0.9", 3,
         ["Prototipo final aprobado. Todas las observaciones atendidas."]),
        ("Release_Candidate_v1.0", 4,
         ["Producto aprobado para despliegue. Pasó pruebas de estrés y seguridad."])
    ]
    
    for codigo, etapa, obs in etapas:
        bc.agregar_etapa(codigo, etapa, obs)
        time.sleep(0.3)
    
    print("\n" + "-"*70)
    valida, mensaje = bc.validar_cadena()
    print(f"\nResultado: {mensaje}")
    print("-"*70)
    
    bc.mostrar_notificaciones()
    
    return bc

if __name__ == "__main__":
    if not RSA_DISPONIBLE:
        print("\n❌ ERROR CRÍTICO: No se puede ejecutar sin el módulo RSA-512")
        sys.exit(1)
    
    blockchain = demo_completa()
    
    print("\n" + "="*70)
    print("DEMOSTRACIÓN COMPLETADA")
    print("="*70)

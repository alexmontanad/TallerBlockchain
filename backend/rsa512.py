# -*- coding: utf-8 -*-
"""
Created on Wed Dec 10 16:05:58 2025

@author: Alex
"""

#!/usr/bin/env python3
# -*- coding: utf-8 -*-
"""
Módulo RSA-512 Manual
Implementación completa de RSA con claves de 512 bits
"""

import random


def es_primo(n, k=5):
    """Test de primalidad Miller-Rabin."""
    if n < 2:
        return False
    if n == 2 or n == 3:
        return True
    if n % 2 == 0:
        return False
    
    r, d = 0, n - 1
    while d % 2 == 0:
        r += 1
        d //= 2
    
    for _ in range(k):
        a = random.randrange(2, n - 1)
        x = pow(a, d, n)
        
        if x == 1 or x == n - 1:
            continue
        
        for _ in range(r - 1):
            x = pow(x, 2, n)
            if x == n - 1:
                break
        else:
            return False
    
    return True


def generar_primo(bits):
    """Genera número primo de 'bits' bits."""
    while True:
        n = random.getrandbits(bits)
        n |= (1 << (bits - 1)) | 1
        if es_primo(n):
            return n


def mcd_extendido(a, b):
    """Algoritmo extendido de Euclides."""
    if a == 0:
        return b, 0, 1
    mcd, x1, y1 = mcd_extendido(b % a, a)
    x = y1 - (b // a) * x1
    y = x1
    return mcd, x, y


def inverso_modular(e, phi):
    """Inverso modular de e módulo phi."""
    mcd, x, _ = mcd_extendido(e, phi)
    if mcd != 1:
        raise ValueError("No existe inverso modular")
    return x % phi


class RSA512:
    """RSA-512 manual para firmas digitales."""
    
    def __init__(self):
        """Genera par de claves RSA-512."""
        print("   Generando números primos (p, q)...")
        p = generar_primo(256)
        q = generar_primo(256)
        
        self.n = p * q
        phi = (p - 1) * (q - 1)
        
        self.e = 65537
        self.d = inverso_modular(self.e, phi)
        
        print(f"   Claves generadas: n={self.n.bit_length()} bits")
    
    def firmar(self, mensaje_hash):
        """
        Firma un hash.
        
        Args:
            mensaje_hash: Hash en formato hexadecimal (string)
            
        Returns:
            Firma en formato hexadecimal (string)
        """
        m = int(mensaje_hash, 16)
        if m >= self.n:
            m = m % self.n
        s = pow(m, self.d, self.n)
        return hex(s)[2:]
    
    def verificar(self, mensaje_hash, firma):
        """
        Verifica firma.
        
        Args:
            mensaje_hash: Hash original en formato hexadecimal
            firma: Firma a verificar en formato hexadecimal
            
        Returns:
            True si la firma es válida, False en caso contrario
        """
        try:
            m = int(mensaje_hash, 16)
            s = int(firma, 16)
            
            if m >= self.n:
                m = m % self.n
            
            m_verificado = pow(s, self.e, self.n)
            return m == m_verificado
        except:
            return False
    
    def obtener_clave_publica(self):
        """Retorna la clave pública (e, n)."""
        return (self.e, self.n)
    
    def obtener_info(self):
        """Retorna información sobre las claves."""
        return {
            'bits': self.n.bit_length(),
            'e': self.e,
            'n_hex': hex(self.n)[:32] + "..."
        }


# ============== PRUEBAS ==============

if __name__ == "__main__":
    print("\n" + "="*70)
    print("PRUEBA DEL MÓDULO RSA-512")
    print("="*70)
    
    # Crear instancia RSA
    print("\n🔐 Generando claves RSA-512...")
    rsa = RSA512()
    
    # Mostrar info
    info = rsa.obtener_info()
    print(f"\n✓ Claves generadas:")
    print(f"  - Tamaño: {info['bits']} bits")
    print(f"  - e: {info['e']}")
    print(f"  - n: {info['n_hex']}")
    
    # Probar firma
    print("\n📝 Probando firma digital...")
    mensaje = "Este es un mensaje de prueba"
    
    import hashlib
    hash_msg = hashlib.sha256(mensaje.encode()).hexdigest()
    print(f"  Mensaje: {mensaje}")
    print(f"  Hash: {hash_msg[:32]}...")
    
    # Firmar
    firma = rsa.firmar(hash_msg)
    print(f"  Firma: {firma[:32]}...")
    
    # Verificar
    valida = rsa.verificar(hash_msg, firma)
    print(f"  ✓ Firma válida: {valida}")
    
    # Intentar verificar con hash incorrecto
    hash_falso = hashlib.sha256(b"Mensaje alterado").hexdigest()
    valida_falsa = rsa.verificar(hash_falso, firma)
    print(f"  ✗ Firma con mensaje alterado: {valida_falsa}")
    
    print("\n" + "="*70)
    print("✓ Pruebas completadas exitosamente")
    print("="*70)
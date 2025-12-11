# -*- coding: utf-8 -*-
"""
Created on Tue Nov 25 02:03:30 2025

@author: Alex
"""

"""
Cifrado AES-128 con polinomio estandar y polinomio propietario
"""

# ============== TABLAS CONSTANTES ==============

# S-Box para SubBytes
SBOX = [
    0x63, 0x7c, 0x77, 0x7b, 0xf2, 0x6b, 0x6f, 0xc5, 0x30, 0x01, 0x67, 0x2b, 0xfe, 0xd7, 0xab, 0x76,
    0xca, 0x82, 0xc9, 0x7d, 0xfa, 0x59, 0x47, 0xf0, 0xad, 0xd4, 0xa2, 0xaf, 0x9c, 0xa4, 0x72, 0xc0,
    0xb7, 0xfd, 0x93, 0x26, 0x36, 0x3f, 0xf7, 0xcc, 0x34, 0xa5, 0xe5, 0xf1, 0x71, 0xd8, 0x31, 0x15,
    0x04, 0xc7, 0x23, 0xc3, 0x18, 0x96, 0x05, 0x9a, 0x07, 0x12, 0x80, 0xe2, 0xeb, 0x27, 0xb2, 0x75,
    0x09, 0x83, 0x2c, 0x1a, 0x1b, 0x6e, 0x5a, 0xa0, 0x52, 0x3b, 0xd6, 0xb3, 0x29, 0xe3, 0x2f, 0x84,
    0x53, 0xd1, 0x00, 0xed, 0x20, 0xfc, 0xb1, 0x5b, 0x6a, 0xcb, 0xbe, 0x39, 0x4a, 0x4c, 0x58, 0xcf,
    0xd0, 0xef, 0xaa, 0xfb, 0x43, 0x4d, 0x33, 0x85, 0x45, 0xf9, 0x02, 0x7f, 0x50, 0x3c, 0x9f, 0xa8,
    0x51, 0xa3, 0x40, 0x8f, 0x92, 0x9d, 0x38, 0xf5, 0xbc, 0xb6, 0xda, 0x21, 0x10, 0xff, 0xf3, 0xd2,
    0xcd, 0x0c, 0x13, 0xec, 0x5f, 0x97, 0x44, 0x17, 0xc4, 0xa7, 0x7e, 0x3d, 0x64, 0x5d, 0x19, 0x73,
    0x60, 0x81, 0x4f, 0xdc, 0x22, 0x2a, 0x90, 0x88, 0x46, 0xee, 0xb8, 0x14, 0xde, 0x5e, 0x0b, 0xdb,
    0xe0, 0x32, 0x3a, 0x0a, 0x49, 0x06, 0x24, 0x5c, 0xc2, 0xd3, 0xac, 0x62, 0x91, 0x95, 0xe4, 0x79,
    0xe7, 0xc8, 0x37, 0x6d, 0x8d, 0xd5, 0x4e, 0xa9, 0x6c, 0x56, 0xf4, 0xea, 0x65, 0x7a, 0xae, 0x08,
    0xba, 0x78, 0x25, 0x2e, 0x1c, 0xa6, 0xb4, 0xc6, 0xe8, 0xdd, 0x74, 0x1f, 0x4b, 0xbd, 0x8b, 0x8a,
    0x70, 0x3e, 0xb5, 0x66, 0x48, 0x03, 0xf6, 0x0e, 0x61, 0x35, 0x57, 0xb9, 0x86, 0xc1, 0x1d, 0x9e,
    0xe1, 0xf8, 0x98, 0x11, 0x69, 0xd9, 0x8e, 0x94, 0x9b, 0x1e, 0x87, 0xe9, 0xce, 0x55, 0x28, 0xdf,
    0x8c, 0xa1, 0x89, 0x0d, 0xbf, 0xe6, 0x42, 0x68, 0x41, 0x99, 0x2d, 0x0f, 0xb0, 0x54, 0xbb, 0x16
]

INV_SBOX = [
    0x52, 0x09, 0x6a, 0xd5, 0x30, 0x36, 0xa5, 0x38, 0xbf, 0x40, 0xa3, 0x9e, 0x81, 0xf3, 0xd7, 0xfb,
    0x7c, 0xe3, 0x39, 0x82, 0x9b, 0x2f, 0xff, 0x87, 0x34, 0x8e, 0x43, 0x44, 0xc4, 0xde, 0xe9, 0xcb,
    0x54, 0x7b, 0x94, 0x32, 0xa6, 0xc2, 0x23, 0x3d, 0xee, 0x4c, 0x95, 0x0b, 0x42, 0xfa, 0xc3, 0x4e,
    0x08, 0x2e, 0xa1, 0x66, 0x28, 0xd9, 0x24, 0xb2, 0x76, 0x5b, 0xa2, 0x49, 0x6d, 0x8b, 0xd1, 0x25,
    0x72, 0xf8, 0xf6, 0x64, 0x86, 0x68, 0x98, 0x16, 0xd4, 0xa4, 0x5c, 0xcc, 0x5d, 0x65, 0xb6, 0x92,
    0x6c, 0x70, 0x48, 0x50, 0xfd, 0xed, 0xb9, 0xda, 0x5e, 0x15, 0x46, 0x57, 0xa7, 0x8d, 0x9d, 0x84,
    0x90, 0xd8, 0xab, 0x00, 0x8c, 0xbc, 0xd3, 0x0a, 0xf7, 0xe4, 0x58, 0x05, 0xb8, 0xb3, 0x45, 0x06,
    0xd0, 0x2c, 0x1e, 0x8f, 0xca, 0x3f, 0x0f, 0x02, 0xc1, 0xaf, 0xbd, 0x03, 0x01, 0x13, 0x8a, 0x6b,
    0x3a, 0x91, 0x11, 0x41, 0x4f, 0x67, 0xdc, 0xea, 0x97, 0xf2, 0xcf, 0xce, 0xf0, 0xb4, 0xe6, 0x73,
    0x96, 0xac, 0x74, 0x22, 0xe7, 0xad, 0x35, 0x85, 0xe2, 0xf9, 0x37, 0xe8, 0x1c, 0x75, 0xdf, 0x6e,
    0x47, 0xf1, 0x1a, 0x71, 0x1d, 0x29, 0xc5, 0x89, 0x6f, 0xb7, 0x62, 0x0e, 0xaa, 0x18, 0xbe, 0x1b,
    0xfc, 0x56, 0x3e, 0x4b, 0xc6, 0xd2, 0x79, 0x20, 0x9a, 0xdb, 0xc0, 0xfe, 0x78, 0xcd, 0x5a, 0xf4,
    0x1f, 0xdd, 0xa8, 0x33, 0x88, 0x07, 0xc7, 0x31, 0xb1, 0x12, 0x10, 0x59, 0x27, 0x80, 0xec, 0x5f,
    0x60, 0x51, 0x7f, 0xa9, 0x19, 0xb5, 0x4a, 0x0d, 0x2d, 0xe5, 0x7a, 0x9f, 0x93, 0xc9, 0x9c, 0xef,
    0xa0, 0xe0, 0x3b, 0x4d, 0xae, 0x2a, 0xf5, 0xb0, 0xc8, 0xeb, 0xbb, 0x3c, 0x83, 0x53, 0x99, 0x61,
    0x17, 0x2b, 0x04, 0x7e, 0xba, 0x77, 0xd6, 0x26, 0xe1, 0x69, 0x14, 0x63, 0x55, 0x21, 0x0c, 0x7d
]


# Constantes de ronda
RCON = [0x01, 0x02, 0x04, 0x08, 0x10, 0x20, 0x40, 0x80, 0x1b, 0x36]

# Tabla de 30 polinomios irreducibles en GF(2^8)
POLINOMIOS = [
    0x11b,  # 0: x^8 + x^4 + x^3 + x + 1 (AES estándar)
    0x11d,  # 1: x^8 + x^4 + x^3 + x^2 + 1
    0x12b,  # 2: x^8 + x^5 + x^3 + x + 1
    0x12d,  # 3: x^8 + x^5 + x^3 + x^2 + 1
    0x139,  # 4: x^8 + x^5 + x^4 + x^3 + 1
    0x13f,  # 5: x^8 + x^5 + x^4 + x^3 + x^2 + x + 1
    0x14d,  # 6: x^8 + x^6 + x^3 + x^2 + 1
    0x15f,  # 7: x^8 + x^6 + x^4 + x^3 + x^2 + x + 1
    0x163,  # 8: x^8 + x^6 + x^5 + x + 1
    0x165,  # 9: x^8 + x^6 + x^5 + x^2 + 1
    0x169,  # 10: x^8 + x^6 + x^5 + x^3 + 1
    0x171,  # 11: x^8 + x^6 + x^5 + x^4 + 1
    0x177,  # 12: x^8 + x^6 + x^5 + x^4 + x^2 + x + 1
    0x17b,  # 13: x^8 + x^6 + x^5 + x^4 + x^3 + x + 1
    0x187,  # 14: x^8 + x^7 + x^2 + x + 1
    0x18b,  # 15: x^8 + x^7 + x^3 + x + 1
    0x18d,  # 16: x^8 + x^7 + x^3 + x^2 + 1
    0x19f,  # 17: x^8 + x^7 + x^4 + x^3 + x^2 + x + 1
    0x1a3,  # 18: x^8 + x^7 + x^5 + x + 1
    0x1a9,  # 19: x^8 + x^7 + x^5 + x^3 + 1
    0x1b1,  # 20: x^8 + x^7 + x^5 + x^4 + 1
    0x1bd,  # 21: x^8 + x^7 + x^5 + x^4 + x^3 + x^2 + 1
    0x1c3,  # 22: x^8 + x^7 + x^6 + x + 1
    0x1cf,  # 23: x^8 + x^7 + x^6 + x^3 + x^2 + x + 1
    0x1d7,  # 24: x^8 + x^7 + x^6 + x^4 + x^2 + x + 1
    0x1dd,  # 25: x^8 + x^7 + x^6 + x^4 + x^3 + x^2 + 1
    0x1e7,  # 26: x^8 + x^7 + x^6 + x^5 + x^2 + x + 1
    0x1f3,  # 27: x^8 + x^7 + x^6 + x^5 + x^4 + x + 1
    0x1f5,  # 28: x^8 + x^7 + x^6 + x^5 + x^4 + x^2 + 1
    0x1f9   # 29: x^8 + x^7 + x^6 + x^5 + x^4 + x^3 + 1
]


# ============== CLASE AES-128 ==============

class AES128:
    def __init__(self, polinomio_index=0):
        """
        Inicializa AES-128.
        
        Args:
            polinomio_index: Índice del polinomio (0-29). 0 = AES estándar
        """
        self.polinomio = POLINOMIOS[polinomio_index]
        self.polinomio_index = polinomio_index
    
    # ============== FUNCIONES AUXILIARES ==============
    
    def bytes_to_matrix(self, data):
        """
        Convierte 16 bytes en matriz 4x4.
        """
        matrix = []
        for i in range(4):
            matrix.append([data[i], data[i+4], data[i+8], data[i+12]])
        return matrix
    
    def matrix_to_bytes(self, matrix):
        """
        Convierte matriz 4x4 de vuelta a 16 bytes.
        """
        result = []
        for col in range(4):
            for row in range(4):
                result.append(matrix[row][col])
        return result
    
    def xor_bytes(self, a, b):
        """XOR entre dos listas"""
        return [x ^ y for x, y in zip(a, b)]
    
    # ============== MULTIPLICACIÓN EN GALOIS ==============
    
    def galois_mult(self, a, b):
        """Multiplicación en GF(2^8) con el polinomio seleccionado"""
        p = 0
        for _ in range(8):
            if b & 1:
                p ^= a
            hi_bit_set = a & 0x80
            a <<= 1
            if hi_bit_set:
                a ^= self.polinomio  # Usa el polinomio parametrizable
            b >>= 1
        return p & 0xFF
    
    # ============== 1. SubBytes ==============
    
    def sub_bytes(self, state):
        """Sustituye cada byte usando S-Box"""
        return [[SBOX[byte] for byte in row] for row in state]
    
    # ============== 2. ShiftRows ==============
    
    def shift_rows(self, state):
        """
        Desplaza filas circularmente.
        State está organizado como [fila][columna]
        """
        new_state = [row[:] for row in state]
        # Fila 0: no se desplaza
        # Fila 1: desplazar 1 a la izquierda
        new_state[1] = state[1][1:] + state[1][:1]
        # Fila 2: desplazar 2 a la izquierda  
        new_state[2] = state[2][2:] + state[2][:2]
        # Fila 3: desplazar 3 a la izquierda
        new_state[3] = state[3][3:] + state[3][:3]
        return new_state
    
    # ============== 3. MixColumns ==============
    
    def mix_column(self, col):
        """Mezcla una columna"""
        temp = col.copy()
        col[0] = self.galois_mult(temp[0], 2) ^ self.galois_mult(temp[1], 3) ^ temp[2] ^ temp[3]
        col[1] = temp[0] ^ self.galois_mult(temp[1], 2) ^ self.galois_mult(temp[2], 3) ^ temp[3]
        col[2] = temp[0] ^ temp[1] ^ self.galois_mult(temp[2], 2) ^ self.galois_mult(temp[3], 3)
        col[3] = self.galois_mult(temp[0], 3) ^ temp[1] ^ temp[2] ^ self.galois_mult(temp[3], 2)
        return col
    
    def mix_columns(self, state):
        """
        Aplica mix_column a todas las columnas.
        Trabaja columna por columna (cada columna es [state[0][col], state[1][col], state[2][col], state[3][col]])
        """
        new_state = [row[:] for row in state]
        for col in range(4):
            # Extraer columna
            column = [state[row][col] for row in range(4)]
            # Mezclar columna
            mixed = self.mix_column(column)
            # Colocar de vuelta
            for row in range(4):
                new_state[row][col] = mixed[row]
        return new_state
    
    # ============== 4. AddRoundKey ==============
    
    def add_round_key(self, state, round_key):
        """
        XOR entre estado y clave de ronda.
        round_key está organizado como columnas también
        """
        new_state = [row[:] for row in state]
        for row in range(4):
            for col in range(4):
                new_state[row][col] = state[row][col] ^ round_key[row][col]
        return new_state
    
    # ============== EXPANSIÓN DE CLAVE ==============
    
    def key_expansion(self, key):
        """
        Expande la clave de 128 bits en 11 claves de ronda.
        Cada clave de ronda es una matriz 4x4.
        """
        # Convertir clave en palabras de 4 bytes (trabajamos con palabras lineales)
        key_words = []
        for i in range(4):
            word = [key[4*i], key[4*i+1], key[4*i+2], key[4*i+3]]
            key_words.append(word)
        
        # Expandir a 44 palabras (11 claves × 4 palabras)
        for i in range(4, 44):
            temp = key_words[i - 1][:]
            
            if i % 4 == 0:
                # Rotar palabra
                temp = temp[1:] + temp[:1]
                # Aplicar S-Box
                temp = [SBOX[b] for b in temp]
                # XOR con Rcon
                temp[0] ^= RCON[i // 4 - 1]
            
            # XOR con palabra anterior
            new_word = self.xor_bytes(key_words[i - 4], temp)
            key_words.append(new_word)
        
        # Convertir palabras en matrices 4x4 para cada clave de ronda
        round_keys = []
        for i in range(0, 44, 4):
            # Tomar 4 palabras y convertirlas en matriz 4x4
            matrix = []
            for row in range(4):
                matrix.append([
                    key_words[i][row],
                    key_words[i+1][row],
                    key_words[i+2][row],
                    key_words[i+3][row]
                ])
            round_keys.append(matrix)
        
        return round_keys
    
    
    
    # ============== CIFRADO DE BLOQUE ==============
    
    def encrypt_block(self, plaintext, key):
        """
        Cifra un bloque de 16 bytes.
        
        Args:
            plaintext: Lista de 16 bytes
            key: Lista de 16 bytes
            
        Returns:
            Lista de 16 bytes cifrados
        """
        # Generar claves de ronda
        round_keys = self.key_expansion(key)
        
        # Convertir a matriz
        state = self.bytes_to_matrix(plaintext)
        
        # Ronda inicial
        state = self.add_round_key(state, round_keys[0])
        
        # 9 rondas principales
        for round_num in range(1, 10):
            state = self.sub_bytes(state)
            state = self.shift_rows(state)
            state = self.mix_columns(state)
            state = self.add_round_key(state, round_keys[round_num])
        
        # Ronda final (sin MixColumns)
        state = self.sub_bytes(state)
        state = self.shift_rows(state)
        state = self.add_round_key(state, round_keys[10])
        
        return self.matrix_to_bytes(state)
    
    # ============== RELLENO PKCS#7 ==============
    
    def pkcs7_pad(self, data):
        """Aplica relleno PKCS#7"""
        padding_length = 16 - (len(data) % 16)
        return data + bytes([padding_length] * padding_length)
    
    def pkcs7_unpad(self, data):
        """Remueve relleno PKCS#7"""
        padding_length = data[-1]
        return data[:-padding_length]
    
    # ============== MODO ECB ==============
    
    def encrypt_ecb(self, plaintext, key):
        """
        Cifra en modo ECB.
        
        Args:
            plaintext: bytes o lista de bytes
            key: lista de 16 bytes
            
        Returns:
            bytes cifrados
        """
        # Convertir a bytes si es necesario
        if isinstance(plaintext, list):
            plaintext = bytes(plaintext)
        
        # Aplicar relleno
        padded = self.pkcs7_pad(plaintext)
        
        # Cifrar bloque por bloque
        ciphertext = b''
        for i in range(0, len(padded), 16):
            block = list(padded[i:i+16])
            encrypted = self.encrypt_block(block, key)
            ciphertext += bytes(encrypted)
        
        return ciphertext
    
    def decrypt_ecb(self, ciphertext, key):
        """Descifra en modo ECB."""
        if isinstance(ciphertext, list):
            ciphertext = bytes(ciphertext)
        
        plaintext = b''
        for i in range(0, len(ciphertext), 16):
            block = list(ciphertext[i:i+16])
            decrypted = self.decrypt_block(block, key)
            plaintext += bytes(decrypted)
        
        return self.pkcs7_unpad(plaintext)
    
    def decrypt_block(self, ciphertext, key):
        """Descifra un bloque de 16 bytes."""
        round_keys = self.key_expansion(key)
        state = self.bytes_to_matrix(ciphertext)
        
        state = self.add_round_key(state, round_keys[10])
        
        for round_num in range(9, 0, -1):
            state = self.inv_shift_rows(state)
            state = self.inv_sub_bytes(state)
            state = self.add_round_key(state, round_keys[round_num])
            state = self.inv_mix_columns(state)
        
        state = self.inv_shift_rows(state)
        state = self.inv_sub_bytes(state)
        state = self.add_round_key(state, round_keys[0])
        
        return self.matrix_to_bytes(state)
    
    def inv_sub_bytes(self, state):
        """Sustituye cada byte usando S-Box inversa."""
        return [[INV_SBOX[byte] for byte in row] for row in state]
    
    
    def inv_shift_rows(self, state):
        """Desplaza filas circularmente (operación inversa)."""
        new_state = [row[:] for row in state]
        # Fila 0: no se desplaza
        # Fila 1: desplazar 1 a la derecha
        new_state[1] = state[1][-1:] + state[1][:-1]
        # Fila 2: desplazar 2 a la derecha
        new_state[2] = state[2][-2:] + state[2][:-2]
        # Fila 3: desplazar 3 a la derecha
        new_state[3] = state[3][-3:] + state[3][:-3]
        return new_state
    
    
    def inv_mix_column(self, col):
        """Mezcla inversa de una columna."""
        temp = col.copy()
        col[0] = (self.galois_mult(temp[0], 14) ^ self.galois_mult(temp[1], 11) ^ 
                  self.galois_mult(temp[2], 13) ^ self.galois_mult(temp[3], 9))
        col[1] = (self.galois_mult(temp[0], 9) ^ self.galois_mult(temp[1], 14) ^ 
                  self.galois_mult(temp[2], 11) ^ self.galois_mult(temp[3], 13))
        col[2] = (self.galois_mult(temp[0], 13) ^ self.galois_mult(temp[1], 9) ^ 
                  self.galois_mult(temp[2], 14) ^ self.galois_mult(temp[3], 11))
        col[3] = (self.galois_mult(temp[0], 11) ^ self.galois_mult(temp[1], 13) ^ 
                  self.galois_mult(temp[2], 9) ^ self.galois_mult(temp[3], 14))
        return col
    
    
    def inv_mix_columns(self, state):
        """Aplica inv_mix_column a todas las columnas."""
        new_state = [row[:] for row in state]
        for col in range(4):
            column = [state[row][col] for row in range(4)]
            mixed = self.inv_mix_column(column)
            for row in range(4):
                new_state[row][col] = mixed[row]
        return new_state

# ============== FUNCIONES DE UTILIDAD ==============

def calcular_polinomio(codigos):
    """
    Calcula el índice del polinomio según los códigos.
    
    Args:
        codigos: Lista de códigos de estudiantes
        
    Returns:
        Índice del polinomio (0-29)
    """
    suma = sum(int(str(cod)[-2:]) for cod in codigos)
    indice = suma % 30
    
    if indice == 0:
        indice = max(int(str(cod)[-1]) for cod in codigos)
    
    return indice

def mostrar_polinomio(indice):
    """Imprime el polinomio en hex, binario y algebraico."""
    poli = POLINOMIOS[indice]
    poli_bin = bin(poli)[2:]  # binario limpio sin '0b'

    # Construcción de la expresión algebraica
    terminos = []
    for exp, bit in enumerate(reversed(poli_bin)):
        if bit == "1":
            if exp == 0:
                terminos.append("1")
            elif exp == 1:
                terminos.append("x")
            else:
                terminos.append(f"x^{exp}")
    terminos.reverse()
    poli_alg = " + ".join(terminos)

    print(f"Polinomio (hex): {hex(poli)}")
    print(f"Polinomio (bin): {poli_bin}")
    print(f"Polinomio (alg): {poli_alg}")


# ============== EJEMPLO DE USO ==============

if __name__ == "__main__":
    # Códigos del equipo
    codigos = [20242678042, 20242678015, 20242678026]
    indice = calcular_polinomio(codigos)

    print("\n" + "=" * 70)
    print("CONFIGURACIÓN INICIAL DEL SISTEMA")
    print("=" * 70)
    print(f"Códigos del grupo: {codigos}")
    print(f"Índice del polinomio seleccionado: {indice}")
    
    # Mostrar polinomio con función compacta
    mostrar_polinomio(indice)
    print()

    # Instancias de AES
    aes_std = AES128(0)
    aes_mod = AES128(indice)


    # ===============================
    # PRUEBA 1 — CIFRADO DE MENSAJE
    # ===============================
    print("\n" + "=" * 70)
    print("PRUEBA 1: CIFRADO DE UN MENSAJE HEXADECIMAL")
    print("=" * 70)

    mensaje_hex = "0123456789abcdeffedcba9876543210123450"
    mensaje = bytes.fromhex(mensaje_hex)
    clave = [0x01] * 16

    cif_std = aes_std.encrypt_ecb(mensaje, clave)
    cif_mod = aes_mod.encrypt_ecb(mensaje, clave)

    print(f"Mensaje original (hex): {mensaje_hex}")
    print(f"Clave (hex):            {bytes(clave).hex()}")
    print(f"Cifrado estándar:       {cif_std.hex()}")
    print(f"Cifrado propietario:    {cif_mod.hex()}")
    

    # ===============================
    # PRUEBA 2 — EFECTO AVALANCHA
    # ===============================
    print("\n" + "=" * 70)
    print("PRUEBA 2: EFECTO AVALANCHA")
    print("=" * 70)
    
    # ===============================
    # PRUEBA 2A — AVALANCHA DE MENSAJE
    # ===============================
    print("\n" + "-" * 70)
    print("AVALANCHA DE MENSAJE")
    print("-" * 70)

    mensaje_normal = b"Prueba de efecto avalancha AES-128"
    clave_original = [0x2b, 0x7e, 0x15, 0x16,
                      0x28, 0xae, 0xd2, 0xa6,
                      0xab, 0xf7, 0x15, 0x88,
                      0x09, 0xcf, 0x4f, 0x3c]

    # Cambiar 1 bit del mensaje
    mensaje_modificado = b"Qrueba de efecto avalancha AES-128"


    # Cifrar ambos
    aval_1 = aes_mod.encrypt_ecb(mensaje_normal, clave_original)
    aval_2 = aes_mod.encrypt_ecb(mensaje_modificado, clave_original)

    # Contar bits distintos
    bits_diferentes = sum(bin(a ^ b).count("1") for a, b in zip(aval_1, aval_2))
    total_bits = len(aval_1) * 8

    print(f"Mensaje original:   {mensaje_normal}")
    print(f"Mensaje modificado: {mensaje_modificado}")
    print(f"Cifrado original:   {aval_1.hex()[:64]}...")
    print(f"Cifrado modificado: {aval_2.hex()[:64]}...")
    print(f"Bits diferentes: {bits_diferentes}/{total_bits} "
          f"({(bits_diferentes/total_bits)*100:.2f}%)")
    
    # ===============================
    # PRUEBA 2B — AVALANCHA DE CLAVE
    # ===============================
    print("\n" + "-" * 70)
    print("AVALANCHA DE CLAVE")
    print("-" * 70)

    # Copia y alteración de 1 bit en la clave
    clave_modificada = clave_original.copy()
    clave_modificada[0] ^= 0x01   # Cambia solo 1 bit del primer byte

    # Cifrar con ambas claves
    aval_clave_1 = aes_mod.encrypt_ecb(mensaje_normal, clave_original)
    aval_clave_2 = aes_mod.encrypt_ecb(mensaje_normal, clave_modificada)

    # Contar bits distintos
    bits_dif_clave = sum(bin(a ^ b).count("1") for a, b in zip(aval_clave_1, aval_clave_2))
    total_bits_clave = len(aval_clave_1) * 8

    print(f"Clave original:   {bytes(clave_original).hex()}")
    print(f"Clave modificada: {bytes(clave_modificada).hex()}")
    print(f"Cifrado original:   {aval_clave_1.hex()[:64]}...")
    print(f"Cifrado modificado: {aval_clave_2.hex()[:64]}...")
    print(f"Bits diferentes: {bits_dif_clave}/{total_bits_clave} "
          f"({(bits_dif_clave/total_bits_clave)*100:.2f}%)")


    # ===============================
    # PRUEBA 3 — MENSAJES LARGOS
    # ===============================
    print("\n" + "=" * 70)
    print("PRUEBA 3: CIFRADO DE MENSAJES LARGOS")
    print("=" * 70)

    mensajes = [
        "Este es el primer mensaje de prueba para el cifrador AES-128 propietario.",
        "Segundo mensaje, incluyendo tildes: áéíóú y caracteres como ñ y ¿¡.",
        "Tercer mensaje, un poco más largo para comprobar el manejo de múltiples bloques."
    ]

    for i, txt in enumerate(mensajes, 1):
        print(f"\n--- Mensaje {i} ---")
        msg_bytes = txt.encode("utf-8")

        out_std = aes_std.encrypt_ecb(msg_bytes, clave)
        out_mod = aes_mod.encrypt_ecb(msg_bytes, clave)

        dif = sum(a != b for a, b in zip(out_std, out_mod))
        porcentaje = (dif / len(out_std)) * 100

        print(f"Texto: {txt}")
        print(f"Cifrado estandar:    {out_std.hex()[:64]}...")
        print(f"Cifrado propietario: {out_mod.hex()[:64]}...")
        print(f"Diferencia frente a estándar: {porcentaje:.2f}%")


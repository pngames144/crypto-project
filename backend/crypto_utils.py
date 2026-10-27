import hashlib

# ------------------- LAB 1: CAESAR & PERMUTATION -------------------
def caesar_cipher(text: str, shift: int, decrypt=False) -> str:
    if decrypt:
        shift = -shift
    result = []
    for char in text:
        if char.isalpha():
            base = ord('A') if char.isupper() else ord('a')
            result.append(chr((ord(char) - base + shift) % 26 + base))
        else:
            result.append(char)
    return "".join(result)

def permutation_cipher(text: str, key_indices: list, decrypt=False) -> str:
    block_size = len(key_indices)
    padding = (block_size - len(text) % block_size) % block_size
    text_padded = text + (" " * padding)
    result = []
    
    if decrypt:
        inv_key = [0] * block_size
        for i, k in enumerate(key_indices):
            inv_key[k] = i
        key_indices = inv_key

    for i in range(0, len(text_padded), block_size):
        block = text_padded[i:i+block_size]
        permuted = "".join(block[k] for k in key_indices)
        result.append(permuted)
    
    return "".join(result).rstrip()

# ------------------- LAB 3: S-DES (Variant 4) -------------------
P10 = [2, 4, 1, 6, 3, 9, 0, 8, 7, 5]
P8  = [5, 2, 6, 3, 7, 4, 9, 8]
IP  = [1, 5, 2, 0, 3, 7, 4, 6]
IP_INV = [3, 0, 2, 4, 6, 1, 7, 5]
EP  = [3, 0, 1, 2, 1, 2, 3, 0]
P4  = [1, 3, 2, 0]

S0 = [[1,0,3,2], [3,2,1,0], [0,2,1,3], [3,1,3,2]]
S1 = [[0,1,2,3], [2,0,1,3], [3,0,1,0], [2,1,0,3]]

def permute(bits, table):
    return [bits[i] for i in table]

def left_shift(bits, n):
    return bits[n:] + bits[:n]

def generate_sdes_keys(key_10bit):
    p10 = permute(key_10bit, P10)
    left, right = p10[:5], p10[5:]
    l1, r1 = left_shift(left, 1), left_shift(right, 1)
    k1 = permute(l1 + r1, P8)
    l2, r2 = left_shift(l1, 2), left_shift(r1, 2)
    k2 = permute(l2 + r2, P8)
    return k1, k2

def fk(bits, key):
    left, right = bits[:4], bits[4:]
    ep = permute(right, EP)
    xored = [b ^ k for b, k in zip(ep, key)]
    
    row0 = (xored[0] << 1) | xored[3]
    col0 = (xored[1] << 1) | xored[2]
    s0_val = S0[row0][col0]
    
    row1 = (xored[4] << 1) | xored[7]
    col1 = (xored[5] << 1) | xored[6]
    s1_val = S1[row1][col1]
    
    s_out = [(s0_val >> 1) & 1, s0_val & 1, (s1_val >> 1) & 1, s1_val & 1]
    p4 = permute(s_out, P4)
    return [l ^ p for l, p in zip(left, p4)] + right

def sdes_decrypt_with_steps(ciphertext_8bit, key_10bit):
    k1, k2 = generate_sdes_keys(key_10bit)
    
    step_ip = permute(ciphertext_8bit, IP)
    step_fk1 = fk(step_ip, k2)
    step_sw = step_fk1[4:] + step_fk1[:4]
    step_fk2 = fk(step_sw, k1)
    step_ip_inv = permute(step_fk2, IP_INV)
    
    decimal_val = int("".join(map(str, step_ip_inv)), 2)
    
    return {
        "binary_input": "".join(map(str, ciphertext_8bit)),
        "key": "".join(map(str, key_10bit)),
        "IP": "".join(map(str, step_ip)),
        "FK1": "".join(map(str, step_fk1)),
        "SW": "".join(map(str, step_sw)),
        "FK2": "".join(map(str, step_fk2)),
        "IP_inv": "".join(map(str, step_ip_inv)),
        "decimal_result": decimal_val
    }

# ------------------- LAB 4: DIFFIE-HELLMAN & MitM -------------------
def run_diffie_hellman(p=23, g=5, a_priv=6, b_priv=15, is_mitm=False):
    A_pub = pow(g, a_priv, p)
    B_pub = pow(g, b_priv, p)
    
    if not is_mitm:
        key_A = pow(B_pub, a_priv, p)
        key_B = pow(A_pub, b_priv, p)
        return {
            "is_mitm": False,
            "params": {"p": p, "g": g},
            "Alice": {"priv": a_priv, "pub": A_pub, "shared_key": key_A},
            "Bob": {"priv": b_priv, "pub": B_pub, "shared_key": key_B},
            "status": "Keys negotiated securely! Channel protected."
        }
    else:
        e_priv = 13
        E_pub = pow(g, e_priv, p)
        
        key_A_Eve = pow(E_pub, a_priv, p)
        key_B_Eve = pow(E_pub, b_priv, p)
        key_Eve_Alice = pow(A_pub, e_priv, p)
        key_Eve_Bob = pow(B_pub, e_priv, p)
        
        return {
            "is_mitm": True,
            "params": {"p": p, "g": g},
            "Alice": {"pub_sent": A_pub, "shared_key": key_A_Eve},
            "Bob": {"pub_sent": B_pub, "shared_key": key_B_Eve},
            "Eve": {
                "priv": e_priv, "pub": E_pub,
                "key_with_Alice": key_Eve_Alice,
                "key_with_Bob": key_Eve_Bob
            },
            "status": "WARNING! MitM attack active. Attacker intercepting traffic!"
        }
from flask import Flask, request, jsonify
from flask_cors import CORS
import datetime
import uuid
import random

app = Flask(__name__)
CORS(app)

ADMIN_LOGIN = "admin"
ADMIN_PASSWORD = "admin123"

# Множина для збереження використаних (погашених) токенів
used_tokens = set()

UKR_LOWER = "абвгґдежзиіїйклмнопрстуфхцчшщьюя"
UKR_UPPER = UKR_LOWER.upper()

def caesar_char(char, shift):
    if not char.isalpha():
        return char
    
    if 'a' <= char <= 'z':
        return chr((ord(char) - ord('a') + shift) % 26 + ord('a'))
    elif 'A' <= char <= 'Z':
        return chr((ord(char) - ord('A') + shift) % 26 + ord('A'))
    
    if char in UKR_LOWER:
        idx = UKR_LOWER.find(char)
        return UKR_LOWER[(idx + shift) % len(UKR_LOWER)]
    elif char in UKR_UPPER:
        idx = UKR_UPPER.find(char)
        return UKR_UPPER[(idx + shift) % len(UKR_UPPER)]
        
    return char

@app.route('/login', methods=['POST'])
def login():
    data = request.get_json() or {}
    user_login = data.get('login')
    password = data.get('password')
    
    if user_login == ADMIN_LOGIN and password == ADMIN_PASSWORD:
        unique_session_id = str(uuid.uuid4())
        token = f"eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.{user_login}.{unique_session_id}"
        session_shift = random.randint(1, 32)
        
        return jsonify({
            'token': token, 
            'session_shift': session_shift,
            'message': 'Single-use session token issued'
        }), 200
    else:
        return jsonify({'error': 'Invalid credentials'}), 401

@app.route('/api/cipher/caesar', methods=['POST'])
def caesar_cipher():
    data = request.get_json() or {}
    token = data.get('token')
    text = data.get('text', '')
    shift = int(data.get('shift', 3))

    # ПЕРЕВІРКА ОДНОРАЗОВОСТІ ТОКЕНА
    if not token or token in used_tokens:
        return jsonify({
            'error': 'SECURITY VIOLATION: Token is invalid, expired or already used!',
            'status': 'REJECTED'
        }), 403

    # Маркуємо токен як використаний
    used_tokens.add(token)

    # Шифрування та верифікація
    encrypted_chars = [caesar_char(c, shift) for c in text]
    encrypted_text = "".join(encrypted_chars)

    decrypted_chars = [caesar_char(c, -shift) for c in encrypted_text]
    decrypted_text = "".join(decrypted_chars)

    current_time = datetime.datetime.now().strftime("%Y-%m-%d %H:%M:%S")

    return jsonify({
        'ciphertext': encrypted_text,
        'token_consumed': True, # Токен згорів після передачі
        'gateway_verification': {
            'destination_node': 'GATEWAY_ALPHA (192.168.1.100)',
            'status': 'INTEGRITY_VERIFIED_AND_DECRYPTED',
            'restored_payload': decrypted_text,
            'timestamp': current_time
        }
    })

if __name__ == '__main__':
    app.run(port=5000, debug=True)
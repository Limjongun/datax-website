import base64
from cryptography.hazmat.primitives.ciphers import Cipher, algorithms, modes
from cryptography.hazmat.backends import default_backend
from cryptography.hazmat.primitives import padding

# Must be exactly 32 bytes for AES-256
SHARED_SECRET_KEY = "datax-secret-key-32-bytes-long!!"

def decrypt_password(encrypted_base64: str) -> str:
    """
    Decrypts a base64 encoded AES-encrypted string.
    Matches CryptoJS.AES.encrypt with ECB mode and Pkcs7 padding.
    """
    try:
        key_bytes = SHARED_SECRET_KEY.encode('utf-8')
        data = base64.b64decode(encrypted_base64)
        
        cipher = Cipher(algorithms.AES(key_bytes), modes.ECB(), backend=default_backend())
        decryptor = cipher.decryptor()
        decrypted_padded = decryptor.update(data) + decryptor.finalize()
        
        unpadder = padding.PKCS7(128).unpadder()
        decrypted = unpadder.update(decrypted_padded) + unpadder.finalize()
        return decrypted.decode('utf-8')
    except Exception as e:
        print(f"Decryption error: {e}")
        return ""

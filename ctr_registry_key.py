import json
import typer
import base64
from nacl.signing import SigningKey, VerifyKey
from nacl.encoding import HexEncoder

app = typer.Typer()

@app.command()
def generate_keys(output_prefix: str = "registry"):
    sk = SigningKey.generate()
    vk = sk.verify_key
    with open(f"{output_prefix}_secret.key", "w") as f:
        f.write(sk.encode(encoder=HexEncoder).decode())
    with open(f"{output_prefix}_public.key", "w") as f:
        f.write(vk.encode(encoder=HexEncoder).decode())
    print(f"Generated key pair: {output_prefix}_secret.key / {output_prefix}_public.key")

@app.command()
def sign(file: Path, secret_key_file: Path):
    sk_hex = secret_key_file.read_text().strip()
    sk = SigningKey(sk_hex, encoder=HexEncoder)
    data = file.read_bytes()
    sig = sk.sign(data).signature
    sig_b64 = base64.b64encode(sig).decode()
    print(f"Signature (base64): {sig_b64}")

@app.command()
def verify(file: Path, signature_b64: str, public_key_file: Path):
    vk_hex = public_key_file.read_text().strip()
    vk = VerifyKey(vk_hex, encoder=HexEncoder)
    data = file.read_bytes()
    sig = base64.b64decode(signature_b64)
    try:
        vk.verify(data, sig)
        print("✅ Signature is valid.")
    except Exception as e:
        print("❌ Signature is INVALID.")
        print(str(e))

if __name__ == "__main__":
    app()
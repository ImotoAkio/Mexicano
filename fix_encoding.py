import sys

def fix_utf8_double_encoding(file_path):
    with open(file_path, 'r', encoding='utf-8') as f:
        content = f.read()

    # The string was read as UTF-8, but it was originally utf-8 bytes decoded as latin-1 or cp1252.
    # So we encode to latin-1 and decode as utf-8.
    try:
        fixed = content.encode('latin-1').decode('utf-8')
    except Exception as e:
        print(f"Direct conversion failed: {e}")
        # Try cp1252 if latin-1 fails
        try:
            fixed = content.encode('cp1252').decode('utf-8')
        except Exception as e2:
            print(f"cp1252 also failed: {e2}")
            return
            
    with open(file_path, 'w', encoding='utf-8') as f:
        f.write(fixed)
        
    print("Fixed encoding.")

fix_utf8_double_encoding('src/components/MarinaCaixaView.tsx')

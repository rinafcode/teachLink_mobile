import os
import sys
import subprocess
import tempfile

def get_used_characters(search_dirs):
    # Start with basic printable ASCII characters (space to tilde)
    chars = set(chr(i) for i in range(32, 127))
    
    # Extensions of files to scan
    valid_extensions = {'.ts', '.tsx', '.js', '.jsx', '.json', '.html', '.css'}
    
    print("Scanning source files for used characters...")
    file_count = 0
    for search_dir in search_dirs:
        if not os.path.exists(search_dir):
            continue
        for root, _, files in os.walk(search_dir):
            for file in files:
                _, ext = os.path.splitext(file)
                if ext.lower() in valid_extensions:
                    file_path = os.path.join(root, file)
                    file_count += 1
                    try:
                        with open(file_path, 'r', encoding='utf-8', errors='ignore') as f:
                            content = f.read()
                            chars.update(content)
                    except Exception as e:
                        print(f"Warning: Could not read {file_path}: {e}")
                        
    print(f"Scanned {file_count} files. Found {len(chars)} unique characters.")
    return chars

def subset_font(font_path, output_path, chars_file_path):
    print(f"Subsetting {os.path.basename(font_path)}...")
    
    # Run pyftsubset command
    # We output as the same format (.ttf) but highly compressed
    cmd = [
        "pyftsubset",
        font_path,
        f"--text-file={chars_file_path}",
        f"--output-file={output_path}",
        "--flavor=woff2"  # Let's support woff2 if flavor is desired, or keep as ttf. Since React Native loads .ttf best on some platforms, let's keep it as standard ttf but we can also build both. Wait, react-native-expo loads .ttf / .otf. So keeping as .ttf (without flavor) is best for mobile compatibility.
    ]
    
    # Let's run standard TTF subsetting (without flavor) so output is a standard TTF
    cmd_ttf = [
        "pyftsubset",
        font_path,
        f"--text-file={chars_file_path}",
        f"--output-file={output_path}"
    ]
    
    try:
        # Check if pyftsubset is installed
        result = subprocess.run(cmd_ttf, capture_output=True, text=True, check=True)
        orig_size = os.path.getsize(font_path)
        new_size = os.path.getsize(output_path)
        reduction = (1 - (new_size / orig_size)) * 100
        print(f"Successfully subsetted {os.path.basename(font_path)}:")
        print(f"  Original: {orig_size / 1024:.1f} KB")
        print(f"  Subsetted: {new_size / 1024:.1f} KB ({reduction:.1f}% size reduction)")
        return True
    except FileNotFoundError:
        print("Error: 'pyftsubset' not found. Please install it using 'pip install fonttools'.", file=sys.stderr)
        return False
    except subprocess.CalledProcessError as e:
        print(f"Error executing pyftsubset: {e.stderr}", file=sys.stderr)
        return False

def main():
    project_root = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
    search_dirs = [
        os.path.join(project_root, 'app'),
        os.path.join(project_root, 'src'),
    ]
    
    original_fonts_dir = os.path.join(project_root, 'assets', 'fonts', 'original')
    output_fonts_dir = os.path.join(project_root, 'assets', 'fonts')
    
    if not os.path.exists(original_fonts_dir):
        print(f"Original fonts directory not found: {original_fonts_dir}")
        sys.exit(1)
        
    os.makedirs(output_fonts_dir, exist_ok=True)
    
    # Get all characters
    used_chars = get_used_characters(search_dirs)
    
    # Write to a temporary file
    with tempfile.NamedTemporaryFile(mode='w', encoding='utf-8', delete=False) as temp_file:
        temp_file.write(''.join(sorted(list(used_chars))))
        temp_chars_path = temp_file.name
        
    try:
        success = True
        font_files = [f for f in os.listdir(original_fonts_dir) if f.lower().endswith(('.ttf', '.otf'))]
        
        if not font_files:
            print(f"No font files found in {original_fonts_dir}")
            sys.exit(1)
            
        for font_file in font_files:
            font_path = os.path.join(original_fonts_dir, font_file)
            output_path = os.path.join(output_fonts_dir, font_file)
            if not subset_font(font_path, output_path, temp_chars_path):
                success = False
                
        if not success:
            sys.exit(1)
    finally:
        if os.path.exists(temp_chars_path):
            os.remove(temp_chars_path)

if __name__ == '__main__':
    main()

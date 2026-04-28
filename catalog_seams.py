#!/usr/bin/env python3
"""
SEAMS Project File Cataloger
Run this script in your SEAMS project root directory
It will show all important files and their contents
"""

import os
import sys

def catalog_files(base_path):
    """Catalog all relevant SEAMS files"""
    
    print("=" * 80)
    print("SEAMS PROJECT FILE CATALOG")
    print("=" * 80)
    
    # Define directories to scan
    scan_targets = [
        ("Frontend Components", "frontend/src/components", [".jsx", ".js"]),
        ("Frontend Pages", "frontend/src/pages", [".jsx", ".js"]),
        ("Frontend Utils", "frontend/src/utils", [".js"]),
        ("Backend Views", "backend/estates", ["views.py"]),
        ("Backend Serializers", "backend/estates", ["serializers.py"]),
        ("Backend Models", "backend/estates", ["models.py"]),
        ("User Backend", "backend/users", ["views.py", "serializers.py", "models.py"]),
        ("Maintenance Backend", "backend/maintenance", ["views.py", "serializers.py", "models.py"]),
    ]
    
    all_files = {}
    
    for category, rel_path, extensions in scan_targets:
        full_path = os.path.join(base_path, rel_path)
        
        if not os.path.exists(full_path):
            print(f"\n[!] {category}: Directory not found - {rel_path}")
            continue
            
        print(f"\n{'=' * 80}")
        print(f"[DIR] {category} ({rel_path})")
        print(f"{'=' * 80}")
        
        files_found = []
        
        for root, dirs, files in os.walk(full_path):
            for file in files:
                # Check if file matches our extensions
                if any(file.endswith(ext) if not ext.endswith('.py') else file == ext for ext in extensions):
                    file_path = os.path.join(root, file)
                    rel_file_path = os.path.relpath(file_path, base_path)
                    files_found.append((file, file_path, rel_file_path))
        
        if not files_found:
            print(f"   [!] No files found")
            continue
            
        for filename, full_file_path, rel_file_path in sorted(files_found):
            try:
                with open(full_file_path, 'r', encoding='utf-8') as f:
                    content = f.read()
                    lines = len(content.splitlines())
                    
                print(f"\n[FILE] {filename} ({lines} lines)")
                print(f"   Path: {rel_file_path}")
                print(f"   Size: {len(content)} bytes")
                
                # Store for later display
                all_files[rel_file_path] = {
                    'content': content,
                    'lines': lines,
                    'category': category
                }
                
            except Exception as e:
                print(f"   [ERROR] Error reading: {e}")
                
    print("\n" + "=" * 80)
    print(f"TOTAL FILES CATALOGED: {len(all_files)}")
    print("=" * 80)
    
    # Now display contents
    print("\n\n")
    print("=" * 80)
    print("FILE CONTENTS")
    print("=" * 80)
    
    for file_path, info in sorted(all_files.items()):
        try:
            print(f"\n{'#' * 80}")
            print(f"# FILE: {file_path}")
            print(f"# Category: {info['category']}")
            print(f"# Lines: {info['lines']}")
            print(f"{'#' * 80}\n")
            
            # Use ascii replace to avoid any hidden encoding issues in file contents
            safe_content = info['content'].encode('ascii', 'replace').decode('ascii')
            print(safe_content)
            print("\n")
        except Exception as e:
             print(f"Could not print contents for {file_path} due to encoding error: {e}")

if __name__ == "__main__":
    # Get the base path
    if len(sys.argv) > 1:
        base_path = sys.argv[1]
    else:
        base_path = os.getcwd()
        
    if not os.path.exists(base_path):
        print(f"[ERROR] Path does not exist: {base_path}")
        sys.exit(1)
        
    print(f"Scanning: {base_path}\n")
    catalog_files(base_path)
    
    print("\n[SUCCESS] Cataloging complete!")
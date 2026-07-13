import subprocess
import time
import urllib.request
import urllib.error
import sys

def main():
    project_root = r"c:\Users\SHREE\Desktop\portfolio"
    port = 8000
    
    print(f"Starting server in {project_root} on port {port}...")
    # Start the server process
    server_process = subprocess.Popen(
        [sys.executable, "-m", "http.server", str(port)],
        cwd=project_root,
        stdout=subprocess.PIPE,
        stderr=subprocess.PIPE
    )
    
    # Wait for the server to spin up
    time.sleep(2.0)
    
    try:
        endpoints = [
            ("http://localhost:8000/", "text/html"),
            ("http://localhost:8000/index.html", "text/html"),
            ("http://localhost:8000/blog.html", "text/html"),
            ("http://localhost:8000/components/header.html", "text/html"),
            ("http://localhost:8000/components/footer.html", "text/html"),
            ("http://localhost:8000/tailwind.config.js", "javascript")  # application/javascript or text/javascript
        ]
        
        results = []
        all_passed = True
        
        for url, expected_type in endpoints:
            print(f"Requesting {url}...")
            try:
                # Add headers to avoid potential issues
                req = urllib.request.Request(url, headers={'User-Agent': 'Mozilla/5.0'})
                with urllib.request.urlopen(req, timeout=5) as response:
                    status = response.status
                    content_type = response.info().get_content_type()
                    content = response.read().decode('utf-8')
                    
                    # Verify Status
                    status_ok = (status == 200)
                    
                    # Verify Content Type
                    type_ok = False
                    if expected_type == "text/html":
                        type_ok = content_type.startswith("text/html")
                    elif expected_type == "javascript":
                        type_ok = "javascript" in content_type or "js" in content_type or "plain" in content_type or "octet-stream" in content_type
                    
                    results.append({
                        "url": url,
                        "status": status,
                        "content_type": content_type,
                        "status_ok": status_ok,
                        "type_ok": type_ok
                    })
                    
                    print(f"  Status: {status} (Expected: 200) - {'PASS' if status_ok else 'FAIL'}")
                    print(f"  Content-Type: {content_type} (Expected: {expected_type}) - {'PASS' if type_ok else 'FAIL'}")
                    
                    if not (status_ok and type_ok):
                        all_passed = False
                        
                    # Extra inspection for /
                    if url == "http://localhost:8000/":
                        print("  Inspecting content of root '/'...")
                        
                        # FOUC prevention
                        fouc_found = ("Theme Initialization to prevent FOUC" in content or 
                                      ("localStorage.getItem('theme')" in content and "prefers-color-scheme" in content))
                        print(f"    FOUC prevention script found: {fouc_found}")
                        
                        # Tailwind config ref
                        tailwind_ref_found = ('src="tailwind.config.js"' in content or 'tailwind.config.js' in content)
                        print(f"    Tailwind config reference found: {tailwind_ref_found}")
                        
                        # Empty navbar and footer placeholders
                        navbar_placeholder_found = '<nav id="navbar"' in content and '</nav>' in content
                        footer_placeholder_found = ('<footer' in content and '</footer>' in content and 
                                                    'bg-background' in content and 'border-t' in content)
                        
                        print(f"    Navbar placeholder found: {navbar_placeholder_found}")
                        print(f"    Footer placeholder found: {footer_placeholder_found}")
                        
                        results[-1].update({
                            "fouc_found": fouc_found,
                            "tailwind_ref_found": tailwind_ref_found,
                            "navbar_placeholder_found": navbar_placeholder_found,
                            "footer_placeholder_found": footer_placeholder_found
                        })
                        
                        if not (fouc_found and tailwind_ref_found and navbar_placeholder_found and footer_placeholder_found):
                            all_passed = False
            except Exception as e:
                print(f"  Error accessing {url}: {e}")
                results.append({
                    "url": url,
                    "error": str(e),
                    "status_ok": False,
                    "type_ok": False
                })
                all_passed = False
                
        print("\n--- Summary ---")
        if all_passed:
            print("All checks PASSED successfully.")
        else:
            print("Some checks FAILED.")
            
    finally:
        print("Shutting down the local HTTP server...")
        server_process.terminate()
        try:
            server_process.wait(timeout=5)
            print("Server shut down successfully.")
        except subprocess.TimeoutExpired:
            print("Forcing server shutdown...")
            server_process.kill()
            server_process.wait()
            print("Server killed.")

if __name__ == "__main__":
    main()

"""
ExpenseFlow Frontend Server
Simple HTTP server to serve the frontend files
"""

import http.server
import socketserver
import os
from pathlib import Path

# Change to frontend directory
frontend_dir = Path(__file__).parent / "frontend"
os.chdir(frontend_dir)

PORT = 3000

class MyHTTPRequestHandler(http.server.SimpleHTTPRequestHandler):
    def end_headers(self):
        # Add CORS headers
        self.send_header('Access-Control-Allow-Origin', '*')
        self.send_header('Access-Control-Allow-Methods', 'GET, POST, OPTIONS')
        self.send_header('Access-Control-Allow-Headers', 'Content-Type')
        super().end_headers()
    
    def do_OPTIONS(self):
        self.send_response(200)
        self.end_headers()

print("=" * 60)
print("🎨 Starting ExpenseFlow Frontend Server")
print("=" * 60)
print(f"Port: {PORT}")
print(f"Directory: {frontend_dir}")
print("=" * 60)
print()
print(f"🌐 Frontend: http://localhost:{PORT}/dashboard.html")
print(f"🧪 Test Page: http://localhost:{PORT}/test.html")
print()
print("=" * 60)
print()
print("Press CTRL+C to stop the server")
print()

with socketserver.TCPServer(("", PORT), MyHTTPRequestHandler) as httpd:
    try:
        httpd.serve_forever()
    except KeyboardInterrupt:
        print("\n\n✅ Frontend server stopped")

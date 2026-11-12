"""HTTP smoke check for the deployed same-origin app (no browser required).

Run: python scripts/smoke.py http://localhost:5000
Does not print credentials, tokens or private response bodies.
"""
import hashlib
import re
import sys
import urllib.request
from pathlib import Path

base=(sys.argv[1] if len(sys.argv)>1 else 'http://localhost:5000').rstrip('/')
def fetch(path):
    with urllib.request.urlopen(base+path,timeout=30) as response:
        assert response.status==200
        return response.read()

assert b'"ok"' in fetch('/api/v1/health')
html=fetch('/').decode()
assert '<div id="root">' in html
assert fetch('/demo')==fetch('/')
assets=re.findall(r'(?:src|href)="(/assets/[^\"]+\.js)"',html)
scripts=b'\n'.join(fetch(path) for path in assets).decode()
image=re.search(r'/assets/aha-bulb-original-[A-Za-z0-9_-]+\.png',scripts)
assert image,'Bundled original image URL not found in entry scripts.'
received=fetch(image.group())
original=Path(__file__).resolve().parents[1]/'reference_assets/aha-bulb-original.png'
assert hashlib.sha256(received).digest()==hashlib.sha256(original.read_bytes()).digest()
try:
    fetch('/api/v1/not-a-route')
    raise AssertionError('Unknown API route returned SPA HTML')
except urllib.error.HTTPError as e:
    assert e.code==404 and 'application/json' in e.headers['Content-Type']
print('PASS: health, SPA root/nested route, API 404, bundled original image HTTP 200 and identical SHA-256.')

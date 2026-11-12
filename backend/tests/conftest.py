import os
import sys
from pathlib import Path
import pytest
sys.path.insert(0,str(Path(__file__).resolve().parents[1]))
from app import create_app
from app.models import db
from app.cli import seed

@pytest.fixture()
def app():
    app=create_app({'TESTING':True,'SQLALCHEMY_DATABASE_URI':os.getenv('TEST_DATABASE_URL','sqlite://'),'SECRET_KEY':'test-only-secret-at-least-thirty-two-characters','DEMO_MODE':True,'COOKIE_SECURE':False,'RATELIMIT_ENABLED':False})
    with app.app_context():
        db.create_all()
        seed('test-password-long-123')
    yield app
    with app.app_context():
        db.session.remove(); db.drop_all()

@pytest.fixture()
def client(app):
    return app.test_client()

def sign_in(client,email='teacher@demo.ahabridge.test'):
    csrf=client.get('/api/v1/auth/csrf').json['csrf_token']
    response=client.post('/api/v1/auth/login',json={'email':email,'password':'test-password-long-123'},headers={'X-CSRF-Token':csrf})
    assert response.status_code==200,response.json
    return response.json['user']

def post(client,path,data=None):
    token=client.get_cookie('aha_csrf').value
    return client.post('/api/v1'+path,json=data or {},headers={'X-CSRF-Token':token})

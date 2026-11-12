import os
import uuid
from pathlib import Path
from flask import Flask, g, jsonify, request, send_from_directory
from flask_migrate import Migrate
from flask_limiter import Limiter
from flask_limiter.util import get_remote_address
from pydantic import ValidationError
from sqlalchemy import event, text
from sqlalchemy.engine import Engine
from sqlalchemy.exc import IntegrityError
from werkzeug.exceptions import HTTPException
from .models import db
from .security import APIError, authenticate

limiter = Limiter(key_func=get_remote_address, default_limits=['300 per minute'], storage_uri='memory://')

@event.listens_for(Engine, 'connect')
def sqlite_foreign_keys(connection, _):
    if type(connection).__module__.startswith('sqlite3'):
        connection.execute('PRAGMA foreign_keys=ON')

def create_app(test_config=None):
    from dotenv import load_dotenv
    load_dotenv(Path(__file__).resolve().parents[2] / '.env')
    static = Path(__file__).resolve().parents[2] / 'frontend' / 'dist'
    # Own the static/SPA dispatch below. Flask's automatic catch-all static route
    # would otherwise shadow nested React routes and return a false 404.
    app = Flask(__name__, static_folder=None)
    production = os.getenv('APP_ENV') == 'production'
    uri = os.getenv('DATABASE_URL', 'sqlite:///ahabridge.db')
    if uri.startswith(('postgres://','postgresql://')):
        uri = uri.replace(uri.split('://')[0]+'://', 'postgresql+psycopg://', 1)
    app.config.update(SECRET_KEY=os.getenv('SECRET_KEY', 'local-development-only-change-me'), SQLALCHEMY_DATABASE_URI=uri,
                      SQLALCHEMY_TRACK_MODIFICATIONS=False, MAX_CONTENT_LENGTH=128*1024,
                      COOKIE_SECURE=production, DEMO_MODE=os.getenv('DEMO_MODE','false').lower()=='true',
                      ECHO_HOURS=int(os.getenv('ECHO_HOURS','72')), RATELIMIT_ENABLED=True)
    if test_config:
        app.config.update(test_config)
    if not 48 <= app.config['ECHO_HOURS'] <= 72:
        raise RuntimeError('ECHO_HOURS must be between 48 and 72.')
    if production and (not app.config['SECRET_KEY'] or len(app.config['SECRET_KEY']) < 32 or not uri.startswith('postgresql+psycopg://')):
        raise RuntimeError('Production requires a 32+ character SECRET_KEY and PostgreSQL DATABASE_URL.')
    db.init_app(app)
    Migrate(app, db, directory=str(Path(__file__).resolve().parents[1] / 'migrations'))
    limiter.init_app(app)

    @app.before_request
    def before():
        g.request_id = str(uuid.uuid4())
        authenticate()

    @app.after_request
    def headers(response):
        response.headers['X-Request-ID'] = getattr(g, 'request_id', '')
        response.headers['X-Content-Type-Options'] = 'nosniff'
        response.headers['X-Frame-Options'] = 'DENY'
        response.headers['Referrer-Policy'] = 'strict-origin-when-cross-origin'
        response.headers['Permissions-Policy'] = 'camera=(), microphone=(), geolocation=()'
        response.headers['Content-Security-Policy'] = "default-src 'self'; script-src 'self'; style-src 'self' 'unsafe-inline'; font-src 'self'; img-src 'self' data:; connect-src 'self'; object-src 'none'; base-uri 'self'; frame-ancestors 'none'"
        if app.config['COOKIE_SECURE']:
            response.headers['Strict-Transport-Security'] = 'max-age=31536000; includeSubDomains'
        if request.path.startswith('/api/'):
            response.headers['Cache-Control'] = 'no-store'
        return response

    @app.errorhandler(APIError)
    def api_error(error):
        db.session.rollback()
        return jsonify(error={'code':error.code,'message':error.message,'details':error.details},request_id=g.request_id),error.status

    @app.errorhandler(ValidationError)
    def invalid(error):
        return api_error(APIError('validation','Please check your input.',422,[{'field':'.'.join(str(p) for p in e['loc']),'message':e['msg']} for e in error.errors()]))

    @app.errorhandler(IntegrityError)
    def conflict(_error):
        return api_error(APIError('conflict','A concurrent or duplicate update was detected. Refresh and retry.',409))

    @app.errorhandler(HTTPException)
    def http_error(error):
        return api_error(APIError(error.name.lower().replace(' ','_'),error.description,error.code))

    @app.errorhandler(Exception)
    def internal(error):
        db.session.rollback()
        app.logger.exception('Unhandled request %s', g.request_id)
        return jsonify(error={'code':'internal','message':'Something went wrong. Please try again.','details':None},request_id=g.request_id),500

    from .api import api
    app.register_blueprint(api, url_prefix='/api/v1')
    from .cli import register_cli
    register_cli(app)

    @app.get('/')
    @app.get('/<path:path>')
    def spa(path=''):
        if path.startswith('api/'):
            raise APIError('not_found','API endpoint not found.',404)
        if path and (static / path).is_file():
            return send_from_directory(static, path)
        if path.startswith('assets/') or '.' in path.rsplit('/',1)[-1]:
            raise APIError('not_found','Asset not found.',404)
        if not (static/'index.html').exists():
            return jsonify(message='API running. Start the frontend on port 5173.'),200
        return send_from_directory(static, 'index.html')
    return app

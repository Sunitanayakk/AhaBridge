import hashlib
import hmac
import secrets
from datetime import timedelta
from functools import wraps
from argon2 import PasswordHasher
from argon2.exceptions import VerificationError, InvalidHashError
from flask import current_app, g, request
from .models import db, AuthSession, User, now

passwords = PasswordHasher(time_cost=2, memory_cost=19456, parallelism=1)

def digest(value):
    return hashlib.sha256(value.encode()).hexdigest()

class APIError(Exception):
    def __init__(self, code, message, status=422, details=None):
        self.code, self.message, self.status, self.details = code, message, status, details

def require(*roles):
    def decorate(fn):
        @wraps(fn)
        def wrapper(*a, **kw):
            if not g.user:
                raise APIError('unauthenticated', 'Please sign in to continue.', 401)
            if roles and g.user.role not in roles:
                raise APIError('forbidden', 'This action is not available to your role.', 403)
            return fn(*a, **kw)
        return wrapper
    return decorate

def authenticate():
    g.user = g.auth = None
    token = request.cookies.get('aha_session', '')
    if token:
        session = db.session.scalar(db.select(AuthSession).where(AuthSession.token_hash == digest(token), AuthSession.revoked_at.is_(None), AuthSession.expires_at > now()))
        if session:
            user = db.session.get(User, session.user_id)
            if user and user.active:
                g.user, g.auth = user, session
    if request.method in {'POST', 'PATCH', 'PUT', 'DELETE'} and request.path.startswith('/api/'):
        provided = request.headers.get('X-CSRF-Token', '')
        cookie = request.cookies.get('aha_csrf', '')
        if not provided or not hmac.compare_digest(provided, cookie):
            raise APIError('csrf', 'Refresh your session and try again.', 403)
        if g.auth and not hmac.compare_digest(digest(provided), g.auth.csrf_hash):
            raise APIError('csrf', 'Session security token has changed. Refresh and try again.', 403)
        if not g.auth:
            from itsdangerous import URLSafeTimedSerializer, BadSignature, SignatureExpired
            try:
                URLSafeTimedSerializer(current_app.config['SECRET_KEY'], salt='csrf').loads(provided, max_age=3600)
            except (BadSignature, SignatureExpired):
                raise APIError('csrf', 'Refresh the login page and try again.', 403)

def issue_session(user, response):
    token, csrf = secrets.token_urlsafe(48), secrets.token_urlsafe(32)
    db.session.add(AuthSession(user_id=user.id, token_hash=digest(token), csrf_hash=digest(csrf), expires_at=now()+timedelta(hours=8)))
    secure = current_app.config['COOKIE_SECURE']
    response.set_cookie('aha_session', token, httponly=True, secure=secure, samesite='Lax', max_age=28800)
    response.set_cookie('aha_csrf', csrf, httponly=False, secure=secure, samesite='Lax', max_age=28800)
    db.session.commit()
    return response

def verify_password(encoded, plain):
    try:
        return passwords.verify(encoded, plain)
    except (VerificationError, InvalidHashError):
        return False

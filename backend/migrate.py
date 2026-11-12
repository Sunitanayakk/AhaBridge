"""Single-instance startup migration guarded by a PostgreSQL advisory lock."""
from sqlalchemy import text
from flask_migrate import upgrade
from app import create_app
from app.models import db
app=create_app()
with app.app_context():
    with db.engine.connect() as connection:
        postgres=connection.dialect.name=='postgresql'
        if postgres:
            connection.execute(text('SELECT pg_advisory_lock(104840072)'))
        try:
            upgrade()
        finally:
            if postgres:
                connection.execute(text('SELECT pg_advisory_unlock(104840072)'))

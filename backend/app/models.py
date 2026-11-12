"""Relational classroom records. JSON is reserved for bounded content and rubrics."""
import uuid
from datetime import datetime, timezone
from flask_sqlalchemy import SQLAlchemy
from sqlalchemy import CheckConstraint, UniqueConstraint

db = SQLAlchemy()

def now():
    return datetime.now(timezone.utc).replace(tzinfo=None)

def uid():
    return str(uuid.uuid4())

class Base(db.Model):
    __abstract__ = True
    id = db.Column(db.String(36), primary_key=True, default=uid)
    created_at = db.Column(db.DateTime, default=now, nullable=False)

class Organization(Base):
    __tablename__ = 'organizations'
    name = db.Column(db.String(160), nullable=False)
    synthetic = db.Column(db.Boolean, default=False, nullable=False)

class User(Base):
    __tablename__ = 'users'
    organization_id = db.Column(db.ForeignKey('organizations.id'), nullable=False, index=True)
    role = db.Column(db.String(16), nullable=False)
    display_name = db.Column(db.String(80), nullable=False)
    email = db.Column(db.String(180), unique=True)
    password_hash = db.Column(db.Text, nullable=False)
    language = db.Column(db.String(8), default='en', nullable=False)
    active = db.Column(db.Boolean, default=True, nullable=False)
    __table_args__ = (CheckConstraint("role IN ('teacher','student','admin')"),)

class AuthSession(Base):
    __tablename__ = 'auth_sessions'
    user_id = db.Column(db.ForeignKey('users.id'), nullable=False, index=True)
    token_hash = db.Column(db.String(64), unique=True, nullable=False)
    csrf_hash = db.Column(db.String(64), nullable=False)
    expires_at = db.Column(db.DateTime, nullable=False, index=True)
    revoked_at = db.Column(db.DateTime)

class Classroom(Base):
    __tablename__ = 'classrooms'
    organization_id = db.Column(db.ForeignKey('organizations.id'), nullable=False, index=True)
    teacher_id = db.Column(db.ForeignKey('users.id'), nullable=False, index=True)
    title = db.Column(db.String(160), nullable=False)
    grade_band = db.Column(db.String(40), nullable=False)
    subject = db.Column(db.String(80), nullable=False)
    join_code_hash = db.Column(db.String(64), unique=True, nullable=False)
    archived_at = db.Column(db.DateTime)

class Enrollment(Base):
    __tablename__ = 'class_enrollments'
    classroom_id = db.Column(db.ForeignKey('classrooms.id'), nullable=False, index=True)
    student_id = db.Column(db.ForeignKey('users.id'), nullable=False, index=True)
    __table_args__ = (UniqueConstraint('classroom_id', 'student_id'),)

class Concept(Base):
    __tablename__ = 'concepts'
    organization_id = db.Column(db.ForeignKey('organizations.id'), index=True)
    slug = db.Column(db.String(80), nullable=False)
    name = db.Column(db.String(120), nullable=False)
    description = db.Column(db.Text, nullable=False)
    subject = db.Column(db.String(80), default='Math', nullable=False)
    grade_band = db.Column(db.String(40), default='7–8', nullable=False)
    importance = db.Column(db.Float, default=0.5, nullable=False)
    created_by = db.Column(db.ForeignKey('users.id'))
    __table_args__ = (UniqueConstraint('organization_id', 'slug'), CheckConstraint('importance >= 0 AND importance <= 1'))

class Prerequisite(Base):
    __tablename__ = 'concept_prerequisites'
    concept_id = db.Column(db.ForeignKey('concepts.id'), nullable=False)
    prerequisite_concept_id = db.Column(db.ForeignKey('concepts.id'), nullable=False)
    __table_args__ = (UniqueConstraint('concept_id','prerequisite_concept_id'), CheckConstraint('concept_id != prerequisite_concept_id'))

class Misconception(Base):
    __tablename__ = 'misconceptions'
    concept_id = db.Column(db.ForeignKey('concepts.id'), nullable=False, index=True)
    code = db.Column(db.String(80), nullable=False)
    description = db.Column(db.Text, nullable=False)
    hint = db.Column(db.Text, nullable=False)
    teacher_reviewed = db.Column(db.Boolean, default=False, nullable=False)

class Question(Base):
    __tablename__ = 'questions'
    concept_id = db.Column(db.ForeignKey('concepts.id'), nullable=False, index=True)
    stem = db.Column(db.Text, nullable=False)
    language = db.Column(db.String(8), default='en', nullable=False)
    version = db.Column(db.Integer, default=1, nullable=False)
    source_type = db.Column(db.String(16), default='diagnostic', nullable=False)
    approved = db.Column(db.Boolean, default=False, nullable=False)
    created_by = db.Column(db.ForeignKey('users.id'))
    options = db.relationship('AnswerOption', lazy='selectin', cascade='all, delete-orphan')

class AnswerOption(Base):
    __tablename__ = 'answer_options'
    question_id = db.Column(db.ForeignKey('questions.id'), nullable=False, index=True)
    label = db.Column(db.String(4), nullable=False)
    text = db.Column(db.String(500), nullable=False)
    is_correct = db.Column(db.Boolean, nullable=False)
    misconception_id = db.Column(db.ForeignKey('misconceptions.id'))
    __table_args__ = (UniqueConstraint('question_id','label'),)

class Diagnostic(Base):
    __tablename__ = 'diagnostic_sets'
    classroom_id = db.Column(db.ForeignKey('classrooms.id'), nullable=False, index=True)
    title = db.Column(db.String(160), nullable=False)
    status = db.Column(db.String(16), default='draft', nullable=False)
    published_at = db.Column(db.DateTime)

class DiagnosticItem(Base):
    __tablename__ = 'diagnostic_set_items'
    set_id = db.Column(db.ForeignKey('diagnostic_sets.id'), nullable=False, index=True)
    question_id = db.Column(db.ForeignKey('questions.id'), nullable=False)
    position = db.Column(db.Integer, nullable=False)
    __table_args__ = (UniqueConstraint('set_id','question_id'), UniqueConstraint('set_id','position'))

class Attempt(Base):
    __tablename__ = 'diagnostic_attempts'
    assignment_id = db.Column(db.ForeignKey('diagnostic_sets.id'), nullable=False, index=True)
    student_id = db.Column(db.ForeignKey('users.id'), nullable=False, index=True)
    completed_at = db.Column(db.DateTime)
    __table_args__ = (UniqueConstraint('assignment_id','student_id'),)

class Response(Base):
    __tablename__ = 'diagnostic_responses'
    attempt_id = db.Column(db.ForeignKey('diagnostic_attempts.id'), nullable=False, index=True)
    question_id = db.Column(db.ForeignKey('questions.id'), nullable=False)
    answer_option_id = db.Column(db.ForeignKey('answer_options.id'), nullable=False)
    sure = db.Column(db.Boolean, nullable=False)
    __table_args__ = (UniqueConstraint('attempt_id','question_id'),)

class Bridge(Base):
    __tablename__ = 'bridge_activities'
    concept_id = db.Column(db.ForeignKey('concepts.id'), nullable=False, index=True)
    misconception_id = db.Column(db.ForeignKey('misconceptions.id'))
    title = db.Column(db.String(160), nullable=False)
    language = db.Column(db.String(8), default='en', nullable=False)
    mode = db.Column(db.String(16), nullable=False)
    minutes = db.Column(db.Integer, nullable=False)
    materials = db.Column(db.JSON, nullable=False)
    steps = db.Column(db.JSON, nullable=False)
    success_criteria = db.Column(db.JSON, nullable=False)
    approved_by = db.Column(db.ForeignKey('users.id'))
    version = db.Column(db.Integer, default=1, nullable=False)

class BridgeAssignment(Base):
    __tablename__ = 'bridge_assignments'
    teacher_id = db.Column(db.ForeignKey('users.id'), nullable=False)
    student_id = db.Column(db.ForeignKey('users.id'), nullable=False, index=True)
    classroom_id = db.Column(db.ForeignKey('classrooms.id'), nullable=False, index=True)
    bridge_activity_id = db.Column(db.ForeignKey('bridge_activities.id'), nullable=False)
    trigger_attempt_id = db.Column(db.ForeignKey('diagnostic_attempts.id'))
    status = db.Column(db.String(24), default='assigned', nullable=False)
    completed_at = db.Column(db.DateTime)
    echo_due_at = db.Column(db.DateTime)

class Teachback(Base):
    __tablename__ = 'teachbacks'
    bridge_assignment_id = db.Column(db.ForeignKey('bridge_assignments.id'), unique=True, nullable=False)
    text_body = db.Column(db.Text, nullable=False)
    drawing = db.Column(db.JSON)
    review_state = db.Column(db.String(24), default='pending', nullable=False)
    reviewed_by = db.Column(db.ForeignKey('users.id'))
    rubric = db.Column(db.JSON)
    feedback = db.Column(db.Text)
    reviewed_at = db.Column(db.DateTime)

class EchoCheck(Base):
    __tablename__ = 'echo_checks'
    bridge_assignment_id = db.Column(db.ForeignKey('bridge_assignments.id'), unique=True, nullable=False)
    question_id = db.Column(db.ForeignKey('questions.id'), nullable=False)
    due_at = db.Column(db.DateTime, nullable=False, index=True)
    answered_at = db.Column(db.DateTime)
    selected_option_id = db.Column(db.ForeignKey('answer_options.id'))
    correct = db.Column(db.Boolean)

class PrintEntry(Base):
    __tablename__ = 'print_entries'
    classroom_id = db.Column(db.ForeignKey('classrooms.id'), nullable=False)
    teacher_id = db.Column(db.ForeignKey('users.id'), nullable=False)
    response_data = db.Column(db.JSON, nullable=False)
    source_label = db.Column(db.String(120), nullable=False)

class SyncReceipt(Base):
    __tablename__ = 'sync_receipts'
    user_id = db.Column(db.ForeignKey('users.id'), nullable=False)
    client_mutation_id = db.Column(db.String(80), nullable=False)
    payload_hash = db.Column(db.String(64), nullable=False)
    response_json = db.Column(db.JSON, nullable=False)
    __table_args__ = (UniqueConstraint('user_id','client_mutation_id'),)

class AuditLog(Base):
    __tablename__ = 'audit_logs'
    actor_id = db.Column(db.ForeignKey('users.id'), nullable=False)
    action = db.Column(db.String(80), nullable=False)
    target_type = db.Column(db.String(60), nullable=False)
    target_id = db.Column(db.String(36))
    metadata_json = db.Column(db.JSON, default=dict, nullable=False)

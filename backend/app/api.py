import hashlib
import hmac
import json
import secrets
from datetime import timedelta
from flask import Blueprint, current_app, g, jsonify, request
from itsdangerous import URLSafeTimedSerializer
from pydantic import ValidationError
from sqlalchemy.exc import IntegrityError
from . import limiter
from .models import *
from .schemas import *
from .security import APIError, digest, issue_session, passwords, require, verify_password
from .services import *

api = Blueprint('v1', __name__)

def body(schema, data=None):
    payload=request.get_json() if data is None else data
    if not isinstance(payload,dict):
        raise APIError('validation','A JSON object is required.')
    return schema.model_validate(payload)

def save(row, status=200):
    db.session.commit()
    return jsonify(id=row.id), status

def user_json(user):
    return serial(user,'display_name','email','role','organization_id','language')

@api.get('/health')
@limiter.exempt
def health():
    db.session.execute(db.text('SELECT 1'))
    return jsonify(status='ok')

@api.get('/auth/csrf')
def csrf():
    if g.auth:
        value=request.cookies.get('aha_csrf','')
        if not value or not hmac.compare_digest(digest(value),g.auth.csrf_hash):
            value=secrets.token_urlsafe(32)
            g.auth.csrf_hash=digest(value)
            db.session.commit()
    else:
        value=URLSafeTimedSerializer(current_app.config['SECRET_KEY'],salt='csrf').dumps(secrets.token_hex(24))
    response=jsonify(csrf_token=value)
    response.set_cookie('aha_csrf',value,secure=current_app.config['COOKIE_SECURE'],httponly=False,samesite='Lax',max_age=28800 if g.auth else 3600)
    return response

@api.post('/auth/login')
@limiter.limit('10 per minute')
def login():
    data=body(Login)
    user=db.session.scalar(db.select(User).where(User.email==data.email.lower()))
    if not user or not user.active or not verify_password(user.password_hash,data.password):
        if not user:
            passwords.hash(data.password)  # comparable work for unknown identifiers
        raise APIError('invalid_credentials','The sign-in details do not match.',401)
    if g.auth:
        g.auth.revoked_at=now()
    return issue_session(user,jsonify(user=user_json(user)))

@api.get('/auth/me')
@require()
def me():
    return jsonify(user=user_json(g.user),demo_mode=current_app.config['DEMO_MODE'])

@api.post('/auth/logout')
@require()
def logout():
    g.auth.revoked_at=now()
    db.session.commit()
    response=jsonify(ok=True)
    response.delete_cookie('aha_session',secure=current_app.config['COOKIE_SECURE'],samesite='Lax')
    response.delete_cookie('aha_csrf',secure=current_app.config['COOKIE_SECURE'],samesite='Lax')
    return response

@api.route('/teacher/classes', methods=['GET','POST'])
@require('teacher')
def classes():
    if request.method=='GET':
        return jsonify(items=[serial(c,'title','grade_band','subject','archived_at') for c in db.session.scalars(db.select(Classroom).filter_by(teacher_id=g.user.id,organization_id=g.user.organization_id).order_by(Classroom.created_at))])
    data=body(ClassInput)
    code=secrets.token_urlsafe(9)
    c=Classroom(**data.model_dump(),teacher_id=g.user.id,organization_id=g.user.organization_id,join_code_hash=digest(code))
    db.session.add(c); db.session.flush(); audit('class_created',c); db.session.commit()
    return jsonify(**serial(c,'title','grade_band','subject'),join_code=code),201

@api.route('/teacher/classes/<id>', methods=['GET','PATCH'])
@require('teacher')
def class_detail(id):
    c=classroom(id)
    if request.method=='PATCH':
        data=body(ClassInput)
        for k,v in data.model_dump().items(): setattr(c,k,v)
        audit('class_updated',c); db.session.commit()
    students=list(db.session.scalars(db.select(User).join(Enrollment,Enrollment.student_id==User.id).where(Enrollment.classroom_id==id).order_by(User.display_name)))
    return jsonify(**serial(c,'title','grade_band','subject'),students=[serial(s,'display_name') for s in students])

@api.post('/teacher/classes/<id>/join-code')
@require('teacher')
def rotate_code(id):
    c=classroom(id); code=secrets.token_urlsafe(9); c.join_code_hash=digest(code)
    audit('join_code_rotated',c); db.session.commit()
    return jsonify(join_code=code)

@api.post('/teacher/students')
@require('teacher')
def provision_student():
    data=body(ProvisionInput); c=classroom(data.classroom_id)
    if db.session.scalar(db.select(User).filter_by(email=data.email.lower())):
        raise APIError('conflict','That sign-in identifier already exists.',409)
    u=User(organization_id=c.organization_id,role='student',display_name=data.display_name,email=data.email.lower(),password_hash=passwords.hash(data.password))
    db.session.add(u); db.session.flush(); db.session.add(Enrollment(classroom_id=c.id,student_id=u.id)); audit('student_provisioned',u)
    return save(u,201)

@api.post('/join/<code>')
@require('student')
@limiter.limit('10 per minute')
def join(code):
    c=db.session.scalar(db.select(Classroom).filter_by(join_code_hash=digest(code),organization_id=g.user.organization_id,archived_at=None))
    if not c: raise APIError('not_found','This class code is not available.',404)
    row=db.session.scalar(db.select(Enrollment).filter_by(classroom_id=c.id,student_id=g.user.id))
    if not row: db.session.add(Enrollment(classroom_id=c.id,student_id=g.user.id))
    db.session.commit(); return jsonify(id=c.id,title=c.title)

@api.route('/concepts',methods=['GET','POST'])
@require('student','teacher')
def concepts():
    if request.method=='GET':
        return jsonify(items=[serial(c,'name','slug','description','importance') for c in db.session.scalars(db.select(Concept).where((Concept.organization_id==g.user.organization_id)|(Concept.organization_id.is_(None))).order_by(Concept.name))])
    if g.user.role!='teacher': raise APIError('forbidden','Teacher access required.',403)
    data=body(ConceptInput)
    if db.session.scalar(db.select(Concept).filter_by(slug=data.slug,organization_id=g.user.organization_id)):
        raise APIError('conflict','Concept slug already exists.',409)
    for id in data.prerequisites: concept(id)
    c=Concept(**data.model_dump(exclude={'prerequisites'}),organization_id=g.user.organization_id,created_by=g.user.id)
    db.session.add(c); db.session.flush()
    # New nodes can depend only on existing nodes, so a cycle cannot form.
    for id in set(data.prerequisites): db.session.add(Prerequisite(concept_id=c.id,prerequisite_concept_id=id))
    audit('concept_created',c); return save(c,201)

@api.get('/concepts/<id>/graph')
@require('student','teacher')
def graph(id):
    c=concept(id)
    return jsonify(**serial(c,'name','description','importance'),prerequisites=[p.prerequisite_concept_id for p in db.session.scalars(db.select(Prerequisite).filter_by(concept_id=id))])

@api.route('/concepts/<id>/misconceptions',methods=['GET','POST'])
@require('teacher')
def misconceptions(id):
    concept(id,write=request.method=='POST')
    if request.method=='GET':
        return jsonify(items=[serial(m,'code','description','hint','teacher_reviewed') for m in db.session.scalars(db.select(Misconception).filter_by(concept_id=id))])
    data=body(MisconceptionInput); m=Misconception(**data.model_dump(),concept_id=id); db.session.add(m); return save(m,201)

@api.route('/questions',methods=['GET','POST'])
@require('teacher')
def questions():
    if request.method=='GET':
        query=db.select(Question).join(Concept,Concept.id==Question.concept_id).where((Concept.organization_id==g.user.organization_id)|(Concept.organization_id.is_(None))).order_by(Question.created_at)
        return jsonify(items=[question_json(q,True) for q in db.session.scalars(query).all()][:200])
    data=body(QuestionInput); concept(data.concept_id,write=True)
    if sum(o.is_correct for o in data.options)!=1 or len({o.label for o in data.options})!=len(data.options):
        raise APIError('validation','Use unique labels and exactly one correct option.')
    for o in data.options:
        if o.misconception_id:
            m=get(Misconception,o.misconception_id)
            if m.concept_id!=data.concept_id or o.is_correct: raise APIError('validation','Misconception tags belong to wrong options for this concept.')
    q=Question(**data.model_dump(exclude={'options'}),approved=True,created_by=g.user.id)
    q.options=[AnswerOption(**o.model_dump()) for o in data.options]
    db.session.add(q); db.session.flush(); audit('question_created',q); return save(q,201)

@api.route('/questions/<id>',methods=['GET','PATCH'])
@require('teacher')
def question_detail(id):
    q=get(Question,id); concept(q.concept_id)
    if request.method=='PATCH':
        raise APIError('immutable','Published question versions are immutable. Create a new question version.',409)
    return jsonify(question_json(q,True))

@api.route('/diagnostics',methods=['GET','POST'])
@require('teacher','student')
def diagnostics():
    if request.method=='POST':
        if g.user.role!='teacher': raise APIError('forbidden','Teacher access required.',403)
        data=body(DiagnosticInput); classroom(data.classroom_id)
        if len(set(data.question_ids))!=len(data.question_ids): raise APIError('validation','Use distinct questions.')
        for id in data.question_ids:
            q=get(Question,id); concept(q.concept_id)
            if not q.approved or q.source_type!='diagnostic': raise APIError('validation','Choose approved diagnostic questions only.')
        d=Diagnostic(classroom_id=data.classroom_id,title=data.title); db.session.add(d); db.session.flush()
        for i,id in enumerate(data.question_ids): db.session.add(DiagnosticItem(set_id=d.id,question_id=id,position=i))
        return save(d,201)
    if g.user.role=='teacher':
        query=db.select(Diagnostic).join(Classroom,Classroom.id==Diagnostic.classroom_id).where(Classroom.teacher_id==g.user.id,Classroom.organization_id==g.user.organization_id)
    else:
        query=db.select(Diagnostic).join(Enrollment,Enrollment.classroom_id==Diagnostic.classroom_id).where(Enrollment.student_id==g.user.id,Diagnostic.status=='published')
    items=[]
    for d in db.session.scalars(query.order_by(Diagnostic.created_at)):
        out=serial(d,'classroom_id','title','status','published_at')
        a=db.session.scalar(db.select(Attempt).filter_by(assignment_id=d.id,student_id=g.user.id))
        out.update(question_count=len(diagnostic_questions(d.id)),attempt_id=a.id if a else None,completed=bool(a and a.completed_at))
        items.append(out)
    return jsonify(items=items)

@api.post('/diagnostics/<id>/publish')
@require('teacher')
def publish(id):
    d=get(Diagnostic,id); classroom(d.classroom_id)
    if len(diagnostic_questions(id))<2: raise APIError('validation','At least two questions are needed.')
    d.status='published'; d.published_at=now(); audit('diagnostic_published',d); return save(d)

@api.get('/diagnostics/<id>')
@require('teacher','student')
def diagnostic(id):
    d=get(Diagnostic,id); classroom(d.classroom_id,student=True)
    if g.user.role=='student' and d.status!='published': raise APIError('not_found','Diagnostic not available.',404)
    return jsonify(**serial(d,'title','classroom_id','status'),questions=[question_json(q,g.user.role=='teacher') for q in diagnostic_questions(id)])

@api.post('/student/diagnostics/<id>/start')
@require('student')
def start(id):
    d=get(Diagnostic,id); classroom(d.classroom_id,student=True)
    if d.status!='published': raise APIError('conflict','Diagnostic is not published.',409)
    a=db.session.scalar(db.select(Attempt).filter_by(assignment_id=id,student_id=g.user.id))
    if not a:
        a=Attempt(assignment_id=id,student_id=g.user.id); db.session.add(a); db.session.commit()
    return jsonify(id=a.id,completed=bool(a.completed_at),answered_question_ids=list(db.session.scalars(db.select(Response.question_id).filter_by(attempt_id=a.id))))

def answer_attempt(id,data):
    a=own_attempt(id)
    if a.completed_at: raise APIError('conflict','This exercise is already submitted.',409)
    if not db.session.scalar(db.select(DiagnosticItem).filter_by(set_id=a.assignment_id,question_id=data.question_id)):
        raise APIError('validation','Question does not belong to this exercise.')
    option=get(AnswerOption,data.answer_option_id)
    if option.question_id!=data.question_id: raise APIError('validation','Option does not belong to this question.')
    existing=db.session.scalar(db.select(Response).filter_by(attempt_id=id,question_id=data.question_id))
    if existing:
        if existing.answer_option_id==data.answer_option_id and existing.sure==data.sure: return {'saved':True}
        raise APIError('conflict','An answer is already recorded for this question.',409)
    db.session.add(Response(attempt_id=id,**data.model_dump()))
    return {'saved':True}

@api.post('/student/diagnostics/<id>/answer')
@require('student')
def answer(id):
    result=answer_attempt(id,body(AnswerInput)); db.session.commit(); return jsonify(result)

def finish_attempt(id):
    a=own_attempt(id)
    n=db.session.scalar(db.select(db.func.count(Response.id)).filter_by(attempt_id=id))
    if n!=len(diagnostic_questions(a.assignment_id)): raise APIError('incomplete','Answer every question before submitting.',409)
    if not a.completed_at: a.completed_at=now()
    return {'id':a.id,'completed':True}

@api.post('/student/diagnostics/<id>/finish')
@require('student')
def finish(id):
    result=finish_attempt(id); db.session.commit(); return jsonify(result)

@api.get('/student/diagnostics/<id>/result')
@require('student')
def result(id):
    a=own_attempt(id)
    if not a.completed_at: raise APIError('conflict','Submit the exercise to see feedback.',409)
    result=[]
    for r in db.session.scalars(db.select(Response).filter_by(attempt_id=id)):
        q=get(Question,r.question_id); o=get(AnswerOption,r.answer_option_id)
        m=get(Misconception,o.misconception_id) if o.misconception_id else None
        result.append(dict(question_id=q.id,stem=q.stem,selected_option=o.label,selected_text=o.text,correct=o.is_correct,sure=r.sure,possible_misconception=m.description if m else None,teacher_reviewed=m.teacher_reviewed if m else None,feedback='You found a useful connection.' if o.is_correct else ('Let’s test this idea with a concrete example.' if r.sure else 'A small foundation activity could help.')))
    return jsonify(items=result,n=len(result),correct=sum(r['correct'] for r in result))

@api.get('/teacher/classes/<id>/atlas')
@require('teacher')
def class_atlas(id):
    classroom(id)
    try:
        a=float(request.args.get('accuracy_cutoff','.65')); c=float(request.args.get('confidence_cutoff','.4'))
    except ValueError: raise APIError('validation','Thresholds must be numeric.')
    if not 0<=a<=1 or not 0<=c<=1: raise APIError('validation','Thresholds must be between zero and one.')
    return jsonify(items=atlas(id,a,c),thresholds={'accuracy':a,'confidence_mismatch':c},method='Editable heuristic defaults, not validated psychometrics.')

@api.get('/teacher/classes/<id>/priority')
@require('teacher')
def priority(id):
    classroom(id); nodes=atlas(id)
    return jsonify(items=sorted([n for n in nodes if n['priority'] is not None],key=lambda n:n['priority'],reverse=True),collect_evidence=[n for n in nodes if n['priority'] is None])

@api.get('/teacher/classes/<id>/insights')
@require('teacher')
def class_insights(id):
    classroom(id); return jsonify(insights(id))

@api.route('/bridges',methods=['GET','POST'])
@require('teacher')
def bridges():
    if request.method=='GET':
        query=db.select(Bridge).join(Concept,Concept.id==Bridge.concept_id).where((Concept.organization_id==g.user.organization_id)|(Concept.organization_id.is_(None)))
        return jsonify(items=[bridge_json(b) for b in db.session.scalars(query).all()][:200])
    data=body(BridgeInput); concept(data.concept_id,write=True)
    if any(len(s)>1200 for s in data.materials+data.steps+data.success_criteria): raise APIError('validation','Activity fields are too long.')
    if data.misconception_id and get(Misconception,data.misconception_id).concept_id!=data.concept_id: raise APIError('validation','Misconception belongs to another concept.')
    b=Bridge(**data.model_dump()); db.session.add(b); return save(b,201)

@api.post('/bridges/<id>/approve')
@require('teacher')
def approve_bridge(id):
    b=get(Bridge,id); concept(b.concept_id,write=True); b.approved_by=g.user.id; audit('bridge_approved',b); return save(b)

@api.post('/teacher/bridge-assignments')
@require('teacher')
def assign_bridge():
    data=body(AssignInput); c=classroom(data.classroom_id); b=get(Bridge,data.bridge_activity_id); concept(b.concept_id)
    if not b.approved_by: raise APIError('approval_required','Approve this activity before assigning.',409)
    if not db.session.scalar(db.select(Enrollment).filter_by(classroom_id=c.id,student_id=data.student_id)): raise APIError('validation','Student is not in this classroom.')
    if data.trigger_attempt_id:
        a=get(Attempt,data.trigger_attempt_id)
        if a.student_id!=data.student_id or get(Diagnostic,a.assignment_id).classroom_id!=c.id: raise APIError('validation','Trigger attempt does not match the learner and classroom.')
    row=BridgeAssignment(**data.model_dump(exclude={'override_reason'}),teacher_id=g.user.id)
    db.session.add(row); db.session.flush(); audit('bridge_assigned',row,{'override_reason':data.override_reason})
    return save(row,201)

@api.get('/student/bridge-assignments')
@require('student')
def student_bridges():
    return jsonify(items=[assignment_json(a) for a in db.session.scalars(db.select(BridgeAssignment).filter_by(student_id=g.user.id).order_by(BridgeAssignment.created_at.desc()))])

def complete_bridge(id):
    a=own_assignment(id)
    if a.completed_at: return {'id':a.id,'due_at':a.echo_due_at.isoformat()+'Z'}
    b=get(Bridge,a.bridge_activity_id)
    original_ids=db.select(Response.question_id).join(Attempt,Attempt.id==Response.attempt_id).where(Attempt.student_id==g.user.id)
    original_stems=db.select(Question.stem).join(Response,Response.question_id==Question.id).join(Attempt,Attempt.id==Response.attempt_id).where(Attempt.student_id==g.user.id)
    q=db.session.scalar(db.select(Question).where(Question.concept_id==b.concept_id,Question.source_type=='echo',Question.approved.is_(True),Question.id.not_in(original_ids),Question.stem.not_in(original_stems)).order_by(Question.created_at))
    if not q: raise APIError('missing_equivalent','Teacher must author an approved distinct Echo question for this concept.',409)
    a.completed_at=now(); a.echo_due_at=now()+timedelta(hours=current_app.config['ECHO_HOURS']); a.status='completed'
    db.session.add(EchoCheck(bridge_assignment_id=a.id,question_id=q.id,due_at=a.echo_due_at))
    return {'id':a.id,'due_at':a.echo_due_at.isoformat()+'Z'}

@api.post('/student/bridge-assignments/<id>/complete')
@require('student')
def complete(id):
    result=complete_bridge(id); db.session.commit(); return jsonify(result)

def submit_teachback(data):
    a=own_assignment(data.bridge_assignment_id)
    if not a.completed_at: raise APIError('conflict','Complete the activity first.',409)
    if sum(len(s) for s in data.drawing)>2500: raise APIError('validation','Drawing has too many points.')
    if db.session.scalar(db.select(Teachback).filter_by(bridge_assignment_id=a.id)): raise APIError('conflict','A teach-back has already been submitted.',409)
    t=Teachback(**data.model_dump()); db.session.add(t); db.session.flush()
    return {'id':t.id,'review_state':'pending'}

@api.post('/student/teachbacks')
@require('student')
def teachback():
    result=submit_teachback(body(TeachbackInput)); db.session.commit(); return jsonify(result),201

@api.get('/teacher/teachbacks')
@require('teacher')
def teachbacks():
    rows=db.session.execute(db.select(Teachback,BridgeAssignment,User,Bridge).join(BridgeAssignment,BridgeAssignment.id==Teachback.bridge_assignment_id).join(Classroom,Classroom.id==BridgeAssignment.classroom_id).join(User,User.id==BridgeAssignment.student_id).join(Bridge,Bridge.id==BridgeAssignment.bridge_activity_id).where(Classroom.teacher_id==g.user.id,Classroom.organization_id==g.user.organization_id).order_by(Teachback.created_at.desc()))
    return jsonify(items=[dict(**serial(t,'text_body','drawing','review_state','feedback','rubric'),student_name=u.display_name,activity=b.title,classroom_id=a.classroom_id) for t,a,u,b in rows][:200])

@api.post('/teacher/teachbacks/<id>/review')
@require('teacher')
def review(id):
    t=get(Teachback,id); a=get(BridgeAssignment,t.bridge_assignment_id); classroom(a.classroom_id)
    if t.review_state=='reviewed': raise APIError('conflict','This review is already recorded.',409)
    data=body(ReviewInput); t.rubric=data.rubric.model_dump(); t.feedback=data.feedback; t.reviewed_by=g.user.id; t.reviewed_at=now(); t.review_state='reviewed'
    audit('teachback_reviewed',t); return save(t)

@api.get('/student/echo-checks')
@require('student')
def echo_checks():
    rows=db.session.execute(db.select(EchoCheck,BridgeAssignment,Bridge).join(BridgeAssignment,BridgeAssignment.id==EchoCheck.bridge_assignment_id).join(Bridge,Bridge.id==BridgeAssignment.bridge_activity_id).where(BridgeAssignment.student_id==g.user.id).order_by(EchoCheck.due_at))
    return jsonify(items=[dict(**serial(e,'due_at','answered_at','correct'),title=b.title,due=e.due_at<=now(),question=question_json(get(Question,e.question_id)) if e.due_at<=now() and not e.answered_at else None,status='assessed' if e.answered_at else 'Not yet assessed') for e,a,b in rows])

@api.post('/student/echo-checks/<id>/answer')
@require('student')
def echo_answer(id):
    e=get(EchoCheck,id); own_assignment(e.bridge_assignment_id)
    if e.answered_at: raise APIError('conflict','This check is already answered.',409)
    if e.due_at>now(): raise APIError('not_due','This check is not due yet.',409)
    data=body(EchoInput); o=get(AnswerOption,data.answer_option_id)
    if o.question_id!=e.question_id: raise APIError('validation','Option does not belong to this check.')
    e.selected_option_id=o.id; e.correct=o.is_correct; e.answered_at=now(); db.session.commit()
    return jsonify(correct=e.correct,feedback='Your idea transferred to a new problem.' if e.correct else 'This is useful evidence. Your teacher can help with another bridge.')

@api.post('/demo/echo-checks/<id>/make-due')
@require('student')
def demo_due(id):
    if not current_app.config['DEMO_MODE'] or not get(Organization,g.user.organization_id).synthetic: raise APIError('not_found','Not found.',404)
    e=get(EchoCheck,id); own_assignment(e.bridge_assignment_id)
    if e.answered_at: raise APIError('conflict','Already answered.',409)
    e.due_at=now()-timedelta(seconds=1); audit('synthetic_clock_fixture',e); return save(e)

@api.get('/teacher/classes/<id>/print-pack')
@require('teacher')
def print_pack(id):
    c=classroom(id)
    query=db.select(Bridge).join(Concept,Concept.id==Bridge.concept_id).where(Concept.organization_id==g.user.organization_id,Bridge.approved_by.is_not(None))
    ds=db.session.scalars(db.select(Diagnostic).filter_by(classroom_id=id,status='published')).all()
    return jsonify(classroom=serial(c,'title','grade_band','subject'),activities=[bridge_json(b) for b in db.session.scalars(query)],diagnostics=[dict(**serial(d,'title'),questions=[question_json(q) for q in diagnostic_questions(d.id)]) for d in ds])

@api.post('/teacher/classes/<id>/print-entries')
@require('teacher')
def print_entry(id):
    classroom(id); data=body(PaperInput)
    d=get(Diagnostic,data.assignment_id)
    if d.classroom_id!=id or d.status!='published': raise APIError('validation','Use a published diagnostic from this classroom.')
    qs=diagnostic_questions(d.id)
    if {a.question_id for a in data.answers}!={q.id for q in qs} or len(data.answers)!=len(qs): raise APIError('validation','Provide one answer per question.')
    for a in data.answers:
        if get(AnswerOption,a.answer_option_id).question_id!=a.question_id: raise APIError('validation','Option does not match question.')
    # Pseudonymous paper learner preserves denominators without merging unrelated people.
    u=User(organization_id=g.user.organization_id,role='student',display_name='Paper '+secrets.token_hex(3),password_hash=passwords.hash(secrets.token_urlsafe(32)),active=False)
    db.session.add(u); db.session.flush(); db.session.add(Enrollment(classroom_id=id,student_id=u.id))
    a=Attempt(assignment_id=d.id,student_id=u.id,completed_at=now()); db.session.add(a); db.session.flush()
    for answer in data.answers: db.session.add(Response(attempt_id=a.id,**answer.model_dump()))
    p=PrintEntry(classroom_id=id,teacher_id=g.user.id,response_data=data.model_dump(),source_label=data.source_label); db.session.add(p); db.session.flush(); audit('paper_response_entered',p)
    return save(p,201)

@api.post('/sync/batch')
@require('student')
def sync_batch():
    payload=request.get_json()
    if not isinstance(payload,dict) or set(payload)!={'items'} or not isinstance(payload['items'],list) or len(payload['items'])>30: raise APIError('validation','Send at most 30 queued items.')
    results=[]
    for item in payload['items']:
        key=item.get('client_mutation_id','') if isinstance(item,dict) else ''
        try:
            if not isinstance(item,dict) or set(item)!={'client_mutation_id','kind','resource_id','payload'} or not isinstance(key,str) or not 8<=len(key)<=80: raise APIError('validation','Invalid queued item.')
            fingerprint=hashlib.sha256(json.dumps(item,sort_keys=True,separators=(',',':')).encode()).hexdigest()
            receipt=db.session.scalar(db.select(SyncReceipt).filter_by(user_id=g.user.id,client_mutation_id=key))
            if receipt:
                if receipt.payload_hash!=fingerprint: raise APIError('idempotency_conflict','This mutation key was already used with different content.',409)
                results.append(dict(client_mutation_id=key,ok=True,replayed=True,result=receipt.response_json)); continue
            with db.session.begin_nested():
                kind=item['kind']; data=item['payload']; id=item['resource_id']
                if kind=='diagnostic_answer': value=answer_attempt(id,body(AnswerInput,data))
                elif kind=='diagnostic_finish': value=finish_attempt(id)
                elif kind=='bridge_complete': value=complete_bridge(id)
                elif kind=='teachback': value=submit_teachback(body(TeachbackInput,data))
                else: raise APIError('validation','This operation cannot be replayed offline.')
                db.session.flush()
                db.session.add(SyncReceipt(user_id=g.user.id,client_mutation_id=key,payload_hash=fingerprint,response_json=value))
            db.session.commit(); results.append(dict(client_mutation_id=key,ok=True,result=value))
        except (APIError,ValidationError) as error:
            db.session.rollback(); results.append(dict(client_mutation_id=key,ok=False,error=error.message if isinstance(error,APIError) else 'Invalid content',code=error.code if isinstance(error,APIError) else 'validation'))
        except IntegrityError:
            db.session.rollback(); results.append(dict(client_mutation_id=key,ok=False,error='Concurrent update. Retry this item.',code='conflict'))
    return jsonify(items=results)

@api.get('/admin/health-summary')
@require('admin')
def admin_health():
    audit('aggregate_health_viewed',g.user); db.session.commit()
    return jsonify(organizations=db.session.scalar(db.select(db.func.count(Organization.id))),classrooms=db.session.scalar(db.select(db.func.count(Classroom.id))),users=db.session.scalar(db.select(db.func.count(User.id))),status='ok')

@api.get('/admin/audit')
@require('admin')
def admin_audit():
    return jsonify(items=[serial(a,'actor_id','action','target_type','target_id','created_at') for a in db.session.scalars(db.select(AuditLog).order_by(AuditLog.created_at.desc()).limit(100))])

@api.get('/demo/tour')
def tour():
    # Public synthetic data only, never includes user IDs, names, explanations or answer keys.
    org=db.session.scalar(db.select(Organization).filter_by(synthetic=True))
    if not org: return jsonify(available=False,items=[],journey=[])
    c=db.session.scalar(db.select(Classroom).filter_by(organization_id=org.id).order_by(Classroom.created_at))
    nodes=atlas(c.id)
    for node in nodes:
        for activity in node['activities']:
            activity['approved_by']=None  # never expose staff account identifiers publicly
    return jsonify(available=True,synthetic=True,classroom=c.title,items=nodes,insights=insights(c.id),journey=[{'step':'Notice','evidence':'Two different fraction questions reveal a possible denominator mix-up.'},{'step':'Understand','evidence':'High-confidence wrong choices are shown separately from accuracy.'},{'step':'Bridge','evidence':'A teacher approves a 12-minute paper-fraction mission.'},{'step':'Teach back','evidence':'Learner explains equal-sized pieces; teacher reviews four rubric dimensions.'},{'step':'Echo','evidence':'A new equivalent question is due 72 hours after activity completion.'}])

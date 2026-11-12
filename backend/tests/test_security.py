from datetime import timedelta
from app.models import *
from app.security import passwords,digest
from conftest import sign_in,post

def test_csrf_login_logout_and_session_expiry(app,client):
    assert client.post('/api/v1/auth/login',json={'email':'teacher@demo.ahabridge.test','password':'test-password-long-123'}).status_code==403
    sign_in(client)
    assert client.post('/api/v1/auth/logout',json={}).status_code==403
    cookie=client.get_cookie('aha_session'); assert cookie.http_only and cookie.same_site=='Lax'
    with app.app_context():
        s=db.session.scalar(db.select(AuthSession).where(AuthSession.token_hash==digest(cookie.value)))
        assert s.token_hash!=cookie.value
        s.expires_at=now()-timedelta(seconds=1); db.session.commit()
    assert client.get('/api/v1/auth/me').status_code==401

def test_missing_csrf_cookie_can_be_refreshed_in_an_active_session(client):
    sign_in(client)
    client.delete_cookie('aha_csrf')
    token=client.get('/api/v1/auth/csrf').json['csrf_token']
    assert token and client.get('/api/v1/auth/me').status_code==200
    assert post(client,'/auth/logout').status_code==200
    assert client.get('/api/v1/auth/me').status_code==401

def test_roles_tenant_and_teacher_ownership(app,client):
    teacher=sign_in(client); own=client.get('/api/v1/teacher/classes').json['items'][0]['id']
    with app.app_context():
        other_org=Organization(name='Other school');db.session.add(other_org);db.session.flush()
        outsider=User(organization_id=other_org.id,role='teacher',display_name='Other teacher',email='other@test',password_hash=passwords.hash('test-password-long-123'));db.session.add(outsider);db.session.flush()
        c=Classroom(organization_id=other_org.id,teacher_id=outsider.id,title='Other class',grade_band='7',subject='Math',join_code_hash=digest('other-code'));db.session.add(c)
        colleague=User(organization_id=teacher['organization_id'],role='teacher',display_name='Colleague',email='colleague@test',password_hash=passwords.hash('test-password-long-123'));db.session.add(colleague);db.session.commit(); foreign=c.id
    assert client.get('/api/v1/teacher/classes/'+foreign+'/atlas').status_code==404
    colleague_client=app.test_client();sign_in(colleague_client,'colleague@test')
    assert colleague_client.get('/api/v1/teacher/classes/'+own+'/atlas').status_code==403
    student=app.test_client();sign_in(student,'student01@demo.ahabridge.test')
    assert student.get('/api/v1/teacher/classes').status_code==403
    assert student.get('/api/v1/questions').status_code==403
    assert student.get('/api/v1/admin/audit').status_code==403

def test_answer_option_ownership_and_no_early_keys(app,client):
    sign_in(client,'student01@demo.ahabridge.test')
    d=client.get('/api/v1/diagnostics').json['items'][0]
    qs=client.get('/api/v1/diagnostics/'+d['id']).json['questions']
    aid=post(client,'/student/diagnostics/'+d['id']+'/start').json['id']
    assert client.get('/api/v1/student/diagnostics/'+aid+'/result').status_code==409
    assert post(client,'/student/diagnostics/'+aid+'/answer',{'question_id':qs[0]['id'],'answer_option_id':qs[1]['options'][0]['id'],'sure':True}).status_code==422
    assert post(client,'/student/diagnostics/'+aid+'/answer',{'question_id':qs[0]['id'],'answer_option_id':qs[0]['options'][0]['id'],'sure':'false'}).status_code==422
    other=app.test_client();sign_in(other,'student02@demo.ahabridge.test')
    assert other.get('/api/v1/student/diagnostics/'+aid+'/result').status_code==404

def test_unapproved_activity_blocked_and_drawing_bounded(app,client):
    sign_in(client)
    cid=client.get('/api/v1/teacher/classes').json['items'][0]['id']
    student=client.get('/api/v1/teacher/classes/'+cid).json['students'][0]['id']
    concept=client.get('/api/v1/concepts').json['items'][0]['id']
    b=post(client,'/bridges',{'concept_id':concept,'title':'New activity','mode':'hands_on','minutes':10,'materials':['Paper'],'steps':['Fold it.','Explain it.'],'success_criteria':['Explains equal parts.']})
    assert b.status_code==201
    assert post(client,'/teacher/bridge-assignments',{'classroom_id':cid,'student_id':student,'bridge_activity_id':b.json['id']}).status_code==409
    assert post(client,'/bridges/'+b.json['id']+'/approve').status_code==200

def test_no_public_elevated_registration_or_private_cache(client):
    assert client.get('/api/v1/health').headers['Cache-Control']=='no-store'
    assert client.get('/api/v1/does-not-exist').status_code==404
    assert client.get('/api/v1/does-not-exist').is_json
    assert client.get('/assets/missing.js').status_code==404
    assert client.get('/demo').status_code==200
    assert client.get('/student/missions').status_code==200
    public=client.get('/api/v1/demo/tour')
    assert public.json['synthetic'] is True
    assert 'student_name' not in public.get_data(as_text=True)
    assert 'password_hash' not in public.get_data(as_text=True)
    assert all(a['approved_by'] is None for n in public.json['items'] for a in n['activities'])

def test_production_clock_fixture_disabled(app,client):
    sign_in(client,'student05@demo.ahabridge.test')
    checks=client.get('/api/v1/student/echo-checks').json['items']
    app.config['DEMO_MODE']=False
    assert post(client,'/demo/echo-checks/'+checks[0]['id']+'/make-due').status_code==404

def test_echo_cannot_be_answered_early(app,client):
    sign_in(client,'student07@demo.ahabridge.test')
    echo=client.get('/api/v1/student/echo-checks').json['items'][0]
    assert not echo['due'] and echo['question'] is None
    assert post(client,'/student/echo-checks/'+echo['id']+'/answer',{'answer_option_id':'anything'}).status_code==409

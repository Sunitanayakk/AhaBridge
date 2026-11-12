from datetime import timedelta
from app.models import *
from conftest import sign_in,post

def test_complete_learning_loop(app,client):
    teacher=sign_in(client)
    classroom=client.get('/api/v1/teacher/classes').json['items'][0]
    class_id=classroom['id']
    student=app.test_client(); student_user=sign_in(student,'student01@demo.ahabridge.test')
    d=student.get('/api/v1/diagnostics').json['items'][0]
    questions=student.get('/api/v1/diagnostics/'+d['id']).json['questions']
    assert all('is_correct' not in o for q in questions for o in q['options'])
    a=post(student,'/student/diagnostics/'+d['id']+'/start').json
    for q in questions:
        response=post(student,'/student/diagnostics/'+a['id']+'/answer',{'question_id':q['id'],'answer_option_id':q['options'][1]['id'],'sure':True})
        assert response.status_code==200,response.json
        assert 'correct' not in response.json
    assert post(student,'/student/diagnostics/'+a['id']+'/finish').status_code==200
    results=student.get('/api/v1/student/diagnostics/'+a['id']+'/result').json
    assert results['correct']==0 and results['items'][0]['possible_misconception']
    atlas=client.get('/api/v1/teacher/classes/'+class_id+'/atlas').json['items']
    fractions=next(c for c in atlas if c['name']=='Fractions')
    assert fractions['status']=='needs_support'
    assert fractions['misconceptions'][0]['evidence'][0]['selected_option']=='B'
    bridge=fractions['activities'][0]
    mission=post(client,'/teacher/bridge-assignments',{'classroom_id':class_id,'student_id':student_user['id'],'bridge_activity_id':bridge['id'],'trigger_attempt_id':a['id']})
    assert mission.status_code==201,mission.json
    mid=mission.json['id']
    assert post(student,'/student/bridge-assignments/'+mid+'/complete').status_code==200
    back=post(student,'/student/teachbacks',{'bridge_assignment_id':mid,'text_body':'The denominator names the equal piece size. Three eighths plus two eighths is five eighths.','drawing':[[{'x':10,'y':20},{'x':40,'y':20}]]})
    assert back.status_code==201,back.json
    assert post(client,'/teacher/teachbacks/'+back.json['id']+'/review',{'rubric':{'clarity':2,'correctness':2,'example':2,'transfer':2},'feedback':'Clear equal-pieces explanation. Try a different numerator.'}).status_code==200
    echoes=student.get('/api/v1/student/echo-checks').json['items']
    echo=echoes[0]; assert not echo['due'] and echo['question'] is None
    assert post(student,'/demo/echo-checks/'+echo['id']+'/make-due').status_code==200
    echo=student.get('/api/v1/student/echo-checks').json['items'][0]
    assert echo['question']['id'] not in {q['id'] for q in questions}
    assert post(student,'/student/echo-checks/'+echo['id']+'/answer',{'answer_option_id':echo['question']['options'][0]['id']}).json['correct'] is True
    stats=client.get('/api/v1/teacher/classes/'+class_id+'/insights').json
    assert stats['verified_recoveries']==3
    assert stats['delayed_n']==4
    assert stats['delayed_accuracy']==.75

def test_idempotent_offline_replay_and_conflict(app,client):
    user=sign_in(client,'student01@demo.ahabridge.test')
    d=client.get('/api/v1/diagnostics').json['items'][0]
    questions=client.get('/api/v1/diagnostics/'+d['id']).json['questions']
    aid=post(client,'/student/diagnostics/'+d['id']+'/start').json['id']
    item={'client_mutation_id':'offline-unique-123','kind':'diagnostic_answer','resource_id':aid,'payload':{'question_id':questions[0]['id'],'answer_option_id':questions[0]['options'][0]['id'],'sure':True}}
    first=post(client,'/sync/batch',{'items':[item]}).json['items'][0]
    assert first['ok']
    second=post(client,'/sync/batch',{'items':[item]}).json['items'][0]
    assert second['ok'] and second['replayed']
    item['payload']['sure']=False
    third=post(client,'/sync/batch',{'items':[item]}).json['items'][0]
    assert not third['ok'] and third['code']=='idempotency_conflict'
    with app.app_context():
        assert db.session.scalar(db.select(db.func.count(Response.id)).where(Response.attempt_id==aid))==1

def test_partial_sync_reports_errors_without_losing_valid_items(app,client):
    sign_in(client,'student01@demo.ahabridge.test')
    result=post(client,'/sync/batch',{'items':[{'client_mutation_id':'invalid-kind-123','kind':'review','resource_id':'none','payload':{}},'malformed']})
    assert result.status_code==200
    assert all(not x['ok'] for x in result.json['items'])

def test_evidence_needs_two_distinct_questions(app,client):
    sign_in(client)
    created=post(client,'/teacher/classes',{'title':'Empty class','grade_band':'7','subject':'Math'}).json
    items=client.get('/api/v1/teacher/classes/'+created['id']+'/atlas').json['items']
    assert all(n['status']=='insufficient_evidence' and n['accuracy'] is None and n['priority'] is None for n in items)
    assert all(n['misconceptions']==[] for n in items)

def test_no_automatic_mastery_from_completion(app,client):
    sign_in(client)
    id=client.get('/api/v1/teacher/classes').json['items'][0]['id']
    stats=client.get('/api/v1/teacher/classes/'+id+'/insights').json
    assert stats['bridges_completed']==6 and stats['verified_recoveries']==2
    assert stats['post_accuracy'] is None and stats['post_n']==0

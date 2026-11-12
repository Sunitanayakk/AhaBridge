"""Exercise the complete synthetic learning loop over real HTTP.

Requires a seeded local demo and the same private DEMO_PASSWORD in the process or .env.
Adds one diagnostic and mission to the synthetic classroom; never targets real-school data.
"""
import http.cookiejar
import json
import os
import sys
import urllib.request
from pathlib import Path
from dotenv import load_dotenv

load_dotenv(Path(__file__).resolve().parents[1]/'.env')
base=(sys.argv[1] if len(sys.argv)>1 else 'http://localhost:5000').rstrip('/')+'/api/v1'
password=os.environ['DEMO_PASSWORD']

class Session:
    def __init__(self,email):
        self.cookies=http.cookiejar.CookieJar()
        self.http=urllib.request.build_opener(urllib.request.HTTPCookieProcessor(self.cookies))
        self.get('/auth/csrf')
        self.user=self.post('/auth/login',{'email':email,'password':password})['user']
    def request(self,path,data=None):
        headers={'Content-Type':'application/json'}
        if data is not None:
            headers['X-CSRF-Token']=next(c.value for c in self.cookies if c.name=='aha_csrf')
        req=urllib.request.Request(base+path,json.dumps(data).encode() if data is not None else None,headers)
        with self.http.open(req,timeout=30) as response: return json.load(response)
    def get(self,path): return self.request(path)
    def post(self,path,data=None): return self.request(path,data or {})

with urllib.request.urlopen(base+'/demo/tour') as response:
    assert json.load(response).get('synthetic') is True, 'Synthetic demo seed required.'
t=Session('teacher@demo.ahabridge.test'); s=Session('student01@demo.ahabridge.test')
assert s.get('/auth/me')['demo_mode'], 'Clock fixture must be explicitly enabled.'
class_id=t.get('/teacher/classes')['items'][0]['id']
fraction=next(c for c in t.get('/concepts')['items'] if c['name']=='Fractions')
bank=[q for q in t.get('/questions')['items'] if q['concept_id']==fraction['id'] and q['source_type']=='diagnostic']
d=t.post('/diagnostics',{'classroom_id':class_id,'title':'HTTP smoke · synthetic fraction clues','question_ids':[q['id'] for q in bank[:2]]})
t.post('/diagnostics/'+d['id']+'/publish')
data=s.get('/diagnostics/'+d['id'])
assert not any('is_correct' in o for q in data['questions'] for o in q['options'])
a=s.post('/student/diagnostics/'+d['id']+'/start')
for q in data['questions']:
    wrong=next(o for o in q['options'] if o['label']=='B')
    s.post('/student/diagnostics/'+a['id']+'/answer',{'question_id':q['id'],'answer_option_id':wrong['id'],'sure':True})
s.post('/student/diagnostics/'+a['id']+'/finish')
assert s.get('/student/diagnostics/'+a['id']+'/result')['correct']==0
node=next(n for n in t.get('/teacher/classes/'+class_id+'/atlas')['items'] if n['id']==fraction['id'])
assert node['status']=='needs_support' and node['misconceptions']
b=next(b for b in t.get('/bridges')['items'] if b['concept_id']==fraction['id'] and b['approved_by'] and b['language']=='en')
mission=t.post('/teacher/bridge-assignments',{'classroom_id':class_id,'student_id':s.user['id'],'bridge_activity_id':b['id'],'trigger_attempt_id':a['id']})
s.post('/student/bridge-assignments/'+mission['id']+'/complete')
back=s.post('/student/teachbacks',{'bridge_assignment_id':mission['id'],'text_body':'The denominator names the equal-sized pieces. Three eighths and two eighths make five eighths.','drawing':[]})
t.post('/teacher/teachbacks/'+back['id']+'/review',{'rubric':{'clarity':2,'correctness':2,'example':2,'transfer':2},'feedback':'You explained the unchanged piece size and used a new example.'})
checks=s.get('/student/echo-checks')['items']; check=next(e for e in checks if not e['answered_at'] and not e['due'])
s.post('/demo/echo-checks/'+check['id']+'/make-due')
check=next(e for e in s.get('/student/echo-checks')['items'] if e['id']==check['id'])
assert check['question']['id'] not in {q['id'] for q in data['questions']}
correct=next(q for q in t.get('/questions')['items'] if q['id']==check['question']['id'])
option=next(o for o in correct['options'] if o['is_correct'])
assert s.post('/student/echo-checks/'+check['id']+'/answer',{'answer_option_id':option['id']})['correct']
stats=t.get('/teacher/classes/'+class_id+'/insights')
assert stats['verified_recoveries']>=3
s.post('/auth/logout');t.post('/auth/logout')
print('PASS: real HTTP teacher > diagnostic > evidence > assignment > teach-back > review > distinct delayed check > recovery insight.')

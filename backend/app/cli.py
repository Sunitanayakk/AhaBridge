import os
import secrets
from datetime import timedelta
import click
from .models import *
from .security import digest, passwords

CONTENT = [
    ('fractions','Fractions','Equal-sized parts make a meaningful whole.',.95,'denominators-added','Adding denominators instead of keeping equal-sized parts.','Fold two equal strips into quarters before combining pieces.',
     [('What is 1/4 + 2/4?', ['3/4','3/8','2/4','1/2']),('A jug holds 2/5 litre. Add 1/5 litre. How much now?', ['3/5 litre','3/10 litre','2/10 litre','1 litre']),('A paper strip has 3/8 shaded. Shade another 2/8. What fraction is shaded?', ['5/8','5/16','6/8','1/8'])],
     'Paper fractions, real understanding',['Two equal paper strips','Pencil'],['Fold each equal strip into four equal parts. Mark one quarter on the first and two quarters on the second.','Place the marked pieces together. Count three quarter-sized pieces. Why does the size of a piece stay the same?','Try eighths with a partner. Explain why the denominator names the size of the parts.'],['Shows equal-sized parts','Explains why denominators are not added']),
    ('ratios','Ratios & proportion','Compare quantities by scaling both parts.',.75,'additive-scaling','Adding the same amount instead of multiplying both ratio terms.','Use counters to build repeated groups.',
     [('A canteen mixes 2 cups lemon juice with 3 cups water. For 4 cups juice, water is?', ['6 cups','5 cups','4 cups','3 cups']),('A market sells 3 notebooks for ₹30. What do 6 notebooks cost?', ['₹60','₹33','₹90','₹45']),('A drink uses 3 cups juice and 4 cups water. For 6 cups juice, water is?', ['8 cups','7 cups','6 cups','4 cups'])],
     'Canteen recipe detectives',['Counters or bottle caps','Paper'],['Arrange 2 counters for juice and 3 for water. Sketch the recipe.','Build a second identical group. Compare the totals and describe how both parts changed.','Plan a larger batch for friends. Show the same scale factor on both quantities.'],['Scales both quantities by the same factor','Uses a new ratio example']),
    ('units','Measuring everyday water','Convert using the size of the measurement unit.',.65,'unit-size','Treating litres and millilitres as the same unit.','Measure a litre with smaller equal containers.',
     [('How many millilitres are in 2 litres?', ['2000 mL','2 mL','200 mL','20 mL']),('A bottle contains 1500 mL. This is:', ['1.5 litres','1500 litres','15 litres','0.15 litre']),('A pot holds 3 litres. How many millilitres is that?', ['3000 mL','3 mL','300 mL','30 mL'])],
     'One litre, many little measures',['A 1-litre bottle','250 mL cup','Water'],['Predict how many 250 mL cups fill one litre. Record your idea.','Fill carefully, count the cups, and write 4 × 250 mL = 1000 mL. Reuse the water for plants.','Explain 2.5 litres in millilitres without measuring again.'],['Links 1 L to 1000 mL','Explains a different conversion']),
    ('data','Reading data stories','Read labels, units and differences before concluding.',.5,'total-vs-difference','Reporting a total when the question asks for a difference.','Mark the two quantities and compare the gap.',
     [('A waste audit counts 12 paper items and 8 plastic items. How many MORE paper items?', ['4','20','12','8']),('A bus chart shows 9 trips Monday and 6 Tuesday. The difference is:', ['3 trips','15 trips','9 trips','6 trips']),('A class collected 14 bottles on Friday and 9 on Thursday. How many more on Friday?', ['5','23','14','9'])],
     'Our classroom waste detectives',['Reusable item counters','Tally sheet'],['Create two labelled groups: paper and plastic. Count without touching unsafe waste.','Draw bars for the counts. Point to what each axis measures.','Compare the difference and total. Explain why these answer different questions.'],['Labels quantities and units','Distinguishes total from difference'])
]

def seed(password):
    if db.session.scalar(db.select(Organization).filter_by(synthetic=True)):
        return False
    org=Organization(name='AhaBridge demonstration school · synthetic',synthetic=True); db.session.add(org); db.session.flush()
    teacher=User(organization_id=org.id,role='teacher',display_name='Teacher Mira',email='teacher@demo.ahabridge.test',password_hash=passwords.hash(password)); db.session.add(teacher); db.session.flush()
    admin=User(organization_id=org.id,role='admin',display_name='Demo steward',email='admin@demo.ahabridge.test',password_hash=passwords.hash(password)); db.session.add(admin)
    classes=[]
    for title,grade in [('Grade 7 · Everyday mathematics','7'),('Grade 8 · Applied numeracy','8')]:
        c=Classroom(organization_id=org.id,teacher_id=teacher.id,title=title,grade_band=grade,subject='Mathematics',join_code_hash=digest(secrets.token_urlsafe(9))); db.session.add(c); classes.append(c)
    db.session.flush()
    students=[]
    for i in range(14):
        u=User(organization_id=org.id,role='student',display_name=f'Learner {i+1:02}',email=f'student{i+1:02}@demo.ahabridge.test',password_hash=passwords.hash(password)); db.session.add(u); db.session.flush(); students.append(u)
        db.session.add(Enrollment(classroom_id=classes[0 if i<10 else 1].id,student_id=u.id))
    concepts=[]; all_questions=[]; bridges=[]
    for index,(slug,name,description,importance,code,desc,hint,question_data,title,materials,steps,criteria) in enumerate(CONTENT):
        c=Concept(organization_id=org.id,slug=slug,name=name,description=description,importance=importance,created_by=teacher.id); db.session.add(c); db.session.flush(); concepts.append(c)
        m=Misconception(concept_id=c.id,code=code,description=desc,hint=hint,teacher_reviewed=True); db.session.add(m); db.session.flush()
        qs=[]
        for j,(stem,options) in enumerate(question_data):
            q=Question(concept_id=c.id,stem=stem,source_type='echo' if j==2 else 'diagnostic',approved=True,created_by=teacher.id)
            q.options=[AnswerOption(label=chr(65+k),text=text,is_correct=k==0,misconception_id=m.id if k==1 else None) for k,text in enumerate(options)]
            db.session.add(q); qs.append(q)
        db.session.flush(); all_questions.append(qs)
        for mode in ['hands_on','printable']:
            b=Bridge(concept_id=c.id,misconception_id=m.id,title=title+(' · paper card' if mode=='printable' else ''),mode=mode,minutes=12,materials=materials,steps=steps,success_criteria=criteria,approved_by=teacher.id)
            db.session.add(b); bridges.append(b)
    db.session.flush()
    db.session.add(Prerequisite(concept_id=concepts[1].id,prerequisite_concept_id=concepts[0].id))
    db.session.add(Prerequisite(concept_id=concepts[2].id,prerequisite_concept_id=concepts[1].id))
    # Authored activity translations, not a claim of a translated entire curriculum.
    for language,title,materials,steps,criteria in [
        ('hi','कागज़ के भिन्न',['दो बराबर कागज़ की पट्टियाँ','पेंसिल'],['दोनों पट्टियों को चार बराबर भागों में मोड़ें। एक पर एक और दूसरी पर दो भाग रंगें।','रंगे भाग साथ रखें। कुल कितने चौथाई हैं? भाग का आकार क्यों नहीं बदला?','आठ बराबर भागों से नया उदाहरण बनाकर साथी को समझाएँ।'],['बराबर भाग दिखाता है','हर का अर्थ समझाता है']),
        ('or','କାଗଜରେ ଭଗ୍ନାଂଶ',['ଦୁଇଟି ସମାନ କାଗଜ ପଟି','ପେନ୍‌ସିଲ୍'],['ଦୁଇ ପଟିକୁ ଚାରି ସମାନ ଭାଗରେ ଭାଙ୍ଗନ୍ତୁ। ପ୍ରଥମର ଗୋଟିଏ ଓ ଦ୍ୱିତୀୟର ଦୁଇଟି ଭାଗ ରଙ୍ଗ କରନ୍ତୁ।','ରଙ୍ଗ ଭାଗଗୁଡ଼ିକୁ ଏକାଠି କରନ୍ତୁ। କେତେ ଚତୁର୍ଥାଂଶ ହେଲା? ଭାଗର ଆକାର କାହିଁକି ବଦଳିଲା ନାହିଁ?','ଆଠ ସମାନ ଭାଗର ଏକ ନୂଆ ଉଦାହରଣ ସାଥୀକୁ ବୁଝାନ୍ତୁ।'],['ସମାନ ଭାଗ ଦେଖାଏ','ହରର ଅର୍ଥ ବୁଝାଏ'])]:
        db.session.add(Bridge(concept_id=concepts[0].id,title=title,language=language,mode='hands_on',minutes=12,materials=materials,steps=steps,success_criteria=criteria,approved_by=teacher.id))
    for ci,c in enumerate(classes):
        d=Diagnostic(classroom_id=c.id,title='Small questions, useful clues',status='published',published_at=now()-timedelta(days=5)); db.session.add(d); db.session.flush()
        for j,q in enumerate([q for qs in all_questions for q in qs[:2]]): db.session.add(DiagnosticItem(set_id=d.id,question_id=q.id,position=j))
        for i,u in enumerate(students[:10] if ci==0 else students[10:]):
            if i==0: continue  # leave the first account ready for a live diagnostic
            a=Attempt(assignment_id=d.id,student_id=u.id,completed_at=now()-timedelta(days=5),created_at=now()-timedelta(days=5)); db.session.add(a); db.session.flush()
            for qi,qs in enumerate(all_questions):
                for q in qs[:2]:
                    oi=1 if (qi==0 or (i+qi)%3==0) else 0
                    db.session.add(Response(attempt_id=a.id,question_id=q.id,answer_option_id=q.options[oi].id,sure=i%3!=0,created_at=now()-timedelta(days=5)))
            if ci==0 and i<=6:
                a_bridge=BridgeAssignment(teacher_id=teacher.id,student_id=u.id,classroom_id=c.id,bridge_activity_id=bridges[0].id,trigger_attempt_id=a.id,status='completed',completed_at=now()-timedelta(days=4),echo_due_at=now()-timedelta(days=1),created_at=now()-timedelta(days=4,hours=1)); db.session.add(a_bridge); db.session.flush()
                t=Teachback(bridge_assignment_id=a_bridge.id,text_body='Three quarters means three equal quarter-sized pieces. One quarter plus two quarters is three quarters; the piece size stays the same.',review_state='reviewed' if i<=4 else 'pending',rubric={'clarity':2,'correctness':2,'example':2,'transfer':2} if i<=4 else None,feedback='Your equal-parts explanation is clear. Try a new example with eighths.' if i<=4 else None,reviewed_by=teacher.id if i<=4 else None,reviewed_at=now()-timedelta(days=3) if i<=4 else None); db.session.add(t)
                e=EchoCheck(bridge_assignment_id=a_bridge.id,question_id=all_questions[0][2].id,due_at=now()+timedelta(days=1) if i==6 else now()-timedelta(days=1))
                if i<=3:
                    e.answered_at=now()-timedelta(hours=3); e.correct=i!=3; e.selected_option_id=all_questions[0][2].options[0 if e.correct else 1].id
                db.session.add(e)
    db.session.commit(); return True

def register_cli(app):
    @app.cli.command('seed-demo')
    def seed_demo():
        """Insert synthetic fixtures once; never reset or overwrite an existing school."""
        if not app.config['DEMO_MODE']: raise click.ClickException('Set DEMO_MODE=true explicitly before seeding synthetic data.')
        password=os.getenv('DEMO_PASSWORD','')
        if len(password)<12: raise click.ClickException('Set a DEMO_PASSWORD of at least 12 characters.')
        click.echo('Synthetic classroom seeded.' if seed(password) else 'Synthetic data already exists; no changes made.')

    @app.cli.command('provision')
    @click.option('--organization',required=True)
    @click.option('--email',required=True)
    @click.option('--name',required=True)
    @click.option('--role',type=click.Choice(['admin','teacher']),required=True)
    @click.password_option(confirmation_prompt=True)
    def provision(organization,email,name,role,password):
        """Operator-only invitation fulfilment; no public elevated-account endpoint."""
        if len(password)<12: raise click.ClickException('Use at least 12 password characters.')
        if db.session.scalar(db.select(User).filter_by(email=email.lower())): raise click.ClickException('User exists.')
        org=db.session.scalar(db.select(Organization).filter_by(name=organization))
        if not org: org=Organization(name=organization); db.session.add(org); db.session.flush()
        u=User(organization_id=org.id,role=role,display_name=name,email=email.lower(),password_hash=passwords.hash(password)); db.session.add(u); db.session.flush()
        db.session.add(AuditLog(actor_id=u.id,action='operator_provisioned',target_type='users',target_id=u.id)); db.session.commit(); click.echo('Account provisioned.')

    @app.cli.command('purge-expired-sessions')
    def purge_sessions():
        db.session.execute(db.delete(AuthSession).where(AuthSession.expires_at<now())); db.session.commit(); click.echo('Expired sessions removed.')

    @app.cli.command('delete-learner')
    @click.argument('student_id')
    @click.confirmation_option(prompt='Permanently delete this learner and their educational records?')
    def delete_learner(student_id):
        u=db.session.get(User,student_id)
        if not u or u.role!='student': raise click.ClickException('Student not found.')
        bids=list(db.session.scalars(db.select(BridgeAssignment.id).filter_by(student_id=student_id)))
        aids=list(db.session.scalars(db.select(Attempt.id).filter_by(student_id=student_id)))
        for model,key,ids in [(EchoCheck,EchoCheck.bridge_assignment_id,bids),(Teachback,Teachback.bridge_assignment_id,bids),(Response,Response.attempt_id,aids)]:
            db.session.execute(db.delete(model).where(key.in_(ids)))
        for model,key in [(BridgeAssignment,BridgeAssignment.student_id),(Attempt,Attempt.student_id),(Enrollment,Enrollment.student_id),(AuthSession,AuthSession.user_id),(SyncReceipt,SyncReceipt.user_id)]: db.session.execute(db.delete(model).where(key==student_id))
        # This operator action deletes learner-originated fixture events too.
        db.session.execute(db.delete(AuditLog).where(AuditLog.actor_id==student_id))
        db.session.delete(u); db.session.commit(); click.echo('Learner records deleted. Clear offline data on their device as well.')

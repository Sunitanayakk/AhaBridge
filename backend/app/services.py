from collections import Counter
from flask import g
from .models import *
from .security import APIError

def get(model, id):
    row = db.session.get(model, id)
    if row is None:
        raise APIError('not_found','Record not found.',404)
    return row

def classroom(id, student=False):
    row = get(Classroom,id)
    if row.organization_id != g.user.organization_id:
        raise APIError('not_found','Classroom not found.',404)
    if g.user.role == 'teacher' and row.teacher_id == g.user.id:
        return row
    if student and g.user.role == 'student' and db.session.scalar(db.select(Enrollment).filter_by(classroom_id=id,student_id=g.user.id)):
        return row
    raise APIError('forbidden','This classroom belongs to another teacher or learner.',403)

def concept(id, write=False):
    row = get(Concept,id)
    if row.organization_id not in (None,g.user.organization_id):
        raise APIError('not_found','Concept not found.',404)
    if write and (g.user.role != 'teacher' or row.organization_id != g.user.organization_id):
        raise APIError('forbidden','Only organization teachers can edit this content.',403)
    return row

def audit(action, row, metadata=None):
    db.session.add(AuditLog(actor_id=g.user.id,action=action,target_type=row.__tablename__,target_id=row.id,metadata_json=metadata or {}))

def serial(row, *fields):
    out={'id':row.id}
    for key in fields:
        value=getattr(row,key)
        out[key]=value.isoformat()+'Z' if isinstance(value,__import__('datetime').datetime) else value
    return out

def question_json(q, answers=False):
    data=serial(q,'concept_id','stem','language','version','source_type','approved')
    data['options']=[serial(o,'label','text',*(['is_correct','misconception_id'] if answers else [])) for o in sorted(q.options,key=lambda o:o.label)]
    return data

def bridge_json(b):
    return serial(b,'concept_id','misconception_id','title','language','mode','minutes','materials','steps','success_criteria','approved_by','version')

def assignment_json(a):
    data=serial(a,'student_id','classroom_id','status','completed_at','echo_due_at','trigger_attempt_id')
    data['activity']=bridge_json(get(Bridge,a.bridge_activity_id))
    t=db.session.scalar(db.select(Teachback).filter_by(bridge_assignment_id=a.id))
    data['teachback']=serial(t,'text_body','drawing','review_state','feedback','rubric','reviewed_at') if t else None
    return data

def own_attempt(id):
    a=get(Attempt,id)
    if a.student_id != g.user.id:
        raise APIError('not_found','Attempt not found.',404)
    classroom(get(Diagnostic,a.assignment_id).classroom_id, student=True)
    return a

def own_assignment(id):
    a=get(BridgeAssignment,id)
    if a.student_id != g.user.id:
        raise APIError('not_found','Mission not found.',404)
    classroom(a.classroom_id, student=True)
    return a

def diagnostic_questions(id):
    return list(db.session.scalars(db.select(Question).join(DiagnosticItem,DiagnosticItem.question_id==Question.id).where(DiagnosticItem.set_id==id).order_by(DiagnosticItem.position)))

def atlas(class_id, accuracy_cutoff=.65, confidence_cutoff=.4):
    # Aggregate only completed diagnostics from the requested classroom. Stages never mix.
    rows=list(db.session.execute(db.select(Response,Attempt,Question,AnswerOption).join(Attempt,Attempt.id==Response.attempt_id).join(Diagnostic,Diagnostic.id==Attempt.assignment_id).join(Question,Question.id==Response.question_id).join(AnswerOption,AnswerOption.id==Response.answer_option_id).where(Diagnostic.classroom_id==class_id,Attempt.completed_at.is_not(None))))
    c=get(Classroom,class_id)
    concepts=list(db.session.scalars(db.select(Concept).where((Concept.organization_id==c.organization_id)|(Concept.organization_id.is_(None))).order_by(Concept.created_at)))
    result=[]
    for con in concepts:
        subset=[r for r in rows if r[2].concept_id==con.id]
        n=len(subset); distinct=len({r[2].id for r in subset}); learners={r[1].student_id for r in subset}
        correct=sum(r[3].is_correct for r in subset)
        mismatch=sum(r[0].sure and not r[3].is_correct for r in subset)/n if n else None
        accuracy=correct/n if n else None
        enough=distinct>=2
        needs=enough and (accuracy<accuracy_cutoff or mismatch>=confidence_cutoff)
        student_wrong={r[1].student_id for r in subset if not r[3].is_correct}
        gap=len(student_wrong)/len(learners) if learners else 0
        latest=max((r[1].completed_at for r in subset),default=None)
        latest_set=max({r[1].assignment_id for r in subset},key=lambda id:get(Diagnostic,id).published_at or get(Diagnostic,id).created_at,default=None)
        latest_rows=[r for r in subset if r[1].assignment_id==latest_set]
        recent=sum(not r[3].is_correct for r in latest_rows)/len(latest_rows) if latest_rows else 0
        inputs={'gap_prevalence':gap,'prerequisite_importance':con.importance,'confidence_mismatch':mismatch or 0,'recent_struggle':recent}
        weights={'gap_prevalence':.4,'prerequisite_importance':.25,'confidence_mismatch':.2,'recent_struggle':.15}
        tags=Counter(r[3].misconception_id for r in subset if r[3].misconception_id)
        common=[]
        # No tiny-group misconception details, including supporting IDs or selected options.
        if len(learners)>=3:
            for mid,count in tags.items():
                m=get(Misconception,mid)
                affected=len({r[1].student_id for r in subset if r[3].misconception_id==mid})
                if affected<3:
                    continue
                common.append({'code':m.code,'description':m.description,'hint':m.hint,'teacher_reviewed':m.teacher_reviewed,'count':count,'evidence':[{'question_id':r[2].id,'selected_option':r[3].label,'option_text':r[3].text} for r in subset if r[3].misconception_id==mid]})
        data=serial(con,'name','description','importance')
        data.update(n=n,distinct_questions=distinct,learners=len(learners),accuracy=accuracy,confidence_mismatch=mismatch,
                    status='insufficient_evidence' if not enough else ('needs_support' if needs else 'enough_evidence'),
                    affected_share=gap if len(learners)>=3 else None,suppressed=len(learners)<3,misconceptions=common,
                    priority=sum(inputs[k]*weights[k] for k in weights) if enough else None,priority_inputs=inputs,priority_weights=weights,
                    next_action='Collect two distinct diagnostic questions.' if not enough else 'Review evidence and choose a teacher-approved bridge.',
                    prerequisites=[p.prerequisite_concept_id for p in db.session.scalars(db.select(Prerequisite).filter_by(concept_id=con.id))],
                    activities=[bridge_json(b) for b in db.session.scalars(db.select(Bridge).filter_by(concept_id=con.id)).all() if b.approved_by],
                    sampled_at=latest.isoformat()+'Z' if latest else None)
        result.append(data)
    return result

def insights(class_id):
    attempts=list(db.session.scalars(db.select(Attempt).join(Diagnostic,Diagnostic.id==Attempt.assignment_id).where(Diagnostic.classroom_id==class_id,Attempt.completed_at.is_not(None))))
    assignments=list(db.session.scalars(db.select(BridgeAssignment).filter_by(classroom_id=class_id)))
    ids=[a.id for a in assignments]
    checks=list(db.session.scalars(db.select(EchoCheck).where(EchoCheck.bridge_assignment_id.in_(ids)))) if ids else []
    backs=list(db.session.scalars(db.select(Teachback).where(Teachback.bridge_assignment_id.in_(ids)))) if ids else []
    retained=0; recovery=0
    for a in assignments:
        b=get(Bridge,a.bridge_activity_id)
        before=db.session.scalar(db.select(Response).join(Attempt,Attempt.id==Response.attempt_id).join(Question,Question.id==Response.question_id).join(AnswerOption,AnswerOption.id==Response.answer_option_id).where(Attempt.student_id==a.student_id,Attempt.assignment_id.in_(db.select(Diagnostic.id).filter_by(classroom_id=class_id)),Question.concept_id==b.concept_id,AnswerOption.is_correct.is_(False),Response.created_at<=a.created_at))
        t=next((t for t in backs if t.bridge_assignment_id==a.id),None)
        e=next((e for e in checks if e.bridge_assignment_id==a.id),None)
        if before and a.completed_at and t and t.review_state=='reviewed' and all(t.rubric[k]>=2 for k in ['correctness','example','transfer']):
            if e and e.correct and e.answered_at>=a.completed_at:
                recovery+=1; retained+=1
    nodes=atlas(class_id)
    answered=[e for e in checks if e.answered_at]
    response_count=db.session.scalar(db.select(db.func.count(Response.id)).where(Response.attempt_id.in_([a.id for a in attempts]))) if attempts else 0
    return dict(questions_attempted=response_count,concepts_sampled=sum(n['n']>0 for n in nodes),concepts_needing_attention=sum(n['status']=='needs_support' for n in nodes),bridges_assigned=len(assignments),bridges_completed=sum(a.completed_at is not None for a in assignments),teachbacks_reviewed=sum(t.review_state=='reviewed' for t in backs),echo_due=sum(e.answered_at is None and e.due_at<=now() for e in checks),echo_completed=len(answered),verified_recoveries=recovery,retained=retained,delayed_accuracy=sum(bool(e.correct) for e in answered)/len(answered) if answered else None,delayed_n=len(answered),post_accuracy=None,post_n=0,as_of=now().isoformat()+'Z',explanation='Counts use this classroom only. Diagnostic, teacher rubric and delayed responses are separate evidence. Recovery requires a prior wrong answer, completed bridge, supportive reviewed rubric and a correct distinct Echo Check. Observed improvement in this sample; no causal claim.')

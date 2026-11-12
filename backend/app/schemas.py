from typing import Literal
from pydantic import BaseModel, ConfigDict, Field, StrictBool

class Input(BaseModel):
    model_config = ConfigDict(extra='forbid', str_strip_whitespace=True)

class Login(Input):
    email: str = Field(min_length=3,max_length=180)
    password: str = Field(min_length=1,max_length=256)

class ClassInput(Input):
    title: str = Field(min_length=3,max_length=160)
    grade_band: str = Field(min_length=1,max_length=40)
    subject: str = Field(min_length=1,max_length=80)

class ConceptInput(Input):
    name: str = Field(min_length=2,max_length=120)
    slug: str = Field(pattern=r'^[a-z0-9-]{2,80}$')
    description: str = Field(min_length=5,max_length=2000)
    importance: float = Field(ge=0,le=1,default=.5)
    prerequisites: list[str] = Field(max_length=12,default=[])

class MisconceptionInput(Input):
    code: str = Field(min_length=2,max_length=80)
    description: str = Field(min_length=5,max_length=1000)
    hint: str = Field(min_length=5,max_length=1000)
    teacher_reviewed: StrictBool = False

class OptionInput(Input):
    label: str = Field(pattern=r'^[A-D]$')
    text: str = Field(min_length=1,max_length=500)
    is_correct: StrictBool
    misconception_id: str | None = None

class QuestionInput(Input):
    concept_id: str
    stem: str = Field(min_length=5,max_length=2000)
    language: Literal['en','hi','or'] = 'en'
    source_type: Literal['diagnostic','post','echo'] = 'diagnostic'
    options: list[OptionInput] = Field(min_length=2,max_length=4)

class DiagnosticInput(Input):
    classroom_id: str
    title: str = Field(min_length=3,max_length=160)
    question_ids: list[str] = Field(min_length=2,max_length=20)

class AnswerInput(Input):
    question_id: str
    answer_option_id: str
    sure: StrictBool

class BridgeInput(Input):
    concept_id: str
    misconception_id: str | None = None
    title: str = Field(min_length=3,max_length=160)
    language: Literal['en','hi','or'] = 'en'
    mode: Literal['hands_on','printable','digital']
    minutes: int = Field(ge=5,le=30)
    materials: list[str] = Field(min_length=1,max_length=10)
    steps: list[str] = Field(min_length=2,max_length=12)
    success_criteria: list[str] = Field(min_length=1,max_length=8)

class AssignInput(Input):
    classroom_id: str
    student_id: str
    bridge_activity_id: str
    trigger_attempt_id: str | None = None
    override_reason: str = Field(default='',max_length=500)

class Point(Input):
    x: float = Field(ge=0,le=600)
    y: float = Field(ge=0,le=240)

class TeachbackInput(Input):
    bridge_assignment_id: str
    text_body: str = Field(min_length=15,max_length=6000)
    drawing: list[list[Point]] = Field(default=[],max_length=100)

class Rubric(Input):
    clarity: int = Field(ge=0,le=3)
    correctness: int = Field(ge=0,le=3)
    example: int = Field(ge=0,le=3)
    transfer: int = Field(ge=0,le=3)

class ReviewInput(Input):
    rubric: Rubric
    feedback: str = Field(min_length=5,max_length=2000)

class EchoInput(Input):
    answer_option_id: str

class ProvisionInput(Input):
    classroom_id: str
    display_name: str = Field(min_length=2,max_length=80)
    email: str = Field(min_length=3,max_length=180)
    password: str = Field(min_length=12,max_length=128)

class PaperInput(Input):
    source_label: str = Field(min_length=3,max_length=120)
    assignment_id: str
    answers: list[AnswerInput] = Field(min_length=2,max_length=20)

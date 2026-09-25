"""
Tests for automatic backend startup database seeding and idempotency.
"""

from datetime import datetime, timezone
from sqlalchemy import func, select
from sqlalchemy.orm import Session

from app.models.answer import Answer
from app.models.form import Form
from app.models.question import Question
from app.models.response import Response

try:
    from seed import seed_database
except ImportError:
    from backend.seed import seed_database


def test_seed_database_creates_demo_forms_and_responses(db_session: Session) -> None:
    """Verifies that seed_database creates the expected demo forms, questions, and responses on an empty database."""
    # Ensure database is initially empty
    initial_forms = db_session.scalar(select(func.count(Form.id)))
    assert initial_forms == 0

    # Seed the database
    seed_database(db_session)

    # Verify Form 1 (Customer Feedback)
    form_1 = db_session.query(Form).filter(Form.slug == "customer-feedback-demo").first()
    assert form_1 is not None
    assert form_1.title == "Customer Feedback"
    assert form_1.status == "published"

    questions_1 = db_session.query(Question).filter(Question.form_id == form_1.id).order_by(Question.order_index).all()
    assert len(questions_1) == 6
    types_1 = {q.type for q in questions_1}
    assert {"short_text", "email", "rating", "multiple_choice", "yes_no", "long_text"}.issubset(types_1)

    responses_1 = db_session.query(Response).filter(Response.form_id == form_1.id).all()
    assert len(responses_1) == 3

    # Verify Form 2 (Tech Conference 2026 Registration)
    form_2 = db_session.query(Form).filter(Form.slug == "event-registration-demo").first()
    assert form_2 is not None
    assert form_2.title == "Tech Conference 2026 Registration"
    assert form_2.status == "published"

    questions_2 = db_session.query(Question).filter(Question.form_id == form_2.id).all()
    assert len(questions_2) == 6
    types_2 = {q.type for q in questions_2}
    assert {"short_text", "email", "dropdown", "number", "yes_no", "long_text"}.issubset(types_2)

    responses_2 = db_session.query(Response).filter(Response.form_id == form_2.id).all()
    assert len(responses_2) == 3


def test_seed_database_is_idempotent_on_repeated_runs(db_session: Session) -> None:
    """Verifies that running seed_database multiple times does not duplicate demo forms or data."""
    # Run first time
    seed_database(db_session)

    forms_count_1 = db_session.scalar(select(func.count(Form.id)))
    questions_count_1 = db_session.scalar(select(func.count(Question.id)))
    responses_count_1 = db_session.scalar(select(func.count(Response.id)))
    answers_count_1 = db_session.scalar(select(func.count(Answer.id)))

    assert forms_count_1 == 2
    assert questions_count_1 == 12
    assert responses_count_1 == 6

    # Run second time
    seed_database(db_session)

    forms_count_2 = db_session.scalar(select(func.count(Form.id)))
    questions_count_2 = db_session.scalar(select(func.count(Question.id)))
    responses_count_2 = db_session.scalar(select(func.count(Response.id)))
    answers_count_2 = db_session.scalar(select(func.count(Answer.id)))

    # Counts must remain completely unchanged
    assert forms_count_2 == forms_count_1
    assert questions_count_2 == questions_count_1
    assert responses_count_2 == responses_count_1
    assert answers_count_2 == answers_count_1


def test_seed_database_preserves_user_created_forms(db_session: Session) -> None:
    """Verifies that seed_database never deletes or alters pre-existing user-created forms or responses."""
    # Pre-populate user form
    user_form = Form(
        title="Custom User Survey",
        slug="custom-user-survey",
        status="published",
        created_at=datetime.now(timezone.utc),
        updated_at=datetime.now(timezone.utc),
    )
    db_session.add(user_form)
    db_session.flush()

    user_q = Question(
        form_id=user_form.id,
        type="short_text",
        title="Your opinion?",
        required=True,
        order_index=0,
        settings={},
    )
    db_session.add(user_q)
    db_session.flush()

    user_resp = Response(
        form_id=user_form.id,
        submitted_at=datetime.now(timezone.utc),
        created_at=datetime.now(timezone.utc),
    )
    db_session.add(user_resp)
    db_session.flush()

    user_ans = Answer(
        response_id=user_resp.id,
        question_id=user_q.id,
        value="Looks great!",
        created_at=datetime.now(timezone.utc),
    )
    db_session.add(user_ans)
    db_session.commit()

    # Now run seed
    seed_database(db_session)

    # Verify user form is completely intact
    persisted_user_form = db_session.query(Form).filter(Form.slug == "custom-user-survey").first()
    assert persisted_user_form is not None
    assert persisted_user_form.title == "Custom User Survey"

    persisted_questions = db_session.query(Question).filter(Question.form_id == user_form.id).all()
    assert len(persisted_questions) == 1
    assert persisted_questions[0].title == "Your opinion?"

    persisted_responses = db_session.query(Response).filter(Response.form_id == user_form.id).all()
    assert len(persisted_responses) == 1

    # Total forms is now 1 user form + 2 demo forms = 3
    total_forms = db_session.scalar(select(func.count(Form.id)))
    assert total_forms == 3

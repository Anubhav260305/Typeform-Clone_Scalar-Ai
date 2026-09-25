"""
Database Seeding Script for Typeform Clone.

Seeds the database with realistic demo forms, mixed question types,
and respondent submission data. Safe and idempotent to run on fresh
or existing databases without affecting user-created forms.

Usage:
    python backend/seed.py
"""

import sys
from datetime import datetime, timezone
from pathlib import Path

# Ensure backend root is on sys.path regardless of execution working directory
backend_dir = Path(__file__).resolve().parent
if str(backend_dir) not in sys.path:
    sys.path.insert(0, str(backend_dir))

from app.database.connection import SessionLocal, init_db
from app.models.answer import Answer
from app.models.form import Form
from app.models.question import Question
from app.models.response import Response


def seed_database() -> None:
    print("Initializing database tables if not already present...")
    init_db()

    with SessionLocal() as db:
        # Form 1: Customer Feedback
        slug_1 = "customer-feedback-demo"
        existing_form_1 = db.query(Form).filter(Form.slug == slug_1).first()

        if existing_form_1:
            print(f"Form '{slug_1}' already exists. Skipping Form 1 creation.")
        else:
            print(f"Creating Form 1: Customer Feedback (slug: {slug_1})...")
            form_1 = Form(
                title="Customer Feedback",
                slug=slug_1,
                status="published",
                created_at=datetime.now(timezone.utc),
                updated_at=datetime.now(timezone.utc),
            )
            db.add(form_1)
            db.flush()

            q1_1 = Question(
                form_id=form_1.id,
                type="short_text",
                title="What is your full name?",
                description="Please tell us who is providing this feedback",
                required=True,
                order_index=0,
                settings={},
            )
            q1_2 = Question(
                form_id=form_1.id,
                type="email",
                title="What is your email address?",
                description="We will only reach out if you request follow-up",
                required=True,
                order_index=1,
                settings={},
            )
            q1_3 = Question(
                form_id=form_1.id,
                type="rating",
                title="Overall, how satisfied are you with our service?",
                description="1 = Very Dissatisfied, 5 = Extremely Satisfied",
                required=True,
                order_index=2,
                settings={"min_rating": 1, "max_rating": 5},
            )
            q1_4 = Question(
                form_id=form_1.id,
                type="multiple_choice",
                title="How often do you use our product?",
                description=None,
                required=True,
                order_index=3,
                settings={"options": ["Daily", "Weekly", "Monthly", "Rarely"]},
            )
            q1_5 = Question(
                form_id=form_1.id,
                type="yes_no",
                title="Would you recommend our product to colleagues or friends?",
                description=None,
                required=True,
                order_index=4,
                settings={},
            )
            q1_6 = Question(
                form_id=form_1.id,
                type="long_text",
                title="What can we do to improve your experience?",
                description="Optional comments or feature suggestions",
                required=False,
                order_index=5,
                settings={},
            )

            db.add_all([q1_1, q1_2, q1_3, q1_4, q1_5, q1_6])
            db.flush()

            # Seed realistic responses for Form 1
            form_1_responses = [
                {
                    q1_1.id: "Sarah Connor",
                    q1_2.id: "sarah.connor@example.com",
                    q1_3.id: 5,
                    q1_4.id: "Daily",
                    q1_5.id: True,
                    q1_6.id: "The fluid UX and one-question-at-a-time flow is incredible!",
                },
                {
                    q1_1.id: "David Chen",
                    q1_2.id: "dchen@techcorp.io",
                    q1_3.id: 4,
                    q1_4.id: "Weekly",
                    q1_5.id: True,
                    q1_6.id: "Great responsiveness on mobile. Looking forward to CSV exports in the future.",
                },
                {
                    q1_1.id: "Elena Rostova",
                    q1_2.id: "elena.r@agency.net",
                    q1_3.id: 3,
                    q1_4.id: "Monthly",
                    q1_5.id: False,
                    q1_6.id: "Works nicely for standard feedback surveys. Conditional branching would be great.",
                },
            ]

            for resp_data in form_1_responses:
                resp = Response(
                    form_id=form_1.id,
                    submitted_at=datetime.now(timezone.utc),
                    created_at=datetime.now(timezone.utc),
                )
                db.add(resp)
                db.flush()

                for q_id, val in resp_data.items():
                    if val is not None:
                        answer = Answer(
                            response_id=resp.id,
                            question_id=q_id,
                            value=val,
                            created_at=datetime.now(timezone.utc),
                        )
                        db.add(answer)

            print(f"Created Form 1 with 6 questions and {len(form_1_responses)} responses.")

        # Form 2: Event Registration
        slug_2 = "event-registration-demo"
        existing_form_2 = db.query(Form).filter(Form.slug == slug_2).first()

        if existing_form_2:
            print(f"Form '{slug_2}' already exists. Skipping Form 2 creation.")
        else:
            print(f"Creating Form 2: Tech Conference 2026 Registration (slug: {slug_2})...")
            form_2 = Form(
                title="Tech Conference 2026 Registration",
                slug=slug_2,
                status="published",
                created_at=datetime.now(timezone.utc),
                updated_at=datetime.now(timezone.utc),
            )
            db.add(form_2)
            db.flush()

            q2_1 = Question(
                form_id=form_2.id,
                type="short_text",
                title="Full Name",
                description="Enter your first and last name",
                required=True,
                order_index=0,
                settings={},
            )
            q2_2 = Question(
                form_id=form_2.id,
                type="email",
                title="Work Email",
                description="Registration badge confirmation will be delivered here",
                required=True,
                order_index=1,
                settings={},
            )
            q2_3 = Question(
                form_id=form_2.id,
                type="dropdown",
                title="Which session track are you most interested in attending?",
                description="Select your primary focus track",
                required=True,
                order_index=2,
                settings={"options": ["AI & Machine Learning", "Cloud Architecture", "Frontend Systems", "DevOps & SRE"]},
            )
            q2_4 = Question(
                form_id=form_2.id,
                type="number",
                title="How many team members will attend with you?",
                description="Enter 0 if attending solo",
                required=False,
                order_index=3,
                settings={"min": 0, "max": 20},
            )
            q2_5 = Question(
                form_id=form_2.id,
                type="yes_no",
                title="Will you attend the evening networking dinner?",
                description=None,
                required=True,
                order_index=4,
                settings={},
            )
            q2_6 = Question(
                form_id=form_2.id,
                type="long_text",
                title="Any dietary restrictions or accessibility requirements?",
                description="Leave blank if none",
                required=False,
                order_index=5,
                settings={},
            )

            db.add_all([q2_1, q2_2, q2_3, q2_4, q2_5, q2_6])
            db.flush()

            # Seed realistic responses for Form 2
            form_2_responses = [
                {
                    q2_1.id: "Marcus Vance",
                    q2_2.id: "marcus.vance@startup.co",
                    q2_3.id: "AI & Machine Learning",
                    q2_4.id: 2,
                    q2_5.id: True,
                    q2_6.id: "Vegetarian meal preference.",
                },
                {
                    q2_1.id: "Priya Patel",
                    q2_2.id: "priya.patel@enterprise.com",
                    q2_3.id: "Cloud Architecture",
                    q2_4.id: 0,
                    q2_5.id: True,
                    q2_6.id: None,
                },
                {
                    q2_1.id: "Alex Thorne",
                    q2_2.id: "alex.thorne@infra.io",
                    q2_3.id: "DevOps & SRE",
                    q2_4.id: 4,
                    q2_5.id: False,
                    q2_6.id: None,
                },
            ]

            for resp_data in form_2_responses:
                resp = Response(
                    form_id=form_2.id,
                    submitted_at=datetime.now(timezone.utc),
                    created_at=datetime.now(timezone.utc),
                )
                db.add(resp)
                db.flush()

                for q_id, val in resp_data.items():
                    if val is not None:
                        answer = Answer(
                            response_id=resp.id,
                            question_id=q_id,
                            value=val,
                            created_at=datetime.now(timezone.utc),
                        )
                        db.add(answer)

            print(f"Created Form 2 with 6 questions and {len(form_2_responses)} responses.")

        db.commit()
        print("Database seeding completed successfully.")


if __name__ == "__main__":
    seed_database()

from fastapi.testclient import TestClient
from sqlalchemy import func, select
from sqlalchemy.orm import Session

from app.models.answer import Answer
from app.models.form import Form
from app.models.question import Question
from app.models.response import Response


def _create_and_publish_form(client: TestClient, title: str = "Analytics Form") -> int:
    res = client.post("/api/forms", json={"title": title})
    assert res.status_code == 201
    form_id = res.json()["id"]
    return form_id


def _add_question(client: TestClient, form_id: int, title: str, q_type: str, **kwargs) -> int:
    payload = {"title": title, "type": q_type, **kwargs}
    res = client.post(f"/api/forms/{form_id}/questions", json=payload)
    assert res.status_code == 201
    return res.json()["id"]


def test_analytics_nonexistent_form(client: TestClient) -> None:
    res = client.get("/api/forms/99999/analytics")
    assert res.status_code == 404


def test_analytics_empty_form(client: TestClient) -> None:
    form_id = _create_and_publish_form(client, "Zero Questions Form")
    res = client.get(f"/api/forms/{form_id}/analytics")
    assert res.status_code == 200
    data = res.json()
    assert data["form_id"] == form_id
    assert data["total_responses"] == 0
    assert data["questions"] == []


def test_analytics_form_with_no_responses(client: TestClient) -> None:
    form_id = _create_and_publish_form(client)
    _add_question(client, form_id, "Name", "short_text")
    _add_question(client, form_id, "Score", "number")
    _add_question(client, form_id, "Rating", "rating", settings={"min_rating": 1, "max_rating": 5})
    _add_question(client, form_id, "Agree", "yes_no")
    _add_question(client, form_id, "Choice", "multiple_choice", settings={"options": ["A", "B"]})
    client.post(f"/api/forms/{form_id}/publish")

    res = client.get(f"/api/forms/{form_id}/analytics")
    assert res.status_code == 200
    data = res.json()
    assert data["total_responses"] == 0
    assert len(data["questions"]) == 5

    for q in data["questions"]:
        assert q["response_count"] == 0
        if q["question_type"] == "number":
            assert q["average"] is None
            assert q["minimum"] is None
            assert q["maximum"] is None
        elif q["question_type"] == "rating":
            assert q["average"] is None
            assert q["distribution"] == {"1": 0, "2": 0, "3": 0, "4": 0, "5": 0}
        elif q["question_type"] == "yes_no":
            assert q["distribution"] == {"true": 0, "false": 0}
        elif q["question_type"] == "multiple_choice":
            assert q["distribution"] == {"A": 0, "B": 0}


def test_analytics_text_and_email_response_counts(client: TestClient) -> None:
    form_id = _create_and_publish_form(client)
    q_short = _add_question(client, form_id, "Name", "short_text")
    q_long = _add_question(client, form_id, "Feedback", "long_text")
    q_email = _add_question(client, form_id, "Email", "email")
    client.post(f"/api/forms/{form_id}/publish")

    # Submit 2 responses
    client.post(
        f"/api/forms/{form_id}/responses",
        json={
            "answers": [
                {"question_id": q_short, "value": "Alice"},
                {"question_id": q_long, "value": "Very good"},
                {"question_id": q_email, "value": "alice@example.com"},
            ]
        },
    )
    client.post(
        f"/api/forms/{form_id}/responses",
        json={
            "answers": [
                {"question_id": q_short, "value": "Bob"},
                {"question_id": q_long, "value": "Super good"},
                {"question_id": q_email, "value": "bob@example.com"},
            ]
        },
    )

    res = client.get(f"/api/forms/{form_id}/analytics")
    assert res.status_code == 200
    data = res.json()
    assert data["total_responses"] == 2

    q_map = {q["question_id"]: q for q in data["questions"]}
    assert q_map[q_short]["response_count"] == 2
    assert q_map[q_long]["response_count"] == 2
    assert q_map[q_email]["response_count"] == 2


def test_analytics_number_min_max_average(client: TestClient) -> None:
    form_id = _create_and_publish_form(client)
    q_num = _add_question(client, form_id, "Age", "number")
    client.post(f"/api/forms/{form_id}/publish")

    for age in [10, 20, 30]:
        client.post(
            f"/api/forms/{form_id}/responses",
            json={"answers": [{"question_id": q_num, "value": age}]},
        )

    res = client.get(f"/api/forms/{form_id}/analytics")
    assert res.status_code == 200
    stat = res.json()["questions"][0]
    assert stat["response_count"] == 3
    assert stat["average"] == 20.0
    assert stat["minimum"] == 10
    assert stat["maximum"] == 30


def test_analytics_rating_average_and_distribution(client: TestClient) -> None:
    form_id = _create_and_publish_form(client)
    q_rate = _add_question(
        client,
        form_id,
        "Rating",
        "rating",
        settings={"min_rating": 1, "max_rating": 5},
    )
    client.post(f"/api/forms/{form_id}/publish")

    # Ratings: 2, 4, 5, 5 -> avg = 16 / 4 = 4.0
    for r in [2, 4, 5, 5]:
        client.post(
            f"/api/forms/{form_id}/responses",
            json={"answers": [{"question_id": q_rate, "value": r}]},
        )

    res = client.get(f"/api/forms/{form_id}/analytics")
    assert res.status_code == 200
    stat = res.json()["questions"][0]
    assert stat["response_count"] == 4
    assert stat["average"] == 4.0
    # Check distribution includes 0 counts for 1 and 3
    assert stat["distribution"] == {
        "1": 0,
        "2": 1,
        "3": 0,
        "4": 1,
        "5": 2,
    }


def test_analytics_yes_no_distribution(client: TestClient) -> None:
    form_id = _create_and_publish_form(client)
    q_yn = _add_question(client, form_id, "Recommend?", "yes_no")
    client.post(f"/api/forms/{form_id}/publish")

    for v in [True, True, False]:
        client.post(
            f"/api/forms/{form_id}/responses",
            json={"answers": [{"question_id": q_yn, "value": v}]},
        )

    res = client.get(f"/api/forms/{form_id}/analytics")
    assert res.status_code == 200
    stat = res.json()["questions"][0]
    assert stat["response_count"] == 3
    assert stat["distribution"] == {"true": 2, "false": 1}


def test_analytics_multiple_choice_and_dropdown_distribution(client: TestClient) -> None:
    form_id = _create_and_publish_form(client)
    q_mc = _add_question(
        client,
        form_id,
        "Plan",
        "multiple_choice",
        settings={"options": ["Basic", "Pro", "Enterprise"]},
    )
    q_dd = _add_question(
        client,
        form_id,
        "Country",
        "dropdown",
        settings={"options": ["India", "USA", "Germany"]},
    )
    client.post(f"/api/forms/{form_id}/publish")

    # 3 submissions: Plan: Basic, Basic, Pro; Country: India, USA, India
    submissions = [
        {"answers": [{"question_id": q_mc, "value": "Basic"}, {"question_id": q_dd, "value": "India"}]},
        {"answers": [{"question_id": q_mc, "value": "Basic"}, {"question_id": q_dd, "value": "USA"}]},
        {"answers": [{"question_id": q_mc, "value": "Pro"}, {"question_id": q_dd, "value": "India"}]},
    ]
    for sub in submissions:
        client.post(f"/api/forms/{form_id}/responses", json=sub)

    res = client.get(f"/api/forms/{form_id}/analytics")
    assert res.status_code == 200
    q_map = {q["question_id"]: q for q in res.json()["questions"]}

    # Zero-count Enterprise and Germany are preserved!
    assert q_map[q_mc]["distribution"] == {
        "Basic": 2,
        "Pro": 1,
        "Enterprise": 0,
    }
    assert q_map[q_dd]["distribution"] == {
        "India": 2,
        "USA": 1,
        "Germany": 0,
    }


def test_analytics_optional_unanswered_questions(client: TestClient) -> None:
    form_id = _create_and_publish_form(client)
    q_req = _add_question(client, form_id, "Required", "short_text", required=True)
    q_opt = _add_question(client, form_id, "Optional", "number", required=False)
    client.post(f"/api/forms/{form_id}/publish")

    # Submission 1 answers both
    client.post(
        f"/api/forms/{form_id}/responses",
        json={"answers": [{"question_id": q_req, "value": "A"}, {"question_id": q_opt, "value": 50}]},
    )
    # Submission 2 answers only required
    client.post(
        f"/api/forms/{form_id}/responses",
        json={"answers": [{"question_id": q_req, "value": "B"}]},
    )

    res = client.get(f"/api/forms/{form_id}/analytics")
    assert res.status_code == 200
    data = res.json()
    assert data["total_responses"] == 2

    q_map = {q["question_id"]: q for q in data["questions"]}
    assert q_map[q_req]["response_count"] == 2
    assert q_map[q_opt]["response_count"] == 1
    assert q_map[q_opt]["average"] == 50.0


def test_analytics_questions_returned_in_order(client: TestClient) -> None:
    form_id = _create_and_publish_form(client)
    _add_question(client, form_id, "Q3", "short_text", order_index=3)
    _add_question(client, form_id, "Q1", "short_text", order_index=1)
    _add_question(client, form_id, "Q2", "short_text", order_index=2)
    client.post(f"/api/forms/{form_id}/publish")

    res = client.get(f"/api/forms/{form_id}/analytics")
    assert res.status_code == 200
    titles = [q["question_title"] for q in res.json()["questions"]]
    assert titles == ["Q1", "Q2", "Q3"]


def test_analytics_multiple_forms_are_independent(client: TestClient) -> None:
    form1_id = _create_and_publish_form(client, "Form 1")
    q1 = _add_question(client, form1_id, "Q1", "number")
    client.post(f"/api/forms/{form1_id}/publish")

    form2_id = _create_and_publish_form(client, "Form 2")
    q2 = _add_question(client, form2_id, "Q2", "number")
    client.post(f"/api/forms/{form2_id}/publish")

    client.post(f"/api/forms/{form1_id}/responses", json={"answers": [{"question_id": q1, "value": 100}]})

    res1 = client.get(f"/api/forms/{form1_id}/analytics").json()
    res2 = client.get(f"/api/forms/{form2_id}/analytics").json()

    assert res1["total_responses"] == 1
    assert res1["questions"][0]["average"] == 100.0

    assert res2["total_responses"] == 0
    assert res2["questions"][0]["average"] is None


def test_analytics_does_not_modify_data(client: TestClient, db_session: Session) -> None:
    form_id = _create_and_publish_form(client)
    q1 = _add_question(client, form_id, "Q1", "short_text")
    client.post(f"/api/forms/{form_id}/publish")
    client.post(f"/api/forms/{form_id}/responses", json={"answers": [{"question_id": q1, "value": "Test"}]})

    forms_before = db_session.scalar(select(func.count(Form.id)))
    questions_before = db_session.scalar(select(func.count(Question.id)))
    responses_before = db_session.scalar(select(func.count(Response.id)))
    answers_before = db_session.scalar(select(func.count(Answer.id)))

    # Call analytics 3 times
    for _ in range(3):
        res = client.get(f"/api/forms/{form_id}/analytics")
        assert res.status_code == 200

    forms_after = db_session.scalar(select(func.count(Form.id)))
    questions_after = db_session.scalar(select(func.count(Question.id)))
    responses_after = db_session.scalar(select(func.count(Response.id)))
    answers_after = db_session.scalar(select(func.count(Answer.id)))

    assert forms_before == forms_after
    assert questions_before == questions_after
    assert responses_before == responses_after
    assert answers_before == answers_after

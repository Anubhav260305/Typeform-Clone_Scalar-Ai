from fastapi.testclient import TestClient
from sqlalchemy import select
from sqlalchemy.orm import Session

from app.models.answer import Answer
from app.models.response import Response


def _create_and_publish_form(client: TestClient, title: str = "Feedback Survey") -> int:
    res = client.post("/api/forms", json={"title": title})
    assert res.status_code == 201
    form_id = res.json()["id"]
    # Publish the form
    patch_res = client.patch(f"/api/forms/{form_id}", json={"status": "published"})
    assert patch_res.status_code == 200
    assert patch_res.json()["status"] == "published"
    return form_id


def test_submit_response_unpublished_form_rejected(client: TestClient) -> None:
    # Form in draft status
    res = client.post("/api/forms", json={"title": "Draft Form"})
    form_id = res.json()["id"]

    q_res = client.post(
        f"/api/forms/{form_id}/questions",
        json={"title": "Name", "type": "short_text"},
    )
    q_id = q_res.json()["id"]

    submit_res = client.post(
        f"/api/forms/{form_id}/responses",
        json={"answers": [{"question_id": q_id, "value": "Alice"}]},
    )
    assert submit_res.status_code == 400
    assert "not published" in submit_res.json()["detail"].lower()


def test_submit_response_nonexistent_form(client: TestClient) -> None:
    res = client.post(
        "/api/forms/99999/responses",
        json={"answers": []},
    )
    assert res.status_code == 404


def test_submit_response_successful_all_types(client: TestClient) -> None:
    form_id = _create_and_publish_form(client, "Comprehensive Survey")

    q_short = client.post(
        f"/api/forms/{form_id}/questions", json={"title": "Name", "type": "short_text", "required": True}
    ).json()["id"]
    q_long = client.post(
        f"/api/forms/{form_id}/questions", json={"title": "Bio", "type": "long_text"}
    ).json()["id"]
    q_mc = client.post(
        f"/api/forms/{form_id}/questions",
        json={"title": "Color", "type": "multiple_choice", "settings": {"options": ["Red", "Green", "Blue"]}},
    ).json()["id"]
    q_drop = client.post(
        f"/api/forms/{form_id}/questions",
        json={"title": "Country", "type": "dropdown", "settings": {"options": ["India", "USA", "UK"]}},
    ).json()["id"]
    q_email = client.post(
        f"/api/forms/{form_id}/questions", json={"title": "Work Email", "type": "email"}
    ).json()["id"]
    q_num = client.post(
        f"/api/forms/{form_id}/questions", json={"title": "Age", "type": "number", "settings": {"min": 18, "max": 100}}
    ).json()["id"]
    q_yn = client.post(
        f"/api/forms/{form_id}/questions", json={"title": "Subscribe?", "type": "yes_no"}
    ).json()["id"]
    q_rating = client.post(
        f"/api/forms/{form_id}/questions",
        json={"title": "Service Rating", "type": "rating", "settings": {"min_rating": 1, "max_rating": 5}},
    ).json()["id"]

    submit_payload = {
        "answers": [
            {"question_id": q_short, "value": "Anubhav"},
            {"question_id": q_long, "value": "Loving this platform so far!"},
            {"question_id": q_mc, "value": "Green"},
            {"question_id": q_drop, "value": "India"},
            {"question_id": q_email, "value": "anubhav@example.com"},
            {"question_id": q_num, "value": 24},
            {"question_id": q_yn, "value": True},
            {"question_id": q_rating, "value": 5},
        ]
    }

    res = client.post(f"/api/forms/{form_id}/responses", json=submit_payload)
    assert res.status_code == 201
    data = res.json()
    assert data["form_id"] == form_id
    assert len(data["answers"]) == 8
    assert data["answers"][0]["question_title"] == "Name"
    assert data["answers"][0]["value"] == "Anubhav"
    assert data["answers"][4]["value"] == "anubhav@example.com"
    assert data["answers"][5]["value"] == 24
    assert data["answers"][6]["value"] is True
    assert data["answers"][7]["value"] == 5


def test_response_retrieval_and_detail(client: TestClient) -> None:
    form_id = _create_and_publish_form(client)
    q_id = client.post(
        f"/api/forms/{form_id}/questions", json={"title": "Feedback", "type": "short_text"}
    ).json()["id"]

    res_post = client.post(
        f"/api/forms/{form_id}/responses",
        json={"answers": [{"question_id": q_id, "value": "Great app"}]},
    )
    resp_id = res_post.json()["id"]

    # Test GET single response detail
    res_get = client.get(f"/api/responses/{resp_id}")
    assert res_get.status_code == 200
    detail = res_get.json()
    assert detail["id"] == resp_id
    assert detail["form_id"] == form_id
    assert len(detail["answers"]) == 1
    assert detail["answers"][0]["question_title"] == "Feedback"
    assert detail["answers"][0]["question_type"] == "short_text"
    assert detail["answers"][0]["value"] == "Great app"

    # Test GET form responses list
    res_list = client.get(f"/api/forms/{form_id}/responses")
    assert res_list.status_code == 200
    assert len(res_list.json()) == 1
    assert res_list.json()[0]["id"] == resp_id


def test_response_count(client: TestClient) -> None:
    form_id = _create_and_publish_form(client)
    q_id = client.post(
        f"/api/forms/{form_id}/questions", json={"title": "Q", "type": "short_text"}
    ).json()["id"]

    # Initial count 0
    c0 = client.get(f"/api/forms/{form_id}/responses/count")
    assert c0.status_code == 200
    assert c0.json()["count"] == 0

    # Submit 2 responses
    client.post(f"/api/forms/{form_id}/responses", json={"answers": [{"question_id": q_id, "value": "Ans 1"}]})
    client.post(f"/api/forms/{form_id}/responses", json={"answers": [{"question_id": q_id, "value": "Ans 2"}]})

    c2 = client.get(f"/api/forms/{form_id}/responses/count")
    assert c2.status_code == 200
    assert c2.json()["count"] == 2


def test_required_question_validation(client: TestClient) -> None:
    form_id = _create_and_publish_form(client)
    q_req = client.post(
        f"/api/forms/{form_id}/questions", json={"title": "Required Q", "type": "short_text", "required": True}
    ).json()["id"]
    q_opt = client.post(
        f"/api/forms/{form_id}/questions", json={"title": "Optional Q", "type": "short_text", "required": False}
    ).json()["id"]

    # Missing required question
    res_missing = client.post(
        f"/api/forms/{form_id}/responses",
        json={"answers": [{"question_id": q_opt, "value": "Only optional"}]},
    )
    assert res_missing.status_code == 400
    assert "required" in res_missing.json()["detail"].lower()

    # Empty string for required question
    res_empty = client.post(
        f"/api/forms/{form_id}/responses",
        json={"answers": [{"question_id": q_req, "value": "   "}]},
    )
    assert res_empty.status_code == 400
    assert "cannot be empty" in res_empty.json()["detail"].lower()

    # Omitting optional question is completely valid
    res_valid = client.post(
        f"/api/forms/{form_id}/responses",
        json={"answers": [{"question_id": q_req, "value": "Valid answer"}]},
    )
    assert res_valid.status_code == 201


def test_invalid_email_validation(client: TestClient) -> None:
    form_id = _create_and_publish_form(client)
    q_id = client.post(f"/api/forms/{form_id}/questions", json={"title": "Email", "type": "email"}).json()["id"]

    res = client.post(
        f"/api/forms/{form_id}/responses",
        json={"answers": [{"question_id": q_id, "value": "invalid-email-string"}]},
    )
    assert res.status_code == 400
    assert "valid email" in res.json()["detail"].lower()


def test_invalid_number_validation(client: TestClient) -> None:
    form_id = _create_and_publish_form(client)
    q_id = client.post(
        f"/api/forms/{form_id}/questions",
        json={"title": "Score", "type": "number", "settings": {"min": 0, "max": 100}},
    ).json()["id"]

    # String instead of number
    res_str = client.post(
        f"/api/forms/{form_id}/responses",
        json={"answers": [{"question_id": q_id, "value": "fifty"}]},
    )
    assert res_str.status_code == 400

    # Boolean instead of number (Python isinstance gotcha)
    res_bool = client.post(
        f"/api/forms/{form_id}/responses",
        json={"answers": [{"question_id": q_id, "value": True}]},
    )
    assert res_bool.status_code == 400

    # Out of bounds (< min)
    res_under = client.post(
        f"/api/forms/{form_id}/responses",
        json={"answers": [{"question_id": q_id, "value": -5}]},
    )
    assert res_under.status_code == 400
    assert "at least" in res_under.json()["detail"].lower()

    # Out of bounds (> max)
    res_over = client.post(
        f"/api/forms/{form_id}/responses",
        json={"answers": [{"question_id": q_id, "value": 150}]},
    )
    assert res_over.status_code == 400
    assert "cannot exceed" in res_over.json()["detail"].lower()


def test_invalid_yes_no_validation(client: TestClient) -> None:
    form_id = _create_and_publish_form(client)
    q_id = client.post(f"/api/forms/{form_id}/questions", json={"title": "Accept?", "type": "yes_no"}).json()["id"]

    res = client.post(
        f"/api/forms/{form_id}/responses",
        json={"answers": [{"question_id": q_id, "value": "yes"}]},
    )
    assert res.status_code == 400
    assert "boolean" in res.json()["detail"].lower()


def test_invalid_rating_validation(client: TestClient) -> None:
    form_id = _create_and_publish_form(client)
    q_id = client.post(
        f"/api/forms/{form_id}/questions",
        json={"title": "Rating", "type": "rating", "settings": {"min_rating": 1, "max_rating": 5}},
    ).json()["id"]

    # String rating
    res_str = client.post(
        f"/api/forms/{form_id}/responses",
        json={"answers": [{"question_id": q_id, "value": "5"}]},
    )
    assert res_str.status_code == 400

    # Rating above max
    res_high = client.post(
        f"/api/forms/{form_id}/responses",
        json={"answers": [{"question_id": q_id, "value": 6}]},
    )
    assert res_high.status_code == 400
    assert "between" in res_high.json()["detail"].lower()


def test_invalid_multiple_choice_and_dropdown_options(client: TestClient) -> None:
    form_id = _create_and_publish_form(client)
    q_mc = client.post(
        f"/api/forms/{form_id}/questions",
        json={"title": "MC", "type": "multiple_choice", "settings": {"options": ["Alpha", "Beta"]}},
    ).json()["id"]
    q_dd = client.post(
        f"/api/forms/{form_id}/questions",
        json={"title": "DD", "type": "dropdown", "settings": {"options": ["First", "Second"]}},
    ).json()["id"]

    # Invalid MC option
    res_mc = client.post(
        f"/api/forms/{form_id}/responses",
        json={"answers": [{"question_id": q_mc, "value": "Gamma"}]},
    )
    assert res_mc.status_code == 400
    assert "not a valid option" in res_mc.json()["detail"].lower()

    # Invalid Dropdown option
    res_dd = client.post(
        f"/api/forms/{form_id}/responses",
        json={"answers": [{"question_id": q_dd, "value": "Third"}]},
    )
    assert res_dd.status_code == 400
    assert "not a valid dropdown option" in res_dd.json()["detail"].lower()


def test_question_from_another_form_rejected(client: TestClient) -> None:
    form1_id = _create_and_publish_form(client, "Form 1")
    form2_id = _create_and_publish_form(client, "Form 2")

    q_form2 = client.post(
        f"/api/forms/{form2_id}/questions",
        json={"title": "Q2", "type": "short_text"},
    ).json()["id"]

    res = client.post(
        f"/api/forms/{form1_id}/responses",
        json={"answers": [{"question_id": q_form2, "value": "Hacked"}]},
    )
    assert res.status_code == 400
    assert f"does not belong to form {form1_id}" in res.json()["detail"].lower()


def test_duplicate_question_ids_rejected(client: TestClient) -> None:
    form_id = _create_and_publish_form(client)
    q_id = client.post(
        f"/api/forms/{form_id}/questions", json={"title": "Q", "type": "short_text"}
    ).json()["id"]

    res = client.post(
        f"/api/forms/{form_id}/responses",
        json={
            "answers": [
                {"question_id": q_id, "value": "First"},
                {"question_id": q_id, "value": "Duplicate"},
            ]
        },
    )
    assert res.status_code == 400
    assert "duplicate" in res.json()["detail"].lower()


def test_atomic_transaction_rollback_when_one_answer_is_invalid(
    client: TestClient, db_session: Session
) -> None:
    """Verifies that if any answer in a submission fails validation,

    neither the Response nor ANY Answer is persisted in the database.
    """
    form_id = _create_and_publish_form(client, "Atomic Rollback Form")
    q1 = client.post(
        f"/api/forms/{form_id}/questions", json={"title": "Name", "type": "short_text"}
    ).json()["id"]
    q2 = client.post(
        f"/api/forms/{form_id}/questions", json={"title": "Email", "type": "email"}
    ).json()["id"]
    q3 = client.post(
        f"/api/forms/{form_id}/questions",
        json={"title": "Rating", "type": "rating", "settings": {"min_rating": 1, "max_rating": 5}},
    ).json()["id"]

    # Submission has valid Name & Rating, but INVALID Email
    payload = {
        "answers": [
            {"question_id": q1, "value": "Valid Name"},
            {"question_id": q2, "value": "not-an-email"},  # Invalid!
            {"question_id": q3, "value": 5},
        ]
    }

    res = client.post(f"/api/forms/{form_id}/responses", json=payload)
    assert res.status_code == 400
    assert "email" in res.json()["detail"].lower()

    # Verify response count via API is 0
    count_res = client.get(f"/api/forms/{form_id}/responses/count")
    assert count_res.json()["count"] == 0

    # Verify directly via database query that 0 responses and 0 answers were created
    responses = db_session.scalars(select(Response).where(Response.form_id == form_id)).all()
    assert len(responses) == 0

    answers = db_session.scalars(select(Answer)).all()
    assert len(answers) == 0


def test_delete_response_cascades_to_answers(
    client: TestClient, db_session: Session
) -> None:
    form_id = _create_and_publish_form(client)
    q1 = client.post(f"/api/forms/{form_id}/questions", json={"title": "Q1", "type": "short_text"}).json()["id"]
    q2 = client.post(f"/api/forms/{form_id}/questions", json={"title": "Q2", "type": "short_text"}).json()["id"]

    res_post = client.post(
        f"/api/forms/{form_id}/responses",
        json={"answers": [{"question_id": q1, "value": "A1"}, {"question_id": q2, "value": "A2"}]},
    )
    resp_id = res_post.json()["id"]

    # Verify answers exist in DB
    answers_before = db_session.scalars(select(Answer).where(Answer.response_id == resp_id)).all()
    assert len(answers_before) == 2

    # Delete response
    del_res = client.delete(f"/api/responses/{resp_id}")
    assert del_res.status_code == 204

    # Verify response is gone
    assert client.get(f"/api/responses/{resp_id}").status_code == 404

    # Verify answers are cascade deleted
    answers_after = db_session.scalars(select(Answer).where(Answer.response_id == resp_id)).all()
    assert len(answers_after) == 0


def test_deleting_form_deletes_its_responses_and_answers(
    client: TestClient, db_session: Session
) -> None:
    form_id = _create_and_publish_form(client, "Form to Delete")
    q1 = client.post(f"/api/forms/{form_id}/questions", json={"title": "Q1", "type": "short_text"}).json()["id"]

    res1 = client.post(f"/api/forms/{form_id}/responses", json={"answers": [{"question_id": q1, "value": "R1"}]}).json()["id"]
    res2 = client.post(f"/api/forms/{form_id}/responses", json={"answers": [{"question_id": q1, "value": "R2"}]}).json()["id"]

    # Verify DB has 2 responses and 2 answers
    assert len(db_session.scalars(select(Response).where(Response.form_id == form_id)).all()) == 2
    assert len(db_session.scalars(select(Answer)).all()) == 2

    # Delete form
    del_form = client.delete(f"/api/forms/{form_id}")
    assert del_form.status_code == 204

    # Verify Form, Responses, and Answers are all deleted
    assert client.get(f"/api/forms/{form_id}").status_code == 404
    assert len(db_session.scalars(select(Response).where(Response.form_id == form_id)).all()) == 0
    assert len(db_session.scalars(select(Answer)).all()) == 0

from fastapi.testclient import TestClient


def test_duplicate_form_success(client: TestClient) -> None:
    # 1. Create original form
    create_form_res = client.post("/api/forms", json={"title": "Customer Feedback"})
    assert create_form_res.status_code == 201
    orig_form = create_form_res.json()
    orig_id = orig_form["id"]

    # 2. Add multiple questions with different types and settings
    q1_res = client.post(
        f"/api/forms/{orig_id}/questions",
        json={
            "title": "What is your name?",
            "type": "short_text",
            "description": "Please provide your first and last name",
            "required": True,
        },
    )
    assert q1_res.status_code == 201
    q1 = q1_res.json()

    q2_res = client.post(
        f"/api/forms/{orig_id}/questions",
        json={
            "title": "How would you rate your overall experience?",
            "type": "rating",
            "required": True,
            "settings": {"min_rating": 1, "max_rating": 5},
        },
    )
    assert q2_res.status_code == 201
    q2 = q2_res.json()

    q3_res = client.post(
        f"/api/forms/{orig_id}/questions",
        json={
            "title": "How did you hear about us?",
            "type": "dropdown",
            "required": False,
            "settings": {"options": ["Google", "Social Media", "Friend"]},
        },
    )
    assert q3_res.status_code == 201
    q3 = q3_res.json()

    # 3. Publish the original form
    pub_res = client.post(f"/api/forms/{orig_id}/publish")
    assert pub_res.status_code == 200
    assert pub_res.json()["status"] == "published"

    # 4. Submit a response to the original form
    submit_res = client.post(
        f"/api/forms/{orig_id}/responses",
        json={
            "answers": [
                {"question_id": q1["id"], "value": "Jane Doe"},
                {"question_id": q2["id"], "value": 5},
                {"question_id": q3["id"], "value": "Google"},
            ]
        },
    )
    assert submit_res.status_code == 201

    # Verify original form has 1 response
    orig_check = client.get(f"/api/forms/{orig_id}")
    assert orig_check.json()["response_count"] == 1
    orig_responses = client.get(f"/api/forms/{orig_id}/responses")
    assert len(orig_responses.json()) == 1

    # 5. Duplicate the form
    dup_res = client.post(f"/api/forms/{orig_id}/duplicate")
    assert dup_res.status_code == 201
    new_form = dup_res.json()

    # Verify form level duplication attributes
    assert new_form["id"] != orig_id
    assert new_form["title"] == "Customer Feedback (Copy)"
    assert new_form["slug"] != orig_form["slug"]
    assert "customer-feedback-copy" in new_form["slug"]
    # Duplicated form must start as DRAFT even though original was published
    assert new_form["status"] == "draft"
    # Responses must NOT be copied
    assert new_form["response_count"] == 0

    # 6. Verify questions were copied accurately and in the exact same order
    new_questions_res = client.get(f"/api/forms/{new_form['id']}/questions")
    assert new_questions_res.status_code == 200
    new_questions = new_questions_res.json()
    assert len(new_questions) == 3

    # Check question 1
    assert new_questions[0]["id"] != q1["id"]
    assert new_questions[0]["form_id"] == new_form["id"]
    assert new_questions[0]["title"] == q1["title"]
    assert new_questions[0]["type"] == "short_text"
    assert new_questions[0]["description"] == "Please provide your first and last name"
    assert new_questions[0]["required"] is True
    assert new_questions[0]["order_index"] == 0

    # Check question 2
    assert new_questions[1]["id"] != q2["id"]
    assert new_questions[1]["form_id"] == new_form["id"]
    assert new_questions[1]["title"] == q2["title"]
    assert new_questions[1]["type"] == "rating"
    assert new_questions[1]["required"] is True
    assert new_questions[1]["order_index"] == 1
    assert new_questions[1]["settings"]["min_rating"] == 1
    assert new_questions[1]["settings"]["max_rating"] == 5

    # Check question 3
    assert new_questions[2]["id"] != q3["id"]
    assert new_questions[2]["form_id"] == new_form["id"]
    assert new_questions[2]["title"] == q3["title"]
    assert new_questions[2]["type"] == "dropdown"
    assert new_questions[2]["required"] is False
    assert new_questions[2]["order_index"] == 2
    assert new_questions[2]["settings"]["options"] == ["Google", "Social Media", "Friend"]

    # 7. Verify responses for new form are completely empty
    new_responses_res = client.get(f"/api/forms/{new_form['id']}/responses")
    assert new_responses_res.status_code == 200
    assert len(new_responses_res.json()) == 0

    # 8. Verify original form remains completely unchanged
    orig_after = client.get(f"/api/forms/{orig_id}")
    assert orig_after.status_code == 200
    assert orig_after.json()["title"] == "Customer Feedback"
    assert orig_after.json()["status"] == "published"
    assert orig_after.json()["response_count"] == 1

    orig_q_after = client.get(f"/api/forms/{orig_id}/questions")
    assert len(orig_q_after.json()) == 3
    assert [q["id"] for q in orig_q_after.json()] == [q1["id"], q2["id"], q3["id"]]


def test_duplicate_empty_form(client: TestClient) -> None:
    # Form with 0 questions copies properly with 0 questions
    create_res = client.post("/api/forms", json={"title": "Empty Form"})
    orig_id = create_res.json()["id"]

    dup_res = client.post(f"/api/forms/{orig_id}/duplicate")
    assert dup_res.status_code == 201
    new_form = dup_res.json()
    assert new_form["title"] == "Empty Form (Copy)"
    assert new_form["status"] == "draft"

    questions_res = client.get(f"/api/forms/{new_form['id']}/questions")
    assert questions_res.status_code == 200
    assert len(questions_res.json()) == 0


def test_duplicate_nonexistent_form(client: TestClient) -> None:
    res = client.post("/api/forms/99999/duplicate")
    assert res.status_code == 404
    assert "not found" in res.json()["detail"].lower()


def test_duplicate_multiple_times_unique_slugs(client: TestClient) -> None:
    create_res = client.post("/api/forms", json={"title": "Template"})
    orig_id = create_res.json()["id"]

    dup1 = client.post(f"/api/forms/{orig_id}/duplicate").json()
    dup2 = client.post(f"/api/forms/{orig_id}/duplicate").json()

    assert dup1["id"] != dup2["id"]
    assert dup1["title"] == "Template (Copy)"
    assert dup2["title"] == "Template (Copy)"
    assert dup1["slug"] != dup2["slug"]
    assert "template-copy" in dup1["slug"]
    assert "template-copy-2" in dup2["slug"]

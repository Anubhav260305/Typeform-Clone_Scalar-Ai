from fastapi.testclient import TestClient


def _create_form(client: TestClient, title: str = "Test Form") -> int:
    res = client.post("/api/forms", json={"title": title})
    assert res.status_code == 201
    return res.json()["id"]


def test_create_question_defaults(client: TestClient) -> None:
    form_id = _create_form(client)

    res = client.post(
        f"/api/forms/{form_id}/questions",
        json={
            "title": "What is your name?",
            "type": "short_text",
            "description": "Please enter your full name",
            "required": True,
        },
    )
    assert res.status_code == 201
    data = res.json()
    assert data["form_id"] == form_id
    assert data["title"] == "What is your name?"
    assert data["type"] == "short_text"
    assert data["description"] == "Please enter your full name"
    assert data["required"] is True
    assert data["order_index"] == 0
    assert "id" in data


def test_create_question_auto_order_index(client: TestClient) -> None:
    form_id = _create_form(client)

    q1 = client.post(
        f"/api/forms/{form_id}/questions",
        json={"title": "Q1", "type": "short_text"},
    ).json()
    q2 = client.post(
        f"/api/forms/{form_id}/questions",
        json={"title": "Q2", "type": "long_text"},
    ).json()
    q3 = client.post(
        f"/api/forms/{form_id}/questions",
        json={"title": "Q3", "type": "email"},
    ).json()

    assert q1["order_index"] == 0
    assert q2["order_index"] == 1
    assert q3["order_index"] == 2


def test_all_supported_question_types(client: TestClient) -> None:
    form_id = _create_form(client)

    test_payloads = [
        {"title": "Short Text", "type": "short_text"},
        {"title": "Long Text", "type": "long_text"},
        {
            "title": "Multiple Choice",
            "type": "multiple_choice",
            "settings": {"options": ["Option A", "Option B", "Option C"]},
        },
        {
            "title": "Dropdown",
            "type": "dropdown",
            "settings": {"options": ["Cat", "Dog", "Bird"]},
        },
        {"title": "Email Address", "type": "email"},
        {"title": "Age", "type": "number", "settings": {"min": 0, "max": 120}},
        {"title": "Yes or No", "type": "yes_no"},
        {
            "title": "Rating",
            "type": "rating",
            "settings": {"min_rating": 1, "max_rating": 10},
        },
    ]

    for payload in test_payloads:
        res = client.post(f"/api/forms/{form_id}/questions", json=payload)
        assert res.status_code == 201, f"Failed for {payload['type']}: {res.text}"
        data = res.json()
        assert data["type"] == payload["type"]
        assert data["title"] == payload["title"]


def test_list_questions_ordered(client: TestClient) -> None:
    form_id = _create_form(client)

    client.post(
        f"/api/forms/{form_id}/questions",
        json={"title": "First", "type": "short_text", "order_index": 10},
    )
    client.post(
        f"/api/forms/{form_id}/questions",
        json={"title": "Second", "type": "short_text", "order_index": 5},
    )
    client.post(
        f"/api/forms/{form_id}/questions",
        json={"title": "Third", "type": "short_text", "order_index": 1},
    )

    res = client.get(f"/api/forms/{form_id}/questions")
    assert res.status_code == 200
    questions = res.json()
    assert len(questions) == 3
    # Check ordering by order_index ascending: 1, 5, 10
    assert [q["order_index"] for q in questions] == [1, 5, 10]
    assert [q["title"] for q in questions] == ["Third", "Second", "First"]


def test_update_question(client: TestClient) -> None:
    form_id = _create_form(client)
    create_res = client.post(
        f"/api/forms/{form_id}/questions",
        json={"title": "Initial Title", "type": "short_text", "required": False},
    )
    q_id = create_res.json()["id"]

    patch_res = client.patch(
        f"/api/questions/{q_id}",
        json={
            "title": "Updated Title",
            "required": True,
            "type": "rating",
            "settings": {"min_rating": 1, "max_rating": 5},
        },
    )
    assert patch_res.status_code == 200
    updated = patch_res.json()
    assert updated["title"] == "Updated Title"
    assert updated["required"] is True
    assert updated["type"] == "rating"
    assert updated["settings"] == {"min_rating": 1, "max_rating": 5}


def test_delete_question(client: TestClient) -> None:
    form_id = _create_form(client)
    create_res = client.post(
        f"/api/forms/{form_id}/questions",
        json={"title": "Delete Me", "type": "short_text"},
    )
    q_id = create_res.json()["id"]

    del_res = client.delete(f"/api/questions/{q_id}")
    assert del_res.status_code == 204

    get_res = client.get(f"/api/questions/{q_id}")
    assert get_res.status_code == 404


def test_question_reordering(client: TestClient) -> None:
    form_id = _create_form(client)
    q1 = client.post(
        f"/api/forms/{form_id}/questions", json={"title": "A", "type": "short_text"}
    ).json()["id"]
    q2 = client.post(
        f"/api/forms/{form_id}/questions", json={"title": "B", "type": "short_text"}
    ).json()["id"]
    q3 = client.post(
        f"/api/forms/{form_id}/questions", json={"title": "C", "type": "short_text"}
    ).json()["id"]

    # Reorder to [q3, q1, q2]
    res = client.put(
        f"/api/forms/{form_id}/questions/reorder",
        json={"question_ids": [q3, q1, q2]},
    )
    assert res.status_code == 200
    reordered = res.json()
    assert [q["id"] for q in reordered] == [q3, q1, q2]
    assert [q["order_index"] for q in reordered] == [0, 1, 2]

    # Confirm persistence by fetching list
    list_res = client.get(f"/api/forms/{form_id}/questions")
    assert [q["id"] for q in list_res.json()] == [q3, q1, q2]


def test_reorder_duplicate_ids(client: TestClient) -> None:
    form_id = _create_form(client)
    q1 = client.post(
        f"/api/forms/{form_id}/questions", json={"title": "A", "type": "short_text"}
    ).json()["id"]
    q2 = client.post(
        f"/api/forms/{form_id}/questions", json={"title": "B", "type": "short_text"}
    ).json()["id"]

    res = client.put(
        f"/api/forms/{form_id}/questions/reorder",
        json={"question_ids": [q1, q1]},
    )
    assert res.status_code == 400
    assert "unique" in res.json()["detail"].lower()


def test_reorder_question_belonging_to_another_form(client: TestClient) -> None:
    form1_id = _create_form(client, "Form 1")
    form2_id = _create_form(client, "Form 2")

    q_form1 = client.post(
        f"/api/forms/{form1_id}/questions", json={"title": "F1 Q", "type": "short_text"}
    ).json()["id"]
    q_form2 = client.post(
        f"/api/forms/{form2_id}/questions", json={"title": "F2 Q", "type": "short_text"}
    ).json()["id"]

    # Try to reorder form 1 with a question from form 2
    res = client.put(
        f"/api/forms/{form1_id}/questions/reorder",
        json={"question_ids": [q_form1, q_form2]},
    )
    assert res.status_code == 400
    assert "must match" in res.json()["detail"].lower()


def test_invalid_question_type(client: TestClient) -> None:
    form_id = _create_form(client)
    res = client.post(
        f"/api/forms/{form_id}/questions",
        json={"title": "Bad Type", "type": "unsupported_magic_type"},
    )
    assert res.status_code in (400, 422)


def test_invalid_form_id(client: TestClient) -> None:
    res = client.post(
        "/api/forms/99999/questions",
        json={"title": "No Form", "type": "short_text"},
    )
    assert res.status_code == 404


def test_invalid_settings_for_type(client: TestClient) -> None:
    form_id = _create_form(client)

    # multiple_choice requires options
    mc_res = client.post(
        f"/api/forms/{form_id}/questions",
        json={"title": "MC without options", "type": "multiple_choice", "settings": {}},
    )
    assert mc_res.status_code == 400
    assert "options" in mc_res.json()["detail"].lower()

    # rating with invalid range (min >= max)
    rating_res = client.post(
        f"/api/forms/{form_id}/questions",
        json={
            "title": "Invalid Rating",
            "type": "rating",
            "settings": {"min_rating": 5, "max_rating": 2},
        },
    )
    assert rating_res.status_code == 400
    assert "scale" in rating_res.json()["detail"].lower() or "invalid" in rating_res.json()["detail"].lower()


def test_deleting_form_deletes_its_questions(client: TestClient) -> None:
    form_id = _create_form(client)
    q1 = client.post(
        f"/api/forms/{form_id}/questions", json={"title": "Q1", "type": "short_text"}
    ).json()["id"]
    q2 = client.post(
        f"/api/forms/{form_id}/questions", json={"title": "Q2", "type": "long_text"}
    ).json()["id"]

    # Verify questions exist
    assert client.get(f"/api/questions/{q1}").status_code == 200
    assert client.get(f"/api/questions/{q2}").status_code == 200

    # Delete parent form
    del_form = client.delete(f"/api/forms/{form_id}")
    assert del_form.status_code == 204

    # Verify questions are cascade deleted
    assert client.get(f"/api/questions/{q1}").status_code == 404
    assert client.get(f"/api/questions/{q2}").status_code == 404
    assert client.get(f"/api/forms/{form_id}/questions").status_code == 404

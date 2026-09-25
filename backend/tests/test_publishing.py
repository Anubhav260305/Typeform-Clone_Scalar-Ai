from fastapi.testclient import TestClient


def _create_form(client: TestClient, title: str = "Test Survey") -> int:
    res = client.post("/api/forms", json={"title": title})
    assert res.status_code == 201
    return res.json()["id"]


def _add_question(client: TestClient, form_id: int, title: str = "Q1", q_type: str = "short_text", **kwargs) -> int:
    payload = {"title": title, "type": q_type, **kwargs}
    res = client.post(f"/api/forms/{form_id}/questions", json=payload)
    assert res.status_code == 201
    return res.json()["id"]


# ==================================================
# 1. PUBLISHING TESTS
# ==================================================


def test_publish_valid_form(client: TestClient) -> None:
    form_id = _create_form(client)
    _add_question(client, form_id, "Your Name", "short_text")
    _add_question(client, form_id, "Your Rating", "rating", settings={"min_rating": 1, "max_rating": 5})

    res = client.post(f"/api/forms/{form_id}/publish")
    assert res.status_code == 200
    data = res.json()
    assert data["id"] == form_id
    assert data["status"] == "published"


def test_publish_nonexistent_form(client: TestClient) -> None:
    res = client.post("/api/forms/99999/publish")
    assert res.status_code == 404


def test_publish_empty_form(client: TestClient) -> None:
    # Form with zero questions cannot be published
    form_id = _create_form(client, "Empty Form")
    res = client.post(f"/api/forms/{form_id}/publish")
    assert res.status_code == 400
    assert "without any questions" in res.json()["detail"].lower()


def test_publish_already_published_form_is_idempotent(client: TestClient) -> None:
    form_id = _create_form(client)
    _add_question(client, form_id, "Question 1")

    res1 = client.post(f"/api/forms/{form_id}/publish")
    assert res1.status_code == 200
    assert res1.json()["status"] == "published"

    # Second call succeeds idempotently
    res2 = client.post(f"/api/forms/{form_id}/publish")
    assert res2.status_code == 200
    assert res2.json()["status"] == "published"


def test_unpublish_published_form(client: TestClient) -> None:
    form_id = _create_form(client)
    _add_question(client, form_id, "Q1")
    client.post(f"/api/forms/{form_id}/publish")

    res = client.post(f"/api/forms/{form_id}/unpublish")
    assert res.status_code == 200
    assert res.json()["status"] == "draft"


def test_unpublish_already_draft_form_is_idempotent(client: TestClient) -> None:
    form_id = _create_form(client)  # Already draft
    res = client.post(f"/api/forms/{form_id}/unpublish")
    assert res.status_code == 200
    assert res.json()["status"] == "draft"


def test_unpublish_nonexistent_form(client: TestClient) -> None:
    res = client.post("/api/forms/99999/unpublish")
    assert res.status_code == 404


# ==================================================
# 2. PUBLIC API TESTS
# ==================================================


def test_retrieve_published_form_by_slug(client: TestClient) -> None:
    form_id = _create_form(client, "Customer Feedback")
    _add_question(client, form_id, "What is your name?", "short_text", required=True, order_index=0)
    _add_question(
        client,
        form_id,
        "How would you rate us?",
        "rating",
        required=True,
        order_index=1,
        settings={"min_rating": 1, "max_rating": 5},
    )
    form_data = client.post(f"/api/forms/{form_id}/publish").json()
    slug = form_data["slug"]

    res = client.get(f"/api/public/forms/{slug}")
    assert res.status_code == 200
    public_form = res.json()
    assert public_form["id"] == form_id
    assert public_form["title"] == "Customer Feedback"
    assert public_form["slug"] == slug
    assert len(public_form["questions"]) == 2

    # Check questions ordered by order_index
    q0 = public_form["questions"][0]
    q1 = public_form["questions"][1]
    assert q0["order_index"] == 0
    assert q0["title"] == "What is your name?"
    assert q0["type"] == "short_text"
    assert q0["required"] is True

    assert q1["order_index"] == 1
    assert q1["title"] == "How would you rate us?"
    assert q1["type"] == "rating"
    assert q1["settings"] == {"min_rating": 1, "max_rating": 5}


def test_public_api_draft_form_returns_404(client: TestClient) -> None:
    form_id = _create_form(client, "Draft Survey")
    _add_question(client, form_id, "Q1")
    form_data = client.get(f"/api/forms/{form_id}").json()
    slug = form_data["slug"]
    assert form_data["status"] == "draft"

    # Draft form must return 404 on public route
    res = client.get(f"/api/public/forms/{slug}")
    assert res.status_code == 404


def test_public_api_nonexistent_slug_returns_404(client: TestClient) -> None:
    res = client.get("/api/public/forms/non-existent-slug-xyz")
    assert res.status_code == 404


def test_public_schema_does_not_expose_unnecessary_internal_fields(client: TestClient) -> None:
    form_id = _create_form(client, "Clean Public View")
    _add_question(client, form_id, "Q1", "short_text")
    slug = client.post(f"/api/forms/{form_id}/publish").json()["slug"]

    res = client.get(f"/api/public/forms/{slug}")
    assert res.status_code == 200
    data = res.json()

    # Form level fields
    assert set(data.keys()) == {"id", "title", "slug", "questions"}
    assert "status" not in data
    assert "created_at" not in data
    assert "updated_at" not in data

    # Question level fields
    q = data["questions"][0]
    assert set(q.keys()) == {"id", "type", "title", "description", "required", "order_index", "settings"}
    assert "form_id" not in q
    assert "created_at" not in q
    assert "updated_at" not in q


# ==================================================
# 3. DASHBOARD RESPONSE COUNT TESTS
# ==================================================


def test_forms_list_and_detail_include_response_count(client: TestClient) -> None:
    form1_id = _create_form(client, "Form A")
    q1 = _add_question(client, form1_id, "Q")
    client.post(f"/api/forms/{form1_id}/publish")

    form2_id = _create_form(client, "Form B")
    _add_question(client, form2_id, "Q")
    client.post(f"/api/forms/{form2_id}/publish")

    # Initially both counts are 0
    forms = {f["id"]: f for f in client.get("/api/forms").json()}
    assert forms[form1_id]["response_count"] == 0
    assert forms[form2_id]["response_count"] == 0

    # Submit 2 responses to Form A
    client.post(f"/api/forms/{form1_id}/responses", json={"answers": [{"question_id": q1, "value": "R1"}]})
    client.post(f"/api/forms/{form1_id}/responses", json={"answers": [{"question_id": q1, "value": "R2"}]})

    # Verify counts in list endpoint
    updated_forms = {f["id"]: f for f in client.get("/api/forms").json()}
    assert updated_forms[form1_id]["response_count"] == 2
    assert updated_forms[form2_id]["response_count"] == 0

    # Verify counts in GET single form endpoint
    f1_detail = client.get(f"/api/forms/{form1_id}").json()
    assert f1_detail["response_count"] == 2

    f2_detail = client.get(f"/api/forms/{form2_id}").json()
    assert f2_detail["response_count"] == 0


# ==================================================
# 4. SLUG BEHAVIOR & STABILITY TESTS
# ==================================================


def test_slug_remains_unchanged_after_title_update(client: TestClient) -> None:
    form_id = _create_form(client, "Original Survey Title")
    original_slug = client.get(f"/api/forms/{form_id}").json()["slug"]
    assert original_slug == "original-survey-title"

    # Update form title
    patch_res = client.patch(f"/api/forms/{form_id}", json={"title": "Completely Different Title"})
    assert patch_res.status_code == 200
    updated_data = patch_res.json()
    assert updated_data["title"] == "Completely Different Title"
    assert updated_data["slug"] == original_slug  # Slug remains stable!


def test_duplicate_titles_produce_unique_slugs(client: TestClient) -> None:
    f1 = client.post("/api/forms", json={"title": "Customer Feedback"}).json()
    f2 = client.post("/api/forms", json={"title": "Customer Feedback"}).json()
    f3 = client.post("/api/forms", json={"title": "Customer Feedback"}).json()

    assert f1["slug"] == "customer-feedback"
    assert f2["slug"] == "customer-feedback-2"
    assert f3["slug"] == "customer-feedback-3"

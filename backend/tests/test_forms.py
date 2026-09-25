from fastapi.testclient import TestClient


def test_create_form(client: TestClient) -> None:
    res = client.post("/api/forms", json={"title": "Customer Survey"})
    assert res.status_code == 201
    data = res.json()
    assert data["title"] == "Customer Survey"
    assert data["slug"] == "customer-survey"
    assert data["status"] == "draft"
    assert "id" in data


def test_create_form_slug_collision(client: TestClient) -> None:
    res1 = client.post("/api/forms", json={"title": "Feedback"})
    assert res1.status_code == 201
    assert res1.json()["slug"] == "feedback"

    res2 = client.post("/api/forms", json={"title": "Feedback"})
    assert res2.status_code == 201
    assert res2.json()["slug"] == "feedback-2"


def test_list_forms(client: TestClient) -> None:
    client.post("/api/forms", json={"title": "Form 1"})
    client.post("/api/forms", json={"title": "Form 2"})
    res = client.get("/api/forms")
    assert res.status_code == 200
    forms = res.json()
    assert len(forms) >= 2


def test_get_form(client: TestClient) -> None:
    create_res = client.post("/api/forms", json={"title": "Target Form"})
    form_id = create_res.json()["id"]

    res = client.get(f"/api/forms/{form_id}")
    assert res.status_code == 200
    assert res.json()["title"] == "Target Form"


def test_get_form_not_found(client: TestClient) -> None:
    res = client.get("/api/forms/99999")
    assert res.status_code == 404
    assert "not found" in res.json()["detail"].lower()


def test_update_form(client: TestClient) -> None:
    create_res = client.post("/api/forms", json={"title": "Old Title"})
    form_id = create_res.json()["id"]

    res = client.patch(f"/api/forms/{form_id}", json={"title": "New Title"})
    assert res.status_code == 200
    assert res.json()["title"] == "New Title"


def test_delete_form(client: TestClient) -> None:
    create_res = client.post("/api/forms", json={"title": "To Delete"})
    form_id = create_res.json()["id"]

    del_res = client.delete(f"/api/forms/{form_id}")
    assert del_res.status_code == 204

    get_res = client.get(f"/api/forms/{form_id}")
    assert get_res.status_code == 404

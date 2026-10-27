from fastapi.testclient import TestClient
from sqlalchemy import func, select

from app.db.models import Conversation, Message, SymptomAssessment
from app.main import create_app
from tests.conftest import CLIENT_HEADERS

URL = "/api/v1/safety/check"


def test_guest_can_check_without_login(client):
    res = client.post(URL, json={"text": "I can't breathe", "language": "en"})
    assert res.status_code == 200
    assert res.json() == {"level": "emergency", "categories": ["breathing"], "rule_ids": ["breathing_severe"]}


def test_ordinary_text(client):
    assert client.post(URL, json={"text": "mild cold", "language": "en"}).json()["level"] == "none"


def test_tamil_and_hindi(client):
    assert client.post(URL, json={"text": "நெஞ்சு வலி", "language": "ta"}).json()["categories"] == ["chest_pain"]
    assert client.post(URL, json={"text": "पेशाब में खून", "language": "hi"}).json()["level"] == "urgent"


def test_nothing_is_stored(client, db):
    client.post(URL, json={"text": "I want to kill myself", "language": "en"})
    for model in (Conversation, Message, SymptomAssessment):
        assert db.scalar(select(func.count()).select_from(model)) == 0


def test_validation(client):
    for payload in ({"text": "", "language": "en"}, {"text": "x" * 2001, "language": "en"}, {"text": "hi", "language": "fr"}, {"text": "hi"}):
        assert client.post(URL, json=payload).status_code == 422


def test_requires_client_header(app):
    with TestClient(app) as bare:
        assert bare.post(URL, json={"text": "hi", "language": "en"}).status_code == 403


def test_rate_limited(settings, engine):
    app = create_app(settings.model_copy(update={"safety_rate_limit": 2}), engine)
    with TestClient(app, headers=CLIENT_HEADERS) as c:
        assert c.post(URL, json={"text": "a", "language": "en"}).status_code == 200
        assert c.post(URL, json={"text": "b", "language": "en"}).status_code == 200
        assert c.post(URL, json={"text": "c", "language": "en"}).status_code == 429

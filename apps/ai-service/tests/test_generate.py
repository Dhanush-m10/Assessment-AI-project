"""Endpoint + provider tests (scenarios A-Q from the Phase 3B brief).

All provider calls are mocked (tests/conftest.py). No real Gemini calls, no
real credentials.
"""
from __future__ import annotations

import pytest
from fastapi.testclient import TestClient

from app.providers import ProviderError, ProviderTimeoutError
from app.providers.gemini_provider import _parse_json_object
from conftest import (
    API_KEY,
    CODING_BODY,
    HEADERS,
    MCQ_BODY,
    SECRET,
    WRONG_HEADERS,
    coding_payload,
    mcq_payload,
)

MCQ_URL = "/generate-mcq"
CODING_URL = "/generate-coding"


# ------------------------------------------------------------------ A. health


def test_a_health_works_without_any_config(client_no_secret):
    resp = client_no_secret.get("/health")
    assert resp.status_code == 200
    assert resp.json() == {"status": "ok", "service": "ai-service"}


def test_a2_health_works_without_gemini_key(client_no_api_key):
    resp = client_no_api_key.get("/health")
    assert resp.status_code == 200
    assert resp.json()["status"] == "ok"


# ---------------------------------------------------- B/C. authentication


def test_b_missing_secret_is_401_and_no_provider_call(client, provider):
    fake = provider(payload=mcq_payload())
    resp = client.post(MCQ_URL, json=MCQ_BODY)  # no header
    assert resp.status_code == 401
    body = resp.json()
    assert body["error"] == "unauthorized"
    assert "message" in body
    assert fake.calls == 0


def test_c_wrong_secret_is_401_and_no_provider_call(client, provider):
    fake = provider(payload=mcq_payload())
    resp = client.post(MCQ_URL, json=MCQ_BODY, headers=WRONG_HEADERS)
    assert resp.status_code == 401
    assert resp.json()["error"] == "unauthorized"
    assert fake.calls == 0


def test_c2_unconfigured_secret_fails_closed(client_no_secret, provider):
    fake = provider(payload=mcq_payload())
    resp = client_no_secret.post(MCQ_URL, json=MCQ_BODY, headers=HEADERS)
    assert resp.status_code == 401
    assert fake.calls == 0


# ------------------------------------------------- D/G. valid generation


def test_d_valid_mcq_request(client, provider):
    provider(payload=mcq_payload(n=2, difficulty="MEDIUM"))
    resp = client.post(MCQ_URL, json=MCQ_BODY, headers=HEADERS)
    assert resp.status_code == 200
    body = resp.json()
    assert len(body["questions"]) == 2
    item = body["questions"][0]
    assert set(item.keys()) == {"question", "options", "difficulty"}  # no raw provider fields
    assert item["difficulty"] == "MEDIUM"
    assert len(item["options"]) == 4
    assert all(set(o.keys()) == {"text", "is_correct"} for o in item["options"])
    assert sum(o["is_correct"] for o in item["options"]) == 1


def test_d2_provider_receives_requested_context(client, provider):
    fake = provider(payload=mcq_payload())
    client.post(MCQ_URL, json=MCQ_BODY, headers=HEADERS)
    assert "Skill" not in fake.last_user_prompt  # optional context omitted when absent
    assert "Area of interest: Aptitude" in fake.last_user_prompt
    assert "Difficulty: MEDIUM" in fake.last_user_prompt
    assert "Number of questions: 2" in fake.last_user_prompt


def test_g_valid_coding_request(client, provider):
    provider(payload=coding_payload(n=1, language="python", difficulty="EASY"))
    resp = client.post(CODING_URL, json=CODING_BODY, headers=HEADERS)
    assert resp.status_code == 200
    body = resp.json()
    assert len(body["questions"]) == 1
    item = body["questions"][0]
    assert set(item.keys()) == {
        "title",
        "problem_statement",
        "language",
        "starter_code",
        "constraints",
        "test_cases",
        "difficulty",
    }
    assert item["language"] == "python"
    vis = {t["visibility"] for t in item["test_cases"]}
    assert vis == {"PUBLIC", "HIDDEN"}


# ------------------------------------------------ E/F/H. count bounds (422)


def test_e_mcq_count_over_50_rejected(client, provider):
    fake = provider(payload=mcq_payload())
    resp = client.post(MCQ_URL, json={**MCQ_BODY, "count": 51}, headers=HEADERS)
    assert resp.status_code == 422
    assert fake.calls == 0


def test_f_mcq_count_zero_or_negative_rejected(client, provider):
    fake = provider(payload=mcq_payload())
    for bad in (0, -1):
        resp = client.post(MCQ_URL, json={**MCQ_BODY, "count": bad}, headers=HEADERS)
        assert resp.status_code == 422
    assert fake.calls == 0


def test_h_coding_count_over_10_rejected(client, provider):
    fake = provider(payload=coding_payload())
    resp = client.post(CODING_URL, json={**CODING_BODY, "count": 11}, headers=HEADERS)
    assert resp.status_code == 422
    assert fake.calls == 0


def test_422_for_invalid_enums_and_long_fields(client, provider):
    fake = provider(payload=mcq_payload())
    cases = [
        (MCQ_URL, {**MCQ_BODY, "flow": "NOT_A_FLOW"}),
        (MCQ_URL, {**MCQ_BODY, "difficulty": "SUPERHARD"}),
        (MCQ_URL, {**MCQ_BODY, "area": "x" * 121}),
        (CODING_URL, {**CODING_BODY, "flow": "GENERAL"}),
        (CODING_URL, {**CODING_BODY, "language": "  "}),
    ]
    for url, body in cases:
        resp = client.post(url, json=body, headers=HEADERS)
        assert resp.status_code == 422, (url, body)
    assert fake.calls == 0


# --------------------------------------------- I. malformed provider output


def test_i_malformed_provider_output_is_502(client, provider):
    provider(payload={"questions": "not-a-list"})
    resp = client.post(MCQ_URL, json=MCQ_BODY, headers=HEADERS)
    assert resp.status_code == 502
    assert resp.json()["error"] == "malformed-provider-output"


def test_i2_wrong_item_count_is_502(client, provider):
    provider(payload=mcq_payload(n=1))  # request asked for 2
    resp = client.post(MCQ_URL, json=MCQ_BODY, headers=HEADERS)
    assert resp.status_code == 502
    assert resp.json()["error"] == "malformed-provider-output"


def test_i3_json_parser_rejects_garbage_and_non_objects():
    with pytest.raises(ProviderError):
        _parse_json_object("this is not json at all")
    with pytest.raises(ProviderError):
        _parse_json_object("[1, 2, 3]")  # valid JSON, not an object
    assert _parse_json_object('```json\n{"questions": []}\n```') == {"questions": []}


def test_i4_extra_provider_fields_are_stripped_from_response(client, provider):
    payload = mcq_payload()
    payload["questions"][0]["provider_specific_field"] = "must not leak"
    payload["model_usage"] = {"total_tokens": 1234}
    provider(payload=payload)
    resp = client.post(MCQ_URL, json=MCQ_BODY, headers=HEADERS)
    assert resp.status_code == 200
    text = resp.text
    assert "provider_specific_field" not in text
    assert "model_usage" not in text


# ------------------------------------- J/K/L/M. structural rejections (502)


def test_j_multiple_correct_options_rejected(client, provider):
    payload = mcq_payload(n=2)
    payload["questions"][0]["options"][2]["is_correct"] = True  # now 2 correct
    provider(payload=payload)
    resp = client.post(MCQ_URL, json=MCQ_BODY, headers=HEADERS)
    assert resp.status_code == 502
    assert resp.json()["error"] == "malformed-provider-output"


def test_k_zero_correct_options_rejected(client, provider):
    payload = mcq_payload(n=2)
    for opt in payload["questions"][0]["options"]:
        opt["is_correct"] = False
    provider(payload=payload)
    resp = client.post(MCQ_URL, json=MCQ_BODY, headers=HEADERS)
    assert resp.status_code == 502


def test_k2_wrong_option_count_rejected(client, provider):
    payload = mcq_payload(n=2)
    payload["questions"][0]["options"] = payload["questions"][0]["options"][:3]
    provider(payload=payload)
    resp = client.post(MCQ_URL, json=MCQ_BODY, headers=HEADERS)
    assert resp.status_code == 502


def test_k3_difficulty_mismatch_rejected(client, provider):
    provider(payload=mcq_payload(n=2, difficulty="HARD"))  # request wants MEDIUM
    resp = client.post(MCQ_URL, json=MCQ_BODY, headers=HEADERS)
    assert resp.status_code == 502


def test_j2_duplicate_question_text_in_batch_rejected(client, provider):
    payload = mcq_payload(n=2)
    payload["questions"][1]["question"] = payload["questions"][0]["question"]
    provider(payload=payload)
    resp = client.post(MCQ_URL, json=MCQ_BODY, headers=HEADERS)
    assert resp.status_code == 502


def test_l_duplicate_coding_test_inputs_rejected(client, provider):
    payload = coding_payload()
    payload["questions"][0]["test_cases"][1]["input"] = payload["questions"][0]["test_cases"][0]["input"]
    provider(payload=payload)
    resp = client.post(CODING_URL, json=CODING_BODY, headers=HEADERS)
    assert resp.status_code == 502
    assert resp.json()["error"] == "malformed-provider-output"


def test_m_missing_public_or_hidden_test_rejected(client, provider):
    # all PUBLIC
    payload = coding_payload()
    payload["questions"][0]["test_cases"][1]["visibility"] = "PUBLIC"
    provider(payload=payload)
    resp = client.post(CODING_URL, json=CODING_BODY, headers=HEADERS)
    assert resp.status_code == 502
    # all HIDDEN
    payload = coding_payload()
    payload["questions"][0]["test_cases"][0]["visibility"] = "HIDDEN"
    provider(payload=payload)
    resp = client.post(CODING_URL, json=CODING_BODY, headers=HEADERS)
    assert resp.status_code == 502


def test_m2_coding_language_mismatch_rejected(client, provider):
    payload = coding_payload(language="javascript")  # request wants python
    provider(payload=payload)
    resp = client.post(CODING_URL, json=CODING_BODY, headers=HEADERS)
    assert resp.status_code == 502


def test_m3_empty_starter_code_rejected(client, provider):
    payload = coding_payload()
    payload["questions"][0]["starter_code"] = "   "
    provider(payload=payload)
    resp = client.post(CODING_URL, json=CODING_BODY, headers=HEADERS)
    assert resp.status_code == 502


# ------------------------------------------- N/O. provider failures


def test_n_provider_timeout_is_controlled_504(client, provider):
    provider(exc=ProviderTimeoutError("provider timed out"))
    resp = client.post(MCQ_URL, json=MCQ_BODY, headers=HEADERS)
    assert resp.status_code == 504
    body = resp.json()
    assert body["error"] == "provider-timeout"
    assert "timed out" in body["message"].lower()


def test_o_provider_failure_is_controlled_502(client, provider):
    provider(exc=ProviderError("provider API error: InternalServerError"))
    resp = client.post(CODING_URL, json=CODING_BODY, headers=HEADERS)
    assert resp.status_code == 502
    body = resp.json()
    assert body["error"] == "provider-error"
    assert "InternalServerError" not in resp.text  # no raw provider detail leaks


# ------------------------------------------- P. missing provider config


def test_p_missing_gemini_key_is_controlled_503(client_no_api_key):
    resp = client_no_api_key.post(MCQ_URL, json=MCQ_BODY, headers=HEADERS)
    assert resp.status_code == 503
    body = resp.json()
    assert body["error"] == "configuration-error"
    assert GEMINI_KEY_NOT_MENTIONED(resp.text)


def GEMINI_KEY_NOT_MENTIONED(text: str) -> bool:
    return "GEMINI_API_KEY" not in text and API_KEY not in text


# ------------------------------------------- Q. secret hygiene


def test_q_secrets_never_appear_in_responses(client, provider):
    # 401
    r1 = client.post(MCQ_URL, json=MCQ_BODY)
    # 503 (no API key) is covered by client_no_api_key; here: 502 + 200 paths
    provider(payload={"questions": "bad"})
    r2 = client.post(MCQ_URL, json=MCQ_BODY, headers=HEADERS)
    provider(payload=mcq_payload())
    r3 = client.post(MCQ_URL, json=MCQ_BODY, headers=HEADERS)
    for resp in (r1, r2, r3):
        assert SECRET not in resp.text
        assert API_KEY not in resp.text


def test_q2_error_envelope_shape_is_consistent(client, provider):
    codes = {401: None, 502: None, 504: None}
    r = client.post(MCQ_URL, json=MCQ_BODY)
    codes[401] = r.json()
    provider(exc=ProviderError("boom"))
    r = client.post(MCQ_URL, json=MCQ_BODY, headers=HEADERS)
    codes[502] = r.json()
    provider(exc=ProviderTimeoutError("slow"))
    r = client.post(MCQ_URL, json=MCQ_BODY, headers=HEADERS)
    codes[504] = r.json()
    for body in codes.values():
        assert set(body.keys()) == {"error", "message"}
        assert isinstance(body["error"], str) and isinstance(body["message"], str)

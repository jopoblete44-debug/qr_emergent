"""
Backend API tests for lead anti-spam and notifications.
These tests assume the backend is running and reachable via BASE_URL.
"""
import os
import uuid
import pytest
import requests

BASE_URL = os.environ.get('REACT_APP_BACKEND_URL', 'http://localhost:8001').rstrip('/')
ADMIN_EMAIL = "admin@qrprofiles.com"
ADMIN_PASSWORD = "admin123"


def login(email: str, password: str) -> str:
    response = requests.post(f"{BASE_URL}/api/auth/login", json={"email": email, "password": password})
    assert response.status_code == 200, f"Login failed for {email}: {response.status_code} {response.text}"
    return response.json()["token"]


def create_business_user_and_profile():
    unique = uuid.uuid4().hex[:8]
    email = f"TEST_leadsec_{unique}@test.com"
    password = "testpass123"

    register = requests.post(f"{BASE_URL}/api/auth/register", json={
        "email": email,
        "password": password,
        "name": f"Lead Security {unique}",
        "user_type": "business",
    })
    assert register.status_code == 200, f"Register failed: {register.status_code} {register.text}"
    token = register.json()["token"]
    headers = {"Authorization": f"Bearer {token}"}

    profile_resp = requests.post(f"{BASE_URL}/api/qr-profiles", headers=headers, json={
        "name": f"TEST_LeadProfile_{unique}",
        "alias": f"TEST_LeadAlias_{unique}",
        "profile_type": "business",
        "sub_type": "restaurante",
        "status": "indefinite",
        "data": {
            "description": "Test profile for leads security",
            "phone": "+56912345678",
        }
    })
    assert profile_resp.status_code == 200, f"Create profile failed: {profile_resp.status_code} {profile_resp.text}"
    profile = profile_resp.json()
    return profile["hash"]


@pytest.fixture(scope="module")
def admin_headers():
    token = login(ADMIN_EMAIL, ADMIN_PASSWORD)
    return {"Authorization": f"Bearer {token}", "Content-Type": "application/json"}


@pytest.fixture(scope="module")
def preserve_settings(admin_headers):
    current = requests.get(f"{BASE_URL}/api/admin/settings", headers=admin_headers)
    assert current.status_code == 200, f"Failed to fetch admin settings: {current.status_code}"
    original = current.json() if isinstance(current.json(), dict) else {}
    yield original
    restore = requests.put(f"{BASE_URL}/api/admin/settings", headers=admin_headers, json=original)
    assert restore.status_code == 200, f"Failed to restore settings: {restore.status_code} {restore.text}"


def update_settings(admin_headers, base_settings: dict, updates: dict):
    merged = dict(base_settings)
    merged.update(updates)
    response = requests.put(f"{BASE_URL}/api/admin/settings", headers=admin_headers, json=merged)
    assert response.status_code == 200, f"Failed to update settings: {response.status_code} {response.text}"


class TestLeadSecurity:
    def test_honeypot_blocks_submission(self, admin_headers, preserve_settings):
        update_settings(admin_headers, preserve_settings, {
            "enable_public_lead_form": True,
            "enable_lead_honeypot": True,
            "enable_lead_turnstile": False,
            "require_lead_phone_or_email": False,
            "lead_rate_limit_window_seconds": 60,
            "lead_rate_limit_max_requests": 5,
        })
        qr_hash = create_business_user_and_profile()
        resp = requests.post(f"{BASE_URL}/api/public/profile/{qr_hash}/lead", json={
            "name": "Bot User",
            "website": "https://spam.example.com",
            "message": "spam",
        })
        assert resp.status_code == 400, f"Expected honeypot rejection, got {resp.status_code} {resp.text}"

    def test_rate_limit_blocks_repeated_submissions(self, admin_headers, preserve_settings):
        update_settings(admin_headers, preserve_settings, {
            "enable_public_lead_form": True,
            "enable_lead_honeypot": False,
            "enable_lead_turnstile": False,
            "require_lead_phone_or_email": False,
            "lead_rate_limit_window_seconds": 120,
            "lead_rate_limit_max_requests": 1,
        })
        qr_hash = create_business_user_and_profile()
        headers = {"X-Forwarded-For": "190.10.10.10"}

        first = requests.post(f"{BASE_URL}/api/public/profile/{qr_hash}/lead", headers=headers, json={
            "name": "Lead One",
            "message": "first",
        })
        assert first.status_code == 200, f"First lead should pass: {first.status_code} {first.text}"

        second = requests.post(f"{BASE_URL}/api/public/profile/{qr_hash}/lead", headers=headers, json={
            "name": "Lead Two",
            "message": "second",
        })
        assert second.status_code == 429, f"Second lead should be rate-limited: {second.status_code} {second.text}"

    def test_notification_failures_do_not_break_lead_creation(self, admin_headers, preserve_settings):
        update_settings(admin_headers, preserve_settings, {
            "enable_public_lead_form": True,
            "enable_lead_honeypot": False,
            "enable_lead_turnstile": False,
            "require_lead_phone_or_email": False,
            "lead_rate_limit_window_seconds": 60,
            "lead_rate_limit_max_requests": 5,
            "enable_lead_notifications": True,
            "enable_notifications_email": False,
            "lead_notification_webhook_url": "http://127.0.0.1:9/invalid",
        })
        qr_hash = create_business_user_and_profile()
        resp = requests.post(f"{BASE_URL}/api/public/profile/{qr_hash}/lead", json={
            "name": "Lead Notification",
            "message": "should still succeed",
        })
        assert resp.status_code == 200, f"Lead creation should not fail on notification errors: {resp.status_code} {resp.text}"

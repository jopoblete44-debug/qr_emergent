"""
End-to-end growth funnel test:
scan -> action click -> lead -> owner analytics + CSV export.

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


def register_business_user() -> str:
    unique = uuid.uuid4().hex[:10]
    email = f"TEST_funnel_{unique}@test.com"
    response = requests.post(f"{BASE_URL}/api/auth/register", json={
        "email": email,
        "password": "testpass123",
        "name": f"Funnel User {unique}",
        "user_type": "business",
    })
    assert response.status_code == 200, f"Register failed: {response.status_code} {response.text}"
    return response.json()["token"]


def create_business_profile(owner_token: str) -> dict:
    unique = uuid.uuid4().hex[:8]
    headers = {"Authorization": f"Bearer {owner_token}"}
    response = requests.post(f"{BASE_URL}/api/qr-profiles", headers=headers, json={
        "name": f"TEST_FunnelProfile_{unique}",
        "alias": f"TEST_FunnelAlias_{unique}",
        "profile_type": "business",
        "sub_type": "restaurante",
        "status": "indefinite",
        "data": {
            "description": "E2E funnel profile",
            "phone": "+56912345678",
            "whatsapp": "56912345678",
        },
    })
    assert response.status_code == 200, f"Create profile failed: {response.status_code} {response.text}"
    return response.json()


def update_settings(admin_headers: dict, base_settings: dict, updates: dict) -> None:
    merged = dict(base_settings)
    merged.update(updates)
    response = requests.put(f"{BASE_URL}/api/admin/settings", headers=admin_headers, json=merged)
    assert response.status_code == 200, f"Failed to update settings: {response.status_code} {response.text}"


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


class TestGrowthFunnelFlow:
    def test_public_funnel_events_reflect_in_owner_analytics_and_csv(self, admin_headers, preserve_settings):
        update_settings(admin_headers, preserve_settings, {
            "enable_public_lead_form": True,
            "enable_lead_honeypot": True,
            "enable_lead_turnstile": False,
            "require_lead_phone_or_email": False,
            "lead_rate_limit_window_seconds": 120,
            "lead_rate_limit_max_requests": 3,
        })

        owner_token = register_business_user()
        owner_headers = {"Authorization": f"Bearer {owner_token}"}
        profile = create_business_profile(owner_token)
        qr_hash = profile["hash"]

        scan_response = requests.post(f"{BASE_URL}/api/public/profile/{qr_hash}/scan", json={
            "lat": -33.4489,
            "lng": -70.6693,
            "user_agent": "Funnel Test Agent",
            "campaign_source": "e2e",
            "campaign_medium": "test",
            "campaign_name": "funnel-flow",
        })
        assert scan_response.status_code == 200, f"Scan failed: {scan_response.status_code} {scan_response.text}"
        assert scan_response.json().get("status") == "success"

        click_response = requests.post(f"{BASE_URL}/api/public/profile/{qr_hash}/action-click", json={
            "action_type": "whatsapp",
            "label": "Contact CTA",
            "url": "https://wa.me/56912345678",
            "campaign_source": "e2e",
            "campaign_medium": "test",
            "campaign_name": "funnel-flow",
        })
        assert click_response.status_code == 200, f"Action click failed: {click_response.status_code} {click_response.text}"
        assert click_response.json().get("status") == "success"

        lead_marker = f"E2E_FUNNEL_{uuid.uuid4().hex[:12]}"
        lead_response = requests.post(
            f"{BASE_URL}/api/public/profile/{qr_hash}/lead",
            headers={"X-Forwarded-For": "201.111.10.10"},
            json={
                "name": "Lead E2E",
                "email": f"lead_{uuid.uuid4().hex[:8]}@test.com",
                "message": lead_marker,
                "website": "",
                "campaign_source": "e2e",
                "campaign_medium": "test",
                "campaign_name": "funnel-flow",
            },
        )
        assert lead_response.status_code == 200, f"Lead failed: {lead_response.status_code} {lead_response.text}"
        assert lead_response.json().get("status") == "success"

        stats_response = requests.get(f"{BASE_URL}/api/statistics/overview", headers=owner_headers)
        assert stats_response.status_code == 200, f"Stats failed: {stats_response.status_code} {stats_response.text}"
        stats = stats_response.json()
        assert int(stats.get("total_scans", 0)) >= 1
        assert int(stats.get("total_action_clicks", 0)) >= 1
        assert int(stats.get("total_leads", 0)) >= 1

        export_response = requests.get(f"{BASE_URL}/api/leads/export", headers=owner_headers)
        assert export_response.status_code == 200, f"CSV export failed: {export_response.status_code} {export_response.text}"
        assert "text/csv" in export_response.headers.get("content-type", "").lower()
        csv_text = export_response.content.decode("utf-8-sig", errors="ignore")
        assert lead_marker in csv_text, "Lead marker not found in exported CSV"

"""
Tests for QR creation policy and subscription quota processing:
- Business accounts can create QR only with active subscription quota.
- Subscription quotas stack across multiple purchases.
- Only master accounts can buy subscription QR products.
- Master and subaccounts share the same quota pool.
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


def register_business_user() -> dict:
    unique = uuid.uuid4().hex[:10]
    email = f"TEST_qrpolicy_{unique}@test.com"
    password = "testpass123"
    response = requests.post(f"{BASE_URL}/api/auth/register", json={
        "email": email,
        "password": password,
        "name": f"QR Policy {unique}",
        "user_type": "business",
    })
    assert response.status_code == 200, f"Register failed: {response.status_code} {response.text}"
    return {
        "token": response.json()["token"],
        "email": email,
        "password": password,
    }


def create_business_qr(token: str, suffix: str = ""):
    unique = uuid.uuid4().hex[:8]
    headers = {"Authorization": f"Bearer {token}"}
    return requests.post(f"{BASE_URL}/api/qr-profiles", headers=headers, json={
        "name": f"TEST_QRPolicy_{suffix}_{unique}",
        "alias": f"TEST_QRPolicyAlias_{suffix}_{unique}",
        "profile_type": "business",
        "sub_type": "restaurante",
        "status": "indefinite",
        "data": {"description": "Policy test"},
    })


def create_subscription_product(admin_headers: dict, quota: int, period: str) -> str:
    product_unique = uuid.uuid4().hex[:8]
    create_product = requests.post(f"{BASE_URL}/api/admin/store/products", headers=admin_headers, json={
        "name": f"TEST_Subscription_{period}_{quota}_{product_unique}",
        "description": "Subscription for QR quota testing",
        "price": 0,
        "category": "business",
        "image_url": "",
        "stock": 9999,
        "item_type": "subscription_service",
        "subscription_period": period,
        "qr_quota_granted": quota,
        "active": True,
        "auto_generate_qr": False,
        "auto_qr_profile_type": "business",
        "auto_qr_sub_type": "tarjeta",
    })
    assert create_product.status_code == 200, (
        f"Create subscription failed: {create_product.status_code} {create_product.text}"
    )
    return create_product.json()["id"]


def create_checkout(token: str, product_id: str, quantity: int = 1, expected_status: int = 200):
    headers = {"Authorization": f"Bearer {token}"}
    response = requests.post(f"{BASE_URL}/api/checkout/create-preference", headers=headers, json={
        "items": [{
            "product_id": product_id,
            "product_name": "Test Subscription",
            "quantity": quantity,
            "unit_price": 0,
        }],
        "total": 0,
        "shipping_cost": 0,
    })
    assert response.status_code == expected_status, (
        f"Checkout failed ({expected_status} expected): {response.status_code} {response.text}"
    )
    return response


def create_subaccount_token(master_token: str) -> str:
    unique = uuid.uuid4().hex[:8]
    email = f"TEST_sub_{unique}@test.com"
    password = "testpass123"
    headers = {"Authorization": f"Bearer {master_token}"}
    response = requests.post(f"{BASE_URL}/api/subaccounts", headers=headers, json={
        "email": email,
        "name": f"Sucursal {unique}",
        "password": password,
        "branch_name": f"Sucursal {unique}",
    })
    assert response.status_code == 200, f"Create subaccount failed: {response.status_code} {response.text}"
    return login(email, password)


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


class TestQRCreationPolicy:
    def test_business_manual_creation_blocked_when_setting_disabled(self, admin_headers, preserve_settings):
        update_settings(admin_headers, preserve_settings, {
            "allow_business_create_qr": False,
            "max_qr_per_business": 50,
            "enable_store": True,
        })
        user = register_business_user()
        user_token = user["token"]
        user_headers = {"Authorization": f"Bearer {user_token}"}

        policy_resp = requests.get(f"{BASE_URL}/api/qr-profiles/creation-policy", headers=user_headers)
        assert policy_resp.status_code == 200, f"Policy request failed: {policy_resp.status_code} {policy_resp.text}"
        policy = policy_resp.json()
        assert policy.get("can_create") is False
        assert policy.get("requires_subscription_purchase") is True

        create_resp = create_business_qr(user_token, suffix="blocked")
        assert create_resp.status_code == 403, (
            f"QR creation should be blocked: {create_resp.status_code} {create_resp.text}"
        )

    def test_business_quota_stacks_across_multiple_subscriptions(self, admin_headers, preserve_settings):
        update_settings(admin_headers, preserve_settings, {
            "allow_business_create_qr": True,
            "max_qr_per_business": 50,
            "enable_store": True,
            "enable_payments": False,
        })
        user = register_business_user()
        user_token = user["token"]
        user_headers = {"Authorization": f"Bearer {user_token}"}

        policy_before = requests.get(f"{BASE_URL}/api/qr-profiles/creation-policy", headers=user_headers)
        assert policy_before.status_code == 200
        policy_before_data = policy_before.json()
        assert policy_before_data.get("can_create") is False
        assert policy_before_data.get("requires_subscription_purchase") is True

        monthly_product = create_subscription_product(admin_headers, quota=1, period="monthly")
        yearly_product = create_subscription_product(admin_headers, quota=2, period="yearly")

        monthly_checkout = create_checkout(user_token, monthly_product, quantity=1, expected_status=200)
        assert monthly_checkout.json().get("status") == "paid"

        yearly_checkout = create_checkout(user_token, yearly_product, quantity=1, expected_status=200)
        assert yearly_checkout.json().get("status") == "paid"

        policy_after = requests.get(f"{BASE_URL}/api/qr-profiles/creation-policy", headers=user_headers)
        assert policy_after.status_code == 200
        policy_data = policy_after.json()
        assert policy_data.get("can_create") is True
        assert int(policy_data.get("qr_quota_balance", 0)) >= 3

        first_create = create_business_qr(user_token, suffix="stack1")
        assert first_create.status_code == 200, (
            f"First QR with quota should pass: {first_create.status_code} {first_create.text}"
        )

        second_create = create_business_qr(user_token, suffix="stack2")
        assert second_create.status_code == 200, (
            f"Second QR with quota should pass: {second_create.status_code} {second_create.text}"
        )

        third_create = create_business_qr(user_token, suffix="stack3")
        assert third_create.status_code == 200, (
            f"Third QR with quota should pass: {third_create.status_code} {third_create.text}"
        )

        fourth_create = create_business_qr(user_token, suffix="stack4")
        assert fourth_create.status_code == 403, (
            f"Fourth QR should fail without quota: {fourth_create.status_code} {fourth_create.text}"
        )

    def test_subaccount_cannot_buy_subscription_but_can_use_master_quota(self, admin_headers, preserve_settings):
        update_settings(admin_headers, preserve_settings, {
            "allow_business_create_qr": False,
            "max_qr_per_business": 50,
            "enable_store": True,
            "enable_payments": False,
        })
        master = register_business_user()
        master_token = master["token"]
        subaccount_token = create_subaccount_token(master_token)

        subscription_product = create_subscription_product(admin_headers, quota=2, period="monthly")

        blocked_checkout = create_checkout(subaccount_token, subscription_product, quantity=1, expected_status=403)
        assert "master" in blocked_checkout.text.lower()

        master_checkout = create_checkout(master_token, subscription_product, quantity=1, expected_status=200)
        assert master_checkout.json().get("status") == "paid"

        subaccount_create = create_business_qr(subaccount_token, suffix="subuse1")
        assert subaccount_create.status_code == 200, (
            f"Subaccount should consume shared quota: {subaccount_create.status_code} {subaccount_create.text}"
        )

        master_create = create_business_qr(master_token, suffix="masteruse1")
        assert master_create.status_code == 200, (
            f"Master should consume shared quota: {master_create.status_code} {master_create.text}"
        )

        no_more_quota = create_business_qr(subaccount_token, suffix="subuse2")
        assert no_more_quota.status_code == 403, (
            f"Should fail when shared quota is exhausted: {no_more_quota.status_code} {no_more_quota.text}"
        )

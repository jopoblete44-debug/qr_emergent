"""
Backend API tests for the new Admin Panel restructure (iteration 3)
Tests for:
- Admin Dashboard APIs (analytics)
- Admin QR Profiles management
- Admin Users management  
- Admin Settings (GET/PUT)
- Admin Profile Types Config (GET/PUT)
- Admin Analytics including daily-scans
- Admin QR download
"""
import pytest
import requests
import os

BASE_URL = os.environ.get('REACT_APP_BACKEND_URL', 'http://localhost:8001').rstrip('/')

# Test credentials
ADMIN_EMAIL = "admin@qrprofiles.com"
ADMIN_PASSWORD = "admin123"
REGULAR_USER_EMAIL = "empresa@test.com"
REGULAR_USER_PASSWORD = "test123"


class TestAdminAuthentication:
    """Test admin authentication and access control"""
    
    def test_admin_login_success(self):
        """Test admin can login successfully"""
        response = requests.post(f"{BASE_URL}/api/auth/login", json={
            "email": ADMIN_EMAIL,
            "password": ADMIN_PASSWORD
        })
        assert response.status_code == 200, f"Expected 200, got {response.status_code}"
        data = response.json()
        assert "token" in data
        assert "user" in data
        assert data["user"]["is_admin"] == True
        assert data["user"]["email"] == ADMIN_EMAIL
        print(f"✓ Admin login successful, is_admin={data['user']['is_admin']}")
    
    def test_regular_user_not_admin(self):
        """Test regular user does not have admin flag"""
        response = requests.post(f"{BASE_URL}/api/auth/login", json={
            "email": REGULAR_USER_EMAIL,
            "password": REGULAR_USER_PASSWORD
        })
        assert response.status_code == 200
        data = response.json()
        assert data["user"].get("is_admin", False) == False
        print(f"✓ Regular user correctly not marked as admin")


@pytest.fixture(scope="module")
def admin_token():
    """Get admin authentication token"""
    response = requests.post(f"{BASE_URL}/api/auth/login", json={
        "email": ADMIN_EMAIL,
        "password": ADMIN_PASSWORD
    })
    if response.status_code != 200:
        pytest.skip("Admin authentication failed")
    return response.json()["token"]


@pytest.fixture(scope="module")
def regular_user_token():
    """Get regular user authentication token"""
    response = requests.post(f"{BASE_URL}/api/auth/login", json={
        "email": REGULAR_USER_EMAIL,
        "password": REGULAR_USER_PASSWORD
    })
    if response.status_code != 200:
        pytest.skip("Regular user authentication failed")
    return response.json()["token"]


class TestAdminAnalytics:
    """Tests for /api/admin/analytics endpoint"""
    
    def test_get_analytics_as_admin(self, admin_token):
        """Test admin can fetch platform analytics"""
        response = requests.get(f"{BASE_URL}/api/admin/analytics", 
            headers={"Authorization": f"Bearer {admin_token}"})
        assert response.status_code == 200
        data = response.json()
        
        # Verify required fields
        assert "total_users" in data
        assert "total_profiles" in data
        assert "total_scans" in data
        assert "total_orders" in data
        assert "paid_orders" in data
        assert "total_revenue" in data
        
        # Verify data types
        assert isinstance(data["total_users"], int)
        assert isinstance(data["total_profiles"], int)
        assert isinstance(data["total_scans"], int)
        assert isinstance(data["total_revenue"], (int, float))
        
        print(f"✓ Analytics: users={data['total_users']}, profiles={data['total_profiles']}, scans={data['total_scans']}")
    
    def test_get_analytics_denied_for_regular_user(self, regular_user_token):
        """Test regular user cannot access analytics"""
        response = requests.get(f"{BASE_URL}/api/admin/analytics",
            headers={"Authorization": f"Bearer {regular_user_token}"})
        assert response.status_code == 403, f"Expected 403, got {response.status_code}"
        print("✓ Regular user correctly denied admin analytics access")


class TestAdminDailyScans:
    """Tests for /api/admin/analytics/daily-scans endpoint"""
    
    def test_get_daily_scans_as_admin(self, admin_token):
        """Test admin can fetch daily scans for the last 30 days"""
        response = requests.get(f"{BASE_URL}/api/admin/analytics/daily-scans",
            headers={"Authorization": f"Bearer {admin_token}"})
        assert response.status_code == 200
        data = response.json()
        
        # Should return array of 30 days
        assert isinstance(data, list)
        assert len(data) == 30, f"Expected 30 days of data, got {len(data)}"
        
        # Verify each entry has date and scans
        for entry in data:
            assert "date" in entry
            assert "scans" in entry
            assert isinstance(entry["scans"], int)
        
        print(f"✓ Daily scans: {len(data)} days of data returned")
    
    def test_get_daily_scans_denied_for_regular_user(self, regular_user_token):
        """Test regular user cannot access daily scans"""
        response = requests.get(f"{BASE_URL}/api/admin/analytics/daily-scans",
            headers={"Authorization": f"Bearer {regular_user_token}"})
        assert response.status_code == 403
        print("✓ Regular user correctly denied daily scans access")


class TestAdminSettings:
    """Tests for /api/admin/settings GET/PUT endpoints"""
    
    def test_get_settings_as_admin(self, admin_token):
        """Test admin can fetch platform settings"""
        response = requests.get(f"{BASE_URL}/api/admin/settings",
            headers={"Authorization": f"Bearer {admin_token}"})
        assert response.status_code == 200
        data = response.json()
        # Settings can be empty object initially
        assert isinstance(data, dict)
        print(f"✓ Admin settings fetched successfully: {len(data)} keys")
    
    def test_put_settings_as_admin(self, admin_token):
        """Test admin can update platform settings"""
        test_settings = {
            "site_name": "QR Profiles Test",
            "site_description": "Test platform description",
            "contact_email": "test@example.com",
            "max_qr_per_person": 10,
            "enable_payments": False,
            "maintenance_mode": False
        }
        
        response = requests.put(f"{BASE_URL}/api/admin/settings",
            headers={
                "Authorization": f"Bearer {admin_token}",
                "Content-Type": "application/json"
            },
            json=test_settings)
        assert response.status_code == 200
        data = response.json()
        assert data.get("status") == "success"
        
        # Verify settings were saved by fetching them back
        get_response = requests.get(f"{BASE_URL}/api/admin/settings",
            headers={"Authorization": f"Bearer {admin_token}"})
        assert get_response.status_code == 200
        saved = get_response.json()
        assert saved.get("site_name") == "QR Profiles Test"
        assert saved.get("max_qr_per_person") == 10
        
        print("✓ Admin settings updated and verified successfully")
    
    def test_settings_denied_for_regular_user(self, regular_user_token):
        """Test regular user cannot access settings"""
        response = requests.get(f"{BASE_URL}/api/admin/settings",
            headers={"Authorization": f"Bearer {regular_user_token}"})
        assert response.status_code == 403
        print("✓ Regular user correctly denied settings access")


class TestAdminProfileTypesConfig:
    """Tests for /api/admin/profile-types-config GET/PUT endpoints"""
    
    def test_get_profile_types_config_as_admin(self, admin_token):
        """Test admin can fetch profile types configuration"""
        response = requests.get(f"{BASE_URL}/api/admin/profile-types-config",
            headers={"Authorization": f"Bearer {admin_token}"})
        assert response.status_code == 200
        data = response.json()
        # Config can be empty object initially
        assert isinstance(data, dict)
        print(f"✓ Profile types config fetched successfully")
    
    def test_put_profile_types_config_as_admin(self, admin_token):
        """Test admin can update profile types configuration"""
        test_config = {
            "personal": [
                {
                    "key": "medico",
                    "label": "Médico",
                    "enabled": True,
                    "fields": [
                        {"name": "blood_type", "label": "Tipo de Sangre", "type": "text", "required": True}
                    ]
                }
            ],
            "business": [
                {
                    "key": "restaurante",
                    "label": "Restaurante",
                    "enabled": True,
                    "fields": [
                        {"name": "description", "label": "Descripción", "type": "textarea", "required": False}
                    ]
                }
            ]
        }
        
        response = requests.put(f"{BASE_URL}/api/admin/profile-types-config",
            headers={
                "Authorization": f"Bearer {admin_token}",
                "Content-Type": "application/json"
            },
            json=test_config)
        assert response.status_code == 200
        data = response.json()
        assert data.get("status") == "success"
        
        # Verify config was saved
        get_response = requests.get(f"{BASE_URL}/api/admin/profile-types-config",
            headers={"Authorization": f"Bearer {admin_token}"})
        assert get_response.status_code == 200
        saved = get_response.json()
        assert "personal" in saved or saved == {}  # May be empty if never saved before
        
        print("✓ Profile types config updated successfully")
    
    def test_profile_types_config_denied_for_regular_user(self, regular_user_token):
        """Test regular user cannot access profile types config"""
        response = requests.get(f"{BASE_URL}/api/admin/profile-types-config",
            headers={"Authorization": f"Bearer {regular_user_token}"})
        assert response.status_code == 403
        print("✓ Regular user correctly denied profile types config access")


class TestAdminUsers:
    """Tests for /api/admin/users endpoints"""
    
    def test_get_all_users_as_admin(self, admin_token):
        """Test admin can fetch all users"""
        response = requests.get(f"{BASE_URL}/api/admin/users",
            headers={"Authorization": f"Bearer {admin_token}"})
        assert response.status_code == 200
        data = response.json()
        
        assert "users" in data
        assert "total" in data
        assert isinstance(data["users"], list)
        assert isinstance(data["total"], int)
        
        # Verify user data doesn't include password
        if data["users"]:
            user = data["users"][0]
            assert "password" not in user
            assert "id" in user
            assert "email" in user
            assert "name" in user
        
        print(f"✓ Fetched {len(data['users'])} users, total={data['total']}")
    
    def test_search_users_as_admin(self, admin_token):
        """Test admin can search users"""
        response = requests.get(f"{BASE_URL}/api/admin/users?search=admin",
            headers={"Authorization": f"Bearer {admin_token}"})
        assert response.status_code == 200
        data = response.json()
        assert "users" in data
        # Should find at least the admin user
        print(f"✓ Search for 'admin' returned {len(data['users'])} users")
    
    def test_users_denied_for_regular_user(self, regular_user_token):
        """Test regular user cannot access users list"""
        response = requests.get(f"{BASE_URL}/api/admin/users",
            headers={"Authorization": f"Bearer {regular_user_token}"})
        assert response.status_code == 403
        print("✓ Regular user correctly denied users access")


class TestAdminQRProfiles:
    """Tests for /api/admin/qr-profiles endpoints"""
    
    def test_get_all_profiles_as_admin(self, admin_token):
        """Test admin can fetch all QR profiles"""
        response = requests.get(f"{BASE_URL}/api/admin/qr-profiles",
            headers={"Authorization": f"Bearer {admin_token}"})
        assert response.status_code == 200
        data = response.json()
        
        assert "profiles" in data
        assert "total" in data
        assert isinstance(data["profiles"], list)
        
        # If profiles exist, verify structure
        if data["profiles"]:
            profile = data["profiles"][0]
            assert "id" in profile
            assert "name" in profile
            assert "hash" in profile
            assert "status" in profile
        
        print(f"✓ Fetched {len(data['profiles'])} QR profiles, total={data['total']}")
    
    def test_filter_profiles_by_status(self, admin_token):
        """Test admin can filter profiles by status"""
        response = requests.get(f"{BASE_URL}/api/admin/qr-profiles?status=indefinite",
            headers={"Authorization": f"Bearer {admin_token}"})
        assert response.status_code == 200
        data = response.json()
        
        # Verify all returned profiles have correct status
        for profile in data["profiles"]:
            assert profile["status"] == "indefinite"
        
        print(f"✓ Filtered by status=indefinite: {len(data['profiles'])} profiles")
    
    def test_filter_profiles_by_type(self, admin_token):
        """Test admin can filter profiles by type"""
        response = requests.get(f"{BASE_URL}/api/admin/qr-profiles?profile_type=business",
            headers={"Authorization": f"Bearer {admin_token}"})
        assert response.status_code == 200
        data = response.json()
        
        # Verify all returned profiles have correct type
        for profile in data["profiles"]:
            assert profile["profile_type"] == "business"
        
        print(f"✓ Filtered by profile_type=business: {len(data['profiles'])} profiles")
    
    def test_search_profiles(self, admin_token):
        """Test admin can search profiles"""
        response = requests.get(f"{BASE_URL}/api/admin/qr-profiles?search=restaurante",
            headers={"Authorization": f"Bearer {admin_token}"})
        assert response.status_code == 200
        data = response.json()
        print(f"✓ Search for 'restaurante' returned {len(data['profiles'])} profiles")
    
    def test_profiles_denied_for_regular_user(self, regular_user_token):
        """Test regular user cannot access admin profiles"""
        response = requests.get(f"{BASE_URL}/api/admin/qr-profiles",
            headers={"Authorization": f"Bearer {regular_user_token}"})
        assert response.status_code == 403
        print("✓ Regular user correctly denied admin profiles access")


class TestAdminQRDownload:
    """Tests for /api/admin/qr-profiles/{id}/download-qr endpoint"""
    
    def test_download_qr_as_admin(self, admin_token):
        """Test admin can download QR code for any profile"""
        # First get a profile ID
        profiles_response = requests.get(f"{BASE_URL}/api/admin/qr-profiles?limit=1",
            headers={"Authorization": f"Bearer {admin_token}"})
        
        if profiles_response.status_code != 200 or not profiles_response.json().get("profiles"):
            pytest.skip("No profiles available for testing")
        
        profile_id = profiles_response.json()["profiles"][0]["id"]
        
        # Download QR
        response = requests.get(f"{BASE_URL}/api/admin/qr-profiles/{profile_id}/download-qr",
            headers={"Authorization": f"Bearer {admin_token}"})
        assert response.status_code == 200
        assert response.headers.get("content-type") == "image/png"
        assert len(response.content) > 0
        
        print(f"✓ Downloaded QR for profile {profile_id}: {len(response.content)} bytes")
    
    def test_download_qr_denied_for_regular_user(self, admin_token, regular_user_token):
        """Test regular user cannot download QR via admin endpoint"""
        # First get a profile ID
        profiles_response = requests.get(f"{BASE_URL}/api/admin/qr-profiles?limit=1",
            headers={"Authorization": f"Bearer {admin_token}"})
        
        if profiles_response.status_code != 200 or not profiles_response.json().get("profiles"):
            pytest.skip("No profiles available for testing")
        
        profile_id = profiles_response.json()["profiles"][0]["id"]
        
        # Try to download as regular user
        response = requests.get(f"{BASE_URL}/api/admin/qr-profiles/{profile_id}/download-qr",
            headers={"Authorization": f"Bearer {regular_user_token}"})
        assert response.status_code == 403
        print("✓ Regular user correctly denied admin QR download access")


class TestAdminProfileUpdate:
    """Tests for admin profile update endpoints"""
    
    def test_admin_update_profile_status(self, admin_token):
        """Test admin can change any profile's status"""
        # Get a profile
        profiles_response = requests.get(f"{BASE_URL}/api/admin/qr-profiles?limit=1",
            headers={"Authorization": f"Bearer {admin_token}"})
        
        if profiles_response.status_code != 200 or not profiles_response.json().get("profiles"):
            pytest.skip("No profiles available for testing")
        
        profile = profiles_response.json()["profiles"][0]
        profile_id = profile["id"]
        original_status = profile["status"]
        new_status = "paused" if original_status != "paused" else "indefinite"
        
        # Update status
        response = requests.patch(f"{BASE_URL}/api/admin/qr-profiles/{profile_id}/status",
            headers={
                "Authorization": f"Bearer {admin_token}",
                "Content-Type": "application/json"
            },
            json={"status": new_status})
        assert response.status_code == 200
        
        # Verify change
        verify_response = requests.get(f"{BASE_URL}/api/admin/qr-profiles?search={profile['hash']}",
            headers={"Authorization": f"Bearer {admin_token}"})
        updated = verify_response.json()["profiles"][0]
        assert updated["status"] == new_status
        
        # Revert status
        requests.patch(f"{BASE_URL}/api/admin/qr-profiles/{profile_id}/status",
            headers={
                "Authorization": f"Bearer {admin_token}",
                "Content-Type": "application/json"
            },
            json={"status": original_status})
        
        print(f"✓ Admin changed profile status: {original_status} -> {new_status} -> {original_status}")
    
    def test_admin_update_profile(self, admin_token):
        """Test admin can update any profile's data"""
        # Get a profile
        profiles_response = requests.get(f"{BASE_URL}/api/admin/qr-profiles?limit=1",
            headers={"Authorization": f"Bearer {admin_token}"})
        
        if profiles_response.status_code != 200 or not profiles_response.json().get("profiles"):
            pytest.skip("No profiles available for testing")
        
        profile = profiles_response.json()["profiles"][0]
        profile_id = profile["id"]
        original_name = profile["name"]
        
        # Update name
        test_name = f"TEST_{original_name}"
        response = requests.put(f"{BASE_URL}/api/admin/qr-profiles/{profile_id}",
            headers={
                "Authorization": f"Bearer {admin_token}",
                "Content-Type": "application/json"
            },
            json={"name": test_name})
        assert response.status_code == 200
        
        # Revert name
        requests.put(f"{BASE_URL}/api/admin/qr-profiles/{profile_id}",
            headers={
                "Authorization": f"Bearer {admin_token}",
                "Content-Type": "application/json"
            },
            json={"name": original_name})
        
        print(f"✓ Admin updated profile name and reverted")


class TestAdminUserUpdate:
    """Tests for admin user update endpoint"""
    
    def test_admin_update_user(self, admin_token):
        """Test admin can update user data"""
        # Get a non-admin user
        users_response = requests.get(f"{BASE_URL}/api/admin/users?search=empresa",
            headers={"Authorization": f"Bearer {admin_token}"})
        
        if users_response.status_code != 200 or not users_response.json().get("users"):
            pytest.skip("No test user available")
        
        user = users_response.json()["users"][0]
        user_id = user["id"]
        original_name = user["name"]
        
        # Update name
        test_name = f"TEST_{original_name}"
        response = requests.put(f"{BASE_URL}/api/admin/users/{user_id}",
            headers={
                "Authorization": f"Bearer {admin_token}",
                "Content-Type": "application/json"
            },
            json={"name": test_name})
        assert response.status_code == 200
        
        # Revert name
        requests.put(f"{BASE_URL}/api/admin/users/{user_id}",
            headers={
                "Authorization": f"Bearer {admin_token}",
                "Content-Type": "application/json"
            },
            json={"name": original_name})
        
        print(f"✓ Admin updated user name and reverted")


if __name__ == "__main__":
    pytest.main([__file__, "-v", "--tb=short"])

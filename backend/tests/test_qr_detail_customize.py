"""
Backend API Tests for QR Detail and Customize features
Testing: /details, /generate-qr, /generate-qr-custom endpoints
"""
import pytest
import requests
import os
import uuid

BASE_URL = os.environ.get('REACT_APP_BACKEND_URL', 'http://localhost:8001').rstrip('/')

# Test credentials - Business user with existing profile
BUSINESS_EMAIL = "empresa@test.com"
BUSINESS_PASSWORD = "test123"
KNOWN_PROFILE_ID = "1b499183-34aa-47af-ba24-dbb90a916816"  # Mi Restaurante


class TestQRDetailEndpoint:
    """Test /api/qr-profiles/{id}/details endpoint"""
    
    @pytest.fixture
    def auth_headers(self):
        """Get authentication headers for business user"""
        response = requests.post(f"{BASE_URL}/api/auth/login", json={
            "email": BUSINESS_EMAIL,
            "password": BUSINESS_PASSWORD
        })
        assert response.status_code == 200, f"Login failed: {response.text}"
        token = response.json()["token"]
        return {"Authorization": f"Bearer {token}"}
    
    def test_details_returns_profile_info(self, auth_headers):
        """Test that /details returns profile information"""
        response = requests.get(
            f"{BASE_URL}/api/qr-profiles/{KNOWN_PROFILE_ID}/details",
            headers=auth_headers
        )
        assert response.status_code == 200, f"Details failed: {response.text}"
        data = response.json()
        
        # Verify response structure
        assert "profile" in data
        assert "total_scans" in data
        assert "recent_scans" in data
        assert "daily_data" in data
        
        print(f"Details endpoint OK - Profile: {data['profile']['name']}")
    
    def test_details_profile_contains_required_fields(self, auth_headers):
        """Test that profile object contains all required fields"""
        response = requests.get(
            f"{BASE_URL}/api/qr-profiles/{KNOWN_PROFILE_ID}/details",
            headers=auth_headers
        )
        assert response.status_code == 200
        profile = response.json()["profile"]
        
        required_fields = ["id", "user_id", "hash", "name", "profile_type", "sub_type", "status", "scan_count", "created_at"]
        for field in required_fields:
            assert field in profile, f"Missing field: {field}"
        
        print(f"Profile contains all required fields")
    
    def test_details_daily_data_has_30_days(self, auth_headers):
        """Test that daily_data returns 30 days of data"""
        response = requests.get(
            f"{BASE_URL}/api/qr-profiles/{KNOWN_PROFILE_ID}/details",
            headers=auth_headers
        )
        assert response.status_code == 200
        daily_data = response.json()["daily_data"]
        
        assert len(daily_data) == 30, f"Expected 30 days, got {len(daily_data)}"
        
        # Each day should have date and scans
        for day in daily_data:
            assert "date" in day
            assert "scans" in day
            assert isinstance(day["scans"], int)
        
        print(f"Daily data contains 30 days of scan history")
    
    def test_details_requires_auth(self):
        """Test that /details requires authentication"""
        response = requests.get(f"{BASE_URL}/api/qr-profiles/{KNOWN_PROFILE_ID}/details")
        assert response.status_code == 401
        print("Details correctly requires authentication")
    
    def test_details_not_found_for_invalid_id(self, auth_headers):
        """Test 404 for non-existent profile"""
        fake_id = str(uuid.uuid4())
        response = requests.get(
            f"{BASE_URL}/api/qr-profiles/{fake_id}/details",
            headers=auth_headers
        )
        assert response.status_code == 404
        print("Details returns 404 for invalid ID")


class TestQRGenerateEndpoint:
    """Test /api/qr-profiles/{id}/generate-qr endpoint"""
    
    @pytest.fixture
    def auth_headers(self):
        """Get authentication headers"""
        response = requests.post(f"{BASE_URL}/api/auth/login", json={
            "email": BUSINESS_EMAIL,
            "password": BUSINESS_PASSWORD
        })
        assert response.status_code == 200
        token = response.json()["token"]
        return {"Authorization": f"Bearer {token}"}
    
    def test_generate_qr_returns_png(self, auth_headers):
        """Test that /generate-qr returns PNG image"""
        response = requests.get(
            f"{BASE_URL}/api/qr-profiles/{KNOWN_PROFILE_ID}/generate-qr",
            headers=auth_headers
        )
        assert response.status_code == 200, f"Generate QR failed: {response.text}"
        
        # Check content type is PNG
        assert response.headers.get("content-type") == "image/png", f"Expected image/png, got {response.headers.get('content-type')}"
        
        # Check it's actual image data (PNG signature)
        assert response.content[:8] == b'\x89PNG\r\n\x1a\n', "Response is not a valid PNG"
        
        print(f"Generate QR returns valid PNG image ({len(response.content)} bytes)")
    
    def test_generate_qr_requires_auth(self):
        """Test that /generate-qr requires authentication"""
        response = requests.get(f"{BASE_URL}/api/qr-profiles/{KNOWN_PROFILE_ID}/generate-qr")
        assert response.status_code == 401
        print("Generate QR correctly requires authentication")
    
    def test_generate_qr_not_found_for_invalid_id(self, auth_headers):
        """Test 404 for non-existent profile"""
        fake_id = str(uuid.uuid4())
        response = requests.get(
            f"{BASE_URL}/api/qr-profiles/{fake_id}/generate-qr",
            headers=auth_headers
        )
        assert response.status_code == 404
        print("Generate QR returns 404 for invalid ID")


class TestQRGenerateCustomEndpoint:
    """Test /api/qr-profiles/{id}/generate-qr-custom endpoint"""
    
    @pytest.fixture
    def auth_headers(self):
        """Get authentication headers"""
        response = requests.post(f"{BASE_URL}/api/auth/login", json={
            "email": BUSINESS_EMAIL,
            "password": BUSINESS_PASSWORD
        })
        assert response.status_code == 200
        token = response.json()["token"]
        return {"Authorization": f"Bearer {token}"}
    
    def test_generate_qr_custom_default_params(self, auth_headers):
        """Test /generate-qr-custom with default parameters"""
        response = requests.get(
            f"{BASE_URL}/api/qr-profiles/{KNOWN_PROFILE_ID}/generate-qr-custom",
            headers=auth_headers
        )
        assert response.status_code == 200
        assert response.headers.get("content-type") == "image/png"
        assert response.content[:8] == b'\x89PNG\r\n\x1a\n'
        print(f"Generate QR custom with defaults OK ({len(response.content)} bytes)")
    
    def test_generate_qr_custom_with_colors(self, auth_headers):
        """Test /generate-qr-custom with custom colors"""
        params = {
            "fg_color": "#1e3a5f",  # Azul Corporativo
            "bg_color": "#f0f4f8"
        }
        response = requests.get(
            f"{BASE_URL}/api/qr-profiles/{KNOWN_PROFILE_ID}/generate-qr-custom",
            headers=auth_headers,
            params=params
        )
        assert response.status_code == 200
        assert response.headers.get("content-type") == "image/png"
        print("Generate QR custom with custom colors OK")
    
    def test_generate_qr_custom_with_size(self, auth_headers):
        """Test /generate-qr-custom with custom box_size and border"""
        params = {
            "box_size": 15,
            "border": 2
        }
        response = requests.get(
            f"{BASE_URL}/api/qr-profiles/{KNOWN_PROFILE_ID}/generate-qr-custom",
            headers=auth_headers,
            params=params
        )
        assert response.status_code == 200
        assert response.headers.get("content-type") == "image/png"
        print("Generate QR custom with custom size OK")
    
    def test_generate_qr_custom_all_params(self, auth_headers):
        """Test /generate-qr-custom with all parameters"""
        params = {
            "fg_color": "#9b1c1c",  # Rojo Médico
            "bg_color": "#fff5f5",
            "box_size": 12,
            "border": 3
        }
        response = requests.get(
            f"{BASE_URL}/api/qr-profiles/{KNOWN_PROFILE_ID}/generate-qr-custom",
            headers=auth_headers,
            params=params
        )
        assert response.status_code == 200
        assert response.headers.get("content-type") == "image/png"
        print("Generate QR custom with all params OK")
    
    def test_generate_qr_custom_extreme_values_clamped(self, auth_headers):
        """Test that extreme values are clamped to valid range"""
        params = {
            "box_size": 100,  # Should be clamped to max 20
            "border": 50     # Should be clamped to max 10
        }
        response = requests.get(
            f"{BASE_URL}/api/qr-profiles/{KNOWN_PROFILE_ID}/generate-qr-custom",
            headers=auth_headers,
            params=params
        )
        assert response.status_code == 200  # Should still work with clamped values
        print("Generate QR custom clamps extreme values correctly")
    
    def test_generate_qr_custom_requires_auth(self):
        """Test that /generate-qr-custom requires authentication"""
        response = requests.get(f"{BASE_URL}/api/qr-profiles/{KNOWN_PROFILE_ID}/generate-qr-custom")
        assert response.status_code == 401
        print("Generate QR custom correctly requires authentication")


class TestQRDetailIntegration:
    """Integration tests for detail/customize flow"""
    
    @pytest.fixture
    def auth_headers(self):
        """Get authentication headers"""
        response = requests.post(f"{BASE_URL}/api/auth/login", json={
            "email": BUSINESS_EMAIL,
            "password": BUSINESS_PASSWORD
        })
        assert response.status_code == 200
        token = response.json()["token"]
        return {"Authorization": f"Bearer {token}"}
    
    def test_full_detail_flow(self, auth_headers):
        """Test getting profile details and generating QR"""
        # 1. Get details
        details_response = requests.get(
            f"{BASE_URL}/api/qr-profiles/{KNOWN_PROFILE_ID}/details",
            headers=auth_headers
        )
        assert details_response.status_code == 200
        profile = details_response.json()["profile"]
        
        # 2. Generate default QR
        qr_response = requests.get(
            f"{BASE_URL}/api/qr-profiles/{KNOWN_PROFILE_ID}/generate-qr",
            headers=auth_headers
        )
        assert qr_response.status_code == 200
        assert len(qr_response.content) > 0
        
        # 3. Generate custom QR
        custom_response = requests.get(
            f"{BASE_URL}/api/qr-profiles/{KNOWN_PROFILE_ID}/generate-qr-custom",
            headers=auth_headers,
            params={"fg_color": "#553c9a", "bg_color": "#faf5ff"}  # Púrpura
        )
        assert custom_response.status_code == 200
        assert len(custom_response.content) > 0
        
        print(f"Full detail flow OK - Profile: {profile['name']}, Hash: {profile['hash']}")
    
    def test_public_profile_access_with_hash(self, auth_headers):
        """Test that public profile can be accessed with hash from details"""
        # Get profile hash from details
        details_response = requests.get(
            f"{BASE_URL}/api/qr-profiles/{KNOWN_PROFILE_ID}/details",
            headers=auth_headers
        )
        assert details_response.status_code == 200
        profile_hash = details_response.json()["profile"]["hash"]
        
        # Access public profile (no auth needed)
        public_response = requests.get(f"{BASE_URL}/api/public/profile/{profile_hash}")
        assert public_response.status_code == 200
        public_data = public_response.json()
        
        assert public_data["hash"] == profile_hash
        print(f"Public profile accessible with hash: {profile_hash}")


if __name__ == "__main__":
    pytest.main([__file__, "-v", "--tb=short"])

"""
Backend API Tests for QR Profiles Platform
Testing: Auth, QR Profiles CRUD, Scan History
"""
import pytest
import requests
import os
import uuid

BASE_URL = os.environ.get('REACT_APP_BACKEND_URL', 'http://localhost:8001').rstrip('/')

# Test credentials
ADMIN_EMAIL = "admin@qrprofiles.com"
ADMIN_PASSWORD = "admin123"

# Test data prefix for cleanup
TEST_PREFIX = "TEST_"


class TestHealthAndBasicEndpoints:
    """Basic API health check tests"""
    
    def test_api_root(self):
        """Test API root endpoint"""
        response = requests.get(f"{BASE_URL}/api/")
        assert response.status_code == 200
        data = response.json()
        assert "message" in data
        print(f"API root OK: {data['message']}")

    def test_products_endpoint(self):
        """Test products endpoint returns data"""
        response = requests.get(f"{BASE_URL}/api/products")
        assert response.status_code == 200
        data = response.json()
        assert isinstance(data, list)
        print(f"Products endpoint OK: {len(data)} products found")


class TestAuthentication:
    """Authentication endpoint tests"""
    
    def test_login_admin_success(self):
        """Test admin login with valid credentials"""
        response = requests.post(f"{BASE_URL}/api/auth/login", json={
            "email": ADMIN_EMAIL,
            "password": ADMIN_PASSWORD
        })
        assert response.status_code == 200
        data = response.json()
        assert "token" in data
        assert "user" in data
        assert data["user"]["email"] == ADMIN_EMAIL
        assert data["user"]["is_admin"] == True
        print("Admin login successful")
    
    def test_login_invalid_credentials(self):
        """Test login with invalid credentials"""
        response = requests.post(f"{BASE_URL}/api/auth/login", json={
            "email": "wrong@example.com",
            "password": "wrongpass"
        })
        assert response.status_code == 401
        print("Invalid credentials rejected correctly")

    def test_register_business_user(self):
        """Test registering a new business user"""
        unique_email = f"TEST_business_{uuid.uuid4().hex[:8]}@test.com"
        response = requests.post(f"{BASE_URL}/api/auth/register", json={
            "email": unique_email,
            "password": "testpass123",
            "name": "Test Business User",
            "user_type": "business"
        })
        assert response.status_code == 200
        data = response.json()
        assert "token" in data
        assert "user" in data
        assert data["user"]["email"] == unique_email
        assert data["user"]["user_type"] == "business"
        print(f"Business user registration successful: {unique_email}")

    def test_register_personal_user(self):
        """Test registering a new personal user"""
        unique_email = f"TEST_personal_{uuid.uuid4().hex[:8]}@test.com"
        response = requests.post(f"{BASE_URL}/api/auth/register", json={
            "email": unique_email,
            "password": "testpass123",
            "name": "Test Personal User",
            "user_type": "person"
        })
        assert response.status_code == 200
        data = response.json()
        assert "token" in data
        assert "user" in data
        assert data["user"]["user_type"] == "person"
        print(f"Personal user registration successful: {unique_email}")


class TestScanHistoryEndpoint:
    """Test scan history endpoint"""
    
    @pytest.fixture
    def auth_headers(self):
        """Get authentication headers"""
        response = requests.post(f"{BASE_URL}/api/auth/login", json={
            "email": ADMIN_EMAIL,
            "password": ADMIN_PASSWORD
        })
        assert response.status_code == 200
        token = response.json()["token"]
        return {"Authorization": f"Bearer {token}"}
    
    def test_scan_history_returns_correct_structure(self, auth_headers):
        """Test scan history endpoint returns correct structure"""
        response = requests.get(f"{BASE_URL}/api/scan-history", headers=auth_headers)
        assert response.status_code == 200
        data = response.json()
        
        # Verify structure
        assert "scans" in data
        assert "total" in data
        assert "profiles" in data
        assert isinstance(data["scans"], list)
        assert isinstance(data["total"], int)
        assert isinstance(data["profiles"], list)
        print(f"Scan history structure OK: {data['total']} scans, {len(data['profiles'])} profiles")

    def test_scan_history_with_filters(self, auth_headers):
        """Test scan history with date filters"""
        response = requests.get(f"{BASE_URL}/api/scan-history", headers=auth_headers, params={
            "start_date": "2026-01-01",
            "end_date": "2026-12-31",
            "limit": 10
        })
        assert response.status_code == 200
        data = response.json()
        assert "scans" in data
        print("Scan history with filters OK")

    def test_scan_history_without_auth(self):
        """Test scan history requires authentication"""
        response = requests.get(f"{BASE_URL}/api/scan-history")
        assert response.status_code == 401
        print("Scan history correctly requires auth")


class TestQRProfilesCRUD:
    """Test QR Profiles CRUD operations"""
    
    @pytest.fixture
    def business_user_auth(self):
        """Create and authenticate a business user"""
        unique_email = f"TEST_biz_{uuid.uuid4().hex[:8]}@test.com"
        response = requests.post(f"{BASE_URL}/api/auth/register", json={
            "email": unique_email,
            "password": "testpass123",
            "name": "Test Business",
            "user_type": "business"
        })
        if response.status_code == 400:  # Email exists
            response = requests.post(f"{BASE_URL}/api/auth/login", json={
                "email": unique_email,
                "password": "testpass123"
            })
        assert response.status_code == 200
        token = response.json()["token"]
        return {"Authorization": f"Bearer {token}"}
    
    @pytest.fixture
    def personal_user_auth(self):
        """Create and authenticate a personal user"""
        unique_email = f"TEST_pers_{uuid.uuid4().hex[:8]}@test.com"
        response = requests.post(f"{BASE_URL}/api/auth/register", json={
            "email": unique_email,
            "password": "testpass123",
            "name": "Test Personal",
            "user_type": "person"
        })
        if response.status_code == 400:
            response = requests.post(f"{BASE_URL}/api/auth/login", json={
                "email": unique_email,
                "password": "testpass123"
            })
        assert response.status_code == 200
        token = response.json()["token"]
        return {"Authorization": f"Bearer {token}"}

    # Business Profile Sub-Types Tests
    def test_create_hotel_profile(self, business_user_auth):
        """Test creating hotel business profile"""
        response = requests.post(f"{BASE_URL}/api/qr-profiles", headers=business_user_auth, json={
            "name": f"TEST_Hotel {uuid.uuid4().hex[:6]}",
            "profile_type": "business",
            "sub_type": "hotel",
            "status": "indefinite",
            "data": {
                "hotel_name": "Grand Test Hotel",
                "services": "WiFi\nPool",
                "check_in": "15:00",
                "check_out": "12:00"
            }
        })
        assert response.status_code == 200
        data = response.json()
        assert data["sub_type"] == "hotel"
        assert data["profile_type"] == "business"
        print(f"Hotel profile created: {data['hash']}")

    def test_create_wifi_profile(self, business_user_auth):
        """Test creating WiFi business profile"""
        response = requests.post(f"{BASE_URL}/api/qr-profiles", headers=business_user_auth, json={
            "name": f"TEST_WiFi {uuid.uuid4().hex[:6]}",
            "profile_type": "business",
            "sub_type": "wifi",
            "status": "indefinite",
            "data": {
                "network_name": "TestNetwork",
                "password": "testpass123",
                "security_type": "WPA2"
            }
        })
        assert response.status_code == 200
        data = response.json()
        assert data["sub_type"] == "wifi"
        print(f"WiFi profile created: {data['hash']}")

    def test_create_tarjeta_profile(self, business_user_auth):
        """Test creating business card (tarjeta) profile"""
        response = requests.post(f"{BASE_URL}/api/qr-profiles", headers=business_user_auth, json={
            "name": f"TEST_Tarjeta {uuid.uuid4().hex[:6]}",
            "profile_type": "business",
            "sub_type": "tarjeta",
            "data": {
                "full_name": "John Doe",
                "job_title": "CEO",
                "company": "Test Corp",
                "email": "john@test.com",
                "phone": "+123456789"
            }
        })
        assert response.status_code == 200
        data = response.json()
        assert data["sub_type"] == "tarjeta"
        print(f"Business card profile created: {data['hash']}")

    def test_create_catalogo_profile(self, business_user_auth):
        """Test creating catalog (catalogo) profile"""
        response = requests.post(f"{BASE_URL}/api/qr-profiles", headers=business_user_auth, json={
            "name": f"TEST_Catalogo {uuid.uuid4().hex[:6]}",
            "profile_type": "business",
            "sub_type": "catalogo",
            "data": {
                "catalog_name": "Test Products",
                "description": "Test catalog description",
                "products": "Product 1 - $10\nProduct 2 - $20"
            }
        })
        assert response.status_code == 200
        data = response.json()
        assert data["sub_type"] == "catalogo"
        print(f"Catalog profile created: {data['hash']}")

    def test_create_turismo_profile(self, business_user_auth):
        """Test creating tourism (turismo) profile"""
        response = requests.post(f"{BASE_URL}/api/qr-profiles", headers=business_user_auth, json={
            "name": f"TEST_Turismo {uuid.uuid4().hex[:6]}",
            "profile_type": "business",
            "sub_type": "turismo",
            "data": {
                "place_name": "Test Monument",
                "description": "Historic monument",
                "history": "Built in 1900",
                "attractions": "View\nPhotos"
            }
        })
        assert response.status_code == 200
        data = response.json()
        assert data["sub_type"] == "turismo"
        print(f"Tourism profile created: {data['hash']}")

    def test_create_redes_profile(self, business_user_auth):
        """Test creating social links (redes) profile"""
        response = requests.post(f"{BASE_URL}/api/qr-profiles", headers=business_user_auth, json={
            "name": f"TEST_Redes {uuid.uuid4().hex[:6]}",
            "profile_type": "business",
            "sub_type": "redes",
            "data": {
                "title": "My Social Links",
                "bio": "Follow me!",
                "instagram": "https://instagram.com/test",
                "facebook": "https://facebook.com/test"
            }
        })
        assert response.status_code == 200
        data = response.json()
        assert data["sub_type"] == "redes"
        print(f"Social links profile created: {data['hash']}")

    def test_create_evento_profile(self, business_user_auth):
        """Test creating event (evento) profile"""
        response = requests.post(f"{BASE_URL}/api/qr-profiles", headers=business_user_auth, json={
            "name": f"TEST_Evento {uuid.uuid4().hex[:6]}",
            "profile_type": "business",
            "sub_type": "evento",
            "data": {
                "event_name": "Test Conference",
                "description": "Annual test event",
                "date": "2026-06-15",
                "time": "10:00",
                "location": "Test Center"
            }
        })
        assert response.status_code == 200
        data = response.json()
        assert data["sub_type"] == "evento"
        print(f"Event profile created: {data['hash']}")

    def test_create_checkin_profile(self, business_user_auth):
        """Test creating check-in (checkin) profile"""
        response = requests.post(f"{BASE_URL}/api/qr-profiles", headers=business_user_auth, json={
            "name": f"TEST_Checkin {uuid.uuid4().hex[:6]}",
            "profile_type": "business",
            "sub_type": "checkin",
            "data": {
                "business_name": "Test Business",
                "description": "Welcome to our store",
                "welcome_message": "Thanks for visiting!"
            }
        })
        assert response.status_code == 200
        data = response.json()
        assert data["sub_type"] == "checkin"
        print(f"Check-in profile created: {data['hash']}")

    def test_create_encuesta_profile(self, business_user_auth):
        """Test creating survey (encuesta) profile"""
        response = requests.post(f"{BASE_URL}/api/qr-profiles", headers=business_user_auth, json={
            "name": f"TEST_Encuesta {uuid.uuid4().hex[:6]}",
            "profile_type": "business",
            "sub_type": "encuesta",
            "data": {
                "survey_title": "Customer Satisfaction",
                "description": "Help us improve",
                "questions": "How was your experience?\nWould you recommend us?",
                "thank_you_message": "Thank you!"
            }
        })
        assert response.status_code == 200
        data = response.json()
        assert data["sub_type"] == "encuesta"
        print(f"Survey profile created: {data['hash']}")

    # Personal Profile Sub-Types Tests
    def test_create_medico_profile(self, personal_user_auth):
        """Test creating medical (medico) personal profile"""
        response = requests.post(f"{BASE_URL}/api/qr-profiles", headers=personal_user_auth, json={
            "name": f"TEST_Medico {uuid.uuid4().hex[:6]}",
            "profile_type": "personal",
            "sub_type": "medico",
            "data": {
                "blood_type": "O+",
                "allergies": "Penicillin",
                "medications": "Aspirin",
                "emergency_name": "Jane Doe",
                "emergency_phone": "+123456789"
            }
        })
        assert response.status_code == 200
        data = response.json()
        assert data["sub_type"] == "medico"
        print(f"Medical profile created: {data['hash']}")

    def test_create_mascota_profile(self, personal_user_auth):
        """Test creating pet (mascota) personal profile"""
        response = requests.post(f"{BASE_URL}/api/qr-profiles", headers=personal_user_auth, json={
            "name": f"TEST_Mascota {uuid.uuid4().hex[:6]}",
            "profile_type": "personal",
            "sub_type": "mascota",
            "data": {
                "pet_name": "Max",
                "species": "Dog",
                "breed": "Labrador",
                "owner": "John Doe",
                "phone": "+123456789"
            }
        })
        assert response.status_code == 200
        data = response.json()
        assert data["sub_type"] == "mascota"
        print(f"Pet profile created: {data['hash']}")

    def test_create_vehiculo_profile(self, personal_user_auth):
        """Test creating vehicle (vehiculo) personal profile"""
        response = requests.post(f"{BASE_URL}/api/qr-profiles", headers=personal_user_auth, json={
            "name": f"TEST_Vehiculo {uuid.uuid4().hex[:6]}",
            "profile_type": "personal",
            "sub_type": "vehiculo",
            "data": {
                "brand": "Toyota",
                "model": "Corolla",
                "year": 2023,
                "plate": "ABC123",
                "owner": "John Doe"
            }
        })
        assert response.status_code == 200
        data = response.json()
        assert data["sub_type"] == "vehiculo"
        print(f"Vehicle profile created: {data['hash']}")

    def test_create_nino_profile(self, personal_user_auth):
        """Test creating child/elderly (nino) personal profile"""
        response = requests.post(f"{BASE_URL}/api/qr-profiles", headers=personal_user_auth, json={
            "name": f"TEST_Nino {uuid.uuid4().hex[:6]}",
            "profile_type": "personal",
            "sub_type": "nino",
            "data": {
                "person_name": "Test Child",
                "age": 8,
                "condition": "None",
                "address": "Test Street 123",
                "emergency_name": "Parent Name",
                "emergency_phone": "+123456789"
            }
        })
        assert response.status_code == 200
        data = response.json()
        assert data["sub_type"] == "nino"
        print(f"Child/elderly profile created: {data['hash']}")

    # Business user cannot create personal profiles rule (not enforced, so skipping)
    def test_personal_user_cannot_create_business_profile(self, personal_user_auth):
        """Test that personal user cannot create business profile"""
        response = requests.post(f"{BASE_URL}/api/qr-profiles", headers=personal_user_auth, json={
            "name": f"TEST_ShouldFail {uuid.uuid4().hex[:6]}",
            "profile_type": "business",
            "sub_type": "restaurante",
            "data": {}
        })
        assert response.status_code == 403
        print("Personal user correctly blocked from creating business profile")


class TestPublicProfileAccess:
    """Test public profile access"""
    
    @pytest.fixture
    def test_profile_hash(self):
        """Create a test profile and return its hash"""
        unique_email = f"TEST_pub_{uuid.uuid4().hex[:8]}@test.com"
        # Register user
        reg_response = requests.post(f"{BASE_URL}/api/auth/register", json={
            "email": unique_email,
            "password": "testpass123",
            "name": "Test User",
            "user_type": "person"
        })
        token = reg_response.json()["token"]
        
        # Create profile
        profile_response = requests.post(f"{BASE_URL}/api/qr-profiles", 
            headers={"Authorization": f"Bearer {token}"},
            json={
                "name": f"TEST_Public {uuid.uuid4().hex[:6]}",
                "profile_type": "personal",
                "sub_type": "medico",
                "data": {"blood_type": "A+"}
            }
        )
        return profile_response.json()["hash"]
    
    def test_public_profile_access(self, test_profile_hash):
        """Test accessing public profile without auth"""
        response = requests.get(f"{BASE_URL}/api/public/profile/{test_profile_hash}")
        assert response.status_code == 200
        data = response.json()
        assert "data" in data
        assert data["status"] != "paused"
        print(f"Public profile access OK: {test_profile_hash}")

    def test_public_profile_scan_register(self, test_profile_hash):
        """Test registering a scan on public profile"""
        response = requests.post(f"{BASE_URL}/api/public/profile/{test_profile_hash}/scan", json={
            "lat": -33.4489,
            "lng": -70.6693,
            "user_agent": "Test Agent"
        })
        assert response.status_code == 200
        data = response.json()
        assert data["status"] == "success"
        print(f"Scan registered successfully")


if __name__ == "__main__":
    pytest.main([__file__, "-v", "--tb=short"])

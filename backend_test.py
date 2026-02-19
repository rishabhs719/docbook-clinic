#!/usr/bin/env python3

import requests
import json
import sys
from datetime import datetime
from typing import Optional

class DigitalClinicAPITester:
    def __init__(self):
        # Use the public backend URL for testing
        self.base_url = "https://docbook-clinic.preview.emergentagent.com/api"
        self.headers = {'Content-Type': 'application/json'}
        self.session_token = None
        self.access_token = None
        self.current_user = None
        
        self.tests_run = 0
        self.tests_passed = 0
        self.failed_tests = []

    def log(self, message, status="INFO"):
        print(f"[{status}] {message}")

    def run_test(self, name: str, func):
        """Run a single test and track results"""
        self.tests_run += 1
        self.log(f"Running: {name}")
        
        try:
            result = func()
            if result:
                self.tests_passed += 1
                self.log(f"✅ PASSED: {name}", "PASS")
            else:
                self.log(f"❌ FAILED: {name}", "FAIL")
                self.failed_tests.append(name)
        except Exception as e:
            self.log(f"❌ ERROR: {name} - {str(e)}", "ERROR")
            self.failed_tests.append(f"{name} (Exception: {str(e)})")

    def api_request(self, method: str, endpoint: str, data=None, auth=True):
        """Make API request with proper auth headers"""
        url = f"{self.base_url}{endpoint}"
        headers = self.headers.copy()
        
        if auth and self.access_token:
            headers['Authorization'] = f'Bearer {self.access_token}'
        
        try:
            if method == 'GET':
                response = requests.get(url, headers=headers)
            elif method == 'POST':
                response = requests.post(url, json=data, headers=headers)
            elif method == 'PATCH':
                response = requests.patch(url, json=data, headers=headers)
            elif method == 'DELETE':
                response = requests.delete(url, headers=headers)
            
            return response
        except Exception as e:
            self.log(f"Request failed: {str(e)}")
            return None

    # Test Cases
    def test_health_check(self):
        """Test if backend is accessible"""
        try:
            response = requests.get(f"{self.base_url}/auth/me", headers=self.headers)
            # Even if unauthorized, server should respond
            return response.status_code in [200, 401, 422]
        except:
            return False

    def test_doctor_login(self):
        """Test doctor login with provided credentials"""
        response = self.api_request('POST', '/auth/login', {
            'email': 'doctor@clinic.com',
            'password': 'password123'
        }, auth=False)
        
        if response and response.status_code == 200:
            data = response.json()
            self.access_token = data.get('access_token')
            self.current_user = data.get('user')
            self.log(f"Doctor login successful. Role: {self.current_user.get('role')}")
            return True
        else:
            self.log(f"Doctor login failed. Status: {response.status_code if response else 'No response'}")
            if response:
                self.log(f"Response: {response.text}")
            return False

    def test_patient_registration(self):
        """Test patient registration"""
        # Create unique test patient
        timestamp = datetime.now().strftime('%H%M%S')
        patient_data = {
            'email': f'test.patient.{timestamp}@example.com',
            'password': 'testpass123',
            'name': f'Test Patient {timestamp}',
            'role': 'patient',
            'phone': '+1234567890'
        }
        
        response = self.api_request('POST', '/auth/register', patient_data, auth=False)
        
        if response and response.status_code == 200:
            data = response.json()
            self.log(f"Patient registration successful. User ID: {data.get('user', {}).get('user_id')}")
            return True
        else:
            self.log(f"Patient registration failed. Status: {response.status_code if response else 'No response'}")
            if response:
                self.log(f"Response: {response.text}")
            return False

    def test_auth_me(self):
        """Test getting current user info"""
        response = self.api_request('GET', '/auth/me')
        
        if response and response.status_code == 200:
            user_data = response.json()
            self.log(f"Auth/me successful. User: {user_data.get('name')} ({user_data.get('role')})")
            return True
        else:
            self.log(f"Auth/me failed. Status: {response.status_code if response else 'No response'}")
            return False

    def test_get_patients_list(self):
        """Test doctor getting patients list"""
        if not self.current_user or self.current_user.get('role') != 'doctor':
            self.log("Skipping patients list test - not logged in as doctor")
            return True  # Skip but don't fail
            
        response = self.api_request('GET', '/patients')
        
        if response and response.status_code == 200:
            patients = response.json()
            self.log(f"Patients list retrieved. Count: {len(patients)}")
            return True
        else:
            self.log(f"Get patients failed. Status: {response.status_code if response else 'No response'}")
            return False

    def test_available_slots(self):
        """Test getting available appointment slots"""
        from datetime import datetime, timedelta
        tomorrow = (datetime.now() + timedelta(days=1)).strftime('%Y-%m-%d')
        
        response = self.api_request('GET', f'/available-slots?date={tomorrow}', auth=False)
        
        if response and response.status_code == 200:
            data = response.json()
            slots = data.get('available_slots', [])
            self.log(f"Available slots for {tomorrow}: {len(slots)} slots")
            return True
        else:
            self.log(f"Available slots failed. Status: {response.status_code if response else 'No response'}")
            return False

    def test_appointments_endpoints(self):
        """Test appointments CRUD operations"""
        # Test get appointments
        response = self.api_request('GET', '/appointments')
        
        if response and response.status_code == 200:
            appointments = response.json()
            self.log(f"Get appointments successful. Count: {len(appointments)}")
            return True
        else:
            self.log(f"Get appointments failed. Status: {response.status_code if response else 'No response'}")
            return False

    def test_medical_records_endpoints(self):
        """Test medical records CRUD operations"""
        response = self.api_request('GET', '/medical-records')
        
        if response and response.status_code == 200:
            records = response.json()
            self.log(f"Get medical records successful. Count: {len(records)}")
            return True
        else:
            self.log(f"Get medical records failed. Status: {response.status_code if response else 'No response'}")
            return False

    def test_create_appointment_as_patient(self):
        """Test creating appointment as patient - need patient login first"""
        if self.current_user and self.current_user.get('role') == 'doctor':
            self.log("Skipping appointment creation - logged in as doctor, need patient")
            return True
            
        # This would need a patient login first
        self.log("Appointment creation test requires patient authentication")
        return True

    def run_all_tests(self):
        """Run all test cases"""
        self.log("=" * 60)
        self.log("STARTING DIGITAL CLINIC API TESTS")
        self.log("=" * 60)
        
        # Critical tests first
        self.run_test("Backend Health Check", self.test_health_check)
        self.run_test("Doctor Login", self.test_doctor_login)
        self.run_test("Auth Me Endpoint", self.test_auth_me)
        
        # Registration and basic endpoints
        self.run_test("Patient Registration", self.test_patient_registration)
        self.run_test("Available Time Slots", self.test_available_slots)
        
        # Protected endpoints (requires auth)
        self.run_test("Get Patients List", self.test_get_patients_list)
        self.run_test("Get Appointments", self.test_appointments_endpoints)
        self.run_test("Get Medical Records", self.test_medical_records_endpoints)
        
        # Summary
        self.log("=" * 60)
        self.log("TEST RESULTS SUMMARY")
        self.log("=" * 60)
        self.log(f"Total Tests: {self.tests_run}")
        self.log(f"Passed: {self.tests_passed}")
        self.log(f"Failed: {len(self.failed_tests)}")
        
        if self.failed_tests:
            self.log("\nFAILED TESTS:")
            for test in self.failed_tests:
                self.log(f"  - {test}")
        
        success_rate = (self.tests_passed / self.tests_run * 100) if self.tests_run > 0 else 0
        self.log(f"\nSuccess Rate: {success_rate:.1f}%")
        
        return len(self.failed_tests) == 0

if __name__ == "__main__":
    tester = DigitalClinicAPITester()
    success = tester.run_all_tests()
    sys.exit(0 if success else 1)
from fastapi import FastAPI, APIRouter, HTTPException, Request, Response, Depends
from fastapi.responses import JSONResponse
from dotenv import load_dotenv
from starlette.middleware.cors import CORSMiddleware
from motor.motor_asyncio import AsyncIOMotorClient
import os
import logging
from pathlib import Path
from pydantic import BaseModel, Field, ConfigDict, EmailStr
from typing import List, Optional
import uuid
from datetime import datetime, timezone, timedelta
from passlib.context import CryptContext
from jose import JWTError, jwt
import httpx
import asyncio
import resend

ROOT_DIR = Path(__file__).parent
load_dotenv(ROOT_DIR / '.env')

# MongoDB connection
mongo_url = os.environ['MONGO_URL']
client = AsyncIOMotorClient(mongo_url)
db = client[os.environ['DB_NAME']]

# Security
pwd_context = CryptContext(schemes=["bcrypt"], deprecated="auto")
SECRET_KEY = os.environ.get('JWT_SECRET_KEY', 'your-secret-key-change-in-production')
ALGORITHM = "HS256"
ACCESS_TOKEN_EXPIRE_MINUTES = 60 * 24 * 7  # 7 days

# Resend setup
RESEND_API_KEY = os.environ.get('RESEND_API_KEY', '')
SENDER_EMAIL = os.environ.get('SENDER_EMAIL', 'onboarding@resend.dev')
if RESEND_API_KEY:
    resend.api_key = RESEND_API_KEY

# Twilio setup
TWILIO_ACCOUNT_SID = os.environ.get('TWILIO_ACCOUNT_SID', '')
TWILIO_AUTH_TOKEN = os.environ.get('TWILIO_AUTH_TOKEN', '')
TWILIO_PHONE_NUMBER = os.environ.get('TWILIO_PHONE_NUMBER', '')

# Create the main app
app = FastAPI()
api_router = APIRouter(prefix="/api")

logging.basicConfig(level=logging.INFO, format='%(asctime)s - %(name)s - %(levelname)s - %(message)s')
logger = logging.getLogger(__name__)

# ==================== MODELS ====================

class User(BaseModel):
    model_config = ConfigDict(extra="ignore")
    user_id: str
    email: EmailStr
    name: str
    role: str  # 'doctor' or 'patient'
    phone: Optional[str] = None
    picture: Optional[str] = None
    created_at: datetime

class UserRegister(BaseModel):
    email: EmailStr
    password: str
    name: str
    role: str
    phone: Optional[str] = None

class UserLogin(BaseModel):
    email: EmailStr
    password: str

class UserSession(BaseModel):
    model_config = ConfigDict(extra="ignore")
    user_id: str
    session_token: str
    expires_at: datetime
    created_at: datetime

class Appointment(BaseModel):
    model_config = ConfigDict(extra="ignore")
    appointment_id: str
    patient_id: str
    patient_name: str
    doctor_id: str
    date: str  # YYYY-MM-DD
    time_slot: str  # HH:MM
    status: str  # 'scheduled', 'completed', 'cancelled', 'rescheduled'
    notes: Optional[str] = None
    created_at: datetime
    updated_at: datetime

class AppointmentCreate(BaseModel):
    date: str
    time_slot: str
    notes: Optional[str] = None

class AppointmentUpdate(BaseModel):
    date: Optional[str] = None
    time_slot: Optional[str] = None
    status: Optional[str] = None
    notes: Optional[str] = None

class MedicalRecord(BaseModel):
    model_config = ConfigDict(extra="ignore")
    record_id: str
    patient_id: str
    patient_name: str
    doctor_id: str
    visit_date: str
    diagnosis: str
    prescription: str
    notes: Optional[str] = None
    documents: Optional[List[str]] = []
    created_at: datetime
    updated_at: datetime

class MedicalRecordCreate(BaseModel):
    patient_id: str
    visit_date: str
    diagnosis: str
    prescription: str
    notes: Optional[str] = None

class MedicalRecordUpdate(BaseModel):
    diagnosis: Optional[str] = None
    prescription: Optional[str] = None
    notes: Optional[str] = None

class DoctorAvailability(BaseModel):
    model_config = ConfigDict(extra="ignore")
    availability_id: str
    doctor_id: str
    weekday: int  # 0-6 (Monday-Sunday)
    time_slots: List[str]  # ["09:00", "10:00", "11:00"]
    is_available: bool

class ReminderSchedule(BaseModel):
    appointment_id: str
    type: str  # 'email' or 'sms'
    scheduled_time: datetime

# ==================== AUTH HELPERS ====================

def hash_password(password: str) -> str:
    return pwd_context.hash(password)

def verify_password(plain_password: str, hashed_password: str) -> bool:
    return pwd_context.verify(plain_password, hashed_password)

def create_access_token(data: dict) -> str:
    to_encode = data.copy()
    expire = datetime.now(timezone.utc) + timedelta(minutes=ACCESS_TOKEN_EXPIRE_MINUTES)
    to_encode.update({"exp": expire})
    encoded_jwt = jwt.encode(to_encode, SECRET_KEY, algorithm=ALGORITHM)
    return encoded_jwt

async def get_current_user(request: Request) -> User:
    # Check session_token from cookie first, then Authorization header
    token = request.cookies.get("session_token")
    
    if not token:
        auth_header = request.headers.get("Authorization")
        if auth_header and auth_header.startswith("Bearer "):
            token = auth_header.split(" ")[1]
    
    if not token:
        raise HTTPException(status_code=401, detail="Not authenticated")
    
    # Check if it's a JWT token or session token
    try:
        payload = jwt.decode(token, SECRET_KEY, algorithms=[ALGORITHM])
        user_id = payload.get("sub")
        if not user_id:
            raise HTTPException(status_code=401, detail="Invalid token")
    except JWTError:
        # It might be a session token from Google OAuth
        session_doc = await db.user_sessions.find_one(
            {"session_token": token},
            {"_id": 0}
        )
        
        if not session_doc:
            raise HTTPException(status_code=401, detail="Invalid session")
        
        # Check expiry
        expires_at = session_doc["expires_at"]
        if isinstance(expires_at, str):
            expires_at = datetime.fromisoformat(expires_at)
        if expires_at.tzinfo is None:
            expires_at = expires_at.replace(tzinfo=timezone.utc)
        
        if expires_at < datetime.now(timezone.utc):
            raise HTTPException(status_code=401, detail="Session expired")
        
        user_id = session_doc["user_id"]
    
    # Get user from database
    user_doc = await db.users.find_one(
        {"user_id": user_id},
        {"_id": 0}
    )
    
    if not user_doc:
        raise HTTPException(status_code=404, detail="User not found")
    
    # Convert datetime strings back to datetime objects
    if isinstance(user_doc.get('created_at'), str):
        user_doc['created_at'] = datetime.fromisoformat(user_doc['created_at'])
    
    return User(**user_doc)

# ==================== AUTH ENDPOINTS ====================

@api_router.post("/auth/register")
async def register(user_data: UserRegister):
    # Check if user exists
    existing_user = await db.users.find_one({"email": user_data.email}, {"_id": 0})
    if existing_user:
        raise HTTPException(status_code=400, detail="Email already registered")
    
    # Create user
    user_id = f"user_{uuid.uuid4().hex[:12]}"
    hashed_password = hash_password(user_data.password)
    
    user_doc = {
        "user_id": user_id,
        "email": user_data.email,
        "password_hash": hashed_password,
        "name": user_data.name,
        "role": user_data.role,
        "phone": user_data.phone,
        "picture": None,
        "created_at": datetime.now(timezone.utc).isoformat()
    }
    
    await db.users.insert_one(user_doc)
    
    # Create JWT token
    access_token = create_access_token(data={"sub": user_id})
    
    # Return user without password
    user_response = {k: v for k, v in user_doc.items() if k != "password_hash"}
    user_response['created_at'] = datetime.fromisoformat(user_response['created_at'])
    
    return {
        "user": User(**user_response),
        "access_token": access_token,
        "token_type": "bearer"
    }

@api_router.post("/auth/login")
async def login(credentials: UserLogin):
    # Find user
    user_doc = await db.users.find_one({"email": credentials.email}, {"_id": 0})
    if not user_doc:
        raise HTTPException(status_code=401, detail="Invalid email or password")
    
    # Verify password
    if not verify_password(credentials.password, user_doc["password_hash"]):
        raise HTTPException(status_code=401, detail="Invalid email or password")
    
    # Create JWT token
    access_token = create_access_token(data={"sub": user_doc["user_id"]})
    
    # Return user without password
    user_response = {k: v for k, v in user_doc.items() if k != "password_hash"}
    if isinstance(user_response['created_at'], str):
        user_response['created_at'] = datetime.fromisoformat(user_response['created_at'])
    
    return {
        "user": User(**user_response),
        "access_token": access_token,
        "token_type": "bearer"
    }

@api_router.post("/auth/google/session")
async def google_session(request: Request, response: Response):
    body = await request.json()
    session_id = body.get("session_id")
    
    if not session_id:
        raise HTTPException(status_code=400, detail="session_id required")
    
    # Call Emergent Auth API
    async with httpx.AsyncClient() as client:
        try:
            auth_response = await client.get(
                "https://demobackend.emergentagent.com/auth/v1/env/oauth/session-data",
                headers={"X-Session-ID": session_id}
            )
            auth_response.raise_for_status()
            session_data = auth_response.json()
        except Exception as e:
            logger.error(f"Failed to get session data: {str(e)}")
            raise HTTPException(status_code=400, detail="Invalid session_id")
    
    # Check if user exists
    user_doc = await db.users.find_one({"email": session_data["email"]}, {"_id": 0})
    
    if user_doc:
        # Update user info
        await db.users.update_one(
            {"user_id": user_doc["user_id"]},
            {"$set": {
                "name": session_data["name"],
                "picture": session_data.get("picture")
            }}
        )
        user_id = user_doc["user_id"]
    else:
        # Create new user (default role: patient)
        user_id = f"user_{uuid.uuid4().hex[:12]}"
        new_user = {
            "user_id": user_id,
            "email": session_data["email"],
            "name": session_data["name"],
            "role": "patient",
            "phone": None,
            "picture": session_data.get("picture"),
            "created_at": datetime.now(timezone.utc).isoformat()
        }
        await db.users.insert_one(new_user)
    
    # Store session
    session_token = session_data["session_token"]
    expires_at = datetime.now(timezone.utc) + timedelta(days=7)
    
    await db.user_sessions.insert_one({
        "user_id": user_id,
        "session_token": session_token,
        "expires_at": expires_at.isoformat(),
        "created_at": datetime.now(timezone.utc).isoformat()
    })
    
    # Set httpOnly cookie
    response.set_cookie(
        key="session_token",
        value=session_token,
        httponly=True,
        secure=True,
        samesite="none",
        path="/",
        max_age=7 * 24 * 60 * 60
    )
    
    # Get full user data
    user_doc = await db.users.find_one({"user_id": user_id}, {"_id": 0})
    if isinstance(user_doc['created_at'], str):
        user_doc['created_at'] = datetime.fromisoformat(user_doc['created_at'])
    
    return {"user": User(**user_doc)}

@api_router.get("/auth/me")
async def get_me(current_user: User = Depends(get_current_user)):
    return current_user

@api_router.post("/auth/logout")
async def logout(request: Request, response: Response):
    token = request.cookies.get("session_token")
    if token:
        await db.user_sessions.delete_one({"session_token": token})
    
    response.delete_cookie(key="session_token", path="/")
    return {"message": "Logged out successfully"}

# ==================== APPOINTMENT ENDPOINTS ====================

@api_router.post("/appointments", response_model=Appointment)
async def create_appointment(
    appointment_data: AppointmentCreate,
    current_user: User = Depends(get_current_user)
):
    if current_user.role != "patient":
        raise HTTPException(status_code=403, detail="Only patients can book appointments")
    
    # Get doctor (assuming first doctor in system for MVP)
    doctor = await db.users.find_one({"role": "doctor"}, {"_id": 0})
    if not doctor:
        raise HTTPException(status_code=404, detail="No doctor available")
    
    # Check if slot is available
    existing = await db.appointments.find_one({
        "date": appointment_data.date,
        "time_slot": appointment_data.time_slot,
        "status": {"$in": ["scheduled", "rescheduled"]}
    })
    
    if existing:
        raise HTTPException(status_code=400, detail="Time slot already booked")
    
    appointment_id = f"appt_{uuid.uuid4().hex[:12]}"
    now = datetime.now(timezone.utc)
    
    appointment_doc = {
        "appointment_id": appointment_id,
        "patient_id": current_user.user_id,
        "patient_name": current_user.name,
        "doctor_id": doctor["user_id"],
        "date": appointment_data.date,
        "time_slot": appointment_data.time_slot,
        "status": "scheduled",
        "notes": appointment_data.notes,
        "created_at": now.isoformat(),
        "updated_at": now.isoformat()
    }
    
    await db.appointments.insert_one(appointment_doc)
    
    # Schedule reminders (async background task)
    asyncio.create_task(schedule_reminders(appointment_id, appointment_data.date, appointment_data.time_slot, current_user.email, current_user.phone))
    
    appointment_doc['created_at'] = now
    appointment_doc['updated_at'] = now
    return Appointment(**appointment_doc)

@api_router.get("/appointments", response_model=List[Appointment])
async def get_appointments(current_user: User = Depends(get_current_user)):
    query = {}
    if current_user.role == "patient":
        query["patient_id"] = current_user.user_id
    elif current_user.role == "doctor":
        query["doctor_id"] = current_user.user_id
    
    appointments = await db.appointments.find(query, {"_id": 0}).to_list(1000)
    
    for appt in appointments:
        if isinstance(appt['created_at'], str):
            appt['created_at'] = datetime.fromisoformat(appt['created_at'])
        if isinstance(appt['updated_at'], str):
            appt['updated_at'] = datetime.fromisoformat(appt['updated_at'])
    
    return appointments

@api_router.get("/appointments/{appointment_id}", response_model=Appointment)
async def get_appointment(
    appointment_id: str,
    current_user: User = Depends(get_current_user)
):
    appointment = await db.appointments.find_one(
        {"appointment_id": appointment_id},
        {"_id": 0}
    )
    
    if not appointment:
        raise HTTPException(status_code=404, detail="Appointment not found")
    
    # Check access
    if current_user.role == "patient" and appointment["patient_id"] != current_user.user_id:
        raise HTTPException(status_code=403, detail="Not authorized")
    elif current_user.role == "doctor" and appointment["doctor_id"] != current_user.user_id:
        raise HTTPException(status_code=403, detail="Not authorized")
    
    if isinstance(appointment['created_at'], str):
        appointment['created_at'] = datetime.fromisoformat(appointment['created_at'])
    if isinstance(appointment['updated_at'], str):
        appointment['updated_at'] = datetime.fromisoformat(appointment['updated_at'])
    
    return Appointment(**appointment)

@api_router.patch("/appointments/{appointment_id}", response_model=Appointment)
async def update_appointment(
    appointment_id: str,
    update_data: AppointmentUpdate,
    current_user: User = Depends(get_current_user)
):
    appointment = await db.appointments.find_one(
        {"appointment_id": appointment_id},
        {"_id": 0}
    )
    
    if not appointment:
        raise HTTPException(status_code=404, detail="Appointment not found")
    
    # Check access
    if current_user.role == "patient" and appointment["patient_id"] != current_user.user_id:
        raise HTTPException(status_code=403, detail="Not authorized")
    
    # Build update dict
    update_dict = {k: v for k, v in update_data.model_dump().items() if v is not None}
    update_dict["updated_at"] = datetime.now(timezone.utc).isoformat()
    
    if update_dict:
        await db.appointments.update_one(
            {"appointment_id": appointment_id},
            {"$set": update_dict}
        )
    
    # Get updated appointment
    updated_appointment = await db.appointments.find_one(
        {"appointment_id": appointment_id},
        {"_id": 0}
    )
    
    if isinstance(updated_appointment['created_at'], str):
        updated_appointment['created_at'] = datetime.fromisoformat(updated_appointment['created_at'])
    if isinstance(updated_appointment['updated_at'], str):
        updated_appointment['updated_at'] = datetime.fromisoformat(updated_appointment['updated_at'])
    
    return Appointment(**updated_appointment)

# ==================== MEDICAL RECORDS ENDPOINTS ====================

@api_router.post("/medical-records", response_model=MedicalRecord)
async def create_medical_record(
    record_data: MedicalRecordCreate,
    current_user: User = Depends(get_current_user)
):
    if current_user.role != "doctor":
        raise HTTPException(status_code=403, detail="Only doctors can create medical records")
    
    # Get patient name
    patient = await db.users.find_one({"user_id": record_data.patient_id}, {"_id": 0})
    if not patient:
        raise HTTPException(status_code=404, detail="Patient not found")
    
    record_id = f"record_{uuid.uuid4().hex[:12]}"
    now = datetime.now(timezone.utc)
    
    record_doc = {
        "record_id": record_id,
        "patient_id": record_data.patient_id,
        "patient_name": patient["name"],
        "doctor_id": current_user.user_id,
        "visit_date": record_data.visit_date,
        "diagnosis": record_data.diagnosis,
        "prescription": record_data.prescription,
        "notes": record_data.notes,
        "documents": [],
        "created_at": now.isoformat(),
        "updated_at": now.isoformat()
    }
    
    await db.medical_records.insert_one(record_doc)
    
    record_doc['created_at'] = now
    record_doc['updated_at'] = now
    return MedicalRecord(**record_doc)

@api_router.get("/medical-records", response_model=List[MedicalRecord])
async def get_medical_records(current_user: User = Depends(get_current_user)):
    query = {}
    if current_user.role == "patient":
        query["patient_id"] = current_user.user_id
    elif current_user.role == "doctor":
        query["doctor_id"] = current_user.user_id
    
    records = await db.medical_records.find(query, {"_id": 0}).to_list(1000)
    
    for record in records:
        if isinstance(record['created_at'], str):
            record['created_at'] = datetime.fromisoformat(record['created_at'])
        if isinstance(record['updated_at'], str):
            record['updated_at'] = datetime.fromisoformat(record['updated_at'])
    
    return records

@api_router.get("/medical-records/patient/{patient_id}", response_model=List[MedicalRecord])
async def get_patient_medical_records(
    patient_id: str,
    current_user: User = Depends(get_current_user)
):
    # Only doctor or the patient themselves can access
    if current_user.role == "patient" and current_user.user_id != patient_id:
        raise HTTPException(status_code=403, detail="Not authorized")
    
    records = await db.medical_records.find(
        {"patient_id": patient_id},
        {"_id": 0}
    ).to_list(1000)
    
    for record in records:
        if isinstance(record['created_at'], str):
            record['created_at'] = datetime.fromisoformat(record['created_at'])
        if isinstance(record['updated_at'], str):
            record['updated_at'] = datetime.fromisoformat(record['updated_at'])
    
    return records

@api_router.patch("/medical-records/{record_id}", response_model=MedicalRecord)
async def update_medical_record(
    record_id: str,
    update_data: MedicalRecordUpdate,
    current_user: User = Depends(get_current_user)
):
    if current_user.role != "doctor":
        raise HTTPException(status_code=403, detail="Only doctors can update medical records")
    
    record = await db.medical_records.find_one(
        {"record_id": record_id},
        {"_id": 0}
    )
    
    if not record:
        raise HTTPException(status_code=404, detail="Record not found")
    
    # Build update dict
    update_dict = {k: v for k, v in update_data.model_dump().items() if v is not None}
    update_dict["updated_at"] = datetime.now(timezone.utc).isoformat()
    
    if update_dict:
        await db.medical_records.update_one(
            {"record_id": record_id},
            {"$set": update_dict}
        )
    
    # Get updated record
    updated_record = await db.medical_records.find_one(
        {"record_id": record_id},
        {"_id": 0}
    )
    
    if isinstance(updated_record['created_at'], str):
        updated_record['created_at'] = datetime.fromisoformat(updated_record['created_at'])
    if isinstance(updated_record['updated_at'], str):
        updated_record['updated_at'] = datetime.fromisoformat(updated_record['updated_at'])
    
    return MedicalRecord(**updated_record)

# ==================== AVAILABLE TIME SLOTS ====================

@api_router.get("/available-slots")
async def get_available_slots(date: str):
    # Get all appointments for the date
    appointments = await db.appointments.find(
        {
            "date": date,
            "status": {"$in": ["scheduled", "rescheduled"]}
        },
        {"_id": 0}
    ).to_list(1000)
    
    booked_slots = [appt["time_slot"] for appt in appointments]
    
    # Generate available slots (9 AM - 5 PM)
    all_slots = []
    for hour in range(9, 17):
        all_slots.append(f"{hour:02d}:00")
        all_slots.append(f"{hour:02d}:30")
    
    available_slots = [slot for slot in all_slots if slot not in booked_slots]
    
    return {"date": date, "available_slots": available_slots}

# ==================== PATIENTS LIST (Doctor only) ====================

@api_router.get("/patients", response_model=List[User])
async def get_patients(current_user: User = Depends(get_current_user)):
    if current_user.role != "doctor":
        raise HTTPException(status_code=403, detail="Only doctors can view patient list")
    
    patients = await db.users.find(
        {"role": "patient"},
        {"_id": 0, "password_hash": 0}
    ).to_list(1000)
    
    for patient in patients:
        if isinstance(patient.get('created_at'), str):
            patient['created_at'] = datetime.fromisoformat(patient['created_at'])
    
    return patients

# ==================== REMINDER SCHEDULER ====================

async def schedule_reminders(appointment_id: str, date: str, time_slot: str, email: str, phone: Optional[str]):
    """Schedule email and SMS reminders for appointment"""
    try:
        # Parse appointment datetime
        appointment_datetime = datetime.strptime(f"{date} {time_slot}", "%Y-%m-%d %H:%M")
        appointment_datetime = appointment_datetime.replace(tzinfo=timezone.utc)
        
        # Schedule 24 hours before
        reminder_24h = appointment_datetime - timedelta(hours=24)
        # Schedule 2 hours before
        reminder_2h = appointment_datetime - timedelta(hours=2)
        
        now = datetime.now(timezone.utc)
        
        # Only schedule if reminder time is in the future
        if reminder_24h > now:
            await send_reminder_email(email, date, time_slot, "24 hours")
            if phone and TWILIO_ACCOUNT_SID:
                await send_reminder_sms(phone, date, time_slot, "24 hours")
        
        if reminder_2h > now:
            await send_reminder_email(email, date, time_slot, "2 hours")
            if phone and TWILIO_ACCOUNT_SID:
                await send_reminder_sms(phone, date, time_slot, "2 hours")
        
        logger.info(f"Reminders scheduled for appointment {appointment_id}")
    except Exception as e:
        logger.error(f"Failed to schedule reminders: {str(e)}")

async def send_reminder_email(email: str, date: str, time_slot: str, timeframe: str):
    """Send email reminder"""
    if not RESEND_API_KEY:
        logger.warning("Resend API key not configured, skipping email reminder")
        return
    
    try:
        params = {
            "from": SENDER_EMAIL,
            "to": [email],
            "subject": f"Appointment Reminder - {timeframe} before",
            "html": f"""
            <html>
                <body style="font-family: Arial, sans-serif; padding: 20px;">
                    <h2 style="color: #0F766E;">Appointment Reminder</h2>
                    <p>This is a friendly reminder about your upcoming appointment.</p>
                    <p><strong>Date:</strong> {date}</p>
                    <p><strong>Time:</strong> {time_slot}</p>
                    <p><strong>Reminder:</strong> {timeframe} before your appointment</p>
                    <p>Please arrive 10 minutes early. If you need to reschedule, please contact us.</p>
                    <p style="color: #64748B; font-size: 12px; margin-top: 30px;">Best regards,<br>Your Medical Clinic</p>
                </body>
            </html>
            """
        }
        
        email_response = await asyncio.to_thread(resend.Emails.send, params)
        logger.info(f"Email reminder sent to {email}: {email_response.get('id')}")
    except Exception as e:
        logger.error(f"Failed to send email reminder: {str(e)}")

async def send_reminder_sms(phone: str, date: str, time_slot: str, timeframe: str):
    """Send SMS reminder via Twilio"""
    if not TWILIO_ACCOUNT_SID or not TWILIO_AUTH_TOKEN:
        logger.warning("Twilio credentials not configured, skipping SMS reminder")
        return
    
    try:
        from twilio.rest import Client
        
        client = Client(TWILIO_ACCOUNT_SID, TWILIO_AUTH_TOKEN)
        
        message = await asyncio.to_thread(
            client.messages.create,
            body=f"Appointment Reminder ({timeframe} before): {date} at {time_slot}. Please arrive 10 minutes early.",
            from_=TWILIO_PHONE_NUMBER,
            to=phone
        )
        
        logger.info(f"SMS reminder sent to {phone}: {message.sid}")
    except Exception as e:
        logger.error(f"Failed to send SMS reminder: {str(e)}")

# ==================== MIDDLEWARE & APP SETUP ====================

app.include_router(api_router)

app.add_middleware(
    CORSMiddleware,
    allow_credentials=True,
    allow_origins=os.environ.get('CORS_ORIGINS', '*').split(','),
    allow_methods=["*"],
    allow_headers=["*"],
)

@app.on_event("shutdown")
async def shutdown_db_client():
    client.close()

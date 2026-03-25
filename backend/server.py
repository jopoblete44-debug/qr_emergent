from fastapi import FastAPI, APIRouter, HTTPException, Request, UploadFile, File
from fastapi.responses import JSONResponse, RedirectResponse, StreamingResponse
from fastapi.staticfiles import StaticFiles
from dotenv import load_dotenv
from starlette.middleware.cors import CORSMiddleware
from motor.motor_asyncio import AsyncIOMotorClient
import os
import logging
from pathlib import Path
from pydantic import BaseModel, Field, ConfigDict, EmailStr
from typing import List, Optional, Dict, Any, Literal, Tuple, Set
import uuid
from datetime import datetime, timezone, timedelta
import json
import unicodedata
import bcrypt
import jwt
import qrcode
import qrcode.image.svg as qrcode_svg
import io
import hashlib
import requests
from bson import ObjectId
from reportlab.lib.pagesizes import letter
from reportlab.pdfgen import canvas
from reportlab.lib.utils import ImageReader
import re
import secrets
from urllib.parse import quote, urlparse
import csv
import smtplib
import copy
import html
from email.message import EmailMessage
from qrcode.constants import ERROR_CORRECT_L, ERROR_CORRECT_M, ERROR_CORRECT_Q, ERROR_CORRECT_H

ROOT_DIR = Path(__file__).parent
load_dotenv(ROOT_DIR / '.env')
CHILE_REGIONS_COMMUNES_PATH = ROOT_DIR / "data" / "chile_regions_communes.json"
CHILE_REGIONS_COMMUNES_CACHE: Optional[List[Dict[str, Any]]] = None

# MongoDB connection
mongo_url = os.environ['MONGO_URL']
client = AsyncIOMotorClient(mongo_url)
db = client[os.environ['DB_NAME']]

# JWT Secret
JWT_SECRET = os.getenv('JWT_SECRET', 'your-secret-key-change-in-production')
JWT_ALGORITHM = 'HS256'
JWT_EXPIRATION_HOURS = 24 * 30  # 30 days

# MercadoPago config (opcional por ahora)
MERCADOPAGO_ACCESS_TOKEN = os.getenv('MERCADOPAGO_ACCESS_TOKEN', '')
FRONTEND_URL = os.getenv('FRONTEND_URL', 'http://localhost:3000')
SUBSCRIPTION_PERIOD_DAYS: Dict[str, int] = {
    'monthly': 30,
    'yearly': 365,
}
PASSWORD_RESET_CODE_TTL_MINUTES = max(5, int(os.getenv('PASSWORD_RESET_CODE_TTL_MINUTES', '20') or '20'))
PASSWORD_RESET_MAX_ATTEMPTS = max(3, int(os.getenv('PASSWORD_RESET_MAX_ATTEMPTS', '5') or '5'))

# Create the main app
app = FastAPI()
api_router = APIRouter(prefix="/api")
UPLOADS_DIR = ROOT_DIR / "uploads"
UPLOADS_DIR.mkdir(parents=True, exist_ok=True)
BACKEND_PUBLIC_URL = os.getenv('BACKEND_PUBLIC_URL', 'http://localhost:8001').rstrip('/')
app.mount("/uploads", StaticFiles(directory=str(UPLOADS_DIR)), name="uploads")
IMAGE_FIELD_NAME_PATTERN = re.compile(r"(photo|image|logo|avatar|banner|cover|foto|imagen)", re.IGNORECASE)
IMAGE_SETTING_KEYS = {
    'brand_logo_url',
    'favicon_url',
    'seo_og_image_url',
    'store_home_banner_url',
}
UPLOAD_ALLOWED_FILE_EXTENSIONS = {'.jpg', '.jpeg', '.png', '.webp', '.gif'}
UPLOAD_OWNER_SEGMENT_PATTERN = re.compile(r"^[A-Za-z0-9][A-Za-z0-9_-]{0,127}$")
UPLOAD_FILE_NAME_PATTERN = re.compile(r"^[A-Za-z0-9][A-Za-z0-9._-]{0,254}$")
PROFILE_IMAGE_INPUT_SCOPES = {'profiles', 'general'}
ADMIN_PROFILE_IMAGE_INPUT_SCOPES = {'profiles', 'general'}
PRODUCT_IMAGE_INPUT_SCOPES = {'store-products', 'general'}
QR_PUBLIC_SETTINGS_MAX_FLOATING_BUTTONS = 3
PRODUCT_VISIBLE_TO_VALUES = {'visitor', 'person', 'business'}
PRODUCT_VISIBLE_TO_ALIASES = {
    'visitor': 'visitor',
    'visitante': 'visitor',
    'guest': 'visitor',
    'public': 'visitor',
    'all': 'visitor',
    'person': 'person',
    'persona': 'person',
    'personal': 'person',
    'people': 'person',
    'business': 'business',
    'empresa': 'business',
    'negocio': 'business',
    'company': 'business',
}
PROFILE_FLOATING_BUTTON_DEFINITIONS: Dict[str, Dict[str, Dict[str, str]]] = {
    'personal': {
        'call_contact': {'label': 'Llamar contacto'},
        'send_location': {'label': 'Enviar ubicación'},
        'call_emergency': {'label': 'Llamar emergencia'},
        'whatsapp': {'label': 'WhatsApp'},
        'share_profile': {'label': 'Compartir perfil'},
    },
    'business': {
        'send_survey': {'label': 'Responder encuesta'},
        'rate_restaurant': {'label': 'Calificar negocio'},
        'view_catalog_pdf': {'label': 'Ver catálogo'},
        'whatsapp': {'label': 'WhatsApp'},
        'call_business': {'label': 'Llamar negocio'},
        'website': {'label': 'Sitio web'},
    },
}
QR_ERROR_CORRECTION_MAP = {
    'L': ERROR_CORRECT_L,
    'M': ERROR_CORRECT_M,
    'Q': ERROR_CORRECT_Q,
    'H': ERROR_CORRECT_H,
}
QR_COMPLEXITY_TO_ERROR_CORRECTION = {
    'compact': 'L',
    'balanced': 'M',
    'redundant': 'Q',
    'maximum': 'H',
}
QR_OUTPUT_FORMATS = {'png', 'svg'}
QR_HASH_POSITIONS = {'top', 'bottom'}
QR_SVG_FACTORIES = {'path', 'rect'}
DEFAULT_QR_GENERATION_SETTINGS: Dict[str, Any] = {
    'output_format': 'svg',
    'complexity_mode': 'balanced',
    'error_correction': 'M',
    'force_version': 0,
    'module_size': 10,
    'quiet_zone_modules': 4,
    'data_optimization': 20,
    'hash_visible': True,
    'hash_position': 'bottom',
    'hash_prefix': 'ID:',
    'hash_font_size': 16,
    'hash_padding': 12,
    'svg_factory': 'path',
}
SETTINGS_IMAGE_ALLOWED_SCOPES: Dict[str, Set[str]] = {
    'brand_logo_url': {'brand', 'general'},
    'favicon_url': {'brand', 'general'},
    'seo_og_image_url': {'seo', 'general'},
    'store_home_banner_url': {'store', 'general'},
}
UPLOAD_GENERIC_ALLOWED_SCOPES = set().union(
    PROFILE_IMAGE_INPUT_SCOPES,
    ADMIN_PROFILE_IMAGE_INPUT_SCOPES,
    PRODUCT_IMAGE_INPUT_SCOPES,
    *SETTINGS_IMAGE_ALLOWED_SCOPES.values(),
)

logging.basicConfig(level=logging.INFO)
logger = logging.getLogger(__name__)

# ==================== MODELS ====================

class UserBase(BaseModel):
    email: EmailStr
    name: str
    user_type: Literal['person', 'business']
    phone: Optional[str] = None
    address: Optional[str] = None
    business_name: Optional[str] = None

class UserRegister(UserBase):
    password: str

class UserLogin(BaseModel):
    email: EmailStr
    password: str

class ForgotPasswordRequest(BaseModel):
    email: EmailStr

class ResetPasswordRequest(BaseModel):
    email: EmailStr
    code: str
    new_password: str = Field(min_length=6, max_length=128)

class User(UserBase):
    model_config = ConfigDict(extra="ignore")
    id: str
    created_at: datetime

class AdminUserCreate(UserBase):
    password: str
    is_admin: bool = False
    account_status: Literal['active', 'paused', 'deleted'] = 'active'
    account_role: Optional[Literal['standard', 'master', 'subaccount']] = None
    parent_account_id: Optional[str] = None
    permissions: Optional[Dict[str, Any]] = None

class AccountStatusUpdate(BaseModel):
    account_status: Literal['active', 'paused', 'deleted']

class SubaccountCreate(BaseModel):
    email: EmailStr
    name: str
    password: str
    phone: Optional[str] = None
    address: Optional[str] = None
    branch_name: Optional[str] = None
    permissions: Optional[Dict[str, Any]] = None

class SubaccountUpdate(BaseModel):
    name: Optional[str] = None
    phone: Optional[str] = None
    address: Optional[str] = None
    business_name: Optional[str] = None
    branch_name: Optional[str] = None
    password: Optional[str] = None
    permissions: Optional[Dict[str, Any]] = None
    account_status: Optional[Literal['active', 'paused']] = None

class QRProfileBase(BaseModel):
    name: str
    alias: Optional[str] = None  # Nombre interno para identificación
    profile_type: Literal['personal', 'business']
    sub_type: str  # medico, mascota, vehiculo, niño, restaurante, hotel, wifi, etc
    status: Literal['subscription', 'indefinite', 'paused'] = 'indefinite'
    data: Dict[str, Any] = {}
    notification_config: Dict[str, Any] = {}
    public_settings: Dict[str, Any] = Field(default_factory=dict)
    public_settings_customized: Optional[bool] = None
    expiration_date: Optional[str] = None  # ISO format date

class QRProfileCreate(QRProfileBase):
    pass

class QRProfileUpdate(BaseModel):
    name: Optional[str] = None
    alias: Optional[str] = None
    profile_type: Optional[Literal['personal', 'business']] = None
    sub_type: Optional[str] = None
    status: Optional[Literal['subscription', 'indefinite', 'paused']] = None
    data: Optional[Dict[str, Any]] = None
    notification_config: Optional[Dict[str, Any]] = None
    public_settings: Optional[Dict[str, Any]] = None
    public_settings_customized: Optional[bool] = None
    expiration_date: Optional[str] = None

class QRProfile(QRProfileBase):
    model_config = ConfigDict(extra="ignore")
    id: str
    user_id: str
    hash: str
    scan_count: int = 0
    uploads_base_url: Optional[str] = None
    resolved_data: Optional[Any] = None
    created_at: datetime
    updated_at: datetime
    deleted_at: Optional[datetime] = None

class ProductBase(BaseModel):
    name: str
    description: str
    price: float
    category: str
    image_url: Optional[str] = None
    stock: int = 100
    item_type: Literal['product', 'subscription_service'] = 'product'
    subscription_period: Optional[Literal['monthly', 'yearly']] = None
    qr_quota_granted: int = 0
    active: bool = True
    auto_generate_qr: bool = False
    auto_qr_profile_type: Optional[Literal['personal', 'business']] = None
    auto_qr_sub_type: Optional[str] = None
    visible_to: Optional[Literal['visitor', 'person', 'business']] = None

class Product(ProductBase):
    model_config = ConfigDict(extra="ignore")
    id: str
    created_at: datetime

class OrderItem(BaseModel):
    product_id: str
    product_name: str
    quantity: int
    unit_price: float

class OrderBase(BaseModel):
    items: List[OrderItem]
    total: float
    coupon_code: Optional[str] = None
    shipping_cost: Optional[float] = None
    shipping_region: Optional[str] = None
    shipping_commune: Optional[str] = None
    renewal_bucket_id: Optional[str] = None

class Order(OrderBase):
    model_config = ConfigDict(extra="ignore")
    id: str
    user_id: str
    status: Literal['pending', 'paid', 'failed', 'cancelled'] = 'pending'
    mercadopago_preference_id: Optional[str] = None
    mercadopago_payment_id: Optional[str] = None
    subtotal: float = 0
    discount_amount: float = 0
    final_total: float = 0
    generated_qr_profiles: List[str] = []
    created_at: datetime

class CouponBase(BaseModel):
    code: str
    description: Optional[str] = None
    discount_type: Literal['percentage', 'fixed'] = 'percentage'
    discount_value: float = 0
    free_shipping: bool = False
    active: bool = True
    max_uses: Optional[int] = None
    applies_to: Literal['all', 'product', 'subscription_service'] = 'all'

class Coupon(CouponBase):
    model_config = ConfigDict(extra="ignore")
    usage_count: int = 0
    created_at: datetime
    updated_at: Optional[datetime] = None

class AdminQRProfileCreate(QRProfileBase):
    user_id: str

class AdminQRProfileReassign(BaseModel):
    new_user_id: str

class LocationScan(BaseModel):
    model_config = ConfigDict(extra="ignore")
    id: str
    qr_profile_id: str
    lat: Optional[float] = None
    lng: Optional[float] = None
    timestamp: datetime
    user_agent: Optional[str] = None
    scan_type: Literal['view', 'location'] = 'view'
    campaign_source: Optional[str] = None
    campaign_medium: Optional[str] = None
    campaign_name: Optional[str] = None
    campaign_term: Optional[str] = None
    campaign_content: Optional[str] = None
    variant: Optional[str] = None

class LocationScanCreate(BaseModel):
    lat: Optional[float] = None
    lng: Optional[float] = None
    user_agent: Optional[str] = None
    campaign_source: Optional[str] = None
    campaign_medium: Optional[str] = None
    campaign_name: Optional[str] = None
    campaign_term: Optional[str] = None
    campaign_content: Optional[str] = None
    variant: Optional[str] = None

class LoyaltyRedeemRequest(BaseModel):
    points: Optional[int] = None

class ActionClickCreate(BaseModel):
    action_type: Optional[str] = None
    label: Optional[str] = None
    url: Optional[str] = None
    campaign_source: Optional[str] = None
    campaign_medium: Optional[str] = None
    campaign_name: Optional[str] = None
    campaign_term: Optional[str] = None
    campaign_content: Optional[str] = None
    variant: Optional[str] = None

class PublicLeadCreate(BaseModel):
    name: Optional[str] = None
    phone: Optional[str] = None
    email: Optional[str] = None
    message: Optional[str] = None
    website: Optional[str] = None  # Honeypot
    captcha_token: Optional[str] = None
    campaign_source: Optional[str] = None
    campaign_medium: Optional[str] = None
    campaign_name: Optional[str] = None
    campaign_term: Optional[str] = None
    campaign_content: Optional[str] = None
    variant: Optional[str] = None

class LeadStatusUpdate(BaseModel):
    status: Literal['new', 'contacted', 'closed', 'spam']

class AdminSubscriptionGrant(BaseModel):
    qr_quota_granted: int = Field(default=1, ge=1)
    subscription_period: Literal['monthly', 'yearly'] = 'monthly'
    label: Optional[str] = None

class AdminConfigField(BaseModel):
    field_name: str
    field_type: str
    required: bool = False
    options: Optional[List[str]] = None

class AdminConfig(BaseModel):
    model_config = ConfigDict(extra="ignore")
    profile_type: str  # medico, mascota, etc
    fields: List[AdminConfigField]

# ==================== AUTH HELPERS ====================

def hash_password(password: str) -> str:
    return bcrypt.hashpw(password.encode('utf-8'), bcrypt.gensalt()).decode('utf-8')

def verify_password(password: str, hashed: str) -> bool:
    return bcrypt.checkpw(password.encode('utf-8'), hashed.encode('utf-8'))

def generate_password_reset_code() -> str:
    return f"{secrets.randbelow(1_000_000):06d}"

def hash_password_reset_code(email: str, code: str) -> str:
    pepper = os.getenv('PASSWORD_RESET_PEPPER', JWT_SECRET)
    payload = f"{str(email).strip().lower()}::{str(code).strip()}::{pepper}"
    return hashlib.sha256(payload.encode('utf-8')).hexdigest()

def allow_dev_password_reset_code() -> bool:
    env_name = str(
        os.getenv('APP_ENV')
        or os.getenv('ENVIRONMENT')
        or os.getenv('ENV')
        or 'development'
    ).strip().lower()
    if env_name in {'production', 'prod'}:
        return False
    raw_flag = str(os.getenv('ALLOW_DEV_PASSWORD_RESET_CODE', 'true')).strip().lower()
    return raw_flag not in {'0', 'false', 'no', 'off'}

def create_token(user_id: str, email: str) -> str:
    payload = {
        'user_id': user_id,
        'email': email,
        'exp': datetime.now(timezone.utc) + timedelta(hours=JWT_EXPIRATION_HOURS)
    }
    return jwt.encode(payload, JWT_SECRET, algorithm=JWT_ALGORITHM)

def decode_token(token: str) -> Dict[str, Any]:
    try:
        return jwt.decode(token, JWT_SECRET, algorithms=[JWT_ALGORITHM])
    except jwt.ExpiredSignatureError:
        raise HTTPException(status_code=401, detail="Token has expired")
    except jwt.InvalidTokenError:
        raise HTTPException(status_code=401, detail="Invalid token")

def get_default_permissions_for_role(role: str) -> Dict[str, bool]:
    if role == 'master':
        return {
            'view_analytics': True,
            'view_locations': True,
            'manage_qr_profiles': True,
            'manage_subaccounts': True,
        }
    if role == 'subaccount':
        return {
            'view_analytics': True,
            'view_locations': True,
            'manage_qr_profiles': True,
            'manage_subaccounts': False,
        }
    return {
        'view_analytics': True,
        'view_locations': True,
        'manage_qr_profiles': True,
        'manage_subaccounts': False,
    }

def infer_account_role(user_doc: Dict[str, Any]) -> str:
    existing = user_doc.get('account_role')
    if existing in {'standard', 'master', 'subaccount'}:
        return existing
    if user_doc.get('user_type') == 'business':
        return 'master'
    return 'standard'

def normalize_user_document(user_doc: Dict[str, Any]) -> Dict[str, Any]:
    normalized = dict(user_doc)
    role = infer_account_role(normalized)
    normalized.setdefault('account_status', 'active')
    normalized.setdefault('account_role', role)
    normalized.setdefault('parent_account_id', None)
    normalized.setdefault('permissions', get_default_permissions_for_role(role))
    normalized.setdefault('loyalty_points_balance', 0)
    normalized.setdefault('loyalty_points_lifetime', 0)
    normalized.setdefault('qr_quota_balance', 0)
    normalized.setdefault('qr_quota_lifetime', 0)
    normalized.setdefault('qr_subscription_buckets', [])
    return normalized

def is_deleted_user_document(user_doc: Dict[str, Any]) -> bool:
    account_status = str(user_doc.get('account_status') or '').strip().lower()
    if account_status == 'deleted':
        return True
    return bool(user_doc.get('deleted_at'))

def is_master_account(user_doc: Dict[str, Any]) -> bool:
    return infer_account_role(user_doc) == 'master' and not user_doc.get('is_admin', False)

def has_user_permission(user_doc: Dict[str, Any], permission_key: str) -> bool:
    permissions = user_doc.get('permissions')
    if not isinstance(permissions, dict):
        permissions = get_default_permissions_for_role(infer_account_role(user_doc))
    return bool(permissions.get(permission_key, False))

def parse_non_negative_int(raw_value: Any, default_value: int = 0) -> int:
    try:
        return max(0, int(raw_value))
    except Exception:
        return max(0, int(default_value))

def parse_non_negative_float(raw_value: Any, default_value: float = 0.0) -> float:
    try:
        return max(0.0, float(raw_value))
    except Exception:
        return max(0.0, float(default_value))

def normalize_lookup_key(raw_value: Any) -> str:
    text = str(raw_value or '').strip().lower()
    if not text:
        return ''
    normalized = unicodedata.normalize('NFKD', text)
    return ''.join(ch for ch in normalized if not unicodedata.combining(ch))

def slugify_identifier(raw_value: Any) -> str:
    normalized = normalize_lookup_key(raw_value)
    normalized = re.sub(r'[^a-z0-9]+', '-', normalized)
    return normalized.strip('-')

def load_chile_regions_communes() -> List[Dict[str, Any]]:
    global CHILE_REGIONS_COMMUNES_CACHE
    if CHILE_REGIONS_COMMUNES_CACHE is not None:
        return CHILE_REGIONS_COMMUNES_CACHE

    try:
        if CHILE_REGIONS_COMMUNES_PATH.exists():
            with CHILE_REGIONS_COMMUNES_PATH.open('r', encoding='utf-8') as fh:
                raw = json.load(fh)
            regions = raw.get('regiones') if isinstance(raw, dict) else None
            if isinstance(regions, list) and regions:
                CHILE_REGIONS_COMMUNES_CACHE = regions
                return CHILE_REGIONS_COMMUNES_CACHE
    except Exception as exc:
        logger.warning("No se pudo cargar catálogo de regiones/comunas: %s", exc)

    CHILE_REGIONS_COMMUNES_CACHE = [
        {
            'region': 'Región Metropolitana de Santiago',
            'comunas': ['Santiago', 'Providencia', 'Las Condes', 'Ñuñoa', 'Puente Alto']
        }
    ]
    return CHILE_REGIONS_COMMUNES_CACHE

def build_default_shipping_regions(default_price: float = 2990.0) -> List[Dict[str, Any]]:
    catalog = load_chile_regions_communes()
    normalized_regions: List[Dict[str, Any]] = []
    safe_price = parse_non_negative_float(default_price, 0.0)

    for region in catalog:
        region_name = str(region.get('region') or '').strip()
        communes = region.get('comunas') if isinstance(region.get('comunas'), list) else []
        if not region_name or not communes:
            continue

        region_id = slugify_identifier(region_name)
        commune_items: List[Dict[str, Any]] = []
        for commune_name_raw in communes:
            commune_name = str(commune_name_raw or '').strip()
            if not commune_name:
                continue
            commune_items.append({
                'id': slugify_identifier(commune_name),
                'name': commune_name,
                'enabled': True,
                'price': safe_price,
            })

        normalized_regions.append({
            'id': region_id,
            'name': region_name,
            'enabled': True,
            'price': safe_price,
            'communes': commune_items,
        })

    return normalized_regions

def normalize_shipping_regions_config(
    raw_regions: Any,
    default_shipping_cost: float
) -> List[Dict[str, Any]]:
    base_regions = build_default_shipping_regions(default_shipping_cost)
    if not isinstance(raw_regions, list):
        return base_regions

    raw_region_lookup: Dict[str, Dict[str, Any]] = {}
    for raw_region in raw_regions:
        if not isinstance(raw_region, dict):
            continue
        key = normalize_lookup_key(raw_region.get('id') or raw_region.get('name'))
        if key:
            raw_region_lookup[key] = raw_region

    normalized_regions: List[Dict[str, Any]] = []
    for base_region in base_regions:
        region_key = normalize_lookup_key(base_region.get('id') or base_region.get('name'))
        raw_region = raw_region_lookup.get(region_key, {})
        region_price = parse_non_negative_float(
            raw_region.get('price', base_region.get('price', default_shipping_cost)),
            base_region.get('price', default_shipping_cost)
        )
        region_enabled = bool(raw_region.get('enabled', base_region.get('enabled', True)))

        raw_communes = raw_region.get('communes') if isinstance(raw_region.get('communes'), list) else []
        raw_commune_lookup: Dict[str, Dict[str, Any]] = {}
        for raw_commune in raw_communes:
            if not isinstance(raw_commune, dict):
                continue
            key = normalize_lookup_key(raw_commune.get('id') or raw_commune.get('name'))
            if key:
                raw_commune_lookup[key] = raw_commune

        normalized_communes: List[Dict[str, Any]] = []
        for base_commune in base_region.get('communes', []):
            commune_key = normalize_lookup_key(base_commune.get('id') or base_commune.get('name'))
            raw_commune = raw_commune_lookup.get(commune_key, {})
            normalized_communes.append({
                'id': base_commune.get('id'),
                'name': base_commune.get('name'),
                'enabled': bool(raw_commune.get('enabled', base_commune.get('enabled', True))),
                'price': parse_non_negative_float(
                    raw_commune.get('price', region_price),
                    region_price
                ),
            })

        normalized_regions.append({
            'id': base_region.get('id'),
            'name': base_region.get('name'),
            'enabled': region_enabled,
            'price': region_price,
            'communes': normalized_communes,
        })

    return normalized_regions

def resolve_order_shipping(
    order_data: "OrderBase",
    settings: Dict[str, Any]
) -> Dict[str, Any]:
    default_shipping_cost = parse_non_negative_float(settings.get('default_shipping_cost', 0), 0)
    shipping_regions = normalize_shipping_regions_config(settings.get('shipping_regions'), default_shipping_cost)

    selected_region_raw = str(order_data.shipping_region or '').strip()
    selected_commune_raw = str(order_data.shipping_commune or '').strip()
    selected_region_key = normalize_lookup_key(selected_region_raw)
    selected_commune_key = normalize_lookup_key(selected_commune_raw)

    if selected_region_key:
        region = next(
            (
                item for item in shipping_regions
                if normalize_lookup_key(item.get('id')) == selected_region_key
                or normalize_lookup_key(item.get('name')) == selected_region_key
            ),
            None
        )
        if not region:
            raise HTTPException(status_code=400, detail="Región de envío no válida")
        if not region.get('enabled', True):
            raise HTTPException(status_code=400, detail="La región de envío seleccionada está deshabilitada")

        region_price = parse_non_negative_float(region.get('price', default_shipping_cost), default_shipping_cost)
        if selected_commune_key:
            commune = next(
                (
                    item for item in region.get('communes', [])
                    if normalize_lookup_key(item.get('id')) == selected_commune_key
                    or normalize_lookup_key(item.get('name')) == selected_commune_key
                ),
                None
            )
            if not commune:
                raise HTTPException(status_code=400, detail="Comuna de envío no válida")
            if not commune.get('enabled', True):
                raise HTTPException(status_code=400, detail="La comuna de envío seleccionada está deshabilitada")
            commune_price = parse_non_negative_float(commune.get('price', region_price), region_price)
            return {
                'shipping_cost': commune_price,
                'shipping_region': region.get('name'),
                'shipping_commune': commune.get('name'),
                'shipping_source': 'commune',
            }

        return {
            'shipping_cost': region_price,
            'shipping_region': region.get('name'),
            'shipping_commune': None,
            'shipping_source': 'region',
        }

    if order_data.shipping_cost is not None:
        return {
            'shipping_cost': parse_non_negative_float(order_data.shipping_cost, default_shipping_cost),
            'shipping_region': None,
            'shipping_commune': None,
            'shipping_source': 'custom',
        }

    return {
        'shipping_cost': default_shipping_cost,
        'shipping_region': None,
        'shipping_commune': None,
        'shipping_source': 'default',
    }

def get_enabled_shipping_regions(settings: Dict[str, Any]) -> List[Dict[str, Any]]:
    default_shipping_cost = parse_non_negative_float(settings.get('default_shipping_cost', 0), 0)
    regions = normalize_shipping_regions_config(settings.get('shipping_regions'), default_shipping_cost)
    enabled_regions: List[Dict[str, Any]] = []
    for region in regions:
        if not region.get('enabled', True):
            continue
        enabled_communes = [
            commune for commune in region.get('communes', [])
            if commune.get('enabled', True)
        ]
        enabled_regions.append({
            'id': region.get('id'),
            'name': region.get('name'),
            'price': parse_non_negative_float(region.get('price', default_shipping_cost), default_shipping_cost),
            'enabled': True,
            'communes': enabled_communes,
        })
    return enabled_regions

def parse_iso_datetime_utc(value: Any) -> Optional[datetime]:
    if isinstance(value, datetime):
        parsed = value
    elif isinstance(value, str):
        raw = value.strip()
        if not raw:
            return None
        if raw.endswith('Z'):
            raw = f"{raw[:-1]}+00:00"
        try:
            parsed = datetime.fromisoformat(raw)
        except Exception:
            return None
    else:
        return None

    if parsed.tzinfo is None:
        parsed = parsed.replace(tzinfo=timezone.utc)
    return parsed.astimezone(timezone.utc)

def calculate_subscription_expiration(subscription_period: Optional[str], purchased_at: datetime) -> datetime:
    period_key = (subscription_period or 'monthly').lower()
    days = SUBSCRIPTION_PERIOD_DAYS.get(period_key, SUBSCRIPTION_PERIOD_DAYS['monthly'])
    return purchased_at + timedelta(days=days)

def normalize_subscription_quota_bucket(raw_bucket: Any) -> Optional[Dict[str, Any]]:
    if not isinstance(raw_bucket, dict):
        return None

    granted_quota = parse_non_negative_int(raw_bucket.get('granted_quota', raw_bucket.get('quota', 0)), 0)
    if granted_quota <= 0:
        return None

    remaining_quota = parse_non_negative_int(raw_bucket.get('remaining_quota', granted_quota), granted_quota)
    remaining_quota = min(remaining_quota, granted_quota)
    used_default = max(0, granted_quota - remaining_quota)
    used_quota = parse_non_negative_int(raw_bucket.get('used_quota', used_default), used_default)

    subscription_period = str(raw_bucket.get('subscription_period') or 'monthly').lower()
    if subscription_period not in SUBSCRIPTION_PERIOD_DAYS:
        subscription_period = 'monthly'

    purchased_at = parse_iso_datetime_utc(raw_bucket.get('purchased_at')) or datetime.now(timezone.utc)
    expires_at = parse_iso_datetime_utc(raw_bucket.get('expires_at')) or calculate_subscription_expiration(
        subscription_period,
        purchased_at
    )

    normalized_bucket: Dict[str, Any] = {
        'id': str(raw_bucket.get('id') or uuid.uuid4()),
        'subscription_period': subscription_period,
        'granted_quota': granted_quota,
        'remaining_quota': remaining_quota,
        'used_quota': used_quota,
        'quantity': max(1, parse_non_negative_int(raw_bucket.get('quantity', 1), 1)),
        'purchased_at': purchased_at.isoformat(),
        'expires_at': expires_at.isoformat(),
        'order_id': raw_bucket.get('order_id'),
        'product_id': raw_bucket.get('product_id'),
        'product_name': raw_bucket.get('product_name'),
        'source': str(raw_bucket.get('source') or 'subscription_purchase'),
    }
    exhausted_at = parse_iso_datetime_utc(raw_bucket.get('exhausted_at'))
    if exhausted_at:
        normalized_bucket['exhausted_at'] = exhausted_at.isoformat()
    return normalized_bucket

def normalize_subscription_quota_buckets(raw_buckets: Any) -> List[Dict[str, Any]]:
    if not isinstance(raw_buckets, list):
        return []

    normalized: List[Dict[str, Any]] = []
    for bucket in raw_buckets:
        parsed_bucket = normalize_subscription_quota_bucket(bucket)
        if parsed_bucket:
            normalized.append(parsed_bucket)

    normalized.sort(key=lambda item: item.get('expires_at', ''))
    return normalized

def is_subscription_bucket_active(bucket: Dict[str, Any], reference_time: datetime) -> bool:
    if parse_non_negative_int(bucket.get('remaining_quota', 0), 0) <= 0:
        return False
    expires_at = parse_iso_datetime_utc(bucket.get('expires_at'))
    return bool(expires_at and expires_at > reference_time)

def has_active_subscription_window(buckets: List[Dict[str, Any]], reference_time: datetime) -> bool:
    for bucket in buckets:
        expires_at = parse_iso_datetime_utc(bucket.get('expires_at'))
        granted = parse_non_negative_int(bucket.get('granted_quota', 0), 0)
        if expires_at and expires_at > reference_time and granted > 0:
            return True
    return False

def sum_active_subscription_quota(buckets: List[Dict[str, Any]], reference_time: datetime) -> int:
    return sum(
        parse_non_negative_int(bucket.get('remaining_quota', 0), 0)
        for bucket in buckets
        if is_subscription_bucket_active(bucket, reference_time)
    )

def build_subscription_quota_bucket(
    item: Dict[str, Any],
    quantity: int,
    order_id: str,
    purchased_at: datetime
) -> Optional[Dict[str, Any]]:
    quota_per_item = parse_non_negative_int(item.get('qr_quota_granted', 0), 0)
    quantity = max(1, parse_non_negative_int(quantity, 1))
    total_quota = quota_per_item * quantity
    if total_quota <= 0:
        return None

    subscription_period = str(item.get('subscription_period') or 'monthly').lower()
    if subscription_period not in SUBSCRIPTION_PERIOD_DAYS:
        subscription_period = 'monthly'

    return {
        'id': str(uuid.uuid4()),
        'subscription_period': subscription_period,
        'granted_quota': total_quota,
        'remaining_quota': total_quota,
        'used_quota': 0,
        'quantity': quantity,
        'purchased_at': purchased_at.isoformat(),
        'expires_at': calculate_subscription_expiration(subscription_period, purchased_at).isoformat(),
        'order_id': order_id,
        'product_id': item.get('product_id'),
        'product_name': item.get('product_name'),
        'source': 'subscription_purchase',
    }

def find_subscription_bucket_by_id(buckets: List[Dict[str, Any]], bucket_id: Optional[str]) -> Optional[Dict[str, Any]]:
    if not bucket_id:
        return None
    normalized_bucket_id = str(bucket_id)
    for bucket in buckets:
        if str(bucket.get('id')) == normalized_bucket_id:
            return bucket
    return None

def renew_subscription_bucket(
    current_bucket: Dict[str, Any],
    renewal_bucket: Dict[str, Any],
    paid_at: datetime,
    order_id: str
) -> Dict[str, Any]:
    base_bucket = normalize_subscription_quota_bucket(current_bucket) or dict(current_bucket)
    added_granted = parse_non_negative_int(renewal_bucket.get('granted_quota', 0), 0)
    added_remaining = parse_non_negative_int(renewal_bucket.get('remaining_quota', added_granted), added_granted)
    added_quantity = max(1, parse_non_negative_int(renewal_bucket.get('quantity', 1), 1))

    renewal_period = str(renewal_bucket.get('subscription_period') or base_bucket.get('subscription_period') or 'monthly').lower()
    if renewal_period not in SUBSCRIPTION_PERIOD_DAYS:
        renewal_period = 'monthly'

    current_expires_at = parse_iso_datetime_utc(base_bucket.get('expires_at'))
    extension_start = paid_at
    if current_expires_at and current_expires_at > paid_at:
        extension_start = current_expires_at

    base_bucket['subscription_period'] = renewal_period
    base_bucket['granted_quota'] = parse_non_negative_int(base_bucket.get('granted_quota', 0), 0) + added_granted
    base_bucket['remaining_quota'] = parse_non_negative_int(base_bucket.get('remaining_quota', 0), 0) + added_remaining
    base_bucket['used_quota'] = parse_non_negative_int(base_bucket.get('used_quota', 0), 0)
    base_bucket['quantity'] = max(1, parse_non_negative_int(base_bucket.get('quantity', 1), 1) + added_quantity)
    base_bucket['purchased_at'] = paid_at.isoformat()
    base_bucket['expires_at'] = calculate_subscription_expiration(renewal_period, extension_start).isoformat()
    base_bucket['order_id'] = order_id
    base_bucket['product_id'] = renewal_bucket.get('product_id')
    base_bucket['product_name'] = renewal_bucket.get('product_name')
    base_bucket['source'] = 'subscription_renewal'
    base_bucket.pop('exhausted_at', None)

    return base_bucket

async def sync_subscription_linked_qr_profiles(
    owner_user_id: str,
    buckets: List[Dict[str, Any]],
    reference_time: datetime
) -> None:
    if not owner_user_id:
        return

    active_bucket_ids: List[str] = []
    expired_bucket_ids: List[str] = []
    for bucket in buckets:
        bucket_id = str(bucket.get('id') or '')
        if not bucket_id:
            continue
        expires_at = parse_iso_datetime_utc(bucket.get('expires_at'))
        if expires_at and expires_at > reference_time:
            active_bucket_ids.append(bucket_id)
        else:
            expired_bucket_ids.append(bucket_id)

    now_iso = reference_time.isoformat()
    if expired_bucket_ids:
        await db.qr_profiles.update_many(
            {
                'subscription_owner_user_id': owner_user_id,
                'subscription_bucket_id': {'$in': expired_bucket_ids},
                'deleted_at': None,
                'status': {'$ne': 'paused'},
            },
            {'$set': {
                'status': 'paused',
                'subscription_pause_reason': 'subscription_expired',
                'updated_at': now_iso,
            }}
        )

    if active_bucket_ids:
        await db.qr_profiles.update_many(
            {
                'subscription_owner_user_id': owner_user_id,
                'subscription_bucket_id': {'$in': active_bucket_ids},
                'deleted_at': None,
                'status': 'paused',
                'subscription_pause_reason': 'subscription_expired',
            },
            {
                '$set': {
                    'status': 'subscription',
                    'updated_at': now_iso,
                },
                '$unset': {
                    'subscription_pause_reason': '',
                },
            }
        )

async def refresh_user_subscription_quota_state(user_id: str, now: Optional[datetime] = None) -> Dict[str, Any]:
    reference_time = now or datetime.now(timezone.utc)
    reference_iso = reference_time.isoformat()

    user_doc = await db.users.find_one(
        {'id': user_id},
        {'_id': 0, 'qr_subscription_buckets': 1, 'qr_quota_balance': 1}
    )
    if not user_doc:
        return {
            'qr_quota_balance': 0,
            'has_active_subscription': False,
            'buckets': [],
        }

    raw_buckets = user_doc.get('qr_subscription_buckets')
    normalized_buckets = normalize_subscription_quota_buckets(raw_buckets)
    changed = normalized_buckets != raw_buckets

    legacy_balance = parse_non_negative_int(user_doc.get('qr_quota_balance', 0), 0)
    if legacy_balance > 0 and not normalized_buckets:
        # Migra cupos legacy al nuevo modelo con vencimiento anual desde la primera lectura.
        normalized_buckets = [{
            'id': str(uuid.uuid4()),
            'subscription_period': 'yearly',
            'granted_quota': legacy_balance,
            'remaining_quota': legacy_balance,
            'used_quota': 0,
            'quantity': 1,
            'purchased_at': reference_iso,
            'expires_at': calculate_subscription_expiration('yearly', reference_time).isoformat(),
            'order_id': None,
            'product_id': None,
            'product_name': 'Migración de cupos legacy',
            'source': 'legacy_balance_migration',
        }]
        changed = True

    for bucket in normalized_buckets:
        if parse_non_negative_int(bucket.get('remaining_quota', 0), 0) <= 0:
            continue
        expires_at = parse_iso_datetime_utc(bucket.get('expires_at'))
        if expires_at and expires_at <= reference_time:
            bucket['remaining_quota'] = 0
            bucket['used_quota'] = parse_non_negative_int(bucket.get('granted_quota', 0), 0)
            bucket['exhausted_at'] = reference_iso
            changed = True

    active_quota_balance = sum_active_subscription_quota(normalized_buckets, reference_time)
    has_active_subscription = has_active_subscription_window(normalized_buckets, reference_time)
    current_balance = parse_non_negative_int(user_doc.get('qr_quota_balance', 0), 0)

    if changed or current_balance != active_quota_balance:
        await db.users.update_one(
            {'id': user_id},
            {'$set': {
                'qr_subscription_buckets': normalized_buckets,
                'qr_quota_balance': active_quota_balance,
                'updated_at': reference_iso,
            }}
        )

    await sync_subscription_linked_qr_profiles(user_id, normalized_buckets, reference_time)

    return {
        'qr_quota_balance': active_quota_balance,
        'has_active_subscription': has_active_subscription,
        'buckets': normalized_buckets,
    }

async def consume_subscription_quota(user_id: str) -> Optional[str]:
    for _ in range(4):
        state = await refresh_user_subscription_quota_state(user_id)
        if state.get('qr_quota_balance', 0) <= 0:
            return None

        now = datetime.now(timezone.utc)
        active_buckets = [
            bucket for bucket in state.get('buckets', [])
            if is_subscription_bucket_active(bucket, now)
        ]
        if not active_buckets:
            return None

        active_buckets.sort(key=lambda bucket: bucket.get('expires_at', ''))
        target_bucket_id = active_buckets[0].get('id')
        if not target_bucket_id:
            return None

        result = await db.users.update_one(
            {
                'id': user_id,
                'qr_quota_balance': {'$gte': 1},
                'qr_subscription_buckets': {
                    '$elemMatch': {
                        'id': target_bucket_id,
                        'remaining_quota': {'$gte': 1},
                    }
                }
            },
            {
                '$inc': {
                    'qr_quota_balance': -1,
                    'qr_subscription_buckets.$.remaining_quota': -1,
                    'qr_subscription_buckets.$.used_quota': 1,
                },
                '$set': {'updated_at': now.isoformat()}
            }
        )
        if result.modified_count > 0:
            return target_bucket_id

    return None

async def restore_consumed_subscription_quota(user_id: str, bucket_id: str) -> None:
    if not bucket_id:
        return

    now_iso = datetime.now(timezone.utc).isoformat()
    await db.users.update_one(
        {
            'id': user_id,
            'qr_subscription_buckets': {'$elemMatch': {'id': bucket_id}}
        },
        {
            '$inc': {
                'qr_quota_balance': 1,
                'qr_subscription_buckets.$.remaining_quota': 1,
                'qr_subscription_buckets.$.used_quota': -1,
            },
            '$set': {'updated_at': now_iso}
        }
    )
    await refresh_user_subscription_quota_state(user_id)

def build_subscription_bucket_summary(bucket: Dict[str, Any], reference_time: datetime) -> Dict[str, Any]:
    granted_quota = parse_non_negative_int(bucket.get('granted_quota', 0), 0)
    remaining_quota = parse_non_negative_int(bucket.get('remaining_quota', 0), 0)
    used_quota = parse_non_negative_int(bucket.get('used_quota', 0), 0)
    purchased_at = parse_iso_datetime_utc(bucket.get('purchased_at'))
    expires_at = parse_iso_datetime_utc(bucket.get('expires_at'))

    expired = bool(expires_at and expires_at <= reference_time)
    if expired:
        status = 'expired'
    elif remaining_quota <= 0:
        status = 'exhausted'
    else:
        status = 'active'

    days_until_expiration: Optional[int] = None
    if expires_at:
        days_until_expiration = max(0, int((expires_at - reference_time).total_seconds() // 86400))

    return {
        'id': bucket.get('id'),
        'order_id': bucket.get('order_id'),
        'product_id': bucket.get('product_id'),
        'product_name': bucket.get('product_name'),
        'source': bucket.get('source'),
        'subscription_period': bucket.get('subscription_period'),
        'granted_quota': granted_quota,
        'remaining_quota': remaining_quota if not expired else 0,
        'used_quota': used_quota,
        'status': status,
        'purchased_at': purchased_at.isoformat() if purchased_at else None,
        'expires_at': expires_at.isoformat() if expires_at else None,
        'days_until_expiration': days_until_expiration,
    }

async def get_subscription_overview_for_owner(owner_user_id: str) -> Dict[str, Any]:
    owner_doc = await db.users.find_one(
        {'id': owner_user_id},
        {'_id': 0, 'id': 1, 'name': 1, 'email': 1, 'user_type': 1}
    )
    if not owner_doc:
        raise HTTPException(status_code=404, detail='Cuenta propietaria no encontrada')

    reference_time = datetime.now(timezone.utc)
    quota_state = await refresh_user_subscription_quota_state(owner_user_id, reference_time)
    buckets = quota_state.get('buckets', [])
    summaries = [build_subscription_bucket_summary(bucket, reference_time) for bucket in buckets]
    summaries.sort(key=lambda item: item.get('expires_at') or '', reverse=False)

    active_subscription_count = sum(1 for item in summaries if item.get('status') == 'active')
    total_granted = sum(parse_non_negative_int(item.get('granted_quota', 0), 0) for item in summaries)
    total_used = sum(parse_non_negative_int(item.get('used_quota', 0), 0) for item in summaries)
    total_remaining = sum(parse_non_negative_int(item.get('remaining_quota', 0), 0) for item in summaries)

    return {
        'owner_user_id': owner_user_id,
        'owner_name': owner_doc.get('name'),
        'owner_email': owner_doc.get('email'),
        'available_quota': parse_non_negative_int(quota_state.get('qr_quota_balance', 0), 0),
        'active_subscription_count': active_subscription_count,
        'total_subscriptions': len(summaries),
        'total_granted_quota': total_granted,
        'total_used_quota': total_used,
        'total_remaining_quota': total_remaining,
        'subscriptions': summaries,
    }

async def validate_checkout_renewal_bucket(
    order_data: OrderBase,
    user_doc: Dict[str, Any],
    validated_items: List[Dict[str, Any]]
) -> Optional[str]:
    renewal_bucket_id = str(order_data.renewal_bucket_id or '').strip()
    if not renewal_bucket_id:
        return None

    if not (user_doc.get('is_admin') or is_master_account(user_doc)):
        raise HTTPException(status_code=403, detail='Solo cuentas master pueden renovar suscripciones')

    has_subscription_item = any(item.get('item_type') == 'subscription_service' for item in validated_items)
    if not has_subscription_item:
        raise HTTPException(status_code=400, detail='La renovación requiere al menos un producto de suscripción')

    scope_context = await get_qr_scope_context(user_doc)
    owner_user_id = scope_context['root_user_id']
    owner_doc = await db.users.find_one(
        {'id': owner_user_id},
        {'_id': 0, 'qr_subscription_buckets': 1}
    )
    buckets = normalize_subscription_quota_buckets((owner_doc or {}).get('qr_subscription_buckets'))
    target_bucket = find_subscription_bucket_by_id(buckets, renewal_bucket_id)
    if not target_bucket:
        raise HTTPException(status_code=404, detail='La suscripción a renovar no existe')

    return str(target_bucket.get('id'))

async def resolve_subscription_owner_id_from_user_doc(user_doc: Dict[str, Any]) -> str:
    user = normalize_user_document(user_doc)
    if user.get('user_type') != 'business':
        raise HTTPException(status_code=403, detail='Solo cuentas empresa tienen suscripciones QR')
    return user.get('parent_account_id') or user['id']

async def grant_subscription_bucket_to_owner(
    owner_user_id: str,
    qr_quota_granted: int,
    subscription_period: str,
    label: Optional[str] = None,
    source: str = 'admin_manual_grant'
) -> Dict[str, Any]:
    now = datetime.now(timezone.utc)
    normalized_period = subscription_period if subscription_period in SUBSCRIPTION_PERIOD_DAYS else 'monthly'
    granted_quota = parse_non_negative_int(qr_quota_granted, 0)
    if granted_quota <= 0:
        raise HTTPException(status_code=400, detail='La cuota a otorgar debe ser mayor a 0')

    owner_doc = await db.users.find_one(
        {'id': owner_user_id},
        {'_id': 0, 'qr_subscription_buckets': 1, 'qr_quota_lifetime': 1}
    )
    if not owner_doc:
        raise HTTPException(status_code=404, detail='Cuenta propietaria no encontrada')

    existing_buckets = normalize_subscription_quota_buckets(owner_doc.get('qr_subscription_buckets'))
    new_bucket = {
        'id': str(uuid.uuid4()),
        'subscription_period': normalized_period,
        'granted_quota': granted_quota,
        'remaining_quota': granted_quota,
        'used_quota': 0,
        'quantity': 1,
        'purchased_at': now.isoformat(),
        'expires_at': calculate_subscription_expiration(normalized_period, now).isoformat(),
        'order_id': None,
        'product_id': None,
        'product_name': label or f'Ajuste manual admin ({granted_quota} QR)',
        'source': source,
    }
    combined_buckets = existing_buckets + [new_bucket]
    active_quota_balance = sum_active_subscription_quota(combined_buckets, now)
    current_lifetime = parse_non_negative_int(owner_doc.get('qr_quota_lifetime', 0), 0)

    await db.users.update_one(
        {'id': owner_user_id},
        {'$set': {
            'qr_subscription_buckets': combined_buckets,
            'qr_quota_balance': active_quota_balance,
            'qr_quota_lifetime': current_lifetime + granted_quota,
            'updated_at': now.isoformat(),
        }}
    )

    return new_bucket

async def revoke_subscription_bucket_from_owner(owner_user_id: str, bucket_id: str) -> bool:
    owner_doc = await db.users.find_one({'id': owner_user_id}, {'_id': 0, 'qr_subscription_buckets': 1})
    if not owner_doc:
        raise HTTPException(status_code=404, detail='Cuenta propietaria no encontrada')

    now = datetime.now(timezone.utc)
    now_iso = now.isoformat()
    buckets = normalize_subscription_quota_buckets(owner_doc.get('qr_subscription_buckets'))
    changed = False

    for bucket in buckets:
        if str(bucket.get('id')) != str(bucket_id):
            continue
        bucket['remaining_quota'] = 0
        bucket['used_quota'] = parse_non_negative_int(bucket.get('granted_quota', 0), 0)
        bucket['expires_at'] = now_iso
        bucket['exhausted_at'] = now_iso
        changed = True
        break

    if not changed:
        return False

    active_quota_balance = sum_active_subscription_quota(buckets, now)
    await db.users.update_one(
        {'id': owner_user_id},
        {'$set': {
            'qr_subscription_buckets': buckets,
            'qr_quota_balance': active_quota_balance,
            'updated_at': now_iso,
        }}
    )
    return True

def estimate_quota_from_product_name(name: Optional[str], fallback: int = 10) -> int:
    if not name:
        return fallback
    match = re.search(r'(\d+)', str(name))
    if not match:
        return fallback
    return parse_non_negative_int(match.group(1), fallback)

PROFILE_TEMPLATE_MIGRATION_PATCHES: Dict[str, Dict[str, Dict[str, Any]]] = {
    'personal': {
        'medico': {
            'key': 'medico',
            'label': 'Médico',
            'icon': 'heart',
            'enabled': True,
            'category': 'personal',
            'theme': {'primary_color': '#dc2626', 'bg_color': '#fef2f2'},
            'sections': [
                {
                    'id': 's_emergency',
                    'title': 'Información de Emergencia',
                    'description': 'Datos críticos para respuesta rápida ante accidentes.',
                    'icon': 'alert',
                    'fields': [
                        {'id': 'photo_url', 'name': 'photo_url', 'label': 'Foto de Perfil', 'type': 'image', 'required': False, 'visible': True, 'icon': 'camera', 'placeholder': ''},
                        {'id': 'blood_type', 'name': 'blood_type', 'label': 'Tipo de Sangre', 'type': 'text', 'required': True, 'visible': True, 'icon': 'heart', 'placeholder': 'Ej: O+, A-'},
                        {'id': 'allergies', 'name': 'allergies', 'label': 'Alergias', 'type': 'textarea', 'required': False, 'visible': True, 'icon': 'alert', 'placeholder': 'Lista de alergias'},
                        {'id': 'medications', 'name': 'medications', 'label': 'Medicamentos', 'type': 'textarea', 'required': False, 'visible': True, 'icon': 'none', 'placeholder': 'Medicamentos actuales'},
                        {'id': 'conditions', 'name': 'conditions', 'label': 'Condiciones Médicas', 'type': 'textarea', 'required': False, 'visible': True, 'icon': 'none', 'placeholder': 'Condiciones'},
                    ],
                },
                {
                    'id': 's_doctor',
                    'title': 'Médico Tratante',
                    'description': 'Contacto de profesional a cargo para continuidad de atención.',
                    'icon': 'user',
                    'fields': [
                        {'id': 'doctor_name', 'name': 'doctor_name', 'label': 'Nombre del Médico', 'type': 'text', 'required': False, 'visible': True, 'icon': 'user', 'placeholder': ''},
                        {'id': 'doctor_phone', 'name': 'doctor_phone', 'label': 'Teléfono del Médico', 'type': 'tel', 'required': False, 'visible': True, 'icon': 'phone', 'placeholder': '+56...'},
                    ],
                },
                {
                    'id': 's_contact',
                    'title': 'Contacto de Emergencia',
                    'description': 'Persona responsable a quien llamar en caso urgente.',
                    'icon': 'phone',
                    'fields': [
                        {'id': 'emergency_name', 'name': 'emergency_name', 'label': 'Nombre Contacto', 'type': 'text', 'required': True, 'visible': True, 'icon': 'user', 'placeholder': ''},
                        {'id': 'emergency_phone', 'name': 'emergency_phone', 'label': 'Teléfono Contacto', 'type': 'tel', 'required': True, 'visible': True, 'icon': 'phone', 'placeholder': '+56...'},
                    ],
                },
            ],
        },
        'mascota': {
            'key': 'mascota',
            'label': 'Mascota',
            'icon': 'dog',
            'enabled': True,
            'category': 'personal',
            'theme': {'primary_color': '#16a34a', 'bg_color': '#f0fdf4'},
            'sections': [
                {
                    'id': 's_pet',
                    'title': 'Datos de la Mascota',
                    'description': 'Identificación visual y datos básicos para retorno seguro.',
                    'icon': 'dog',
                    'fields': [
                        {'id': 'photo_url', 'name': 'photo_url', 'label': 'Foto de la Mascota', 'type': 'image', 'required': False, 'visible': True, 'icon': 'camera', 'placeholder': ''},
                        {'id': 'pet_name', 'name': 'pet_name', 'label': 'Nombre', 'type': 'text', 'required': True, 'visible': True, 'icon': 'none', 'placeholder': ''},
                        {'id': 'species', 'name': 'species', 'label': 'Especie', 'type': 'text', 'required': True, 'visible': True, 'icon': 'none', 'placeholder': 'Perro, Gato...'},
                        {'id': 'breed', 'name': 'breed', 'label': 'Raza', 'type': 'text', 'required': False, 'visible': True, 'icon': 'none', 'placeholder': ''},
                        {'id': 'color', 'name': 'color', 'label': 'Color', 'type': 'text', 'required': False, 'visible': True, 'icon': 'none', 'placeholder': ''},
                    ],
                },
                {
                    'id': 's_owner',
                    'title': 'Dueño',
                    'description': 'Datos de contacto para devolución inmediata.',
                    'icon': 'user',
                    'fields': [
                        {'id': 'owner_name', 'name': 'owner_name', 'label': 'Nombre del Dueño', 'type': 'text', 'required': True, 'visible': True, 'icon': 'user', 'placeholder': ''},
                        {'id': 'owner_phone', 'name': 'owner_phone', 'label': 'Teléfono', 'type': 'tel', 'required': True, 'visible': True, 'icon': 'phone', 'placeholder': '+56...'},
                    ],
                },
                {
                    'id': 's_vet',
                    'title': 'Veterinario',
                    'description': 'Información clínica para casos urgentes.',
                    'icon': 'heart',
                    'fields': [
                        {'id': 'vet_name', 'name': 'vet_name', 'label': 'Nombre', 'type': 'text', 'required': False, 'visible': True, 'icon': 'none', 'placeholder': ''},
                        {'id': 'vet_phone', 'name': 'vet_phone', 'label': 'Teléfono', 'type': 'tel', 'required': False, 'visible': True, 'icon': 'phone', 'placeholder': ''},
                    ],
                },
            ],
        },
        'vehiculo': {
            'key': 'vehiculo',
            'label': 'Vehículo',
            'icon': 'car',
            'enabled': True,
            'category': 'personal',
            'theme': {'primary_color': '#2563eb', 'bg_color': '#eff6ff'},
            'sections': [
                {
                    'id': 's_vehicle',
                    'title': 'Datos del Vehículo',
                    'description': 'Identificación de patente y rasgos visuales del vehículo.',
                    'icon': 'car',
                    'fields': [
                        {'id': 'photo_url', 'name': 'photo_url', 'label': 'Foto del Vehículo', 'type': 'image', 'required': False, 'visible': True, 'icon': 'camera', 'placeholder': ''},
                        {'id': 'plate', 'name': 'plate', 'label': 'Patente', 'type': 'text', 'required': True, 'visible': True, 'icon': 'none', 'placeholder': ''},
                        {'id': 'brand', 'name': 'brand', 'label': 'Marca', 'type': 'text', 'required': False, 'visible': True, 'icon': 'none', 'placeholder': ''},
                        {'id': 'model', 'name': 'model', 'label': 'Modelo', 'type': 'text', 'required': False, 'visible': True, 'icon': 'none', 'placeholder': ''},
                        {'id': 'color', 'name': 'color', 'label': 'Color', 'type': 'text', 'required': False, 'visible': True, 'icon': 'none', 'placeholder': ''},
                    ],
                },
                {
                    'id': 's_owner',
                    'title': 'Propietario',
                    'description': 'Contacto para notificar rápidamente al propietario.',
                    'icon': 'user',
                    'fields': [
                        {'id': 'owner_name', 'name': 'owner_name', 'label': 'Nombre', 'type': 'text', 'required': True, 'visible': True, 'icon': 'user', 'placeholder': ''},
                        {'id': 'owner_phone', 'name': 'owner_phone', 'label': 'Teléfono', 'type': 'tel', 'required': True, 'visible': True, 'icon': 'phone', 'placeholder': ''},
                    ],
                },
            ],
        },
        'nino': {
            'key': 'nino',
            'label': 'Niño / Adulto Mayor',
            'icon': 'user',
            'enabled': True,
            'category': 'personal',
            'theme': {'primary_color': '#9333ea', 'bg_color': '#faf5ff'},
            'sections': [
                {
                    'id': 's_person',
                    'title': 'Datos Personales',
                    'description': 'Información de identificación para asistencia segura.',
                    'icon': 'user',
                    'fields': [
                        {'id': 'photo_url', 'name': 'photo_url', 'label': 'Foto', 'type': 'image', 'required': False, 'visible': True, 'icon': 'camera', 'placeholder': ''},
                        {'id': 'full_name', 'name': 'full_name', 'label': 'Nombre Completo', 'type': 'text', 'required': True, 'visible': True, 'icon': 'user', 'placeholder': ''},
                        {'id': 'age', 'name': 'age', 'label': 'Edad', 'type': 'text', 'required': False, 'visible': True, 'icon': 'none', 'placeholder': ''},
                        {'id': 'conditions', 'name': 'conditions', 'label': 'Condiciones Médicas', 'type': 'textarea', 'required': False, 'visible': True, 'icon': 'heart', 'placeholder': ''},
                        {'id': 'address', 'name': 'address', 'label': 'Dirección', 'type': 'text', 'required': False, 'visible': True, 'icon': 'map-pin', 'placeholder': ''},
                    ],
                },
                {
                    'id': 's_guardian',
                    'title': 'Tutor / Responsable',
                    'description': 'Datos de contacto del responsable principal.',
                    'icon': 'shield',
                    'fields': [
                        {'id': 'guardian_name', 'name': 'guardian_name', 'label': 'Nombre del Tutor', 'type': 'text', 'required': True, 'visible': True, 'icon': 'user', 'placeholder': ''},
                        {'id': 'guardian_phone', 'name': 'guardian_phone', 'label': 'Teléfono', 'type': 'tel', 'required': True, 'visible': True, 'icon': 'phone', 'placeholder': ''},
                    ],
                },
            ],
        },
    },
    'business': {
        'restaurante': {
            'key': 'restaurante',
            'label': 'Restaurante',
            'icon': 'utensils',
            'enabled': True,
            'category': 'business',
            'theme': {'primary_color': '#d97706', 'bg_color': '#fffbeb'},
            'sections': [
                {
                    'id': 's_info',
                    'title': 'Identidad y Carta',
                    'description': 'Presentación del local y menú para convertir visitas en reservas.',
                    'icon': 'utensils',
                    'fields': [
                        {'id': 'logo_url', 'name': 'logo_url', 'label': 'Logo', 'type': 'image', 'required': False, 'visible': True, 'icon': 'camera', 'placeholder': ''},
                        {'id': 'cover_image_url', 'name': 'cover_image_url', 'label': 'Imagen de Portada', 'type': 'image', 'required': False, 'visible': True, 'icon': 'camera', 'placeholder': ''},
                        {'id': 'description', 'name': 'description', 'label': 'Descripción', 'type': 'textarea', 'required': False, 'visible': True, 'icon': 'none', 'placeholder': ''},
                        {'id': 'menu_items', 'name': 'menu_items', 'label': 'Menú (uno por línea)', 'type': 'textarea', 'required': False, 'visible': True, 'icon': 'utensils', 'placeholder': ''},
                    ],
                },
                {
                    'id': 's_contact',
                    'title': 'Contacto',
                    'description': 'Canales de reserva y ubicación.',
                    'icon': 'phone',
                    'fields': [
                        {'id': 'phone', 'name': 'phone', 'label': 'Teléfono', 'type': 'tel', 'required': False, 'visible': True, 'icon': 'phone', 'placeholder': ''},
                        {'id': 'address', 'name': 'address', 'label': 'Dirección', 'type': 'text', 'required': False, 'visible': True, 'icon': 'map-pin', 'placeholder': ''},
                        {'id': 'schedule', 'name': 'schedule', 'label': 'Horario', 'type': 'text', 'required': False, 'visible': True, 'icon': 'clock', 'placeholder': ''},
                        {'id': 'website', 'name': 'website', 'label': 'Sitio Web', 'type': 'url', 'required': False, 'visible': True, 'icon': 'globe', 'placeholder': ''},
                    ],
                },
            ],
        },
        'hotel': {
            'key': 'hotel',
            'label': 'Hotel',
            'icon': 'building',
            'enabled': True,
            'category': 'business',
            'theme': {'primary_color': '#4f46e5', 'bg_color': '#eef2ff'},
            'sections': [
                {
                    'id': 's_welcome',
                    'title': 'Bienvenida',
                    'description': 'Primera impresión para huéspedes y check-in rápido.',
                    'icon': 'star',
                    'fields': [
                        {'id': 'cover_image_url', 'name': 'cover_image_url', 'label': 'Imagen de Portada', 'type': 'image', 'required': False, 'visible': True, 'icon': 'camera', 'placeholder': ''},
                        {'id': 'hotel_name', 'name': 'hotel_name', 'label': 'Nombre del Hotel', 'type': 'text', 'required': True, 'visible': True, 'icon': 'building', 'placeholder': ''},
                        {'id': 'description', 'name': 'description', 'label': 'Descripción', 'type': 'textarea', 'required': False, 'visible': True, 'icon': 'none', 'placeholder': ''},
                        {'id': 'welcome_message', 'name': 'welcome_message', 'label': 'Mensaje de Bienvenida', 'type': 'textarea', 'required': False, 'visible': True, 'icon': 'message', 'placeholder': ''},
                    ],
                },
                {
                    'id': 's_info',
                    'title': 'Información',
                    'description': 'Datos operativos y de emergencia.',
                    'icon': 'clock',
                    'fields': [
                        {'id': 'services', 'name': 'services', 'label': 'Servicios (uno por línea)', 'type': 'textarea', 'required': False, 'visible': True, 'icon': 'coffee', 'placeholder': ''},
                        {'id': 'check_in', 'name': 'check_in', 'label': 'Hora Check-in', 'type': 'text', 'required': False, 'visible': True, 'icon': 'clock', 'placeholder': ''},
                        {'id': 'check_out', 'name': 'check_out', 'label': 'Hora Check-out', 'type': 'text', 'required': False, 'visible': True, 'icon': 'clock', 'placeholder': ''},
                        {'id': 'address', 'name': 'address', 'label': 'Dirección', 'type': 'text', 'required': False, 'visible': True, 'icon': 'map-pin', 'placeholder': ''},
                    ],
                },
            ],
        },
        'tarjeta': {
            'key': 'tarjeta',
            'label': 'Tarjeta de Presentación',
            'icon': 'credit-card',
            'enabled': True,
            'category': 'business',
            'theme': {'primary_color': '#db2777', 'bg_color': '#fdf2f8'},
            'sections': [
                {
                    'id': 's_personal',
                    'title': 'Datos Personales',
                    'description': 'Presentación profesional para networking y ventas.',
                    'icon': 'user',
                    'fields': [
                        {'id': 'avatar_url', 'name': 'avatar_url', 'label': 'Foto/Avatar', 'type': 'image', 'required': False, 'visible': True, 'icon': 'camera', 'placeholder': ''},
                        {'id': 'full_name', 'name': 'full_name', 'label': 'Nombre Completo', 'type': 'text', 'required': True, 'visible': True, 'icon': 'user', 'placeholder': ''},
                        {'id': 'title', 'name': 'title', 'label': 'Cargo', 'type': 'text', 'required': False, 'visible': True, 'icon': 'star', 'placeholder': ''},
                        {'id': 'company', 'name': 'company', 'label': 'Empresa', 'type': 'text', 'required': False, 'visible': True, 'icon': 'building', 'placeholder': ''},
                    ],
                },
            ],
        },
        'evento': {
            'key': 'evento',
            'label': 'Evento',
            'icon': 'calendar',
            'enabled': True,
            'category': 'business',
            'theme': {'primary_color': '#e11d48', 'bg_color': '#fff1f2'},
            'sections': [
                {
                    'id': 's_event',
                    'title': 'Datos del Evento',
                    'description': 'Landing rápida para asistentes con agenda y acceso.',
                    'icon': 'calendar',
                    'fields': [
                        {'id': 'banner_url', 'name': 'banner_url', 'label': 'Banner del Evento', 'type': 'image', 'required': False, 'visible': True, 'icon': 'camera', 'placeholder': ''},
                        {'id': 'event_name', 'name': 'event_name', 'label': 'Nombre del Evento', 'type': 'text', 'required': True, 'visible': True, 'icon': 'star', 'placeholder': ''},
                        {'id': 'description', 'name': 'description', 'label': 'Descripción', 'type': 'textarea', 'required': False, 'visible': True, 'icon': 'none', 'placeholder': ''},
                        {'id': 'date', 'name': 'date', 'label': 'Fecha', 'type': 'text', 'required': False, 'visible': True, 'icon': 'calendar', 'placeholder': ''},
                        {'id': 'time', 'name': 'time', 'label': 'Hora', 'type': 'text', 'required': False, 'visible': True, 'icon': 'clock', 'placeholder': ''},
                        {'id': 'location', 'name': 'location', 'label': 'Lugar', 'type': 'text', 'required': False, 'visible': True, 'icon': 'map-pin', 'placeholder': ''},
                        {'id': 'agenda', 'name': 'agenda', 'label': 'Agenda (una por línea)', 'type': 'textarea', 'required': False, 'visible': True, 'icon': 'file-text', 'placeholder': ''},
                    ],
                },
            ],
        },
        'catalogo': {
            'key': 'catalogo',
            'label': 'Catálogo',
            'icon': 'building',
            'enabled': True,
            'category': 'business',
            'theme': {'primary_color': '#ea580c', 'bg_color': '#fff7ed'},
            'sections': [
                {
                    'id': 's_catalog',
                    'title': 'Catálogo',
                    'description': 'Muestra productos y precios para compras rápidas.',
                    'icon': 'building',
                    'fields': [
                        {'id': 'cover_image_url', 'name': 'cover_image_url', 'label': 'Imagen Principal', 'type': 'image', 'required': False, 'visible': True, 'icon': 'camera', 'placeholder': ''},
                        {'id': 'business_name', 'name': 'business_name', 'label': 'Nombre del Negocio', 'type': 'text', 'required': True, 'visible': True, 'icon': 'building', 'placeholder': ''},
                        {'id': 'catalog_name', 'name': 'catalog_name', 'label': 'Nombre del Catálogo', 'type': 'text', 'required': False, 'visible': True, 'icon': 'file-text', 'placeholder': ''},
                        {'id': 'description', 'name': 'description', 'label': 'Descripción', 'type': 'textarea', 'required': False, 'visible': True, 'icon': 'none', 'placeholder': ''},
                        {'id': 'products', 'name': 'products', 'label': 'Productos (uno por línea)', 'type': 'textarea', 'required': False, 'visible': True, 'icon': 'none', 'placeholder': ''},
                        {'id': 'contact_info', 'name': 'contact_info', 'label': 'Información de Contacto', 'type': 'text', 'required': False, 'visible': True, 'icon': 'phone', 'placeholder': ''},
                        {'id': 'phone', 'name': 'phone', 'label': 'Teléfono', 'type': 'tel', 'required': False, 'visible': True, 'icon': 'phone', 'placeholder': ''},
                        {'id': 'website', 'name': 'website', 'label': 'Sitio Web', 'type': 'url', 'required': False, 'visible': True, 'icon': 'globe', 'placeholder': ''},
                    ],
                },
            ],
        },
        'turismo': {
            'key': 'turismo',
            'label': 'Turismo',
            'icon': 'map-pin',
            'enabled': True,
            'category': 'business',
            'theme': {'primary_color': '#0d9488', 'bg_color': '#f0fdfa'},
            'sections': [
                {
                    'id': 's_tourism',
                    'title': 'Lugar Turístico',
                    'description': 'Información de visita para turistas y visitantes.',
                    'icon': 'map-pin',
                    'fields': [
                        {'id': 'cover_image_url', 'name': 'cover_image_url', 'label': 'Imagen del Lugar', 'type': 'image', 'required': False, 'visible': True, 'icon': 'camera', 'placeholder': ''},
                        {'id': 'place_name', 'name': 'place_name', 'label': 'Nombre del Lugar', 'type': 'text', 'required': True, 'visible': True, 'icon': 'map-pin', 'placeholder': ''},
                        {'id': 'description', 'name': 'description', 'label': 'Descripción', 'type': 'textarea', 'required': False, 'visible': True, 'icon': 'none', 'placeholder': ''},
                        {'id': 'attractions', 'name': 'attractions', 'label': 'Atracciones (una por línea)', 'type': 'textarea', 'required': False, 'visible': True, 'icon': 'star', 'placeholder': ''},
                        {'id': 'hours', 'name': 'hours', 'label': 'Horario', 'type': 'text', 'required': False, 'visible': True, 'icon': 'clock', 'placeholder': ''},
                        {'id': 'schedule', 'name': 'schedule', 'label': 'Horario', 'type': 'text', 'required': False, 'visible': True, 'icon': 'clock', 'placeholder': ''},
                        {'id': 'address', 'name': 'address', 'label': 'Dirección', 'type': 'text', 'required': False, 'visible': True, 'icon': 'map-pin', 'placeholder': ''},
                    ],
                },
            ],
        },
    },
}

EXTRA_BUSINESS_PROFILE_TEMPLATES: List[Dict[str, str]] = [
    {'key': 'inmobiliaria', 'label': 'Inmobiliaria', 'icon': 'home', 'primary': '#0f766e', 'bg': '#f0fdfa'},
    {'key': 'gimnasio', 'label': 'Gimnasio', 'icon': 'star', 'primary': '#be123c', 'bg': '#fff1f2'},
    {'key': 'peluqueria', 'label': 'Peluquería', 'icon': 'star', 'primary': '#a21caf', 'bg': '#fdf4ff'},
    {'key': 'spa', 'label': 'Spa & Bienestar', 'icon': 'heart', 'primary': '#0f766e', 'bg': '#ecfeff'},
    {'key': 'clinica', 'label': 'Clínica', 'icon': 'heart', 'primary': '#1d4ed8', 'bg': '#eff6ff'},
    {'key': 'farmacia', 'label': 'Farmacia', 'icon': 'heart', 'primary': '#047857', 'bg': '#ecfdf5'},
    {'key': 'dental', 'label': 'Clínica Dental', 'icon': 'heart', 'primary': '#0284c7', 'bg': '#f0f9ff'},
    {'key': 'taller', 'label': 'Taller Mecánico', 'icon': 'car', 'primary': '#374151', 'bg': '#f9fafb'},
    {'key': 'automotora', 'label': 'Automotora', 'icon': 'car', 'primary': '#1e3a8a', 'bg': '#eef2ff'},
    {'key': 'cafeteria', 'label': 'Cafetería', 'icon': 'coffee', 'primary': '#92400e', 'bg': '#fffbeb'},
    {'key': 'bar', 'label': 'Bar / Pub', 'icon': 'coffee', 'primary': '#7e22ce', 'bg': '#f5f3ff'},
    {'key': 'delivery', 'label': 'Delivery', 'icon': 'map-pin', 'primary': '#166534', 'bg': '#f0fdf4'},
    {'key': 'ecommerce', 'label': 'E-commerce', 'icon': 'credit-card', 'primary': '#1d4ed8', 'bg': '#eff6ff'},
    {'key': 'retail', 'label': 'Tienda Retail', 'icon': 'building', 'primary': '#0f172a', 'bg': '#f8fafc'},
    {'key': 'cowork', 'label': 'Cowork', 'icon': 'building', 'primary': '#0369a1', 'bg': '#f0f9ff'},
    {'key': 'educacion', 'label': 'Educación', 'icon': 'file-text', 'primary': '#4f46e5', 'bg': '#eef2ff'},
    {'key': 'ong', 'label': 'ONG / Fundación', 'icon': 'heart', 'primary': '#166534', 'bg': '#f0fdf4'},
    {'key': 'iglesia', 'label': 'Iglesia / Comunidad', 'icon': 'star', 'primary': '#4338ca', 'bg': '#eef2ff'},
    {'key': 'constructora', 'label': 'Constructora', 'icon': 'building', 'primary': '#92400e', 'bg': '#fff7ed'},
    {'key': 'legal', 'label': 'Estudio Jurídico', 'icon': 'shield', 'primary': '#1f2937', 'bg': '#f9fafb'},
]

EXTRA_PERSONAL_PROFILE_TEMPLATES: List[Dict[str, str]] = [
    {'key': 'contacto_emergencia', 'label': 'Contacto de Emergencia', 'icon': 'phone', 'primary': '#b91c1c', 'bg': '#fef2f2'},
    {'key': 'curriculum', 'label': 'CV / Hoja de Vida', 'icon': 'file-text', 'primary': '#1d4ed8', 'bg': '#eff6ff'},
    {'key': 'portafolio', 'label': 'Portafolio Personal', 'icon': 'globe', 'primary': '#0369a1', 'bg': '#f0f9ff'},
    {'key': 'viajero', 'label': 'Viajero', 'icon': 'map-pin', 'primary': '#0f766e', 'bg': '#f0fdfa'},
    {'key': 'alergias', 'label': 'Alerta de Alergias', 'icon': 'alert', 'primary': '#be123c', 'bg': '#fff1f2'},
    {'key': 'medicamentos_personal', 'label': 'Control de Medicamentos', 'icon': 'heart', 'primary': '#0f766e', 'bg': '#ecfeff'},
    {'key': 'deportista', 'label': 'Deportista', 'icon': 'star', 'primary': '#7c2d12', 'bg': '#fff7ed'},
    {'key': 'cuidador', 'label': 'Cuidador', 'icon': 'user', 'primary': '#6d28d9', 'bg': '#f5f3ff'},
    {'key': 'estudiante', 'label': 'Estudiante', 'icon': 'file-text', 'primary': '#4338ca', 'bg': '#eef2ff'},
    {'key': 'donante', 'label': 'Donante Voluntario', 'icon': 'heart', 'primary': '#be123c', 'bg': '#fff1f2'},
]

def build_generic_profile_template_patch(
    key: str,
    label: str,
    category: Literal['personal', 'business'],
    icon: str,
    primary_color: str,
    bg_color: str
) -> Dict[str, Any]:
    if category == 'business':
        fields = [
            {'id': 'logo_url', 'name': 'logo_url', 'label': 'Logo', 'type': 'image', 'required': False, 'visible': True, 'icon': 'camera', 'placeholder': ''},
            {'id': 'description', 'name': 'description', 'label': 'Descripción', 'type': 'textarea', 'required': False, 'visible': True, 'icon': 'none', 'placeholder': 'Descripción del negocio'},
            {'id': 'phone', 'name': 'phone', 'label': 'Teléfono', 'type': 'tel', 'required': False, 'visible': True, 'icon': 'phone', 'placeholder': '+56...'},
            {'id': 'email', 'name': 'email', 'label': 'Email', 'type': 'email', 'required': False, 'visible': True, 'icon': 'mail', 'placeholder': ''},
            {'id': 'address', 'name': 'address', 'label': 'Dirección', 'type': 'text', 'required': False, 'visible': True, 'icon': 'map-pin', 'placeholder': ''},
            {'id': 'map_address', 'name': 'map_address', 'label': 'Dirección para Mapa', 'type': 'text', 'required': False, 'visible': True, 'icon': 'map-pin', 'placeholder': 'Calle, comuna, ciudad'},
            {'id': 'latitude', 'name': 'latitude', 'label': 'Latitud', 'type': 'text', 'required': False, 'visible': True, 'icon': 'map-pin', 'placeholder': '-33.4489'},
            {'id': 'longitude', 'name': 'longitude', 'label': 'Longitud', 'type': 'text', 'required': False, 'visible': True, 'icon': 'map-pin', 'placeholder': '-70.6693'},
            {'id': 'website', 'name': 'website', 'label': 'Sitio web', 'type': 'url', 'required': False, 'visible': True, 'icon': 'globe', 'placeholder': 'https://'},
            {'id': 'whatsapp', 'name': 'whatsapp', 'label': 'WhatsApp', 'type': 'tel', 'required': False, 'visible': True, 'icon': 'phone', 'placeholder': '569...'},
            {'id': 'schedule', 'name': 'schedule', 'label': 'Horario', 'type': 'text', 'required': False, 'visible': True, 'icon': 'clock', 'placeholder': 'Lun-Vie 09:00-18:00'},
        ]
    else:
        fields = [
            {'id': 'photo_url', 'name': 'photo_url', 'label': 'Foto', 'type': 'image', 'required': False, 'visible': True, 'icon': 'camera', 'placeholder': ''},
            {'id': 'full_name', 'name': 'full_name', 'label': 'Nombre completo', 'type': 'text', 'required': True, 'visible': True, 'icon': 'user', 'placeholder': ''},
            {'id': 'description', 'name': 'description', 'label': 'Descripción', 'type': 'textarea', 'required': False, 'visible': True, 'icon': 'none', 'placeholder': ''},
            {'id': 'phone', 'name': 'phone', 'label': 'Teléfono', 'type': 'tel', 'required': False, 'visible': True, 'icon': 'phone', 'placeholder': '+56...'},
            {'id': 'email', 'name': 'email', 'label': 'Email', 'type': 'email', 'required': False, 'visible': True, 'icon': 'mail', 'placeholder': ''},
            {'id': 'address', 'name': 'address', 'label': 'Dirección', 'type': 'text', 'required': False, 'visible': True, 'icon': 'map-pin', 'placeholder': ''},
            {'id': 'city', 'name': 'city', 'label': 'Ciudad', 'type': 'text', 'required': False, 'visible': True, 'icon': 'map-pin', 'placeholder': ''},
            {'id': 'emergency_contact', 'name': 'emergency_contact', 'label': 'Contacto de emergencia', 'type': 'text', 'required': False, 'visible': True, 'icon': 'phone', 'placeholder': ''},
            {'id': 'notes', 'name': 'notes', 'label': 'Notas', 'type': 'textarea', 'required': False, 'visible': True, 'icon': 'file-text', 'placeholder': ''},
        ]

    return {
        'key': key,
        'label': label,
        'icon': icon,
        'enabled': True,
        'category': category,
        'theme': {'primary_color': primary_color, 'bg_color': bg_color},
        'default_public_settings': {
            'request_location_automatically': False,
            'top_profile_photo_enabled': category == 'business',
            'top_profile_photo_shape': 'circle',
            'floating_buttons': ['whatsapp', 'call_business', 'website'] if category == 'business' else ['call_contact', 'send_location', 'call_emergency'],
        },
        'display_options': {
            'show_profile_type_badge': True,
            'show_business_banner': category == 'business',
            'show_floating_actions': True,
            'show_lead_form': category == 'business',
            'show_manual_location_button': category == 'personal',
            'show_map_section': category == 'business',
            'show_highlights': True,
            'card_style': 'elegant',
        },
        'sections': [
            {
                'id': 's_main',
                'title': 'Información principal',
                'description': f'Datos clave para el perfil {label}.',
                'icon': icon,
                'fields': fields,
            }
        ],
    }

for item in EXTRA_BUSINESS_PROFILE_TEMPLATES:
    PROFILE_TEMPLATE_MIGRATION_PATCHES['business'].setdefault(
        item['key'],
        build_generic_profile_template_patch(
            key=item['key'],
            label=item['label'],
            category='business',
            icon=item['icon'],
            primary_color=item['primary'],
            bg_color=item['bg'],
        ),
    )

for item in EXTRA_PERSONAL_PROFILE_TEMPLATES:
    PROFILE_TEMPLATE_MIGRATION_PATCHES['personal'].setdefault(
        item['key'],
        build_generic_profile_template_patch(
            key=item['key'],
            label=item['label'],
            category='personal',
            icon=item['icon'],
            primary_color=item['primary'],
            bg_color=item['bg'],
        ),
    )

def append_fields_to_template_patch(
    *,
    category: Literal['personal', 'business'],
    template_key: str,
    section_id: str,
    fields: List[Dict[str, Any]],
    fallback_section_title: str = 'Información adicional',
    fallback_section_description: str = '',
    fallback_section_icon: str = 'file-text',
) -> None:
    category_templates = PROFILE_TEMPLATE_MIGRATION_PATCHES.get(category)
    if not isinstance(category_templates, dict):
        return

    template = category_templates.get(template_key)
    if not isinstance(template, dict):
        return

    sections = template.setdefault('sections', [])
    if not isinstance(sections, list):
        sections = []
        template['sections'] = sections

    section = next((item for item in sections if item.get('id') == section_id), None)
    if not isinstance(section, dict):
        section = {
            'id': section_id,
            'title': fallback_section_title,
            'description': fallback_section_description,
            'icon': fallback_section_icon,
            'fields': [],
        }
        sections.append(section)

    existing_fields = section.setdefault('fields', [])
    if not isinstance(existing_fields, list):
        existing_fields = []
        section['fields'] = existing_fields

    existing_keys = {
        str(item.get('id') or item.get('name') or '').strip().lower()
        for item in existing_fields
        if isinstance(item, dict)
    }

    for field_patch in fields:
        key = str(field_patch.get('id') or field_patch.get('name') or '').strip().lower()
        if not key or key in existing_keys:
            continue
        existing_fields.append(copy.deepcopy(field_patch))
        existing_keys.add(key)

def append_fields_to_all_templates(
    *,
    category: Literal['personal', 'business'],
    fields: List[Dict[str, Any]],
    preferred_section_ids: Optional[List[str]] = None,
) -> None:
    category_templates = PROFILE_TEMPLATE_MIGRATION_PATCHES.get(category)
    if not isinstance(category_templates, dict):
        return
    preferred_ids = [item for item in (preferred_section_ids or []) if isinstance(item, str) and item.strip()]

    for template_key, template in category_templates.items():
        if not isinstance(template, dict):
            continue
        sections = template.get('sections')
        if not isinstance(sections, list) or not sections:
            continue

        section_id = None
        for preferred_id in preferred_ids:
            if any(isinstance(section, dict) and section.get('id') == preferred_id for section in sections):
                section_id = preferred_id
                break
        if not section_id:
            for candidate in sections:
                if isinstance(candidate, dict) and candidate.get('id'):
                    section_id = str(candidate['id'])
                    break
        if not section_id:
            section_id = 's_main'

        append_fields_to_template_patch(
            category=category,
            template_key=template_key,
            section_id=section_id,
            fields=fields,
            fallback_section_title='Información de contacto',
            fallback_section_description='Canales y ubicación del perfil',
            fallback_section_icon='map-pin',
        )

append_fields_to_all_templates(
    category='business',
    preferred_section_ids=['s_contact', 's_info', 's_main', 's_event', 's_tourism', 's_catalog'],
    fields=[
        {'id': 'map_address', 'name': 'map_address', 'label': 'Dirección para mapa', 'type': 'text', 'required': False, 'visible': True, 'icon': 'map-pin', 'placeholder': 'Dirección completa'},
        {'id': 'latitude', 'name': 'latitude', 'label': 'Latitud', 'type': 'text', 'required': False, 'visible': True, 'icon': 'map-pin', 'placeholder': '-33.4489'},
        {'id': 'longitude', 'name': 'longitude', 'label': 'Longitud', 'type': 'text', 'required': False, 'visible': True, 'icon': 'map-pin', 'placeholder': '-70.6693'},
        {'id': 'google_maps_url', 'name': 'google_maps_url', 'label': 'Link Google Maps', 'type': 'url', 'required': False, 'visible': True, 'icon': 'map-pin', 'placeholder': 'https://maps.google.com/...'},
        {'id': 'service_area', 'name': 'service_area', 'label': 'Área de cobertura', 'type': 'text', 'required': False, 'visible': True, 'icon': 'map-pin', 'placeholder': 'Región Metropolitana, Valparaíso...'},
    ],
)

append_fields_to_all_templates(
    category='personal',
    preferred_section_ids=['s_person', 's_main', 's_contact', 's_owner', 's_emergency'],
    fields=[
        {'id': 'city', 'name': 'city', 'label': 'Ciudad', 'type': 'text', 'required': False, 'visible': True, 'icon': 'map-pin', 'placeholder': ''},
        {'id': 'secondary_phone', 'name': 'secondary_phone', 'label': 'Teléfono alternativo', 'type': 'tel', 'required': False, 'visible': True, 'icon': 'phone', 'placeholder': '+56...'},
    ],
)

append_fields_to_template_patch(
    category='business',
    template_key='restaurante',
    section_id='s_contact',
    fields=[
        {'id': 'whatsapp', 'name': 'whatsapp', 'label': 'WhatsApp Reservas', 'type': 'tel', 'required': False, 'visible': True, 'icon': 'phone', 'placeholder': '569...'},
        {'id': 'reservation_url', 'name': 'reservation_url', 'label': 'Link de Reservas', 'type': 'url', 'required': False, 'visible': True, 'icon': 'calendar', 'placeholder': 'https://'},
        {'id': 'google_review_link', 'name': 'google_review_link', 'label': 'Link Reseñas Google', 'type': 'url', 'required': False, 'visible': True, 'icon': 'star', 'placeholder': 'https://'},
        {'id': 'delivery_time', 'name': 'delivery_time', 'label': 'Tiempo de Entrega', 'type': 'text', 'required': False, 'visible': True, 'icon': 'clock', 'placeholder': 'Ej: 30-45 min'},
        {'id': 'price_range', 'name': 'price_range', 'label': 'Rango de Precio', 'type': 'text', 'required': False, 'visible': True, 'icon': 'credit-card', 'placeholder': '$$'},
    ],
)

append_fields_to_template_patch(
    category='business',
    template_key='hotel',
    section_id='s_info',
    fields=[
        {'id': 'booking_url', 'name': 'booking_url', 'label': 'Link de Reserva', 'type': 'url', 'required': False, 'visible': True, 'icon': 'calendar', 'placeholder': 'https://'},
        {'id': 'reception_phone', 'name': 'reception_phone', 'label': 'Teléfono Recepción', 'type': 'tel', 'required': False, 'visible': True, 'icon': 'phone', 'placeholder': '+56...'},
        {'id': 'emergency_info', 'name': 'emergency_info', 'label': 'Info Emergencia', 'type': 'textarea', 'required': False, 'visible': True, 'icon': 'alert', 'placeholder': 'Instrucciones en caso de emergencia'},
    ],
)

append_fields_to_template_patch(
    category='personal',
    template_key='medico',
    section_id='s_emergency',
    fields=[
        {'id': 'health_insurance', 'name': 'health_insurance', 'label': 'Seguro de Salud', 'type': 'text', 'required': False, 'visible': True, 'icon': 'credit-card', 'placeholder': 'Isapre/Fonasa'},
        {'id': 'emergency_instructions', 'name': 'emergency_instructions', 'label': 'Instrucciones de Emergencia', 'type': 'textarea', 'required': False, 'visible': True, 'icon': 'alert', 'placeholder': 'Qué hacer en caso de crisis'},
    ],
)

append_fields_to_template_patch(
    category='personal',
    template_key='mascota',
    section_id='s_pet',
    fields=[
        {'id': 'microchip_id', 'name': 'microchip_id', 'label': 'ID de Microchip', 'type': 'text', 'required': False, 'visible': True, 'icon': 'credit-card', 'placeholder': ''},
        {'id': 'special_care', 'name': 'special_care', 'label': 'Cuidados Especiales', 'type': 'textarea', 'required': False, 'visible': True, 'icon': 'heart', 'placeholder': 'Medicamentos, comportamiento, etc.'},
    ],
)

append_fields_to_template_patch(
    category='personal',
    template_key='vehiculo',
    section_id='s_vehicle',
    fields=[
        {'id': 'insurance_company', 'name': 'insurance_company', 'label': 'Aseguradora', 'type': 'text', 'required': False, 'visible': True, 'icon': 'shield', 'placeholder': ''},
        {'id': 'roadside_assistance_phone', 'name': 'roadside_assistance_phone', 'label': 'Asistencia en Ruta', 'type': 'tel', 'required': False, 'visible': True, 'icon': 'phone', 'placeholder': '+56...'},
    ],
)

append_fields_to_template_patch(
    category='personal',
    template_key='nino',
    section_id='s_person',
    fields=[
        {'id': 'communication_preferences', 'name': 'communication_preferences', 'label': 'Preferencias de Comunicación', 'type': 'textarea', 'required': False, 'visible': True, 'icon': 'message', 'placeholder': 'Cómo calmar o asistir mejor'},
        {'id': 'safe_point', 'name': 'safe_point', 'label': 'Punto Seguro', 'type': 'text', 'required': False, 'visible': True, 'icon': 'map-pin', 'placeholder': 'Lugar de encuentro definido'},
    ],
)

def _is_missing_value(value: Any) -> bool:
    return value is None or (isinstance(value, str) and value.strip() == '')

def _find_section(sections: List[Dict[str, Any]], section_patch: Dict[str, Any]) -> Optional[Dict[str, Any]]:
    section_id = section_patch.get('id')
    section_title = section_patch.get('title')
    for section in sections:
        if section_id and section.get('id') == section_id:
            return section
        if section_title and section.get('title') == section_title:
            return section
    return None

def _find_field(fields: List[Dict[str, Any]], field_patch: Dict[str, Any]) -> Optional[Dict[str, Any]]:
    field_id = field_patch.get('id')
    field_name = field_patch.get('name')
    for field in fields:
        if field_id and field.get('id') == field_id:
            return field
        if field_name and field.get('name') == field_name:
            return field
    return None

def merge_profile_types_config_with_patches(config_data: Dict[str, Any]) -> Tuple[Dict[str, Any], bool]:
    if not isinstance(config_data, dict):
        return {}, False

    merged = copy.deepcopy(config_data)
    changed = False

    for category, category_patch in PROFILE_TEMPLATE_MIGRATION_PATCHES.items():
        templates = merged.get(category)
        if not isinstance(templates, list):
            templates = []
            merged[category] = templates
            changed = True

        for template_key, template_patch in category_patch.items():
            template = next((item for item in templates if item.get('key') == template_key), None)
            if template is None:
                templates.append(copy.deepcopy(template_patch))
                changed = True
                continue

            for field_name in ('label', 'icon', 'category'):
                if _is_missing_value(template.get(field_name)) and not _is_missing_value(template_patch.get(field_name)):
                    template[field_name] = template_patch[field_name]
                    changed = True

            if 'enabled' not in template and 'enabled' in template_patch:
                template['enabled'] = template_patch['enabled']
                changed = True

            for config_key in ('default_public_settings', 'display_options'):
                if config_key not in template and isinstance(template_patch.get(config_key), dict):
                    template[config_key] = copy.deepcopy(template_patch[config_key])
                    changed = True

            patch_theme = template_patch.get('theme')
            if isinstance(patch_theme, dict):
                existing_theme = template.get('theme')
                if not isinstance(existing_theme, dict):
                    template['theme'] = copy.deepcopy(patch_theme)
                    changed = True
                else:
                    for theme_key, theme_value in patch_theme.items():
                        if theme_key not in existing_theme:
                            existing_theme[theme_key] = theme_value
                            changed = True

            existing_sections = template.get('sections')
            if not isinstance(existing_sections, list):
                template['sections'] = []
                existing_sections = template['sections']
                changed = True

            for section_patch in template_patch.get('sections', []):
                section = _find_section(existing_sections, section_patch)
                if section is None:
                    existing_sections.append(copy.deepcopy(section_patch))
                    changed = True
                    continue

                for field_name in ('title', 'description', 'icon'):
                    if _is_missing_value(section.get(field_name)) and not _is_missing_value(section_patch.get(field_name)):
                        section[field_name] = section_patch[field_name]
                        changed = True

                existing_fields = section.get('fields')
                if not isinstance(existing_fields, list):
                    section['fields'] = []
                    existing_fields = section['fields']
                    changed = True

                for field_patch in section_patch.get('fields', []):
                    existing_field = _find_field(existing_fields, field_patch)
                    if existing_field is None:
                        existing_fields.append(copy.deepcopy(field_patch))
                        changed = True
                        continue

                    for attr in ('id', 'name', 'label', 'type', 'icon', 'placeholder'):
                        if _is_missing_value(existing_field.get(attr)) and not _is_missing_value(field_patch.get(attr)):
                            existing_field[attr] = field_patch[attr]
                            changed = True

                    if 'required' not in existing_field and 'required' in field_patch:
                        existing_field['required'] = field_patch['required']
                        changed = True
                    if 'visible' not in existing_field and 'visible' in field_patch:
                        existing_field['visible'] = field_patch['visible']
                        changed = True

    normalized_config, normalized_changed = normalize_profile_types_config_data(merged)
    return normalized_config, (changed or normalized_changed)

def build_default_profile_types_config() -> Dict[str, Any]:
    base_config = {
        category: [copy.deepcopy(template) for template in templates.values()]
        for category, templates in PROFILE_TEMPLATE_MIGRATION_PATCHES.items()
    }
    normalized_config, _ = normalize_profile_types_config_data(base_config)
    return normalized_config

async def get_qr_scope_context(user_doc: Dict[str, Any]) -> Dict[str, Any]:
    user = normalize_user_document(user_doc)
    root_user_id = user.get('parent_account_id') or user['id']

    if user.get('user_type') != 'business':
        return {
            'root_user_id': root_user_id,
            'scope_user_ids': [user['id']],
        }

    scope_user_ids = [root_user_id]
    subaccounts = await db.users.find(
        {'parent_account_id': root_user_id, 'account_status': {'$ne': 'deleted'}},
        {'_id': 0, 'id': 1}
    ).to_list(1000)
    for sub in subaccounts:
        sub_id = sub.get('id')
        if sub_id and sub_id not in scope_user_ids:
            scope_user_ids.append(sub_id)

    return {
        'root_user_id': root_user_id,
        'scope_user_ids': scope_user_ids,
    }

async def build_qr_creation_policy(user_doc: Dict[str, Any], settings: Optional[Dict[str, Any]] = None) -> Dict[str, Any]:
    user = normalize_user_document(user_doc)
    if settings is None:
        settings = await get_platform_settings()

    if user.get('is_admin'):
        return {
            'can_create': True,
            'allow_direct_creation': True,
            'requires_subscription_purchase': False,
            'consume_quota_on_create': False,
            'qr_quota_balance': parse_non_negative_int(user.get('qr_quota_balance', 0), 0),
            'max_qr_allowed': None,
            'current_qr_count': 0,
            'remaining_free_slots': None,
            'quota_owner_user_id': user['id'],
            'message': 'Admin habilitado para crear QR',
        }

    if not has_user_permission(user, 'manage_qr_profiles'):
        return {
            'can_create': False,
            'allow_direct_creation': False,
            'requires_subscription_purchase': False,
            'consume_quota_on_create': False,
            'qr_quota_balance': 0,
            'max_qr_allowed': 0,
            'current_qr_count': 0,
            'remaining_free_slots': 0,
            'quota_owner_user_id': user.get('parent_account_id') or user['id'],
            'message': 'No tienes permisos para crear perfiles QR',
        }

    is_business = user.get('user_type') == 'business'
    allow_key = 'allow_business_create_qr' if is_business else 'allow_person_create_qr'
    max_key = 'max_qr_per_business' if is_business else 'max_qr_per_person'
    direct_creation_enabled = bool(settings.get(allow_key, True if is_business else False))
    max_qr_allowed = parse_non_negative_int(settings.get(max_key, 50 if is_business else 5), 50 if is_business else 5)

    scope_context = await get_qr_scope_context(user)
    scope_user_ids = scope_context['scope_user_ids']
    quota_owner_user_id = scope_context['root_user_id']

    current_qr_count = await db.qr_profiles.count_documents({
        'user_id': {'$in': scope_user_ids},
        'deleted_at': None,
    })

    quota_state = await refresh_user_subscription_quota_state(quota_owner_user_id)
    qr_quota_balance = parse_non_negative_int(quota_state.get('qr_quota_balance', 0), 0)

    if is_business:
        can_create_with_quota = qr_quota_balance > 0
        has_active_subscription = bool(quota_state.get('has_active_subscription', False))
        if can_create_with_quota:
            message = 'Puedes crear un nuevo QR usando cupos de suscripción activos'
        elif has_active_subscription:
            message = 'Tu suscripción está activa, pero ya no tienes cupos disponibles'
        else:
            message = 'Solo empresas con suscripción activa pueden crear QRs'
        return {
            'can_create': can_create_with_quota,
            'allow_direct_creation': False,
            'requires_subscription_purchase': True,
            'consume_quota_on_create': can_create_with_quota,
            'qr_quota_balance': qr_quota_balance,
            'max_qr_allowed': max_qr_allowed,
            'current_qr_count': current_qr_count,
            'remaining_free_slots': 0,
            'quota_owner_user_id': quota_owner_user_id,
            'message': message,
        }

    if direct_creation_enabled:
        remaining_free_slots = max(0, max_qr_allowed - current_qr_count)
        can_create = current_qr_count < max_qr_allowed if max_qr_allowed > 0 else False
        message = 'Puedes crear un nuevo QR' if can_create else 'Alcanzaste el máximo de QR permitidos en tu plan actual'
        return {
            'can_create': can_create,
            'allow_direct_creation': True,
            'requires_subscription_purchase': False,
            'consume_quota_on_create': False,
            'qr_quota_balance': qr_quota_balance,
            'max_qr_allowed': max_qr_allowed,
            'current_qr_count': current_qr_count,
            'remaining_free_slots': remaining_free_slots,
            'quota_owner_user_id': quota_owner_user_id,
            'message': message,
        }

    can_create_with_quota = qr_quota_balance > 0
    message = (
        'Puedes crear un nuevo QR usando cupos de suscripción'
        if can_create_with_quota
        else 'La creación manual está deshabilitada. Compra una suscripción para habilitar nuevos QR'
    )
    return {
        'can_create': can_create_with_quota,
        'allow_direct_creation': False,
        'requires_subscription_purchase': True,
        'consume_quota_on_create': can_create_with_quota,
        'qr_quota_balance': qr_quota_balance,
        'max_qr_allowed': max_qr_allowed,
        'current_qr_count': current_qr_count,
        'remaining_free_slots': 0,
        'quota_owner_user_id': quota_owner_user_id,
        'message': message,
    }

async def get_managed_user_ids(user_doc: Dict[str, Any], include_self: bool = True) -> List[str]:
    managed_ids: List[str] = []
    if include_self:
        managed_ids.append(user_doc['id'])

    if not is_master_account(user_doc):
        return managed_ids

    subaccounts = await db.users.find(
        {
            'parent_account_id': user_doc['id'],
            'account_status': {'$ne': 'deleted'}
        },
        {'_id': 0, 'id': 1}
    ).to_list(1000)

    for sub in subaccounts:
        sub_id = sub.get('id')
        if sub_id and sub_id not in managed_ids:
            managed_ids.append(sub_id)
    return managed_ids

async def get_profile_access_query(user_doc: Dict[str, Any], profile_id: Optional[str] = None) -> Dict[str, Any]:
    accessible_user_ids = await get_managed_user_ids(user_doc)
    query: Dict[str, Any] = {'user_id': {'$in': accessible_user_ids}}
    if profile_id:
        query['id'] = profile_id
    return query

async def get_current_user(request: Request) -> Dict[str, Any]:
    auth_header = request.headers.get('Authorization')
    if not auth_header or not auth_header.startswith('Bearer '):
        raise HTTPException(status_code=401, detail="Missing or invalid authorization header")
    
    token = auth_header.split(' ')[1]
    payload = decode_token(token)
    
    user = await db.users.find_one({'id': payload['user_id']}, {'_id': 0})
    if not user:
        raise HTTPException(status_code=401, detail="User not found")

    user = normalize_user_document(user)
    status = user.get('account_status', 'active')
    if status == 'deleted':
        raise HTTPException(status_code=401, detail="Cuenta eliminada")
    if status == 'paused':
        raise HTTPException(status_code=403, detail="Cuenta pausada")

    return user

async def get_current_admin(request: Request) -> Dict[str, Any]:
    user = await get_current_user(request)
    # Por simplicidad, el admin es definido por un campo is_admin
    if not user.get('is_admin'):
        raise HTTPException(status_code=403, detail="Admin access required")
    return user

async def get_current_user_optional(request: Request) -> Optional[Dict[str, Any]]:
    auth_header = request.headers.get('Authorization')
    if not auth_header or not auth_header.startswith('Bearer '):
        return None
    try:
        return await get_current_user(request)
    except HTTPException:
        return None

# ==================== QR HELPERS ====================

def generate_qr_hash(user_id: str, profile_name: str) -> str:
    """Genera un hash único para el perfil QR"""
    unique_string = f"{user_id}-{profile_name}-{datetime.now(timezone.utc).isoformat()}"
    return hashlib.sha256(unique_string.encode()).hexdigest()[:16]

def _clamp_int(value: Any, minimum: int, maximum: int, default: int) -> int:
    try:
        parsed = int(value)
    except (TypeError, ValueError):
        return default
    return max(minimum, min(maximum, parsed))

def _extract_svg_dimensions(svg_markup: str) -> Tuple[float, float]:
    view_box_match = re.search(r'viewBox="([^"]+)"', svg_markup)
    if view_box_match:
        parts = [part for part in view_box_match.group(1).strip().split(' ') if part]
        if len(parts) == 4:
            try:
                return float(parts[2]), float(parts[3])
            except ValueError:
                pass

    width_match = re.search(r'width="([0-9]+(?:\.[0-9]+)?)', svg_markup)
    height_match = re.search(r'height="([0-9]+(?:\.[0-9]+)?)', svg_markup)
    if width_match and height_match:
        try:
            return float(width_match.group(1)), float(height_match.group(1))
        except ValueError:
            pass
    return 100.0, 100.0

def normalize_qr_generation_settings(raw_settings: Any) -> Dict[str, Any]:
    source = raw_settings if isinstance(raw_settings, dict) else {}

    output_format = str(source.get('output_format') or source.get('format') or DEFAULT_QR_GENERATION_SETTINGS['output_format']).strip().lower()
    if output_format not in QR_OUTPUT_FORMATS:
        output_format = DEFAULT_QR_GENERATION_SETTINGS['output_format']

    complexity_mode = str(source.get('complexity_mode') or source.get('complexity') or DEFAULT_QR_GENERATION_SETTINGS['complexity_mode']).strip().lower()
    if complexity_mode not in QR_COMPLEXITY_TO_ERROR_CORRECTION:
        complexity_mode = DEFAULT_QR_GENERATION_SETTINGS['complexity_mode']

    requested_error_correction = str(
        source.get('error_correction')
        or source.get('errorCorrection')
        or QR_COMPLEXITY_TO_ERROR_CORRECTION.get(complexity_mode, DEFAULT_QR_GENERATION_SETTINGS['error_correction'])
    ).strip().upper()
    if requested_error_correction not in QR_ERROR_CORRECTION_MAP:
        requested_error_correction = QR_COMPLEXITY_TO_ERROR_CORRECTION.get(complexity_mode, DEFAULT_QR_GENERATION_SETTINGS['error_correction'])

    force_version = _clamp_int(
        source.get('force_version', source.get('version', DEFAULT_QR_GENERATION_SETTINGS['force_version'])),
        0,
        40,
        DEFAULT_QR_GENERATION_SETTINGS['force_version'],
    )
    module_size = _clamp_int(
        source.get('module_size', source.get('box_size', DEFAULT_QR_GENERATION_SETTINGS['module_size'])),
        4,
        40,
        DEFAULT_QR_GENERATION_SETTINGS['module_size'],
    )
    quiet_zone_modules = _clamp_int(
        source.get('quiet_zone_modules', source.get('border', DEFAULT_QR_GENERATION_SETTINGS['quiet_zone_modules'])),
        0,
        20,
        DEFAULT_QR_GENERATION_SETTINGS['quiet_zone_modules'],
    )
    data_optimization = _clamp_int(
        source.get('data_optimization', source.get('optimize', DEFAULT_QR_GENERATION_SETTINGS['data_optimization'])),
        0,
        40,
        DEFAULT_QR_GENERATION_SETTINGS['data_optimization'],
    )

    hash_position = str(source.get('hash_position') or DEFAULT_QR_GENERATION_SETTINGS['hash_position']).strip().lower()
    if hash_position not in QR_HASH_POSITIONS:
        hash_position = DEFAULT_QR_GENERATION_SETTINGS['hash_position']

    hash_prefix = str(source.get('hash_prefix', DEFAULT_QR_GENERATION_SETTINGS['hash_prefix']) or '').strip()
    if len(hash_prefix) > 32:
        hash_prefix = hash_prefix[:32]

    hash_font_size = _clamp_int(
        source.get('hash_font_size', source.get('hashFontSize', DEFAULT_QR_GENERATION_SETTINGS['hash_font_size'])),
        10,
        40,
        DEFAULT_QR_GENERATION_SETTINGS['hash_font_size'],
    )
    hash_padding = _clamp_int(
        source.get('hash_padding', source.get('hashPadding', DEFAULT_QR_GENERATION_SETTINGS['hash_padding'])),
        4,
        48,
        DEFAULT_QR_GENERATION_SETTINGS['hash_padding'],
    )

    svg_factory = str(source.get('svg_factory') or source.get('svgFactory') or DEFAULT_QR_GENERATION_SETTINGS['svg_factory']).strip().lower()
    if svg_factory not in QR_SVG_FACTORIES:
        svg_factory = DEFAULT_QR_GENERATION_SETTINGS['svg_factory']

    return {
        'output_format': output_format,
        'complexity_mode': complexity_mode,
        'error_correction': requested_error_correction,
        'force_version': force_version,
        'module_size': module_size,
        'quiet_zone_modules': quiet_zone_modules,
        'data_optimization': data_optimization,
        'hash_visible': coerce_bool(source.get('hash_visible', source.get('show_hash', DEFAULT_QR_GENERATION_SETTINGS['hash_visible'])), default=True),
        'hash_position': hash_position,
        'hash_prefix': hash_prefix,
        'hash_font_size': hash_font_size,
        'hash_padding': hash_padding,
        'svg_factory': svg_factory,
    }

def resolve_qr_generation_settings_from_platform(settings: Optional[Dict[str, Any]]) -> Dict[str, Any]:
    if isinstance(settings, dict):
        return normalize_qr_generation_settings(settings.get('qr_generation'))
    return normalize_qr_generation_settings(None)

def generate_qr_image(
    qr_hash: str,
    fg_color: str = "black",
    bg_color: str = "white",
    box_size: Optional[int] = None,
    border: Optional[int] = None,
    generation_settings: Optional[Dict[str, Any]] = None,
) -> Tuple[bytes, str, str]:
    """Genera imagen QR y retorna bytes, media_type y extensión."""
    from PIL import Image, ImageDraw, ImageFont

    qr_generation = normalize_qr_generation_settings(generation_settings)
    if box_size is not None:
        qr_generation['module_size'] = _clamp_int(box_size, 4, 40, qr_generation['module_size'])
    if border is not None:
        qr_generation['quiet_zone_modules'] = _clamp_int(border, 0, 20, qr_generation['quiet_zone_modules'])

    qr_url = f"{FRONTEND_URL}/profile/{qr_hash}"
    qr_version = qr_generation['force_version'] if qr_generation['force_version'] > 0 else None
    qr = qrcode.QRCode(
        version=qr_version,
        box_size=qr_generation['module_size'],
        border=qr_generation['quiet_zone_modules'],
        error_correction=QR_ERROR_CORRECTION_MAP[qr_generation['error_correction']],
    )
    qr.add_data(qr_url, optimize=qr_generation['data_optimization'])
    qr.make(fit=(qr_version is None))

    include_hash = qr_generation['hash_visible']
    hash_label = f"{qr_generation['hash_prefix']} {qr_hash}".strip() if qr_generation['hash_prefix'] else qr_hash
    hash_position = qr_generation['hash_position']

    if qr_generation['output_format'] == 'svg':
        image_factory = qrcode_svg.SvgPathImage if qr_generation['svg_factory'] == 'path' else qrcode_svg.SvgImage
        svg_image = qr.make_image(image_factory=image_factory, fill_color=fg_color, back_color=bg_color)
        svg_markup = svg_image.to_string(encoding='unicode')
        if include_hash:
            svg_width, svg_height = _extract_svg_dimensions(svg_markup)
            body = re.sub(r'^<svg[^>]*>', '', svg_markup, count=1).replace('</svg>', '')
            text_space = max(6.0, min(20.0, (qr_generation['hash_font_size'] / 3.2) + (qr_generation['hash_padding'] / 3.0)))
            total_height = svg_height + text_space
            qr_y = text_space if hash_position == 'top' else 0.0
            text_y = (text_space * 0.72) if hash_position == 'top' else (svg_height + (text_space * 0.72))
            font_size = max(2.6, min(8.0, qr_generation['hash_font_size'] / 2.8))
            escaped_hash = html.escape(hash_label)
            svg_markup = (
                f'<svg xmlns="http://www.w3.org/2000/svg" '
                f'viewBox="0 0 {svg_width:.3f} {total_height:.3f}" '
                f'width="{svg_width:.3f}mm" height="{total_height:.3f}mm">'
                f'<rect x="0" y="0" width="{svg_width:.3f}" height="{total_height:.3f}" fill="{html.escape(bg_color)}" />'
                f'<g transform="translate(0,{qr_y:.3f})" fill="{html.escape(fg_color)}" stroke="{html.escape(fg_color)}">{body}</g>'
                f'<text x="{(svg_width / 2):.3f}" y="{text_y:.3f}" '
                f'text-anchor="middle" font-family="Arial, sans-serif" '
                f'font-size="{font_size:.3f}" fill="{html.escape(fg_color)}">{escaped_hash}</text>'
                f'</svg>'
            )
        return svg_markup.encode('utf-8'), "image/svg+xml", "svg"

    qr_img = qr.make_image(fill_color=fg_color, back_color=bg_color).convert('RGB')
    if not include_hash:
        img_byte_arr = io.BytesIO()
        qr_img.save(img_byte_arr, format='PNG')
        img_byte_arr.seek(0)
        return img_byte_arr.getvalue(), "image/png", "png"

    qr_width, qr_height = qr_img.size
    text_height = max(30, qr_generation['hash_font_size'] + qr_generation['hash_padding'] + 8)
    final_img = Image.new('RGB', (qr_width, qr_height + text_height), bg_color)

    if hash_position == 'top':
        final_img.paste(qr_img, (0, text_height))
        text_y = max(4, qr_generation['hash_padding'] // 2)
    else:
        final_img.paste(qr_img, (0, 0))
        text_y = qr_height + max(4, qr_generation['hash_padding'] // 2)

    draw = ImageDraw.Draw(final_img)
    try:
        font = ImageFont.truetype("/usr/share/fonts/truetype/dejavu/DejaVuSans.ttf", qr_generation['hash_font_size'])
    except Exception:
        font = ImageFont.load_default()

    bbox = draw.textbbox((0, 0), hash_label, font=font)
    text_width = bbox[2] - bbox[0]
    text_position = ((qr_width - text_width) // 2, text_y)
    draw.text(text_position, hash_label, fill=fg_color, font=font)

    img_byte_arr = io.BytesIO()
    final_img.save(img_byte_arr, format='PNG')
    img_byte_arr.seek(0)
    return img_byte_arr.getvalue(), "image/png", "png"

async def get_platform_settings(request: Optional[Request] = None) -> Dict[str, Any]:
    settings_doc = await db.admin_configs.find_one({'config_type': 'platform_settings'}, {'_id': 0, 'data': 1})
    default_shipping_cost = 2990
    defaults = {
        'site_name': 'QR Profiles',
        'site_description': 'Plataforma de gestión de perfiles QR',
        'brand_logo_url': '',
        'favicon_url': '',
        'seo_title': 'QR Profiles | Plataforma de perfiles QR',
        'seo_description': 'Crea, administra y optimiza perfiles QR para empresas y personas.',
        'seo_keywords': 'QR, perfiles QR, tarjetas QR, marketing QR',
        'seo_og_image_url': '',
        'seo_indexing_enabled': True,
        'currency': 'CLP',
        'enable_payments': False,
        'default_qr_expiration_days': 365,
        'max_qr_per_person': 5,
        'max_qr_per_business': 50,
        'allow_person_create_qr': False,
        'allow_business_create_qr': True,
        'qr_generation': copy.deepcopy(DEFAULT_QR_GENERATION_SETTINGS),
        'enable_notifications_email': False,
        'notification_email_sender': '',
        'enable_store': True,
        'enable_coupons': True,
        'default_shipping_cost': default_shipping_cost,
        'shipping_regions': build_default_shipping_regions(default_shipping_cost),
        'store_theme_mode': 'default',
        'store_primary_color': '#111827',
        'store_secondary_color': '#1f2937',
        'store_accent_color': '#0ea5e9',
        'store_home_banner_url': '',
        'store_support_email': '',
        'store_support_whatsapp': '',
        'store_enable_guest_checkout': False,
        'store_enable_out_of_stock_waitlist': False,
        'enable_google_reviews_cta': False,
        'google_review_link': '',
        'google_review_place_id': '',
        'enable_whatsapp_cta': False,
        'whatsapp_number': '',
        'whatsapp_default_message': 'Hola, te contacto desde el QR.',
        'enable_whatsapp_after_scan': False,
        'enable_campaign_tracking': True,
        'enable_ab_tracking': True,
        'enable_loyalty_program': False,
        'loyalty_points_per_scan': 1,
        'loyalty_redeem_threshold': 50,
        'enable_public_lead_form': True,
        'lead_form_title': 'Solicitar Contacto',
        'lead_form_success_message': 'Mensaje enviado',
        'require_lead_phone_or_email': True,
        'lead_rate_limit_window_seconds': 60,
        'lead_rate_limit_max_requests': 3,
        'enable_lead_honeypot': True,
        'enable_lead_turnstile': False,
        'turnstile_site_key': '',
        'turnstile_secret_key': '',
        'enable_lead_notifications': False,
        'lead_notification_emails': '',
        'lead_notification_webhook_url': '',
        'enforce_master_only_subscription_purchase': True,
        'allow_admin_manual_subscription_grants': True,
    }
    if settings_doc and isinstance(settings_doc.get('data'), dict):
        merged = dict(defaults)
        merged.update(settings_doc['data'])
        merged['default_shipping_cost'] = parse_non_negative_float(merged.get('default_shipping_cost', default_shipping_cost), default_shipping_cost)
        merged['shipping_regions'] = normalize_shipping_regions_config(
            merged.get('shipping_regions'),
            merged['default_shipping_cost']
        )
        merged['qr_generation'] = normalize_qr_generation_settings(merged.get('qr_generation'))
        return sanitize_settings_image_fields(merged, request=request, strict=False)
    defaults['default_shipping_cost'] = parse_non_negative_float(defaults.get('default_shipping_cost', default_shipping_cost), default_shipping_cost)
    defaults['shipping_regions'] = normalize_shipping_regions_config(defaults.get('shipping_regions'), defaults['default_shipping_cost'])
    defaults['qr_generation'] = normalize_qr_generation_settings(defaults.get('qr_generation'))
    return sanitize_settings_image_fields(defaults, request=request, strict=False)

def sanitize_campaign_value(value: Optional[str], max_len: int = 120) -> Optional[str]:
    if value is None:
        return None
    cleaned = str(value).strip()
    if not cleaned:
        return None
    return cleaned[:max_len]

def build_google_review_link(settings: Dict[str, Any]) -> Optional[str]:
    return build_google_review_link_from_config(settings)

def normalize_phone_number(phone: Optional[str]) -> Optional[str]:
    if not phone:
        return None
    normalized = re.sub(r"[^0-9+]", "", str(phone))
    if normalized.startswith('+'):
        normalized = normalized[1:]
    return normalized if normalized else None

def build_whatsapp_link(phone: Optional[str], message: Optional[str]) -> Optional[str]:
    normalized_phone = normalize_phone_number(phone)
    if not normalized_phone:
        return None
    final_message = message or 'Hola, te contacto desde el QR.'
    return f"https://wa.me/{normalized_phone}?text={quote(final_message)}"

def coerce_bool(value: Any, default: bool = False) -> bool:
    if isinstance(value, bool):
        return value
    if value is None:
        return default
    if isinstance(value, (int, float)):
        return value != 0
    normalized = str(value).strip().lower()
    if normalized in {'true', '1', 'yes', 'si', 'sí', 'on'}:
        return True
    if normalized in {'false', '0', 'no', 'off', ''}:
        return False
    return bool(value)

def normalize_qr_profile_type(value: Any, default: str = 'personal') -> str:
    normalized = str(value or '').strip().lower()
    return normalized if normalized in PROFILE_FLOATING_BUTTON_DEFINITIONS else default

def get_allowed_floating_button_types(profile_type: Any) -> List[str]:
    normalized_profile_type = normalize_qr_profile_type(profile_type)
    return list(PROFILE_FLOATING_BUTTON_DEFINITIONS.get(normalized_profile_type, {}).keys())

def normalize_profile_public_settings(
    raw_settings: Any,
    *,
    profile_type: Any,
    legacy_settings: Any = None,
    strict: bool = False,
) -> Dict[str, Any]:
    if raw_settings is None:
        base_settings: Dict[str, Any] = {}
    elif isinstance(raw_settings, dict):
        base_settings = dict(raw_settings)
    elif strict:
        raise HTTPException(status_code=400, detail='public_settings debe enviarse como objeto')
    else:
        base_settings = {}

    legacy_base_settings: Dict[str, Any] = {}
    if isinstance(legacy_settings, dict):
        if 'request_location_automatically' in legacy_settings:
            legacy_base_settings['request_location_automatically'] = legacy_settings.get('request_location_automatically')
        elif 'request_location' in legacy_settings:
            legacy_base_settings['request_location_automatically'] = legacy_settings.get('request_location')

        if 'floating_buttons' in legacy_settings:
            legacy_base_settings['floating_buttons'] = legacy_settings.get('floating_buttons')
        elif 'floatingButtons' in legacy_settings:
            legacy_base_settings['floating_buttons'] = legacy_settings.get('floatingButtons')

    if legacy_base_settings:
        merged_settings = dict(legacy_base_settings)
        merged_settings.update(base_settings)
        base_settings = merged_settings

    request_location_value = base_settings.get('request_location_automatically')
    if request_location_value is None and 'request_location' in base_settings:
        request_location_value = base_settings.get('request_location')
    base_settings['request_location_automatically'] = coerce_bool(
        request_location_value,
        default=False,
    )

    top_photo_enabled_value = base_settings.get('top_profile_photo_enabled')
    if top_photo_enabled_value is None:
        top_photo_enabled_value = base_settings.get('topProfilePhotoEnabled')
    if top_photo_enabled_value is None:
        top_photo_enabled_value = base_settings.get('profile_photo_enabled')
    base_settings['top_profile_photo_enabled'] = coerce_bool(
        top_photo_enabled_value,
        default=False,
    )

    top_photo_shape_value = base_settings.get('top_profile_photo_shape')
    if top_photo_shape_value is None:
        top_photo_shape_value = base_settings.get('topProfilePhotoShape')
    if top_photo_shape_value is None:
        top_photo_shape_value = base_settings.get('profile_photo_shape')
    top_photo_shape = str(top_photo_shape_value or '').strip().lower()
    if top_photo_shape not in {'circle', 'rounded', 'square'}:
        top_photo_shape = 'circle'
    base_settings['top_profile_photo_shape'] = top_photo_shape

    raw_buttons = base_settings.get('floating_buttons')
    if raw_buttons is None and 'floatingButtons' in base_settings:
        raw_buttons = base_settings.get('floatingButtons')
    if raw_buttons is None:
        raw_buttons = []
    if not isinstance(raw_buttons, list):
        if strict:
            raise HTTPException(status_code=400, detail='public_settings.floating_buttons debe enviarse como lista')
        raw_buttons = []

    allowed_buttons = get_allowed_floating_button_types(profile_type)
    allowed_set = set(allowed_buttons)
    normalized_buttons: List[str] = []
    invalid_buttons: List[str] = []

    for item in raw_buttons:
        if not isinstance(item, str):
            if strict:
                invalid_buttons.append(str(item))
            continue
        normalized_button = item.strip().lower()
        if not normalized_button:
            continue
        if normalized_button not in allowed_set:
            if strict:
                invalid_buttons.append(normalized_button)
            continue
        if normalized_button in normalized_buttons:
            continue
        if len(normalized_buttons) >= QR_PUBLIC_SETTINGS_MAX_FLOATING_BUTTONS:
            if strict:
                raise HTTPException(
                    status_code=400,
                    detail=f'public_settings.floating_buttons admite hasta {QR_PUBLIC_SETTINGS_MAX_FLOATING_BUTTONS} opciones',
                )
            break
        normalized_buttons.append(normalized_button)

    if strict and invalid_buttons:
        allowed_text = ', '.join(allowed_buttons) or 'sin opciones disponibles'
        invalid_text = ', '.join(invalid_buttons)
        raise HTTPException(
            status_code=400,
            detail=(
                f'Botones flotantes inválidos para perfil {normalize_qr_profile_type(profile_type)}: '
                f'{invalid_text}. Permitidos: {allowed_text}'
            ),
        )

    base_settings['floating_buttons'] = normalized_buttons[:QR_PUBLIC_SETTINGS_MAX_FLOATING_BUTTONS]
    base_settings['request_location'] = base_settings['request_location_automatically']
    for legacy_key in ('resolved_floating_buttons', 'floating_buttons_resolved', 'resolved_buttons'):
        base_settings.pop(legacy_key, None)
    return base_settings

def normalize_template_display_options(raw_options: Any, category: Any) -> Dict[str, Any]:
    normalized_category = 'business' if str(category or '').strip().lower() == 'business' else 'personal'
    source = raw_options if isinstance(raw_options, dict) else {}
    card_style = str(source.get('card_style', source.get('cardStyle', 'elegant')) or 'elegant').strip().lower()
    if card_style not in {'elegant', 'bold', 'glass'}:
        card_style = 'elegant'

    return {
        'show_profile_type_badge': coerce_bool(
            source.get('show_profile_type_badge', source.get('showProfileTypeBadge')),
            default=True,
        ),
        'show_business_banner': coerce_bool(
            source.get('show_business_banner', source.get('showBusinessBanner')),
            default=True,
        ) if normalized_category == 'business' else False,
        'show_floating_actions': coerce_bool(
            source.get('show_floating_actions', source.get('showFloatingActions')),
            default=True,
        ),
        'show_lead_form': coerce_bool(
            source.get('show_lead_form', source.get('showLeadForm')),
            default=(normalized_category == 'business'),
        ),
        'show_manual_location_button': coerce_bool(
            source.get('show_manual_location_button', source.get('showManualLocationButton')),
            default=True,
        ) if normalized_category == 'personal' else False,
        'show_map_section': coerce_bool(
            source.get('show_map_section', source.get('showMapSection')),
            default=(normalized_category == 'business'),
        ),
        'show_highlights': coerce_bool(
            source.get('show_highlights', source.get('showHighlights')),
            default=True,
        ),
        'card_style': card_style,
    }

def normalize_profile_types_config_data(raw_config: Any) -> Tuple[Dict[str, Any], bool]:
    if not isinstance(raw_config, dict):
        return {'personal': [], 'business': []}, True

    normalized: Dict[str, Any] = copy.deepcopy(raw_config)
    changed = False

    for category in ('personal', 'business'):
        templates = normalized.get(category)
        if not isinstance(templates, list):
            normalized[category] = []
            changed = True
            continue

        normalized_templates: List[Dict[str, Any]] = []
        for template in templates:
            if not isinstance(template, dict):
                changed = True
                continue

            template_copy = copy.deepcopy(template)
            template_profile_type = normalize_qr_profile_type(template_copy.get('category') or category)
            if template_copy.get('category') != template_profile_type:
                template_copy['category'] = template_profile_type
                changed = True

            normalized_public_settings = normalize_profile_public_settings(
                template_copy.get('default_public_settings'),
                profile_type=template_profile_type,
                strict=False,
            )
            if template_copy.get('default_public_settings') != normalized_public_settings:
                template_copy['default_public_settings'] = normalized_public_settings
                changed = True

            normalized_display_options = normalize_template_display_options(
                template_copy.get('display_options'),
                template_profile_type,
            )
            if template_copy.get('display_options') != normalized_display_options:
                template_copy['display_options'] = normalized_display_options
                changed = True

            normalized_templates.append(template_copy)

        if normalized_templates != templates:
            normalized[category] = normalized_templates
            changed = True

    return normalized, changed

def canonicalize_public_settings_for_comparison(public_settings: Any, profile_type: Any) -> Dict[str, Any]:
    normalized = normalize_profile_public_settings(
        public_settings,
        profile_type=profile_type,
        strict=False,
    )
    return {
        'request_location_automatically': coerce_bool(
            normalized.get('request_location_automatically'),
            default=False,
        ),
        'top_profile_photo_enabled': coerce_bool(
            normalized.get('top_profile_photo_enabled'),
            default=False,
        ),
        'top_profile_photo_shape': str(normalized.get('top_profile_photo_shape') or 'circle').strip().lower() or 'circle',
        'floating_buttons': list(normalized.get('floating_buttons') or [])[:QR_PUBLIC_SETTINGS_MAX_FLOATING_BUTTONS],
    }

def are_public_settings_equivalent(
    left_settings: Any,
    right_settings: Any,
    *,
    profile_type: Any,
) -> bool:
    return canonicalize_public_settings_for_comparison(left_settings, profile_type) == canonicalize_public_settings_for_comparison(right_settings, profile_type)

async def get_template_default_public_settings(profile_type: Any, sub_type: Any) -> Dict[str, Any]:
    template = await get_profile_template(profile_type, sub_type)
    raw_defaults = template.get('default_public_settings') if isinstance(template, dict) else {}
    return normalize_profile_public_settings(
        raw_defaults,
        profile_type=profile_type,
        strict=False,
    )

async def resolve_public_settings_customized_flag(
    *,
    profile_type: Any,
    sub_type: Any,
    public_settings: Any,
    explicit_value: Any = None,
) -> bool:
    if explicit_value is not None:
        return coerce_bool(explicit_value, default=False)
    template_defaults = await get_template_default_public_settings(profile_type, sub_type)
    return not are_public_settings_equivalent(
        public_settings,
        template_defaults,
        profile_type=profile_type,
    )

def build_legacy_notification_config(
    notification_config: Any,
    public_settings: Dict[str, Any],
) -> Dict[str, Any]:
    normalized = dict(notification_config) if isinstance(notification_config, dict) else {}
    normalized['request_location_automatically'] = coerce_bool(
        public_settings.get('request_location_automatically'),
        default=False,
    )
    normalized['request_location'] = normalized['request_location_automatically']
    normalized['top_profile_photo_enabled'] = coerce_bool(
        public_settings.get('top_profile_photo_enabled'),
        default=False,
    )
    normalized['top_profile_photo_shape'] = str(public_settings.get('top_profile_photo_shape') or 'circle').strip().lower() or 'circle'
    normalized['floating_buttons'] = list(public_settings.get('floating_buttons') or [])[:QR_PUBLIC_SETTINGS_MAX_FLOATING_BUTTONS]

    for legacy_key in ('resolved_floating_buttons', 'floating_buttons_resolved', 'resolved_buttons'):
        normalized.pop(legacy_key, None)

    resolved_buttons = public_settings.get('resolved_floating_buttons')
    if isinstance(resolved_buttons, list):
        normalized['resolved_floating_buttons'] = resolved_buttons
        normalized['floating_buttons_resolved'] = resolved_buttons
        normalized['resolved_buttons'] = resolved_buttons

    return normalized

def enrich_public_settings_runtime(
    public_settings: Dict[str, Any],
    *,
    resolved_floating_buttons: Optional[List[Dict[str, str]]] = None,
) -> Dict[str, Any]:
    normalized = dict(public_settings)
    normalized['request_location'] = coerce_bool(
        normalized.get('request_location_automatically'),
        default=False,
    )

    for legacy_key in ('resolved_floating_buttons', 'floating_buttons_resolved', 'resolved_buttons'):
        normalized.pop(legacy_key, None)

    if resolved_floating_buttons is not None:
        normalized['resolved_floating_buttons'] = resolved_floating_buttons
        normalized['floating_buttons_resolved'] = resolved_floating_buttons
        normalized['resolved_buttons'] = resolved_floating_buttons

    return normalized

def build_absolute_uploaded_file_url(value: Any, request: Optional[Request] = None) -> Optional[str]:
    normalized = sanitize_uploaded_image_reference_for_output(value, request=request)
    if normalized is None:
        return None
    if normalized == '':
        return ''
    return f"{get_upload_base_url(request)}{normalized}"

def parse_optional_float(value: Any) -> Optional[float]:
    try:
        if value is None or str(value).strip() == '':
            return None
        return float(value)
    except (TypeError, ValueError):
        return None

def build_tel_link(phone: Optional[str]) -> Optional[str]:
    normalized_phone = normalize_phone_number(phone)
    if not normalized_phone:
        return None
    return f"tel:+{normalized_phone}"

def normalize_public_link_url(value: Any, request: Optional[Request] = None) -> Optional[str]:
    if value is None:
        return None
    trimmed = str(value).strip()
    if not trimmed:
        return None
    parsed = urlparse(trimmed)
    if parsed.scheme in {'http', 'https', 'mailto', 'tel'} and (parsed.netloc or parsed.scheme in {'mailto', 'tel'}):
        return trimmed
    if trimmed.startswith('/'):
        return f"{get_upload_base_url(request)}{trimmed}"
    if not parsed.scheme and not parsed.netloc and re.match(r'^[A-Za-z0-9.-]+\.[A-Za-z]{2,}(/.*)?$', trimmed):
        return f'https://{trimmed}'
    return None

def build_google_review_link_from_config(settings: Dict[str, Any]) -> Optional[str]:
    raw_link = normalize_public_link_url(settings.get('google_review_link'))
    if raw_link:
        return raw_link
    place_id = sanitize_campaign_value(settings.get('google_review_place_id'))
    if place_id:
        return f"https://search.google.com/local/writereview?placeid={quote(place_id)}"
    return None

def get_first_present_value(payload: Dict[str, Any], keys: List[str]) -> Optional[Any]:
    for key in keys:
        candidate = payload.get(key)
        if candidate is None:
            continue
        if isinstance(candidate, str) and not candidate.strip():
            continue
        return candidate
    return None

def build_public_profile_url(profile: Dict[str, Any]) -> Optional[str]:
    profile_hash = str(profile.get('hash') or '').strip()
    if not profile_hash:
        return None
    return f"{FRONTEND_URL.rstrip('/')}/profile/{quote(profile_hash)}"

def build_profile_location_link(profile_data: Dict[str, Any]) -> Optional[str]:
    direct_map_link = normalize_public_link_url(get_first_present_value(profile_data, ['google_maps_url', 'maps_url', 'map_url']))
    if direct_map_link:
        return direct_map_link

    lat = parse_optional_float(get_first_present_value(profile_data, ['lat', 'latitude', 'map_latitude']))
    lng = parse_optional_float(get_first_present_value(profile_data, ['lng', 'longitude', 'lon', 'map_longitude']))
    if lat is not None and lng is not None:
        return f"https://www.google.com/maps/search/?api=1&query={lat},{lng}"

    address = get_first_present_value(profile_data, ['address', 'location', 'map_address'])
    if address:
        return f"https://www.google.com/maps/search/?api=1&query={quote(str(address).strip())}"
    return None

def build_profile_floating_button(
    button_type: str,
    profile: Dict[str, Any],
    public_settings: Dict[str, Any],
    request: Optional[Request] = None,
) -> Optional[Dict[str, str]]:
    profile_data = profile.get('data') if isinstance(profile.get('data'), dict) else {}
    profile_name = str(profile.get('name') or 'este perfil').strip()
    whatsapp_message = (
        str(profile_data.get('whatsapp_message') or '').strip()
        or f"Hola, te escribo por el perfil QR {profile_name}."
    )

    if button_type == 'call_contact':
        url = build_tel_link(get_first_present_value(profile_data, ['contact_phone', 'owner_phone', 'phone']))
    elif button_type == 'send_location':
        # Este botón dispara el envío de ubicación del dispositivo del visitante
        # (no depende de que el perfil tenga una dirección cargada).
        # Si existe ubicación en el perfil, mantenemos ese enlace como fallback.
        url = build_profile_location_link(profile_data) or 'action://send-location'
    elif button_type == 'call_emergency':
        url = build_tel_link(get_first_present_value(profile_data, ['emergency_phone', 'contact_phone']))
    elif button_type == 'whatsapp':
        url = build_whatsapp_link(
            get_first_present_value(profile_data, ['whatsapp', 'phone', 'contact_phone', 'owner_phone', 'emergency_phone']),
            whatsapp_message,
        )
    elif button_type == 'share_profile':
        url = build_public_profile_url(profile)
    elif button_type == 'send_survey':
        url = normalize_public_link_url(
            get_first_present_value(profile_data, ['survey_url', 'feedback_url', 'form_url', 'google_form_url']),
            request=request,
        )
    elif button_type == 'rate_restaurant':
        url = (
            build_google_review_link_from_config(profile_data)
            or normalize_public_link_url(get_first_present_value(profile_data, ['review_url', 'tripadvisor_url']), request=request)
        )
    elif button_type == 'view_catalog_pdf':
        url = normalize_public_link_url(
            get_first_present_value(profile_data, ['catalog_pdf_url', 'catalog_url', 'menu_pdf_url', 'menu_url', 'pdf_url']),
            request=request,
        )
    elif button_type == 'call_business':
        url = build_tel_link(get_first_present_value(profile_data, ['phone', 'contact_phone', 'business_phone']))
    elif button_type == 'website':
        url = normalize_public_link_url(get_first_present_value(profile_data, ['website', 'site_url']), request=request)
    else:
        url = None

    if not url:
        return None

    profile_type = normalize_qr_profile_type(profile.get('profile_type'))
    label = PROFILE_FLOATING_BUTTON_DEFINITIONS.get(profile_type, {}).get(button_type, {}).get('label') or button_type
    return {
        'type': button_type,
        'label': label,
        'url': url,
    }

def resolve_profile_floating_buttons(
    profile: Dict[str, Any],
    public_settings: Dict[str, Any],
    request: Optional[Request] = None,
) -> List[Dict[str, str]]:
    resolved_buttons: List[Dict[str, str]] = []
    for button_type in public_settings.get('floating_buttons', [])[:QR_PUBLIC_SETTINGS_MAX_FLOATING_BUTTONS]:
        button = build_profile_floating_button(button_type, profile, public_settings, request=request)
        if button:
            resolved_buttons.append(button)
    return resolved_buttons

def build_public_profile_actions(profile: Dict[str, Any], settings: Dict[str, Any]) -> List[Dict[str, str]]:
    actions: List[Dict[str, str]] = []

    if settings.get('enable_google_reviews_cta'):
        review_link = build_google_review_link_from_config(settings)
        if review_link:
            actions.append({
                'type': 'google_review',
                'label': 'Dejar Reseña en Google',
                'url': review_link,
            })

    if settings.get('enable_whatsapp_cta'):
        profile_data = profile.get('data') if isinstance(profile.get('data'), dict) else {}
        candidate_phones = [
            settings.get('whatsapp_number'),
            profile_data.get('whatsapp'),
            profile_data.get('phone'),
            profile_data.get('owner_phone'),
            profile_data.get('contact_phone'),
            profile_data.get('emergency_phone'),
        ]
        whatsapp_phone = None
        for candidate in candidate_phones:
            normalized_candidate = normalize_phone_number(candidate)
            if normalized_candidate:
                whatsapp_phone = normalized_candidate
                break
        whatsapp_message = settings.get('whatsapp_default_message') or f"Hola, te escribo por el perfil QR {profile.get('name', '')}."
        whatsapp_link = build_whatsapp_link(whatsapp_phone, whatsapp_message)
        if whatsapp_link:
            actions.append({
                'type': 'whatsapp',
                'label': 'Contactar por WhatsApp',
                'url': whatsapp_link,
            })

    return actions

def get_campaign_payload_from_request(scan_like_payload: Any, request: Request, settings: Dict[str, Any]) -> Dict[str, Optional[str]]:
    query_params = request.query_params
    campaign_source = sanitize_campaign_value(getattr(scan_like_payload, 'campaign_source', None) or query_params.get('utm_source'))
    campaign_medium = sanitize_campaign_value(getattr(scan_like_payload, 'campaign_medium', None) or query_params.get('utm_medium'))
    campaign_name = sanitize_campaign_value(getattr(scan_like_payload, 'campaign_name', None) or query_params.get('utm_campaign'))
    campaign_term = sanitize_campaign_value(getattr(scan_like_payload, 'campaign_term', None) or query_params.get('utm_term'))
    campaign_content = sanitize_campaign_value(getattr(scan_like_payload, 'campaign_content', None) or query_params.get('utm_content'))
    variant = sanitize_campaign_value(getattr(scan_like_payload, 'variant', None) or query_params.get('variant'))

    if not settings.get('enable_campaign_tracking', True):
        campaign_source = None
        campaign_medium = None
        campaign_name = None
        campaign_term = None
        campaign_content = None
    if not settings.get('enable_ab_tracking', True):
        variant = None

    return {
        'campaign_source': campaign_source,
        'campaign_medium': campaign_medium,
        'campaign_name': campaign_name,
        'campaign_term': campaign_term,
        'campaign_content': campaign_content,
        'variant': variant,
    }

def build_lead_form_config(profile: Dict[str, Any], settings: Dict[str, Any]) -> Dict[str, Any]:
    is_business_profile = profile.get('profile_type') == 'business'
    enabled = bool(settings.get('enable_public_lead_form', True)) and is_business_profile
    return {
        'enabled': enabled,
        'title': settings.get('lead_form_title') or 'Solicitar Contacto',
        'success_message': settings.get('lead_form_success_message') or 'Mensaje enviado',
        'require_phone_or_email': bool(settings.get('require_lead_phone_or_email', True)),
        'captcha_enabled': bool(settings.get('enable_lead_turnstile', False)),
        'turnstile_site_key': settings.get('turnstile_site_key') or '',
    }

def parse_email_list(raw_value: Any) -> List[str]:
    if raw_value is None:
        return []
    if isinstance(raw_value, list):
        candidates = [str(item).strip() for item in raw_value]
    else:
        candidates = [item.strip() for item in str(raw_value).split(',')]
    result: List[str] = []
    for candidate in candidates:
        if candidate and candidate not in result:
            result.append(candidate)
    return result

def get_client_ip(request: Request) -> str:
    forwarded = request.headers.get('x-forwarded-for')
    if forwarded:
        first_ip = forwarded.split(',')[0].strip()
        if first_ip:
            return first_ip
    real_ip = request.headers.get('x-real-ip')
    if real_ip:
        return real_ip.strip()
    if request.client and request.client.host:
        return request.client.host
    return 'unknown'

def verify_turnstile_token(token: str, secret_key: str, client_ip: str) -> bool:
    if not token or not secret_key:
        return False
    try:
        response = requests.post(
            'https://challenges.cloudflare.com/turnstile/v0/siteverify',
            data={
                'secret': secret_key,
                'response': token,
                'remoteip': client_ip,
            },
            timeout=8,
        )
        if response.status_code != 200:
            return False
        payload = response.json()
        return bool(payload.get('success'))
    except Exception:
        return False

async def is_lead_submission_allowed(
    qr_hash: str,
    client_ip: str,
    payload: PublicLeadCreate,
    settings: Dict[str, Any]
) -> None:
    if settings.get('enable_lead_honeypot', True):
        honeypot_value = sanitize_campaign_value(payload.website, 100)
        if honeypot_value:
            raise HTTPException(status_code=400, detail="No se pudo procesar la solicitud")

    rate_limit_window = max(10, int(settings.get('lead_rate_limit_window_seconds', 60) or 60))
    rate_limit_max = max(1, int(settings.get('lead_rate_limit_max_requests', 3) or 3))
    cutoff = (datetime.now(timezone.utc) - timedelta(seconds=rate_limit_window)).isoformat()
    recent_submissions = await db.leads.count_documents({
        'qr_hash': qr_hash,
        'client_ip': client_ip,
        'timestamp': {'$gte': cutoff},
    })
    if recent_submissions >= rate_limit_max:
        raise HTTPException(status_code=429, detail="Demasiadas solicitudes, intenta de nuevo en unos minutos")

    if settings.get('enable_lead_turnstile', False):
        secret_key = str(settings.get('turnstile_secret_key') or '').strip()
        if not secret_key:
            raise HTTPException(status_code=500, detail="Captcha no configurado en el servidor")
        token = str(payload.captcha_token or '').strip()
        if not token:
            raise HTTPException(status_code=400, detail="Captcha requerido")
        if not verify_turnstile_token(token, secret_key, client_ip):
            raise HTTPException(status_code=400, detail="Captcha inválido")

def send_email_notification(recipients: List[str], subject: str, body: str) -> None:
    if not recipients:
        return
    smtp_host = os.getenv('SMTP_HOST', '').strip()
    smtp_port = int(os.getenv('SMTP_PORT', '587'))
    smtp_user = os.getenv('SMTP_USER', '').strip()
    smtp_pass = os.getenv('SMTP_PASS', '').strip()
    smtp_use_tls = str(os.getenv('SMTP_USE_TLS', 'true')).strip().lower() != 'false'
    from_email = os.getenv('SMTP_FROM', smtp_user or 'noreply@localhost')
    if not smtp_host:
        logger.warning("SMTP_HOST no configurado, se omite envío de email")
        return

    message = EmailMessage()
    message['From'] = from_email
    message['To'] = ', '.join(recipients)
    message['Subject'] = subject
    message.set_content(body)

    with smtplib.SMTP(smtp_host, smtp_port, timeout=10) as smtp:
        if smtp_use_tls:
            smtp.starttls()
        if smtp_user:
            smtp.login(smtp_user, smtp_pass)
        smtp.send_message(message)

async def notify_lead_created(lead_doc: Dict[str, Any], profile: Dict[str, Any], settings: Dict[str, Any]) -> None:
    if not settings.get('enable_lead_notifications', False):
        return

    owner_email = None
    owner_user_id = lead_doc.get('owner_user_id')
    if owner_user_id:
        owner_user = await db.users.find_one({'id': owner_user_id}, {'_id': 0, 'email': 1})
        if owner_user:
            owner_email = owner_user.get('email')

    recipients = parse_email_list(settings.get('lead_notification_emails'))
    if owner_email and owner_email not in recipients:
        recipients.append(owner_email)

    summary = (
        f"Nuevo lead capturado\n"
        f"Perfil: {profile.get('alias') or profile.get('name')}\n"
        f"Nombre: {lead_doc.get('name') or '-'}\n"
        f"Teléfono: {lead_doc.get('phone') or '-'}\n"
        f"Email: {lead_doc.get('email') or '-'}\n"
        f"Mensaje: {lead_doc.get('message') or '-'}\n"
        f"Campaña: {lead_doc.get('campaign_source') or 'direct'} / {lead_doc.get('campaign_name') or '(none)'}"
    )

    if settings.get('enable_notifications_email') and recipients:
        try:
            send_email_notification(recipients, 'Nuevo lead capturado en QR Profiles', summary)
        except Exception as exc:
            logger.error(f"Error enviando notificación email de lead: {str(exc)}")

    webhook_url = str(settings.get('lead_notification_webhook_url') or '').strip()
    if webhook_url:
        try:
            requests.post(
                webhook_url,
                json={
                    'event': 'lead.created',
                    'lead': sanitize_for_json(lead_doc),
                    'profile': {
                        'id': profile.get('id'),
                        'name': profile.get('name'),
                        'alias': profile.get('alias'),
                        'hash': profile.get('hash'),
                    },
                },
                timeout=8,
            )
        except Exception as exc:
            logger.error(f"Error enviando webhook de lead: {str(exc)}")

def build_leads_csv_bytes(leads: List[Dict[str, Any]]) -> bytes:
    output = io.StringIO()
    writer = csv.writer(output)
    writer.writerow([
        'timestamp',
        'status',
        'profile_name',
        'profile_alias',
        'name',
        'phone',
        'email',
        'message',
        'campaign_source',
        'campaign_medium',
        'campaign_name',
        'variant',
    ])
    for lead in leads:
        writer.writerow([
            lead.get('timestamp', ''),
            lead.get('status', ''),
            lead.get('profile_name', ''),
            lead.get('profile_alias', ''),
            lead.get('name', ''),
            lead.get('phone', ''),
            lead.get('email', ''),
            lead.get('message', ''),
            lead.get('campaign_source', ''),
            lead.get('campaign_medium', ''),
            lead.get('campaign_name', ''),
            lead.get('variant', ''),
        ])
    return output.getvalue().encode('utf-8')

def get_upload_base_url(request: Optional[Request] = None) -> str:
    if BACKEND_PUBLIC_URL:
        return BACKEND_PUBLIC_URL
    if request:
        return str(request.base_url).rstrip('/')
    return 'http://localhost:8001'

def get_allowed_upload_hosts(request: Optional[Request] = None) -> Set[str]:
    hosts: Set[str] = set()
    candidates = {
        BACKEND_PUBLIC_URL,
        'http://localhost:8001',
        'http://127.0.0.1:8001',
    }
    if request:
        candidates.add(str(request.base_url).rstrip('/'))
    for candidate in candidates:
        parsed = urlparse(str(candidate or '').strip())
        if parsed.scheme in {'http', 'https'} and parsed.netloc:
            hosts.add(parsed.netloc.lower())
    return hosts

def normalize_upload_scope(scope: Optional[str]) -> str:
    raw_scope = str(scope or 'general').strip().lower()
    normalized = re.sub(r"[^a-z0-9_\-]", "", raw_scope)
    return normalized or 'general'

def normalize_optional_user_id(value: Any) -> Optional[str]:
    normalized = str(value or '').strip()
    return normalized or None

def parse_normalized_local_upload_path(local_path: str) -> Optional[Tuple[str, str, str]]:
    normalized = str(local_path or '').strip()
    if not normalized.startswith('/uploads/'):
        return None
    relative = normalized[len('/uploads/'):]
    segments = [segment for segment in relative.split('/') if segment]
    if len(segments) != 3:
        return None

    scope, owner_segment, file_name = segments
    if scope != normalize_upload_scope(scope):
        return None
    if not UPLOAD_OWNER_SEGMENT_PATTERN.fullmatch(owner_segment):
        return None
    if not UPLOAD_FILE_NAME_PATTERN.fullmatch(file_name):
        return None
    if Path(file_name).name != file_name:
        return None
    if Path(file_name).suffix.lower() not in UPLOAD_ALLOWED_FILE_EXTENSIONS:
        return None
    return scope, owner_segment, file_name

def normalize_local_upload_path(value: str) -> Optional[str]:
    trimmed = str(value or '').strip()
    if not trimmed:
        return ''
    if trimmed.startswith('uploads/'):
        trimmed = f'/{trimmed}'
    if not trimmed.startswith('/uploads/'):
        return None
    path_only = re.sub(r'/+', '/', trimmed.split('?', 1)[0].split('#', 1)[0])
    relative = path_only[len('/uploads/'):]
    if not relative:
        return None
    segments = [segment for segment in relative.split('/') if segment]
    if not segments or any(segment in {'.', '..'} for segment in segments):
        return None
    normalized = f"/uploads/{'/'.join(segments)}"
    parts = parse_normalized_local_upload_path(normalized)
    if not parts:
        return None
    scope, owner_segment, file_name = parts
    return f"/uploads/{scope}/{owner_segment}/{file_name}"

def resolve_uploaded_image_reference(value: Any, request: Optional[Request] = None) -> Tuple[Optional[str], str]:
    if value is None:
        return None, 'empty'
    if not isinstance(value, str):
        return None, 'invalid_type'

    trimmed = value.strip()
    if not trimmed:
        return '', 'empty_string'

    local_path = normalize_local_upload_path(trimmed)
    if local_path is not None:
        return local_path, 'ok'

    parsed = urlparse(trimmed)
    if parsed.scheme in {'http', 'https'}:
        if parsed.netloc.lower() not in get_allowed_upload_hosts(request):
            return None, 'external_url'
        normalized_path = normalize_local_upload_path(parsed.path or '')
        if normalized_path is None:
            return None, 'invalid_path'
        return normalized_path, 'ok'
    if parsed.scheme or parsed.netloc:
        return None, 'external_url'

    if trimmed.startswith('/uploads/') or trimmed.startswith('uploads/'):
        return None, 'invalid_path'

    return None, 'invalid_reference'

def normalize_uploaded_image_reference(value: Any, request: Optional[Request] = None) -> Optional[str]:
    normalized, reason = resolve_uploaded_image_reference(value, request=request)
    if reason == 'ok':
        return normalized
    if reason == 'empty_string':
        return ''
    return None

def is_uploaded_image_reference(value: Any, request: Optional[Request] = None) -> bool:
    if value is None:
        return True
    return normalize_uploaded_image_reference(value, request=request) is not None

def sanitize_uploaded_image_reference_for_output(value: Any, request: Optional[Request] = None) -> Optional[str]:
    if value is None:
        return None
    if not isinstance(value, str):
        return None
    normalized = normalize_uploaded_image_reference(value, request=request)
    if normalized is None:
        return None
    return normalized

def resolve_uploaded_image_reference_for_output(value: Any, request: Optional[Request] = None) -> Optional[str]:
    return build_absolute_uploaded_file_url(value, request=request)

def enforce_uploaded_image_reference(value: Any, field_label: str, request: Optional[Request] = None) -> Optional[str]:
    if value is None:
        return None
    if not isinstance(value, str):
        raise HTTPException(
            status_code=400,
            detail=f'La imagen de "{field_label}" debe enviarse como referencia local de /uploads'
        )
    normalized, reason = resolve_uploaded_image_reference(value, request=request)
    if reason == 'external_url':
        raise HTTPException(
            status_code=400,
            detail=f'La imagen de "{field_label}" debe provenir de un upload local de la app. No se aceptan URLs externas.'
        )
    if normalized is None:
        if reason == 'invalid_path':
            raise HTTPException(
                status_code=400,
                detail=f'La imagen de "{field_label}" debe usar una ruta válida con formato /uploads/<scope>/<owner>/<archivo>.'
            )
        raise HTTPException(
            status_code=400,
            detail=f'La imagen de "{field_label}" debe enviarse como referencia local de /uploads'
        )
    return normalized

def enforce_uploaded_image_reference_policy(
    normalized_path: Optional[str],
    field_label: str,
    *,
    allowed_scopes: Optional[Set[str]] = None,
    owner_user_id: Optional[str] = None
) -> Optional[str]:
    if normalized_path in {None, ''}:
        return normalized_path

    parts = parse_normalized_local_upload_path(str(normalized_path))
    if not parts:
        raise HTTPException(
            status_code=400,
            detail=f'La imagen de "{field_label}" debe usar una ruta válida con formato /uploads/<scope>/<owner>/<archivo>.'
        )

    scope, owner_segment, file_name = parts

    if allowed_scopes:
        normalized_scopes = {
            normalize_upload_scope(scope_name)
            for scope_name in allowed_scopes
            if normalize_upload_scope(scope_name)
        }
        if scope not in normalized_scopes:
            allowed_scope_examples = ', '.join(
                f'/uploads/{allowed_scope}/<owner>/{file_name}'
                for allowed_scope in sorted(normalized_scopes)
            )
            raise HTTPException(
                status_code=400,
                detail=f'La imagen de "{field_label}" usa el scope "{scope}", pero para este campo solo se aceptan {allowed_scope_examples}.'
            )

    if owner_user_id is not None and owner_segment != str(owner_user_id):
        raise HTTPException(
            status_code=400,
            detail=f'La imagen de "{field_label}" debe pertenecer al usuario dueño del perfil y usar /uploads/<scope>/{owner_user_id}/<archivo>.'
        )

    return normalized_path

def collect_template_image_field_names(node: Any, output: Set[str]) -> None:
    if isinstance(node, dict):
        if str(node.get('type') or '').strip().lower() == 'image':
            for key in ('name', 'id', 'key'):
                candidate = node.get(key)
                if isinstance(candidate, str) and candidate.strip():
                    output.add(candidate.strip().lower())
        for value in node.values():
            collect_template_image_field_names(value, output)
    elif isinstance(node, list):
        for item in node:
            collect_template_image_field_names(item, output)

async def get_profile_image_field_names(
    profile_type: Optional[str],
    sub_type: Optional[str],
    cache: Optional[Dict[Tuple[str, str], Set[str]]] = None
) -> Set[str]:
    cache_key = (str(profile_type or ''), str(sub_type or ''))
    if cache is not None and cache_key in cache:
        return cache[cache_key]

    image_fields: Set[str] = set()
    template = await get_profile_template(profile_type, sub_type)
    if template:
        collect_template_image_field_names(template, image_fields)
    if cache is not None:
        cache[cache_key] = image_fields
    return image_fields

def process_uploaded_image_field_value(
    value: Any,
    field_label: str,
    *,
    request: Optional[Request] = None,
    strict: bool = True,
    allowed_scopes: Optional[Set[str]] = None,
    owner_user_id: Optional[str] = None
) -> Any:
    if isinstance(value, list):
        return [
            process_uploaded_image_field_value(
                item,
                f'{field_label}[{index}]',
                request=request,
                strict=strict,
                allowed_scopes=allowed_scopes,
                owner_user_id=owner_user_id,
            )
            for index, item in enumerate(value)
        ]
    if strict:
        normalized = enforce_uploaded_image_reference(value, field_label, request=request)
        return enforce_uploaded_image_reference_policy(
            normalized,
            field_label,
            allowed_scopes=allowed_scopes,
            owner_user_id=owner_user_id,
        )
    return sanitize_uploaded_image_reference_for_output(value, request=request)

def resolve_uploaded_image_field_value_for_output(value: Any, request: Optional[Request] = None) -> Any:
    if isinstance(value, list):
        return [resolve_uploaded_image_field_value_for_output(item, request=request) for item in value]
    return resolve_uploaded_image_reference_for_output(value, request=request)

def should_treat_as_image_field(key: Any, explicit_image_fields: Optional[Set[str]] = None) -> bool:
    key_str = str(key or '').strip()
    if explicit_image_fields and key_str.lower() in explicit_image_fields:
        return True
    return bool(IMAGE_FIELD_NAME_PATTERN.search(key_str))

def enforce_uploaded_images_in_data(
    data: Any,
    path: str = 'data',
    *,
    explicit_image_fields: Optional[Set[str]] = None,
    request: Optional[Request] = None,
    strict: bool = True,
    allowed_scopes: Optional[Set[str]] = None,
    owner_user_id: Optional[str] = None
) -> Any:
    if isinstance(data, dict):
        normalized: Dict[str, Any] = {}
        for key, value in data.items():
            next_path = f'{path}.{key}'
            if should_treat_as_image_field(key, explicit_image_fields):
                normalized[key] = process_uploaded_image_field_value(
                    value,
                    next_path,
                    request=request,
                    strict=strict,
                    allowed_scopes=allowed_scopes,
                    owner_user_id=owner_user_id,
                )
            else:
                normalized[key] = enforce_uploaded_images_in_data(
                    value,
                    next_path,
                    explicit_image_fields=explicit_image_fields,
                    request=request,
                    strict=strict,
                    allowed_scopes=allowed_scopes,
                    owner_user_id=owner_user_id,
                )
        return normalized
    if isinstance(data, list):
        return [
            enforce_uploaded_images_in_data(
                item,
                f'{path}[{idx}]',
                explicit_image_fields=explicit_image_fields,
                request=request,
                strict=strict,
                allowed_scopes=allowed_scopes,
                owner_user_id=owner_user_id,
            )
            for idx, item in enumerate(data)
        ]
    return data

def resolve_uploaded_images_in_data_for_output(
    data: Any,
    path: str = 'data',
    *,
    explicit_image_fields: Optional[Set[str]] = None,
    request: Optional[Request] = None,
) -> Any:
    if isinstance(data, dict):
        resolved: Dict[str, Any] = {}
        for key, value in data.items():
            next_path = f'{path}.{key}'
            if should_treat_as_image_field(key, explicit_image_fields):
                resolved[key] = resolve_uploaded_image_field_value_for_output(value, request=request)
            else:
                resolved[key] = resolve_uploaded_images_in_data_for_output(
                    value,
                    next_path,
                    explicit_image_fields=explicit_image_fields,
                    request=request,
                )
        return resolved
    if isinstance(data, list):
        return [
            resolve_uploaded_images_in_data_for_output(
                item,
                f'{path}[{idx}]',
                explicit_image_fields=explicit_image_fields,
                request=request,
            )
            for idx, item in enumerate(data)
        ]
    return data

async def enforce_profile_uploaded_images_in_data(
    data: Any,
    *,
    profile_type: Optional[str],
    sub_type: Optional[str],
    request: Optional[Request] = None,
    path: str = 'data',
    image_field_cache: Optional[Dict[Tuple[str, str], Set[str]]] = None,
    allowed_scopes: Optional[Set[str]] = None,
    owner_user_id: Optional[str] = None
) -> Any:
    explicit_image_fields = await get_profile_image_field_names(profile_type, sub_type, cache=image_field_cache)
    return enforce_uploaded_images_in_data(
        data,
        path,
        explicit_image_fields=explicit_image_fields,
        request=request,
        strict=True,
        allowed_scopes=allowed_scopes,
        owner_user_id=owner_user_id,
    )

async def sanitize_profile_document(
    profile: Dict[str, Any],
    *,
    request: Optional[Request] = None,
    image_field_cache: Optional[Dict[Tuple[str, str], Set[str]]] = None,
    include_public_runtime: bool = False,
) -> Dict[str, Any]:
    normalized = dict(profile)
    normalized_data = normalized.get('data')
    if isinstance(normalized_data, (dict, list)):
        explicit_image_fields = await get_profile_image_field_names(
            normalized.get('profile_type'),
            normalized.get('sub_type'),
            cache=image_field_cache,
        )
        normalized['data'] = enforce_uploaded_images_in_data(
            normalized_data,
            'data',
            explicit_image_fields=explicit_image_fields,
            request=request,
            strict=False,
        )
        normalized['resolved_data'] = resolve_uploaded_images_in_data_for_output(
            normalized['data'],
            'resolved_data',
            explicit_image_fields=explicit_image_fields,
            request=request,
        )
    else:
        normalized['resolved_data'] = normalized_data

    normalized['uploads_base_url'] = f"{get_upload_base_url(request)}/uploads"
    normalized_public_settings = normalize_profile_public_settings(
        normalized.get('public_settings'),
        profile_type=normalized.get('profile_type'),
        legacy_settings=normalized.get('notification_config'),
        strict=False,
    )
    resolved_floating_buttons: Optional[List[Dict[str, str]]] = None
    if include_public_runtime:
        resolved_floating_buttons = resolve_profile_floating_buttons(
            normalized,
            normalized_public_settings,
            request=request,
        )
    normalized_public_settings = enrich_public_settings_runtime(
        normalized_public_settings,
        resolved_floating_buttons=resolved_floating_buttons,
    )
    normalized['public_settings'] = normalized_public_settings
    normalized['notification_config'] = build_legacy_notification_config(
        normalized.get('notification_config'),
        normalized_public_settings,
    )
    return sanitize_for_json(normalized)

async def validate_profile_upload_ownership(
    profile: Dict[str, Any],
    *,
    owner_user_id: Optional[str],
    request: Optional[Request] = None,
    image_field_cache: Optional[Dict[Tuple[str, str], Set[str]]] = None,
    allowed_scopes: Optional[Set[str]] = None,
) -> None:
    normalized_owner_user_id = normalize_optional_user_id(owner_user_id)
    if not normalized_owner_user_id:
        return

    sanitized_profile = await sanitize_profile_document(
        profile,
        request=request,
        image_field_cache=image_field_cache,
    )
    sanitized_data = sanitized_profile.get('data')
    if not isinstance(sanitized_data, (dict, list)):
        return

    await enforce_profile_uploaded_images_in_data(
        sanitized_data,
        profile_type=profile.get('profile_type'),
        sub_type=profile.get('sub_type'),
        request=request,
        path='data',
        image_field_cache=image_field_cache,
        allowed_scopes=allowed_scopes,
        owner_user_id=normalized_owner_user_id,
    )

async def sanitize_profile_collection(
    profiles: List[Dict[str, Any]],
    *,
    request: Optional[Request] = None
) -> List[Dict[str, Any]]:
    image_field_cache: Dict[Tuple[str, str], Set[str]] = {}
    return [
        await sanitize_profile_document(profile, request=request, image_field_cache=image_field_cache)
        for profile in profiles
    ]

def sanitize_product_image_field(
    product_data: Dict[str, Any],
    *,
    request: Optional[Request] = None,
    strict: bool = True,
    allowed_scopes: Optional[Set[str]] = None
) -> Dict[str, Any]:
    if 'image_url' not in product_data:
        return product_data
    if strict:
        normalized = enforce_uploaded_image_reference(product_data.get('image_url'), 'image_url', request=request)
        product_data['image_url'] = enforce_uploaded_image_reference_policy(
            normalized,
            'image_url',
            allowed_scopes=allowed_scopes,
        )
    else:
        product_data['image_url'] = sanitize_uploaded_image_reference_for_output(product_data.get('image_url'), request=request)
    return product_data

def sanitize_settings_image_fields(
    settings_data: Dict[str, Any],
    *,
    request: Optional[Request] = None,
    strict: bool = True,
    allowed_scope_by_field: Optional[Dict[str, Set[str]]] = None
) -> Dict[str, Any]:
    for key in IMAGE_SETTING_KEYS:
        if key in settings_data:
            if strict:
                normalized = enforce_uploaded_image_reference(settings_data.get(key), key, request=request)
                settings_data[key] = enforce_uploaded_image_reference_policy(
                    normalized,
                    key,
                    allowed_scopes=allowed_scope_by_field.get(key) if allowed_scope_by_field else None,
                )
            else:
                settings_data[key] = sanitize_uploaded_image_reference_for_output(settings_data.get(key), request=request)
    return settings_data

def save_uploaded_image(
    *,
    content: bytes,
    file_name: str,
    content_type: str,
    user_id: str,
    scope: str,
    request: Request
) -> str:
    if len(content) > 8 * 1024 * 1024:
        raise HTTPException(status_code=400, detail="La imagen supera el máximo de 8MB")

    allowed_exts = UPLOAD_ALLOWED_FILE_EXTENSIONS
    ext_from_name = Path(file_name or '').suffix.lower()
    ext = ext_from_name if ext_from_name in allowed_exts else None
    if not ext:
        content_type_map = {
            'image/jpeg': '.jpg',
            'image/png': '.png',
            'image/webp': '.webp',
            'image/gif': '.gif',
        }
        ext = content_type_map.get(content_type)
    if not ext:
        raise HTTPException(status_code=400, detail="Formato de imagen no permitido")

    safe_scope = normalize_upload_scope(scope)
    user_dir = UPLOADS_DIR / safe_scope / str(user_id)
    user_dir.mkdir(parents=True, exist_ok=True)

    stored_name = f"{datetime.now(timezone.utc).strftime('%Y%m%d%H%M%S')}_{uuid.uuid4().hex[:8]}{ext}"
    file_path = user_dir / stored_name
    with open(file_path, 'wb') as buffer:
        buffer.write(content)

    relative_path = file_path.relative_to(UPLOADS_DIR).as_posix()
    return f"{get_upload_base_url(request)}/uploads/{relative_path}"

def infer_default_product_visible_to(product_like: Optional[Dict[str, Any]] = None, category: Optional[Any] = None) -> str:
    category_value = str(category if category is not None else (product_like or {}).get('category') or '').strip().lower()
    if category_value == 'business':
        return 'business'
    if category_value == 'personal':
        return 'person'
    return 'visitor'

def normalize_product_visible_to(
    value: Any,
    *,
    category: Optional[Any] = None,
    product_like: Optional[Dict[str, Any]] = None,
    strict: bool = False,
) -> str:
    default_value = infer_default_product_visible_to(product_like=product_like, category=category)
    if value is None:
        return default_value

    if isinstance(value, (list, tuple, set)):
        if strict:
            raise HTTPException(status_code=400, detail='visible_to debe enviarse como string: visitor, person o business')
        for item in value:
            normalized_item = normalize_product_visible_to(
                item,
                category=category,
                product_like=product_like,
                strict=False,
            )
            if normalized_item in PRODUCT_VISIBLE_TO_VALUES:
                return normalized_item
        return default_value

    normalized = PRODUCT_VISIBLE_TO_ALIASES.get(str(value).strip().lower())
    if normalized:
        return normalized

    if strict:
        raise HTTPException(status_code=400, detail='visible_to inválido. Permitidos: visitor, person, business')
    return default_value

def resolve_viewer_product_audience(viewer_user: Optional[Dict[str, Any]]) -> Optional[str]:
    if not viewer_user:
        return None
    normalized = PRODUCT_VISIBLE_TO_ALIASES.get(str(viewer_user.get('user_type') or '').strip().lower())
    if normalized in {'person', 'business'}:
        return normalized
    return None

def is_product_visible_for_viewer(product: Dict[str, Any], viewer_user: Optional[Dict[str, Any]]) -> bool:
    viewer_audience = resolve_viewer_product_audience(viewer_user)
    product_visible_to = normalize_product_visible_to(
        product.get('visible_to'),
        category=product.get('category'),
        product_like=product,
        strict=False,
    )
    if viewer_audience is None:
        return product_visible_to == 'visitor'
    return product_visible_to in {'visitor', viewer_audience}

def sanitize_product_input_document(
    product_data: Dict[str, Any],
    *,
    request: Optional[Request] = None,
    existing_product: Optional[Dict[str, Any]] = None,
) -> Dict[str, Any]:
    sanitized = sanitize_product_image_field(
        dict(product_data),
        request=request,
        allowed_scopes=PRODUCT_IMAGE_INPUT_SCOPES,
    )
    effective_category = sanitized.get('category', (existing_product or {}).get('category'))
    visible_to_source = sanitized.get('visible_to') if 'visible_to' in sanitized else (existing_product or {}).get('visible_to')
    sanitized['visible_to'] = normalize_product_visible_to(
        visible_to_source,
        category=effective_category,
        product_like=existing_product or sanitized,
        strict='visible_to' in sanitized,
    )
    return sanitized

def normalize_coupon_code(code: Optional[str]) -> Optional[str]:
    if not code:
        return None
    normalized = re.sub(r"\s+", "", code.strip().upper())
    return normalized if normalized else None

async def get_coupon_document(code: Optional[str]) -> Optional[Dict[str, Any]]:
    normalized = normalize_coupon_code(code)
    if not normalized:
        return None
    return await db.coupons.find_one({'code': normalized, 'active': True}, {'_id': 0})

async def ensure_free_coupon_exists() -> Dict[str, Any]:
    now = datetime.now(timezone.utc).isoformat()
    coupon_doc = {
        'code': 'FREE',
        'description': 'Cupón de pruebas: producto y envío gratis',
        'discount_type': 'percentage',
        'discount_value': 100.0,
        'free_shipping': True,
        'active': True,
        'max_uses': None,
        'applies_to': 'all',
        'usage_count': 0,
        'created_at': now,
        'updated_at': now,
    }
    await db.coupons.update_one(
        {'code': 'FREE'},
        {'$setOnInsert': coupon_doc},
        upsert=True
    )
    coupon = await db.coupons.find_one({'code': 'FREE'}, {'_id': 0})
    return sanitize_for_json(coupon) if coupon else {}

async def calculate_order_pricing(
    order_data: OrderBase,
    settings: Dict[str, Any],
    viewer_user: Optional[Dict[str, Any]] = None,
) -> Dict[str, Any]:
    validated_items = []
    subtotal = 0.0

    for item in order_data.items:
        product = await db.products.find_one({'id': item.product_id, 'active': {'$ne': False}}, {'_id': 0})
        if not product:
            raise HTTPException(status_code=404, detail=f"Producto no encontrado: {item.product_id}")
        if not is_product_visible_for_viewer(product, viewer_user):
            raise HTTPException(status_code=403, detail=f"Producto no disponible para tu tipo de cuenta: {item.product_id}")
        if product.get('stock', 0) < item.quantity:
            raise HTTPException(status_code=400, detail=f"Stock insuficiente para {product.get('name', 'producto')}")

        unit_price = float(product.get('price', 0))
        subtotal += unit_price * item.quantity
        validated_items.append({
            'product_id': product['id'],
            'product_name': product['name'],
            'quantity': item.quantity,
            'unit_price': unit_price,
            'item_type': product.get('item_type', 'product'),
            'subscription_period': product.get('subscription_period'),
            'qr_quota_granted': parse_non_negative_int(product.get('qr_quota_granted', 0), 0),
            'auto_generate_qr': product.get('auto_generate_qr', False),
            'auto_qr_profile_type': product.get('auto_qr_profile_type'),
            'auto_qr_sub_type': product.get('auto_qr_sub_type'),
        })

    shipping_resolution = resolve_order_shipping(order_data, settings)
    shipping_cost = float(shipping_resolution.get('shipping_cost', 0))
    if subtotal <= 0:
        shipping_cost = 0.0
    discount_amount = 0.0
    applied_coupon = None
    coupon_code = normalize_coupon_code(order_data.coupon_code)

    if coupon_code:
        if not settings.get('enable_coupons', False):
            raise HTTPException(status_code=400, detail="Los cupones están deshabilitados")

        coupon = await get_coupon_document(coupon_code)
        if not coupon:
            raise HTTPException(status_code=404, detail="Cupón no válido")

        usage_count = int(coupon.get('usage_count', 0))
        max_uses = coupon.get('max_uses')
        if max_uses is not None and usage_count >= int(max_uses):
            raise HTTPException(status_code=400, detail="Cupón agotado")

        applies_to = coupon.get('applies_to', 'all')
        if applies_to != 'all':
            has_valid_item = any(item.get('item_type') == applies_to for item in validated_items)
            if not has_valid_item:
                raise HTTPException(status_code=400, detail="Cupón no aplica a este tipo de compra")

        if coupon.get('discount_type') == 'percentage':
            discount_amount = subtotal * (float(coupon.get('discount_value', 0)) / 100.0)
        else:
            discount_amount = float(coupon.get('discount_value', 0))

        if coupon.get('free_shipping'):
            shipping_cost = 0.0

        applied_coupon = coupon

    discount_amount = max(0.0, min(discount_amount, subtotal))
    final_total = max(0.0, subtotal + shipping_cost - discount_amount)

    return {
        'validated_items': validated_items,
        'subtotal': subtotal,
        'shipping_cost': shipping_cost,
        'shipping_region': shipping_resolution.get('shipping_region'),
        'shipping_commune': shipping_resolution.get('shipping_commune'),
        'shipping_source': shipping_resolution.get('shipping_source'),
        'discount_amount': discount_amount,
        'final_total': final_total,
        'applied_coupon': applied_coupon,
        'coupon_code': coupon_code,
    }

async def generate_auto_qr_profile_for_purchase(user: Dict[str, Any], item: Dict[str, Any], order_id: str, iteration: int = 1) -> Optional[str]:
    if not item.get('auto_generate_qr'):
        return None

    profile_type = item.get('auto_qr_profile_type') or ('business' if user.get('user_type') == 'business' else 'personal')
    if profile_type == 'business' and user.get('user_type') != 'business':
        return None

    sub_type = item.get('auto_qr_sub_type') or ('tarjeta' if profile_type == 'business' else 'mascota')
    profile_name = f"{item.get('product_name', 'QR')} #{order_id[:6]}-{iteration}"
    now = datetime.now(timezone.utc)
    profile_id = str(uuid.uuid4())
    qr_hash = generate_qr_hash(user['id'], profile_name)

    profile_doc = {
        'id': profile_id,
        'user_id': user['id'],
        'hash': qr_hash,
        'name': profile_name,
        'alias': profile_name,
        'profile_type': profile_type,
        'sub_type': sub_type,
        'status': 'indefinite',
        'data': {
            'purchase_order_id': order_id,
            'generated_from_product': item.get('product_name'),
            'generated_at': now.isoformat(),
        },
        'notification_config': {},
        'public_settings': normalize_profile_public_settings({}, profile_type=profile_type, strict=False),
        'public_settings_customized': False,
        'expiration_date': None,
        'scan_count': 0,
        'created_at': now.isoformat(),
        'updated_at': now.isoformat(),
        'deleted_at': None
    }

    await db.qr_profiles.insert_one(profile_doc)
    return profile_id

async def process_paid_order(order_doc: Dict[str, Any], user: Dict[str, Any]) -> Dict[str, Any]:
    generated_profile_ids: List[str] = []
    total_quota_granted = 0
    subscription_buckets_to_add: List[Dict[str, Any]] = []
    paid_at = datetime.now(timezone.utc)
    renewal_bucket_id = str(order_doc.get('renewal_bucket_id') or '').strip()
    renewed_bucket_id: Optional[str] = None

    for item in order_doc.get('items', []):
        quantity = max(1, int(item.get('quantity', 1)))
        await db.products.update_one(
            {'id': item.get('product_id')},
            {
                '$inc': {'stock': -quantity},
                '$set': {'updated_at': datetime.now(timezone.utc).isoformat()}
            }
        )
        for idx in range(quantity):
            profile_id = await generate_auto_qr_profile_for_purchase(user, item, order_doc['id'], idx + 1)
            if profile_id:
                generated_profile_ids.append(profile_id)

        if item.get('item_type') == 'subscription_service':
            if not is_master_account(user):
                logger.warning(
                    "Se bloqueó acreditación de cupos de suscripción porque la cuenta no es master (user_id=%s, order_id=%s)",
                    user.get('id'),
                    order_doc.get('id')
                )
                continue

            bucket = build_subscription_quota_bucket(item, quantity, order_doc['id'], paid_at)
            if bucket:
                subscription_buckets_to_add.append(bucket)
                total_quota_granted += parse_non_negative_int(bucket.get('granted_quota', 0), 0)

    if subscription_buckets_to_add:
        scope_context = await get_qr_scope_context(user)
        quota_owner_user_id = scope_context['root_user_id']
        quota_owner_doc = await db.users.find_one(
            {'id': quota_owner_user_id},
            {'_id': 0, 'qr_subscription_buckets': 1, 'qr_quota_lifetime': 1}
        )
        existing_buckets = normalize_subscription_quota_buckets((quota_owner_doc or {}).get('qr_subscription_buckets'))
        combined_buckets = existing_buckets + subscription_buckets_to_add

        if renewal_bucket_id:
            renewed = False
            renewed_buckets: List[Dict[str, Any]] = []
            for current_bucket in existing_buckets:
                if str(current_bucket.get('id')) != renewal_bucket_id:
                    renewed_buckets.append(current_bucket)
                    continue

                merged_bucket = dict(current_bucket)
                for renewal_bucket in subscription_buckets_to_add:
                    merged_bucket = renew_subscription_bucket(
                        merged_bucket,
                        renewal_bucket,
                        paid_at,
                        order_doc.get('id', '')
                    )
                renewed_buckets.append(merged_bucket)
                renewed = True
                renewed_bucket_id = str(merged_bucket.get('id'))

            if renewed:
                combined_buckets = renewed_buckets
            else:
                logger.warning(
                    "No se encontró bucket a renovar, se acreditará como nueva suscripción (order_id=%s, bucket_id=%s)",
                    order_doc.get('id'),
                    renewal_bucket_id
                )

        combined_buckets = normalize_subscription_quota_buckets(combined_buckets)
        active_quota_balance = sum_active_subscription_quota(combined_buckets, paid_at)
        current_lifetime = parse_non_negative_int((quota_owner_doc or {}).get('qr_quota_lifetime', 0), 0)

        await db.users.update_one(
            {'id': quota_owner_user_id},
            {'$set': {
                'qr_subscription_buckets': combined_buckets,
                'qr_quota_balance': active_quota_balance,
                'qr_quota_lifetime': current_lifetime + total_quota_granted,
                'updated_at': paid_at.isoformat(),
            }}
        )
        await refresh_user_subscription_quota_state(quota_owner_user_id, paid_at)

    return {
        'generated_profile_ids': generated_profile_ids,
        'qr_quota_granted': total_quota_granted,
        'renewed_bucket_id': renewed_bucket_id,
    }

async def apply_coupon_usage(order_doc: Dict[str, Any]) -> bool:
    coupon_code = normalize_coupon_code(order_doc.get('coupon_code'))
    if not coupon_code or order_doc.get('coupon_usage_applied'):
        return False

    result = await db.coupons.update_one(
        {'code': coupon_code},
        {
            '$inc': {'usage_count': 1},
            '$set': {'updated_at': datetime.now(timezone.utc).isoformat()}
        }
    )
    return result.modified_count > 0

def normalize_product_document(product: Dict[str, Any], request: Optional[Request] = None) -> Dict[str, Any]:
    normalized = dict(product)
    normalized.setdefault('item_type', 'product')
    normalized.setdefault('subscription_period', None)
    normalized.setdefault('qr_quota_granted', 0)
    normalized.setdefault('active', True)
    normalized.setdefault('auto_generate_qr', False)
    normalized.setdefault('auto_qr_profile_type', None)
    normalized.setdefault('auto_qr_sub_type', None)
    normalized.setdefault('stock', 0)
    normalized['visible_to'] = normalize_product_visible_to(
        normalized.get('visible_to'),
        category=normalized.get('category'),
        product_like=normalized,
        strict=False,
    )
    normalized = sanitize_product_image_field(normalized, request=request, strict=False)
    normalized['uploads_base_url'] = f"{get_upload_base_url(request)}/uploads"
    normalized['image_url_resolved'] = resolve_uploaded_image_reference_for_output(
        normalized.get('image_url'),
        request=request,
    )
    return sanitize_for_json(normalized)

def sanitize_for_json(value: Any) -> Any:
    if isinstance(value, ObjectId):
        return str(value)
    if isinstance(value, dict):
        return {k: sanitize_for_json(v) for k, v in value.items() if k != '_id'}
    if isinstance(value, list):
        return [sanitize_for_json(item) for item in value]
    return value

# ==================== ROUTES ====================

# Health check
@api_router.get("/")
async def root():
    return {"message": "QR Profiles Platform API"}

# ==================== AUTH ====================

@api_router.post("/auth/register")
async def register(user_data: UserRegister):
    # Check if user exists
    existing = await db.users.find_one({'email': user_data.email})
    if existing:
        raise HTTPException(status_code=400, detail="Email already registered")
    
    user_id = str(uuid.uuid4())
    hashed_pw = hash_password(user_data.password)
    
    account_role = 'master' if user_data.user_type == 'business' else 'standard'
    user_doc = {
        'id': user_id,
        'email': user_data.email,
        'password': hashed_pw,
        'name': user_data.name,
        'user_type': user_data.user_type,
        'phone': user_data.phone,
        'address': user_data.address,
        'business_name': user_data.business_name,
        'is_admin': False,
        'account_status': 'active',
        'account_role': account_role,
        'parent_account_id': None,
        'permissions': get_default_permissions_for_role(account_role),
        'qr_quota_balance': 0,
        'qr_quota_lifetime': 0,
        'qr_subscription_buckets': [],
        'created_at': datetime.now(timezone.utc).isoformat()
    }
    
    await db.users.insert_one(user_doc.copy())
    
    token = create_token(user_id, user_data.email)
    
    # Return clean user data without password
    user_response = normalize_user_document({
        'id': user_id,
        'email': user_data.email,
        'name': user_data.name,
        'user_type': user_data.user_type,
        'phone': user_data.phone,
        'address': user_data.address,
        'business_name': user_data.business_name,
        'is_admin': False,
        'created_at': user_doc['created_at'],
        'account_status': 'active',
        'account_role': account_role,
        'parent_account_id': None,
        'permissions': get_default_permissions_for_role(account_role),
    })
    
    return {
        'user': user_response,
        'token': token
    }

@api_router.post("/auth/login")
async def login(credentials: UserLogin):
    user = await db.users.find_one({'email': credentials.email}, {'_id': 0})
    if not user or not verify_password(credentials.password, user['password']):
        raise HTTPException(status_code=401, detail="Invalid credentials")

    user = normalize_user_document(user)
    if user.get('account_status') == 'deleted':
        raise HTTPException(status_code=401, detail="Cuenta eliminada")
    if user.get('account_status') == 'paused':
        raise HTTPException(status_code=403, detail="Cuenta pausada")

    token = create_token(user['id'], user['email'])
    user.pop('password')
    
    return {
        'user': user,
        'token': token
    }

@api_router.post("/auth/forgot-password")
async def forgot_password(payload: ForgotPasswordRequest):
    normalized_email = str(payload.email).strip().lower()
    generic_response = {
        'status': 'ok',
        'message': 'Si el correo existe, te enviamos un código para restablecer tu contraseña.',
    }

    user = await db.users.find_one({'email': normalized_email}, {'_id': 0, 'id': 1, 'email': 1, 'account_status': 1})
    if not user or user.get('account_status') == 'deleted':
        return generic_response

    now = datetime.now(timezone.utc)
    reset_code = generate_password_reset_code()
    reset_payload = {
        'code_hash': hash_password_reset_code(normalized_email, reset_code),
        'expires_at': (now + timedelta(minutes=PASSWORD_RESET_CODE_TTL_MINUTES)).isoformat(),
        'requested_at': now.isoformat(),
        'attempts': 0,
        'consumed_at': None,
    }

    await db.users.update_one(
        {'id': user['id']},
        {'$set': {
            'password_reset': reset_payload,
            'updated_at': now.isoformat(),
        }}
    )

    email_sent = False
    try:
        send_email_notification(
            [normalized_email],
            'Código de recuperación - QR Profiles',
            (
                "Recibimos una solicitud para restablecer tu contraseña.\n\n"
                f"Código de recuperación: {reset_code}\n"
                f"Vence en {PASSWORD_RESET_CODE_TTL_MINUTES} minutos.\n\n"
                "Si no solicitaste este cambio, puedes ignorar este mensaje."
            )
        )
        email_sent = bool(os.getenv('SMTP_HOST', '').strip())
    except Exception as exc:
        logger.error(f"Error enviando correo de recuperación de contraseña: {str(exc)}")

    response_payload = dict(generic_response)
    if not email_sent and allow_dev_password_reset_code():
        response_payload['dev_reset_code'] = reset_code
        response_payload['dev_notice'] = 'SMTP no configurado: se devuelve código de recuperación en modo desarrollo.'
    return response_payload

@api_router.post("/auth/reset-password")
async def reset_password(payload: ResetPasswordRequest):
    normalized_email = str(payload.email).strip().lower()
    normalized_code = str(payload.code or '').strip()
    invalid_code_message = 'Código de recuperación inválido o vencido'

    if not normalized_code:
        raise HTTPException(status_code=400, detail=invalid_code_message)

    user = await db.users.find_one({'email': normalized_email}, {'_id': 0})
    if not user:
        raise HTTPException(status_code=400, detail=invalid_code_message)

    reset_state = user.get('password_reset')
    if not isinstance(reset_state, dict):
        raise HTTPException(status_code=400, detail=invalid_code_message)

    attempts = parse_non_negative_int(reset_state.get('attempts', 0), 0)
    if attempts >= PASSWORD_RESET_MAX_ATTEMPTS:
        raise HTTPException(status_code=400, detail='Se superó el número máximo de intentos. Solicita un nuevo código.')

    expires_at = parse_iso_datetime_utc(reset_state.get('expires_at'))
    if not expires_at or expires_at <= datetime.now(timezone.utc):
        raise HTTPException(status_code=400, detail=invalid_code_message)

    stored_hash = str(reset_state.get('code_hash') or '')
    submitted_hash = hash_password_reset_code(normalized_email, normalized_code)
    if not stored_hash or not secrets.compare_digest(stored_hash, submitted_hash):
        next_attempts = attempts + 1
        update_payload: Dict[str, Any] = {
            'password_reset.attempts': next_attempts,
            'password_reset.last_attempt_at': datetime.now(timezone.utc).isoformat(),
        }
        if next_attempts >= PASSWORD_RESET_MAX_ATTEMPTS:
            update_payload['password_reset.locked_at'] = datetime.now(timezone.utc).isoformat()
        await db.users.update_one({'id': user['id']}, {'$set': update_payload})
        raise HTTPException(status_code=400, detail=invalid_code_message)

    await db.users.update_one(
        {'id': user['id']},
        {
            '$set': {
                'password': hash_password(payload.new_password),
                'updated_at': datetime.now(timezone.utc).isoformat(),
            },
            '$unset': {
                'password_reset': '',
            }
        }
    )

    return {'status': 'success', 'message': 'Contraseña actualizada correctamente'}

@api_router.get("/auth/me")
async def get_me(request: Request):
    user = await get_current_user(request)
    user.pop('password', None)
    return user

@api_router.put("/account/profile")
async def update_my_profile(profile_data: Dict[str, Any], request: Request):
    user = await get_current_user(request)
    allowed_fields = {'name', 'phone', 'address', 'business_name'}
    update_data = {k: v for k, v in profile_data.items() if k in allowed_fields}

    if user.get('user_type') != 'business' and 'business_name' in update_data:
        del update_data['business_name']

    if not update_data:
        raise HTTPException(status_code=400, detail="No hay campos válidos para actualizar")

    update_data['updated_at'] = datetime.now(timezone.utc).isoformat()
    await db.users.update_one({'id': user['id']}, {'$set': update_data})

    updated = await db.users.find_one({'id': user['id']}, {'_id': 0, 'password': 0})
    if not updated:
        raise HTTPException(status_code=404, detail="Usuario no encontrado")
    return normalize_user_document(updated)

@api_router.put("/account/password")
async def update_my_password(payload: Dict[str, Any], request: Request):
    user = await get_current_user(request)
    new_password = str(payload.get('new_password', '')).strip()
    if len(new_password) < 6:
        raise HTTPException(status_code=400, detail="La contraseña debe tener al menos 6 caracteres")

    await db.users.update_one(
        {'id': user['id']},
        {'$set': {
            'password': hash_password(new_password),
            'updated_at': datetime.now(timezone.utc).isoformat()
        }}
    )
    return {'status': 'success'}

@api_router.get("/subaccounts")
async def list_my_subaccounts(request: Request):
    user = await get_current_user(request)
    if not is_master_account(user):
        raise HTTPException(status_code=403, detail="Solo cuentas master pueden gestionar subcuentas")

    subaccounts = await db.users.find(
        {
            'parent_account_id': user['id'],
            'account_role': 'subaccount',
            'account_status': {'$ne': 'deleted'}
        },
        {'_id': 0, 'password': 0}
    ).sort('created_at', -1).to_list(500)
    return [normalize_user_document(sub) for sub in subaccounts]

@api_router.post("/subaccounts")
async def create_subaccount(payload: SubaccountCreate, request: Request):
    user = await get_current_user(request)
    if not is_master_account(user):
        raise HTTPException(status_code=403, detail="Solo cuentas master pueden crear subcuentas")

    existing = await db.users.find_one({'email': payload.email}, {'_id': 0, 'id': 1})
    if existing:
        raise HTTPException(status_code=400, detail="Email already registered")

    now = datetime.now(timezone.utc).isoformat()
    sub_id = str(uuid.uuid4())
    branch_label = payload.branch_name or payload.name
    sub_doc = {
        'id': sub_id,
        'email': payload.email,
        'password': hash_password(payload.password),
        'name': payload.name,
        'user_type': 'business',
        'phone': payload.phone,
        'address': payload.address,
        'business_name': branch_label,
        'branch_name': branch_label,
        'is_admin': False,
        'account_status': 'active',
        'account_role': 'subaccount',
        'parent_account_id': user['id'],
        'permissions': payload.permissions or get_default_permissions_for_role('subaccount'),
        'qr_quota_balance': 0,
        'qr_quota_lifetime': 0,
        'qr_subscription_buckets': [],
        'created_at': now,
        'updated_at': now,
    }
    await db.users.insert_one(sub_doc)

    response = dict(sub_doc)
    response.pop('password', None)
    return sanitize_for_json(normalize_user_document(response))

@api_router.put("/subaccounts/{subaccount_id}")
async def update_subaccount(subaccount_id: str, payload: SubaccountUpdate, request: Request):
    user = await get_current_user(request)
    if not is_master_account(user):
        raise HTTPException(status_code=403, detail="Solo cuentas master pueden editar subcuentas")

    existing = await db.users.find_one(
        {'id': subaccount_id, 'parent_account_id': user['id'], 'account_role': 'subaccount'},
        {'_id': 0}
    )
    if not existing:
        raise HTTPException(status_code=404, detail="Subcuenta no encontrada")

    update_data = payload.model_dump(exclude_unset=True)
    if 'password' in update_data and update_data['password']:
        update_data['password'] = hash_password(update_data['password'])
    elif 'password' in update_data:
        del update_data['password']

    if update_data.get('branch_name') and not update_data.get('business_name'):
        update_data['business_name'] = update_data['branch_name']

    update_data['updated_at'] = datetime.now(timezone.utc).isoformat()
    await db.users.update_one({'id': subaccount_id}, {'$set': update_data})

    updated = await db.users.find_one({'id': subaccount_id}, {'_id': 0, 'password': 0})
    if not updated:
        raise HTTPException(status_code=404, detail="Subcuenta no encontrada")
    return normalize_user_document(updated)

@api_router.patch("/subaccounts/{subaccount_id}/status")
async def update_subaccount_status(subaccount_id: str, payload: AccountStatusUpdate, request: Request):
    user = await get_current_user(request)
    if not is_master_account(user):
        raise HTTPException(status_code=403, detail="Solo cuentas master pueden pausar/activar subcuentas")

    if payload.account_status == 'deleted':
        raise HTTPException(status_code=400, detail="Para eliminar una subcuenta usa el endpoint de borrado")

    result = await db.users.update_one(
        {'id': subaccount_id, 'parent_account_id': user['id'], 'account_role': 'subaccount'},
        {'$set': {'account_status': payload.account_status, 'updated_at': datetime.now(timezone.utc).isoformat()}}
    )
    if result.matched_count == 0:
        raise HTTPException(status_code=404, detail="Subcuenta no encontrada")
    return {'status': 'success'}

@api_router.delete("/subaccounts/{subaccount_id}")
async def delete_subaccount(subaccount_id: str, request: Request):
    user = await get_current_user(request)
    if not is_master_account(user):
        raise HTTPException(status_code=403, detail="Solo cuentas master pueden eliminar subcuentas")

    now = datetime.now(timezone.utc).isoformat()
    result = await db.users.update_one(
        {'id': subaccount_id, 'parent_account_id': user['id'], 'account_role': 'subaccount'},
        {'$set': {'account_status': 'deleted', 'deleted_at': now, 'updated_at': now}}
    )
    if result.matched_count == 0:
        raise HTTPException(status_code=404, detail="Subcuenta no encontrada")
    return {'status': 'deleted'}

# ==================== PRODUCTS ====================

@api_router.get("/products")
async def get_products(request: Request, category: Optional[str] = None, item_type: Optional[str] = None):
    query: Dict[str, Any] = {'active': {'$ne': False}}
    if category:
        query['category'] = category
    if item_type:
        query['item_type'] = item_type
    viewer_user = await get_current_user_optional(request)
    products = await db.products.find(query, {'_id': 0}).to_list(100)
    visible_products = [product for product in products if is_product_visible_for_viewer(product, viewer_user)]
    return [normalize_product_document(product, request=request) for product in visible_products]

@api_router.get("/products/{product_id}")
async def get_product(product_id: str, request: Request):
    viewer_user = await get_current_user_optional(request)
    product = await db.products.find_one({'id': product_id, 'active': {'$ne': False}}, {'_id': 0})
    if not product or not is_product_visible_for_viewer(product, viewer_user):
        raise HTTPException(status_code=404, detail="Product not found")
    return normalize_product_document(product, request=request)

# ==================== MERCADOPAGO CHECKOUT ====================

@api_router.get("/shipping/regions")
async def get_shipping_regions():
    settings = await get_platform_settings()
    default_shipping_cost = parse_non_negative_float(settings.get('default_shipping_cost', 0), 0)
    return {
        'default_shipping_cost': default_shipping_cost,
        'regions': get_enabled_shipping_regions(settings),
    }

@api_router.post("/checkout/quote")
async def checkout_quote(order_data: OrderBase, request: Request):
    settings = await get_platform_settings()
    if settings.get('enable_store', True) is False:
        raise HTTPException(status_code=403, detail="La tienda está deshabilitada")

    viewer_user = await get_current_user_optional(request)
    pricing = await calculate_order_pricing(order_data, settings, viewer_user=viewer_user)
    return {
        'subtotal': pricing['subtotal'],
        'shipping_cost': pricing['shipping_cost'],
        'shipping_region': pricing.get('shipping_region'),
        'shipping_commune': pricing.get('shipping_commune'),
        'discount_amount': pricing['discount_amount'],
        'final_total': pricing['final_total'],
        'coupon_code': pricing['coupon_code'],
        'coupon_applied': bool(pricing['applied_coupon']),
    }

@api_router.post("/checkout/create-preference")
async def create_preference(order_data: OrderBase, request: Request):
    user = await get_current_user(request)
    settings = await get_platform_settings()
    if settings.get('enable_store', True) is False:
        raise HTTPException(status_code=403, detail="La tienda está deshabilitada")

    pricing = await calculate_order_pricing(order_data, settings, viewer_user=user)
    includes_subscription_items = any(
        item.get('item_type') == 'subscription_service'
        for item in pricing.get('validated_items', [])
    )
    enforce_master_only_subscription_purchase = bool(settings.get('enforce_master_only_subscription_purchase', True))
    if (
        includes_subscription_items
        and enforce_master_only_subscription_purchase
        and not (user.get('is_admin') or is_master_account(user))
    ):
        raise HTTPException(
            status_code=403,
            detail="Solo cuentas empresa master pueden comprar suscripciones de QR"
        )

    renewal_bucket_id = await validate_checkout_renewal_bucket(
        order_data,
        user,
        pricing.get('validated_items', [])
    )

    order_id = str(uuid.uuid4())
    now = datetime.now(timezone.utc).isoformat()
    order_doc = {
        'id': order_id,
        'user_id': user['id'],
        'items': pricing['validated_items'],
        'total': pricing['final_total'],
        'subtotal': pricing['subtotal'],
        'shipping_cost': pricing['shipping_cost'],
        'shipping_region': pricing.get('shipping_region'),
        'shipping_commune': pricing.get('shipping_commune'),
        'discount_amount': pricing['discount_amount'],
        'final_total': pricing['final_total'],
        'coupon_code': pricing['coupon_code'],
        'renewal_bucket_id': renewal_bucket_id,
        'coupon_usage_applied': False,
        'generated_qr_profiles': [],
        'status': 'pending',
        'created_at': now
    }

    await db.orders.insert_one(order_doc)

    # Pago total gratis (por ejemplo cupón FREE)
    if pricing['final_total'] <= 0:
        paid_result = await process_paid_order(order_doc, user)
        generated_profile_ids = paid_result.get('generated_profile_ids', [])
        qr_quota_granted = parse_non_negative_int(paid_result.get('qr_quota_granted', 0), 0)
        coupon_usage_applied = await apply_coupon_usage(order_doc)
        await db.orders.update_one(
            {'id': order_id},
            {'$set': {
                'status': 'paid',
                'generated_qr_profiles': generated_profile_ids,
                'qr_quota_granted': qr_quota_granted,
                'coupon_usage_applied': coupon_usage_applied,
                'updated_at': datetime.now(timezone.utc).isoformat()
            }}
        )
        return {
            'order_id': order_id,
            'status': 'paid',
            'message': 'Compra validada sin cobro',
            'generated_qr_profiles': generated_profile_ids,
            'qr_quota_granted': qr_quota_granted,
            'subtotal': pricing['subtotal'],
            'shipping_cost': pricing['shipping_cost'],
            'shipping_region': pricing.get('shipping_region'),
            'shipping_commune': pricing.get('shipping_commune'),
            'discount_amount': pricing['discount_amount'],
            'total': pricing['final_total'],
        }

    # Si hay token de MercadoPago, crear preferencia
    if MERCADOPAGO_ACCESS_TOKEN and settings.get('enable_payments', True):
        try:
            import mercadopago
            sdk = mercadopago.SDK(MERCADOPAGO_ACCESS_TOKEN)

            items = [{
                'title': item['product_name'],
                'quantity': item['quantity'],
                'unit_price': item['unit_price'],
                'currency_id': settings.get('currency', 'CLP')
            } for item in pricing['validated_items']]

            if pricing['shipping_cost'] > 0:
                items.append({
                    'title': 'Costo de envío',
                    'quantity': 1,
                    'unit_price': pricing['shipping_cost'],
                    'currency_id': settings.get('currency', 'CLP')
                })

            if pricing['discount_amount'] > 0:
                items = [{
                    'title': f"Orden QR #{order_id[:8]}",
                    'quantity': 1,
                    'unit_price': pricing['final_total'],
                    'currency_id': settings.get('currency', 'CLP')
                }]

            preference_data = {
                'items': items,
                'payer': {'email': user['email']},
                'external_reference': order_id,
                'back_urls': {
                    'success': f"{FRONTEND_URL}/payment-success",
                    'failure': f"{FRONTEND_URL}/payment-failure",
                    'pending': f"{FRONTEND_URL}/payment-pending"
                },
                'auto_return': 'approved'
            }
            
            preference_response = sdk.preference().create(preference_data)
            preference = preference_response['response']

            await db.orders.update_one(
                {'id': order_id},
                {'$set': {'mercadopago_preference_id': preference['id']}}
            )

            return {
                'order_id': order_id,
                'preference_id': preference['id'],
                'init_point': preference['init_point'],
                'status': 'success',
                'subtotal': pricing['subtotal'],
                'shipping_cost': pricing['shipping_cost'],
                'shipping_region': pricing.get('shipping_region'),
                'shipping_commune': pricing.get('shipping_commune'),
                'discount_amount': pricing['discount_amount'],
                'total': pricing['final_total'],
            }
        except Exception as e:
            logger.error(f"MercadoPago error: {str(e)}")
            return {
                'order_id': order_id,
                'status': 'pending',
                'message': 'Orden creada, pasarela de pago no disponible',
                'subtotal': pricing['subtotal'],
                'shipping_cost': pricing['shipping_cost'],
                'shipping_region': pricing.get('shipping_region'),
                'shipping_commune': pricing.get('shipping_commune'),
                'discount_amount': pricing['discount_amount'],
                'total': pricing['final_total'],
            }

    return {
        'order_id': order_id,
        'status': 'pending',
        'message': 'Orden creada, pasarela de pago no configurada',
        'subtotal': pricing['subtotal'],
        'shipping_cost': pricing['shipping_cost'],
        'shipping_region': pricing.get('shipping_region'),
        'shipping_commune': pricing.get('shipping_commune'),
        'discount_amount': pricing['discount_amount'],
        'total': pricing['final_total'],
    }

@api_router.post("/webhook/payment")
async def payment_webhook(request: Request):
    try:
        payload = await request.json()
        logger.info(f"Webhook received: {payload}")
        
        topic = payload.get('topic')
        data = payload.get('data', {})
        payment_id = data.get('id')
        
        if topic == 'payment' and payment_id and MERCADOPAGO_ACCESS_TOKEN:
            import mercadopago
            sdk = mercadopago.SDK(MERCADOPAGO_ACCESS_TOKEN)
            payment = sdk.payment().get(payment_id)
            
            if payment['status'] == 200:
                payment_data = payment['response']
                external_ref = payment_data.get('external_reference')
                status = payment_data.get('status')
                existing_order = await db.orders.find_one({'id': external_ref}, {'_id': 0})
                if not existing_order:
                    return JSONResponse(status_code=200, content={'success': True})

                if status == 'approved':
                    updates = {
                        'status': 'paid',
                        'mercadopago_payment_id': str(payment_id),
                        'updated_at': datetime.now(timezone.utc).isoformat(),
                    }
                    if existing_order.get('status') != 'paid':
                        order_user = await db.users.find_one({'id': existing_order['user_id']}, {'_id': 0})
                        generated_profile_ids: List[str] = []
                        qr_quota_granted = 0
                        if order_user:
                            paid_result = await process_paid_order(existing_order, order_user)
                            generated_profile_ids = paid_result.get('generated_profile_ids', [])
                            qr_quota_granted = parse_non_negative_int(paid_result.get('qr_quota_granted', 0), 0)
                            if generated_profile_ids:
                                updates['generated_qr_profiles'] = generated_profile_ids
                            if qr_quota_granted > 0:
                                updates['qr_quota_granted'] = qr_quota_granted
                        if await apply_coupon_usage(existing_order):
                            updates['coupon_usage_applied'] = True

                    await db.orders.update_one({'id': external_ref}, {'$set': updates})
                elif status == 'rejected':
                    await db.orders.update_one(
                        {'id': external_ref},
                        {'$set': {'status': 'failed'}}
                    )
        
        return JSONResponse(status_code=200, content={'success': True})
    except Exception as e:
        logger.error(f"Webhook error: {str(e)}")
        return JSONResponse(status_code=200, content={'error': str(e)})

@api_router.post("/uploads/profile-image")
async def upload_profile_image(request: Request, file: UploadFile = File(...)):
    user = await get_current_user(request)
    if not file.content_type or not file.content_type.startswith('image/'):
        raise HTTPException(status_code=400, detail="El archivo debe ser una imagen")

    content = await file.read()
    public_url = save_uploaded_image(
        content=content,
        file_name=file.filename or '',
        content_type=file.content_type,
        user_id=str(user['id']),
        scope='profiles',
        request=request,
    )
    return {'url': public_url}

@api_router.post("/uploads/image")
async def upload_generic_image(
    request: Request,
    file: UploadFile = File(...),
    scope: str = 'general'
):
    user = await get_current_user(request)
    normalized_scope = normalize_upload_scope(scope)
    if normalized_scope not in UPLOAD_GENERIC_ALLOWED_SCOPES:
        allowed_scopes = ', '.join(sorted(UPLOAD_GENERIC_ALLOWED_SCOPES))
        raise HTTPException(
            status_code=400,
            detail=f'Scope de upload no permitido. Usá uno de: {allowed_scopes}.'
        )
    if not file.content_type or not file.content_type.startswith('image/'):
        raise HTTPException(status_code=400, detail="El archivo debe ser una imagen")
    content = await file.read()
    public_url = save_uploaded_image(
        content=content,
        file_name=file.filename or '',
        content_type=file.content_type,
        user_id=str(user['id']),
        scope=normalized_scope,
        request=request,
    )
    return {'url': public_url}

# ==================== ORDERS ====================

@api_router.get("/orders")
async def get_orders(request: Request):
    user = await get_current_user(request)
    orders = await db.orders.find({'user_id': user['id']}, {'_id': 0}).to_list(100)
    return orders

@api_router.get("/orders/{order_id}")
async def get_order(order_id: str, request: Request):
    user = await get_current_user(request)
    order = await db.orders.find_one({'id': order_id, 'user_id': user['id']}, {'_id': 0})
    if not order:
        raise HTTPException(status_code=404, detail="Order not found")
    return order

# ==================== SUBSCRIPTIONS ====================

@api_router.get("/subscriptions")
async def get_my_subscriptions(request: Request):
    user = await get_current_user(request)
    owner_user_id = await resolve_subscription_owner_id_from_user_doc(user)
    overview = await get_subscription_overview_for_owner(owner_user_id)
    return {
        **overview,
        'is_master_account': is_master_account(user),
        'viewer_user_id': user['id'],
    }

@api_router.delete("/subscriptions/{bucket_id}")
async def delete_my_subscription(bucket_id: str, request: Request):
    user = await get_current_user(request)
    owner_user_id = await resolve_subscription_owner_id_from_user_doc(user)

    if not (is_master_account(user) or owner_user_id == user.get('id')):
        raise HTTPException(status_code=403, detail='Solo la cuenta master puede eliminar suscripciones')

    revoked = await revoke_subscription_bucket_from_owner(owner_user_id, bucket_id)
    if not revoked:
        raise HTTPException(status_code=404, detail='Suscripción no encontrada')

    overview = await get_subscription_overview_for_owner(owner_user_id)
    return {
        **overview,
        'is_master_account': is_master_account(user),
        'viewer_user_id': user['id'],
    }

# ==================== QR PROFILES ====================

@api_router.get("/qr-profiles/creation-policy")
async def get_qr_profiles_creation_policy(request: Request):
    user = await get_current_user(request)
    settings = await get_platform_settings()
    policy = await build_qr_creation_policy(user, settings)
    return {
        'can_create': policy.get('can_create', False),
        'allow_direct_creation': policy.get('allow_direct_creation', False),
        'requires_subscription_purchase': policy.get('requires_subscription_purchase', False),
        'qr_quota_balance': policy.get('qr_quota_balance', 0),
        'max_qr_allowed': policy.get('max_qr_allowed'),
        'current_qr_count': policy.get('current_qr_count', 0),
        'remaining_free_slots': policy.get('remaining_free_slots', 0),
        'message': policy.get('message', ''),
    }

@api_router.post("/qr-profiles", response_model=QRProfile)
async def create_qr_profile(profile_data: QRProfileCreate, request: Request):
    user = await get_current_user(request)
    if not has_user_permission(user, 'manage_qr_profiles'):
        raise HTTPException(status_code=403, detail="No tienes permisos para crear o editar perfiles QR")
    
    # Solo empresas pueden crear QRs de tipo business
    if profile_data.profile_type == 'business' and user['user_type'] != 'business':
        raise HTTPException(status_code=403, detail="Solo empresas pueden crear perfiles empresariales")

    settings = await get_platform_settings()
    creation_policy = await build_qr_creation_policy(user, settings)
    if not creation_policy.get('can_create'):
        raise HTTPException(status_code=403, detail=creation_policy.get('message', 'No puedes crear nuevos códigos QR'))

    quota_consumed = False
    consumed_bucket_id: Optional[str] = None
    quota_owner_user_id = creation_policy.get('quota_owner_user_id')
    if creation_policy.get('consume_quota_on_create'):
        if not quota_owner_user_id:
            raise HTTPException(status_code=500, detail="No fue posible identificar la cuenta propietaria de cupos")
        consumed_bucket_id = await consume_subscription_quota(str(quota_owner_user_id))
        if not consumed_bucket_id:
            raise HTTPException(status_code=403, detail="No tienes cupos QR disponibles. Compra una suscripción para continuar")
        quota_consumed = True

    profile_id = str(uuid.uuid4())
    qr_hash = generate_qr_hash(user['id'], profile_data.name)
    
    now = datetime.now(timezone.utc)
    image_field_cache: Dict[Tuple[str, str], Set[str]] = {}
    profile_payload = await enforce_profile_uploaded_images_in_data(
        dict(profile_data.data or {}),
        profile_type=profile_data.profile_type,
        sub_type=profile_data.sub_type,
        request=request,
        path='data',
        image_field_cache=image_field_cache,
        allowed_scopes=PROFILE_IMAGE_INPUT_SCOPES,
        owner_user_id=str(user['id']),
    )
    profile_status = 'subscription' if quota_consumed else profile_data.status
    if quota_consumed and consumed_bucket_id and quota_owner_user_id:
        profile_payload.setdefault('subscription_bucket_id', consumed_bucket_id)
        profile_payload.setdefault('subscription_owner_user_id', str(quota_owner_user_id))

    normalized_public_settings = normalize_profile_public_settings(
        profile_data.public_settings,
        profile_type=profile_data.profile_type,
        legacy_settings=profile_data.notification_config,
        strict=True,
    )
    public_settings_customized = await resolve_public_settings_customized_flag(
        profile_type=profile_data.profile_type,
        sub_type=profile_data.sub_type,
        public_settings=normalized_public_settings,
        explicit_value=profile_data.public_settings_customized,
    )

    profile_doc = {
        'id': profile_id,
        'user_id': user['id'],
        'hash': qr_hash,
        'name': profile_data.name,
        'alias': profile_data.alias or profile_data.name,
        'profile_type': profile_data.profile_type,
        'sub_type': profile_data.sub_type,
        'status': profile_status,
        'data': profile_payload,
        'notification_config': build_legacy_notification_config(
            profile_data.notification_config,
            normalized_public_settings,
        ),
        'public_settings': normalized_public_settings,
        'public_settings_customized': public_settings_customized,
        'expiration_date': profile_data.expiration_date,
        'subscription_bucket_id': consumed_bucket_id if quota_consumed else None,
        'subscription_owner_user_id': str(quota_owner_user_id) if quota_consumed and quota_owner_user_id else None,
        'subscription_pause_reason': None,
        'scan_count': 0,
        'created_at': now.isoformat(),
        'updated_at': now.isoformat(),
        'deleted_at': None
    }

    try:
        await db.qr_profiles.insert_one(profile_doc)
    except Exception:
        if quota_consumed and quota_owner_user_id and consumed_bucket_id:
            await restore_consumed_subscription_quota(str(quota_owner_user_id), consumed_bucket_id)
        raise
    
    # Convertir timestamps back to datetime for response
    profile_doc['created_at'] = now
    profile_doc['updated_at'] = now
    
    sanitized_profile = await sanitize_profile_document(profile_doc, request=request, image_field_cache=image_field_cache)
    return QRProfile(**sanitized_profile)

@api_router.get("/qr-profiles")
async def get_qr_profiles(request: Request, include_deleted: bool = False):
    user = await get_current_user(request)
    if not has_user_permission(user, 'manage_qr_profiles'):
        raise HTTPException(status_code=403, detail="No tienes permisos para ver perfiles QR")
    accessible_user_ids = await get_managed_user_ids(user)
    query: Dict[str, Any] = {'user_id': {'$in': accessible_user_ids}}
    if not include_deleted:
        query['deleted_at'] = None
    profiles = await db.qr_profiles.find(query, {'_id': 0}).to_list(100)
    return await sanitize_profile_collection(profiles, request=request)

@api_router.get("/qr-profiles/{profile_id}")
async def get_qr_profile(profile_id: str, request: Request):
    user = await get_current_user(request)
    query = await get_profile_access_query(user, profile_id)
    profile = await db.qr_profiles.find_one(query, {'_id': 0})
    if not profile:
        raise HTTPException(status_code=404, detail="Profile not found")
    return await sanitize_profile_document(profile, request=request)

@api_router.put("/qr-profiles/{profile_id}")
async def update_qr_profile(profile_id: str, profile_data: QRProfileUpdate, request: Request):
    user = await get_current_user(request)
    if not has_user_permission(user, 'manage_qr_profiles'):
        raise HTTPException(status_code=403, detail="No tienes permisos para editar perfiles QR")

    access_query = await get_profile_access_query(user, profile_id)
    existing = await db.qr_profiles.find_one(access_query, {'_id': 0})
    if not existing:
        raise HTTPException(status_code=404, detail="Profile not found")
    
    update_data = profile_data.model_dump(exclude_unset=True)
    effective_profile_type = update_data.get('profile_type', existing.get('profile_type'))
    effective_sub_type = update_data.get('sub_type', existing.get('sub_type'))
    if 'data' in update_data:
        update_data['data'] = await enforce_profile_uploaded_images_in_data(
            update_data.get('data') or {},
            profile_type=effective_profile_type,
            sub_type=effective_sub_type,
            request=request,
            path='data',
            allowed_scopes=PROFILE_IMAGE_INPUT_SCOPES,
            owner_user_id=str(existing.get('user_id') or user['id']),
        )
    if 'public_settings' in update_data or 'notification_config' in update_data or 'profile_type' in update_data or 'sub_type' in update_data:
        effective_notification_config = update_data.get('notification_config', existing.get('notification_config'))
        update_data['public_settings'] = normalize_profile_public_settings(
            update_data.get('public_settings', existing.get('public_settings')),
            profile_type=effective_profile_type,
            legacy_settings=effective_notification_config,
            strict='public_settings' in update_data,
        )
        update_data['notification_config'] = build_legacy_notification_config(
            effective_notification_config,
            update_data['public_settings'],
        )
    if (
        'public_settings_customized' in update_data
        or 'public_settings' in update_data
        or 'profile_type' in update_data
        or 'sub_type' in update_data
    ):
        effective_public_settings = update_data.get('public_settings', existing.get('public_settings'))
        update_data['public_settings_customized'] = await resolve_public_settings_customized_flag(
            profile_type=effective_profile_type,
            sub_type=effective_sub_type,
            public_settings=effective_public_settings,
            explicit_value=update_data.get('public_settings_customized') if 'public_settings_customized' in update_data else None,
        )
    update_data['updated_at'] = datetime.now(timezone.utc).isoformat()
    
    await db.qr_profiles.update_one({'id': profile_id}, {'$set': update_data})
    
    updated = await db.qr_profiles.find_one({'id': profile_id}, {'_id': 0})
    return await sanitize_profile_document(updated, request=request)

@api_router.patch("/qr-profiles/{profile_id}/status")
async def update_qr_status(profile_id: str, status_data: Dict[str, str], request: Request):
    user = await get_current_user(request)
    if not has_user_permission(user, 'manage_qr_profiles'):
        raise HTTPException(status_code=403, detail="No tienes permisos para editar perfiles QR")
    
    new_status = status_data.get('status')
    if new_status not in ['subscription', 'indefinite', 'paused']:
        raise HTTPException(status_code=400, detail="Invalid status")
    
    access_query = await get_profile_access_query(user, profile_id)
    result = await db.qr_profiles.update_one(
        access_query,
        {'$set': {'status': new_status, 'updated_at': datetime.now(timezone.utc).isoformat()}}
    )
    
    if result.modified_count == 0:
        raise HTTPException(status_code=404, detail="Profile not found")
    
    return {'status': 'success', 'new_status': new_status}

@api_router.delete("/qr-profiles/{profile_id}")
async def delete_qr_profile(profile_id: str, request: Request):
    user = await get_current_user(request)
    if not has_user_permission(user, 'manage_qr_profiles'):
        raise HTTPException(status_code=403, detail="No tienes permisos para eliminar perfiles QR")

    # Soft delete
    access_query = await get_profile_access_query(user, profile_id)
    result = await db.qr_profiles.update_one(
        access_query,
        {'$set': {'deleted_at': datetime.now(timezone.utc).isoformat(), 'status': 'paused'}}
    )
    if result.modified_count == 0:
        raise HTTPException(status_code=404, detail="Profile not found")
    
    return {'status': 'deleted'}

@api_router.get("/qr-profiles/{profile_id}/generate-qr")
async def generate_qr(profile_id: str, request: Request):
    user = await get_current_user(request)
    if not has_user_permission(user, 'manage_qr_profiles'):
        raise HTTPException(status_code=403, detail="No tienes permisos para generar QR")

    query = await get_profile_access_query(user, profile_id)
    profile = await db.qr_profiles.find_one(query, {'_id': 0})
    if not profile:
        raise HTTPException(status_code=404, detail="Profile not found")

    settings = await get_platform_settings(request=request)
    qr_image_bytes, media_type, _ = generate_qr_image(
        profile['hash'],
        generation_settings=settings.get('qr_generation'),
    )

    return StreamingResponse(io.BytesIO(qr_image_bytes), media_type=media_type)

@api_router.get("/qr-profiles/{profile_id}/generate-qr-custom")
async def generate_qr_custom(
    profile_id: str,
    request: Request,
    fg_color: str = "black",
    bg_color: str = "white",
    box_size: int = 10,
    border: int = 4
):
    user = await get_current_user(request)
    if not has_user_permission(user, 'manage_qr_profiles'):
        raise HTTPException(status_code=403, detail="No tienes permisos para generar QR")

    query = await get_profile_access_query(user, profile_id)
    profile = await db.qr_profiles.find_one(query, {'_id': 0})
    if not profile:
        raise HTTPException(status_code=404, detail="Profile not found")

    # Validate params
    box_size = max(4, min(40, box_size))
    border = max(0, min(20, border))

    settings = await get_platform_settings(request=request)
    qr_image_bytes, media_type, _ = generate_qr_image(
        profile['hash'],
        fg_color=fg_color,
        bg_color=bg_color,
        box_size=box_size,
        border=border,
        generation_settings=settings.get('qr_generation'),
    )
    return StreamingResponse(io.BytesIO(qr_image_bytes), media_type=media_type)

@api_router.get("/qr-profiles/{profile_id}/details")
async def get_qr_profile_details(profile_id: str, request: Request):
    user = await get_current_user(request)
    if not has_user_permission(user, 'view_analytics'):
        raise HTTPException(status_code=403, detail="No tienes permisos para ver analíticas")

    query = await get_profile_access_query(user, profile_id)
    profile = await db.qr_profiles.find_one(query, {'_id': 0})
    if not profile:
        raise HTTPException(status_code=404, detail="Profile not found")
    
    # Get scans for this profile
    scans = await db.location_scans.find(
        {'qr_profile_id': profile_id}, {'_id': 0}
    ).sort('timestamp', -1).to_list(100)
    
    total_scans = await db.location_scans.count_documents({'qr_profile_id': profile_id})
    
    # Scans per day (last 30 days)
    thirty_days_ago = (datetime.now(timezone.utc) - timedelta(days=30)).isoformat()
    recent_scans = await db.location_scans.find(
        {'qr_profile_id': profile_id, 'timestamp': {'$gte': thirty_days_ago}},
        {'_id': 0, 'timestamp': 1}
    ).to_list(10000)
    
    # Group by day
    scans_by_day = {}
    for s in recent_scans:
        day = s['timestamp'][:10] if isinstance(s['timestamp'], str) else s['timestamp'].strftime('%Y-%m-%d')
        scans_by_day[day] = scans_by_day.get(day, 0) + 1
    
    # Fill in missing days
    daily_data = []
    for i in range(30):
        day = (datetime.now(timezone.utc) - timedelta(days=29-i)).strftime('%Y-%m-%d')
        daily_data.append({'date': day, 'scans': scans_by_day.get(day, 0)})
    
    return {
        'profile': await sanitize_profile_document(profile, request=request),
        'total_scans': total_scans,
        'recent_scans': scans[:20],
        'daily_data': daily_data
    }

# ==================== PUBLIC PROFILES ====================

async def get_profile_template(profile_type: Optional[str], sub_type: Optional[str]) -> Optional[Dict[str, Any]]:
    """Obtiene la plantilla activa para un subtipo de perfil."""
    if not profile_type or not sub_type:
        return None

    config = await db.admin_configs.find_one({'config_type': 'profile_types'}, {'_id': 0, 'data': 1})
    config_data = config.get('data') if config else None
    if isinstance(config_data, dict):
        merged_config, changed = merge_profile_types_config_with_patches(config_data)
    else:
        merged_config = build_default_profile_types_config()
        changed = False

    if changed and config:
        await db.admin_configs.update_one(
            {'config_type': 'profile_types'},
            {'$set': {'data': merged_config, 'updated_at': datetime.now(timezone.utc).isoformat()}}
        )

    category_templates = merged_config.get(profile_type, [])
    if not isinstance(category_templates, list):
        return None

    for template in category_templates:
        if template.get('key') == sub_type:
            return template
    return None

@api_router.get("/profile-types-config")
async def get_profile_types_config_for_users(request: Request):
    user = await get_current_user(request)

    config = await db.admin_configs.find_one({'config_type': 'profile_types'}, {'_id': 0, 'data': 1})
    if config and isinstance(config.get('data'), dict):
        merged, changed = merge_profile_types_config_with_patches(config['data'])
        if changed:
            await db.admin_configs.update_one(
                {'config_type': 'profile_types'},
                {'$set': {'data': merged, 'updated_at': datetime.now(timezone.utc).isoformat()}}
            )
        return merged
    return build_default_profile_types_config()

async def ensure_subscription_profile_runtime_status(
    profile: Dict[str, Any],
    reference_time: Optional[datetime] = None
) -> Dict[str, Any]:
    bucket_id = str(profile.get('subscription_bucket_id') or '').strip()
    owner_user_id = str(profile.get('subscription_owner_user_id') or '').strip()
    if not bucket_id or not owner_user_id:
        return profile

    now = reference_time or datetime.now(timezone.utc)
    quota_state = await refresh_user_subscription_quota_state(owner_user_id, now)
    bucket = find_subscription_bucket_by_id(quota_state.get('buckets', []), bucket_id)
    bucket_expires_at = parse_iso_datetime_utc((bucket or {}).get('expires_at'))
    bucket_is_active = bool(
        bucket
        and bucket_expires_at
        and bucket_expires_at > now
        and parse_non_negative_int(bucket.get('granted_quota', 0), 0) > 0
    )
    now_iso = now.isoformat()

    if bucket_is_active:
        if profile.get('status') == 'paused' and profile.get('subscription_pause_reason') == 'subscription_expired':
            await db.qr_profiles.update_one(
                {'id': profile.get('id')},
                {
                    '$set': {
                        'status': 'subscription',
                        'updated_at': now_iso,
                    },
                    '$unset': {
                        'subscription_pause_reason': '',
                    }
                }
            )
            profile['status'] = 'subscription'
            profile.pop('subscription_pause_reason', None)
        return profile

    if profile.get('status') != 'paused' or profile.get('subscription_pause_reason') != 'subscription_expired':
        await db.qr_profiles.update_one(
            {'id': profile.get('id')},
            {'$set': {
                'status': 'paused',
                'subscription_pause_reason': 'subscription_expired',
                'updated_at': now_iso,
            }}
        )
        profile['status'] = 'paused'
        profile['subscription_pause_reason'] = 'subscription_expired'

    return profile

@api_router.get("/public/profile/{qr_hash}")
async def get_public_profile(qr_hash: str, request: Request):
    profile = await db.qr_profiles.find_one({'hash': qr_hash}, {'_id': 0, 'user_id': 0})
    if not profile:
        raise HTTPException(status_code=404, detail="Profile not found")
    profile = await ensure_subscription_profile_runtime_status(profile)
    
    # Verificar estado
    if profile['status'] == 'paused':
        raise HTTPException(status_code=403, detail="Profile is paused")

    template = await get_profile_template(profile.get('profile_type'), profile.get('sub_type'))
    if template:
        profile['template'] = template

    settings = await get_platform_settings()
    profile['actions'] = build_public_profile_actions(profile, settings)
    profile['lead_form_config'] = build_lead_form_config(profile, settings)
    profile['public_settings'] = normalize_profile_public_settings(
        profile.get('public_settings'),
        profile_type=profile.get('profile_type'),
        legacy_settings=profile.get('notification_config'),
        strict=False,
    )

    return await sanitize_profile_document(profile, request=request, include_public_runtime=True)

@api_router.post("/public/profile/{qr_hash}/scan")
async def register_scan(qr_hash: str, scan_data: LocationScanCreate, request: Request):
    profile = await db.qr_profiles.find_one({'hash': qr_hash}, {'_id': 0})
    if not profile:
        raise HTTPException(status_code=404, detail="Profile not found")
    profile = await ensure_subscription_profile_runtime_status(profile)
    if profile.get('status') == 'paused':
        raise HTTPException(status_code=403, detail="Profile is paused")

    settings = await get_platform_settings()
    has_coordinates = scan_data.lat is not None and scan_data.lng is not None
    campaign_payload = get_campaign_payload_from_request(scan_data, request, settings)

    # Incrementar contador de escaneos
    await db.qr_profiles.update_one(
        {'hash': qr_hash},
        {'$inc': {'scan_count': 1}}
    )

    scan_id = str(uuid.uuid4())
    scan_doc = {
        'id': scan_id,
        'qr_profile_id': profile['id'],
        'lat': scan_data.lat,
        'lng': scan_data.lng,
        'user_agent': scan_data.user_agent,
        'scan_type': 'location' if has_coordinates else 'view',
        **campaign_payload,
        'timestamp': datetime.now(timezone.utc).isoformat(),
    }

    await db.location_scans.insert_one(scan_doc)

    loyalty_points_earned = 0
    if settings.get('enable_loyalty_program') and profile.get('user_id'):
        points_per_scan = max(0, int(settings.get('loyalty_points_per_scan', 1) or 0))
        if points_per_scan > 0:
            await db.users.update_one(
                {'id': profile['user_id']},
                {'$inc': {'loyalty_points_balance': points_per_scan, 'loyalty_points_lifetime': points_per_scan}}
            )
            loyalty_points_earned = points_per_scan

    response_payload: Dict[str, Any] = {'status': 'success', 'scan_id': scan_id, 'loyalty_points_earned': loyalty_points_earned}
    if settings.get('enable_whatsapp_after_scan'):
        whatsapp_actions = [action for action in build_public_profile_actions(profile, settings) if action.get('type') == 'whatsapp']
        if whatsapp_actions:
            response_payload['whatsapp_url'] = whatsapp_actions[0].get('url')

    return response_payload

@api_router.post("/public/profile/{qr_hash}/action-click")
async def register_action_click(qr_hash: str, payload: ActionClickCreate, request: Request):
    profile = await db.qr_profiles.find_one({'hash': qr_hash}, {'_id': 0})
    if not profile:
        raise HTTPException(status_code=404, detail="Profile not found")
    profile = await ensure_subscription_profile_runtime_status(profile)
    if profile.get('status') == 'paused':
        raise HTTPException(status_code=403, detail="Profile is paused")

    settings = await get_platform_settings()
    campaign_payload = get_campaign_payload_from_request(payload, request, settings)
    event_id = str(uuid.uuid4())
    event_doc = {
        'id': event_id,
        'qr_profile_id': profile['id'],
        'owner_user_id': profile.get('user_id'),
        'action_type': sanitize_campaign_value(payload.action_type, 80),
        'label': sanitize_campaign_value(payload.label, 120),
        'url': sanitize_campaign_value(payload.url, 500),
        'user_agent': request.headers.get('user-agent'),
        **campaign_payload,
        'timestamp': datetime.now(timezone.utc).isoformat(),
    }
    await db.action_events.insert_one(event_doc)
    await db.qr_profiles.update_one(
        {'id': profile['id']},
        {'$inc': {'action_click_count': 1}, '$set': {'updated_at': datetime.now(timezone.utc).isoformat()}}
    )
    return {'status': 'success', 'event_id': event_id}

@api_router.post("/public/profile/{qr_hash}/lead")
async def create_public_lead(qr_hash: str, payload: PublicLeadCreate, request: Request):
    profile = await db.qr_profiles.find_one({'hash': qr_hash}, {'_id': 0})
    if not profile:
        raise HTTPException(status_code=404, detail="Profile not found")
    profile = await ensure_subscription_profile_runtime_status(profile)
    if profile.get('status') == 'paused':
        raise HTTPException(status_code=403, detail="Profile is paused")

    settings = await get_platform_settings()
    lead_form_config = build_lead_form_config(profile, settings)
    if not lead_form_config.get('enabled'):
        raise HTTPException(status_code=403, detail="Formulario de contacto deshabilitado para este perfil")
    client_ip = get_client_ip(request)
    await is_lead_submission_allowed(qr_hash, client_ip, payload, settings)

    lead_name = sanitize_campaign_value(payload.name, 120)
    lead_phone = sanitize_campaign_value(payload.phone, 40)
    lead_email = sanitize_campaign_value(payload.email, 160)
    lead_message = sanitize_campaign_value(payload.message, 1500)
    if not any([lead_name, lead_phone, lead_email, lead_message]):
        raise HTTPException(status_code=400, detail="Debe ingresar al menos un dato de contacto o mensaje")
    if lead_form_config.get('require_phone_or_email') and not (lead_phone or lead_email):
        raise HTTPException(status_code=400, detail="Debes ingresar telefono o email para contactar")

    campaign_payload = get_campaign_payload_from_request(payload, request, settings)
    lead_id = str(uuid.uuid4())
    lead_doc = {
        'id': lead_id,
        'qr_profile_id': profile['id'],
        'qr_hash': qr_hash,
        'owner_user_id': profile.get('user_id'),
        'profile_name': profile.get('name'),
        'profile_alias': profile.get('alias'),
        'name': lead_name,
        'phone': lead_phone,
        'email': lead_email,
        'message': lead_message,
        'status': 'new',
        'source': 'public_profile',
        'user_agent': request.headers.get('user-agent'),
        'client_ip': client_ip,
        **campaign_payload,
        'timestamp': datetime.now(timezone.utc).isoformat(),
        'updated_at': datetime.now(timezone.utc).isoformat(),
    }
    await db.leads.insert_one(lead_doc)
    await notify_lead_created(lead_doc, profile, settings)
    return {'status': 'success', 'lead_id': lead_id}

# ==================== LOCATIONS ====================

@api_router.get("/locations/{profile_id}")
async def get_profile_locations(profile_id: str, request: Request):
    user = await get_current_user(request)
    if not has_user_permission(user, 'view_locations'):
        raise HTTPException(status_code=403, detail="No tienes permisos para ver ubicaciones")

    # Verificar que el perfil pertenece al usuario
    query = await get_profile_access_query(user, profile_id)
    profile = await db.qr_profiles.find_one(query, {'_id': 0})
    if not profile:
        raise HTTPException(status_code=404, detail="Profile not found")

    scans = await db.location_scans.find(
        {
            'qr_profile_id': profile_id,
            'lat': {'$ne': None},
            'lng': {'$ne': None},
        },
        {'_id': 0}
    ).to_list(1000)
    return scans

# ==================== STATISTICS ====================

@api_router.get("/scan-history")
async def get_scan_history(
    request: Request,
    profile_id: Optional[str] = None,
    start_date: Optional[str] = None,
    end_date: Optional[str] = None,
    search: Optional[str] = None,
    skip: int = 0,
    limit: int = 50
):
    user = await get_current_user(request)
    if not has_user_permission(user, 'view_locations'):
        raise HTTPException(status_code=403, detail="No tienes permisos para ver historial de ubicaciones")

    accessible_user_ids = await get_managed_user_ids(user)
    # Get user's profile IDs
    user_profiles = await db.qr_profiles.find(
        {'user_id': {'$in': accessible_user_ids}, 'deleted_at': None},
        {'_id': 0, 'id': 1, 'name': 1, 'alias': 1, 'hash': 1, 'sub_type': 1}
    ).to_list(1000)
    
    profile_map = {p['id']: p for p in user_profiles}
    profile_ids = list(profile_map.keys())
    
    if not profile_ids:
        return {'scans': [], 'total': 0, 'profiles': []}
    
    query = {'qr_profile_id': {'$in': profile_ids}}
    
    if profile_id:
        if profile_id not in profile_ids:
            raise HTTPException(status_code=403, detail="Profile not found")
        query['qr_profile_id'] = profile_id
    
    if start_date:
        query.setdefault('timestamp', {})['$gte'] = start_date
    if end_date:
        query.setdefault('timestamp', {})['$lte'] = end_date
    
    total = await db.location_scans.count_documents(query)
    scans = await db.location_scans.find(query, {'_id': 0}).sort('timestamp', -1).skip(skip).limit(limit).to_list(limit)
    
    # Enrich with profile info
    for scan in scans:
        profile_info = profile_map.get(scan['qr_profile_id'], {})
        scan['profile_name'] = profile_info.get('name', 'Desconocido')
        scan['profile_alias'] = profile_info.get('alias', '')
        scan['profile_hash'] = profile_info.get('hash', '')
        scan['profile_sub_type'] = profile_info.get('sub_type', '')
    
    return {
        'scans': scans,
        'total': total,
        'profiles': user_profiles
    }

@api_router.get("/leads")
async def get_my_leads(
    request: Request,
    profile_id: Optional[str] = None,
    status: Optional[str] = None,
    search: Optional[str] = None,
    skip: int = 0,
    limit: int = 50
):
    user = await get_current_user(request)
    accessible_user_ids = await get_managed_user_ids(user)

    profiles = await db.qr_profiles.find(
        {'user_id': {'$in': accessible_user_ids}, 'deleted_at': None},
        {'_id': 0, 'id': 1, 'name': 1, 'alias': 1, 'hash': 1, 'sub_type': 1}
    ).to_list(1000)
    profile_map = {p['id']: p for p in profiles}
    profile_ids = list(profile_map.keys())

    if profile_id and profile_id not in profile_ids:
        raise HTTPException(status_code=403, detail="Profile not found")

    query: Dict[str, Any] = {'owner_user_id': {'$in': accessible_user_ids}}
    if profile_id:
        query['qr_profile_id'] = profile_id
    if status:
        query['status'] = status
    if search:
        query['$or'] = [
            {'name': {'$regex': search, '$options': 'i'}},
            {'email': {'$regex': search, '$options': 'i'}},
            {'phone': {'$regex': search, '$options': 'i'}},
            {'message': {'$regex': search, '$options': 'i'}},
            {'profile_name': {'$regex': search, '$options': 'i'}},
        ]

    total = await db.leads.count_documents(query)
    leads = await db.leads.find(query, {'_id': 0}).sort('timestamp', -1).skip(skip).limit(limit).to_list(limit)

    for lead in leads:
        profile_info = profile_map.get(lead.get('qr_profile_id'))
        if profile_info:
            lead['profile_name'] = profile_info.get('name')
            lead['profile_alias'] = profile_info.get('alias')
            lead['profile_hash'] = profile_info.get('hash')
            lead['profile_sub_type'] = profile_info.get('sub_type')

    return {'leads': sanitize_for_json(leads), 'total': total, 'profiles': profiles}

@api_router.patch("/leads/{lead_id}/status")
async def update_my_lead_status(lead_id: str, payload: LeadStatusUpdate, request: Request):
    user = await get_current_user(request)
    accessible_user_ids = await get_managed_user_ids(user)

    result = await db.leads.update_one(
        {'id': lead_id, 'owner_user_id': {'$in': accessible_user_ids}},
        {'$set': {'status': payload.status, 'updated_at': datetime.now(timezone.utc).isoformat()}}
    )
    if result.matched_count == 0:
        raise HTTPException(status_code=404, detail="Lead no encontrado")
    return {'status': 'success'}

@api_router.get("/leads/export")
async def export_my_leads_csv(
    request: Request,
    profile_id: Optional[str] = None,
    status: Optional[str] = None,
    search: Optional[str] = None
):
    user = await get_current_user(request)
    accessible_user_ids = await get_managed_user_ids(user)
    query: Dict[str, Any] = {'owner_user_id': {'$in': accessible_user_ids}}
    if profile_id:
        query['qr_profile_id'] = profile_id
    if status:
        query['status'] = status
    if search:
        query['$or'] = [
            {'name': {'$regex': search, '$options': 'i'}},
            {'email': {'$regex': search, '$options': 'i'}},
            {'phone': {'$regex': search, '$options': 'i'}},
            {'message': {'$regex': search, '$options': 'i'}},
            {'profile_name': {'$regex': search, '$options': 'i'}},
        ]

    leads = await db.leads.find(query, {'_id': 0}).sort('timestamp', -1).to_list(50000)
    csv_bytes = build_leads_csv_bytes(leads)
    file_name = f"mis-leads-{datetime.now(timezone.utc).strftime('%Y%m%d%H%M%S')}.csv"
    headers = {'Content-Disposition': f'attachment; filename=\"{file_name}\"'}
    return StreamingResponse(io.BytesIO(csv_bytes), media_type='text/csv; charset=utf-8', headers=headers)

@api_router.get("/statistics/overview")
async def get_user_statistics(request: Request):
    user = await get_current_user(request)
    if not has_user_permission(user, 'view_analytics'):
        raise HTTPException(status_code=403, detail="No tienes permisos para ver analíticas")

    settings = await get_platform_settings()
    accessible_user_ids = await get_managed_user_ids(user)
    # Total de perfiles
    total_profiles = await db.qr_profiles.count_documents({'user_id': {'$in': accessible_user_ids}, 'deleted_at': None})

    # Total de escaneos
    profiles = await db.qr_profiles.find({'user_id': {'$in': accessible_user_ids}, 'deleted_at': None}, {'id': 1, '_id': 0}).to_list(1000)
    profile_ids = [p['id'] for p in profiles]
    total_scans = await db.location_scans.count_documents({'qr_profile_id': {'$in': profile_ids}})
    total_action_clicks = await db.action_events.count_documents({'owner_user_id': {'$in': accessible_user_ids}})
    total_leads = await db.leads.count_documents({'owner_user_id': {'$in': accessible_user_ids}})
    
    # Perfiles por estado
    active_profiles = await db.qr_profiles.count_documents({
        'user_id': {'$in': accessible_user_ids},
        'deleted_at': None,
        'status': {'$in': ['indefinite', 'subscription']}
    })
    paused_profiles = await db.qr_profiles.count_documents({
        'user_id': {'$in': accessible_user_ids},
        'deleted_at': None,
        'status': 'paused'
    })
    
    # Escaneos por mes (últimos 6 meses)
    from datetime import timedelta
    six_months_ago = datetime.now(timezone.utc) - timedelta(days=180)
    recent_scans = await db.location_scans.find({
        'qr_profile_id': {'$in': profile_ids},
        'timestamp': {'$gte': six_months_ago.isoformat()}
    }, {'_id': 0, 'timestamp': 1}).to_list(10000)
    
    # Top 5 perfiles más escaneados
    top_profiles = await db.qr_profiles.find({
        'user_id': {'$in': accessible_user_ids},
        'deleted_at': None
    }, {'_id': 0}).sort('scan_count', -1).limit(5).to_list(5)

    loyalty_balance = int(user.get('loyalty_points_balance', 0))
    loyalty_lifetime = int(user.get('loyalty_points_lifetime', 0))
    cta_conversion_rate = round((total_action_clicks / total_scans) * 100, 2) if total_scans > 0 else 0.0
    lead_conversion_rate = round((total_leads / total_scans) * 100, 2) if total_scans > 0 else 0.0
    lead_from_click_rate = round((total_leads / total_action_clicks) * 100, 2) if total_action_clicks > 0 else 0.0
    
    return {
        'total_profiles': total_profiles,
        'total_scans': total_scans,
        'total_action_clicks': total_action_clicks,
        'total_leads': total_leads,
        'active_profiles': active_profiles,
        'paused_profiles': paused_profiles,
        'recent_scans': recent_scans,
        'top_profiles': await sanitize_profile_collection(top_profiles, request=request),
        'loyalty_enabled': bool(settings.get('enable_loyalty_program')),
        'loyalty_points_balance': loyalty_balance,
        'loyalty_points_lifetime': loyalty_lifetime,
        'loyalty_redeem_threshold': int(settings.get('loyalty_redeem_threshold', 50) or 50),
        'cta_conversion_rate': cta_conversion_rate,
        'lead_conversion_rate': lead_conversion_rate,
        'lead_from_click_rate': lead_from_click_rate,
    }

@api_router.get("/statistics/campaigns")
async def get_campaign_statistics(request: Request, days: int = 30):
    user = await get_current_user(request)
    if not has_user_permission(user, 'view_analytics'):
        raise HTTPException(status_code=403, detail="No tienes permisos para ver analíticas")

    accessible_user_ids = await get_managed_user_ids(user)
    profiles = await db.qr_profiles.find(
        {'user_id': {'$in': accessible_user_ids}, 'deleted_at': None},
        {'_id': 0, 'id': 1}
    ).to_list(5000)
    profile_ids = [profile['id'] for profile in profiles]
    if not profile_ids:
        return {'campaigns': [], 'variants': [], 'total_tracked_scans': 0}

    now = datetime.now(timezone.utc)
    days = min(max(days, 1), 365)
    since_iso = (now - timedelta(days=days)).isoformat()

    match_stage = {
        'qr_profile_id': {'$in': profile_ids},
        'timestamp': {'$gte': since_iso},
        '$or': [
            {'campaign_source': {'$exists': True, '$nin': [None, '']}},
            {'campaign_name': {'$exists': True, '$nin': [None, '']}},
            {'variant': {'$exists': True, '$nin': [None, '']}},
        ],
    }

    campaign_pipeline = [
        {'$match': match_stage},
        {'$group': {
            '_id': {
                'source': {'$ifNull': ['$campaign_source', 'direct']},
                'medium': {'$ifNull': ['$campaign_medium', '(none)']},
                'campaign': {'$ifNull': ['$campaign_name', '(none)']},
            },
            'scans': {'$sum': 1},
        }},
        {'$sort': {'scans': -1}},
        {'$limit': 50},
    ]

    variant_pipeline = [
        {'$match': match_stage},
        {'$group': {
            '_id': {'$ifNull': ['$variant', 'control']},
            'scans': {'$sum': 1},
        }},
        {'$sort': {'scans': -1}},
    ]

    campaign_rows = await db.location_scans.aggregate(campaign_pipeline).to_list(50)
    variant_rows = await db.location_scans.aggregate(variant_pipeline).to_list(20)

    campaigns = []
    for row in campaign_rows:
        row_id = row.get('_id', {})
        campaigns.append({
            'source': row_id.get('source', 'direct'),
            'medium': row_id.get('medium', '(none)'),
            'campaign': row_id.get('campaign', '(none)'),
            'scans': int(row.get('scans', 0)),
        })

    variants = [{'variant': row.get('_id', 'control'), 'scans': int(row.get('scans', 0))} for row in variant_rows]
    total_tracked_scans = sum(item['scans'] for item in campaigns)
    return {'campaigns': campaigns, 'variants': variants, 'total_tracked_scans': total_tracked_scans}

@api_router.get("/loyalty/summary")
async def get_loyalty_summary(request: Request):
    user = await get_current_user(request)
    settings = await get_platform_settings()
    enabled = bool(settings.get('enable_loyalty_program'))

    refreshed_user = await db.users.find_one({'id': user['id']}, {'_id': 0, 'loyalty_points_balance': 1, 'loyalty_points_lifetime': 1})
    balance = int((refreshed_user or {}).get('loyalty_points_balance', user.get('loyalty_points_balance', 0)))
    lifetime = int((refreshed_user or {}).get('loyalty_points_lifetime', user.get('loyalty_points_lifetime', 0)))
    threshold = int(settings.get('loyalty_redeem_threshold', 50) or 50)
    can_redeem = enabled and balance >= threshold

    return {
        'enabled': enabled,
        'points_balance': balance,
        'points_lifetime': lifetime,
        'redeem_threshold': threshold,
        'can_redeem': can_redeem,
    }

@api_router.post("/loyalty/redeem")
async def redeem_loyalty_points(payload: LoyaltyRedeemRequest, request: Request):
    user = await get_current_user(request)
    settings = await get_platform_settings()
    if not settings.get('enable_loyalty_program'):
        raise HTTPException(status_code=400, detail="Programa de fidelización deshabilitado")

    threshold = max(1, int(settings.get('loyalty_redeem_threshold', 50) or 50))
    requested_points = payload.points if payload.points is not None else threshold
    redeem_points = max(threshold, int(requested_points))

    current_user = await db.users.find_one({'id': user['id']}, {'_id': 0, 'loyalty_points_balance': 1})
    balance = int((current_user or {}).get('loyalty_points_balance', 0))
    if balance < redeem_points:
        raise HTTPException(status_code=400, detail="Puntos insuficientes para canjear")

    await db.users.update_one(
        {'id': user['id']},
        {'$inc': {'loyalty_points_balance': -redeem_points}}
    )
    await db.loyalty_redemptions.insert_one({
        'id': str(uuid.uuid4()),
        'user_id': user['id'],
        'points': redeem_points,
        'timestamp': datetime.now(timezone.utc).isoformat(),
    })

    updated_user = await db.users.find_one({'id': user['id']}, {'_id': 0, 'loyalty_points_balance': 1})
    return {'status': 'success', 'redeemed_points': redeem_points, 'remaining_points': int((updated_user or {}).get('loyalty_points_balance', 0))}

@api_router.get("/statistics/executive-report")
async def get_executive_report(request: Request, days: int = 30, format: str = 'json'):
    user = await get_current_user(request)
    if not has_user_permission(user, 'view_analytics'):
        raise HTTPException(status_code=403, detail="No tienes permisos para ver analíticas")

    days = min(max(days, 1), 365)
    now = datetime.now(timezone.utc)
    since_iso = (now - timedelta(days=days)).isoformat()

    accessible_user_ids = await get_managed_user_ids(user)
    profiles = await db.qr_profiles.find(
        {'user_id': {'$in': accessible_user_ids}, 'deleted_at': None},
        {'_id': 0, 'id': 1, 'name': 1, 'scan_count': 1}
    ).to_list(5000)
    profile_ids = [profile['id'] for profile in profiles]

    scans_in_period = await db.location_scans.count_documents({
        'qr_profile_id': {'$in': profile_ids},
        'timestamp': {'$gte': since_iso},
    })
    location_scans = await db.location_scans.count_documents({
        'qr_profile_id': {'$in': profile_ids},
        'timestamp': {'$gte': since_iso},
        'scan_type': 'location',
    })
    orders_in_period = await db.orders.count_documents({
        'user_id': {'$in': accessible_user_ids},
        'status': 'paid',
        'created_at': {'$gte': since_iso},
    })

    revenue_pipeline = [
        {'$match': {'user_id': {'$in': accessible_user_ids}, 'status': 'paid', 'created_at': {'$gte': since_iso}}},
        {'$group': {'_id': None, 'total_revenue': {'$sum': {'$ifNull': ['$final_total', '$total']}}}},
    ]
    revenue_result = await db.orders.aggregate(revenue_pipeline).to_list(1)
    revenue = float(revenue_result[0].get('total_revenue', 0)) if revenue_result else 0.0

    top_profiles = sorted(
        [{'name': p.get('name', 'Perfil'), 'scan_count': int(p.get('scan_count', 0))} for p in profiles],
        key=lambda item: item['scan_count'],
        reverse=True
    )[:5]

    settings = await get_platform_settings()
    report_data = {
        'period_days': days,
        'generated_at': now.isoformat(),
        'summary': {
            'profiles_count': len(profile_ids),
            'scans_in_period': scans_in_period,
            'location_scans_in_period': location_scans,
            'paid_orders_in_period': orders_in_period,
            'revenue_in_period': revenue,
        },
        'loyalty': {
            'enabled': bool(settings.get('enable_loyalty_program')),
            'points_balance': int(user.get('loyalty_points_balance', 0)),
            'points_lifetime': int(user.get('loyalty_points_lifetime', 0)),
        },
        'top_profiles': top_profiles,
    }

    if format.lower() != 'pdf':
        return report_data

    buffer = io.BytesIO()
    pdf = canvas.Canvas(buffer, pagesize=letter)
    width, height = letter
    y = height - 50

    pdf.setFont("Helvetica-Bold", 16)
    pdf.drawString(50, y, "Reporte Ejecutivo QR Profiles")
    y -= 22
    pdf.setFont("Helvetica", 10)
    pdf.drawString(50, y, f"Generado: {now.strftime('%Y-%m-%d %H:%M:%S UTC')} | Periodo: ultimos {days} dias")
    y -= 26

    for line in [
        f"Perfiles activos: {report_data['summary']['profiles_count']}",
        f"Escaneos del periodo: {report_data['summary']['scans_in_period']}",
        f"Escaneos con ubicacion: {report_data['summary']['location_scans_in_period']}",
        f"Ordenes pagadas: {report_data['summary']['paid_orders_in_period']}",
        f"Ingresos: {int(report_data['summary']['revenue_in_period'])} CLP",
        f"Fidelizacion activa: {'Si' if report_data['loyalty']['enabled'] else 'No'}",
    ]:
        pdf.drawString(50, y, line)
        y -= 16

    y -= 8
    pdf.setFont("Helvetica-Bold", 12)
    pdf.drawString(50, y, "Top perfiles por escaneos acumulados")
    y -= 18
    pdf.setFont("Helvetica", 10)
    if not top_profiles:
        pdf.drawString(50, y, "Sin datos disponibles.")
    else:
        for index, item in enumerate(top_profiles, start=1):
            pdf.drawString(50, y, f"{index}. {item['name']} - {item['scan_count']} escaneos")
            y -= 15
            if y < 60:
                pdf.showPage()
                y = height - 50
                pdf.setFont("Helvetica", 10)

    pdf.showPage()
    pdf.save()
    buffer.seek(0)
    file_name = f"reporte-ejecutivo-{now.strftime('%Y%m%d%H%M%S')}.pdf"
    headers = {'Content-Disposition': f'attachment; filename=\"{file_name}\"'}
    return StreamingResponse(buffer, media_type='application/pdf', headers=headers)

# ==================== ADMIN ====================

@api_router.get("/admin/users")
async def get_all_users(
    request: Request,
    skip: int = 0,
    limit: int = 50,
    search: Optional[str] = None,
    include_deleted: bool = False
):
    admin = await get_current_admin(request)

    query: Dict[str, Any] = {}
    if not include_deleted:
        query['account_status'] = {'$ne': 'deleted'}
    if search:
        query['$or'] = [
            {'email': {'$regex': search, '$options': 'i'}},
            {'name': {'$regex': search, '$options': 'i'}}
        ]

    users = await db.users.find(query, {'_id': 0, 'password': 0}).sort('created_at', -1).skip(skip).limit(limit).to_list(limit)
    total = await db.users.count_documents(query)

    return {'users': [normalize_user_document(u) for u in users], 'total': total}

@api_router.post("/admin/users")
async def admin_create_user(user_data: AdminUserCreate, request: Request):
    admin = await get_current_admin(request)
    existing = await db.users.find_one({'email': user_data.email}, {'_id': 0, 'id': 1})
    if existing:
        raise HTTPException(status_code=400, detail="Email already registered")

    role = user_data.account_role
    if not role:
        role = 'subaccount' if user_data.parent_account_id else ('master' if user_data.user_type == 'business' else 'standard')

    now = datetime.now(timezone.utc).isoformat()
    user_doc = {
        'id': str(uuid.uuid4()),
        'email': user_data.email,
        'password': hash_password(user_data.password),
        'name': user_data.name,
        'user_type': user_data.user_type,
        'phone': user_data.phone,
        'address': user_data.address,
        'business_name': user_data.business_name,
        'is_admin': user_data.is_admin,
        'account_status': user_data.account_status,
        'account_role': role,
        'parent_account_id': user_data.parent_account_id,
        'permissions': user_data.permissions or get_default_permissions_for_role(role),
        'qr_quota_balance': 0,
        'qr_quota_lifetime': 0,
        'qr_subscription_buckets': [],
        'created_at': now,
        'updated_at': now,
    }

    await db.users.insert_one(user_doc)
    response = dict(user_doc)
    response.pop('password', None)
    return sanitize_for_json(normalize_user_document(response))

@api_router.get("/admin/users/{user_id}")
async def get_user_detail(user_id: str, request: Request):
    admin = await get_current_admin(request)

    user = await db.users.find_one({'id': user_id}, {'_id': 0, 'password': 0})
    if not user:
        raise HTTPException(status_code=404, detail="User not found")

    normalized_user = normalize_user_document(user)
    managed_user_ids = [user_id]
    if is_master_account(normalized_user):
        managed_user_ids = await get_managed_user_ids(normalized_user)

    profiles = await db.qr_profiles.find({'user_id': {'$in': managed_user_ids}}, {'_id': 0}).to_list(300)
    return {'user': normalized_user, 'profiles': await sanitize_profile_collection(profiles, request=request)}

@api_router.put("/admin/users/{user_id}")
async def update_user(user_id: str, user_data: Dict[str, Any], request: Request):
    admin = await get_current_admin(request)

    # Si incluye password, hashearlo
    if 'password' in user_data and user_data['password']:
        user_data['password'] = hash_password(user_data['password'])
    elif 'password' in user_data:
        del user_data['password']

    if 'account_role' in user_data and user_data['account_role'] not in {'standard', 'master', 'subaccount'}:
        raise HTTPException(status_code=400, detail="account_role inválido")
    if 'account_status' in user_data and user_data['account_status'] not in {'active', 'paused', 'deleted'}:
        raise HTTPException(status_code=400, detail="account_status inválido")

    user_data['updated_at'] = datetime.now(timezone.utc).isoformat()
    result = await db.users.update_one(
        {'id': user_id},
        {'$set': user_data}
    )

    if result.matched_count == 0:
        raise HTTPException(status_code=404, detail="User not found")

    return {'status': 'success'}

@api_router.patch("/admin/users/{user_id}/status")
async def admin_update_user_status(user_id: str, payload: AccountStatusUpdate, request: Request):
    admin = await get_current_admin(request)
    result = await db.users.update_one(
        {'id': user_id},
        {'$set': {'account_status': payload.account_status, 'updated_at': datetime.now(timezone.utc).isoformat()}}
    )
    if result.matched_count == 0:
        raise HTTPException(status_code=404, detail="User not found")
    return {'status': 'success'}

@api_router.delete("/admin/users/{user_id}")
async def admin_delete_user(user_id: str, request: Request):
    admin = await get_current_admin(request)
    if user_id == admin.get('id'):
        raise HTTPException(status_code=400, detail="No puedes eliminar tu propia cuenta admin")

    now = datetime.now(timezone.utc).isoformat()
    result = await db.users.update_one(
        {'id': user_id},
        {'$set': {'account_status': 'deleted', 'deleted_at': now, 'updated_at': now}}
    )
    if result.matched_count == 0:
        raise HTTPException(status_code=404, detail="User not found")

    await db.qr_profiles.update_many(
        {'user_id': user_id, 'deleted_at': None},
        {'$set': {'deleted_at': now, 'status': 'paused', 'updated_at': now}}
    )
    return {'status': 'deleted'}

@api_router.get("/admin/trash")
async def admin_get_trash(request: Request, include_products: bool = True):
    admin = await get_current_admin(request)

    users = await db.users.find(
        {
            '$or': [
                {'account_status': 'deleted'},
                {'deleted_at': {'$ne': None}},
            ]
        },
        {'_id': 0, 'password': 0}
    ).to_list(1000)
    normalized_users = [normalize_user_document(user) for user in users]
    user_index = {user.get('id'): user for user in normalized_users if user.get('id')}

    qr_profiles = await db.qr_profiles.find(
        {'deleted_at': {'$ne': None}},
        {'_id': 0}
    ).to_list(2000)
    sanitized_profiles = await sanitize_profile_collection(qr_profiles, request=request)

    profile_items: List[Dict[str, Any]] = []
    for profile in sanitized_profiles:
        owner = user_index.get(profile.get('user_id'))
        profile_items.append({
            'id': profile.get('id'),
            'hash': profile.get('hash'),
            'name': profile.get('name'),
            'alias': profile.get('alias'),
            'profile_type': profile.get('profile_type'),
            'sub_type': profile.get('sub_type'),
            'status': profile.get('status'),
            'deleted_at': profile.get('deleted_at'),
            'updated_at': profile.get('updated_at'),
            'user_id': profile.get('user_id'),
            'user_name': owner.get('name') if owner else None,
            'user_email': owner.get('email') if owner else None,
        })

    user_items = [{
        'id': user.get('id'),
        'name': user.get('name'),
        'email': user.get('email'),
        'user_type': user.get('user_type'),
        'account_role': user.get('account_role'),
        'account_status': user.get('account_status'),
        'parent_account_id': user.get('parent_account_id'),
        'deleted_at': user.get('deleted_at'),
        'updated_at': user.get('updated_at'),
    } for user in normalized_users]

    product_items: List[Dict[str, Any]] = []
    if include_products:
        products = await db.products.find({'active': False}, {'_id': 0}).to_list(1000)
        product_items = [normalize_product_document(product, request=request) for product in products]

    return {
        'counts': {
            'users': len(user_items),
            'qr_profiles': len(profile_items),
            'products': len(product_items),
        },
        'users': user_items,
        'qr_profiles': profile_items,
        'products': product_items,
    }

@api_router.delete("/admin/trash/users/{user_id}")
async def admin_permanently_delete_user(user_id: str, request: Request):
    admin = await get_current_admin(request)
    if user_id == admin.get('id'):
        raise HTTPException(status_code=400, detail="No puedes eliminar tu propia cuenta admin")

    target = await db.users.find_one({'id': user_id}, {'_id': 0, 'id': 1, 'user_type': 1, 'account_role': 1, 'account_status': 1, 'deleted_at': 1})
    if not target:
        raise HTTPException(status_code=404, detail="Usuario no encontrado")
    if not is_deleted_user_document(target):
        raise HTTPException(status_code=400, detail="Solo puedes eliminar definitivamente cuentas que estén en papelera")

    user_ids_to_delete: List[str] = [user_id]
    if target.get('user_type') == 'business' and infer_account_role(target) == 'master':
        subaccounts = await db.users.find(
            {'parent_account_id': user_id},
            {'_id': 0, 'id': 1}
        ).to_list(2000)
        for subaccount in subaccounts:
            subaccount_id = str(subaccount.get('id') or '').strip()
            if subaccount_id and subaccount_id not in user_ids_to_delete:
                user_ids_to_delete.append(subaccount_id)

    qr_delete_result = await db.qr_profiles.delete_many({'user_id': {'$in': user_ids_to_delete}})
    users_delete_result = await db.users.delete_many({'id': {'$in': user_ids_to_delete}})

    return {
        'status': 'deleted_permanently',
        'deleted_user_count': users_delete_result.deleted_count,
        'deleted_qr_profiles_count': qr_delete_result.deleted_count,
    }

@api_router.delete("/admin/trash/qr-profiles/{profile_id}")
async def admin_permanently_delete_qr_profile(profile_id: str, request: Request):
    admin = await get_current_admin(request)
    profile = await db.qr_profiles.find_one({'id': profile_id}, {'_id': 0, 'id': 1, 'deleted_at': 1})
    if not profile:
        raise HTTPException(status_code=404, detail="Perfil no encontrado")
    if not profile.get('deleted_at'):
        raise HTTPException(status_code=400, detail="Solo puedes borrar definitivamente perfiles que estén en papelera")

    result = await db.qr_profiles.delete_one({'id': profile_id})
    if result.deleted_count == 0:
        raise HTTPException(status_code=404, detail="Perfil no encontrado")
    return {'status': 'deleted_permanently'}

@api_router.delete("/admin/trash/products/{product_id}")
async def admin_permanently_delete_product_from_trash(product_id: str, request: Request):
    admin = await get_current_admin(request)
    product = await db.products.find_one({'id': product_id}, {'_id': 0, 'id': 1, 'active': 1})
    if not product:
        raise HTTPException(status_code=404, detail="Producto no encontrado")
    if product.get('active', True) is not False:
        raise HTTPException(status_code=400, detail="Solo puedes borrar definitivamente productos desactivados")

    result = await db.products.delete_one({'id': product_id})
    if result.deleted_count == 0:
        raise HTTPException(status_code=404, detail="Producto no encontrado")
    return {'status': 'deleted_permanently'}

@api_router.get("/admin/users/{user_id}/subscriptions")
async def admin_get_user_subscriptions(user_id: str, request: Request):
    admin = await get_current_admin(request)
    user_doc = await db.users.find_one({'id': user_id}, {'_id': 0})
    if not user_doc:
        raise HTTPException(status_code=404, detail='User not found')

    normalized_user = normalize_user_document(user_doc)
    owner_user_id = await resolve_subscription_owner_id_from_user_doc(normalized_user)
    overview = await get_subscription_overview_for_owner(owner_user_id)
    return {
        **overview,
        'target_user_id': normalized_user.get('id'),
        'target_user_name': normalized_user.get('name'),
        'target_user_email': normalized_user.get('email'),
        'target_account_role': normalized_user.get('account_role'),
        'target_parent_account_id': normalized_user.get('parent_account_id'),
    }

@api_router.post("/admin/users/{user_id}/subscriptions/grant")
async def admin_grant_user_subscription(
    user_id: str,
    payload: AdminSubscriptionGrant,
    request: Request
):
    admin = await get_current_admin(request)
    settings = await get_platform_settings()
    if not settings.get('allow_admin_manual_subscription_grants', True):
        raise HTTPException(status_code=403, detail='Los otorgamientos manuales están deshabilitados en configuración')

    user_doc = await db.users.find_one({'id': user_id}, {'_id': 0})
    if not user_doc:
        raise HTTPException(status_code=404, detail='User not found')

    normalized_user = normalize_user_document(user_doc)
    owner_user_id = await resolve_subscription_owner_id_from_user_doc(normalized_user)
    await grant_subscription_bucket_to_owner(
        owner_user_id=owner_user_id,
        qr_quota_granted=payload.qr_quota_granted,
        subscription_period=payload.subscription_period,
        label=payload.label,
        source='admin_manual_grant',
    )
    return await admin_get_user_subscriptions(user_id, request)

@api_router.delete("/admin/users/{user_id}/subscriptions/{bucket_id}")
async def admin_revoke_user_subscription(user_id: str, bucket_id: str, request: Request):
    admin = await get_current_admin(request)
    user_doc = await db.users.find_one({'id': user_id}, {'_id': 0})
    if not user_doc:
        raise HTTPException(status_code=404, detail='User not found')

    normalized_user = normalize_user_document(user_doc)
    owner_user_id = await resolve_subscription_owner_id_from_user_doc(normalized_user)
    revoked = await revoke_subscription_bucket_from_owner(owner_user_id, bucket_id)
    if not revoked:
        raise HTTPException(status_code=404, detail='Suscripción no encontrada')
    return await admin_get_user_subscriptions(user_id, request)

@api_router.post("/admin/qr-profiles")
async def admin_create_qr_profile(profile_data: AdminQRProfileCreate, request: Request):
    admin = await get_current_admin(request)
    target_user = await db.users.find_one({'id': profile_data.user_id}, {'_id': 0, 'password': 0})
    if not target_user:
        raise HTTPException(status_code=404, detail="Usuario destino no encontrado")

    normalized_target = normalize_user_document(target_user)
    if normalized_target.get('account_status') == 'deleted':
        raise HTTPException(status_code=400, detail="No puedes asignar perfiles a una cuenta eliminada")

    if profile_data.profile_type == 'business' and normalized_target.get('user_type') != 'business':
        raise HTTPException(status_code=400, detail="Los perfiles empresariales solo pueden asignarse a cuentas empresa")

    now = datetime.now(timezone.utc)
    profile_id = str(uuid.uuid4())
    normalized_public_settings = normalize_profile_public_settings(
        profile_data.public_settings,
        profile_type=profile_data.profile_type,
        legacy_settings=profile_data.notification_config,
        strict=True,
    )
    public_settings_customized = await resolve_public_settings_customized_flag(
        profile_type=profile_data.profile_type,
        sub_type=profile_data.sub_type,
        public_settings=normalized_public_settings,
        explicit_value=profile_data.public_settings_customized,
    )
    profile_doc = {
        'id': profile_id,
        'user_id': profile_data.user_id,
        'hash': generate_qr_hash(profile_data.user_id, profile_data.name),
        'name': profile_data.name,
        'alias': profile_data.alias or profile_data.name,
        'profile_type': profile_data.profile_type,
        'sub_type': profile_data.sub_type,
        'status': profile_data.status,
        'data': await enforce_profile_uploaded_images_in_data(
            dict(profile_data.data or {}),
            profile_type=profile_data.profile_type,
            sub_type=profile_data.sub_type,
            request=request,
            path='data',
            allowed_scopes=ADMIN_PROFILE_IMAGE_INPUT_SCOPES,
            owner_user_id=str(profile_data.user_id),
        ),
        'notification_config': build_legacy_notification_config(
            profile_data.notification_config,
            normalized_public_settings,
        ),
        'public_settings': normalized_public_settings,
        'public_settings_customized': public_settings_customized,
        'expiration_date': profile_data.expiration_date,
        'scan_count': 0,
        'created_at': now.isoformat(),
        'updated_at': now.isoformat(),
        'deleted_at': None,
        'created_by_admin_id': admin.get('id'),
    }
    await db.qr_profiles.insert_one(profile_doc)
    return await sanitize_profile_document(profile_doc, request=request)

@api_router.get("/admin/qr-profiles")
async def get_all_profiles(
    request: Request, 
    skip: int = 0, 
    limit: int = 100,
    search: Optional[str] = None,
    status: Optional[str] = None,
    profile_type: Optional[str] = None,
    include_deleted: bool = False
):
    admin = await get_current_admin(request)
    
    query = {}
    if not include_deleted:
        query['deleted_at'] = None
    
    if search:
        query['$or'] = [
            {'name': {'$regex': search, '$options': 'i'}},
            {'alias': {'$regex': search, '$options': 'i'}},
            {'hash': {'$regex': search, '$options': 'i'}}
        ]
    
    if status:
        if status == 'deleted':
            query['deleted_at'] = {'$ne': None}
        else:
            query['status'] = status
    
    if profile_type:
        query['profile_type'] = profile_type
    
    profiles = await db.qr_profiles.find(query, {'_id': 0}).skip(skip).limit(limit).to_list(limit)
    total = await db.qr_profiles.count_documents(query)
    
    # Enriquecer con información del usuario
    for profile in profiles:
        user = await db.users.find_one({'id': profile['user_id']}, {'_id': 0, 'password': 0})
        if user:
            profile['user_info'] = {
                'email': user['email'],
                'name': user['name'],
                'user_type': user['user_type']
            }
    
    return {'profiles': await sanitize_profile_collection(profiles, request=request), 'total': total}

@api_router.put("/admin/qr-profiles/{profile_id}")
async def admin_update_profile(profile_id: str, profile_data: Dict[str, Any], request: Request):
    admin = await get_current_admin(request)
    
    existing = await db.qr_profiles.find_one(
        {'id': profile_id},
        {'_id': 0, 'profile_type': 1, 'sub_type': 1, 'user_id': 1, 'public_settings': 1, 'notification_config': 1},
    )
    if not existing:
        raise HTTPException(status_code=404, detail="Profile not found")

    requested_user_id = normalize_optional_user_id(profile_data.get('user_id'))
    current_owner_user_id = normalize_optional_user_id(existing.get('user_id'))
    if requested_user_id and requested_user_id != current_owner_user_id:
        raise HTTPException(
            status_code=400,
            detail="Para reasignar el dueño del perfil usá el endpoint específico de reasignación."
        )

    effective_profile_type = profile_data.get('profile_type', existing.get('profile_type'))
    effective_sub_type = profile_data.get('sub_type', existing.get('sub_type'))
    if 'data' in profile_data:
        profile_data['data'] = await enforce_profile_uploaded_images_in_data(
            profile_data.get('data') or {},
            profile_type=effective_profile_type,
            sub_type=effective_sub_type,
            request=request,
            path='data',
            allowed_scopes=ADMIN_PROFILE_IMAGE_INPUT_SCOPES,
            owner_user_id=current_owner_user_id,
        )
    if 'public_settings' in profile_data or 'notification_config' in profile_data or 'profile_type' in profile_data or 'sub_type' in profile_data:
        effective_notification_config = profile_data.get('notification_config', existing.get('notification_config'))
        profile_data['public_settings'] = normalize_profile_public_settings(
            profile_data.get('public_settings', existing.get('public_settings')),
            profile_type=effective_profile_type,
            legacy_settings=effective_notification_config,
            strict='public_settings' in profile_data,
        )
        profile_data['notification_config'] = build_legacy_notification_config(
            effective_notification_config,
            profile_data['public_settings'],
        )
    if (
        'public_settings_customized' in profile_data
        or 'public_settings' in profile_data
        or 'profile_type' in profile_data
        or 'sub_type' in profile_data
    ):
        effective_public_settings = profile_data.get('public_settings', existing.get('public_settings'))
        profile_data['public_settings_customized'] = await resolve_public_settings_customized_flag(
            profile_type=effective_profile_type,
            sub_type=effective_sub_type,
            public_settings=effective_public_settings,
            explicit_value=profile_data.get('public_settings_customized') if 'public_settings_customized' in profile_data else None,
        )
    profile_data['updated_at'] = datetime.now(timezone.utc).isoformat()
    
    result = await db.qr_profiles.update_one(
        {'id': profile_id},
        {'$set': profile_data}
    )
    
    if result.matched_count == 0:
        raise HTTPException(status_code=404, detail="Profile not found")
    return {'status': 'success'}

@api_router.patch("/admin/qr-profiles/{profile_id}/reassign")
async def admin_reassign_profile(profile_id: str, payload: AdminQRProfileReassign, request: Request):
    admin = await get_current_admin(request)

    profile = await db.qr_profiles.find_one({'id': profile_id}, {'_id': 0})
    if not profile:
        raise HTTPException(status_code=404, detail="Profile not found")

    target_user = await db.users.find_one({'id': payload.new_user_id}, {'_id': 0, 'password': 0})
    if not target_user:
        raise HTTPException(status_code=404, detail="Usuario destino no encontrado")

    normalized_target = normalize_user_document(target_user)
    if normalized_target.get('account_status') == 'deleted':
        raise HTTPException(status_code=400, detail="No puedes reasignar perfiles a una cuenta eliminada")

    if profile.get('profile_type') == 'business' and normalized_target.get('user_type') != 'business':
        raise HTTPException(status_code=400, detail="Los perfiles empresariales solo pueden reasignarse a cuentas empresa")

    image_field_cache: Dict[Tuple[str, str], Set[str]] = {}
    await validate_profile_upload_ownership(
        profile,
        owner_user_id=payload.new_user_id,
        request=request,
        image_field_cache=image_field_cache,
        allowed_scopes=ADMIN_PROFILE_IMAGE_INPUT_SCOPES,
    )

    await db.qr_profiles.update_one(
        {'id': profile_id},
        {'$set': {
            'user_id': payload.new_user_id,
            'updated_at': datetime.now(timezone.utc).isoformat(),
            'reassigned_by_admin_id': admin.get('id'),
        }}
    )
    updated = await db.qr_profiles.find_one({'id': profile_id}, {'_id': 0})
    return await sanitize_profile_document(updated, request=request)

@api_router.delete("/admin/qr-profiles/{profile_id}")
async def admin_delete_profile(profile_id: str, request: Request):
    admin = await get_current_admin(request)
    
    # Soft delete
    result = await db.qr_profiles.update_one(
        {'id': profile_id},
        {'$set': {'deleted_at': datetime.now(timezone.utc).isoformat(), 'status': 'paused'}}
    )
    
    if result.modified_count == 0:
        raise HTTPException(status_code=404, detail="Profile not found")
    
    return {'status': 'deleted'}

@api_router.patch("/admin/qr-profiles/{profile_id}/status")
async def admin_update_status(profile_id: str, status_data: Dict[str, str], request: Request):
    admin = await get_current_admin(request)
    
    new_status = status_data.get('status')
    if new_status not in ['subscription', 'indefinite', 'paused']:
        raise HTTPException(status_code=400, detail="Invalid status")
    
    result = await db.qr_profiles.update_one(
        {'id': profile_id},
        {'$set': {'status': new_status, 'updated_at': datetime.now(timezone.utc).isoformat()}}
    )
    
    if result.modified_count == 0:
        raise HTTPException(status_code=404, detail="Profile not found")
    
    return {'status': 'success'}

@api_router.get("/admin/scans")
async def get_all_scans(
    request: Request,
    skip: int = 0,
    limit: int = 100,
    profile_id: Optional[str] = None,
    start_date: Optional[str] = None,
    end_date: Optional[str] = None
):
    admin = await get_current_admin(request)
    
    query = {}
    if profile_id:
        query['qr_profile_id'] = profile_id
    
    if start_date:
        query['timestamp'] = {'$gte': start_date}
    if end_date:
        if 'timestamp' in query:
            query['timestamp']['$lte'] = end_date
        else:
            query['timestamp'] = {'$lte': end_date}
    
    scans = await db.location_scans.find(query, {'_id': 0}).skip(skip).limit(limit).to_list(limit)
    total = await db.location_scans.count_documents(query)
    
    # Enriquecer con información del perfil
    for scan in scans:
        profile = await db.qr_profiles.find_one({'id': scan['qr_profile_id']}, {'_id': 0, 'name': 1, 'alias': 1, 'hash': 1})
        if profile:
            scan['profile_info'] = profile
    
    return {'scans': scans, 'total': total}

# ==================== ADMIN STORE ====================

@api_router.get("/admin/store/products")
async def admin_get_store_products(
    request: Request,
    include_inactive: bool = True,
    category: Optional[str] = None,
    item_type: Optional[str] = None
):
    admin = await get_current_admin(request)
    query: Dict[str, Any] = {}
    if not include_inactive:
        query['active'] = {'$ne': False}
    if category:
        query['category'] = category
    if item_type:
        query['item_type'] = item_type

    products = await db.products.find(query, {'_id': 0}).sort('created_at', -1).to_list(500)
    return [normalize_product_document(product, request=request) for product in products]

@api_router.post("/admin/store/products")
async def admin_create_store_product(product_data: ProductBase, request: Request):
    admin = await get_current_admin(request)
    now = datetime.now(timezone.utc).isoformat()
    product_doc = sanitize_product_input_document(product_data.model_dump(), request=request)
    if product_doc.get('category') == 'business':
        product_doc['item_type'] = 'subscription_service'
    if product_doc.get('item_type') != 'subscription_service':
        product_doc['subscription_period'] = None
        product_doc['qr_quota_granted'] = 0
    else:
        product_doc['qr_quota_granted'] = parse_non_negative_int(product_doc.get('qr_quota_granted', 0), 0)

    product_doc.update({
        'id': str(uuid.uuid4()),
        'created_at': now,
        'updated_at': now,
    })
    await db.products.insert_one(product_doc)
    return normalize_product_document(product_doc, request=request)

@api_router.put("/admin/store/products/{product_id}")
async def admin_update_store_product(product_id: str, product_data: Dict[str, Any], request: Request):
    admin = await get_current_admin(request)
    existing_product = await db.products.find_one({'id': product_id}, {'_id': 0})
    if not existing_product:
        raise HTTPException(status_code=404, detail="Producto no encontrado")
    product_data = sanitize_product_input_document(
        product_data,
        request=request,
        existing_product=existing_product,
    )
    product_data['updated_at'] = datetime.now(timezone.utc).isoformat()
    if product_data.get('category') == 'business':
        product_data['item_type'] = 'subscription_service'
    if product_data.get('item_type') and product_data.get('item_type') != 'subscription_service':
        product_data['subscription_period'] = None
        product_data['qr_quota_granted'] = 0
    elif product_data.get('item_type') == 'subscription_service' or 'qr_quota_granted' in product_data:
        product_data['qr_quota_granted'] = parse_non_negative_int(product_data.get('qr_quota_granted', 0), 0)

    result = await db.products.update_one({'id': product_id}, {'$set': product_data})

    updated = await db.products.find_one({'id': product_id}, {'_id': 0})
    return normalize_product_document(updated, request=request)

@api_router.delete("/admin/store/products/{product_id}")
async def admin_delete_store_product(product_id: str, request: Request, hard_delete: bool = False):
    admin = await get_current_admin(request)
    if hard_delete:
        result = await db.products.delete_one({'id': product_id})
        if result.deleted_count == 0:
            raise HTTPException(status_code=404, detail="Producto no encontrado")
        return {'status': 'deleted_permanently'}

    result = await db.products.update_one(
        {'id': product_id},
        {'$set': {'active': False, 'updated_at': datetime.now(timezone.utc).isoformat()}}
    )
    if result.matched_count == 0:
        raise HTTPException(status_code=404, detail="Producto no encontrado")
    return {'status': 'deleted'}

@api_router.get("/admin/store/coupons")
async def admin_get_coupons(request: Request, include_inactive: bool = True):
    admin = await get_current_admin(request)
    query: Dict[str, Any] = {}
    if not include_inactive:
        query['active'] = True
    coupons = await db.coupons.find(query, {'_id': 0}).sort('created_at', -1).to_list(200)
    return sanitize_for_json(coupons)

@api_router.post("/admin/store/coupons")
async def admin_create_coupon(coupon_data: CouponBase, request: Request):
    admin = await get_current_admin(request)
    normalized_code = normalize_coupon_code(coupon_data.code)
    if not normalized_code:
        raise HTTPException(status_code=400, detail="Código de cupón inválido")

    existing = await db.coupons.find_one({'code': normalized_code}, {'_id': 0, 'code': 1})
    if existing:
        raise HTTPException(status_code=400, detail="El cupón ya existe")

    now = datetime.now(timezone.utc).isoformat()
    coupon_doc = coupon_data.model_dump()
    coupon_doc['code'] = normalized_code
    coupon_doc['usage_count'] = 0
    coupon_doc['created_at'] = now
    coupon_doc['updated_at'] = now
    await db.coupons.insert_one(coupon_doc)
    return sanitize_for_json(coupon_doc)

@api_router.put("/admin/store/coupons/{coupon_code}")
async def admin_update_coupon(coupon_code: str, coupon_data: Dict[str, Any], request: Request):
    admin = await get_current_admin(request)
    normalized_code = normalize_coupon_code(coupon_code)
    if not normalized_code:
        raise HTTPException(status_code=400, detail="Código de cupón inválido")

    if 'code' in coupon_data:
        coupon_data['code'] = normalize_coupon_code(coupon_data['code'])
    coupon_data['updated_at'] = datetime.now(timezone.utc).isoformat()

    result = await db.coupons.update_one({'code': normalized_code}, {'$set': coupon_data})
    if result.matched_count == 0:
        raise HTTPException(status_code=404, detail="Cupón no encontrado")

    updated_code = coupon_data.get('code', normalized_code)
    updated = await db.coupons.find_one({'code': updated_code}, {'_id': 0})
    return sanitize_for_json(updated)

@api_router.delete("/admin/store/coupons/{coupon_code}")
async def admin_delete_coupon(coupon_code: str, request: Request):
    admin = await get_current_admin(request)
    normalized_code = normalize_coupon_code(coupon_code)
    if not normalized_code:
        raise HTTPException(status_code=400, detail="Código de cupón inválido")

    result = await db.coupons.delete_one({'code': normalized_code})
    if result.deleted_count == 0:
        raise HTTPException(status_code=404, detail="Cupón no encontrado")
    return {'status': 'deleted'}

@api_router.post("/admin/store/coupons/seed-free")
async def admin_seed_free_coupon(request: Request):
    admin = await get_current_admin(request)
    coupon = await ensure_free_coupon_exists()
    return {'status': 'ok', 'coupon': coupon}

@api_router.get("/admin/config")
async def get_admin_config(request: Request):
    admin = await get_current_admin(request)
    configs = await db.admin_configs.find({}, {'_id': 0}).to_list(100)
    return configs

@api_router.put("/admin/config")
async def update_admin_config(config_data: AdminConfig, request: Request):
    admin = await get_current_admin(request)
    
    config_doc = config_data.model_dump()
    
    await db.admin_configs.update_one(
        {'profile_type': config_data.profile_type},
        {'$set': config_doc},
        upsert=True
    )
    
    return {'status': 'success'}

@api_router.get("/admin/leads")
async def admin_get_leads(
    request: Request,
    skip: int = 0,
    limit: int = 50,
    status: Optional[str] = None,
    search: Optional[str] = None
):
    admin = await get_current_admin(request)
    query: Dict[str, Any] = {}
    if status:
        query['status'] = status
    if search:
        query['$or'] = [
            {'name': {'$regex': search, '$options': 'i'}},
            {'email': {'$regex': search, '$options': 'i'}},
            {'phone': {'$regex': search, '$options': 'i'}},
            {'message': {'$regex': search, '$options': 'i'}},
            {'profile_name': {'$regex': search, '$options': 'i'}},
        ]

    total = await db.leads.count_documents(query)
    leads = await db.leads.find(query, {'_id': 0}).sort('timestamp', -1).skip(skip).limit(limit).to_list(limit)
    return {'leads': sanitize_for_json(leads), 'total': total}

@api_router.patch("/admin/leads/{lead_id}/status")
async def admin_update_lead_status(lead_id: str, payload: LeadStatusUpdate, request: Request):
    admin = await get_current_admin(request)
    result = await db.leads.update_one(
        {'id': lead_id},
        {'$set': {'status': payload.status, 'updated_at': datetime.now(timezone.utc).isoformat()}}
    )
    if result.matched_count == 0:
        raise HTTPException(status_code=404, detail="Lead no encontrado")
    return {'status': 'success'}

@api_router.get("/admin/leads/export")
async def admin_export_leads_csv(
    request: Request,
    status: Optional[str] = None,
    search: Optional[str] = None
):
    admin = await get_current_admin(request)
    query: Dict[str, Any] = {}
    if status:
        query['status'] = status
    if search:
        query['$or'] = [
            {'name': {'$regex': search, '$options': 'i'}},
            {'email': {'$regex': search, '$options': 'i'}},
            {'phone': {'$regex': search, '$options': 'i'}},
            {'message': {'$regex': search, '$options': 'i'}},
            {'profile_name': {'$regex': search, '$options': 'i'}},
        ]

    leads = await db.leads.find(query, {'_id': 0}).sort('timestamp', -1).to_list(100000)
    csv_bytes = build_leads_csv_bytes(leads)
    file_name = f"admin-leads-{datetime.now(timezone.utc).strftime('%Y%m%d%H%M%S')}.csv"
    headers = {'Content-Disposition': f'attachment; filename=\"{file_name}\"'}
    return StreamingResponse(io.BytesIO(csv_bytes), media_type='text/csv; charset=utf-8', headers=headers)

@api_router.get("/admin/analytics")
async def get_analytics(request: Request):
    admin = await get_current_admin(request)
    
    total_users = await db.users.count_documents({})
    total_profiles = await db.qr_profiles.count_documents({'deleted_at': None})
    total_scans = await db.location_scans.count_documents({})
    total_action_clicks = await db.action_events.count_documents({})
    total_leads = await db.leads.count_documents({})
    tracked_campaign_scans = await db.location_scans.count_documents({
        '$or': [
            {'campaign_source': {'$exists': True, '$nin': [None, '']}},
            {'campaign_name': {'$exists': True, '$nin': [None, '']}},
            {'variant': {'$exists': True, '$nin': [None, '']}},
        ]
    })
    total_orders = await db.orders.count_documents({})
    paid_orders = await db.orders.count_documents({'status': 'paid'})
    loyalty_points_issued_result = await db.users.aggregate([
        {'$group': {'_id': None, 'points': {'$sum': {'$ifNull': ['$loyalty_points_lifetime', 0]}}}}
    ]).to_list(1)
    loyalty_points_issued = int(loyalty_points_issued_result[0]['points']) if loyalty_points_issued_result else 0
    
    # Revenue
    pipeline = [
        {'$match': {'status': 'paid'}},
        {'$group': {'_id': None, 'total_revenue': {'$sum': {'$ifNull': ['$final_total', '$total']}}}}
    ]
    revenue_result = await db.orders.aggregate(pipeline).to_list(1)
    total_revenue = revenue_result[0]['total_revenue'] if revenue_result else 0
    cta_conversion_rate = round((total_action_clicks / total_scans) * 100, 2) if total_scans > 0 else 0.0
    lead_conversion_rate = round((total_leads / total_scans) * 100, 2) if total_scans > 0 else 0.0
    lead_from_click_rate = round((total_leads / total_action_clicks) * 100, 2) if total_action_clicks > 0 else 0.0
    
    return {
        'total_users': total_users,
        'total_profiles': total_profiles,
        'total_scans': total_scans,
        'total_action_clicks': total_action_clicks,
        'total_leads': total_leads,
        'tracked_campaign_scans': tracked_campaign_scans,
        'total_orders': total_orders,
        'paid_orders': paid_orders,
        'total_revenue': total_revenue,
        'loyalty_points_issued': loyalty_points_issued,
        'cta_conversion_rate': cta_conversion_rate,
        'lead_conversion_rate': lead_conversion_rate,
        'lead_from_click_rate': lead_from_click_rate,
    }

@api_router.get("/admin/analytics/daily-scans")
async def get_daily_scans(request: Request):
    admin = await get_current_admin(request)
    
    thirty_days_ago = (datetime.now(timezone.utc) - timedelta(days=30)).isoformat()
    scans = await db.location_scans.find(
        {'timestamp': {'$gte': thirty_days_ago}},
        {'_id': 0, 'timestamp': 1}
    ).to_list(100000)
    
    scans_by_day = {}
    for s in scans:
        day = s['timestamp'][:10] if isinstance(s['timestamp'], str) else s['timestamp'].strftime('%Y-%m-%d')
        scans_by_day[day] = scans_by_day.get(day, 0) + 1
    
    daily_data = []
    for i in range(30):
        day = (datetime.now(timezone.utc) - timedelta(days=29-i)).strftime('%Y-%m-%d')
        daily_data.append({'date': day, 'scans': scans_by_day.get(day, 0)})
    
    return daily_data

@api_router.get("/admin/qr-profiles/{profile_id}/download-qr")
async def admin_download_qr(profile_id: str, request: Request):
    admin = await get_current_admin(request)
    
    profile = await db.qr_profiles.find_one({'id': profile_id}, {'_id': 0})
    if not profile:
        raise HTTPException(status_code=404, detail="Profile not found")

    settings = await get_platform_settings(request=request)
    qr_image_bytes, media_type, _ = generate_qr_image(
        profile['hash'],
        generation_settings=settings.get('qr_generation'),
    )
    return StreamingResponse(io.BytesIO(qr_image_bytes), media_type=media_type)

@api_router.get("/admin/profile-types-config")
async def get_profile_types_config(request: Request):
    admin = await get_current_admin(request)
    
    config = await db.admin_configs.find_one({'config_type': 'profile_types'}, {'_id': 0})
    if config and 'data' in config:
        merged, changed = merge_profile_types_config_with_patches(config['data'])
        if changed:
            await db.admin_configs.update_one(
                {'config_type': 'profile_types'},
                {'$set': {'data': merged, 'updated_at': datetime.now(timezone.utc).isoformat()}}
            )
        return merged
    return build_default_profile_types_config()

@api_router.put("/admin/profile-types-config")
async def update_profile_types_config(config_data: Dict[str, Any], request: Request):
    admin = await get_current_admin(request)

    merged_config, _ = merge_profile_types_config_with_patches(config_data)
    await db.admin_configs.update_one(
        {'config_type': 'profile_types'},
        {'$set': {'config_type': 'profile_types', 'data': merged_config, 'updated_at': datetime.now(timezone.utc).isoformat()}},
        upsert=True
    )
    return {'status': 'success'}

@api_router.get("/admin/settings")
async def get_admin_settings(request: Request):
    admin = await get_current_admin(request)
    return await get_platform_settings(request=request)

@api_router.put("/admin/settings")
async def update_admin_settings(settings_data: Dict[str, Any], request: Request):
    admin = await get_current_admin(request)
    settings_data = sanitize_settings_image_fields(
        settings_data,
        request=request,
        allowed_scope_by_field=SETTINGS_IMAGE_ALLOWED_SCOPES,
    )

    settings_data.setdefault('brand_logo_url', '')
    settings_data.setdefault('favicon_url', '')
    settings_data.setdefault('seo_title', 'QR Profiles | Plataforma de perfiles QR')
    settings_data.setdefault('seo_description', 'Crea, administra y optimiza perfiles QR para empresas y personas.')
    settings_data.setdefault('seo_keywords', 'QR, perfiles QR, tarjetas QR, marketing QR')
    settings_data.setdefault('seo_og_image_url', '')
    settings_data.setdefault('seo_indexing_enabled', True)
    settings_data.setdefault('default_qr_expiration_days', 365)
    settings_data.setdefault('max_qr_per_person', 5)
    settings_data.setdefault('max_qr_per_business', 50)
    settings_data.setdefault('allow_person_create_qr', False)
    settings_data.setdefault('allow_business_create_qr', True)
    settings_data.setdefault('qr_generation', copy.deepcopy(DEFAULT_QR_GENERATION_SETTINGS))
    settings_data.setdefault('enable_notifications_email', False)
    settings_data.setdefault('notification_email_sender', '')
    settings_data.setdefault('enable_store', True)
    settings_data.setdefault('enable_coupons', True)
    settings_data.setdefault('default_shipping_cost', 2990)
    settings_data.setdefault('shipping_regions', build_default_shipping_regions(settings_data.get('default_shipping_cost', 2990)))
    settings_data.setdefault('store_theme_mode', 'default')
    settings_data.setdefault('store_primary_color', '#111827')
    settings_data.setdefault('store_secondary_color', '#1f2937')
    settings_data.setdefault('store_accent_color', '#0ea5e9')
    settings_data.setdefault('store_home_banner_url', '')
    settings_data.setdefault('store_support_email', '')
    settings_data.setdefault('store_support_whatsapp', '')
    settings_data.setdefault('store_enable_guest_checkout', False)
    settings_data.setdefault('store_enable_out_of_stock_waitlist', False)
    settings_data.setdefault('enable_google_reviews_cta', False)
    settings_data.setdefault('google_review_link', '')
    settings_data.setdefault('google_review_place_id', '')
    settings_data.setdefault('enable_whatsapp_cta', False)
    settings_data.setdefault('whatsapp_number', '')
    settings_data.setdefault('whatsapp_default_message', 'Hola, te contacto desde el QR.')
    settings_data.setdefault('enable_whatsapp_after_scan', False)
    settings_data.setdefault('enable_campaign_tracking', True)
    settings_data.setdefault('enable_ab_tracking', True)
    settings_data.setdefault('enable_loyalty_program', False)
    settings_data.setdefault('loyalty_points_per_scan', 1)
    settings_data.setdefault('loyalty_redeem_threshold', 50)
    settings_data.setdefault('enable_public_lead_form', True)
    settings_data.setdefault('lead_form_title', 'Solicitar Contacto')
    settings_data.setdefault('lead_form_success_message', 'Mensaje enviado')
    settings_data.setdefault('require_lead_phone_or_email', True)
    settings_data.setdefault('lead_rate_limit_window_seconds', 60)
    settings_data.setdefault('lead_rate_limit_max_requests', 3)
    settings_data.setdefault('enable_lead_honeypot', True)
    settings_data.setdefault('enable_lead_turnstile', False)
    settings_data.setdefault('turnstile_site_key', '')
    settings_data.setdefault('turnstile_secret_key', '')
    settings_data.setdefault('enable_lead_notifications', False)
    settings_data.setdefault('lead_notification_emails', '')
    settings_data.setdefault('lead_notification_webhook_url', '')
    settings_data.setdefault('enforce_master_only_subscription_purchase', True)
    settings_data.setdefault('allow_admin_manual_subscription_grants', True)
    settings_data['default_shipping_cost'] = parse_non_negative_float(settings_data.get('default_shipping_cost', 0), 0)
    settings_data['shipping_regions'] = normalize_shipping_regions_config(
        settings_data.get('shipping_regions'),
        settings_data['default_shipping_cost']
    )
    settings_data['qr_generation'] = normalize_qr_generation_settings(settings_data.get('qr_generation'))

    await db.admin_configs.update_one(
        {'config_type': 'platform_settings'},
        {'$set': {'config_type': 'platform_settings', 'data': settings_data, 'updated_at': datetime.now(timezone.utc).isoformat()}},
        upsert=True
    )
    if settings_data.get('enable_coupons'):
        await ensure_free_coupon_exists()
    return {'status': 'success'}

@api_router.post("/admin/settings/seed-free-coupon")
async def admin_settings_seed_free_coupon(request: Request):
    admin = await get_current_admin(request)
    coupon = await ensure_free_coupon_exists()
    return {'status': 'ok', 'coupon': coupon}

# Include router
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

@app.on_event("startup")
async def startup_db():
    # Crear índices
    try:
        await db.users.create_index('email', unique=True)
    except:
        pass
    await db.users.create_index('account_status')
    await db.users.create_index('parent_account_id')
    try:
        await db.qr_profiles.create_index('hash', unique=True)
    except:
        pass
    await db.qr_profiles.create_index('user_id')
    await db.location_scans.create_index('qr_profile_id')
    await db.location_scans.create_index('timestamp')
    await db.location_scans.create_index([('campaign_source', 1), ('campaign_name', 1)])
    await db.location_scans.create_index('variant')
    await db.action_events.create_index('owner_user_id')
    await db.action_events.create_index('timestamp')
    await db.action_events.create_index([('action_type', 1), ('timestamp', -1)])
    await db.leads.create_index('owner_user_id')
    await db.leads.create_index('qr_profile_id')
    await db.leads.create_index('status')
    await db.leads.create_index('timestamp')
    await db.leads.create_index([('qr_hash', 1), ('client_ip', 1), ('timestamp', -1)])
    try:
        await db.products.create_index('id', unique=True)
    except:
        pass
    try:
        await db.coupons.create_index('code', unique=True)
    except:
        pass
    await db.orders.create_index('user_id')
    await db.orders.create_index('id')
    
    # Crear productos de ejemplo si no existen
    count = await db.products.count_documents({})
    if count == 0:
        now = datetime.now(timezone.utc).isoformat()
        sample_products = [
            {
                'id': str(uuid.uuid4()),
                'name': 'QR Médico - Pulsera',
                'description': 'Pulsera con QR para información médica de emergencia',
                'price': 15990,
                'category': 'personal',
                'image_url': '',
                'stock': 100,
                'item_type': 'product',
                'active': True,
                'auto_generate_qr': True,
                'auto_qr_profile_type': 'personal',
                'auto_qr_sub_type': 'medico',
                'visible_to': 'person',
                'created_at': now,
                'updated_at': now,
            },
            {
                'id': str(uuid.uuid4()),
                'name': 'QR Mascota - Placa',
                'description': 'Placa identificadora con QR para mascotas',
                'price': 12990,
                'category': 'personal',
                'image_url': '',
                'stock': 100,
                'item_type': 'product',
                'active': True,
                'auto_generate_qr': True,
                'auto_qr_profile_type': 'personal',
                'auto_qr_sub_type': 'mascota',
                'visible_to': 'person',
                'created_at': now,
                'updated_at': now,
            },
            {
                'id': str(uuid.uuid4()),
                'name': 'QR Vehículo - Adhesivo',
                'description': 'Adhesivo con QR para información del vehículo',
                'price': 8990,
                'category': 'personal',
                'image_url': '',
                'stock': 100,
                'item_type': 'product',
                'active': True,
                'auto_generate_qr': True,
                'auto_qr_profile_type': 'personal',
                'auto_qr_sub_type': 'vehiculo',
                'visible_to': 'person',
                'created_at': now,
                'updated_at': now,
            },
            {
                'id': str(uuid.uuid4()),
                'name': 'Suscripción Empresa Start 10 QR',
                'description': 'Suscripción mensual para empresas con 10 cupos QR',
                'price': 19990,
                'category': 'business',
                'image_url': '',
                'stock': 9999,
                'item_type': 'subscription_service',
                'subscription_period': 'monthly',
                'qr_quota_granted': 10,
                'active': True,
                'auto_generate_qr': False,
                'auto_qr_profile_type': 'business',
                'auto_qr_sub_type': 'tarjeta',
                'visible_to': 'business',
                'created_at': now,
                'updated_at': now,
            },
            {
                'id': str(uuid.uuid4()),
                'name': 'Suscripción Empresa Pro 50 QR',
                'description': 'Suscripción mensual para empresas con 50 cupos QR',
                'price': 49990,
                'category': 'business',
                'image_url': '',
                'stock': 9999,
                'item_type': 'subscription_service',
                'subscription_period': 'monthly',
                'qr_quota_granted': 50,
                'active': True,
                'auto_generate_qr': False,
                'auto_qr_profile_type': 'business',
                'auto_qr_sub_type': 'tarjeta',
                'visible_to': 'business',
                'created_at': now,
                'updated_at': now,
            },
            {
                'id': str(uuid.uuid4()),
                'name': 'Suscripción Empresa Enterprise 200 QR',
                'description': 'Suscripción anual para empresas con 200 cupos QR',
                'price': 169990,
                'category': 'business',
                'image_url': '',
                'stock': 9999,
                'item_type': 'subscription_service',
                'subscription_period': 'yearly',
                'qr_quota_granted': 200,
                'active': True,
                'auto_generate_qr': False,
                'auto_qr_profile_type': 'business',
                'auto_qr_sub_type': 'tarjeta',
                'visible_to': 'business',
                'created_at': now,
                'updated_at': now,
            }
        ]
        await db.products.insert_many(sample_products)
        logger.info("Sample products created")

    # Migrar productos empresariales legacy a suscripciones con cupos QR
    legacy_business_products = await db.products.find(
        {'category': 'business', 'item_type': 'product'},
        {'_id': 0, 'id': 1, 'name': 1}
    ).to_list(500)
    for product in legacy_business_products:
        quota_guess = estimate_quota_from_product_name(product.get('name'), fallback=10)
        await db.products.update_one(
            {'id': product['id']},
            {'$set': {
                'item_type': 'subscription_service',
                'subscription_period': 'monthly',
                'qr_quota_granted': quota_guess,
                'updated_at': datetime.now(timezone.utc).isoformat()
            }}
        )

    await db.products.update_many(
        {'item_type': 'subscription_service', 'qr_quota_granted': {'$exists': False}},
        {'$set': {'qr_quota_granted': 10, 'updated_at': datetime.now(timezone.utc).isoformat()}}
    )
    await db.products.update_many(
        {'visible_to': {'$exists': False}, 'category': 'business'},
        {'$set': {'visible_to': 'business', 'updated_at': datetime.now(timezone.utc).isoformat()}}
    )
    await db.products.update_many(
        {'visible_to': {'$exists': False}, 'category': 'personal'},
        {'$set': {'visible_to': 'person', 'updated_at': datetime.now(timezone.utc).isoformat()}}
    )
    await db.products.update_many(
        {'visible_to': {'$exists': False}, 'category': {'$nin': ['business', 'personal']}},
        {'$set': {'visible_to': 'visitor', 'updated_at': datetime.now(timezone.utc).isoformat()}}
    )

    # Asegurar configuración base de tienda y cupones
    default_settings = {
        'site_name': 'QR Profiles',
        'site_description': 'Plataforma de gestión de perfiles QR',
        'brand_logo_url': '',
        'favicon_url': '',
        'seo_title': 'QR Profiles | Plataforma de perfiles QR',
        'seo_description': 'Crea, administra y optimiza perfiles QR para empresas y personas.',
        'seo_keywords': 'QR, perfiles QR, tarjetas QR, marketing QR',
        'seo_og_image_url': '',
        'seo_indexing_enabled': True,
        'currency': 'CLP',
        'enable_payments': False,
        'default_qr_expiration_days': 365,
        'max_qr_per_person': 5,
        'max_qr_per_business': 50,
        'allow_person_create_qr': False,
        'allow_business_create_qr': True,
        'qr_generation': copy.deepcopy(DEFAULT_QR_GENERATION_SETTINGS),
        'enable_notifications_email': False,
        'notification_email_sender': '',
        'enable_store': True,
        'enable_coupons': True,
        'default_shipping_cost': 2990,
        'shipping_regions': build_default_shipping_regions(2990),
        'store_theme_mode': 'default',
        'store_primary_color': '#111827',
        'store_secondary_color': '#1f2937',
        'store_accent_color': '#0ea5e9',
        'store_home_banner_url': '',
        'store_support_email': '',
        'store_support_whatsapp': '',
        'store_enable_guest_checkout': False,
        'store_enable_out_of_stock_waitlist': False,
        'enable_google_reviews_cta': False,
        'google_review_link': '',
        'google_review_place_id': '',
        'enable_whatsapp_cta': False,
        'whatsapp_number': '',
        'whatsapp_default_message': 'Hola, te contacto desde el QR.',
        'enable_whatsapp_after_scan': False,
        'enable_campaign_tracking': True,
        'enable_ab_tracking': True,
        'enable_loyalty_program': False,
        'loyalty_points_per_scan': 1,
        'loyalty_redeem_threshold': 50,
        'enable_public_lead_form': True,
        'lead_form_title': 'Solicitar Contacto',
        'lead_form_success_message': 'Mensaje enviado',
        'require_lead_phone_or_email': True,
        'lead_rate_limit_window_seconds': 60,
        'lead_rate_limit_max_requests': 3,
        'enable_lead_honeypot': True,
        'enable_lead_turnstile': False,
        'turnstile_site_key': '',
        'turnstile_secret_key': '',
        'enable_lead_notifications': False,
        'lead_notification_emails': '',
        'lead_notification_webhook_url': '',
        'enforce_master_only_subscription_purchase': True,
        'allow_admin_manual_subscription_grants': True,
    }
    settings_doc = await db.admin_configs.find_one({'config_type': 'platform_settings'}, {'_id': 0, 'data': 1})
    if not settings_doc or not isinstance(settings_doc.get('data'), dict):
        await db.admin_configs.update_one(
            {'config_type': 'platform_settings'},
            {'$set': {
                'config_type': 'platform_settings',
                'data': default_settings,
                'updated_at': datetime.now(timezone.utc).isoformat()
            }},
            upsert=True
        )
    else:
        current_data = settings_doc['data']
        needs_update = False
        for key, value in default_settings.items():
            if key not in current_data:
                current_data[key] = value
                needs_update = True
        normalized_default_shipping = parse_non_negative_float(current_data.get('default_shipping_cost', 2990), 2990)
        if current_data.get('default_shipping_cost') != normalized_default_shipping:
            current_data['default_shipping_cost'] = normalized_default_shipping
            needs_update = True
        normalized_regions = normalize_shipping_regions_config(
            current_data.get('shipping_regions'),
            normalized_default_shipping
        )
        if current_data.get('shipping_regions') != normalized_regions:
            current_data['shipping_regions'] = normalized_regions
            needs_update = True
        normalized_qr_generation = normalize_qr_generation_settings(current_data.get('qr_generation'))
        if current_data.get('qr_generation') != normalized_qr_generation:
            current_data['qr_generation'] = normalized_qr_generation
            needs_update = True
        if needs_update:
            await db.admin_configs.update_one(
                {'config_type': 'platform_settings'},
                {'$set': {'data': current_data, 'updated_at': datetime.now(timezone.utc).isoformat()}}
            )

    profile_types_doc = await db.admin_configs.find_one({'config_type': 'profile_types'}, {'_id': 0, 'data': 1})
    if profile_types_doc and isinstance(profile_types_doc.get('data'), dict):
        merged_profile_types, profile_types_changed = merge_profile_types_config_with_patches(profile_types_doc['data'])
        if profile_types_changed:
            await db.admin_configs.update_one(
                {'config_type': 'profile_types'},
                {'$set': {'data': merged_profile_types, 'updated_at': datetime.now(timezone.utc).isoformat()}}
            )
    else:
        await db.admin_configs.update_one(
            {'config_type': 'profile_types'},
            {'$set': {
                'config_type': 'profile_types',
                'data': build_default_profile_types_config(),
                'updated_at': datetime.now(timezone.utc).isoformat(),
            }},
            upsert=True
        )

    await ensure_free_coupon_exists()

    # Normalizar cuentas existentes para soporte de master/subcuentas
    await db.users.update_many(
        {'account_status': {'$exists': False}},
        {'$set': {'account_status': 'active', 'updated_at': datetime.now(timezone.utc).isoformat()}}
    )
    await db.users.update_many(
        {'account_role': {'$exists': False}, 'user_type': 'business'},
        {'$set': {'account_role': 'master', 'updated_at': datetime.now(timezone.utc).isoformat()}}
    )
    await db.users.update_many(
        {'account_role': {'$exists': False}, 'user_type': {'$ne': 'business'}},
        {'$set': {'account_role': 'standard', 'updated_at': datetime.now(timezone.utc).isoformat()}}
    )
    await db.users.update_many(
        {'parent_account_id': {'$exists': False}},
        {'$set': {'parent_account_id': None}}
    )
    await db.users.update_many(
        {'permissions': {'$exists': False}, 'account_role': 'master'},
        {'$set': {'permissions': get_default_permissions_for_role('master')}}
    )
    await db.users.update_many(
        {'permissions': {'$exists': False}, 'account_role': 'subaccount'},
        {'$set': {'permissions': get_default_permissions_for_role('subaccount')}}
    )
    await db.users.update_many(
        {'permissions': {'$exists': False}, 'account_role': 'standard'},
        {'$set': {'permissions': get_default_permissions_for_role('standard')}}
    )
    await db.users.update_many(
        {'loyalty_points_balance': {'$exists': False}},
        {'$set': {'loyalty_points_balance': 0}}
    )
    await db.users.update_many(
        {'loyalty_points_lifetime': {'$exists': False}},
        {'$set': {'loyalty_points_lifetime': 0}}
    )
    await db.users.update_many(
        {'qr_quota_balance': {'$exists': False}},
        {'$set': {'qr_quota_balance': 0}}
    )
    await db.users.update_many(
        {'qr_quota_lifetime': {'$exists': False}},
        {'$set': {'qr_quota_lifetime': 0}}
    )
    await db.users.update_many(
        {'qr_subscription_buckets': {'$exists': False}},
        {'$set': {'qr_subscription_buckets': []}}
    )
    await db.qr_profiles.update_many(
        {'action_click_count': {'$exists': False}},
        {'$set': {'action_click_count': 0}}
    )
    await db.qr_profiles.update_many(
        {'public_settings': {'$exists': False}},
        {'$set': {'public_settings': {
            'request_location_automatically': False,
            'top_profile_photo_enabled': False,
            'top_profile_photo_shape': 'circle',
            'floating_buttons': [],
        }}}
    )
    await db.qr_profiles.update_many(
        {'public_settings_customized': {'$exists': False}},
        {'$set': {'public_settings_customized': False}}
    )
    
    # Crear usuario admin si no existe
    admin_email = 'admin@qrprofiles.com'
    admin_exists = await db.users.find_one({'email': admin_email})
    if not admin_exists:
        admin_user = {
            'id': str(uuid.uuid4()),
            'email': admin_email,
            'password': hash_password('admin123'),
            'name': 'Administrator',
            'user_type': 'person',
            'is_admin': True,
            'account_status': 'active',
            'account_role': 'standard',
            'parent_account_id': None,
            'permissions': get_default_permissions_for_role('standard'),
            'qr_quota_balance': 0,
            'qr_quota_lifetime': 0,
            'qr_subscription_buckets': [],
            'created_at': datetime.now(timezone.utc).isoformat(),
            'updated_at': datetime.now(timezone.utc).isoformat(),
        }
        await db.users.insert_one(admin_user)
        logger.info(f"Admin user created: {admin_email} / admin123")

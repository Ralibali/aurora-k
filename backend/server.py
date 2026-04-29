from datetime import datetime
import logging
import os
from pathlib import Path
from typing import List, Optional
import uuid

from dotenv import load_dotenv
from fastapi import APIRouter, FastAPI, HTTPException, status
from motor.motor_asyncio import AsyncIOMotorClient
from pydantic import BaseModel, Field
from starlette.middleware.cors import CORSMiddleware


ROOT_DIR = Path(__file__).parent
load_dotenv(ROOT_DIR / ".env")

logging.basicConfig(
    level=logging.INFO,
    format="%(asctime)s - %(name)s - %(levelname)s - %(message)s",
)
logger = logging.getLogger(__name__)

mongo_url = os.environ.get("MONGO_URL")
db_name = os.environ.get("DB_NAME")

client: Optional[AsyncIOMotorClient] = None
db = None

if mongo_url and db_name:
    client = AsyncIOMotorClient(mongo_url)
    db = client[db_name]
    logger.info("MongoDB configured for database '%s'", db_name)
else:
    logger.warning(
        "MongoDB is not configured. Set MONGO_URL and DB_NAME to enable database-backed endpoints."
    )

app = FastAPI(title="Aurora Transport API")
api_router = APIRouter(prefix="/api")


class StatusCheck(BaseModel):
    id: str = Field(default_factory=lambda: str(uuid.uuid4()))
    client_name: str
    timestamp: datetime = Field(default_factory=datetime.utcnow)


class StatusCheckCreate(BaseModel):
    client_name: str


def require_database():
    if db is None:
        raise HTTPException(
            status_code=status.HTTP_503_SERVICE_UNAVAILABLE,
            detail="Backend database is not configured. Set MONGO_URL and DB_NAME.",
        )
    return db


@api_router.get("/")
async def root():
    return {
        "name": "Aurora Transport API",
        "status": "ok",
        "database_configured": db is not None,
    }


@api_router.get("/health")
async def health_check():
    return {
        "status": "ok",
        "database_configured": db is not None,
    }


@api_router.post("/status", response_model=StatusCheck)
async def create_status_check(input: StatusCheckCreate):
    database = require_database()
    status_obj = StatusCheck(**input.model_dump())
    await database.status_checks.insert_one(status_obj.model_dump())
    return status_obj


@api_router.get("/status", response_model=List[StatusCheck])
async def get_status_checks():
    database = require_database()
    status_checks = await database.status_checks.find().to_list(1000)
    return [StatusCheck(**status_check) for status_check in status_checks]


app.include_router(api_router)

app.add_middleware(
    CORSMiddleware,
    allow_credentials=True,
    allow_origins=os.environ.get("CORS_ORIGINS", "*").split(","),
    allow_methods=["*"],
    allow_headers=["*"],
)


@app.on_event("shutdown")
async def shutdown_db_client():
    if client is not None:
        client.close()

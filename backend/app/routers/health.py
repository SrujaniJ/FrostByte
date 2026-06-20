from fastapi import APIRouter
from sqlalchemy import text
from app.db.base import AsyncSessionLocal

router = APIRouter()


@router.get("/health")
async def health():
    async with AsyncSessionLocal() as session:
        await session.execute(text("SELECT 1"))
    return {"status": "ok"}

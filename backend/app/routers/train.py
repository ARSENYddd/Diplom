from fastapi import APIRouter
from app.services.training import train_model

router = APIRouter()

@router.post("/")
async def train(model_type: str = "hybrid"):
    metrics = train_model(model_type)
    return {"model": model_type, "metrics": metrics}

from fastapi import APIRouter
from app.services.training import predict

router = APIRouter()

@router.get("/")
async def get_prediction(model_type: str = "hybrid"):
    forecast = predict(model_type)
    return {"model": model_type, "forecast": forecast}

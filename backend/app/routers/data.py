from fastapi import APIRouter, UploadFile
import pandas as pd
from app.utils.file_handler import save_file

router = APIRouter()

@router.post("/upload")
async def upload_data(file: UploadFile):
    filepath = await save_file(file)
    df = pd.read_csv(filepath)  # TODO: Excel тоже поддержать
    return {"rows": len(df), "columns": list(df.columns)}

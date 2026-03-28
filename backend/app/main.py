from fastapi import FastAPI
from app.routers import data, train, predict, metrics

app = FastAPI(title="Financial Forecasting API", version="0.1")

# Роутеры
app.include_router(data.router, prefix="/data", tags=["Data"])
app.include_router(train.router, prefix="/train", tags=["Training"])
app.include_router(predict.router, prefix="/predict", tags=["Prediction"])
app.include_router(metrics.router, prefix="/metrics", tags=["Metrics"])

@app.get("/")
def root():
    return {"message": "API is running"}

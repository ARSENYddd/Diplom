def train_model(model_type: str):
    # Здесь подключаем ARIMA/LSTM/Hybrid и возвращаем метрики
    return {"MAE": 0.05, "RMSE": 0.12}

def predict(model_type: str):
    # Возвращаем фиктивный прогноз
    return [100, 102, 105, 103, 108]

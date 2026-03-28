import { useState } from "react";
import { trainModel } from "../services/api";
import { useNavigate } from "react-router-dom";

export default function Train() {
  const [modelType, setModelType] = useState("hybrid");
  const [metrics, setMetrics] = useState(null);
  const [loading, setLoading] = useState(false);
  const navigate = useNavigate();

  const handleTrain = async () => {
    setLoading(true);
    const res = await trainModel(modelType);
    setMetrics(res.metrics);
    setLoading(false);
  };

  return (
    <div className="p-6">
      <h1 className="text-2xl font-bold mb-4">Train Model</h1>

      <div className="mb-4">
        <label className="block mb-2 font-semibold">Select Model Type:</label>
        <select
          value={modelType}
          onChange={(e) => setModelType(e.target.value)}
          className="border px-3 py-2 rounded w-64"
        >
          <option value="arima_lstm">ARIMA + LSTM</option>
          <option value="garch_transformer">GARCH + Transformer</option>
          <option value="hybrid">Hybrid</option>
        </select>
      </div>

      <button
        onClick={handleTrain}
        className="bg-blue-500 text-white px-4 py-2 rounded hover:bg-blue-600"
      >
        {loading ? "Training..." : "Start Training"}
      </button>

      {metrics && (
        <div className="mt-6 bg-white shadow rounded p-4">
          <h2 className="text-xl font-semibold mb-2">Training Metrics</h2>
          <p>MAE: {metrics.MAE}</p>
          <p>RMSE: {metrics.RMSE}</p>
          <button
            onClick={() => navigate("/results")}
            className="mt-2 bg-green-500 text-white px-3 py-1 rounded hover:bg-green-600"
          >
            View Forecast
          </button>
        </div>
      )}
    </div>
  );
}

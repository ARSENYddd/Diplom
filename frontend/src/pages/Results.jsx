import { useEffect, useState } from "react";
import { getPrediction } from "../services/api";
import { LineChart, Line, XAxis, YAxis, Tooltip, CartesianGrid } from "recharts";

export default function Results() {
  const [forecast, setForecast] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    getPrediction().then((res) => {
      // Подготовка данных для графика
      const chartData = (res.forecast || []).map((val, idx) => ({
        index: idx + 1,
        value: val,
      }));
      setForecast(chartData);
      setLoading(false);
    });
  }, []);

  return (
    <div className="p-6">
      <h1 className="text-2xl font-bold mb-4">Forecast Results</h1>

      {loading ? (
        <p>Loading forecast...</p>
      ) : forecast.length ? (
        <LineChart width={600} height={300} data={forecast}>
          <XAxis dataKey="index" />
          <YAxis />
          <Tooltip />
          <CartesianGrid stroke="#eee" strokeDasharray="5 5" />
          <Line type="monotone" dataKey="value" stroke="#8884d8" />
        </LineChart>
      ) : (
        <p>No forecast available.</p>
      )}
    </div>
  );
}

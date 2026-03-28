import { useState, useEffect } from "react";
import { getPrediction } from "../services/api";
import { Link } from "react-router-dom";

export default function Dashboard() {
  const [forecast, setForecast] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    getPrediction().then((res) => {
      setForecast(res.forecast || []);
      setLoading(false);
    });
  }, []);

  return (
    <div className="p-6">
      <h1 className="text-2xl font-bold mb-4">Dashboard</h1>
      <div className="mb-6">
        <Link
          to="/upload"
          className="bg-blue-500 text-white px-4 py-2 rounded mr-4 hover:bg-blue-600"
        >
          Upload Data
        </Link>
        <Link
          to="/results"
          className="bg-green-500 text-white px-4 py-2 rounded hover:bg-green-600"
        >
          View Results
        </Link>
      </div>

      <div className="bg-white shadow rounded p-4">
        <h2 className="text-xl font-semibold mb-2">Latest Forecast</h2>
        {loading ? (
          <p>Loading forecast...</p>
        ) : forecast.length ? (
          <ul className="list-disc pl-5">
            {forecast.map((val, idx) => (
              <li key={idx}>{val}</li>
            ))}
          </ul>
        ) : (
          <p>No forecast available yet.</p>
        )}
      </div>
    </div>
  );
}

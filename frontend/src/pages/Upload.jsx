import { useState } from "react";
import { uploadFile } from "../services/api";
import { useNavigate } from "react-router-dom";

export default function Upload() {
  const [info, setInfo] = useState(null);
  const [file, setFile] = useState(null);
  const [loading, setLoading] = useState(false);
  const navigate = useNavigate();

  const handleUpload = async () => {
    if (!file) return;
    setLoading(true);
    const result = await uploadFile(file);
    setInfo(result);
    setLoading(false);
  };

  return (
    <div className="p-6">
      <h1 className="text-2xl font-bold mb-4">Upload Data</h1>

      <input
        type="file"
        onChange={(e) => setFile(e.target.files[0])}
        className="mb-4"
      />
      <button
        onClick={handleUpload}
        className="bg-blue-500 text-white px-4 py-2 rounded hover:bg-blue-600"
      >
        {loading ? "Uploading..." : "Upload"}
      </button>

      {info && (
        <div className="mt-4 bg-white shadow rounded p-4">
          <h2 className="text-xl font-semibold mb-2">File Info</h2>
          <p>Rows: {info.rows}</p>
          <p>Columns: {info.columns.join(", ")}</p>
          <button
            onClick={() => navigate("/train")}
            className="mt-2 bg-green-500 text-white px-3 py-1 rounded hover:bg-green-600"
          >
            Train Model
          </button>
        </div>
      )}
    </div>
  );
}

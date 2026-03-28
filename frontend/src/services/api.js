const API_URL = "http://localhost:8000";

export async function uploadFile(file) {
  const formData = new FormData();
  formData.append("file", file);
  const res = await fetch(`${API_URL}/data/upload`, {
    method: "POST",
    body: formData,
  });
  return res.json();
}

export async function trainModel(type = "hybrid") {
  const res = await fetch(`${API_URL}/train?model_type=${type}`, { method: "POST" });
  return res.json();
}

export async function getPrediction(type = "hybrid") {
  const res = await fetch(`${API_URL}/predict?model_type=${type}`);
  return res.json();
}

import axios from "axios";

const API_BASE_URL = "http://localhost:5001/api/decisions";

function getApiError(error, fallback) {
  return error.response?.data?.error || error.message || fallback;
}

export async function uploadDecision(file) {
  if (!file?.name.toLowerCase().endsWith(".json")) {
    throw new Error("Please upload a valid JSON file.");
  }

  const formData = new FormData();
  formData.append("file", file);

  try {
    const response = await axios.post(`${API_BASE_URL}/upload`, formData);
    const decision = response.data?.decision;

    if (!decision?.id) {
      throw new Error("The server did not return a valid decision.");
    }

    const pathResponse = await axios.get(
      `${API_BASE_URL}/${decision.id}/path`
    );
    const path = pathResponse.data?.data?.[0];

    if (!path?.decision) {
      throw new Error("The server did not return the saved decision path.");
    }

    return path;
  } catch (error) {
    console.error("Upload failed:", error);
    console.error("Backend response:", error.response?.data);
    throw new Error(getApiError(error, "Failed to upload decision."), {
      cause: error,
    });
  }
}

export async function getDecisionPath(decisionId) {
  try {
    const response = await axios.get(`${API_BASE_URL}/${decisionId}/path`);
    return response.data?.data || [];
  } catch (error) {
    console.error("Failed to fetch decision path:", error);
    throw new Error(getApiError(error, "Failed to fetch decision path."), {
      cause: error,
    });
  }
}

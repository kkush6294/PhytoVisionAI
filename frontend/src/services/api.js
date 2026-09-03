import axios from "axios";

const API_BASE_URL = "http://127.0.0.1:5000";

const api = axios.create({
  baseURL: API_BASE_URL,
});

api.interceptors.request.use((config) => {
  const token = localStorage.getItem("phyto_token");
  if (token) {
    config.headers.Authorization = `Bearer ${token}`;
  }
  return config;
});

// Image Prediction (Multipart)
export const predictImage = async (file) => {
  const formData = new FormData();
  formData.append("image", file);
  const response = await api.post("/api/predict", formData, {
    headers: { "Content-Type": "multipart/form-data" },
  });
  return response.data;
};

// Phase 2.5: Extraction Retrieval
export const getPlantExtraction = async (idOrClass) => {
  const response = await api.get(`/api/extraction/${encodeURIComponent(idOrClass)}`);
  return response.data;
};

// Phase 2.5: Safety & Dosage Guidance
export const getPlantSafety = async (idOrClass) => {
  const response = await api.get(`/api/safety/${encodeURIComponent(idOrClass)}`);
  return response.data;
};

// Phase 2.5: Condition & Symptom Recommendations
export const getRecommendationsByCondition = async (condition) => {
  const response = await api.get(`/api/recommendations/condition/${encodeURIComponent(condition)}`);
  return response.data;
};

// Phase 2.4: Saved Plants
export const checkSavedStatus = async (plantId) => {
  const response = await api.get(`/api/saved-plants/check/${encodeURIComponent(plantId)}`);
  return response.data;
};

export const savePlant = async (plantId) => {
  const response = await api.post(`/api/saved-plants/${encodeURIComponent(plantId)}`);
  return response.data;
};

export const removeSavedPlant = async (plantId) => {
  const response = await api.delete(`/api/saved-plants/${encodeURIComponent(plantId)}`);
  return response.data;
};

export const getSavedPlants = async () => {
  const response = await api.get("/api/saved-plants");
  return response.data;
};

// Phase 2.4: Identification History
export const recordHistory = async (historyData) => {
  const response = await api.post("/api/history", historyData);
  return response.data;
};

export const getHistory = async (page = 1, limit = 20) => {
  const response = await api.get(`/api/history?page=${page}&limit=${limit}`);
  return response.data;
};

export const deleteHistoryItem = async (id) => {
  const response = await api.delete(`/api/history/${id}`);
  return response.data;
};

// Phase 2.1: Authentication
export const loginUser = async (email, password) => {
  const response = await api.post("/api/auth/login", { email, password });
  return response.data;
};

export const registerUser = async (name, email, password) => {
  const response = await api.post("/api/auth/register", { name, email, password });
  return response.data;
};

export const createGuestSession = async () => {
  const response = await api.post("/api/auth/guest");
  return response.data;
};

export const getMe = async () => {
  const response = await api.get("/api/auth/me");
  return response.data;
};

export default api;


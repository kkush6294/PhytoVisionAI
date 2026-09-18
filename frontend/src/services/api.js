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

// Phase 4: Privacy-Preserving Geolocation Context
export const getLocationContext = async (lat, lon) => {
  const response = await api.get(
    `/api/context/location?lat=${encodeURIComponent(lat)}&lon=${encodeURIComponent(lon)}`
  );
  return response.data;
};

// Phase 5: Environmental Weather Context
export const getWeatherContext = async ({ city, state, country } = {}) => {
  const params = new URLSearchParams();
  if (city) params.append("city", city);
  if (state) params.append("state", state);
  if (country) params.append("country", country);
  const response = await api.get(`/api/context/weather?${params.toString()}`);
  return response.data;
};

// Final Comprehensive: Ask AI About This Plant (Grounded RAG)
export const askPlantQuestion = async ({ plantId, modelClass, historyId, question }) => {
  const response = await api.post("/api/ai/plant-question", {
    plantId,
    modelClass,
    historyId,
    question
  });
  return response.data;
};

// Final Comprehensive: Factual Plant Comparison
export const comparePlants = async ({ plantIds, modelClasses }) => {
  const response = await api.post("/api/comparison/plants", {
    plantIds,
    modelClasses
  });
  return response.data;
};

// Final Comprehensive: Multi-Source Evidence Retrieval
export const getPlantEvidence = async (plantIdOrClass) => {
  const response = await api.get(`/api/evidence/${encodeURIComponent(plantIdOrClass)}`);
  return response.data;
};

export default api;



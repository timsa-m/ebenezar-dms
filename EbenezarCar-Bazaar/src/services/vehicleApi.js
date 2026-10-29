import { apiRequest } from "./apiClient";
import { getCachedVehicles } from "./vehicleCache";

const buildQuery = (params = {}) => {
  const query = new URLSearchParams();
  Object.entries(params).forEach(([key, value]) => {
    if (value === undefined || value === null || value === "") {
      return;
    }
    query.set(key, value);
  });
  const queryString = query.toString();
  return queryString ? `?${queryString}` : "";
};

export const getVehicles = async (params = {}) => {
  const query = buildQuery(params);
  return apiRequest(`/api/vehicles${query}`);
};

export const getVehicleById = async (id) => {
  return apiRequest(`/api/vehicles/${id}`);
};

export const createVehicle = async (payload) => {
  return apiRequest("/api/vehicles", { method: "POST", body: payload, auth: true });
};

export const updateVehicle = async (id, payload) => {
  return apiRequest(`/api/vehicles/${id}`, { method: "PUT", body: payload, auth: true });
};

export const deleteVehicle = async (id) => {
  return apiRequest(`/api/vehicles/${id}`, { method: "DELETE", auth: true });
};

export const uploadVehicleImages = async (id, files) => {
  const formData = new FormData();
  files.forEach((file) => formData.append("images", file));
  return apiRequest(`/api/vehicles/${id}/images`, {
    method: "POST",
    body: formData,
    auth: true,
    isForm: true
  });
};

export const uploadDirectImage = async (files) => {
  const formData = new FormData();
  files.forEach((file) => formData.append("images", file));
  return apiRequest("/api/upload", {
    method: "POST",
    body: formData,
    auth: true,
    isForm: true
  });
};

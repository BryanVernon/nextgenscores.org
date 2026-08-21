// src/api.js
import axios from "axios";

const baseURL =
  import.meta.env.MODE === "development"
    ? `${window.location.protocol}//${window.location.hostname}:3002/api`
    : "https://nextgenscores-org.onrender.com/api"; // prod backend

const api = axios.create({
  baseURL,
  withCredentials: true,  // send cookies
});

export default api;

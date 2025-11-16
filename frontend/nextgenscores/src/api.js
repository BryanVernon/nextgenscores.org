// src/api.js
import axios from "axios";

const baseURL =
  import.meta.env.MODE === "development"
    ? "http://localhost:5000/api"       // dev backend
    : "https://nextgenscores-org.onrender.com/api"; // prod backend

const api = axios.create({
  baseURL,
  withCredentials: true,  // send cookies
});

export default api;

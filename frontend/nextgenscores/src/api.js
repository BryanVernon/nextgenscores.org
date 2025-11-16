// src/api.js
import axios from "axios";

export default axios.create({
  baseURL: "https://nextgenscores-org.onrender.com/api",
  withCredentials: true,
});

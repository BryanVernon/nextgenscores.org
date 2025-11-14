import React, { useState } from "react";

export default function PickEmPage() {
  const [loading, setLoading] = useState(false);
  const [message, setMessage] = useState("");

  const sendSECSchedule = async () => {
    setLoading(true);
    setMessage("");
    try {
      const res = await fetch("http://localhost:5000/api/email/send-sec-schedule", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
      });
      const data = await res.json();
      setMessage(data.message || data.error || "Email sent!");
    } catch (err) {
      console.error(err);
      setMessage("Failed to send email");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div style={{ padding: "20px" }}>
      <h1>Pick ’Em Page</h1>
      
      <button
        onClick={sendSECSchedule}
        disabled={loading}
        style={{
          padding: "10px 20px",
          fontSize: "16px",
          cursor: "pointer",
        }}
      >
        {loading ? "Sending..." : "Send SEC Schedule"}
      </button>

      {message && (
        <div style={{ marginTop: "15px", fontWeight: "bold" }}>{message}</div>
      )}
    </div>
  );
}

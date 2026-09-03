import { useState, type FormEvent } from "react";
import { useNavigate } from "react-router-dom";
import { useAdminAuth } from "./AdminAuthContext";
import { verifyLogin } from "../api/adminApi";
import { ApiError } from "../api/client";

export function AdminLogin() {
  const [input, setInput] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);
  const { setPassword } = useAdminAuth();
  const navigate = useNavigate();

  async function handleSubmit(e: FormEvent) {
    e.preventDefault();
    setError(null);
    setSubmitting(true);
    try {
      await verifyLogin(input);
      setPassword(input);
      navigate("/admin");
    } catch (err) {
      setError(err instanceof ApiError && err.status === 401 ? "Incorrect password." : "Couldn't reach the server — try again.");
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <div className="container" style={{ maxWidth: 380, paddingTop: "20vh" }}>
      <h1>Lamha Admin</h1>
      <form onSubmit={handleSubmit}>
        <label htmlFor="password">Admin password</label>
        <input
          id="password"
          type="password"
          value={input}
          onChange={(e) => setInput(e.target.value)}
          autoFocus
        />
        {error && (
          <p style={{ color: "#B23A48", fontSize: "0.85rem", marginTop: 8 }}>{error}</p>
        )}
        <button type="submit" disabled={submitting || !input} style={{ marginTop: 16 }}>
          {submitting ? "Checking…" : "Log in"}
        </button>
      </form>
    </div>
  );
}

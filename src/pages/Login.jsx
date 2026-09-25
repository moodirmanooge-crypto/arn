import React, { useState } from "react";
import { Navigate } from "react-router-dom";
import { useAuth } from "../lib/AuthContext.jsx";

export default function Login() {
  const { session, signIn, signUp } = useAuth();
  const [mode, setMode] = useState("signin");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [fullName, setFullName] = useState("");
  const [error, setError] = useState("");
  const [busy, setBusy] = useState(false);

  if (session) return <Navigate to="/" replace />;

  async function handleSubmit(e) {
    e.preventDefault();
    setError("");
    setBusy(true);
    const { error } =
      mode === "signin"
        ? await signIn(email, password)
        : await signUp(email, password, fullName);
    setBusy(false);
    if (error) setError(error.message);
  }

  return (
    <div className="auth-screen">
      <form className="auth-card" onSubmit={handleSubmit}>
        <div className="auth-brand">
          <span className="brand-mark">M</span>
          <div>
            <div className="brand-name">Medvora</div>
            <div className="brand-sub">
              {mode === "signin" ? "Soo gal akoonkaaga" : "Samee akoon cusub"}
            </div>
          </div>
        </div>

        {mode === "signup" && (
          <label className="auth-field">
            Magaca oo dhan
            <input
              type="text"
              value={fullName}
              onChange={(e) => setFullName(e.target.value)}
              required
            />
          </label>
        )}

        <label className="auth-field">
          Email
          <input
            type="email"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            required
          />
        </label>

        <label className="auth-field">
          Password
          <input
            type="password"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            required
            minLength={6}
          />
        </label>

        {error && <p className="auth-error">{error}</p>}

        <button className="auth-submit" type="submit" disabled={busy}>
          {busy ? "…" : mode === "signin" ? "Gal" : "Diiwaan geli"}
        </button>

        <button
          type="button"
          className="auth-switch"
          onClick={() => setMode(mode === "signin" ? "signup" : "signin")}
        >
          {mode === "signin"
            ? "Akoon ma lihid? Samee mid cusub"
            : "Akoon horey ayaad u lahayd? Soo gal"}
        </button>
      </form>
    </div>
  );
}
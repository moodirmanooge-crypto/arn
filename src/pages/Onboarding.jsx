import React, { useState } from "react";
import { useAuth } from "../lib/AuthContext.jsx";

export default function Onboarding() {
  const { profile, createOrganization, signOut } = useAuth();
  const [name, setName] = useState("");
  const [currency, setCurrency] = useState("USD");
  const [error, setError] = useState("");
  const [busy, setBusy] = useState(false);

  async function handleSubmit(e) {
    e.preventDefault();
    setError("");
    setBusy(true);
    const { error } = await createOrganization(name, currency);
    setBusy(false);
    if (error) setError(error.message);
  }

  return (
    <div className="auth-screen">
      <form className="auth-card" onSubmit={handleSubmit}>
        <div className="auth-brand">
          <span className="brand-mark">M</span>
          <div>
            <div className="brand-name">Ku soo dhawow, {profile?.full_name}</div>
            <div className="brand-sub">Samee organization-kaaga (farmashiye / xarun)</div>
          </div>
        </div>

        <label className="auth-field">
          Magaca organization-ka
          <input
            type="text"
            value={name}
            onChange={(e) => setName(e.target.value)}
            placeholder="Tusaale: Farmasiyada Hodan"
            required
          />
        </label>

        <label className="auth-field">
          Lacagta (currency)
          <select value={currency} onChange={(e) => setCurrency(e.target.value)}>
            <option value="USD">USD</option>
            <option value="SOS">SOS</option>
            <option value="ETB">ETB</option>
            <option value="KES">KES</option>
          </select>
        </label>

        {error && <p className="auth-error">{error}</p>}

        <button className="auth-submit" type="submit" disabled={busy}>
          {busy ? "…" : "Samee oo sii wad"}
        </button>

        <button type="button" className="auth-switch" onClick={signOut}>
          Ka bax
        </button>
      </form>
    </div>
  );
}

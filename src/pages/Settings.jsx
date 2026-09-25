import React, { useEffect, useState } from "react";
import { supabase } from "../lib/supabaseClient.js";
import { useAuth } from "../lib/AuthContext.jsx";
import { uploadMedia, deleteMedia } from "../lib/storage.js";

function ImagePicker({ current, onPick, file, label }) {
  const [preview, setPreview] = useState("");
  useEffect(() => {
    if (!file) {
      setPreview("");
      return;
    }
    const url = URL.createObjectURL(file);
    setPreview(url);
    return () => URL.revokeObjectURL(url);
  }, [file]);

  const src = preview || current;
  return (
    <div className="crud-field crud-field-wide">
      <span>{label}</span>
      <div className="crud-image">
        {src ? <img src={src} alt="" className="thumb-lg" /> : <div className="thumb-lg thumb-empty">Sawir ma jiro</div>}
        <input type="file" accept="image/*" onChange={(e) => onPick(e.target.files?.[0] || null)} />
      </div>
    </div>
  );
}

export default function Settings() {
  const { profile, refreshProfile } = useAuth();
  const org = profile?.organizations;
  const orgId = profile?.organization_id;
  const canEditOrg = ["organization_owner", "super_admin"].includes(profile?.role);

  // Profile
  const [fullName, setFullName] = useState(profile?.full_name || "");
  const [phone, setPhone] = useState(profile?.phone || "");
  const [avatarFile, setAvatarFile] = useState(null);
  const [pMsg, setPMsg] = useState("");
  const [pErr, setPErr] = useState("");
  const [pBusy, setPBusy] = useState(false);

  // Organization
  const [orgName, setOrgName] = useState(org?.name || "");
  const [currency, setCurrency] = useState(org?.currency || "USD");
  const [logoFile, setLogoFile] = useState(null);
  const [oMsg, setOMsg] = useState("");
  const [oErr, setOErr] = useState("");
  const [oBusy, setOBusy] = useState(false);

  async function saveProfile(e) {
    e.preventDefault();
    setPBusy(true);
    setPErr("");
    setPMsg("");
    try {
      const payload = { full_name: fullName.trim(), phone: phone.trim() || null };
      let up = null;
      if (avatarFile) {
        up = await uploadMedia(avatarFile, orgId, "avatars");
        payload.avatar_url = up.url;
        payload.avatar_path = up.path;
      }
      const { error } = await supabase.from("profiles").update(payload).eq("id", profile.id);
      if (error) {
        if (up) await deleteMedia(up.path);
        throw error;
      }
      if (up && profile.avatar_path) await deleteMedia(profile.avatar_path);
      setAvatarFile(null);
      await refreshProfile();
      setPMsg("Waa la kaydiyay ✓");
    } catch (err) {
      setPErr(err.message);
    } finally {
      setPBusy(false);
    }
  }

  async function saveOrg(e) {
    e.preventDefault();
    setOBusy(true);
    setOErr("");
    setOMsg("");
    try {
      const payload = { name: orgName.trim(), currency };
      let up = null;
      if (logoFile) {
        up = await uploadMedia(logoFile, orgId, "logo");
        payload.logo_url = up.url;
        payload.logo_path = up.path;
      }
      const { error } = await supabase.from("organizations").update(payload).eq("id", orgId);
      if (error) {
        if (up) await deleteMedia(up.path);
        throw error;
      }
      if (up && org?.logo_path) await deleteMedia(org.logo_path);
      setLogoFile(null);
      await refreshProfile();
      setOMsg("Waa la kaydiyay ✓");
    } catch (err) {
      setOErr(err.message);
    } finally {
      setOBusy(false);
    }
  }

  return (
    <div className="page page-wide">
      <header className="page-header">
        <p className="eyebrow-plain">Settings · Supabase</p>
        <h1>Settings</h1>
        <p className="lede">Profile-kaaga iyo organization-ka — sawirada waxay ku kaydsamaan Supabase Storage.</p>
      </header>

      <form className="crud-form" onSubmit={saveProfile}>
        <div className="crud-form-title">Profile-kaaga</div>
        <div className="crud-grid">
          <label className="crud-field">
            <span>Magaca oo dhan *</span>
            <input value={fullName} onChange={(e) => setFullName(e.target.value)} required />
          </label>
          <label className="crud-field">
            <span>Telefoon</span>
            <input value={phone} onChange={(e) => setPhone(e.target.value)} />
          </label>
          <label className="crud-field">
            <span>Role</span>
            <input value={profile?.role || ""} disabled />
          </label>
          <ImagePicker label="Sawirka profile-ka" current={profile?.avatar_url} file={avatarFile} onPick={setAvatarFile} />
        </div>
        {pErr && <p className="auth-error">{pErr}</p>}
        {pMsg && <p className="ok-msg">{pMsg}</p>}
        <div className="crud-actions">
          <button className="btn-primary" disabled={pBusy}>{pBusy ? "Kaydinaya…" : "Kaydi profile-ka"}</button>
        </div>
      </form>

      <form className="crud-form" onSubmit={saveOrg}>
        <div className="crud-form-title">Organization</div>
        {!canEditOrg && <p className="lede">Kaliya organization owner ayaa beddeli kara.</p>}
        <fieldset disabled={!canEditOrg} className="plain-fieldset">
          <div className="crud-grid">
            <label className="crud-field">
              <span>Magaca *</span>
              <input value={orgName} onChange={(e) => setOrgName(e.target.value)} required />
            </label>
            <label className="crud-field">
              <span>Currency</span>
              <select value={currency} onChange={(e) => setCurrency(e.target.value)}>
                {["USD", "SOS", "ETB", "KES"].map((c) => (
                  <option key={c} value={c}>{c}</option>
                ))}
              </select>
            </label>
            <label className="crud-field">
              <span>Plan</span>
              <input value={org?.subscription_plan || ""} disabled />
            </label>
            <ImagePicker label="Logo" current={org?.logo_url} file={logoFile} onPick={setLogoFile} />
          </div>
          {oErr && <p className="auth-error">{oErr}</p>}
          {oMsg && <p className="ok-msg">{oMsg}</p>}
          <div className="crud-actions">
            <button className="btn-primary" disabled={oBusy}>{oBusy ? "Kaydinaya…" : "Kaydi organization"}</button>
          </div>
        </fieldset>
      </form>
    </div>
  );
}

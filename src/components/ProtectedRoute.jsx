import React from "react";
import { Navigate } from "react-router-dom";
import { useAuth } from "../lib/AuthContext.jsx";
import Onboarding from "../pages/Onboarding.jsx";

export default function ProtectedRoute({ children }) {
  const { session, loading, profile, profileReady, profileError, signOut } = useAuth();

  if (loading) return <div className="page-loading">Soo dejinaya…</div>;
  if (!session) return <Navigate to="/login" replace />;
  if (!profileReady) return <div className="page-loading">Soo dejinaya profile-ka…</div>;

  if (profileError || !profile) {
    return (
      <div className="auth-screen">
        <div className="auth-card">
          <p className="auth-error">
            Profile-kaaga lama heli karo{profileError ? `: ${profileError}` : "."}
          </p>
          <p className="lede">
            Hubi in aad Supabase SQL Editor ku run-garaysay 01 → 04 faylasha
            <code> supabase/</code>.
          </p>
          <button className="auth-submit" onClick={signOut}>
            Ka bax
          </button>
        </div>
      </div>
    );
  }

  // User cusub oo aan organization lahayn → samee organization marka hore
  if (!profile.organization_id) return <Onboarding />;

  return children;
}

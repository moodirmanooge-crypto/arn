import React, { createContext, useCallback, useContext, useEffect, useState } from "react";
import { supabase } from "./supabaseClient.js";

const AuthContext = createContext(null);

export function AuthProvider({ children }) {
  const [session, setSession] = useState(null);
  const [profile, setProfile] = useState(null);
  const [loading, setLoading] = useState(true);
  const [profileLoading, setProfileLoading] = useState(false);
  const [profileError, setProfileError] = useState("");
  const [profileLoadedFor, setProfileLoadedFor] = useState(null);

  useEffect(() => {
    supabase.auth.getSession().then(({ data }) => {
      setSession(data.session);
      setLoading(false);
    });

    const { data: listener } = supabase.auth.onAuthStateChange((_event, newSession) => {
      setSession(newSession);
    });

    return () => listener.subscription.unsubscribe();
  }, []);

  const loadProfile = useCallback(async (userId) => {
    if (!userId) {
      setProfile(null);
      return;
    }
    setProfileLoading(true);
    setProfileError("");
    const { data, error } = await supabase
      .from("profiles")
      .select("*, organizations(id, name, subscription_plan, currency, logo_url, logo_path)")
      .eq("id", userId)
      .maybeSingle();
    if (error) {
      setProfileError(error.message);
      setProfile(null);
    } else {
      setProfile(data);
    }
    setProfileLoadedFor(userId);
    setProfileLoading(false);
  }, []);

  const userId = session?.user?.id;

  useEffect(() => {
    loadProfile(userId);
  }, [userId, loadProfile]);

  async function refreshProfile() {
    await loadProfile(userId);
  }

  async function signIn(email, password) {
    return supabase.auth.signInWithPassword({ email, password });
  }

  async function signUp(email, password, fullName) {
    return supabase.auth.signUp({
      email,
      password,
      options: { data: { full_name: fullName } },
    });
  }

  async function signOut() {
    return supabase.auth.signOut();
  }

  // Organization cusub + user-ka hadda ku xir (supabase/03_onboarding.sql)
  async function createOrganization(name, currency = "USD") {
    const { data, error } = await supabase.rpc("create_organization_and_join", {
      org_name: name,
      org_currency: currency,
    });
    if (!error) await loadProfile(userId);
    return { data, error };
  }

  return (
    <AuthContext.Provider
      value={{
        session,
        profile,
        loading,
        profileLoading,
        profileReady: !!userId && profileLoadedFor === userId,
        profileError,
        refreshProfile,
        signIn,
        signUp,
        signOut,
        createOrganization,
      }}
    >
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  return useContext(AuthContext);
}

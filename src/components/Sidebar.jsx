import React, { useMemo, useState } from "react";
import { NavLink } from "react-router-dom";
import { modules } from "../data/modules.js";
import { groups, groupFor } from "../data/groups.js";
import { useAuth } from "../lib/AuthContext.jsx";
import { tableConfigs, tableNavOrder } from "../data/tables.js";

export default function Sidebar() {
  const [query, setQuery] = useState("");
  const { profile, signOut } = useAuth();

  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase();
    if (!q) return modules;
    return modules.filter(
      (m) =>
        m.title.toLowerCase().includes(q) ||
        m.items.some((it) => it.toLowerCase().includes(q))
    );
  }, [query]);

  const byGroup = useMemo(() => {
    const map = new Map();
    for (const g of groups) map.set(g.label, []);
    for (const m of filtered) {
      const g = groupFor(m.number);
      if (!map.has(g)) map.set(g, []);
      map.get(g).push(m);
    }
    return map;
  }, [filtered]);

  return (
    <aside className="sidebar">
      <div className="sidebar-brand">
        {profile?.organizations?.logo_url ? (
          <img className="brand-logo" src={profile.organizations.logo_url} alt="" />
        ) : (
          <span className="brand-mark">M</span>
        )}
        <div>
          <div className="brand-name">Medvora</div>
          <div className="brand-sub">Master Specification</div>
        </div>
      </div>

      <input
        className="sidebar-search"
        type="text"
        placeholder="Raadi module ama feature…"
        value={query}
        onChange={(e) => setQuery(e.target.value)}
        aria-label="Raadi modules"
      />

      <nav className="sidebar-nav">
        <div className="nav-group">
          <div className="nav-group-label">Live data · Supabase</div>
          <ul>
            {tableNavOrder.map((key) => (
              <li key={key}>
                <NavLink
                  to={`/${tableConfigs[key].path}`}
                  className={({ isActive }) =>
                    "nav-link" + (isActive ? " nav-link-active" : "")
                  }
                >
                  <span className="nav-number">●</span>
                  <span className="nav-title">{tableConfigs[key].nav}</span>
                </NavLink>
              </li>
            ))}
            <li>
              <NavLink
                to="/settings"
                className={({ isActive }) =>
                  "nav-link" + (isActive ? " nav-link-active" : "")
                }
              >
                <span className="nav-number">⚙</span>
                <span className="nav-title">Settings</span>
              </NavLink>
            </li>
          </ul>
        </div>

        {[...byGroup.entries()].map(([label, mods]) =>
          mods.length ? (
            <div className="nav-group" key={label}>
              <div className="nav-group-label">{label}</div>
              <ul>
                {mods.map((m) => (
                  <li key={m.id}>
                    <NavLink
                      to={`/module/${m.id}`}
                      className={({ isActive }) =>
                        "nav-link" + (isActive ? " nav-link-active" : "")
                      }
                    >
                      <span className="nav-number">{String(m.number).padStart(2, "0")}</span>
                      <span className="nav-title">{m.title}</span>
                    </NavLink>
                  </li>
                ))}
              </ul>
            </div>
          ) : null
        )}
      </nav>

      <div className="sidebar-footer">
        {profile?.avatar_url && (
          <img className="sidebar-avatar" src={profile.avatar_url} alt="" />
        )}
        <div className="sidebar-user">
          <div className="sidebar-user-name">{profile?.full_name || "…"}</div>
          <div className="sidebar-user-org">
            {profile?.organizations?.name || "Ma xirna organization"}
          </div>
        </div>
        <button className="sidebar-signout" onClick={signOut}>
          Ka bax
        </button>
      </div>
    </aside>
  );
}
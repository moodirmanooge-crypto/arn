import React, { useEffect, useState } from "react";
import { useParams, Link, Navigate } from "react-router-dom";
import { modules } from "../data/modules.js";
import { supabase } from "../lib/supabaseClient.js";
import { useAuth } from "../lib/AuthContext.jsx";

export default function ModuleDetail() {
  const { id } = useParams();
  const { profile } = useAuth();
  const orgId = profile?.organization_id;
  const index = modules.findIndex((m) => m.id === id);
  const module = modules[index];
  const prev = modules[index - 1];
  const next = modules[index + 1];

  // Checklist-ka hadda wuxuu ku kaydsamaa Supabase (jadwalka spec_progress)
  const [checked, setChecked] = useState(() => new Set());
  const [error, setError] = useState("");

  useEffect(() => {
    if (!module || !orgId) return;
    let cancelled = false;
    setChecked(new Set());
    setError("");
    supabase
      .from("spec_progress")
      .select("item")
      .eq("module_id", module.id)
      .then(({ data, error }) => {
        if (cancelled) return;
        if (error) setError(error.message);
        else setChecked(new Set((data || []).map((r) => r.item)));
      });
    return () => {
      cancelled = true;
    };
  }, [module, orgId]);

  if (!module) return <Navigate to="/" replace />;

  async function toggle(item) {
    const wasChecked = checked.has(item);
    // optimistic update
    setChecked((prevSet) => {
      const n = new Set(prevSet);
      if (wasChecked) n.delete(item);
      else n.add(item);
      return n;
    });
    setError("");

    const { error } = wasChecked
      ? await supabase
          .from("spec_progress")
          .delete()
          .eq("organization_id", orgId)
          .eq("module_id", module.id)
          .eq("item", item)
      : await supabase
          .from("spec_progress")
          .upsert(
            { organization_id: orgId, module_id: module.id, item },
            { onConflict: "organization_id,module_id,item", ignoreDuplicates: true }
          );

    if (error) {
      setError(error.message);
      // dib u celi
      setChecked((prevSet) => {
        const n = new Set(prevSet);
        if (wasChecked) n.add(item);
        else n.delete(item);
        return n;
      });
    }
  }

  return (
    <div className="page">
      <Link to="/" className="back-link">
        ← Dhammaan modules-ka
      </Link>

      <header className="page-header">
        <p className="eyebrow-plain">Module {String(module.number).padStart(2, "0")}</p>
        <h1>{module.title}</h1>
        <p className="lede">
          {checked.size} / {module.items.length} la calaamadeeyay · waxay ku kaydsan yihiin Supabase
        </p>
      </header>

      {error && <p className="auth-error">{error}</p>}

      <ul className="item-list">
        {module.items.map((item) => (
          <li key={item}>
            <label className="item-row">
              <input
                type="checkbox"
                checked={checked.has(item)}
                onChange={() => toggle(item)}
              />
              <span className={checked.has(item) ? "item-checked" : ""}>{item}</span>
            </label>
          </li>
        ))}
      </ul>

      <nav className="module-pager">
        {prev ? (
          <Link to={`/module/${prev.id}`} className="pager-link">
            ← {prev.title}
          </Link>
        ) : (
          <span />
        )}
        {next ? (
          <Link to={`/module/${next.id}`} className="pager-link pager-link-next">
            {next.title} →
          </Link>
        ) : (
          <span />
        )}
      </nav>
    </div>
  );
}

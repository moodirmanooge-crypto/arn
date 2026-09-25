import React, { useEffect, useMemo, useState } from "react";
import { supabase } from "../lib/supabaseClient.js";
import { useAuth } from "../lib/AuthContext.jsx";
import { uploadMedia, deleteMedia } from "../lib/storage.js";

/**
 * Bog CRUD guud oo si toos ah ugu xiran jadwal Supabase ah.
 *
 * config = {
 *   table, title, eyebrow, description,
 *   orderBy: "created_at",
 *   fields: [{ name, label, type, required, options, relation:{table,labelField}, inTable, step }],
 *     type: text | textarea | number | date | time | select | checkbox | relation
 *   image: { urlCol, pathCol, folder, label }      // ikhtiyaari — sawir / fayl
 *   extraInsert: (profile) => ({ ... })             // ikhtiyaari
 * }
 */
export default function CrudPage({ config }) {
  const { profile } = useAuth();
  const orgId = profile?.organization_id;
  const { table, fields, image } = config;

  const emptyForm = useMemo(() => {
    const f = {};
    for (const fld of fields) {
      f[fld.name] = fld.type === "checkbox" ? !!fld.default : fld.default ?? "";
    }
    return f;
  }, [fields]);

  const [rows, setRows] = useState([]);
  const [relations, setRelations] = useState({});
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [form, setForm] = useState(emptyForm);
  const [editing, setEditing] = useState(null); // row la beddelayo
  const [file, setFile] = useState(null);
  const [preview, setPreview] = useState("");
  const [removeImage, setRemoveImage] = useState(false);
  const [saving, setSaving] = useState(false);
  const [query, setQuery] = useState("");

  const relationFields = fields.filter((f) => f.type === "relation");

  useEffect(() => {
    setForm(emptyForm);
    setEditing(null);
    resetFile();
    loadAll();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [table]);

  useEffect(() => {
    if (!file) return;
    const url = URL.createObjectURL(file);
    setPreview(url);
    return () => URL.revokeObjectURL(url);
  }, [file]);

  function resetFile() {
    setFile(null);
    setPreview("");
    setRemoveImage(false);
  }

  async function loadAll() {
    setLoading(true);
    setError("");
    const { data, error } = await supabase
      .from(table)
      .select("*")
      .order(config.orderBy || "created_at", { ascending: false });
    if (error) setError(error.message);
    else setRows(data || []);

    const rel = {};
    for (const f of relationFields) {
      const { data: rdata, error: rerr } = await supabase
        .from(f.relation.table)
        .select(`id, ${f.relation.labelField}`)
        .order(f.relation.labelField);
      if (rerr) setError(rerr.message);
      rel[f.name] = rdata || [];
    }
    setRelations(rel);
    setLoading(false);
  }

  function toPayload() {
    const payload = {};
    for (const f of fields) {
      let v = form[f.name];
      if (f.type === "checkbox") v = !!v;
      else if (f.type === "number") v = v === "" || v === null ? (f.nullable ? null : 0) : Number(v);
      else if (typeof v === "string") {
        v = v.trim();
        if (v === "") v = null;
      }
      payload[f.name] = v;
    }
    return payload;
  }

  async function handleSubmit(e) {
    e.preventDefault();
    if (!orgId) {
      setError("Profile-kaaga lama xirin organization.");
      return;
    }
    setSaving(true);
    setError("");

    try {
      const payload = toPayload();
      let uploaded = null;

      if (image && file) {
        uploaded = await uploadMedia(file, orgId, image.folder);
        payload[image.urlCol] = uploaded.url;
        payload[image.pathCol] = uploaded.path;
      } else if (image && removeImage) {
        payload[image.urlCol] = null;
        payload[image.pathCol] = null;
      }

      if (editing) {
        const { error } = await supabase.from(table).update(payload).eq("id", editing.id);
        if (error) {
          if (uploaded) await deleteMedia(uploaded.path);
          throw error;
        }
        // sawirkii hore tirtir haddii la beddelay / la saaray
        if (image && (uploaded || removeImage) && editing[image.pathCol]) {
          await deleteMedia(editing[image.pathCol]);
        }
      } else {
        const insert = {
          ...payload,
          organization_id: orgId,
          ...(config.extraInsert ? config.extraInsert(profile) : {}),
        };
        const { error } = await supabase.from(table).insert(insert);
        if (error) {
          if (uploaded) await deleteMedia(uploaded.path);
          throw error;
        }
      }

      cancelEdit();
      await loadAll();
    } catch (err) {
      setError(err.message || String(err));
    } finally {
      setSaving(false);
    }
  }

  function startEdit(row) {
    const f = {};
    for (const fld of fields) {
      const v = row[fld.name];
      if (fld.type === "checkbox") f[fld.name] = !!v;
      else if (fld.type === "time" && v) f[fld.name] = String(v).slice(0, 5);
      else f[fld.name] = v ?? "";
    }
    setForm(f);
    setEditing(row);
    resetFile();
    window.scrollTo({ top: 0, behavior: "smooth" });
  }

  function cancelEdit() {
    setForm(emptyForm);
    setEditing(null);
    resetFile();
  }

  async function handleDelete(row) {
    if (!window.confirm("Ma hubtaa inaad tirtirto?")) return;
    setError("");
    const { error } = await supabase.from(table).delete().eq("id", row.id);
    if (error) {
      setError(error.message);
      return;
    }
    if (image && row[image.pathCol]) await deleteMedia(row[image.pathCol]);
    setRows((prev) => prev.filter((r) => r.id !== row.id));
    if (editing?.id === row.id) cancelEdit();
  }

  function relationLabel(fieldName, id) {
    const f = relationFields.find((x) => x.name === fieldName);
    const item = (relations[fieldName] || []).find((r) => r.id === id);
    return item ? item[f.relation.labelField] : "—";
  }

  function display(row, f) {
    const v = row[f.name];
    if (f.type === "relation") return v ? relationLabel(f.name, v) : "—";
    if (f.type === "checkbox") return v ? "Haa" : "Maya";
    if (f.type === "number") return v === null || v === undefined ? "—" : Number(v).toLocaleString();
    if (f.type === "select") return f.options.find((o) => o.value === v)?.label ?? v ?? "—";
    if (f.type === "time" && v) return String(v).slice(0, 5);
    return v === null || v === undefined || v === "" ? "—" : String(v);
  }

  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase();
    if (!q) return rows;
    return rows.filter((r) =>
      fields.some((f) => String(r[f.name] ?? "").toLowerCase().includes(q))
    );
  }, [rows, query, fields]);

  const tableFields = fields.filter((f) => f.inTable !== false);
  const currentImage = editing && image && !removeImage ? editing[image.urlCol] : "";

  function renderInput(f) {
    const common = {
      id: `f-${f.name}`,
      value: form[f.name] ?? "",
      onChange: (e) => setForm({ ...form, [f.name]: e.target.value }),
      required: f.required,
    };
    switch (f.type) {
      case "textarea":
        return <textarea rows={3} {...common} />;
      case "number":
        return <input type="number" step={f.step || "0.01"} {...common} />;
      case "date":
        return <input type="date" {...common} />;
      case "time":
        return <input type="time" {...common} />;
      case "select":
        return (
          <select {...common}>
            {!f.required && <option value="">—</option>}
            {f.options.map((o) => (
              <option key={o.value} value={o.value}>
                {o.label}
              </option>
            ))}
          </select>
        );
      case "relation":
        return (
          <select {...common}>
            <option value="">— dooro —</option>
            {(relations[f.name] || [])
              .filter((r) => !(editing && f.relation.table === table && r.id === editing.id))
              .map((r) => (
                <option key={r.id} value={r.id}>
                  {r[f.relation.labelField]}
                </option>
              ))}
          </select>
        );
      case "checkbox":
        return (
          <input
            id={`f-${f.name}`}
            type="checkbox"
            checked={!!form[f.name]}
            onChange={(e) => setForm({ ...form, [f.name]: e.target.checked })}
          />
        );
      default:
        return <input type="text" {...common} />;
    }
  }

  return (
    <div className="page page-wide">
      <header className="page-header">
        <p className="eyebrow-plain">{config.eyebrow || "Live data · Supabase"}</p>
        <h1>{config.title}</h1>
        {config.description && <p className="lede">{config.description}</p>}
      </header>

      <form className="crud-form" onSubmit={handleSubmit}>
        <div className="crud-form-title">
          {editing ? "Wax ka beddel" : "Ku dar cusub"}
        </div>

        <div className="crud-grid">
          {fields.map((f) => (
            <label
              key={f.name}
              htmlFor={`f-${f.name}`}
              className={
                "crud-field" +
                (f.type === "checkbox" ? " crud-field-check" : "") +
                (f.type === "textarea" ? " crud-field-wide" : "")
              }
            >
              <span>
                {f.label}
                {f.required ? " *" : ""}
              </span>
              {renderInput(f)}
            </label>
          ))}

          {image && (
            <div className="crud-field crud-field-wide">
              <span>{image.label || "Sawir"}</span>
              <div className="crud-image">
                {preview || currentImage ? (
                  (file ? file.type === "application/pdf" : currentImage.toLowerCase().endsWith(".pdf")) ? (
                    <a href={preview || currentImage} target="_blank" rel="noreferrer" className="thumb-lg thumb-empty">
                      PDF — fur
                    </a>
                  ) : (
                    <img src={preview || currentImage} alt="" className="thumb-lg" />
                  )
                ) : (
                  <div className="thumb-lg thumb-empty">Sawir ma jiro</div>
                )}
                <div className="crud-image-actions">
                  <input
                    type="file"
                    accept={image.accept || "image/*"}
                    onChange={(e) => {
                      setFile(e.target.files?.[0] || null);
                      setRemoveImage(false);
                    }}
                  />
                  {editing && editing[image.urlCol] && !file && (
                    <label className="crud-remove">
                      <input
                        type="checkbox"
                        checked={removeImage}
                        onChange={(e) => setRemoveImage(e.target.checked)}
                      />
                      Ka saar sawirka
                    </label>
                  )}
                </div>
              </div>
            </div>
          )}
        </div>

        <div className="crud-actions">
          <button type="submit" className="btn-primary" disabled={saving}>
            {saving ? "Kaydinaya…" : editing ? "Kaydi isbeddelka" : "Ku dar"}
          </button>
          {editing && (
            <button type="button" className="btn-ghost" onClick={cancelEdit}>
              Jooji
            </button>
          )}
        </div>
      </form>

      {error && <p className="auth-error crud-error">{error}</p>}

      <div className="crud-toolbar">
        <input
          className="crud-search"
          type="text"
          placeholder="Raadi…"
          value={query}
          onChange={(e) => setQuery(e.target.value)}
        />
        <span className="crud-count">{filtered.length} row</span>
      </div>

      {loading ? (
        <p className="lede">Soo dejinaya…</p>
      ) : filtered.length === 0 ? (
        <p className="lede">Wali xog lama gelin.</p>
      ) : (
        <div className="table-scroll">
          <table className="data-table">
            <thead>
              <tr>
                {image && <th></th>}
                {tableFields.map((f) => (
                  <th key={f.name}>{f.label}</th>
                ))}
                <th></th>
              </tr>
            </thead>
            <tbody>
              {filtered.map((row) => (
                <tr key={row.id} className={editing?.id === row.id ? "row-editing" : ""}>
                  {image && (
                    <td>
                      {row[image.urlCol] ? (
                        row[image.urlCol].toLowerCase().endsWith(".pdf") ? (
                          <a href={row[image.urlCol]} target="_blank" rel="noreferrer">
                            PDF
                          </a>
                        ) : (
                          <a href={row[image.urlCol]} target="_blank" rel="noreferrer">
                            <img src={row[image.urlCol]} alt="" className="thumb" />
                          </a>
                        )
                      ) : (
                        <div className="thumb thumb-empty" />
                      )}
                    </td>
                  )}
                  {tableFields.map((f) => (
                    <td key={f.name}>{display(row, f)}</td>
                  ))}
                  <td className="row-actions">
                    <button className="row-edit" onClick={() => startEdit(row)}>
                      Beddel
                    </button>
                    <button className="row-delete" onClick={() => handleDelete(row)}>
                      Tirtir
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}

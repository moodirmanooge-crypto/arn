import React from "react";
import { Link } from "react-router-dom";
import { modules, introText } from "../data/modules.js";
import { groups, groupFor } from "../data/groups.js";

export default function Dashboard() {
  const totalItems = modules.reduce((sum, m) => sum + m.items.length, 0);

  return (
    <div className="page">
      <header className="page-header">
        <p className="eyebrow-plain">Medvora</p>
        <h1>Master System Specification</h1>
        <p className="lede">{introText}</p>
      </header>

      <dl className="stat-row">
        <div className="stat">
          <dt>Modules</dt>
          <dd>{modules.length}</dd>
        </div>
        <div className="stat">
          <dt>Components</dt>
          <dd>{totalItems}</dd>
        </div>
        <div className="stat">
          <dt>Groups</dt>
          <dd>{groups.length}</dd>
        </div>
      </dl>

      <div className="ledger">
        {groups.map((g) => {
          const mods = modules.filter((m) => groupFor(m.number) === g.label);
          return (
            <section className="ledger-group" key={g.label}>
              <h2>{g.label}</h2>
              <ol className="ledger-list">
                {mods.map((m) => (
                  <li key={m.id}>
                    <Link to={`/module/${m.id}`}>
                      <span className="ledger-number">{String(m.number).padStart(2, "0")}</span>
                      <span className="ledger-title">{m.title}</span>
                      <span className="ledger-count">{m.items.length}</span>
                    </Link>
                  </li>
                ))}
              </ol>
            </section>
          );
        })}
      </div>
    </div>
  );
}

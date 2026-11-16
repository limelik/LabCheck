import { useCallback, useEffect, useState } from "react";
import AdminSidebar from "./AdminSidebar.jsx";
import { apiRequest } from "../../lib/api.js";
import { useLabChange } from "../../context/LabChangeContext.jsx";
import "./ManageAccounts.css";

const labels = { STUDENT: "Student", TEACHER: "Teacher", ADMIN: "Admin", APPROVED: "Approved", PENDING: "Pending", REJECTED: "Rejected" };

function AccountCard({ account, onSaved }) {
  const [expanded, setExpanded] = useState(false);
  const [draft, setDraft] = useState(account);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");
  const [message, setMessage] = useState("");
  const isAdmin = account.role === "ADMIN";
  const change = (key, value) => setDraft((current) => ({ ...current, [key]: value }));

  const save = async (event) => {
    event.preventDefault();
    setSaving(true);
    setError("");
    setMessage("");
    try {
      await apiRequest(`/api/admin/accounts/${account.id}`, {
        method: "PATCH",
        body: JSON.stringify({ firstName: draft.firstName, lastName: draft.lastName,
          isActive: draft.isActive, approvalStatus: draft.approvalStatus }),
      });
      await onSaved();
      setMessage("Account updated.");
    } catch (err) {
      setError(err.message || "Could not update this account.");
    } finally {
      setSaving(false);
    }
  };

  return (
    <article className="card account-card">
      <div className="account-summary">
        <div className="account-identity">
          <h3>{account.firstName} {account.lastName}</h3>
          <div className="placement-meta">{account.email}</div>
          <div className="placement-meta">{labels[account.role]}{account.groupCode ? ` · ${account.groupCode}` : ""}</div>
        </div>
        <div className="chip-row">
          <span className="placement-chip">{account.isActive ? "Active" : "Inactive"}</span>
          {!account.emailVerifiedAt && <span className="placement-chip">Email unverified</span>}
        </div>
        <button className="table-btn edit" aria-expanded={expanded} aria-controls={`account-${account.id}`}
          disabled={saving} onClick={() => {
            if (!expanded) { setDraft(account); setError(""); setMessage(""); }
            setExpanded(!expanded);
          }}>{expanded ? "Hide details" : "Details"}</button>
      </div>
      {expanded && (
        <form id={`account-${account.id}`} className="account-details" onSubmit={save}>
          <div className="admin-form-grid">
            <label>First name<input className="form-input" required maxLength={100} value={draft.firstName ?? ""}
              disabled={saving} onChange={(event) => change("firstName", event.target.value)} /></label>
            <label>Last name<input className="form-input" required maxLength={100} value={draft.lastName ?? ""}
              disabled={saving} onChange={(event) => change("lastName", event.target.value)} /></label>
            <label>Account status<select className="form-input" value={draft.isActive ? "active" : "inactive"}
              disabled={saving || isAdmin} onChange={(event) => change("isActive", event.target.value === "active")}>
              <option value="active">Active</option><option value="inactive">Inactive</option>
            </select></label>
            <label>Approval<select className="form-input" value={draft.approvalStatus} disabled={saving || isAdmin}
              onChange={(event) => change("approvalStatus", event.target.value)}>
              <option value="PENDING">Pending</option>
              <option value="APPROVED" disabled={!account.emailVerifiedAt}>Approved</option>
              <option value="REJECTED">Rejected</option>
            </select></label>
          </div>
          <dl className="account-facts">
            <div><dt>Email verification</dt><dd>{account.emailVerifiedAt ? "Verified" : "Awaiting verification"}</dd></div>
            <div><dt>Last login</dt><dd>{account.lastLoginAt ? new Date(account.lastLoginAt).toLocaleString() : "Never"}</dd></div>
            {account.groupCode && <div><dt>Academic group</dt><dd>{account.groupCode}</dd></div>}
          </dl>
          {error && <p className="auth-error" role="alert">{error}</p>}
          {message && <p role="status">{message}</p>}
          <div className="chip-row">
            <button className="primary-button" disabled={saving}>{saving ? "Saving..." : "Save changes"}</button>
            <button type="button" className="table-btn" disabled={saving} onClick={() => {
              setDraft(account); setExpanded(false); setError(""); setMessage("");
            }}>Cancel</button>
          </div>
        </form>
      )}
    </article>
  );
}

export default function ManageAccounts() {
  const [accounts, setAccounts] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [search, setSearch] = useState("");
  const [role, setRole] = useState("");
  const [status, setStatus] = useState("");
  const [group, setGroup] = useState("");
  const { refresh: refreshData } = useLabChange();
  const load = useCallback(async () => {
    const { users } = await apiRequest("/api/admin/accounts");
    setAccounts(users);
  }, []);

  useEffect(() => {
    let active = true;
    apiRequest("/api/admin/accounts")
      .then(({ users }) => { if (active) setAccounts(users); })
      .catch((err) => { if (active) setError(err.message || "Could not load accounts."); })
      .finally(() => { if (active) setLoading(false); });
    return () => { active = false; };
  }, []);

  const onSaved = async () => {
    await load();
    await refreshData({ background: true });
  };
  const query = search.trim().toLowerCase();
  const groups = [...new Set(accounts.map((account) => account.groupCode).filter(Boolean))].sort();
  const filtered = accounts.filter((account) =>
    (!role || account.role === role) &&
    (!group || account.groupCode === group) &&
    (!status || (status === "active" ? account.isActive : !account.isActive)) &&
    (!query || `${account.firstName} ${account.lastName} ${account.email} ${account.groupCode ?? ""}`.toLowerCase().includes(query))
  );

  return (
    <div className="teacher-layout">
      <AdminSidebar />
      <main className="teacher-main">
        <h1 className="page-title">Accounts</h1>
        <div className="card account-filters">
          <div className="admin-form-grid">
            <label>Search<input type="search" className="form-input" placeholder="Name or email" value={search} onChange={(event) => setSearch(event.target.value)} /></label>
            <label>Role<select className="form-input" value={role} onChange={(event) => setRole(event.target.value)}>
              <option value="">All roles</option>{["STUDENT", "TEACHER", "ADMIN"].map((value) => <option key={value} value={value}>{labels[value]}</option>)}
            </select></label>
            <label>Status<select className="form-input" value={status} onChange={(event) => setStatus(event.target.value)}>
              <option value="">All statuses</option><option value="active">Active</option><option value="inactive">Inactive</option>
            </select></label>
            <label>Academic group<select className="form-input" value={group} onChange={(event) => setGroup(event.target.value)}>
              <option value="">All groups</option>{groups.map((value) => <option key={value} value={value}>{value}</option>)}
            </select></label>
          </div>
          <div className="account-filter-footer">
            <span className="placement-meta">{filtered.length} of {accounts.length} accounts</span>
            <button className="table-btn" onClick={() => { setSearch(""); setRole(""); setStatus(""); setGroup(""); }}>Clear filters</button>
          </div>
        </div>
        {error && <div className="auth-error" role="alert">{error}<button className="table-btn" onClick={() => {
          setError(""); setLoading(true);
          load().catch((err) => setError(err.message)).finally(() => setLoading(false));
        }}>Retry</button></div>}
        {loading ? <p role="status">Loading accounts...</p> : !error && (
          <div className="structure-stack">
            {filtered.map((account) => <AccountCard key={account.id} account={account} onSaved={onSaved} />)}
            {!filtered.length && <div className="card">No accounts match these filters.</div>}
          </div>
        )}
      </main>
    </div>
  );
}

import { Fragment, useCallback, useEffect, useRef, useState } from "react";
import AdminSidebar from "./AdminSidebar.jsx";
import { useAuth } from "../../context/AuthContext.jsx";
import { useLabChange } from "../../context/LabChangeContext.jsx";
import { api } from "../../api/client.js";
export default function ManageAccounts() {
  const { user } = useAuth(),
    { academicGroups, refresh: refreshAcademic } = useLabChange();
  const [accounts, setAccounts] = useState([]),
    [registrations, setRegistrations] = useState([]),
    [filter, setFilter] = useState({ search: "", role: "", status: "" });
  const [selected, setSelected] = useState(null),
    [error, setError] = useState(""),
    [message, setMessage] = useState(""),
    [busy, setBusy] = useState(false),
    [loading, setLoading] = useState(true);
  const requestVersion = useRef(0);
  const updateFilter = (value) => {
    requestVersion.current++;
    setLoading(true);
    setSelected(null);
    setFilter(value);
  };
  const refresh = useCallback(async () => {
    const version = ++requestVersion.current;
    const params = new URLSearchParams(
      Object.entries(filter).filter(([, value]) => value),
    );
    const [rows, pending] = await Promise.all([
      api(`/admin/accounts?${params}`),
      user.adminLevel === "SUPER_ADMIN"
        ? api("/admin/registrations")
        : Promise.resolve([]),
    ]);
    if (version === requestVersion.current) {
      setAccounts(rows);
      setRegistrations(pending);
      setLoading(false);
    }
  }, [filter, user.adminLevel]);
  useEffect(() => {
    let active = true;
    const timer = setTimeout(() => {
      if (active)
        refresh().catch((err) => {
          setError(err.message);
          setLoading(false);
        });
    }, 200);
    return () => {
      active = false;
      clearTimeout(timer);
    };
  }, [refresh]);
  async function act(work) {
    setBusy(true);
    setError("");
    setMessage("");
    try {
      const result = await work();
      setMessage(result?.message || "Change saved.");
      await Promise.all([refresh(), refreshAcademic()]);
      return true;
    } catch (err) {
      setError(err.message);
      return false;
    } finally {
      setBusy(false);
    }
  }
  async function details(id) {
    setBusy(true);
    setError("");
    try {
      setSelected(await api(`/admin/accounts/${id}`));
    } catch (err) {
      setError(err.message);
    } finally {
      setBusy(false);
    }
  }
  async function toggle(account) {
    if (
      !window.confirm(
        `${account.isActive ? "Deactivate" : "Activate"} ${account.email || "Deleted login (history retained)"}? ${account.isActive ? "All sessions will be revoked and academic history retained." : "Email verification and identity approval remain required."}`,
      )
    )
      return;
    if (
      await act(() =>
        api(`/admin/accounts/${account.id}`, {
          method: "PATCH",
          body: { isActive: !account.isActive },
        }),
      )
    )
      setSelected(null);
  }
  async function archive(account) {
    const confirmation = window.prompt(
      `Delete the login for ${account.email || "Deleted login (history retained)"}? History will stay on the old profile. This email can sign up as a new account. Type the email to confirm.`,
    );
    if (confirmation !== account.email) return;
    if (
      await act(() =>
        api(`/admin/accounts/${account.id}/archive`, {
          method: "POST",
          body: { confirmEmail: confirmation },
        }),
      )
    )
      setSelected(null);
  }
  async function remove(account) {
    const confirmation = window.prompt(
      `Permanently delete ${account.email || "Deleted login (history retained)"}? This removes credentials and profile only if there is no protected history. Otherwise deletion is blocked; deactivation retains history. Type the email to confirm.`,
    );
    if (confirmation !== account.email) return;
    if (
      await act(() =>
        api(`/admin/accounts/${account.id}`, {
          method: "DELETE",
          body: { confirmEmail: confirmation },
        }),
      )
    )
      setSelected(null);
  }
  async function review(row, decision) {
    if (
      !window.confirm(
        `${decision === "APPROVED" ? "Approve" : "Reject"} registration for ${row.email}? Approval preserves the trusted roster identity and checks automatic placement.`,
      )
    )
      return;
    await act(() =>
      api(`/admin/registrations/${row.id}`, {
        method: "PATCH",
        body: { decision },
      }),
    );
  }
  return (
    <div className="student-layout">
      <AdminSidebar />
      <main className="student-main">
        <h1>Account Management</h1>
        <p>
          Trusted identity records control roles. Deactivation retains academic
          history; permanent deletion is allowed only without protected
          dependencies.
        </p>
        {error && (
          <p className="auth-error" role="alert">
            {error}
          </p>
        )}
        {message && (
          <p className="auth-info" role="status">
            {message}
          </p>
        )}
        <div className="request-form-row">
          <label>
            Search accounts
            <input
              className="form-input"
              value={filter.search}
              onChange={(e) =>
                updateFilter({ ...filter, search: e.target.value })
              }
            />
          </label>
          <label>
            Role
            <select
              className="form-input"
              value={filter.role}
              onChange={(e) =>
                updateFilter({ ...filter, role: e.target.value })
              }
            >
              <option value="">All roles</option>
              {["STUDENT", "TEACHER", "ADMIN"].map((v) => (
                <option key={v}>{v}</option>
              ))}
            </select>
          </label>
          <label>
            Status
            <select
              className="form-input"
              value={filter.status}
              onChange={(e) =>
                updateFilter({ ...filter, status: e.target.value })
              }
            >
              <option value="">All statuses</option>
              {["APPROVED", "PENDING", "REJECTED", "INACTIVE"].map((v) => (
                <option key={v}>{v}</option>
              ))}
            </select>
          </label>
        </div>
        {loading ? (
          <p>Loading accounts…</p>
        ) : (
          <div className="table-scroll">
            <table className="admin-table">
              <thead>
                <tr>
                  <th>Name / email</th>
                  <th>Role / group</th>
                  <th>Status</th>
                  <th>Actions</th>
                </tr>
              </thead>
              <tbody>
                {accounts.map((a) => (
                  <Fragment key={a.id}>
                    <tr>
                      <td>
                        {a.firstName} {a.lastName}
                        <br />
                        {a.email || "Deleted login (history retained)"}
                      </td>
                      <td>
                        {a.role}
                        <br />
                        {a.academicGroupCode}
                      </td>
                      <td>
                        {a.isActive ? a.status : "INACTIVE"} ·{" "}
                        {a.emailVerifiedAt
                          ? "Email verified"
                          : "Email unverified"}
                      </td>
                      <td>
                        <button
                          disabled={busy}
                          aria-expanded={selected?.id === a.id}
                          onClick={() =>
                            selected?.id === a.id
                              ? setSelected(null)
                              : details(a.id)
                          }
                        >
                          Details
                        </button>
                      </td>
                    </tr>
                    {selected?.id === a.id && (
                      <tr className="account-details-row">
                        <td colSpan="4">
                          <section
                            className="student-card"
                            aria-label="Account details"
                          >
                            <h2>
                              {selected.firstName} {selected.lastName}
                            </h2>
                            <p>
                              {selected.email ||
                                "Deleted login (history retained)"}{" "}
                              · {selected.role} · {selected.status}
                            </p>
                            <p>
                              Protected dependencies:{" "}
                              {selected.dependencies.length
                                ? selected.dependencies
                                    .map((d) => `${d.count} ${d.type}`)
                                    .join(", ")
                                : "None"}
                            </p>
                            <form
                              className="auth-form"
                              onSubmit={async (e) => {
                                e.preventDefault();
                                const fields = new FormData(e.currentTarget);
                                if (
                                  await act(() =>
                                    api(`/admin/accounts/${selected.id}`, {
                                      method: "PATCH",
                                      body: {
                                        firstName: fields.get("firstName"),
                                        lastName: fields.get("lastName"),
                                        ...(selected.role === "STUDENT"
                                          ? {
                                              academicGroupId: Number(
                                                fields.get("academicGroupId"),
                                              ),
                                            }
                                          : {}),
                                      },
                                    }),
                                  )
                                )
                                  setSelected(null);
                              }}
                              key={selected.id}
                            >
                              <label>
                                Trusted first name
                                <input
                                  className="form-input"
                                  name="firstName"
                                  required
                                  defaultValue={selected.firstName}
                                />
                              </label>
                              <label>
                                Trusted surname
                                <input
                                  className="form-input"
                                  name="lastName"
                                  required
                                  defaultValue={selected.lastName}
                                />
                              </label>
                              {selected.role === "STUDENT" && (
                                <label>
                                  Academic group
                                  <select
                                    name="academicGroupId"
                                    className="form-input"
                                    defaultValue={selected.academicGroupId}
                                  >
                                    {academicGroups.map((g) => (
                                      <option key={g.id} value={g.id}>
                                        {g.code}
                                      </option>
                                    ))}
                                  </select>
                                </label>
                              )}
                              <button
                                disabled={busy || Boolean(selected.archivedAt)}
                              >
                                Save identity correction
                              </button>
                            </form>
                            <div className="request-form-row">
                              <button
                                disabled={
                                  busy ||
                                  selected.id === user.id ||
                                  Boolean(selected.archivedAt)
                                }
                                onClick={() => toggle(selected)}
                              >
                                {selected.isActive
                                  ? "Deactivate account"
                                  : "Activate account"}
                              </button>
                              <button
                                disabled={
                                  busy ||
                                  selected.id === user.id ||
                                  Boolean(selected.archivedAt)
                                }
                                onClick={() => remove(selected)}
                              >
                                Permanently delete account
                              </button>
                              {selected.role !== "ADMIN" &&
                                !selected.archivedAt && (
                                  <button
                                    disabled={busy}
                                    onClick={() => archive(selected)}
                                  >
                                    Delete login, keep history
                                  </button>
                                )}
                              <button onClick={() => setSelected(null)}>
                                Close details
                              </button>
                            </div>
                            {selected.id === user.id && (
                              <p>
                                You cannot deactivate or delete your current
                                administrator account.
                              </p>
                            )}
                          </section>
                        </td>
                      </tr>
                    )}
                  </Fragment>
                ))}
              </tbody>
            </table>
            {!accounts.length && <p>No matching accounts.</p>}
          </div>
        )}
        {user.adminLevel === "SUPER_ADMIN" && (
          <section className="student-card">
            <h2>Registration Review</h2>
            <p>
              Review verified registrations here. A mismatched or unrecognized
              email group must be resolved before approval.
            </p>
            <div className="table-scroll">
              <table className="admin-table">
                <thead>
                  <tr>
                    <th>Submitted identity</th>
                    <th>Group</th>
                    <th>Status / reason</th>
                    <th>Review</th>
                  </tr>
                </thead>
                <tbody>
                  {registrations.map((r) => (
                    <tr key={r.id}>
                      <td>
                        {r.firstName} {r.lastName}
                        <br />
                        {r.email}
                        <br />
                        {r.role}
                      </td>
                      <td>{r.groupCode || "Unrecognized"}</td>
                      <td>
                        {r.status} ·{" "}
                        {r.emailVerifiedAt
                          ? "Email verified"
                          : "Awaiting email verification"}
                        <br />
                        {r.reason}
                      </td>
                      <td>
                        {r.status === "PENDING" && (
                          <>
                            <button
                              disabled={busy || !r.emailVerifiedAt}
                              onClick={() => review(r, "APPROVED")}
                            >
                              Approve
                            </button>
                            <button
                              disabled={busy}
                              onClick={() => review(r, "REJECTED")}
                            >
                              Reject
                            </button>
                          </>
                        )}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
              {!registrations.length && <p>No registrations to review.</p>}
            </div>
          </section>
        )}
      </main>
    </div>
  );
}

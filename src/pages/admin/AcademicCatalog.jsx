import { useEffect, useState } from 'react';
import AdminSidebar from './AdminSidebar.jsx';
import { useAuth } from '../../context/AuthContext.jsx';
import { useLabChange } from '../../context/LabChangeContext.jsx';
import { api } from '../../api/client.js';
const definitions = {
  units: {
    title: 'Departments / academic units',
    fields: ['code', 'name', 'unitType'],
  },
  specializations: {
    title: 'Specializations',
    fields: ['code', 'name', 'academicUnitId'],
  },
  groups: {
    title: 'Academic groups',
    fields: ['code', 'name', 'specializationId'],
  },
  'lab-groups': {
    title: 'Laboratory subgroups',
    fields: ['code', 'academicGroupId'],
  },
  subjects: { title: 'Subjects', fields: ['code', 'name'] },
};
const labels = {
  code: 'Code',
  name: 'Name',
  unitType: 'Unit type',
  academicUnitId: 'Academic unit',
  specializationId: 'Specialization',
  academicGroupId: 'Academic group',
};
export default function AcademicCatalog() {
  const { user } = useAuth(),
    { academicUnits, specializations, academicGroups, refresh } =
      useLabChange();
  const [type, setType] = useState('units'),
    [rows, setRows] = useState([]),
    [form, setForm] = useState(null),
    [error, setError] = useState(''),
    [busy, setBusy] = useState(false),
    [loadedType, setLoadedType] = useState(null),
    [reload, setReload] = useState(0),
    [loadError, setLoadError] = useState(''),
    [message, setMessage] = useState('');
  useEffect(() => {
    let active = true;
    if (user.adminLevel === 'SUPER_ADMIN')
      api(`/admin/catalog/${type}`)
        .then((records) => {
          if (active) {
            setRows(records);
            setLoadedType(type);
            setLoadError('');
          }
        })
        .catch((err) => {
          if (active) {
            setRows([]);
            setLoadedType(type);
            setLoadError(err.message);
          }
        });
    return () => {
      active = false;
    };
  }, [type, user.adminLevel, reload]);
  const loading = loadedType !== type;
  const visibleRows = loading ? [] : rows;
  const options = {
    unitType: [
      { id: 'INSTITUTE', name: 'Institute' },
      { id: 'FACULTY', name: 'Faculty' },
    ],
    academicUnitId: academicUnits,
    specializationId: specializations,
    academicGroupId: academicGroups,
  };
  async function save(e) {
    e.preventDefault();
    if (busy || loading) return;
    setBusy(true);
    setError('');
    try {
      const body = Object.fromEntries(
        definitions[type].fields.map((key) => [
          key,
          key.endsWith('Id') ? Number(form[key]) : form[key],
        ]),
      );
      await api(`/admin/catalog/${type}${form.id ? '/' + form.id : ''}`, {
        method: form.id ? 'PATCH' : 'POST',
        body,
      });
      setRows(await api(`/admin/catalog/${type}`));
      await refresh();
      setForm(null);
      setMessage('Configuration saved.');
    } catch (err) {
      setError(err.message);
    } finally {
      setBusy(false);
    }
  }
  async function remove(row) {
    if (busy || loading) return;
    if (
      !window.confirm(
        `Delete ${row.code}? Records referenced by academic history or other configuration cannot be deleted.`,
      )
    )
      return;
    setBusy(true);
    setError('');
    try {
      await api(`/admin/catalog/${type}/${row.id}`, { method: 'DELETE' });
      setRows(await api(`/admin/catalog/${type}`));
      await refresh();
      setMessage('Unused configuration deleted.');
    } catch (err) {
      setError(err.message);
    } finally {
      setBusy(false);
    }
  }
  return (
    <div className="student-layout">
      <AdminSidebar />
      <main className="student-main">
        <h1>Academic Configuration</h1>
        {user.adminLevel !== 'SUPER_ADMIN' ? (
          <p>
            Configuration changes require a super administrator. Use Academic
            Structure to view your unit.
          </p>
        ) : (
          <>
            <label>
              Configuration type
              <select
                className="form-input"
                aria-label="Configuration type"
                value={type}
                disabled={busy}
                onChange={(e) => {
                  if (e.target.value === type) return;
                  setType(e.target.value);
                  setLoadedType(null);
                  setForm(null);
                  setError('');
                  setLoadError('');
                  setMessage('');
                }}
              >
                {Object.entries(definitions).map(([key, d]) => (
                  <option key={key} value={key}>
                    {d.title}
                  </option>
                ))}
              </select>
            </label>
            <button
              className="primary-button"
              disabled={busy || loading || Boolean(loadError)}
              onClick={() =>
                setForm(
                  Object.fromEntries(
                    definitions[type].fields.map((key) => [
                      key,
                      key === 'unitType' ? 'INSTITUTE' : '',
                    ]),
                  ),
                )
              }
            >
              Create record
            </button>
            {loading && <p role="status">Loading configuration…</p>}
            {loadError && (
              <div role="alert">
                {loadError}{' '}
                <button
                  onClick={() => {
                    setLoadedType(null);
                    setLoadError('');
                    setReload((n) => n + 1);
                  }}
                >
                  Retry loading configuration
                </button>
              </div>
            )}
            {error && (
              <p className="auth-error" role="alert">
                {error}
              </p>
            )}
            {message && <p role="status">{message}</p>}
            {form && (
              <form className="student-card auth-form" onSubmit={save}>
                {definitions[type].fields.map((key) => (
                  <label key={key}>
                    {labels[key]}
                    {options[key] ? (
                      <select
                        required
                        className="form-input"
                        aria-label={labels[key]}
                        value={form[key]}
                        onChange={(e) =>
                          setForm({ ...form, [key]: e.target.value })
                        }
                      >
                        <option value="">Select</option>
                        {options[key].map((o) => (
                          <option key={o.id} value={o.id}>
                            {o.code || o.name} {o.code ? o.name : ''}
                          </option>
                        ))}
                      </select>
                    ) : (
                      <input
                        className="form-input"
                        required
                        maxLength={key === 'code' ? 50 : 255}
                        value={form[key]}
                        onChange={(e) =>
                          setForm({ ...form, [key]: e.target.value })
                        }
                      />
                    )}
                  </label>
                ))}
                <button disabled={busy}>Save record</button>
                <button
                  type="button"
                  disabled={busy}
                  onClick={() => setForm(null)}
                >
                  Cancel
                </button>
              </form>
            )}
            <table className="admin-table">
              <thead>
                <tr>
                  {definitions[type].fields.map((key) => (
                    <th key={key}>{labels[key]}</th>
                  ))}
                  <th>Actions</th>
                </tr>
              </thead>
              <tbody>
                {visibleRows.map((row) => (
                  <tr key={row.id}>
                    {definitions[type].fields.map((key) => (
                      <td key={key}>
                        {options[key]?.find(
                          (o) => String(o.id) === String(row[key]),
                        )?.name || row[key]}
                      </td>
                    ))}
                    <td>
                      <button disabled={busy} onClick={() => setForm(row)}>
                        Edit
                      </button>
                      <button disabled={busy} onClick={() => remove(row)}>
                        Delete
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
            {!loading && !loadError && !visibleRows.length && (
              <p>No records. Create approved academic configuration above.</p>
            )}
          </>
        )}
      </main>
    </div>
  );
}

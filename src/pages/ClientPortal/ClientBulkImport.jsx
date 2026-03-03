/* ══════════════════════════════════════════════════════════════
 * ClientBulkImport.jsx — CSV Bulk Order Import
 * ══════════════════════════════════════════════════════════════ */
import { useState, useRef } from 'react';
import { Upload, Download, CheckCircle, WarningTriangle } from 'iconoir-react';
import './ClientPages.css';

const API_URL = import.meta.env.VITE_API_URL || '/api';

export default function ClientBulkImport() {
  const [loading, setLoading] = useState(false);
  const [result, setResult]   = useState(null);
  const [error, setError]     = useState('');
  const fileRef = useRef(null);

  const handleUpload = async (e) => {
    e.preventDefault();
    const file = fileRef.current?.files?.[0];
    if (!file) return setError('Please select a CSV file');
    setError('');
    setResult(null);
    setLoading(true);

    try {
      const token = localStorage.getItem('crm_token');
      const formData = new FormData();
      formData.append('file', file);

      const res = await fetch(`${API_URL}/client-portal/bulk-import`, {
        method: 'POST',
        headers: { 'Authorization': `Bearer ${token}` },
        credentials: 'include',
        body: formData,
      });
      if (res.status === 401) { window.location.href = '/merchant/login'; return; }
      const data = await res.json();
      if (data.success) setResult(data.data);
      else setError(data.message);
    } catch { setError('Upload failed'); }
    setLoading(false);
  };

  const downloadTemplate = () => {
    const csv = 'recipient_name,recipient_phone,recipient_address,recipient_area,recipient_emirate,payment_method,cod_amount,delivery_fee,description,notes\n';
    const blob = new Blob([csv], { type: 'text/csv' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a'); a.href = url; a.download = 'order_import_template.csv'; a.click();
    URL.revokeObjectURL(url);
  };

  return (
    <div className="cp-page">
      <div className="cp-page-header">
        <h1 className="cp-page-title">Bulk Import Orders</h1>
        <button className="cp-btn cp-btn-outline" onClick={downloadTemplate}>
          <Download width={16} height={16} /> Download Template
        </button>
      </div>

      <div className="cp-card" style={{ maxWidth: 600 }}>
        <h3 className="cp-card-title">Upload CSV File</h3>
        <p className="cp-detail-sub" style={{ marginBottom: 16 }}>
          Upload a CSV with columns: <code>recipient_name</code>, <code>recipient_phone</code>, <code>recipient_address</code> (required).
          Optional: <code>recipient_area</code>, <code>recipient_emirate</code>, <code>payment_method</code>, <code>cod_amount</code>, <code>delivery_fee</code>, <code>description</code>, <code>notes</code>.
        </p>

        <form onSubmit={handleUpload}>
          <div className="cp-upload-zone">
            <Upload width={32} height={32} style={{ color: '#94a3b8' }} />
            <p>Drag & drop or click to select CSV file</p>
            <input type="file" accept=".csv" ref={fileRef} className="cp-file-input" />
          </div>

          {error && <div className="ca-alert ca-alert-error" style={{ marginTop: 12 }}><WarningTriangle width={16} height={16} />{error}</div>}

          <button type="submit" className="cp-btn cp-btn-primary" disabled={loading} style={{ marginTop: 16 }}>
            {loading ? <span className="cp-spinner" style={{ width: 18, height: 18, borderWidth: 2 }} /> : <><Upload width={16} height={16} /> Import Orders</>}
          </button>
        </form>

        {result && (
          <div className="cp-import-result" style={{ marginTop: 24 }}>
            <div className="ca-alert ca-alert-success">
              <CheckCircle width={16} height={16} />
              <span>{result.created} orders created successfully</span>
            </div>
            {result.errors?.length > 0 && (
              <div style={{ marginTop: 12 }}>
                <p style={{ fontWeight: 600, color: '#ef4444', fontSize: 13 }}>{result.errors.length} errors:</p>
                <ul style={{ fontSize: 12, color: '#64748b', paddingLeft: 20 }}>
                  {result.errors.slice(0, 10).map((err, i) => (
                    <li key={i}>Row {err.row}: {err.message}</li>
                  ))}
                  {result.errors.length > 10 && <li>...and {result.errors.length - 10} more</li>}
                </ul>
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  );
}

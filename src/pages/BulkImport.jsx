import { useState, useCallback, useMemo, useRef } from 'react';
import {
  Upload, Download, Check, Xmark, WarningCircle, Package,
  Clock, NavArrowRight, NavArrowLeft, RefreshDouble, Page,
  Plus, Cube, Search, Eye, ArrowDown
} from 'iconoir-react';
import { api } from '../lib/api';
import './BulkImport.css';
import { useTranslation } from 'react-i18next';

const REQUIRED_FIELDS = ['recipient_name', 'recipient_phone', 'recipient_address'];
const SYSTEM_FIELDS = [
  { key: 'recipient_name', label: 'Recipient Name', required: true },
  { key: 'recipient_phone', label: 'Recipient Phone', required: true },
  { key: 'recipient_address', label: 'Recipient Address', required: true },
  { key: 'recipient_area', label: 'Area / District', required: false },
  { key: 'recipient_emirate', label: 'Emirate / City', required: false },
  { key: 'sender_name', label: 'Sender Name', required: false },
  { key: 'sender_phone', label: 'Sender Phone', required: false },
  { key: 'sender_address', label: 'Sender Address', required: false },
  { key: 'order_type', label: 'Order Type', required: false },
  { key: 'category', label: 'Category', required: false },
  { key: 'weight_kg', label: 'Weight (kg)', required: false },
  { key: 'description', label: 'Description', required: false },
  { key: 'special_instructions', label: 'Special Instructions', required: false },
  { key: 'payment_method', label: 'Payment Method', required: false },
  { key: 'cod_amount', label: 'COD Amount', required: false },
  { key: 'delivery_fee', label: 'Delivery Fee', required: false },
  { key: 'notes', label: 'Notes', required: false },
];

function parseCSV(text) {
  const lines = text.split(/\r?\n/).filter(l => l.trim());
  if (lines.length < 2) return { headers: [], rows: [] };
  const headers = lines[0].split(',').map(h => h.trim().replace(/^["']|["']$/g, ''));
  const rows = lines.slice(1).map((line, idx) => {
    const vals = line.match(/(?:^|,)("(?:[^"]|"")*"|[^,]*)/g)?.map(v =>
      v.replace(/^,/, '').replace(/^"(.*)"$/, '$1').replace(/""/g, '"').trim()
    ) || [];
    const row = {};
    headers.forEach((h, i) => { row[h] = vals[i] || ''; });
    row.__idx = idx;
    return row;
  });
  return { headers, rows };
}

function generateCSVTemplate() {
  const headers = SYSTEM_FIELDS.map(f => f.key).join(',');
  const sample = 'John Doe,+971501234567,123 Al Barsha Dubai,Al Barsha,Dubai,Sender Co,+971501111111,Warehouse 1,standard,parcel,2.5,Electronics,Handle with care,cod,150,25,Urgent delivery';
  return `${headers}\n${sample}`;
}

function downloadCSV(content, filename) {
  const blob = new Blob([content], { type: 'text/csv;charset=utf-8;' });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url; a.download = filename; a.click();
  URL.revokeObjectURL(url);
}

export default function BulkImport() {
  const { t } = useTranslation();
  const fileRef = useRef(null);
  const [step, setStep] = useState(1); // 1=upload, 2=map, 3=preview, 4=importing, 5=done
  const [dragOver, setDragOver] = useState(false);
  const [fileName, setFileName] = useState('');
  const [csvHeaders, setCsvHeaders] = useState([]);
  const [csvRows, setCsvRows] = useState([]);
  const [mapping, setMapping] = useState({});
  const [importResult, setImportResult] = useState(null);
  const [importing, setImporting] = useState(false);
  const [importProgress, setImportProgress] = useState(0);
  const [importHistory, setImportHistory] = useState([]);

  // Auto-map headers
  const autoMap = (headers) => {
    const map = {};
    SYSTEM_FIELDS.forEach(f => {
      const match = headers.find(h => {
        const hn = h.toLowerCase().replace(/[^a-z0-9]/g, '');
        const fn = f.key.toLowerCase().replace(/_/g, '');
        const fl = f.label.toLowerCase().replace(/[^a-z0-9]/g, '');
        return hn === fn || hn === fl || hn.includes(fn) || fn.includes(hn);
      });
      if (match) map[f.key] = match;
    });
    return map;
  };

  const handleFile = (file) => {
    if (!file) return;
    if (!file.name.match(/\.(csv|txt)$/i)) {
      alert(t('bulkImport.upload_csv_alert'));
      return;
    }
    setFileName(file.name);
    const reader = new FileReader();
    reader.onload = (e) => {
      const { headers, rows } = parseCSV(e.target.result);
      setCsvHeaders(headers);
      setCsvRows(rows);
      const autoMapped = autoMap(headers);
      setMapping(autoMapped);
      setStep(2);
    };
    reader.readAsText(file);
  };

  const handleDrop = (e) => {
    e.preventDefault();
    setDragOver(false);
    handleFile(e.dataTransfer.files[0]);
  };

  const handleFileSelect = (e) => {
    handleFile(e.target.files[0]);
  };

  // Validate rows
  const validatedRows = useMemo(() => {
    return csvRows.map(row => {
      const errors = [];
      REQUIRED_FIELDS.forEach(field => {
        const csvCol = mapping[field];
        if (!csvCol || !row[csvCol]?.trim()) {
          errors.push(t('bulkImport.missing_field', { field: t('bulkImport.fields.' + field) }));
        }
      });
      return { ...row, __errors: errors, __valid: errors.length === 0 };
    });
  }, [csvRows, mapping]);

  const validCount = validatedRows.filter(r => r.__valid).length;
  const invalidCount = validatedRows.filter(r => !r.__valid).length;

  // Build mapped data
  const buildOrderData = (row) => {
    const data = {};
    SYSTEM_FIELDS.forEach(f => {
      const csvCol = mapping[f.key];
      if (csvCol && row[csvCol]) data[f.key] = row[csvCol];
    });
    return data;
  };

  // Import
  const runImport = async () => {
    setImporting(true);
    setStep(4);
    const validRows = validatedRows.filter(r => r.__valid);
    let success = 0, failed = 0;
    const errors = [];

    for (let i = 0; i < validRows.length; i++) {
      try {
        const orderData = buildOrderData(validRows[i]);
        const res = await api.post('/orders', orderData);
        if (res?.success) success++;
        else { failed++; errors.push({ row: i + 1, error: res?.message || t('bulkImport.unknown_error') }); }
      } catch (err) {
        failed++;
        errors.push({ row: i + 1, error: err.message });
      }
      setImportProgress(Math.round(((i + 1) / validRows.length) * 100));
    }

    const result = {
      total: validRows.length,
      success,
      failed,
      errors,
      fileName,
      timestamp: new Date().toISOString()
    };
    setImportResult(result);
    setImportHistory(prev => [result, ...prev]);
    setImporting(false);
    setStep(5);
  };

  const resetImport = () => {
    setStep(1);
    setFileName('');
    setCsvHeaders([]);
    setCsvRows([]);
    setMapping({});
    setImportResult(null);
    setImportProgress(0);
    if (fileRef.current) fileRef.current.value = '';
  };

  const requiredMapped = REQUIRED_FIELDS.every(f => mapping[f]);

  return (
    <div className="blk-page">
      {/* Hero */}
      <div className="module-hero">
        <div className="module-hero-left">
          <div className="module-hero-icon"><Upload size={26} /></div>
          <div>
            <h1 className="module-hero-title">{t("bulkImport.title")}</h1>
            <p className="module-hero-sub">{t("bulkImport.subtitle")}</p>
          </div>
        </div>
        <div className="module-hero-actions">
          <button className="module-btn module-btn-outline" onClick={() => downloadCSV(generateCSVTemplate(), 'trasealla_import_template.csv')}>
            <Download size={16} /> {t('bulkImport.download_template')}
          </button>
        </div>
      </div>

      {/* Steps Indicator */}
      <div className="blk-steps">
        {[
          { num: 1, label: t('bulkImport.step_upload') },
          { num: 2, label: t('bulkImport.step_map') },
          { num: 3, label: t('bulkImport.step_preview') },
          { num: 4, label: t('bulkImport.step_import') },
          { num: 5, label: t('bulkImport.step_complete') },
        ].map((s, i) => (
          <span key={s.num} style={{ display: 'contents' }}>
            <div className={`blk-step ${step === s.num ? 'active' : ''} ${step > s.num ? 'completed' : ''}`}>
              <span className="blk-step-num">
                {step > s.num ? <Check size={14} /> : s.num}
              </span>
              <span className="blk-step-label">{s.label}</span>
            </div>
            {i < 4 && <div className={`blk-step-line ${step > s.num ? 'done' : ''}`} />}
          </span>
        ))}
      </div>

      {/* Step 1: Upload */}
      {step === 1 && (
        <>
          {/* Template Download Card */}
          <div className="blk-template-card">
            <div className="blk-template-icon"><Page size={24} /></div>
            <div className="blk-template-body">
              <div className="blk-template-title">{t('bulkImport.csv_template')}</div>
              <div className="blk-template-sub">{t('bulkImport.csv_template_desc')}</div>
            </div>
            <button className="blk-template-btn" onClick={() => downloadCSV(generateCSVTemplate(), 'trasealla_import_template.csv')}>
              <Download size={14} /> {t('bulkImport.download')}
            </button>
          </div>

          {/* Upload Zone */}
          <div
            className={`blk-upload-zone ${dragOver ? 'drag-over' : ''}`}
            onDragOver={e => { e.preventDefault(); setDragOver(true); }}
            onDragLeave={() => setDragOver(false)}
            onDrop={handleDrop}
            onClick={() => fileRef.current?.click()}
          >
            <div className="blk-upload-icon"><Upload size={28} /></div>
            <div className="blk-upload-title">{t("bulkImport.drag_drop")}</div>
            <div className="blk-upload-sub">{t('bulkImport.browse_hint')}</div>
            <button className="blk-upload-btn" type="button"><Plus size={16} /> {t('bulkImport.select_file')}</button>
            <div className="blk-upload-formats">{t("bulkImport.supported_formats")}</div>
            <input ref={fileRef} type="file" accept=".csv,.txt" style={{ display: 'none' }} onChange={handleFileSelect} />
          </div>

          {/* Import History */}
          {importHistory.length > 0 && (
            <div className="blk-history-card">
              <div className="blk-history-header"><Clock size={16} /> {t('bulkImport.recent_imports')}</div>
              {importHistory.slice(0, 5).map((h, i) => (
                <div key={i} className="blk-history-item">
                  <div className="blk-history-icon" style={{ background: h.failed > 0 ? '#fef3c7' : '#dcfce7' }}>
                    <Package size={18} color={h.failed > 0 ? '#d97706' : '#16a34a'} />
                  </div>
                  <div className="blk-history-body">
                    <div className="blk-history-name">{h.fileName}</div>
                    <div className="blk-history-meta">
                      <span>{t('bulkImport.imported_count', { count: h.success })}</span>
                      {h.failed > 0 && <span>{t('bulkImport.failed_count', { count: h.failed })}</span>}
                      <span>{new Date(h.timestamp).toLocaleString()}</span>
                    </div>
                  </div>
                  <span className={`blk-history-badge ${h.failed === 0 ? 'success' : 'partial'}`}>
                    {h.failed === 0 ? t('bulkImport.status_complete') : t('bulkImport.status_partial')}
                  </span>
                </div>
              ))}
            </div>
          )}
        </>
      )}

      {/* Step 2: Column Mapping */}
      {step === 2 && (
        <>
          <div className="blk-stats-grid">
            <div className="blk-stat-card primary">
              <div className="blk-stat-card-row">
                <div className="blk-stat-icon" style={{ background: '#fff7ed' }}><Page size={20} color="#f97316" /></div>
                <div><span className="blk-stat-val">{csvRows.length}</span><span className="blk-stat-lbl">{t("bulkImport.rows_detected")}</span></div>
              </div>
            </div>
            <div className="blk-stat-card success">
              <div className="blk-stat-card-row">
                <div className="blk-stat-icon" style={{ background: '#dcfce7' }}><Check size={20} color="#16a34a" /></div>
                <div><span className="blk-stat-val">{csvHeaders.length}</span><span className="blk-stat-lbl">{t("bulkImport.columns_found")}</span></div>
              </div>
            </div>
            <div className="blk-stat-card warning">
              <div className="blk-stat-card-row">
                <div className="blk-stat-icon" style={{ background: '#fef3c7' }}><NavArrowRight size={20} color="#d97706" /></div>
                <div><span className="blk-stat-val">{Object.keys(mapping).length}</span><span className="blk-stat-lbl">{t("bulkImport.auto_mapped")}</span></div>
              </div>
            </div>
          </div>

          <div className="blk-mapping-card">
            <div className="blk-mapping-title"><NavArrowRight size={18} /> {t('bulkImport.column_mapping')}</div>
            <p style={{ fontSize: 13, color: '#94a3b8', marginBottom: 16 }}>
              {t('bulkImport.mapping_desc')}
            </p>
            <div className="blk-mapping-grid">
              {SYSTEM_FIELDS.map(field => (
                <span key={field.key} style={{ display: 'contents' }}>
                  <div className="blk-mapping-label">
                    {t('bulkImport.fields.' + field.key)} {field.required && <span style={{ color: '#ef4444' }}>*</span>}
                  </div>
                  <div className="blk-mapping-arrow"><NavArrowRight size={16} /></div>
                  <select
                    className="blk-mapping-select"
                    value={mapping[field.key] || ''}
                    onChange={e => setMapping(prev => ({ ...prev, [field.key]: e.target.value }))}
                  >
                    <option value="">{t('bulkImport.skip')}</option>
                    {csvHeaders.map(h => (
                      <option key={h} value={h}>{h}</option>
                    ))}
                  </select>
                </span>
              ))}
            </div>
          </div>

          <div className="blk-action-bar">
            <button className="blk-btn-secondary" onClick={resetImport}>
              <NavArrowLeft size={14} /> {t('bulkImport.back')}
            </button>
            <button className="blk-btn-primary" disabled={!requiredMapped} onClick={() => setStep(3)}>
              {t('bulkImport.next_preview')} <NavArrowRight size={14} />
            </button>
          </div>
        </>
      )}

      {/* Step 3: Preview & Validate */}
      {step === 3 && (
        <>
          <div className="blk-stats-grid">
            <div className="blk-stat-card primary">
              <div className="blk-stat-card-row">
                <div className="blk-stat-icon" style={{ background: '#fff7ed' }}><Package size={20} color="#f97316" /></div>
                <div><span className="blk-stat-val">{csvRows.length}</span><span className="blk-stat-lbl">{t("bulkImport.total_rows")}</span></div>
              </div>
            </div>
            <div className="blk-stat-card success">
              <div className="blk-stat-card-row">
                <div className="blk-stat-icon" style={{ background: '#dcfce7' }}><Check size={20} color="#16a34a" /></div>
                <div><span className="blk-stat-val">{validCount}</span><span className="blk-stat-lbl">{t("bulkImport.valid")}</span></div>
              </div>
            </div>
            <div className="blk-stat-card danger">
              <div className="blk-stat-card-row">
                <div className="blk-stat-icon" style={{ background: '#fee2e2' }}><Xmark size={20} color="#ef4444" /></div>
                <div><span className="blk-stat-val">{invalidCount}</span><span className="blk-stat-lbl">{t("bulkImport.invalid")}</span></div>
              </div>
            </div>
          </div>

          <div className="blk-preview-wrap" style={{ maxHeight: 420, overflowY: 'auto' }}>
            <table className="blk-preview-table">
              <thead>
                <tr>
                  <th>{t('bulkImport.row_number')}</th>
                  <th>{t('bulkImport.status')}</th>
                  {SYSTEM_FIELDS.filter(f => mapping[f.key]).map(f => (
                    <th key={f.key}>{t('bulkImport.fields.' + f.key)}</th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {validatedRows.slice(0, 100).map((row, i) => (
                  <tr key={i} className={row.__valid ? 'blk-row-valid' : 'blk-row-invalid'}>
                    <td style={{ fontWeight: 600, color: '#94a3b8' }}>{i + 1}</td>
                    <td>
                      {row.__valid ? (
                        <span className="blk-valid"><Check size={12} /> {t('bulkImport.valid_label')}</span>
                      ) : (
                        <span className="blk-invalid" title={row.__errors.join(', ')}>
                          <Xmark size={12} /> {row.__errors[0]}
                        </span>
                      )}
                    </td>
                    {SYSTEM_FIELDS.filter(f => mapping[f.key]).map(f => (
                      <td key={f.key}>{row[mapping[f.key]] || '—'}</td>
                    ))}
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
          {csvRows.length > 100 && (
            <p style={{ fontSize: 12, color: '#94a3b8', textAlign: 'center', padding: 12 }}>
              {t('bulkImport.showing_rows', { shown: 100, total: csvRows.length })}
            </p>
          )}

          <div className="blk-action-bar">
            <button className="blk-btn-secondary" onClick={() => setStep(2)}>
              <NavArrowLeft size={14} /> {t('bulkImport.back_to_mapping')}
            </button>
            <button className="blk-btn-primary" disabled={validCount === 0} onClick={runImport}>
              <Upload size={14} /> {t('bulkImport.import_orders', { count: validCount })}
            </button>
          </div>
        </>
      )}

      {/* Step 4: Importing */}
      {step === 4 && (
        <div className="blk-progress-card">
          <div className="blk-progress-ring">
            <svg viewBox="0 0 100 100" width="100" height="100">
              <circle cx="50" cy="50" r="42" fill="none" stroke="#f1f5f9" strokeWidth="6" />
              <circle cx="50" cy="50" r="42" fill="none" stroke="#f97316" strokeWidth="6"
                      strokeDasharray={264} strokeDashoffset={264 - (264 * importProgress / 100)}
                      strokeLinecap="round" style={{ transition: 'stroke-dashoffset 0.3s' }} />
            </svg>
            <div className="blk-progress-ring-text">{importProgress}%</div>
          </div>
          <div className="blk-progress-title">{t("bulkImport.importing")}</div>
          <div className="blk-progress-sub">{t("bulkImport.please_wait")}</div>
          <div className="blk-spinner" />
        </div>
      )}

      {/* Step 5: Complete */}
      {step === 5 && importResult && (
        <>
          <div className="blk-progress-card" style={{ marginBottom: 24 }}>
            <div style={{ width: 64, height: 64, borderRadius: '50%', margin: '0 auto 16px',
                         background: importResult.failed === 0 ? '#dcfce7' : '#fef3c7',
                         display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
              {importResult.failed === 0 ? <Check size={28} color="#16a34a" /> : <WarningCircle size={28} color="#d97706" />}
            </div>
            <div className="blk-progress-title">
              {importResult.failed === 0 ? t('bulkImport.import_complete') : t('bulkImport.import_with_warnings')}
            </div>
            <div className="blk-progress-sub">
              {t('bulkImport.import_success_msg', { success: importResult.success, total: importResult.total })}
            </div>

            <div className="blk-stats-grid" style={{ marginTop: 24, maxWidth: 500, margin: '24px auto 0' }}>
              <div className="blk-stat-card success">
                <div className="blk-stat-card-row">
                  <div className="blk-stat-icon" style={{ background: '#dcfce7' }}><Check size={20} color="#16a34a" /></div>
                  <div><span className="blk-stat-val">{importResult.success}</span><span className="blk-stat-lbl">{t("bulkImport.imported")}</span></div>
                </div>
              </div>
              {importResult.failed > 0 && (
                <div className="blk-stat-card danger">
                  <div className="blk-stat-card-row">
                    <div className="blk-stat-icon" style={{ background: '#fee2e2' }}><Xmark size={20} color="#ef4444" /></div>
                    <div><span className="blk-stat-val">{importResult.failed}</span><span className="blk-stat-lbl">{t("bulkImport.failed")}</span></div>
                  </div>
                </div>
              )}
            </div>

            {/* Error details */}
            {importResult.errors.length > 0 && (
              <div style={{ marginTop: 20, textAlign: 'left', maxWidth: 500, margin: '20px auto 0' }}>
                <div style={{ fontSize: 13, fontWeight: 700, color: '#ef4444', marginBottom: 8 }}>{t("bulkImport.failed_rows")}</div>
                {importResult.errors.slice(0, 10).map((err, i) => (
                  <div key={i} style={{ fontSize: 12, color: '#64748b', padding: '4px 0', borderBottom: '1px solid #fafafa' }}>
                    {t('bulkImport.row_error', { row: err.row, error: err.error })}
                  </div>
                ))}
              </div>
            )}
          </div>

          <div className="blk-action-bar" style={{ justifyContent: 'center' }}>
            <button className="blk-btn-secondary" onClick={resetImport}>
              <RefreshDouble size={14} /> {t('bulkImport.import_more')}
            </button>
            <button className="blk-btn-primary" onClick={() => window.location.href = '/orders'}>
              <Eye size={14} /> {t('bulkImport.view_orders')}
            </button>
          </div>
        </>
      )}
    </div>
  );
}

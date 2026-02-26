import { useState, useEffect } from 'react';
import api from '../lib/api';
import './CRMPages.css';
import { useTranslation } from 'react-i18next';

const TX_BADGE = {
  topup:         { bg: '#dcfce7', color: '#16a34a',  label: 'wallet.type_topup' },
  credit:        { bg: '#dcfce7', color: '#16a34a',  label: 'wallet.type_credit' },
  debit:         { bg: '#fee2e2', color: '#dc2626',  label: 'wallet.type_debit' },
  cod_collected: { bg: '#dbeafe', color: '#1d4ed8',  label: 'wallet.type_cod_collected' },
  cod_settled:   { bg: '#fef3c7', color: '#d97706',  label: 'wallet.type_cod_settled' },
  charge:        { bg: '#fee2e2', color: '#dc2626',  label: 'wallet.type_charge' },
};

const fmtAED = v => `AED ${parseFloat(v || 0).toFixed(2)}`;

export default function Wallet() {
  const { t } = useTranslation();
  const fmtAED = v => `${t('wallet.currency_prefix')} ${parseFloat(v || 0).toFixed(2)}`;
  const [wallet,       setWallet]       = useState(null);
  const [transactions, setTransactions] = useState([]);
  const [codOrders,    setCodOrders]    = useState([]);
  const [loading,      setLoading]      = useState(true);
  const [activeTab,    setActiveTab]    = useState('transactions');
  const [showTopup,    setShowTopup]    = useState(false);
  const [showSettle,   setShowSettle]   = useState(false);
  const [topupForm,    setTopupForm]    = useState({ amount: '', reference: '', description: '' });
  const [settleForm,   setSettleForm]   = useState({ amount: '', reference: '', note: '' });
  const [collectOrder, setCollectOrder] = useState(null);
  const [collectAmt,   setCollectAmt]   = useState('');
  const [saving,       setSaving]       = useState(false);
  const [page,         setPage]         = useState(1);
  const PER_PAGE = 20;

  useEffect(() => { fetchAll(); }, []);

  const fetchAll = async () => {
    setLoading(true);
    const [wRes, tRes, cRes] = await Promise.all([
      api.get('/wallet'),
      api.get('/wallet/transactions'),
      api.get('/wallet/cod-orders'),
    ]);
    if (wRes.success) setWallet(wRes.data);
    if (tRes.success) setTransactions(tRes.data || []);
    if (cRes.success) setCodOrders(cRes.data || []);
    setLoading(false);
  };

  const handleTopup = async (e) => {
    e.preventDefault(); setSaving(true);
    const res = await api.post('/wallet/topup', topupForm);
    if (res.success) { setShowTopup(false); setTopupForm({ amount: '', reference: '', description: '' }); fetchAll(); }
    setSaving(false);
  };

  const handleSettle = async (e) => {
    e.preventDefault(); setSaving(true);
    const res = await api.post('/wallet/settle-cod', settleForm);
    if (res.success) { setShowSettle(false); setSettleForm({ amount: '', reference: '', note: '' }); fetchAll(); }
    setSaving(false);
  };

  const handleCollectCOD = async () => {
    if (!collectOrder || !collectAmt) return;
    setSaving(true);
    const res = await api.post('/wallet/collect-cod', {
      order_id: collectOrder.id,
      amount: collectAmt,
      note: t('wallet.cod_collected_note', { order_number: collectOrder.order_number }),
    });
    if (res.success) { setCollectOrder(null); setCollectAmt(''); fetchAll(); }
    setSaving(false);
  };

  const paged      = transactions.slice((page - 1) * PER_PAGE, page * PER_PAGE);
  const totalPages = Math.ceil(transactions.length / PER_PAGE);
  const pendingCOD   = codOrders.filter(o => !o.cod_collected);
  const collectedCOD = codOrders.filter(o => o.cod_collected);

  const modalStyle = { position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.45)', zIndex: 1000, display: 'flex', alignItems: 'center', justifyContent: 'center' };
  const boxStyle   = { background: 'var(--bg-card)', borderRadius: 16, padding: 32, width: '100%', maxWidth: 420, border: '1px solid var(--border)' };
  const fieldStyle = { width: '100%', padding: '8px 12px', borderRadius: 8, border: '1px solid var(--border)', background: 'var(--bg-hover)', color: 'var(--text-primary)', fontSize: '.875rem', boxSizing: 'border-box' };

  return (
    <div className="page-container">
      <div className="page-header-row" style={{ marginBottom: 24 }}>
        <div>
          <h2 className="page-heading">{t("wallet.title")}</h2>
          <p className="page-subheading">{t("wallet.subtitle")}</p>
        </div>
        <div style={{ display: 'flex', gap: 8 }}>
          <button className="btn-outline-action" onClick={() => setShowSettle(true)}>{t("wallet.settle_cod")}</button>
          <button style={{ padding: '8px 20px', borderRadius: 8, border: 'none', background: '#f97316', color: '#fff', fontWeight: 700, cursor: 'pointer', fontSize: '.875rem' }}
            onClick={() => setShowTopup(true)}>{t('wallet.top_up_btn')}</button>
        </div>
      </div>

      {loading ? (
        <div className="od-loading">{t("wallet.loading")}</div>
      ) : (
        <>
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(200px,1fr))', gap: 14, marginBottom: 24 }}>
            {[
              { label: t('wallet.available_balance'), value: fmtAED(wallet?.balance),        color: '#f97316', icon: '💰' },
              { label: t('wallet.cod_pending'),       value: fmtAED(wallet?.cod_pending),     color: '#1d4ed8', icon: '📦' },
              { label: t('wallet.total_credited'),    value: fmtAED(wallet?.total_credited),  color: '#16a34a', icon: '📈' },
              { label: t('wallet.total_debited'),     value: fmtAED(wallet?.total_debited),   color: '#dc2626', icon: '📉' },
              { label: t('wallet.transactions'),      value: transactions.length,             color: '#64748b', icon: '📄' },
              { label: t('wallet.uncollected_cod'),   value: pendingCOD.length + ' ' + t('wallet.orders_suffix'),   color: '#8b5cf6', icon: '⚠️' },
            ].map(c => (
              <div key={c.label} style={{ background: 'var(--bg-card)', border: '1px solid var(--border)', borderRadius: 12, padding: '16px 18px' }}>
                <div style={{ fontSize: '1.5rem', marginBottom: 6 }}>{c.icon}</div>
                <div style={{ fontSize: '1.35rem', fontWeight: 800, color: c.color }}>{c.value}</div>
                <div style={{ fontSize: '.75rem', color: 'var(--text-muted)', marginTop: 4 }}>{c.label}</div>
              </div>
            ))}
          </div>

          <div className="od-tabs" style={{ marginBottom: 20 }}>
            {[
              { key: 'transactions', label: t('wallet.tab_transactions_count', { count: transactions.length }) },
              { key: 'cod-pending',  label: t('wallet.tab_cod_uncollected_count', { count: pendingCOD.length }) },
              { key: 'cod-done',     label: t('wallet.tab_cod_collected_count', { count: collectedCOD.length }) },
            ].map(tab => (
              <button key={tab.key} className={`od-tab ${activeTab === tab.key ? 'active' : ''}`}
                onClick={() => setActiveTab(tab.key)}>{tab.label}</button>
            ))}
          </div>

          {activeTab === 'transactions' && (
            <div style={{ background: 'var(--bg-card)', border: '1px solid var(--border)', borderRadius: 12, overflow: 'hidden' }}>
              <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '.875rem' }}>
                <thead>
                  <tr style={{ background: 'var(--bg-hover)' }}>
                    {[t('wallet.col_date'),t('wallet.col_type'),t('wallet.col_order'),t('wallet.col_amount'),t('wallet.col_balance_after'),t('wallet.col_reference'),t('wallet.col_description')].map(h => (
                      <th key={h} style={{ padding: '10px 14px', textAlign: 'left', fontSize: '.72rem', fontWeight: 700, textTransform: 'uppercase', letterSpacing: '.05em', color: 'var(--text-muted)', whiteSpace: 'nowrap' }}>{h}</th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {paged.length === 0 ? (
                    <tr><td colSpan={7} style={{ textAlign: 'center', padding: 40, color: 'var(--text-muted)' }}>{t("wallet.no_transactions")}</td></tr>
                  ) : paged.map(tx => {
                    const badge = TX_BADGE[tx.type] || { bg: '#f1f5f9', color: '#64748b', label: tx.type };
                    const isCredit = ['topup','credit','cod_settled'].includes(tx.type);
                    return (
                      <tr key={tx.id} style={{ borderBottom: '1px solid var(--border)' }}>
                        <td style={{ padding: '10px 14px', color: 'var(--text-muted)', whiteSpace: 'nowrap', fontSize: '.8rem' }}>{new Date(tx.created_at).toLocaleDateString()}</td>
                        <td style={{ padding: '10px 14px' }}>
                          <span style={{ padding: '2px 8px', borderRadius: 6, fontSize: '.7rem', fontWeight: 700, background: badge.bg, color: badge.color }}>{t(badge.label)}</span>
                        </td>
                        <td style={{ padding: '10px 14px', color: 'var(--text-secondary)', fontSize: '.8rem' }}>{tx.order_number || '—'}</td>
                        <td style={{ padding: '10px 14px', fontWeight: 700, color: isCredit ? '#16a34a' : '#dc2626', whiteSpace: 'nowrap' }}>
                          {isCredit ? '+' : '-'}{fmtAED(tx.amount)}
                        </td>
                        <td style={{ padding: '10px 14px', whiteSpace: 'nowrap', fontSize: '.85rem' }}>{fmtAED(tx.balance_after)}</td>
                        <td style={{ padding: '10px 14px', color: 'var(--text-muted)', fontSize: '.8rem' }}>{tx.reference || '—'}</td>
                        <td style={{ padding: '10px 14px', color: 'var(--text-muted)', fontSize: '.8rem' }}>{tx.description || tx.notes || '—'}</td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
              {totalPages > 1 && (
                <div style={{ padding: '12px', display: 'flex', justifyContent: 'center', gap: 6, borderTop: '1px solid var(--border)' }}>
                  {Array.from({ length: totalPages }, (_, i) => i + 1).map(p => (
                    <button key={p} onClick={() => setPage(p)}
                      style={{ width: 30, height: 30, borderRadius: 6, border: '1px solid var(--border)', background: p === page ? '#f97316' : 'var(--bg-card)', color: p === page ? '#fff' : 'var(--text-secondary)', cursor: 'pointer', fontSize: '.8rem' }}>
                      {p}
                    </button>
                  ))}
                </div>
              )}
            </div>
          )}

          {activeTab === 'cod-pending' && (
            <div style={{ background: 'var(--bg-card)', border: '1px solid var(--border)', borderRadius: 12, overflow: 'hidden' }}>
              {pendingCOD.length === 0 ? (
                <div style={{ textAlign: 'center', padding: 60, color: 'var(--text-muted)', fontSize: '.875rem' }}>
                  <div style={{ fontSize: '2rem', marginBottom: 8 }}>✅</div>{t('wallet.all_cod_collected')}
                </div>
              ) : (
                <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '.875rem' }}>
                  <thead>
                    <tr style={{ background: 'var(--bg-hover)' }}>
                      {[t('wallet.col_order'),t('wallet.col_recipient'),t('wallet.col_cod_amount'),t('wallet.col_delivery_fee'),t('wallet.col_driver'),t('wallet.col_date'),t('wallet.col_action')].map(h => (
                        <th key={h} style={{ padding: '10px 14px', textAlign: 'left', fontSize: '.72rem', fontWeight: 700, textTransform: 'uppercase', letterSpacing: '.05em', color: 'var(--text-muted)', whiteSpace: 'nowrap' }}>{h}</th>
                      ))}
                    </tr>
                  </thead>
                  <tbody>
                    {pendingCOD.map(o => (
                      <tr key={o.id} style={{ borderBottom: '1px solid var(--border)' }}>
                        <td style={{ padding: '10px 14px', fontWeight: 700 }}>{o.order_number}</td>
                        <td style={{ padding: '10px 14px' }}>{o.recipient_name}</td>
                        <td style={{ padding: '10px 14px', fontWeight: 700, color: '#f97316' }}>{fmtAED(o.cod_amount)}</td>
                        <td style={{ padding: '10px 14px' }}>{fmtAED(o.delivery_fee)}</td>
                        <td style={{ padding: '10px 14px', color: 'var(--text-muted)' }}>{o.driver_name || '—'}</td>
                        <td style={{ padding: '10px 14px', color: 'var(--text-muted)', fontSize: '.8rem', whiteSpace: 'nowrap' }}>{new Date(o.created_at).toLocaleDateString()}</td>
                        <td style={{ padding: '10px 14px' }}>
                          <button onClick={() => { setCollectOrder(o); setCollectAmt(o.cod_amount || ''); }}
                            style={{ padding: '5px 12px', borderRadius: 7, border: '1px solid #1d4ed8', background: '#dbeafe', color: '#1d4ed8', fontSize: '.78rem', fontWeight: 700, cursor: 'pointer' }}>
                            {t('wallet.mark_collected_btn')}
                          </button>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              )}
            </div>
          )}

          {activeTab === 'cod-done' && (
            <div style={{ background: 'var(--bg-card)', border: '1px solid var(--border)', borderRadius: 12, overflow: 'hidden' }}>
              {collectedCOD.length === 0 ? (
                <div style={{ textAlign: 'center', padding: 60, color: 'var(--text-muted)', fontSize: '.875rem' }}>{t("wallet.no_cod_orders")}</div>
              ) : (
                <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '.875rem' }}>
                  <thead>
                    <tr style={{ background: 'var(--bg-hover)' }}>
                      {[t('wallet.col_order'),t('wallet.col_recipient'),t('wallet.col_collected'),t('wallet.col_collected_at'),t('wallet.col_driver')].map(h => (
                        <th key={h} style={{ padding: '10px 14px', textAlign: 'left', fontSize: '.72rem', fontWeight: 700, textTransform: 'uppercase', letterSpacing: '.05em', color: 'var(--text-muted)', whiteSpace: 'nowrap' }}>{h}</th>
                      ))}
                    </tr>
                  </thead>
                  <tbody>
                    {collectedCOD.map(o => (
                      <tr key={o.id} style={{ borderBottom: '1px solid var(--border)' }}>
                        <td style={{ padding: '10px 14px', fontWeight: 700 }}>{o.order_number}</td>
                        <td style={{ padding: '10px 14px' }}>{o.recipient_name}</td>
                        <td style={{ padding: '10px 14px', fontWeight: 700, color: '#16a34a' }}>{fmtAED(o.cod_collected)}</td>
                        <td style={{ padding: '10px 14px', color: 'var(--text-muted)', fontSize: '.8rem', whiteSpace: 'nowrap' }}>
                          {o.cod_collected_at ? new Date(o.cod_collected_at).toLocaleString() : '—'}
                        </td>
                        <td style={{ padding: '10px 14px', color: 'var(--text-muted)' }}>{o.driver_name || '—'}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              )}
            </div>
          )}
        </>
      )}

      {showTopup && (
        <div style={modalStyle}>
          <div style={boxStyle}>
            <h3 style={{ margin: '0 0 20px', fontSize: '1.1rem', fontWeight: 700 }}>{t("wallet.top_up")}</h3>
            <form onSubmit={handleTopup}>
              {[
                { key: 'amount',      label: t('wallet.amount_aed_required'), type: 'number', min: 1, step: '0.01', required: true },
                { key: 'reference',   label: t('wallet.reference_label'),    type: 'text' },
                { key: 'description', label: t('wallet.description_label'),    type: 'text' },
              ].map(f => (
                <div key={f.key} style={{ marginBottom: 14 }}>
                  <label style={{ display: 'block', fontSize: '.8rem', fontWeight: 600, marginBottom: 6 }}>{f.label}</label>
                  <input type={f.type} required={f.required} min={f.min} step={f.step} value={topupForm[f.key]}
                    onChange={e => setTopupForm(p => ({ ...p, [f.key]: e.target.value }))}
                    style={fieldStyle} />
                </div>
              ))}
              <div style={{ display: 'flex', gap: 10, marginTop: 20, justifyContent: 'flex-end' }}>
                <button type="button" onClick={() => setShowTopup(false)} className="btn-outline-action">{t("common.cancel")}</button>
                <button type="submit" disabled={saving} style={{ padding: '9px 22px', borderRadius: 8, border: 'none', background: '#f97316', color: '#fff', fontWeight: 700, cursor: 'pointer' }}>
                  {saving ? t('wallet.processing') : t('wallet.add_funds')}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {showSettle && (
        <div style={modalStyle}>
          <div style={boxStyle}>
            <h3 style={{ margin: '0 0 8px', fontSize: '1.1rem', fontWeight: 700 }}>{t("wallet.settle_cod_balance")}</h3>
            <p style={{ margin: '0 0 20px', fontSize: '.8rem', color: 'var(--text-muted)' }}>
              {t('wallet.cod_pending_label')} <strong>{fmtAED(wallet?.cod_pending)}</strong>
            </p>
            <form onSubmit={handleSettle}>
              {[
                { key: 'amount',    label: t('wallet.amount_aed_required'), type: 'number', min: 0.01, step: '0.01', required: true },
                { key: 'reference', label: t('wallet.reference_label'),    type: 'text' },
                { key: 'note',      label: t('wallet.note_label'),           type: 'text' },
              ].map(f => (
                <div key={f.key} style={{ marginBottom: 14 }}>
                  <label style={{ display: 'block', fontSize: '.8rem', fontWeight: 600, marginBottom: 6 }}>{f.label}</label>
                  <input type={f.type} required={f.required} min={f.min} step={f.step} value={settleForm[f.key]}
                    onChange={e => setSettleForm(p => ({ ...p, [f.key]: e.target.value }))}
                    style={fieldStyle} />
                </div>
              ))}
              <div style={{ display: 'flex', gap: 10, marginTop: 20, justifyContent: 'flex-end' }}>
                <button type="button" onClick={() => setShowSettle(false)} className="btn-outline-action">{t("common.cancel")}</button>
                <button type="submit" disabled={saving} style={{ padding: '9px 22px', borderRadius: 8, border: 'none', background: '#f97316', color: '#fff', fontWeight: 700, cursor: 'pointer' }}>
                  {saving ? t('wallet.processing') : t('wallet.settle_btn')}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {collectOrder && (
        <div style={modalStyle}>
          <div style={{ ...boxStyle, maxWidth: 380 }}>
            <h3 style={{ margin: '0 0 8px', fontSize: '1.1rem', fontWeight: 700 }}>{t("wallet.mark_collected")}</h3>
            <p style={{ margin: '0 0 20px', fontSize: '.85rem', color: 'var(--text-muted)' }}>
              <strong>{collectOrder.order_number}</strong> — {collectOrder.recipient_name}
            </p>
            <div style={{ marginBottom: 20 }}>
              <label style={{ display: 'block', fontSize: '.8rem', fontWeight: 600, marginBottom: 6 }}>{t('wallet.amount_collected_label')}</label>
              <input type="number" step="0.01" min="0.01" value={collectAmt}
                onChange={e => setCollectAmt(e.target.value)}
                style={{ ...fieldStyle, fontSize: '1rem', fontWeight: 700 }} />
            </div>
            <div style={{ display: 'flex', gap: 10, justifyContent: 'flex-end' }}>
              <button onClick={() => setCollectOrder(null)} className="btn-outline-action">{t("common.cancel")}</button>
              <button onClick={handleCollectCOD} disabled={saving || !collectAmt}
                style={{ padding: '9px 22px', borderRadius: 8, border: 'none', background: '#1d4ed8', color: '#fff', fontWeight: 700, cursor: 'pointer' }}>
                {saving ? t('wallet.saving') : t('wallet.confirm_btn')}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

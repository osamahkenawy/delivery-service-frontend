import { useState, useEffect } from 'react';
import api from '../lib/api';

const TX_COLORS = {
  credit:  { bg: '#dcfce7', color: '#16a34a' },
  debit:   { bg: '#fee2e2', color: '#dc2626' },
};

export default function Wallet() {
  const [wallet, setWallet] = useState(null);
  const [transactions, setTransactions] = useState([]);
  const [loading, setLoading] = useState(true);
  const [showTopup, setShowTopup] = useState(false);
  const [topupAmount, setTopupAmount] = useState('');
  const [topupNote, setTopupNote] = useState('');
  const [saving, setSaving] = useState(false);
  const [page, setPage] = useState(1);
  const PER_PAGE = 15;

  useEffect(() => { fetchAll(); }, []);

  const fetchAll = async () => {
    setLoading(true);
    const [wRes, tRes] = await Promise.all([
      api.get('/wallet'),
      api.get('/wallet/transactions'),
    ]);
    if (wRes.success) setWallet(wRes.data);
    if (tRes.success) setTransactions(tRes.data || []);
    setLoading(false);
  };

  const handleTopup = async (e) => {
    e.preventDefault();
    setSaving(true);
    const res = await api.post('/wallet/topup', { amount: topupAmount, notes: topupNote });
    if (res.success) {
      setShowTopup(false);
      setTopupAmount('');
      setTopupNote('');
      fetchAll();
    }
    setSaving(false);
  };

  const paged = transactions.slice((page - 1) * PER_PAGE, page * PER_PAGE);
  const total = Math.ceil(transactions.length / PER_PAGE);

  return (
    <div className="page-container">
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 24 }}>
        <div>
          <h2 style={{ margin: 0, fontSize: 24, fontWeight: 700 }}>Wallet</h2>
          <p style={{ margin: 0, color: '#64748b', fontSize: 14 }}>Manage balance and transactions</p>
        </div>
        <button onClick={() => setShowTopup(true)}
          style={{ background: '#f97316', color: '#fff', border: 'none', borderRadius: 8, padding: '10px 20px', fontWeight: 600, cursor: 'pointer', fontSize: 14 }}>
          + Top Up
        </button>
      </div>

      {loading ? (
        <div style={{ textAlign: 'center', padding: 40, color: '#94a3b8' }}>Loading...</div>
      ) : (
        <>
          {/* Balance cards */}
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: 16, marginBottom: 28 }}>
            {[
              { label: 'Available Balance', value: `AED ${parseFloat(wallet?.balance || 0).toFixed(2)}`, icon: '💰', bg: '#fff7ed', accent: '#f97316' },
              { label: 'Total Credited', value: `AED ${parseFloat(wallet?.total_credited || 0).toFixed(2)}`, icon: '📈', bg: '#f0fdf4', accent: '#16a34a' },
              { label: 'Total Debited', value: `AED ${parseFloat(wallet?.total_debited || 0).toFixed(2)}`, icon: '📉', bg: '#fef2f2', accent: '#dc2626' },
              { label: 'Transactions', value: transactions.length, icon: '📄', bg: '#f8fafc', accent: '#64748b' },
            ].map(card => (
              <div key={card.label} style={{ background: card.bg, borderRadius: 12, padding: 20, border: `1px solid ${card.accent}22` }}>
                <div style={{ fontSize: 28, marginBottom: 8 }}>{card.icon}</div>
                <div style={{ fontSize: 22, fontWeight: 800, color: card.accent }}>{card.value}</div>
                <div style={{ fontSize: 13, color: '#64748b', marginTop: 4 }}>{card.label}</div>
              </div>
            ))}
          </div>

          {/* Transaction table */}
          <div style={{ background: '#fff', borderRadius: 12, boxShadow: '0 1px 3px rgba(0,0,0,0.08)', overflow: 'hidden' }}>
            <div style={{ padding: '16px 20px', borderBottom: '1px solid #f1f5f9', fontWeight: 700, fontSize: 16 }}>Transaction History</div>
            <table style={{ width: '100%', borderCollapse: 'collapse' }}>
              <thead>
                <tr style={{ borderBottom: '1px solid #f1f5f9' }}>
                  {['Date', 'Type', 'Amount', 'Balance After', 'Reference', 'Notes'].map(h => (
                    <th key={h} style={{ padding: '12px 20px', textAlign: 'left', fontSize: 12, fontWeight: 600, color: '#64748b', textTransform: 'uppercase' }}>{h}</th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {paged.length === 0 ? (
                  <tr><td colSpan={6} style={{ textAlign: 'center', padding: 40, color: '#94a3b8' }}>No transactions yet</td></tr>
                ) : paged.map(tx => {
                  const sc = TX_COLORS[tx.type] || TX_COLORS.debit;
                  return (
                    <tr key={tx.id} style={{ borderBottom: '1px solid #f8fafc' }}>
                      <td style={{ padding: '12px 20px', fontSize: 13, color: '#64748b' }}>{new Date(tx.created_at).toLocaleDateString()}</td>
                      <td style={{ padding: '12px 20px' }}>
                        <span style={{ ...sc, padding: '3px 8px', borderRadius: 6, fontSize: 12, fontWeight: 600 }}>{tx.type}</span>
                      </td>
                      <td style={{ padding: '12px 20px', fontWeight: 700, color: tx.type === 'credit' ? '#16a34a' : '#dc2626', fontSize: 15 }}>
                        {tx.type === 'credit' ? '+' : '-'}AED {parseFloat(tx.amount).toFixed(2)}
                      </td>
                      <td style={{ padding: '12px 20px', fontSize: 14 }}>AED {parseFloat(tx.balance_after || 0).toFixed(2)}</td>
                      <td style={{ padding: '12px 20px', fontSize: 13, color: '#64748b' }}>{tx.reference || '—'}</td>
                      <td style={{ padding: '12px 20px', fontSize: 13, color: '#64748b' }}>{tx.notes || '—'}</td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
            {total > 1 && (
              <div style={{ padding: '12px 20px', display: 'flex', justifyContent: 'center', gap: 8, borderTop: '1px solid #f1f5f9' }}>
                {Array.from({ length: total }, (_, i) => i + 1).map(p => (
                  <button key={p} onClick={() => setPage(p)}
                    style={{ width: 32, height: 32, borderRadius: 6, border: '1px solid #e2e8f0', background: p === page ? '#f97316' : '#fff', color: p === page ? '#fff' : '#475569', cursor: 'pointer', fontSize: 13, fontWeight: p === page ? 600 : 400 }}>
                    {p}
                  </button>
                ))}
              </div>
            )}
          </div>
        </>
      )}

      {/* Top-up Modal */}
      {showTopup && (
        <div style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.4)', zIndex: 1000, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
          <div style={{ background: '#fff', borderRadius: 16, padding: 32, width: '100%', maxWidth: 400 }}>
            <h3 style={{ margin: '0 0 20px', fontSize: 20, fontWeight: 700 }}>Top Up Wallet</h3>
            <form onSubmit={handleTopup}>
              <div style={{ marginBottom: 16 }}>
                <label style={{ display: 'block', fontSize: 13, fontWeight: 500, marginBottom: 6 }}>Amount (AED) *</label>
                <input required type="number" step="0.01" min="1" value={topupAmount} onChange={e => setTopupAmount(e.target.value)}
                  style={{ width: '100%', padding: '10px 14px', borderRadius: 8, border: '1px solid #e2e8f0', fontSize: 16, boxSizing: 'border-box' }} />
              </div>
              <div style={{ marginBottom: 20 }}>
                <label style={{ display: 'block', fontSize: 13, fontWeight: 500, marginBottom: 6 }}>Notes</label>
                <input value={topupNote} onChange={e => setTopupNote(e.target.value)} placeholder="Optional note..."
                  style={{ width: '100%', padding: '8px 12px', borderRadius: 8, border: '1px solid #e2e8f0', fontSize: 14, boxSizing: 'border-box' }} />
              </div>
              <div style={{ display: 'flex', gap: 12, justifyContent: 'flex-end' }}>
                <button type="button" onClick={() => setShowTopup(false)} style={{ padding: '10px 20px', borderRadius: 8, border: '1px solid #e2e8f0', background: '#fff', cursor: 'pointer', fontWeight: 500 }}>Cancel</button>
                <button type="submit" disabled={saving} style={{ padding: '10px 24px', borderRadius: 8, border: 'none', background: '#f97316', color: '#fff', cursor: 'pointer', fontWeight: 600 }}>
                  {saving ? 'Processing...' : 'Add Funds'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}

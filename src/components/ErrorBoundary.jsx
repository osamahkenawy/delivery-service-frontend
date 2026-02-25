import { Component } from 'react';

export default class ErrorBoundary extends Component {
  constructor(props) {
    super(props);
    this.state = { hasError: false, error: null };
  }

  static getDerivedStateFromError(error) {
    return { hasError: true, error };
  }

  componentDidCatch(error, info) {
    console.error('[ErrorBoundary]', error, info.componentStack);
  }

  render() {
    if (!this.state.hasError) return this.props.children;

    return (
      <div style={{
        minHeight: '100vh',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        flexDirection: 'column',
        gap: 16,
        padding: 32,
        background: '#f8fafc',
        fontFamily: 'inherit',
      }}>
        <div style={{ fontSize: 48 }}>⚠️</div>
        <h2 style={{ margin: 0, color: '#1e293b', fontSize: 22 }}>Something went wrong</h2>
        <p style={{ margin: 0, color: '#64748b', maxWidth: 420, textAlign: 'center' }}>
          An unexpected error occurred. Please refresh the page and try again.
        </p>
        {import.meta.env.DEV && this.state.error && (
          <pre style={{
            background: '#fee2e2', color: '#991b1b', padding: '12px 16px',
            borderRadius: 8, fontSize: 12, maxWidth: 600, overflowX: 'auto',
            whiteSpace: 'pre-wrap', wordBreak: 'break-all',
          }}>
            {this.state.error.toString()}
          </pre>
        )}
        <button
          onClick={() => window.location.reload()}
          style={{
            padding: '10px 24px', background: '#f97316', color: '#fff',
            border: 'none', borderRadius: 8, cursor: 'pointer', fontWeight: 600, fontSize: 14,
          }}
        >
          Refresh Page
        </button>
      </div>
    );
  }
}


import React from 'react';
import ReactDOM from 'react-dom/client';
import App from './App';

// 簡易的な ErrorBoundary
class ErrorBoundary extends React.Component<{ children: React.ReactNode }, { hasError: boolean }> {
  state = { hasError: false };

  static getDerivedStateFromError() {
    return { hasError: true };
  }
  componentDidCatch(error: any, errorInfo: any) {
    console.error("Uncaught error:", error, errorInfo);
  }
  render() {
    if (this.state.hasError) {
      return (
        <div style={{ padding: '20px', textAlign: 'center', fontFamily: 'sans-serif', backgroundColor: '#f9f9f9', height: '100vh', display: 'flex', flexDirection: 'column', justifyContent: 'center' }}>
          <h2 style={{ color: '#006699' }}>アプリの読み込み中にエラーが発生しました 😢</h2>
          <p style={{ color: '#666' }}>ページを再読み込みするか、管理者にお問い合わせください。</p>
          <button
            onClick={() => window.location.reload()}
            style={{
              padding: '12px 24px',
              borderRadius: '12px',
              border: 'none',
              background: '#006699',
              color: 'white',
              fontWeight: 'bold',
              cursor: 'pointer',
              margin: '20px auto',
              width: 'fit-content'
            }}
          >
            再読み込み
          </button>
        </div>
      );
    }
    return this.props.children;
  }
}

const rootElement = document.getElementById('root');
if (!rootElement) {
  throw new Error("Could not find root element to mount to");
}

const root = ReactDOM.createRoot(rootElement);
root.render(
  <React.StrictMode>
    <ErrorBoundary>
      <App />
    </ErrorBoundary>
  </React.StrictMode>
);

import React, { Component, ReactNode } from 'react';
import ReactDOM from 'react-dom/client';
import App from './App';

// デバッグ用（JSが正常に読み込まれたことを確認）
console.log("たびログくん: アプリ起動シーケンス開始");

interface ErrorBoundaryProps {
  children: ReactNode;
}

interface ErrorBoundaryState {
  hasError: boolean;
}

// より堅牢な ErrorBoundary
class ErrorBoundary extends Component<ErrorBoundaryProps, ErrorBoundaryState> {
  public state: ErrorBoundaryState = {
    hasError: false
  };

  static getDerivedStateFromError(_error: Error): ErrorBoundaryState {
    return { hasError: true };
  }

  componentDidCatch(error: Error, errorInfo: React.ErrorInfo) {
    console.error("致命的なランタイムエラーが発生しました:", error, errorInfo);
  }

  render() {
    if (this.state.hasError) {
      return (
        <div style={{
          padding: '40px 20px',
          textAlign: 'center',
          fontFamily: 'sans-serif',
          backgroundColor: '#F4F7FA',
          height: '100vh',
          display: 'flex',
          flexDirection: 'column',
          justifyContent: 'center',
          color: '#1A2B4A'
        }}>
          <h2 style={{ fontSize: '24px', marginBottom: '16px' }}>
            アプリの実行中に予期せぬエラーが発生しました 😢
          </h2>
          <p style={{ marginBottom: '24px', opacity: 0.8 }}>
            不整合なデータが原因の可能性があります。一度再読み込みをお試しください。
          </p>
          <div style={{ display: 'flex', gap: '12px', justifyContent: 'center' }}>
            <button
              onClick={() => window.location.reload()}
              style={{
                padding: '12px 24px',
                borderRadius: '12px',
                border: 'none',
                background: '#003780',
                color: 'white',
                fontWeight: 'bold',
                cursor: 'pointer'
              }}
            >
              再読み込み
            </button>
            <button
              onClick={() => { localStorage.clear(); window.location.href = window.location.pathname; }}
              style={{
                padding: '12px 24px',
                borderRadius: '12px',
                border: '1px solid #003780',
                background: 'white',
                color: '#003780',
                fontWeight: 'bold',
                cursor: 'pointer'
              }}
            >
              データを初期化して再起動
            </button>
          </div>
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

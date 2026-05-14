import { Component, type ReactNode } from 'react';
import { AlertTriangle, RefreshCw } from 'lucide-react';
import { useT } from '../../i18n';

interface Props {
  children: ReactNode;
  fallback?: ReactNode;
}

interface State {
  hasError: boolean;
  error: Error | null;
}

// Wrapper to provide t() to the class component
function ErrorFallback({ error, onReload }: { error: Error | null; onReload: () => void }) {
  const { t } = useT();
  return (
    <div className="flex items-center justify-center min-h-[400px]">
      <div className="text-center max-w-md">
        <AlertTriangle size={48} className="mx-auto mb-4 text-red-400/50" />
        <h3 className="text-lg font-medium text-gray-300 mb-2">{t('Something went wrong')}</h3>
        <p className="text-sm text-gray-500 mb-4">
          {error?.message || t('An unexpected error occurred.')}
        </p>
        <button
          onClick={onReload}
          className="inline-flex items-center gap-2 px-4 py-2 bg-gray-800 hover:bg-gray-700 rounded-lg text-sm text-gray-300 transition-colors"
        >
          <RefreshCw size={14} />
          {t('Reload page')}
        </button>
      </div>
    </div>
  );
}

export class ErrorBoundary extends Component<Props, State> {
  constructor(props: Props) {
    super(props);
    this.state = { hasError: false, error: null };
  }

  static getDerivedStateFromError(error: Error): State {
    return { hasError: true, error };
  }

  render() {
    if (this.state.hasError) {
      if (this.props.fallback) return this.props.fallback;
      return (
        <ErrorFallback
          error={this.state.error}
          onReload={() => {
            this.setState({ hasError: false, error: null });
            window.location.reload();
          }}
        />
      );
    }

    return this.props.children;
  }
}

import React from 'react';
import { safeLocalStorage, safeSessionStorage } from '../utils/safeStorage';

// DOM mutation errors thrown when something outside React (browser auto-translate,
// text-editing extensions) rewrites nodes that React owns.
const isExternalDomMutationError = (error) => {
    if (!error) return false;
    const msg = String(error.message || error);
    return error.name === 'NotFoundError' || /insertBefore|removeChild/.test(msg);
};

class ErrorBoundary extends React.Component {
    constructor(props) {
        super(props);
        this.state = { hasError: false, error: null, errorInfo: null };
    }

    static getDerivedStateFromError(error) {
        return { hasError: true, error };
    }

    componentDidCatch(error, errorInfo) {
        this.setState({
            error: error,
            errorInfo: errorInfo
        });
        console.error("Uncaught Error:", error, errorInfo);
    }

    handleRetry = () => {
        this.setState({ hasError: false, error: null, errorInfo: null });
    };

    renderTranslateHint() {
        if (!isExternalDomMutationError(this.state.error)) return null;
        return (
            <div className="bg-amber-50 border border-amber-200 text-amber-800 p-4 rounded-lg mb-6 text-sm">
                <p className="font-bold mb-1">This is usually caused by browser translation.</p>
                <p>
                    Please turn off translation for this site (Chrome menu ⋮ → Translate → "Never translate this site"
                    or tap "Show original"), disable text-editing extensions, then reload the page.
                </p>
            </div>
        );
    }

    render() {
        if (this.state.hasError) {
            // Scoped variant: keeps the surrounding dashboard usable
            if (this.props.inline) {
                return (
                    <div className="bg-white p-6 rounded-xl shadow-sm max-w-2xl mx-auto w-full border border-red-100">
                        <h2 className="text-xl font-bold text-red-600 mb-4">Something went wrong</h2>
                        {this.renderTranslateHint()}
                        <div className="bg-red-50 p-3 rounded-lg mb-6 text-xs font-mono text-red-800 overflow-auto max-h-40">
                            {this.state.error && this.state.error.toString()}
                        </div>
                        <div className="flex flex-wrap gap-3">
                            <button
                                onClick={this.handleRetry}
                                className="px-6 py-2 bg-indigo-600 text-white rounded-lg hover:bg-indigo-700 transition-colors font-medium"
                            >
                                Try Again
                            </button>
                            <button
                                onClick={() => window.location.reload()}
                                className="px-6 py-2 border border-gray-200 text-gray-700 rounded-lg hover:bg-gray-50 transition-colors font-medium"
                            >
                                Reload Page
                            </button>
                        </div>
                    </div>
                );
            }

            return (
                <div className="min-h-screen flex items-center justify-center bg-gray-50 p-4">
                    <div className="bg-white p-8 rounded-xl shadow-xl max-w-2xl w-full border border-red-100">
                        <h2 className="text-2xl font-bold text-red-600 mb-4">Something went wrong</h2>
                        {this.renderTranslateHint()}
                        <div className="bg-red-50 p-4 rounded-lg mb-6 text-sm font-mono text-red-800 overflow-auto max-h-64">
                            {this.state.error && this.state.error.toString()}
                            <br />
                            {this.state.errorInfo && this.state.errorInfo.componentStack}
                        </div>

                        <div className="flex flex-wrap gap-3">
                            <button
                                onClick={() => window.location.reload()}
                                className="px-6 py-2 bg-indigo-600 text-white rounded-lg hover:bg-indigo-700 transition-colors font-medium"
                            >
                                Reload Page
                            </button>
                            <button
                                onClick={() => {
                                    safeLocalStorage.clear();
                                    safeSessionStorage.clear();
                                    window.location.reload();
                                }}
                                className="px-6 py-2 border border-red-200 text-red-600 rounded-lg hover:bg-red-50 transition-colors font-medium"
                            >
                                Emergency Reset (Clears Data)
                            </button>
                        </div>
                    </div>
                </div>
            );
        }

        return this.props.children;
    }
}

export default ErrorBoundary;

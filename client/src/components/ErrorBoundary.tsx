import React, { ErrorInfo, ReactNode, Component } from 'react';

interface Props {
    children: ReactNode;
}

interface State {
    hasError: boolean;
    error?: Error;
}

class ErrorBoundary extends Component<Props, State> {
    public state: State = { hasError: false };

    static getDerivedStateFromError(error: Error): State {
        return { hasError: true, error };
    }

    componentDidCatch(error: Error, errorInfo: ErrorInfo) {
        console.error('Uncaught error:', error, errorInfo);
    }

    render(): ReactNode {
        if (this.state.hasError) {
            return (
                <div className="min-h-screen flex items-center justify-center p-6 bg-surface-100">
                    <div className="max-w-md w-full bg-white rounded-[2rem] p-8 shadow-elevated text-center animate-fade-in border border-primary/5">
                        <div className="w-20 h-20 bg-primary-50 rounded-full flex items-center justify-center mx-auto mb-6">
                            <span className="material-symbols-rounded text-primary-600 text-4xl">error</span>
                        </div>
                        <h2 className="text-xl font-black text-gray-800 tracking-tight mb-2">Something went wrong</h2>
                        <p className="text-gray-500 text-sm mb-8 leading-relaxed">
                            We encountered an unexpected error. Don&apos;t worry, your data is safe.
                        </p>
                        <button
                            onClick={() => window.location.reload()}
                            className="w-full btn-primary py-4 rounded-2xl font-bold flex items-center justify-center gap-2 active:scale-95 transition-all"
                        >
                            <span className="material-symbols-rounded text-lg">refresh</span>
                            Refresh Application
                        </button>
                        <button
                            onClick={() => { window.location.reload(); }}
                            className="w-full mt-3 text-gray-400 text-xs font-bold uppercase tracking-widest py-2 hover:text-primary transition-colors"
                        >
                            Back to Home
                        </button>
                    </div>
                </div>
            );
        }

        // Using a cast to any before accessing props to bypass missing type definitions in the environment
        return (this as any).props.children;
    }
}

export default ErrorBoundary;

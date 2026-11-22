import React from 'react';
import { AlertTriangle, RotateCcw } from 'lucide-react';

interface ErrorBoundaryState {
  hasError: boolean;
  errorMessage: string;
}

export class ErrorBoundary extends React.Component<
  { children: React.ReactNode },
  ErrorBoundaryState
> {
  constructor(props: { children: React.ReactNode }) {
    super(props);
    this.state = { hasError: false, errorMessage: '' };
  }

  static getDerivedStateFromError(error: Error): ErrorBoundaryState {
    return {
      hasError: true,
      errorMessage: error.message || 'حدث خطأ غير متوقع.',
    };
  }

  componentDidCatch(error: Error, info: React.ErrorInfo) {
    console.error('BN_STONE UI ErrorBoundary:', error, info);
  }

  render() {
    if (this.state.hasError) {
      return (
        <div
          dir="rtl"
          className="min-h-screen bg-[#09090B] text-[#FAFAFA] flex items-center justify-center p-6"
        >
          <div className="max-w-md w-full bg-[#121215] border border-white/10 rounded-xl p-8 text-center space-y-5">
            <div className="w-12 h-12 rounded-full bg-[#DC2626]/15 text-[#EF4444] mx-auto flex items-center justify-center">
              <AlertTriangle className="w-6 h-6" aria-hidden="true" />
            </div>
            <h1 className="text-xl font-bold font-display">تعذر عرض الصفحة مؤقتاً</h1>
            <p className="text-sm text-zinc-400 leading-relaxed">
              واجه المتجر خطأ غير متوقع أثناء التحميل. يمكنك إعادة تحميل الصفحة للمتابعة.
            </p>
            <button
              type="button"
              onClick={() => window.location.reload()}
              className="inline-flex items-center justify-center gap-2 px-5 py-2.5 bg-[#DC2626] hover:bg-[#EF4444] text-white text-sm font-medium rounded-lg transition-colors cursor-pointer"
            >
              <RotateCcw className="w-4 h-4" aria-hidden="true" />
              <span>إعادة تحميل المتجر</span>
            </button>
          </div>
        </div>
      );
    }

    return this.props.children;
  }
}

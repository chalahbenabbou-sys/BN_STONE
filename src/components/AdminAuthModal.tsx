import React, { useEffect, useState } from 'react';
import { signInWithPopup, signOut } from 'firebase/auth';
import { KeyRound, Loader2, Lock, ShieldAlert, X } from 'lucide-react';
import { auth, googleProvider } from '../firebase';
import {
  bootstrapAdminPasscode,
  fetchAdminAuthStatus,
  loginAdminPasscode,
  type AuthStatusResponse,
} from '../services/api';
import { checkFirebaseAdminStatus } from '../services/firestoreCatalog';

interface AdminAuthModalProps {
  isOpen: boolean;
  onClose: () => void;
  onFirebaseAdminSuccess: () => void;
  onServerAdminSuccess: (token: string) => void;
}

export function AdminAuthModal({
  isOpen,
  onClose,
  onFirebaseAdminSuccess,
  onServerAdminSuccess,
}: AdminAuthModalProps) {
  const [authTab, setAuthTab] = useState<'firebase' | 'passcode'>('firebase');
  const [authStatus, setAuthStatus] = useState<AuthStatusResponse | null>(null);
  const [loadingStatus, setLoadingStatus] = useState(false);

  const [code, setCode] = useState('');
  const [confirmCode, setConfirmCode] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!isOpen) {
      setCode('');
      setConfirmCode('');
      setError(null);
      return;
    }
    let active = true;
    setLoadingStatus(true);
    fetchAdminAuthStatus()
      .then((status) => {
        if (active) setAuthStatus(status);
      })
      .catch(() => {
        if (active) setAuthStatus({ envManaged: false, needsSetup: false });
      })
      .finally(() => {
        if (active) setLoadingStatus(false);
      });
    return () => {
      active = false;
    };
  }, [isOpen]);

  if (!isOpen) return null;

  const handleFirebaseGoogleSignIn = async () => {
    setError(null);
    setSubmitting(true);
    try {
      await signInWithPopup(auth, googleProvider);
      const isAdmin = await checkFirebaseAdminStatus();
      if (!isAdmin) {
        await signOut(auth);
        setError('هذا الحساب غير مصرح له بالدخول إلى لوحة تحكم المالك.');
        return;
      }
      onFirebaseAdminSuccess();
    } catch (err) {
      const msg = err instanceof Error ? err.message : '';
      if (msg.includes('popup-closed-by-user')) {
        setError('تم إغلاق نافذة تسجيل الدخول قبل إتمام العملية.');
      } else if (msg.includes('popup-blocked')) {
        setError('قام المتصفح بحظر النافذة المنبثقة. يرجى السماح بالنوافذ المنبثقة والمحاولة مجدداً.');
      } else {
        setError('تعذر تسجيل الدخول عبر حساب Google. تأكد من صلاحيات حساب المالك.');
      }
    } finally {
      setSubmitting(false);
    }
  };

  const handlePasscodeSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);

    const trimmed = code.trim();
    if (!trimmed) {
      setError('يرجى إدخال رمز الدخول السري.');
      return;
    }

    if (authStatus?.needsSetup) {
      if (trimmed.length < 6) {
        setError('يجب أن يتكون رمز الدخول من 6 أحرف على الأقل.');
        return;
      }
      if (trimmed !== confirmCode.trim()) {
        setError('رمز الدخول وتأكيده غير متطابقين.');
        return;
      }
    }

    setSubmitting(true);
    try {
      const token = authStatus?.needsSetup
        ? await bootstrapAdminPasscode(trimmed)
        : await loginAdminPasscode(trimmed);
      setCode('');
      setConfirmCode('');
      onServerAdminSuccess(token);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'تعذر التحقق من رمز الدخول.');
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-sm"
      role="dialog"
      aria-modal="true"
      aria-labelledby="admin-auth-title"
    >
      <div className="relative w-full max-w-md bg-[#121215] border border-white/12 rounded-2xl p-6 sm:p-8 shadow-2xl">
        <button
          type="button"
          onClick={onClose}
          aria-label="إغلاق نافذة الدخول"
          className="absolute top-4 left-4 w-9 h-9 rounded-lg inline-flex items-center justify-center text-zinc-400 hover:text-white hover:bg-white/8 transition-colors cursor-pointer"
        >
          <X className="w-5 h-5" />
        </button>

        <div className="space-y-2 mb-6">
          <div className="w-11 h-11 rounded-xl bg-[#DC2626]/15 border border-[#DC2626]/30 text-[#EF4444] flex items-center justify-center mb-3">
            <Lock className="w-5 h-5" aria-hidden="true" />
          </div>
          <h2 id="admin-auth-title" className="text-xl font-bold font-display text-white">
            الدخول الخاص لإدارة <span dir="ltr">BN_STONE</span>
          </h2>
          <p className="text-sm text-zinc-400">
            هذه اللوحة مخصصة لمالك المتجر فقط لإدارة المنتجات والأسعار والإعدادات.
          </p>
        </div>

        {/* Auth Method Segmented Switch */}
        <div
          role="tablist"
          aria-label="طريقة التحقق للمالك"
          className="grid grid-cols-2 gap-1 p-1 bg-[#09090B] border border-white/8 rounded-lg mb-6"
        >
          <button
            type="button"
            role="tab"
            aria-selected={authTab === 'firebase'}
            onClick={() => {
              setAuthTab('firebase');
              setError(null);
            }}
            className={`py-2 px-3 text-xs sm:text-sm font-semibold rounded-md transition-colors cursor-pointer whitespace-nowrap ${
              authTab === 'firebase'
                ? 'bg-[#18181B] text-white border border-white/10'
                : 'text-zinc-400 hover:text-zinc-200'
            }`}
          >
            حساب المالك (Firebase)
          </button>
          <button
            type="button"
            role="tab"
            aria-selected={authTab === 'passcode'}
            onClick={() => {
              setAuthTab('passcode');
              setError(null);
            }}
            className={`py-2 px-3 text-xs sm:text-sm font-semibold rounded-md transition-colors cursor-pointer whitespace-nowrap ${
              authTab === 'passcode'
                ? 'bg-[#18181B] text-white border border-white/10'
                : 'text-zinc-400 hover:text-zinc-200'
            }`}
          >
            رمز الدخول السري
          </button>
        </div>

        {error && (
          <div
            role="alert"
            className="mb-5 p-3.5 rounded-lg bg-[#DC2626]/12 border border-[#DC2626]/35 text-sm text-red-200 flex items-start gap-2.5"
          >
            <ShieldAlert className="w-4 h-4 text-[#EF4444] shrink-0 mt-0.5" aria-hidden="true" />
            <span>{error}</span>
          </div>
        )}

        {authTab === 'firebase' ? (
          <div className="space-y-4">
            <p className="text-sm text-zinc-300 leading-relaxed">
              سجّل الدخول بحساب Google المعتمد للمالك للوصول المباشر إلى قاعدة بيانات Firestore
              وتخزين صور Firebase Storage بشكل فوري ودائم.
            </p>
            <button
              type="button"
              disabled={submitting}
              onClick={handleFirebaseGoogleSignIn}
              className="w-full flex items-center justify-center gap-2.5 py-3.5 px-5 bg-[#DC2626] hover:bg-[#EF4444] disabled:opacity-60 text-white text-sm font-bold rounded-lg transition-colors cursor-pointer"
            >
              {submitting ? (
                <Loader2 className="w-4 h-4 animate-spin" aria-hidden="true" />
              ) : (
                <Lock className="w-4 h-4" aria-hidden="true" />
              )}
              <span>تسجيل الدخول بحساب المالك عبر Google</span>
            </button>
          </div>
        ) : loadingStatus ? (
          <div className="py-8 flex items-center justify-center text-zinc-400 gap-2 text-sm">
            <Loader2 className="w-4 h-4 animate-spin" aria-hidden="true" />
            <span>جاري التحقق من إعدادات الأمان...</span>
          </div>
        ) : (
          <form onSubmit={handlePasscodeSubmit} className="space-y-4">
            {authStatus?.needsSetup && (
              <p className="text-xs text-zinc-300 bg-white/5 border border-white/8 rounded-lg p-3 leading-relaxed">
                التفعيل الأولي للمالك: قم بتعيين رمز الدخول السري الخاص بك ليتم تشفيره وحفظه على
                الخادم بشكل آمن.
              </p>
            )}

            <div className="space-y-1.5">
              <label htmlFor="admin-access-code" className="block text-sm font-medium text-zinc-200">
                {authStatus?.needsSetup ? 'تعيين رمز الدخول السري' : 'رمز الدخول السري'}
              </label>
              <div className="relative">
                <input
                  id="admin-access-code"
                  type="password"
                  dir="ltr"
                  autoComplete="current-password"
                  value={code}
                  onChange={(e) => setCode(e.target.value)}
                  placeholder="••••••••••"
                  className="w-full px-4 py-3 bg-[#09090B] border border-white/12 focus:border-[#DC2626] rounded-lg text-white placeholder-zinc-600 focus:outline-none text-left"
                />
                <KeyRound
                  className="w-4 h-4 text-zinc-500 absolute right-3.5 top-1/2 -translate-y-1/2 pointer-events-none"
                  aria-hidden="true"
                />
              </div>
            </div>

            {authStatus?.needsSetup && (
              <div className="space-y-1.5">
                <label
                  htmlFor="admin-access-code-confirm"
                  className="block text-sm font-medium text-zinc-200"
                >
                  تأكيد رمز الدخول السري
                </label>
                <input
                  id="admin-access-code-confirm"
                  type="password"
                  dir="ltr"
                  autoComplete="new-password"
                  value={confirmCode}
                  onChange={(e) => setConfirmCode(e.target.value)}
                  placeholder="••••••••••"
                  className="w-full px-4 py-3 bg-[#09090B] border border-white/12 focus:border-[#DC2626] rounded-lg text-white placeholder-zinc-600 focus:outline-none text-left"
                />
              </div>
            )}

            <button
              type="submit"
              disabled={submitting}
              className="w-full flex items-center justify-center gap-2 py-3.5 px-5 bg-[#DC2626] hover:bg-[#EF4444] disabled:opacity-60 text-white text-sm font-bold rounded-lg transition-colors cursor-pointer"
            >
              {submitting && <Loader2 className="w-4 h-4 animate-spin" aria-hidden="true" />}
              <span>
                {authStatus?.needsSetup ? 'حفظ رمز المالك والدخول' : 'دخول إلى لوحة الإدارة'}
              </span>
            </button>
          </form>
        )}
      </div>
    </div>
  );
}

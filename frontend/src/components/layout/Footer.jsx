import { Link } from 'react-router-dom';
import { COPYRIGHT_TEXT } from '../../hooks/useBusinessProfile';
import { cn } from '../../lib/utils';

export default function Footer({
  className = '',
  variant = 'default', // 'default' | 'landing' | 'minimal' | 'dashboard'
  containerClassName = '',
}) {
  const isMinimal = variant === 'minimal';
  const isLanding = variant === 'landing';
  const isDashboard = variant === 'dashboard';

  return (
    <footer
      role="contentinfo"
      className={cn(
        'w-full border-t border-slate-200/80 bg-white text-xs text-slate-500 print:hidden transition-colors',
        isLanding && 'bg-sky-50/60 border-sky-100/90 text-slate-600',
        isDashboard && 'mt-8 pt-4 px-4 sm:px-6 bg-transparent border-t border-slate-200/70',
        !isDashboard && !isLanding && 'mt-auto py-4 sm:py-5',
        isLanding && 'pt-8 pb-24 sm:pt-10 sm:pb-28',
        className
      )}
      style={
        isLanding
          ? { paddingBottom: 'calc(6rem + env(safe-area-inset-bottom, 0px))' }
          : undefined
      }
    >
      <div
        className={cn(
          'w-full max-w-7xl mx-auto px-4 sm:px-6 lg:px-8',
          'flex flex-col sm:flex-row items-center justify-between gap-2.5 sm:gap-4',
          'text-center sm:text-left',
          containerClassName
        )}
      >
        <p className="font-normal text-slate-600 leading-relaxed text-xs">
          {COPYRIGHT_TEXT}
        </p>

        {!isMinimal && (
          <div className="flex items-center justify-center gap-3 font-medium text-xs text-slate-600 shrink-0 flex-wrap">
            <Link
              to="/terms-conditions"
              className="hover:text-blue-600 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-blue-600 rounded-sm py-1 transition-colors min-h-[36px] flex items-center"
            >
              Syarat &amp; Ketentuan
            </Link>
            <span className="text-slate-300 select-none" aria-hidden="true">&bull;</span>
            <Link
              to="/privacy-policy"
              className="hover:text-blue-600 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-blue-600 rounded-sm py-1 transition-colors min-h-[36px] flex items-center"
            >
              Kebijakan Privasi
            </Link>
          </div>
        )}
      </div>
    </footer>
  );
}


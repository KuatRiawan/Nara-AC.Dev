import { Link } from 'react-router-dom';
import { ArrowLeft, CalendarDays } from 'lucide-react';
import CompanyLogo from '../CompanyLogo';
import { Button } from '../ui/button';
import { useContextualBack } from '../../hooks/useContextualBack';
import { cn } from '../../lib/utils';

export default function PageHeader({
  showBack = true,
  onBack,
  backFallback = '/',
  backLabel,
  badge,
  bookingAction = false,
  bookingUrl = '/booking',
  bookingLabel = 'Booking Baru',
  children,
  className = '',
  containerClassName = '',
  sticky = true,
}) {
  const contextualBack = useContextualBack(backFallback);
  const handleBack = onBack || contextualBack.goBack;
  const resolvedFallbackLabel = backLabel || contextualBack.fallbackLabel || 'Kembali ke Beranda';

  return (
    <header
      role="banner"
      className={cn(
        'w-full bg-white/95 backdrop-blur-md border-b border-sky-100/90 z-40 transition-all print:hidden',
        sticky && 'sticky top-0',
        className
      )}
    >
      <div
        className={cn(
          'w-full max-w-7xl mx-auto px-3 sm:px-6 lg:px-8 h-15 sm:h-18 flex items-center justify-between gap-2',
          containerClassName
        )}
      >
        <Link
          to="/"
          className="flex items-center hover:opacity-90 transition-opacity focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-blue-600 rounded-xl shrink-0"
          aria-label="Kembali ke Beranda NARA AC"
        >
          <CompanyLogo iconSize="h-7 sm:h-8" compact={true} />
        </Link>

        <div className="flex items-center gap-1.5 sm:gap-2.5 shrink-0 min-w-0">
          {badge && (
            <div className="hidden md:flex items-center">
              {badge}
            </div>
          )}

          {bookingAction && (
            <Link to={bookingUrl} className="shrink-0">
              <Button
                type="button"
                size="sm"
                className="bg-blue-600 hover:bg-blue-700 text-white rounded-xl text-xs font-bold shadow-xs flex items-center gap-1 sm:gap-1.5 h-8.5 sm:h-9 px-2.5 sm:px-3.5 cursor-pointer"
              >
                <CalendarDays className="w-3.5 h-3.5 shrink-0" />
                <span className="hidden xs:inline">{bookingLabel}</span>
                <span className="xs:hidden">Booking</span>
              </Button>
            </Link>
          )}

          {children}

          {showBack && (
            <Button
              type="button"
              variant="outline"
              size="sm"
              onClick={handleBack}
              aria-label={resolvedFallbackLabel}
              className="rounded-xl border-slate-200 text-slate-700 text-xs font-bold hover:bg-slate-100 flex items-center gap-1 sm:gap-1.5 h-8.5 sm:h-9 px-2.5 sm:px-3 cursor-pointer shrink-0"
            >
              <ArrowLeft className="w-3.5 h-3.5 shrink-0" />
              <span className="hidden sm:inline truncate max-w-[160px] md:max-w-[220px]">
                {resolvedFallbackLabel}
              </span>
              <span className="sm:hidden">Kembali</span>
            </Button>
          )}
        </div>
      </div>
    </header>
  );
}


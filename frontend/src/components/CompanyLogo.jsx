export default function CompanyLogo({
  className = '',
  dark = false,
  iconSize = 'h-10 sm:h-12',
  iconOnly = false,
  collapsed = false,
  compact = false
}) {
  return (
    <div
      className={`flex items-center shrink-0 ${
        iconOnly || collapsed ? 'justify-center' : 'gap-2 sm:gap-3'
      } ${className}`}
    >
      <img
        src="/images/logo.png"
        alt="CV. Nara Teknindotama Logo"
        width={48}
        height={48}
        style={{ aspectRatio: '1 / 1' }}
        className={`${iconSize} object-contain shrink-0 transition-transform duration-300 ${
          dark ? 'brightness-0 invert' : ''
        }`}
      />
      {!iconOnly && (
        <div
          className={`flex flex-col justify-center whitespace-nowrap overflow-hidden transition-all duration-300 ease-in-out ${
            collapsed
              ? 'max-w-0 opacity-0 pointer-events-none'
              : compact
                ? 'max-w-[130px] sm:max-w-[180px] opacity-100'
                : 'max-w-[150px] sm:max-w-[200px] opacity-100'
          }`}
        >
          <span
            className={`leading-none tracking-tighter ${
              dark ? 'text-white' : 'text-blue-950'
            } ${compact ? 'text-lg sm:text-2xl' : 'text-xl sm:text-2xl lg:text-3xl'}`}
            style={{ fontFamily: '"Arial Black", Impact, sans-serif' }}
          >
            NARA
          </span>
          <span
            className={`font-bold leading-none ${
              dark ? 'text-slate-500' : 'text-blue-600'
            } ${
              compact
                ? 'text-[8px] sm:text-[10px] tracking-[0.18em] sm:tracking-[0.22em] mt-0.5'
                : 'text-[9px] sm:text-xs tracking-[0.2em] sm:tracking-[0.25em] mt-0.5 sm:mt-1'
            }`}
            style={{ fontFamily: '"Arial Black", Impact, sans-serif' }}
          >
            TEKNINDOTAMA
          </span>
        </div>
      )}
    </div>
  );
}

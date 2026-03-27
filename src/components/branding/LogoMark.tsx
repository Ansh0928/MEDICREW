type LogoMarkProps = {
  size?: number;
  className?: string;
};

export function LogoMark({ size = 28, className }: LogoMarkProps) {
  return (
    <svg
      width={size}
      height={size}
      viewBox="0 0 64 64"
      fill="none"
      xmlns="http://www.w3.org/2000/svg"
      className={className}
      aria-label="MediCrew logo"
      role="img"
    >
      <rect x="2" y="2" width="60" height="60" rx="16" fill="url(#mcGradient)" />
      <path
        d="M23 24H41V30H47V34H41V40H23V34H17V30H23V24Z"
        fill="white"
      />
      <path
        d="M20 46C22.6 43.2 24.8 41.8 27.2 41.8C29.2 41.8 30.9 42.8 32.8 44.8C34.6 42.8 36.4 41.8 38.4 41.8C40.8 41.8 43 43.2 45.6 46"
        stroke="white"
        strokeWidth="3"
        strokeLinecap="round"
      />
      <defs>
        <linearGradient id="mcGradient" x1="8" y1="4" x2="58" y2="60" gradientUnits="userSpaceOnUse">
          <stop stopColor="#56B8FF" />
          <stop offset="1" stopColor="#018EF5" />
        </linearGradient>
      </defs>
    </svg>
  );
}

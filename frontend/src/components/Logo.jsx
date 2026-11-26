export default function Logo({ size = 28 }) {
  return (
    <svg className="logo" width={size} height={size} viewBox="0 0 32 32" aria-hidden="true">
      <rect width="32" height="32" rx="7" className="logo-bg" />
      <path
        d="M4 16c3.2-5.4 7.3-8 12-8s8.8 2.6 12 8c-3.2 5.4-7.3 8-12 8s-8.8-2.6-12-8z"
        fill="none"
        className="logo-eye"
        strokeWidth="2.2"
        strokeLinejoin="round"
      />
      <circle cx="16" cy="16" r="4.2" className="logo-pupil" />
    </svg>
  );
}

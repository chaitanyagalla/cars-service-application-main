import styles from './steering-loader.module.css';

/** Decorative wheel for controls that already provide their own accessible label. */
export function SteeringWheel({ size = 20 }: { size?: number }) {
  return (
    <svg
      className={styles.wheel}
      width={size}
      height={size}
      viewBox="0 0 64 64"
      fill="none"
      aria-hidden="true"
      focusable="false"
    >
      <circle cx="32" cy="32" r="26" stroke="currentColor" strokeWidth="6" />
      <path
        d="M8 25L25 30M56 25L39 30M32 40V57"
        stroke="currentColor"
        strokeWidth="7"
        strokeLinecap="round"
      />
      <circle cx="32" cy="33" r="9" fill="currentColor" />
      <path d="M28 8H36" stroke="var(--gold, #e99a08)" strokeWidth="4" strokeLinecap="round" />
    </svg>
  );
}

export function SteeringLoader({
  label = 'Loading…',
  variant = 'inline',
}: {
  label?: string;
  variant?: 'inline' | 'section' | 'page';
}) {
  return (
    <span className={`${styles.loader} ${styles[variant]}`} role="status" aria-atomic="true">
      <SteeringWheel size={variant === 'inline' ? 20 : 64} />
      <span className={styles.label}>{label}</span>
    </span>
  );
}

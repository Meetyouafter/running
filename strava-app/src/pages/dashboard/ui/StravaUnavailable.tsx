import styles from './StravaUnavailable.module.css';

interface Props {
  reason: string;
  onRetry: () => void;
  retrying: boolean;
}

/** Empty state when Strava can't be reached and nothing is cached. */
export default function StravaUnavailable({ reason, onRetry, retrying }: Props) {
  return (
    <div className={styles.box}>
      <div className={styles.icon}>⚠️</div>
      <div className={styles.title}>Не удалось загрузить данные Strava</div>
      <div className={styles.reason}>{reason}</div>
      <button className={styles.retry} onClick={onRetry} disabled={retrying}>
        {retrying ? 'Пробую...' : '↺ Повторить'}
      </button>
    </div>
  );
}

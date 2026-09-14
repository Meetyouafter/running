import ReactMarkdown from 'react-markdown';
import styles from './Markdown.module.css';

interface Props { children: string; className?: string }

/** Renders markdown text with the app's typography (headings, lists, code). */
export function Markdown({ children, className }: Props) {
  return (
    <div className={className ? `${styles.md} ${className}` : styles.md}>
      <ReactMarkdown>{children}</ReactMarkdown>
    </div>
  );
}

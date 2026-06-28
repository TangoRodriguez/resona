import styles from "./Header.module.css";

export function Header({ subtitle }: { subtitle: string }) {
  return (
    <header className={styles.header}>
      <h1 className={styles.logo}>RESONA</h1>
      <p className={styles.subtitle} key={subtitle}>
        {subtitle}
      </p>
    </header>
  );
}

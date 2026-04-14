export function NetworkGraph() {
  return (
    <section>
      <h2>Network Graph</h2>
      <svg aria-label="Network graph placeholder" height="120" width="240">
        <circle cx="40" cy="60" r="16" fill="currentColor" />
        <circle cx="200" cy="60" r="16" fill="currentColor" />
        <line x1="56" x2="184" y1="60" y2="60" stroke="currentColor" strokeWidth="2" />
      </svg>
    </section>
  );
}

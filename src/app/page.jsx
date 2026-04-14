import Link from 'next/link';

export default function HomePage() {
  return (
    <main>
      <h1>Shorts Spreader</h1>
      <p>Bootstrap landing page placeholder for extension installation guidance.</p>
      <p>
        <a href="/extension.zip">Download extension package</a>
      </p>
      <ol>
        <li>Install dependencies.</li>
        <li>Run the custom server.</li>
        <li>Load the unpacked extension from the extension directory.</li>
      </ol>
      <p>
        <Link href="/dashboard">Open dashboard</Link>
      </p>
    </main>
  );
}

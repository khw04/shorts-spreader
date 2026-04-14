import { Leaderboard } from '../../components/Leaderboard';
import { LiveFeed } from '../../components/LiveFeed';
import { NetworkGraph } from '../../components/NetworkGraph';
import { StatCards } from '../../components/StatCards';

export default function DashboardPage() {
  return (
    <main>
      <h1>Dashboard</h1>
      <p>Realtime dashboard shell placeholder.</p>
      <StatCards />
      <LiveFeed />
      <NetworkGraph />
      <Leaderboard />
    </main>
  );
}

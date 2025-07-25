import { TorrentSearch } from './components/TorrentSearch'
import { DebugInfo } from './components/DebugInfo'

export default function App() {
  return (
    <div className="dark min-h-screen">
      <TorrentSearch />
      {/* Debug info - remove this once everything is working */}
      <div className="fixed top-4 right-4 z-50">
        <DebugInfo />
      </div>
    </div>
  )
}
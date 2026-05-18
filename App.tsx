import { TorrentSearch } from './components/TorrentSearch'
import { Toaster } from 'sonner'

export default function App() {
  return (
    <div className="dark min-h-screen">
      <TorrentSearch />
      <Toaster position="bottom-left" />
    </div>
  )
}
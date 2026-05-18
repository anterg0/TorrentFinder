import { TorrentSearch } from './components/TorrentSearch'
import { Toaster } from 'sonner'

export default function App() {
  return (
    <div className="dark min-h-screen">
      <TorrentSearch />
      <Toaster
        position="bottom-left"
        toastOptions={{
          style: {
            background: 'hsl(240 10% 3.9%)',
            color: 'hsl(0 0% 98%)',
            border: '1px solid hsl(240 3.7% 15.9%)',
          },
        }}
      />
    </div>
  )
}
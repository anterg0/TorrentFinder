export interface TorrentResult {
  id: string
  name: string
  size: string
  uploadDate: string
  category: string
  tracker: string
  magnetLink?: string
  url?: string
}

export const mockResults: TorrentResult[] = [
  {
    id: '1',
    name: 'Ubuntu 22.04.3 Desktop amd64',
    size: '4.7 GB',
    uploadDate: '2024-01-15',
    category: 'Software',
    tracker: 'PublicTracker'
  },
  {
    id: '2',
    name: 'Fedora-39-1.5-x86_64-netinst',
    size: '695 MB',
    uploadDate: '2024-01-14',
    category: 'Software',
    tracker: 'TechTracker'
  },
  {
    id: '3',
    name: 'Debian 12.2.0 DVD amd64',
    size: '3.8 GB',
    uploadDate: '2024-01-13',
    category: 'Software',
    tracker: 'OpenSource'
  },
  {
    id: '4',
    name: 'Linux Mint 21.3 Cinnamon 64-bit',
    size: '2.8 GB',
    uploadDate: '2024-01-12',
    category: 'Software',
    tracker: 'PublicTracker'
  },
  {
    id: '5',
    name: 'Arch Linux 2024.01.01 x86_64',
    size: '858 MB',
    uploadDate: '2024-01-11',
    category: 'Software',
    tracker: 'TechTracker'
  },
  {
    id: '6',
    name: 'Big Buck Bunny 1080p',
    size: '1.2 GB',
    uploadDate: '2024-01-10',
    category: 'Movies',
    tracker: 'MediaTracker'
  },
  {
    id: '7',
    name: 'Sintel 4K Open Movie',
    size: '2.1 GB',
    uploadDate: '2024-01-09',
    category: 'Movies',
    tracker: 'OpenSource'
  },
  {
    id: '8',
    name: 'Blender 4.0 LTS Windows x64',
    size: '512 MB',
    uploadDate: '2024-01-08',
    category: 'Software',
    tracker: 'CreativeTracker'
  },
  {
    id: '9',
    name: 'GIMP 2.10.36 Portable',
    size: '298 MB',
    uploadDate: '2024-01-07',
    category: 'Software',
    tracker: 'CreativeTracker'
  },
  {
    id: '10',
    name: 'LibreOffice 7.6.4 Full Suite',
    size: '756 MB',
    uploadDate: '2024-01-06',
    category: 'Software',
    tracker: 'ProductivityTracker'
  }
]

// Extended placeholder results for initial display
export const placeholderResults: TorrentResult[] = [
  {
    id: 'placeholder-1',
    name: 'Popular Software Collection 2024',
    size: '12.4 GB',
    uploadDate: '2024-01-20',
    category: 'Software',
    tracker: 'TopTracker'
  },
  {
    id: 'placeholder-2',
    name: 'Creative Suite Bundle Pro',
    size: '8.9 GB',
    uploadDate: '2024-01-19',
    category: 'Software',
    tracker: 'CreativeHub'
  },
  {
    id: 'placeholder-3',
    name: 'Linux Distribution Pack Premium',
    size: '15.2 GB',
    uploadDate: '2024-01-18',
    category: 'Software',
    tracker: 'OpenSource'
  },
  {
    id: 'placeholder-4',
    name: 'Development Tools Collection 2024',
    size: '5.7 GB',
    uploadDate: '2024-01-17',
    category: 'Software',
    tracker: 'DevTracker'
  },
  {
    id: 'placeholder-5',
    name: 'Media Production Suite Ultimate',
    size: '11.3 GB',
    uploadDate: '2024-01-16',
    category: 'Software',
    tracker: 'MediaPro'
  },
  {
    id: 'placeholder-6',
    name: 'Game Development Framework Bundle',
    size: '7.8 GB',
    uploadDate: '2024-01-15',
    category: 'Software',
    tracker: 'GameDev'
  },
  {
    id: 'placeholder-7',
    name: 'Scientific Computing Collection',
    size: '9.4 GB',
    uploadDate: '2024-01-14',
    category: 'Software',
    tracker: 'ScienceHub'
  },
  {
    id: 'placeholder-8',
    name: 'Web Development Stack 2024',
    size: '4.2 GB',
    uploadDate: '2024-01-13',
    category: 'Software',
    tracker: 'WebDev'
  },
  {
    id: 'placeholder-9',
    name: 'Database Management Suite',
    size: '6.1 GB',
    uploadDate: '2024-01-12',
    category: 'Software',
    tracker: 'DataPro'
  },
  {
    id: 'placeholder-10',
    name: 'Security Tools Collection Premium',
    size: '3.9 GB',
    uploadDate: '2024-01-11',
    category: 'Software',
    tracker: 'SecureTracker'
  },
  {
    id: 'placeholder-11',
    name: 'Mobile Development Kit Complete',
    size: '8.7 GB',
    uploadDate: '2024-01-10',
    category: 'Software',
    tracker: 'MobileHub'
  },
  {
    id: 'placeholder-12',
    name: 'AI & Machine Learning Bundle',
    size: '13.5 GB',
    uploadDate: '2024-01-09',
    category: 'Software',
    tracker: 'AITracker'
  }
]
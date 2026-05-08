import { Button } from './ui/button'
import { motion, AnimatePresence } from 'motion/react'
import { X, User, LogOut } from 'lucide-react'

interface SettingsSidebarProps {
  isOpen: boolean
  onClose: () => void
  ruTrackerAuth: boolean
  onlineFixAuth: boolean
  freeTpAuth: boolean
  onLogin: () => void
  onOnlineFixLogin: () => void
  onLogout: (service: 'rutracker' | 'onlinefix' | 'freetp') => void
}

export function SettingsSidebar({
  isOpen,
  onClose,
  ruTrackerAuth,
  onlineFixAuth,
  freeTpAuth,
  onLogin,
  onOnlineFixLogin,
  onLogout
}: SettingsSidebarProps) {
  return (
    <AnimatePresence>
      {isOpen && (
        <>
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            onClick={onClose}
            className="fixed inset-0 bg-black/40 z-40"
          />
          <motion.div
            initial={{ x: 400 }}
            animate={{ x: 0 }}
            exit={{ x: 400 }}
            transition={{ duration: 0.3, ease: "easeInOut" }}
            className="fixed right-0 top-0 h-screen w-96 bg-background border-l border-border z-50 overflow-y-auto"
          >
            <div className="p-6">
              <div className="flex items-center justify-between mb-8">
                <h2 className="text-2xl font-bold text-foreground">Settings</h2>
                <Button
                  variant="ghost"
                  size="icon"
                  onClick={onClose}
                  className="h-8 w-8"
                >
                  <X className="h-4 w-4 text-foreground" />
                </Button>
              </div>

              <div className="space-y-6">
                <div className="space-y-4">
                  <h3 className="text-lg font-semibold text-foreground">Account Status</h3>
                  
                  {/* RuTracker */}
                  <div className="p-4 border border-border rounded-lg space-y-3">
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-2">
                        <div className="w-3 h-3 rounded-full bg-green-500"></div>
                        <span className="font-medium text-foreground">RuTracker</span>
                      </div>
                      <span className={`text-sm ${ruTrackerAuth ? 'text-green-400' : 'text-muted-foreground'}`}>
                        {ruTrackerAuth ? 'Logged in' : 'Not logged in'}
                      </span>
                    </div>
                    {ruTrackerAuth ? (
                      <Button
                        variant="outline"
                        size="sm"
                        className="w-full"
                        onClick={() => onLogout('rutracker')}
                      >
                        <LogOut className="h-4 w-4 mr-2" />
                        Logout
                      </Button>
                    ) : (
                      <Button
                        variant="default"
                        size="sm"
                        className="w-full"
                        onClick={onLogin}
                      >
                        <User className="h-4 w-4 mr-2" />
                        Login
                      </Button>
                    )}
                  </div>

                  {/* Online-Fix */}
                  <div className="p-4 border border-border rounded-lg space-y-3">
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-2">
                        <div className={`w-3 h-3 rounded-full ${onlineFixAuth ? 'bg-green-500' : 'bg-muted'}`}></div>
                        <span className="font-medium text-foreground">Online-Fix</span>
                      </div>
                      <span className={`text-sm ${onlineFixAuth ? 'text-green-400' : 'text-muted-foreground'}`}>
                        {onlineFixAuth ? 'Logged in' : 'Not logged in'}
                      </span>
                    </div>
                    {onlineFixAuth ? (
                      <Button
                        variant="outline"
                        size="sm"
                        className="w-full"
                        onClick={() => onLogout('onlinefix')}
                      >
                        <LogOut className="h-4 w-4 mr-2" />
                        Logout
                      </Button>
                    ) : (
                      <Button
                        variant="default"
                        size="sm"
                        className="w-full"
                        onClick={onOnlineFixLogin}
                      >
                        <User className="h-4 w-4 mr-2" />
                        Login
                      </Button>
                    )}
                  </div>

                  {/* FreeTp */}
                  <div className="p-4 border border-border rounded-lg space-y-3">
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-2">
                        <div className={`w-3 h-3 rounded-full ${freeTpAuth ? 'bg-green-500' : 'bg-muted'}`}></div>
                        <span className="font-medium text-foreground">FreeTP</span>
                      </div>
                      <span className={`text-sm ${freeTpAuth ? 'text-green-400' : 'text-muted-foreground'}`}>
                        {freeTpAuth ? 'Logged in' : 'Not logged in'}
                      </span>
                    </div>
                    {freeTpAuth ? (
                      <Button
                        variant="outline"
                        size="sm"
                        className="w-full"
                        onClick={() => onLogout('freetp')}
                        disabled
                      >
                        <LogOut className="h-4 w-4 mr-2" />
                        Logout
                      </Button>
                    ) : (
                      <Button
                        variant="default"
                        size="sm"
                        className="w-full"
                        disabled
                      >
                        <User className="h-4 w-4 mr-2" />
                        Coming Soon
                      </Button>
                    )}
                  </div>
                </div>
              </div>
            </div>
          </motion.div>
        </>
      )}
    </AnimatePresence>
  )
}

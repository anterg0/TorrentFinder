import { useState } from 'react'
import { Button } from './ui/button'
import { Card } from './ui/card'
import axios from 'axios'

export function DebugInfo() {
  const [debugInfo, setDebugInfo] = useState<string>('')
  const [isChecking, setIsChecking] = useState(false)

  const checkConnection = async () => {
    setIsChecking(true)
    setDebugInfo('')
    
    try {
      // Test basic connection
      const response = await axios.get('http://localhost:3001/api/health', {
        timeout: 5000
      })
      setDebugInfo(`✅ Backend server is running!\n\nResponse: ${JSON.stringify(response.data, null, 2)}`)
    } catch (error) {
      if (axios.isAxiosError(error)) {
        if (error.code === 'ECONNREFUSED') {
          setDebugInfo(`❌ Backend server is not running.\n\nError: ${error.message}\n\nTo fix:\n1. Open terminal\n2. Run: npm run dev:backend\n3. Or run: npm run dev (for both servers)`)
        } else if (error.code === 'ERR_NETWORK') {
          setDebugInfo(`❌ Network error.\n\nError: ${error.message}\n\nCheck if:\n1. Backend server is running on port 3001\n2. No firewall blocking the connection\n3. Try: npm run dev:backend`)
        } else {
          setDebugInfo(`❌ Connection error.\n\nError: ${error.message}\nCode: ${error.code}`)
        }
      } else {
        setDebugInfo(`❌ Unknown error: ${error}`)
      }
    } finally {
      setIsChecking(false)
    }
  }

  return (
    <Card className="p-4 m-4">
      <div className="space-y-4">
        <div>
          <h3 className="mb-2">Debug Connection</h3>
          <Button 
            onClick={checkConnection} 
            disabled={isChecking}
            variant="outline"
            size="sm"
          >
            {isChecking ? 'Checking...' : 'Test Backend Connection'}
          </Button>
        </div>
        
        {debugInfo && (
          <div className="bg-muted p-3 rounded text-sm">
            <pre className="whitespace-pre-wrap">{debugInfo}</pre>
          </div>
        )}
        
        <div className="text-xs text-muted-foreground">
          <p>Expected backend URL: http://localhost:3001</p>
          <p>Frontend URL: http://localhost:3000</p>
          <p>Make sure both servers are running with: npm run dev</p>
        </div>
      </div>
    </Card>
  )
}
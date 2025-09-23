import { useState } from 'react'
import TaskList from './components/TaskList'
import './App.css'
import './components/Tasks.css'

function App() {
  const [isLoggedIn, setIsLoggedIn] = useState(true); // For demo purposes, assuming user is logged in

  return (
    <div className="app">
      <header className="app-header">
        <h1>Task Management System</h1>
      </header>

      <main className="app-main">
        {isLoggedIn ? (
          <TaskList />
        ) : (
          <div className="login-prompt">
            Please login to manage your tasks
          </div>
        )}
      </main>
    </div>
  )
}

export default App

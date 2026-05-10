import { useState } from 'react'
import { BrowserRouter, Routes, Route } from 'react-router-dom'
import { Sidebar } from './components/layout/Sidebar'
import { TopBar } from './components/layout/TopBar'
import { ErrorBoundary } from './components/ui/ErrorBoundary'
import { LoadingScreen } from './components/ui/LoadingScreen'
import { UserProvider, useUser } from './context/UserContext'
import { UserSelectPage } from './pages/Login/UserSelectPage'

import { DashboardPage } from './pages/Dashboard/DashboardPage'
import { ProductsPage } from './pages/Products/ProductsPage'
import { StockInListPage } from './pages/StockIn/StockInListPage'
import { StockInFormPage } from './pages/StockIn/StockInFormPage'
import { StockOutListPage } from './pages/StockOut/StockOutListPage'
import { StockOutFormPage } from './pages/StockOut/StockOutFormPage'
import { StockCardPage } from './pages/StockCard/StockCardPage'
import { AdjustmentPage } from './pages/Adjustment/AdjustmentPage'
import { ReportsPage } from './pages/Reports/ReportsPage'
import { MasterDataPage } from './pages/MasterData/MasterDataPage'
import { ImportPage } from './pages/Import/ImportPage'

function AppInner() {
  const [ready, setReady] = useState(false)
  const [loggedIn, setLoggedIn] = useState(false)
  const { currentUser, setCurrentUser } = useUser()

  if (!ready) {
    return <LoadingScreen onReady={() => setReady(true)} />
  }

  if (!loggedIn || !currentUser) {
    return <UserSelectPage onLoggedIn={() => setLoggedIn(true)} />
  }

  const logout = () => {
    setCurrentUser(null)
    setLoggedIn(false)
  }

  return (
    <BrowserRouter>
      <div className="flex h-screen overflow-hidden">
        <Sidebar onLogout={logout} />
        <div className="flex-1 flex flex-col overflow-hidden">
          <TopBar currentUser={currentUser} onSelectUser={() => {}} />
          <main className="flex-1 overflow-y-auto bg-gray-50">
            <ErrorBoundary>
              <Routes>
                <Route path="/" element={<ErrorBoundary><DashboardPage /></ErrorBoundary>} />
                <Route path="/products" element={<ErrorBoundary><ProductsPage /></ErrorBoundary>} />
                <Route path="/stock-in" element={<ErrorBoundary><StockInListPage /></ErrorBoundary>} />
                <Route path="/stock-in/:id" element={<ErrorBoundary><StockInFormPage /></ErrorBoundary>} />
                <Route path="/stock-out" element={<ErrorBoundary><StockOutListPage /></ErrorBoundary>} />
                <Route path="/stock-out/:id" element={<ErrorBoundary><StockOutFormPage /></ErrorBoundary>} />
                <Route path="/stock-card" element={<ErrorBoundary><StockCardPage /></ErrorBoundary>} />
                <Route path="/adjustment" element={<ErrorBoundary><AdjustmentPage /></ErrorBoundary>} />
                <Route path="/reports" element={<ErrorBoundary><ReportsPage /></ErrorBoundary>} />
                <Route path="/master" element={<ErrorBoundary><MasterDataPage /></ErrorBoundary>} />
                <Route path="/import" element={<ErrorBoundary><ImportPage /></ErrorBoundary>} />
              </Routes>
            </ErrorBoundary>
          </main>
        </div>
      </div>
    </BrowserRouter>
  )
}

export default function App() {
  return (
    <UserProvider>
      <AppInner />
    </UserProvider>
  )
}

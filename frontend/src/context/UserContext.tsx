import { createContext, useContext, useState, ReactNode } from 'react'
import type { User } from '../types/models'

const GUEST_USER: User = {
  id: 0, username: 'guest', displayName: 'ผู้เยี่ยมชม',
  isSystemAccount: false, role: 'viewer', isActive: true,
  lockedAt: '', lastSelectedAt: '', createdAt: '', updatedAt: '',
}

interface UserContextType {
  currentUser: User | null
  setCurrentUser: (u: User | null) => void
  isSysAdmin: boolean
  isAdmin: boolean
  canWriteStock: boolean
  canManageMaster: boolean
  isGuest: boolean
  loginAsGuest: () => void
}

const UserContext = createContext<UserContextType>({
  currentUser: null,
  setCurrentUser: () => {},
  isSysAdmin: false,
  isAdmin: false,
  canWriteStock: false,
  canManageMaster: false,
  isGuest: false,
  loginAsGuest: () => {},
})

export function UserProvider({ children }: { children: ReactNode }) {
  const [currentUser, setCurrentUser] = useState<User | null>(null)
  const [isGuest, setIsGuest] = useState(false)
  const isSysAdmin = currentUser?.isSystemAccount ?? false
  const role = isSysAdmin ? 'admin' : currentUser?.role
  const isAdmin = role === 'admin'
  const canWriteStock = role === 'admin' || role === 'staff'
  const canManageMaster = role === 'admin'

  const setUser = (u: User | null) => {
    setCurrentUser(u)
    setIsGuest(false)
  }

  const loginAsGuest = () => {
    setCurrentUser(GUEST_USER)
    setIsGuest(true)
  }

  return (
    <UserContext.Provider value={{ currentUser, setCurrentUser: setUser, isSysAdmin, isAdmin, canWriteStock, canManageMaster, isGuest, loginAsGuest }}>
      {children}
    </UserContext.Provider>
  )
}

export function useUser() {
  return useContext(UserContext)
}

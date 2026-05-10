import { createContext, useContext, useState, ReactNode } from 'react'
import type { User } from '../types/models'

const GUEST_USER: User = {
  id: 0, username: 'guest', displayName: 'ผู้เยี่ยมชม',
  isSystemAccount: false, isActive: true,
  lockedAt: '', lastSelectedAt: '', createdAt: '', updatedAt: '',
}

interface UserContextType {
  currentUser: User | null
  setCurrentUser: (u: User | null) => void
  isSysAdmin: boolean
  isGuest: boolean
  loginAsGuest: () => void
}

const UserContext = createContext<UserContextType>({
  currentUser: null,
  setCurrentUser: () => {},
  isSysAdmin: false,
  isGuest: false,
  loginAsGuest: () => {},
})

export function UserProvider({ children }: { children: ReactNode }) {
  const [currentUser, setCurrentUser] = useState<User | null>(null)
  const [isGuest, setIsGuest] = useState(false)
  const isSysAdmin = currentUser?.isSystemAccount ?? false

  const setUser = (u: User | null) => {
    setCurrentUser(u)
    setIsGuest(false)
  }

  const loginAsGuest = () => {
    setCurrentUser(GUEST_USER)
    setIsGuest(true)
  }

  return (
    <UserContext.Provider value={{ currentUser, setCurrentUser: setUser, isSysAdmin, isGuest, loginAsGuest }}>
      {children}
    </UserContext.Provider>
  )
}

export function useUser() {
  return useContext(UserContext)
}

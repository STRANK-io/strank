'use client'

import { UsersType } from '@/lib/types/auth'
import { createContext, ReactNode, useContext } from 'react'

type UserContextType = {
  user: UsersType
}

const UserContext = createContext<UserContextType | undefined>(undefined)

export const UserProvider = ({ children, user }: { children: ReactNode; user: UsersType }) => {
  return <UserContext.Provider value={{ user }}>{children}</UserContext.Provider>
}

export const useUser = () => {
  const context = useContext(UserContext)

  if (!context) {
    throw new Error('useUser must be used within a UserProvider')
  }

  return context.user
}

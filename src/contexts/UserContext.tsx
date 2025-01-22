'use client'

import { createContext, ReactNode, useContext } from 'react'

type UserContextType = {
  userId: string
}

const UserContext = createContext<UserContextType | undefined>(undefined)

export const UserProvider = ({ children, userId }: { children: ReactNode; userId: string }) => {
  return <UserContext.Provider value={{ userId }}>{children}</UserContext.Provider>
}

export const useUserContext = () => {
  const context = useContext(UserContext)

  if (!context) {
    throw new Error('useUserContext must be used within a UserProvider')
  }

  return context
}

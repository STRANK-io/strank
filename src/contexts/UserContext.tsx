'use client'

import { createContext, ReactNode, useContext } from 'react'

type UserContextType = {
  userId: string
  athleteId: number
}

const UserContext = createContext<UserContextType | undefined>(undefined)

export const UserProvider = ({
  children,
  userId,
  athleteId,
}: {
  children: ReactNode
  userId: string
  athleteId: number
}) => {
  return <UserContext.Provider value={{ userId, athleteId }}>{children}</UserContext.Provider>
}

export const useUserContext = () => {
  const context = useContext(UserContext)

  if (!context) {
    throw new Error('useUserContext must be used within a UserProvider')
  }

  return context
}

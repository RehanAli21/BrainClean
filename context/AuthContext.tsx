import { useNavigationContainerRef, useRouter, useSegments } from 'expo-router'
import * as SecureStore from 'expo-secure-store'
import React, { createContext, useContext, useEffect, useState } from 'react'

interface AuthContextType {
	token: string | null
	isLoading: boolean
	login: (token: string) => void
	logout: () => void
}

const AuthContext = createContext<AuthContextType>({
	token: null,
	isLoading: true,
	login: () => {},
	logout: () => {},
})

// This hook allows any component to access auth state
export const useAuth = () => useContext(AuthContext)

export function AuthProvider({ children }: { children: React.ReactNode }) {
	const [token, setToken] = useState<string | null>(null)
	const [isLoading, setIsLoading] = useState(true)
	const router = useRouter()
	const segments = useSegments()
	const navigationRef = useNavigationContainerRef()

	// 1. Check for token on App Start
	useEffect(() => {
		const checkToken = async () => {
			try {
				const storedToken = await SecureStore.getItemAsync('user_token')
				if (storedToken) {
					setToken(storedToken)
				}
			} catch (e) {
				console.error('Failed to fetch token', e)
			} finally {
				setIsLoading(false)
			}
		}
		checkToken()
	}, [])

	// 2. Protect Routes (The Redirect Logic)
	useEffect(() => {
		if (isLoading) return
		if (!navigationRef.isReady()) return

		const inAuthGroup = segments[0] === 'auth'

		if (!token && !inAuthGroup) {
			router.replace('/auth/login')
		} else if (token && inAuthGroup) {
			router.replace('/(main)/(tabs)/tasks')
		}
	}, [token, segments, isLoading, navigationRef.isReady()])

	// 3. Login Action
	const login = async (newToken: string) => {
		await SecureStore.setItemAsync('user_token', newToken)
		setToken(newToken)
		router.replace('/(main)/(tabs)/tasks')
	}

	// 4. Logout Action
	const logout = async () => {
		await SecureStore.deleteItemAsync('user_token')
		setToken(null)
		router.replace('/auth/login')
	}

	return <AuthContext.Provider value={{ token, isLoading, login, logout }}>{children}</AuthContext.Provider>
}

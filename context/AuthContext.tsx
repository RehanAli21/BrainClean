import { useUiStore } from '@/store/uiStore'
import { useNavigationContainerRef, useRouter, useSegments } from 'expo-router'
import * as SecureStore from 'expo-secure-store'
import React, { createContext, useContext, useEffect, useState } from 'react'

// Log the user out this many ms BEFORE the real token expiration, so they
// get prompted to re-login while they still have a usable session in hand.
// 24h = re-login a full day before the JWT actually rejects.
export const TOKEN_EXPIRY_BUFFER_MS = 24 * 60 * 60 * 1000

interface AuthContextType {
	token: string | null
	email: string | null
	tokenExpiresAt: number | null
	isLoading: boolean
	login: (token: string, email: string, expiresAt: string) => void
	logout: () => void
}

const AuthContext = createContext<AuthContextType>({
	token: null,
	email: null,
	tokenExpiresAt: null,
	isLoading: true,
	login: () => {},
	logout: () => {},
})

// This hook allows any component to access auth state
export const useAuth = () => useContext(AuthContext)

export function AuthProvider({ children }: { children: React.ReactNode }) {
	const [token, setToken] = useState<string | null>(null)
	const [email, setEmail] = useState<string | null>(null)
	const [tokenExpiresAt, setTokenExpiresAt] = useState<number | null>(null)
	const [isLoading, setIsLoading] = useState(true)
	const router = useRouter()
	const segments = useSegments()
	const navigationRef = useNavigationContainerRef()

	// 1. Check for token on App Start
	useEffect(() => {
		const checkToken = async () => {
			try {
				const storedToken = await SecureStore.getItemAsync('user_token')
				const storedEmail = await SecureStore.getItemAsync('user_email')
				const storedExpiry = await SecureStore.getItemAsync('user_token_expires_at')

				setToken(storedToken)
				setEmail(storedEmail)
				setTokenExpiresAt(storedExpiry ? Number(storedExpiry) : null)
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
	const login = async (newToken: string, userEmail: string, expiresAt: string) => {
		const expiresAtMs = new Date(expiresAt).getTime()
		await SecureStore.setItemAsync('user_token', newToken)
		await SecureStore.setItemAsync('user_email', userEmail)
		await SecureStore.setItemAsync('user_token_expires_at', String(expiresAtMs))
		setToken(newToken)
		setEmail(userEmail)
		setTokenExpiresAt(expiresAtMs)
		router.replace('/(main)/(tabs)/tasks')
	}

	// 4. Logout Action
	const logout = async () => {
		await SecureStore.deleteItemAsync('user_token')
		await SecureStore.deleteItemAsync('user_email')
		await SecureStore.deleteItemAsync('user_token_expires_at')
		useUiStore.getState().setHasRated(false)
		setToken(null)
		setEmail(null)
		setTokenExpiresAt(null)
		router.replace('/auth/login')
	}

	return (
		<AuthContext.Provider value={{ token, email, tokenExpiresAt, isLoading, login, logout }}>
			{children}
		</AuthContext.Provider>
	)
}

import { API_BASE_URL } from '@/constants/config';
import axios from 'axios';
import * as SecureStore from 'expo-secure-store';
import { triggerLogout } from './authEvents';

// 1. Create the Axios Instance
const apiClient = axios.create({
    baseURL: API_BASE_URL,
    timeout: 10000,
    headers: {
        'Content-Type': 'application/json',
    },
});

// =================================================================
// 2. REQUEST INTERCEPTOR (The "Outgoing" Gatekeeper)
// =================================================================
apiClient.interceptors.request.use(
    async (config) => {
        // A. Retrieve token from Secure Storage
        const token = await SecureStore.getItemAsync('user_token');

        // B. Inject into Header if it exists
        if (token) {
            config.headers.Authorization = `Bearer ${token}`;
        }

        if (__DEV__) {
            console.log(`[Outgoing] ${config.method?.toUpperCase()} ${config.url}`);
        }
        return config;
    },
    (error) => {
        return Promise.reject(error);
    }
);

// =================================================================
// 3. RESPONSE INTERCEPTOR (The "Incoming" Gatekeeper)
// =================================================================
apiClient.interceptors.response.use(
    (response) => {
        return response;
    },
    async (error) => {
        const url = error.config?.url || '';

        // Auth endpoints handle their own errors (e.g. wrong password).
        const isAuthEndpoint = url.startsWith('/auth/');

        const status = error.response?.status;

        // Auto-logout on 401 only. 403 is an authorization failure (roles,
        // business rules) — the session itself may still be valid.
        if (status === 401 && !isAuthEndpoint) {
            if (__DEV__) {
                console.warn('[Interceptor] 401 detected. Logging out...');
            }
            await triggerLogout();
            return Promise.reject(error);
        }

        if (__DEV__) {
            console.error('[Interceptor] API Error:', error.response?.data || error.message);
        }
        return Promise.reject(error);
    }
);

export default apiClient;

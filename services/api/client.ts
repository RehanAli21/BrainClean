import { API_BASE_URL } from '@/constants/config';
import axios from 'axios';
import { router } from 'expo-router';
import * as SecureStore from 'expo-secure-store';

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

        console.log(`[Outgoing] ${config.method?.toUpperCase()} ${config.url}`);
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
        // A. If success, just return the data (strip the axios wrapper if you want)
        return response;
    },
    async (error) => {
        const originalRequest = error.config;
        const url = originalRequest?.url || '';

        // Auth endpoints handle their own errors (e.g. wrong password).
        // Only auto-logout for 401s on protected endpoints.
        const isAuthEndpoint = url.startsWith('/auth/');

        const status = error.response?.status;

        if (status === 402) {
            return Promise.reject(error);
        }

        if ((status === 401 || status === 403) && !originalRequest._retry && !isAuthEndpoint) {
            console.warn(`[Interceptor] ${status} Detected. Logging out...`);

            await SecureStore.deleteItemAsync('user_token');
            await SecureStore.deleteItemAsync('user_email');

            router.replace('/auth/login');

            return Promise.reject(error);
        }

        // C. Log other errors
        console.error('[Interceptor] API Error:', error.response?.data || error.message);
        return Promise.reject(error);
    }
);

export default apiClient;
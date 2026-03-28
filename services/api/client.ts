import axios from 'axios';
import { router } from 'expo-router';
import * as SecureStore from 'expo-secure-store';

// 1. Create the Axios Instance
const apiClient = axios.create({
    baseURL: 'http://192.168.100.5:8080/api', // Replace with your actual Backend URL
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

        // B. Handle 401 Unauthorized (Token Expired/Invalid)
        if (error.response?.status === 401 && !originalRequest._retry && !isAuthEndpoint) {
            console.warn('[Interceptor] 401 Detected. Logging out...');

            // 1. Clear bad token
            await SecureStore.deleteItemAsync('user_token');

            // 2. Force redirect to login
            router.replace('/auth/login');

            return Promise.reject(error);
        }

        // C. Log other errors
        console.error('[Interceptor] API Error:', error.response?.data || error.message);
        return Promise.reject(error);
    }
);

export default apiClient;
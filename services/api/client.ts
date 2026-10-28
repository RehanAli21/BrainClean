import { API_BASE_URL } from '@/constants/config';
import axios from 'axios';

// There are no user accounts: the only backend calls left (feedback) are to
// public endpoints, so no auth header is attached.
const apiClient = axios.create({
    baseURL: API_BASE_URL,
    timeout: 10000,
    headers: {
        'Content-Type': 'application/json',
    },
});

apiClient.interceptors.request.use(
    (config) => {
        if (__DEV__) {
            console.log(`[Outgoing] ${config.method?.toUpperCase()} ${config.url}`);
        }
        return config;
    },
    (error) => {
        return Promise.reject(error);
    }
);

apiClient.interceptors.response.use(
    (response) => {
        return response;
    },
    (error) => {
        if (__DEV__) {
            console.error('[Interceptor] API Error:', error.response?.data || error.message);
        }
        return Promise.reject(error);
    }
);

export default apiClient;

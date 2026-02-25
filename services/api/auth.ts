import apiClient from './client';

// 1. Define Types for Inputs/Outputs
export interface LoginResponse {
    token: string;
    user: {
        id: string;
        email: string;
        name: string;
    };
}

export interface RegisterPayload {
    email: string;
    password: string;
    fullName: string;
}

// 2. Export functions that return the PROMISE
export const authService = {

    login: async (email: string, password: string) => {
        // Post data and return ONLY the data part
        const response = await apiClient.post<LoginResponse>('/auth/login', { email, password });
        return response.data;
    },

    register: async (payload: RegisterPayload) => {
        const response = await apiClient.post<LoginResponse>('/auth/register', payload);
        return response.data;
    },

    logout: async () => {
        // If backend needs to invalidate token
        return apiClient.post('/auth/logout');
    }
};
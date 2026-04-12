import apiClient from './client';
export const authApi = {
    checkAuth: () => apiClient.get('/auth/me'),
    loginWithPassword: async (baseUrl, email, password) => {
        const url = baseUrl.endsWith('/') ? baseUrl.slice(0, -1) : baseUrl;
        const response = await fetch(`${url}/email/auth/login`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ email, password }),
        });
        return response.json();
    },
};
//# sourceMappingURL=auth.js.map
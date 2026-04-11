import { defineStore } from 'pinia';
import { ref, computed } from 'vue';
export const useAuthStore = defineStore('auth', () => {
    const token = ref(localStorage.getItem('jwt_token') || '');
    const isAuthenticated = computed(() => {
        if (!token.value)
            return false;
        try {
            const payload = JSON.parse(atob(token.value.split('.')[1]));
            return payload.exp ? payload.exp > Math.floor(Date.now() / 1000) : true;
        }
        catch {
            return false;
        }
    });
    const setToken = (newToken) => {
        token.value = newToken;
        localStorage.setItem('jwt_token', newToken);
    };
    const logout = () => {
        token.value = '';
        localStorage.removeItem('jwt_token');
    };
    const decodeToken = () => {
        if (!token.value)
            return null;
        try {
            const payload = token.value.split('.')[1];
            return JSON.parse(atob(payload));
        }
        catch {
            return null;
        }
    };
    return { token, isAuthenticated, setToken, logout, decodeToken };
});
//# sourceMappingURL=auth.js.map
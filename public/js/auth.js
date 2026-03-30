// ═══════════════════════════════════════════
// Auth Module — Login, session handling, logout
// ═══════════════════════════════════════════

(function () {
    'use strict';

    const API_BASE = '/api/auth';

    // ─── Check if already logged in ───
    async function checkSession() {
        try {
            const res = await fetch(`${API_BASE}/me`, { credentials: 'include' });
            if (res.ok) {
                const data = await res.json();
                // If on login page, redirect to dashboard
                if (window.location.pathname === '/' || window.location.pathname === '/index.html') {
                    window.location.href = '/dashboard';
                    return;
                }
                // Set user info in nav
                setUserDisplay(data.user);
                window.currentUser = data.user;
            } else {
                // Not logged in
                if (window.location.pathname !== '/' && window.location.pathname !== '/index.html') {
                    window.location.href = '/';
                }
            }
        } catch (err) {
            console.error('Session check failed:', err);
            if (window.location.pathname !== '/' && window.location.pathname !== '/index.html') {
                window.location.href = '/';
            }
        }
    }

    // ─── Display user info in navbar ───
    function setUserDisplay(user) {
        const nameEl = document.getElementById('user-display-name');
        const roleEl = document.getElementById('user-display-role');
        const avatarEl = document.getElementById('user-avatar');

        if (nameEl) nameEl.textContent = user.full_name;
        if (roleEl) roleEl.textContent = user.role.charAt(0).toUpperCase() + user.role.slice(1) + ' • ' + user.department;
        if (avatarEl) {
            const initials = user.full_name.split(' ').map(n => n[0]).join('').substring(0, 2);
            avatarEl.textContent = initials;
        }

        // Hide reports link for faculty
        if (user.role === 'faculty') {
            const reportLink = document.getElementById('nav-reports');
            if (reportLink) reportLink.style.display = 'none';
        }
    }

    // ─── Login Form Handler ───
    const loginForm = document.getElementById('login-form');
    if (loginForm) {
        loginForm.addEventListener('submit', async (e) => {
            e.preventDefault();
            const username = document.getElementById('username').value.trim();
            const password = document.getElementById('password').value;
            const errorEl = document.getElementById('login-error');
            const btn = document.getElementById('login-btn');

            if (!username || !password) {
                showLoginError('Please enter both username and password.');
                return;
            }

            btn.disabled = true;
            btn.innerHTML = '<span class="spinner"></span> Signing in...';

            try {
                const res = await fetch(`${API_BASE}/login`, {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    credentials: 'include',
                    body: JSON.stringify({ username, password })
                });

                const data = await res.json();

                if (res.ok) {
                    window.location.href = '/dashboard';
                } else {
                    showLoginError(data.error || 'Login failed.');
                    btn.disabled = false;
                    btn.textContent = 'Sign In';
                }
            } catch (err) {
                console.error('Login error:', err);
                showLoginError('Network error. Please try again.');
                btn.disabled = false;
                btn.textContent = 'Sign In';
            }
        });
    }

    function showLoginError(message) {
        const el = document.getElementById('login-error');
        if (el) {
            el.textContent = message;
            el.classList.add('show');
            setTimeout(() => el.classList.remove('show'), 5000);
        }
    }

    // ─── Logout Handler ───
    const logoutBtn = document.getElementById('logout-btn');
    if (logoutBtn) {
        logoutBtn.addEventListener('click', async () => {
            try {
                await fetch(`${API_BASE}/logout`, {
                    method: 'POST',
                    credentials: 'include'
                });
            } catch (err) {
                console.error('Logout error:', err);
            }
            window.location.href = '/';
        });
    }

    // ─── Toast notification helper ───
    window.showToast = function (message, type = 'info') {
        const container = document.getElementById('toast-container');
        if (!container) return;

        const toast = document.createElement('div');
        toast.className = `toast ${type}`;
        toast.textContent = message;
        container.appendChild(toast);

        setTimeout(() => {
            toast.classList.add('removing');
            setTimeout(() => toast.remove(), 300);
        }, 3500);
    };

    // ─── Change Password Handler ───
    const cpModal = document.getElementById('change-password-modal');
    const cpBtn = document.getElementById('change-password-btn');
    const cpCloseBtn = document.getElementById('cp-modal-close-btn');
    const cpCancelBtn = document.getElementById('cp-modal-cancel-btn');
    const cpSaveBtn = document.getElementById('cp-modal-save-btn');

    if (cpBtn) {
        cpBtn.addEventListener('click', () => {
            cpModal.classList.add('active');
        });
    }

    const closeCPModal = () => {
        cpModal.classList.remove('active');
        // Clear inputs
        document.getElementById('cp-old-password').value = '';
        document.getElementById('cp-new-password').value = '';
        document.getElementById('cp-confirm-password').value = '';
    };

    if (cpCloseBtn) cpCloseBtn.addEventListener('click', closeCPModal);
    if (cpCancelBtn) cpCancelBtn.addEventListener('click', closeCPModal);
    if (cpModal) {
        cpModal.addEventListener('click', (e) => {
            if (e.target.id === 'change-password-modal') closeCPModal();
        });
    }

    if (cpSaveBtn) {
        cpSaveBtn.addEventListener('click', async () => {
            const oldPassword = document.getElementById('cp-old-password').value;
            const newPassword = document.getElementById('cp-new-password').value;
            const confirmPassword = document.getElementById('cp-confirm-password').value;

            if (!oldPassword || !newPassword || !confirmPassword) {
                window.showToast('Please fill in all password fields.', 'error');
                return;
            }

            if (newPassword !== confirmPassword) {
                window.showToast('New passwords do not match.', 'error');
                return;
            }

            if (newPassword.length < 6) {
                window.showToast('New password must be at least 6 characters.', 'error');
                return;
            }

            cpSaveBtn.disabled = true;
            cpSaveBtn.innerHTML = '<span class="spinner"></span> Updating...';

            try {
                const res = await fetch(`${API_BASE}/change-password`, {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    credentials: 'include',
                    body: JSON.stringify({ oldPassword, newPassword })
                });

                const data = await res.json();

                if (res.ok) {
                    window.showToast('Password updated! Please use your new password next time.', 'success');
                    closeCPModal();
                } else {
                    window.showToast(data.error || 'Failed to update password.', 'error');
                }
            } catch (err) {
                console.error('Change password error:', err);
                window.showToast('Network error. Please try again.', 'error');
            } finally {
                cpSaveBtn.disabled = false;
                cpSaveBtn.textContent = 'Update Password';
            }
        });
    }

    // ─── Initialize ───
    checkSession();

})();

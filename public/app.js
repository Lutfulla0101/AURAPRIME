// i18n Dictionary
const translations = {
  uz: {
    login: "Kirish",
    register: "Ro'yxatdan o'tish",
    logout: "Chiqish",
    proMember: "VIP Foydalanuvchi",
    heroBadge: "Node.js + Express + JWT + Cookie & Session Arxitekturasi",
    heroTitle: 'Kreativ Loyihalar & <span class="gradient-text">Premium Boshqaruv</span> Tizimi',
    heroSubtitle: "Xavfsiz JWT autentifikatsiya, 1 soatlik cookie-lar (Til & Mavzu) va avtomatik loginni eslab qoluvchi Session mexanizmi.",
    crudTitle: "Loyihalar & Xizmatlar Katalogi",
    crudSubtitle: "To'liq Create, Read, Update, Delete amallari JWT himoyasida",
    createBtn: "Yangi Qo'shish",
    usernameLabel: "Foydalanuvchi nomi / Email",
    passwordLabel: "Maxfiy parol",
    submitLogin: "Tizimga Kirish",
    regUsername: "Login tanlang",
    regEmail: "Elektron pochta",
    regPassword: "Parol yarating",
    submitRegister: "Ro'yxatdan O'tish"
  },
  en: {
    login: "Sign In",
    register: "Register",
    logout: "Log Out",
    proMember: "VIP Member",
    heroBadge: "Node.js + Express + JWT + Cookie & Session Architecture",
    heroTitle: 'Creative Projects & <span class="gradient-text">Premium Suite</span> Platform',
    heroSubtitle: "Secured JWT authentication, 1-hour persistent cookies (Theme & Lang), and automatic session-remembered logins.",
    crudTitle: "Projects & Services Catalog",
    crudSubtitle: "Full Create, Read, Update, Delete operations protected by JWT",
    createBtn: "Add New Project",
    usernameLabel: "Username or Email",
    passwordLabel: "Password",
    submitLogin: "Sign In Now",
    regUsername: "Choose Username",
    regEmail: "Email Address",
    regPassword: "Create Password",
    submitRegister: "Create Account"
  },
  ru: {
    login: "Войти",
    register: "Регистрация",
    logout: "Выйти",
    proMember: "VIP Пользователь",
    heroBadge: "Архитектура Node.js + Express + JWT + Cookie & Session",
    heroTitle: 'Креативные Проекты & <span class="gradient-text">Премиум Управление</span>',
    heroSubtitle: "Безопасная аутентификация JWT, сохранение куки на 1 час (Тема и Язык) и автозаполнение логина через Session.",
    crudTitle: "Каталог Проектов и Услуг",
    crudSubtitle: "Полный CRUD под защитой JWT токена",
    createBtn: "Добавить Новый",
    usernameLabel: "Имя пользователя / Email",
    passwordLabel: "Секретный пароль",
    submitLogin: "Войти в систему",
    regUsername: "Придумайте логин",
    regEmail: "Электронная почта",
    regPassword: "Создайте пароль",
    submitRegister: "Зарегистрироваться"
  }
};

// Global State
let currentUser = null;
let authToken = localStorage.getItem('auth_token') || null;
let items = [];
let currentTheme = 'dark';
let currentLang = 'uz';
let rememberedLogin = '';

// Helper: Read Cookie
function getCookie(name) {
  const match = document.cookie.match(new RegExp('(^| )' + name + '=([^;]+)'));
  return match ? decodeURIComponent(match[2]) : null;
}

// Show Toast
function showToast(message, type = 'info') {
  const container = document.getElementById('toast');
  const toast = document.createElement('div');
  toast.className = `toast ${type}`;
  
  let icon = 'fa-circle-info';
  if (type === 'success') icon = 'fa-circle-check';
  if (type === 'error') icon = 'fa-triangle-exclamation';

  toast.innerHTML = `<i class="fa-solid ${icon}"></i> <span>${message}</span>`;
  container.appendChild(toast);

  setTimeout(() => {
    toast.style.opacity = '0';
    toast.style.transform = 'translateX(100%)';
    setTimeout(() => toast.remove(), 300);
  }, 3500);
}

// 1. COOKIE: Initialize Theme and Language (Saved for 1 Hour)
async function initPreferences() {
  // Check cookie or server API
  const themeCookie = getCookie('app_theme');
  const langCookie = getCookie('app_lang');

  if (themeCookie) {
    currentTheme = themeCookie;
  }
  if (langCookie) {
    currentLang = langCookie;
  }

  // Apply to UI
  applyTheme(currentTheme, false);
  applyLanguage(currentLang, false);

  updateStatusIndicators();
}

// Save Theme / Lang via API which sets Max-Age = 3600 (1 Hour)
async function savePreference(theme, lang) {
  try {
    const res = await fetch('/api/preferences', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ theme, lang })
    });
    const data = await res.json();
    if (data.success) {
      updateStatusIndicators();
    }
  } catch (err) {
    console.error('Error saving preference:', err);
  }
}

// Apply Theme
function applyTheme(theme, save = true) {
  currentTheme = theme;
  document.documentElement.setAttribute('data-theme', theme);
  const themeIcon = document.getElementById('themeIcon');
  const themeLabel = document.getElementById('themeLabel');

  if (theme === 'light') {
    themeIcon.className = 'fa-solid fa-sun';
    themeLabel.textContent = 'Light Mode';
  } else {
    themeIcon.className = 'fa-solid fa-moon';
    themeLabel.textContent = 'Dark Mode';
  }

  if (save) {
    savePreference(theme, null);
    showToast(`Mavzu o'zgardi: ${theme.toUpperCase()} (Cookie da 1 soat saqlandi)`, 'info');
  }
}

// Apply Language
function applyLanguage(lang, save = true) {
  currentLang = lang;
  document.getElementById('langSelect').value = lang;

  const dict = translations[lang] || translations.uz;
  document.querySelectorAll('[data-i18n]').forEach(el => {
    const key = el.getAttribute('data-i18n');
    if (dict[key]) {
      el.innerHTML = dict[key];
    }
  });

  if (save) {
    savePreference(null, lang);
    showToast(`Til yangilandi: ${lang.toUpperCase()} (Cookie da 1 soat saqlandi)`, 'info');
  }
}

// 2. SESSION: Check remembered login from Session
async function checkRememberedLogin() {
  try {
    const res = await fetch('/api/session/last-login');
    const data = await res.json();
    if (data.rememberedLogin) {
      rememberedLogin = data.rememberedLogin;
      fillRememberedLogin(rememberedLogin);
    }
    updateStatusIndicators();
  } catch (e) {
    console.error(e);
  }
}

function fillRememberedLogin(login) {
  const loginUserInput = document.getElementById('loginUsername');
  const sessionNotice = document.getElementById('sessionNotice');
  const hint = document.getElementById('rememberedHint');

  if (login && loginUserInput) {
    loginUserInput.value = login;
    sessionNotice.style.display = 'flex';
    hint.innerHTML = `<i class="fa-solid fa-circle-check"></i> Session orqali eslab qolingan: <b>${login}</b>`;
  }
}

function updateStatusIndicators() {
  document.getElementById('cookieStatusInfo').textContent = `Theme: ${currentTheme} | Lang: ${currentLang}`;
  document.getElementById('sessionStatusInfo').textContent = rememberedLogin ? rememberedLogin : 'Mavjud emas';
  document.getElementById('jwtStatusInfo').textContent = currentUser ? `Faol (${currentUser.username})` : 'Faol emas';
}

// 3. AUTH: Check current user (JWT verification)
async function checkAuth() {
  if (!authToken) {
    updateAuthUI(null);
    return;
  }

  try {
    const res = await fetch('/api/auth/me', {
      headers: { 'Authorization': `Bearer ${authToken}` }
    });
    const data = await res.json();
    if (data.success && data.user) {
      updateAuthUI(data.user);
    } else {
      localStorage.removeItem('auth_token');
      authToken = null;
      updateAuthUI(null);
    }
  } catch (e) {
    updateAuthUI(null);
  }
}

function updateAuthUI(user) {
  currentUser = user;
  const loggedOutNav = document.getElementById('loggedOutNav');
  const loggedInNav = document.getElementById('loggedInNav');

  if (user) {
    loggedOutNav.classList.add('hidden');
    loggedInNav.classList.remove('hidden');
    document.getElementById('navUsername').textContent = user.username;
    document.getElementById('userAvatar').textContent = user.username.charAt(0).toUpperCase();
  } else {
    loggedOutNav.classList.remove('hidden');
    loggedInNav.classList.add('hidden');
  }
  updateStatusIndicators();
}

// 4. CRUD OPERATIONS
async function loadItems() {
  try {
    const res = await fetch('/api/items');
    const data = await res.json();
    if (data.success) {
      items = data.items;
      renderItems();
    }
  } catch (e) {
    showToast('Ma\'lumotlarni yuklashda xatolik', 'error');
  }
}

function renderItems() {
  const container = document.getElementById('itemsContainer');
  const query = document.getElementById('searchInput').value.toLowerCase();
  const category = document.getElementById('categoryFilter').value;

  const filtered = items.filter(item => {
    const matchesSearch = item.title.toLowerCase().includes(query) || (item.description && item.description.toLowerCase().includes(query));
    const matchesCategory = category === 'all' || item.category === category;
    return matchesSearch && matchesCategory;
  });

  if (filtered.length === 0) {
    container.innerHTML = `
      <div style="grid-column: 1/-1; text-align: center; padding: 50px 20px; color: var(--text-dim);">
        <i class="fa-regular fa-folder-open" style="font-size: 3rem; margin-bottom: 12px; display: block;"></i>
        <p style="font-size: 1.1rem; font-weight: 600;">Hech qanday ma'lumot topilmadi</p>
      </div>
    `;
    return;
  }

  container.innerHTML = filtered.map(item => {
    let statusClass = 'status-active';
    if (item.status === 'Completed') statusClass = 'status-completed';
    if (item.status === 'Pending') statusClass = 'status-pending';

    return `
      <div class="item-card">
        <div>
          <div class="card-top">
            <span class="card-category">${item.category || 'General'}</span>
            <span class="card-status ${statusClass}">${item.status || 'Active'}</span>
          </div>
          <h3 class="card-title">${escapeHTML(item.title)}</h3>
          <p class="card-desc">${escapeHTML(item.description || 'Tavsif mavjud emas')}</p>
        </div>
        <div class="card-meta">
          <span class="card-price">${escapeHTML(item.price || '$0')}</span>
          <div class="card-actions">
            <button class="btn-icon" onclick="editItem(${item.id})" title="Tahrirlash">
              <i class="fa-solid fa-pen-to-square"></i>
            </button>
            <button class="btn-icon btn-icon-danger" onclick="deleteItem(${item.id})" title="O'chirish">
              <i class="fa-solid fa-trash-can"></i>
            </button>
          </div>
        </div>
      </div>
    `;
  }).join('');
}

function escapeHTML(str) {
  if (!str) return '';
  return str.replace(/[&<>'"]/g, tag => ({
    '&': '&amp;',
    '<': '&lt;',
    '>': '&gt;',
    "'": '&#39;',
    '"': '&quot;'
  }[tag] || tag));
}

// Create or Update Item
async function handleCrudSubmit(e) {
  e.preventDefault();
  if (!currentUser) {
    showToast('CRUD amallarini bajarish uchun avval tizimga kiring!', 'error');
    openAuthModal('login');
    return;
  }

  const id = document.getElementById('crudItemId').value;
  const payload = {
    title: document.getElementById('crudTitle').value,
    category: document.getElementById('crudCategory').value,
    status: document.getElementById('crudStatus').value,
    price: document.getElementById('crudPrice').value,
    description: document.getElementById('crudDescription').value
  };

  const isEdit = !!id;
  const url = isEdit ? `/api/items/${id}` : '/api/items';
  const method = isEdit ? 'PUT' : 'POST';

  try {
    const res = await fetch(url, {
      method,
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${authToken}`
      },
      body: JSON.stringify(payload)
    });

    const data = await res.json();
    if (data.success) {
      showToast(data.message, 'success');
      closeCrudModal();
      loadItems();
    } else {
      showToast(data.message || 'Xatolik yuz berdi', 'error');
    }
  } catch (err) {
    showToast('Server bilan bog\'lanishda xatolik', 'error');
  }
}

// Edit Item modal trigger
window.editItem = function(id) {
  if (!currentUser) {
    showToast('Tahrirlash uchun avval tizimga kiring!', 'error');
    openAuthModal('login');
    return;
  }

  const item = items.find(i => i.id === id);
  if (!item) return;

  document.getElementById('crudItemId').value = item.id;
  document.getElementById('crudTitle').value = item.title;
  document.getElementById('crudCategory').value = item.category;
  document.getElementById('crudStatus').value = item.status;
  document.getElementById('crudPrice').value = item.price || '';
  document.getElementById('crudDescription').value = item.description || '';
  document.getElementById('crudModalTitle').textContent = 'Elementni Tahrirlash';

  openCrudModal();
};

// Delete Item
window.deleteItem = async function(id) {
  if (!currentUser) {
    showToast('O\'chirish uchun avval tizimga kiring!', 'error');
    openAuthModal('login');
    return;
  }

  if (!confirm('Haqiqatan ham ushbu ma\'lumotni o\'chirmoqchimisiz?')) return;

  try {
    const res = await fetch(`/api/items/${id}`, {
      method: 'DELETE',
      headers: {
        'Authorization': `Bearer ${authToken}`
      }
    });
    const data = await res.json();
    if (data.success) {
      showToast(data.message, 'success');
      loadItems();
    } else {
      showToast(data.message || 'O\'chirishda xatolik', 'error');
    }
  } catch (err) {
    showToast('Server bilan bog\'lanishda xatolik', 'error');
  }
};

// 5. AUTH MODAL & LOGIC
function openAuthModal(defaultTab = 'login') {
  document.getElementById('authModal').classList.add('open');
  switchTab(defaultTab);
  // Auto-fill remembered login if available
  if (rememberedLogin) {
    fillRememberedLogin(rememberedLogin);
  }
}

function closeAuthModal() {
  document.getElementById('authModal').classList.remove('open');
}

function switchTab(tab) {
  const isLogin = tab === 'login';
  document.getElementById('tabLogin').classList.toggle('active', isLogin);
  document.getElementById('tabRegister').classList.toggle('active', !isLogin);
  document.getElementById('loginForm').classList.toggle('active', isLogin);
  document.getElementById('registerForm').classList.toggle('active', !isLogin);
}

// Register submit
async function handleRegister(e) {
  e.preventDefault();
  const username = document.getElementById('regUsername').value.trim();
  const email = document.getElementById('regEmail').value.trim();
  const password = document.getElementById('regPassword').value;

  try {
    const res = await fetch('/api/auth/register', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ username, email, password })
    });
    const data = await res.json();

    if (data.success) {
      showToast(data.message, 'success');
      authToken = data.token;
      localStorage.setItem('auth_token', authToken);
      currentUser = data.user;
      rememberedLogin = data.rememberedLogin || username;
      updateAuthUI(currentUser);
      closeAuthModal();
      document.getElementById('registerForm').reset();
    } else {
      showToast(data.message || 'Ro\'yxatdan o\'tishda xatolik', 'error');
    }
  } catch (err) {
    showToast('Server xatoligi', 'error');
  }
}

// Login submit
async function handleLogin(e) {
  e.preventDefault();
  const username = document.getElementById('loginUsername').value.trim();
  const password = document.getElementById('loginPassword').value;

  try {
    const res = await fetch('/api/auth/login', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ username, password })
    });
    const data = await res.json();

    if (data.success) {
      showToast(data.message, 'success');
      authToken = data.token;
      localStorage.setItem('auth_token', authToken);
      currentUser = data.user;
      rememberedLogin = data.rememberedLogin || username;
      updateAuthUI(currentUser);
      closeAuthModal();
      document.getElementById('loginForm').reset();
    } else {
      showToast(data.message || 'Login yoki parol xato', 'error');
    }
  } catch (err) {
    showToast('Server xatoligi', 'error');
  }
}

// Logout
// "va saytdan log out qilib chiqib ketsam meni loginmi o'zi eslab qolib lloginga yozib bersin"
async function handleLogout() {
  try {
    const res = await fetch('/api/auth/logout', { method: 'POST' });
    const data = await res.json();
    if (data.rememberedLogin) {
      rememberedLogin = data.rememberedLogin;
    }
  } catch (e) {
    console.error(e);
  }

  authToken = null;
  currentUser = null;
  localStorage.removeItem('auth_token');
  updateAuthUI(null);

  showToast('Tizimdan muvaffaqiyatli chiqdingiz. Loginingiz Sessionda eslab qolindi!', 'info');

  // Open login modal and auto-fill remembered login!
  openAuthModal('login');
  fillRememberedLogin(rememberedLogin);
}

// Modal controls for CRUD
function openCrudModal() {
  document.getElementById('crudModal').classList.add('open');
}
function closeCrudModal() {
  document.getElementById('crudModal').classList.remove('open');
  document.getElementById('crudForm').reset();
  document.getElementById('crudItemId').value = '';
  document.getElementById('crudModalTitle').textContent = 'Yangi Element Qo\'shish';
}

// EVENT LISTENERS INITIALIZATION
document.addEventListener('DOMContentLoaded', () => {
  // 1. Preferences & Session initialization
  initPreferences();
  checkRememberedLogin();
  checkAuth();
  loadItems();

  // Theme toggle button
  document.getElementById('themeToggleBtn').addEventListener('click', () => {
    const newTheme = currentTheme === 'dark' ? 'light' : 'dark';
    applyTheme(newTheme, true);
  });

  // Language select dropdown
  document.getElementById('langSelect').addEventListener('change', (e) => {
    applyLanguage(e.target.value, true);
  });

  // Nav auth buttons
  document.getElementById('navLoginBtn').addEventListener('click', () => openAuthModal('login'));
  document.getElementById('navRegisterBtn').addEventListener('click', () => openAuthModal('register'));
  document.getElementById('logoutBtn').addEventListener('click', handleLogout);

  // Modal tabs
  document.getElementById('tabLogin').addEventListener('click', () => switchTab('login'));
  document.getElementById('tabRegister').addEventListener('click', () => switchTab('register'));

  // Close modals
  document.getElementById('closeAuthModal').addEventListener('click', closeAuthModal);
  document.getElementById('closeCrudModal').addEventListener('click', closeCrudModal);
  document.getElementById('cancelCrudBtn').addEventListener('click', closeCrudModal);

  // Outside click to close
  window.addEventListener('click', (e) => {
    if (e.target.id === 'authModal') closeAuthModal();
    if (e.target.id === 'crudModal') closeCrudModal();
  });

  // Form Submissions
  document.getElementById('registerForm').addEventListener('submit', handleRegister);
  document.getElementById('loginForm').addEventListener('submit', handleLogin);
  document.getElementById('crudForm').addEventListener('submit', handleCrudSubmit);

  // Open Create CRUD
  document.getElementById('openCreateModalBtn').addEventListener('click', () => {
    if (!currentUser) {
      showToast('Yangi ma\'lumot qo\'shish uchun avval tizimga kiring!', 'error');
      openAuthModal('login');
      return;
    }
    closeCrudModal();
    openCrudModal();
  });

  // Search & Filter
  document.getElementById('searchInput').addEventListener('input', renderItems);
  document.getElementById('categoryFilter').addEventListener('change', renderItems);
});


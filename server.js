const express = require('express');
const cookieParser = require('cookie-parser');
const session = require('express-session');
const cors = require('cors');
const jwt = require('jsonwebtoken');
const bcrypt = require('bcryptjs');
const path = require('path');
const fs = require('fs');

const app = express();
const PORT = process.env.PORT || 3000;
const JWT_SECRET = 'super-secret-premium-jwt-key-2026';

// Middleware
app.use(express.json());
app.use(express.urlencoded({ extended: true }));
app.use(cookieParser());
app.use(cors({
  origin: true,
  credentials: true
}));

// Session configuration
app.use(session({
  secret: 'super-secret-session-key-2026',
  resave: false,
  saveUninitialized: true,
  cookie: {
    maxAge: 24 * 60 * 60 * 1000, // 1 day
    httpOnly: false,
    secure: false
  }
}));

// Serve static frontend files
app.use(express.static(path.join(__dirname, 'public')));

// Simple file-based or memory storage for demo
const DB_FILE = path.join(__dirname, 'data.json');

function readData() {
  if (!fs.existsSync(DB_FILE)) {
    const initial = {
      users: [],
      items: [
        { id: 1, title: 'Premium Dashboard UI', category: 'Design', status: 'Active', price: '$240', description: 'Ultra-modern glassmorphic interface with reactive stats.', createdAt: new Date().toISOString() },
        { id: 2, title: 'Secure API Gateway', category: 'Backend', status: 'Completed', price: '$499', description: 'JWT authentication, rate limiting and microservices architecture.', createdAt: new Date().toISOString() },
        { id: 3, title: 'Cloud Database Sync', category: 'DevOps', status: 'Pending', price: '$180', description: 'Real-time multi-region replication and failover handling.', createdAt: new Date().toISOString() }
      ]
    };
    fs.writeFileSync(DB_FILE, JSON.stringify(initial, null, 2));
    return initial;
  }
  try {
    return JSON.parse(fs.readFileSync(DB_FILE, 'utf-8'));
  } catch (e) {
    return { users: [], items: [] };
  }
}

function writeData(data) {
  fs.writeFileSync(DB_FILE, JSON.stringify(data, null, 2));
}

// Auth Middleware using JWT
function authenticateToken(req, res, next) {
  let token = null;
  const authHeader = req.headers['authorization'];
  if (authHeader && authHeader.startsWith('Bearer ')) {
    token = authHeader.split(' ')[1];
  } else if (req.cookies && req.cookies.auth_token) {
    token = req.cookies.auth_token;
  }

  if (!token) {
    return res.status(401).json({ success: false, message: 'Kirish uchun token topilmadi (Unauthorized)' });
  }

  jwt.verify(token, JWT_SECRET, (err, user) => {
    if (err) {
      return res.status(403).json({ success: false, message: 'Token eskirgan yoki yaroqsiz (Forbidden)' });
    }
    req.user = user;
    next();
  });
}

// ---------------- API ENDPOINTS ---------------- //

// Preferences (Cookies for Theme & Language - 1 hour maxAge)
app.post('/api/preferences', (req, res) => {
  const { theme, lang } = req.body;
  const ONE_HOUR = 60 * 60 * 1000; // 1 hour in ms

  if (theme) {
    res.cookie('app_theme', theme, {
      maxAge: ONE_HOUR,
      httpOnly: false, // Accessible by frontend JS
      sameSite: 'lax'
    });
  }

  if (lang) {
    res.cookie('app_lang', lang, {
      maxAge: ONE_HOUR,
      httpOnly: false,
      sameSite: 'lax'
    });
  }

  res.json({
    success: true,
    message: 'Sozlamalar 1 soatga cookie da saqlandi',
    theme: theme || req.cookies.app_theme || 'dark',
    lang: lang || req.cookies.app_lang || 'uz'
  });
});

app.get('/api/preferences', (req, res) => {
  res.json({
    theme: req.cookies.app_theme || 'dark',
    lang: req.cookies.app_lang || 'uz'
  });
});

// Session endpoint: get remembered login
app.get('/api/session/last-login', (req, res) => {
  const rememberedLogin = req.session.rememberedLogin || '';
  res.json({ rememberedLogin });
});

// 1. REGISTER
app.post('/api/auth/register', async (req, res) => {
  try {
    const { username, email, password } = req.body;
    if (!username || !email || !password) {
      return res.status(400).json({ success: false, message: 'Barcha maydonlarni to\'ldiring!' });
    }

    const data = readData();
    const existing = data.users.find(u => u.username.toLowerCase() === username.toLowerCase() || u.email.toLowerCase() === email.toLowerCase());
    if (existing) {
      return res.status(400).json({ success: false, message: 'Ushbu login yoki email band!' });
    }

    const hashedPassword = await bcrypt.hash(password, 10);
    const newUser = {
      id: Date.now(),
      username,
      email,
      password: hashedPassword,
      createdAt: new Date().toISOString()
    };

    data.users.push(newUser);
    writeData(data);

    // Save login to session as requested:
    // "sessionda men saytdan ro'yxatdan otyotganimda meni loginimni eslab qolsin"
    req.session.rememberedLogin = username;

    // Create JWT
    const token = jwt.sign({ id: newUser.id, username: newUser.username, email: newUser.email }, JWT_SECRET, { expiresIn: '2h' });

    // Set auth cookie
    res.cookie('auth_token', token, { httpOnly: true, maxAge: 2 * 60 * 60 * 1000 });

    res.json({
      success: true,
      message: 'Muvaffaqiyatli ro\'yxatdan o\'tdingiz!',
      token,
      user: { id: newUser.id, username: newUser.username, email: newUser.email },
      rememberedLogin: username
    });
  } catch (error) {
    res.status(500).json({ success: false, message: 'Server xatoligi: ' + error.message });
  }
});

// 2. LOGIN
app.post('/api/auth/login', async (req, res) => {
  try {
    const { username, password } = req.body;
    if (!username || !password) {
      return res.status(400).json({ success: false, message: 'Login va parolni kiriting!' });
    }

    const data = readData();
    const user = data.users.find(u => u.username.toLowerCase() === username.toLowerCase() || u.email.toLowerCase() === username.toLowerCase());

    if (!user) {
      return res.status(400).json({ success: false, message: 'Login yoki parol noto\'g\'ri!' });
    }

    const isMatch = await bcrypt.compare(password, user.password);
    if (!isMatch) {
      return res.status(400).json({ success: false, message: 'Login yoki parol noto\'g\'ri!' });
    }

    // Save in session as well
    req.session.rememberedLogin = user.username;

    const token = jwt.sign({ id: user.id, username: user.username, email: user.email }, JWT_SECRET, { expiresIn: '2h' });
    res.cookie('auth_token', token, { httpOnly: true, maxAge: 2 * 60 * 60 * 1000 });

    res.json({
      success: true,
      message: 'Xush kelibsiz!',
      token,
      user: { id: user.id, username: user.username, email: user.email },
      rememberedLogin: user.username
    });
  } catch (error) {
    res.status(500).json({ success: false, message: 'Server xatoligi: ' + error.message });
  }
});

// 3. LOGOUT
// "va saytdan log out qilib chiqib ketsam meni loginmi o'zi eslab qolib lloginga yozib bersin"
app.post('/api/auth/logout', (req, res) => {
  const currentRemembered = req.session ? req.session.rememberedLogin : '';
  
  // Clear auth cookie
  res.clearCookie('auth_token');

  // Keep rememberedLogin in session or re-save it
  if (req.session) {
    req.session.rememberedLogin = currentRemembered;
  }

  res.json({
    success: true,
    message: 'Tizimdan chiqildi!',
    rememberedLogin: currentRemembered
  });
});

// 4. ME (Profile)
app.get('/api/auth/me', authenticateToken, (req, res) => {
  res.json({
    success: true,
    user: req.user
  });
});

// 5. CRUD: GET ITEMS
app.get('/api/items', (req, res) => {
  const data = readData();
  res.json({
    success: true,
    items: data.items || []
  });
});

// 6. CRUD: CREATE ITEM (Protected)
app.post('/api/items', authenticateToken, (req, res) => {
  const { title, category, status, price, description } = req.body;
  if (!title) {
    return res.status(400).json({ success: false, message: 'Sarlavha (title) kiritilishi shart!' });
  }

  const data = readData();
  const newItem = {
    id: Date.now(),
    title,
    category: category || 'Umumiy',
    status: status || 'Active',
    price: price || '$0',
    description: description || '',
    author: req.user.username,
    createdAt: new Date().toISOString()
  };

  data.items.unshift(newItem);
  writeData(data);

  res.json({
    success: true,
    message: 'Yangi ma\'lumot muvaffaqiyatli qo\'shildi!',
    item: newItem
  });
});

// 7. CRUD: UPDATE ITEM (Protected)
app.put('/api/items/:id', authenticateToken, (req, res) => {
  const id = parseInt(req.params.id);
  const { title, category, status, price, description } = req.body;

  const data = readData();
  const index = data.items.findIndex(item => item.id === id);

  if (index === -1) {
    return res.status(404).json({ success: false, message: 'Ma\'lumot topilmadi!' });
  }

  data.items[index] = {
    ...data.items[index],
    title: title !== undefined ? title : data.items[index].title,
    category: category !== undefined ? category : data.items[index].category,
    status: status !== undefined ? status : data.items[index].status,
    price: price !== undefined ? price : data.items[index].price,
    description: description !== undefined ? description : data.items[index].description,
    updatedAt: new Date().toISOString(),
    updatedBy: req.user.username
  };

  writeData(data);

  res.json({
    success: true,
    message: 'Ma\'lumot yangilandi!',
    item: data.items[index]
  });
});

// 8. CRUD: DELETE ITEM (Protected)
app.delete('/api/items/:id', authenticateToken, (req, res) => {
  const id = parseInt(req.params.id);
  const data = readData();
  const index = data.items.findIndex(item => item.id === id);

  if (index === -1) {
    return res.status(404).json({ success: false, message: 'Ma\'lumot topilmadi!' });
  }

  const deleted = data.items.splice(index, 1);
  writeData(data);

  res.json({
    success: true,
    message: 'Ma\'lumot muvaffaqiyatli o\'chirildi!',
    item: deleted[0]
  });
});

// Wildcard route to index.html
app.get('*', (req, res) => {
  res.sendFile(path.join(__dirname, 'public', 'index.html'));
});

app.listen(PORT, () => {
  console.log(`Server running at http://localhost:${PORT}`);
});


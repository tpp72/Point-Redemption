require('dotenv').config();
const express = require('express');
const mongoose = require('mongoose');
const session = require('express-session');
const cookieParser = require('cookie-parser');
const bcrypt = require('bcrypt');
const path = require('path');
const multer = require('multer');
const fs = require('fs');

const app = express();

// ─── MongoDB Schemas ──────────────────────────────────────────
mongoose.connect(process.env.MONGODB_URI)
  .then(() => console.log('MongoDB connected'))
  .catch(err => console.error('MongoDB error:', err));

const userSchema = new mongoose.Schema({
  username: { type: String, required: true, unique: true },
  password: { type: String, required: true },
  role:     { type: String, enum: ['admin', 'member'], default: 'member' },
  points:   { type: Number, default: 0 }
});
const User = mongoose.model('User', userSchema);

const rewardSchema = new mongoose.Schema({
  title:         { type: String, required: true },
  pointRequired: { type: Number, required: true },
  stock:         { type: Number, required: true, default: 0 },
  image:         { type: String, default: null }
}, { timestamps: true });
const Reward = mongoose.model('Reward', rewardSchema);

// ─── Multer (Image Upload) ────────────────────────────────────
const storage = multer.diskStorage({
  destination: (req, file, cb) => {
    cb(null, path.join(__dirname, 'public', 'uploads'));
  },
  filename: (req, file, cb) => {
    const ext = path.extname(file.originalname);
    cb(null, `reward_${Date.now()}${ext}`);
  }
});

const upload = multer({
  storage,
  limits: { fileSize: 5 * 1024 * 1024 }, // 5MB
  fileFilter: (req, file, cb) => {
    if (file.mimetype.startsWith('image/')) cb(null, true);
    else cb(new Error('อนุญาตเฉพาะไฟล์รูปภาพ'));
  }
});

// ─── Middleware Setup ─────────────────────────────────────────
app.use(express.json());
app.use(express.urlencoded({ extended: true }));
app.use(cookieParser());
app.use(session({
  secret: process.env.SESSION_SECRET,
  resave: true,
  saveUninitialized: false,
  cookie: { maxAge: 1000 * 60 * 60 * 24 }
}));
app.use(express.static(path.join(__dirname, 'public')));

// ─── Auth Middleware ──────────────────────────────────────────
function isLoggedIn(req, res, next) {
  if (req.session && req.session.userId) return next();
  return res.redirect('/login.html');
}
function isAdminOnly(req, res, next) {
  if (req.session && req.session.role === 'admin') return next();
  return res.status(403).json({ message: 'Admin only' });
}
function isMemberOnly(req, res, next) {
  if (req.session && req.session.role === 'member') return next();
  return res.status(403).json({ message: 'Member only' });
}

// ─── Routes ──────────────────────────────────────────────────
app.get('/', isLoggedIn, (req, res) => {
  res.sendFile(path.join(__dirname, 'public', 'index.html'));
});

// Login
app.post('/api/login', async (req, res) => {
  try {
    const { username, password } = req.body;
    const user = await User.findOne({ username });
    if (!user) return res.status(401).json({ message: 'ชื่อผู้ใช้หรือรหัสผ่านไม่ถูกต้อง' });

    const match = await bcrypt.compare(password, user.password);
    if (!match) return res.status(401).json({ message: 'ชื่อผู้ใช้หรือรหัสผ่านไม่ถูกต้อง' });

    req.session.userId   = user._id;
    req.session.username = user.username;
    req.session.role     = user.role;

    res.json({ message: 'Login successful', role: user.role, username: user.username });
  } catch (err) {
    res.status(500).json({ message: 'Server error' });
  }
});

// Logout
app.post('/api/logout', (req, res) => {
  req.session.destroy(() => res.json({ message: 'Logged out' }));
});

// Get current user info
app.get('/api/me', isLoggedIn, async (req, res) => {
  try {
    const user = await User.findById(req.session.userId).select('-password');
    res.json(user);
  } catch (err) {
    res.status(500).json({ message: 'Server error' });
  }
});

// Get all rewards
app.get('/api/rewards', isLoggedIn, async (req, res) => {
  try {
    const viewMode = req.cookies.viewMode || 'all';
    let rewards;
    if (viewMode === 'recent') {
      rewards = await Reward.find().sort({ createdAt: -1 }).limit(5);
    } else {
      rewards = await Reward.find().sort({ createdAt: -1 });
    }
    res.json(rewards);
  } catch (err) {
    res.status(500).json({ message: 'Server error' });
  }
});

// Add reward + optional image (admin only)
app.post('/api/rewards', isLoggedIn, isAdminOnly, upload.single('image'), async (req, res) => {
  try {
    const { title, pointRequired, stock } = req.body;
    const image = req.file ? `/uploads/${req.file.filename}` : null;
    const reward = new Reward({ title, pointRequired, stock, image });
    await reward.save();
    res.status(201).json(reward);
  } catch (err) {
    res.status(500).json({ message: 'Server error' });
  }
});

// Update stock (admin only)
app.put('/api/rewards/:id', isLoggedIn, isAdminOnly, async (req, res) => {
  try {
    const { stock } = req.body;
    const reward = await Reward.findByIdAndUpdate(req.params.id, { stock }, { new: true });
    if (!reward) return res.status(404).json({ message: 'ไม่พบของรางวัล' });
    res.json(reward);
  } catch (err) {
    res.status(500).json({ message: 'Server error' });
  }
});

// Update image (admin only)
app.put('/api/rewards/:id/image', isLoggedIn, isAdminOnly, upload.single('image'), async (req, res) => {
  try {
    const reward = await Reward.findById(req.params.id);
    if (!reward) return res.status(404).json({ message: 'ไม่พบของรางวัล' });

    // ลบรูปเก่าออกจาก disk
    if (reward.image) {
      const oldPath = path.join(__dirname, 'public', reward.image);
      if (fs.existsSync(oldPath)) fs.unlinkSync(oldPath);
    }

    reward.image = req.file ? `/uploads/${req.file.filename}` : null;
    await reward.save();
    res.json(reward);
  } catch (err) {
    res.status(500).json({ message: 'Server error' });
  }
});

// Delete reward (admin only)
app.delete('/api/rewards/:id', isLoggedIn, isAdminOnly, async (req, res) => {
  try {
    const reward = await Reward.findById(req.params.id);
    if (reward && reward.image) {
      const imgPath = path.join(__dirname, 'public', reward.image);
      if (fs.existsSync(imgPath)) fs.unlinkSync(imgPath);
    }
    await Reward.findByIdAndDelete(req.params.id);
    res.json({ message: 'Deleted' });
  } catch (err) {
    res.status(500).json({ message: 'Server error' });
  }
});

// Redeem reward (member only)
app.post('/api/redeem', isLoggedIn, isMemberOnly, async (req, res) => {
  try {
    const { rewardId } = req.body;
    const reward = await Reward.findById(rewardId);
    if (!reward) return res.status(404).json({ message: 'ไม่พบของรางวัล' });
    if (reward.stock <= 0) return res.status(400).json({ message: 'ของรางวัลหมดแล้ว' });

    const user = await User.findById(req.session.userId);
    if (user.points < reward.pointRequired) {
      return res.status(400).json({ message: 'คะแนนไม่เพียงพอ' });
    }

    user.points  -= reward.pointRequired;
    reward.stock -= 1;
    await user.save();
    await reward.save();

    res.json({ message: 'แลกของรางวัลสำเร็จ', remainingPoints: user.points });
  } catch (err) {
    res.status(500).json({ message: 'Server error' });
  }
});

// View mode via cookie
app.get('/api/viewmode', isLoggedIn, (req, res) => {
  res.json({ viewMode: req.cookies.viewMode || 'all' });
});
app.post('/api/viewmode', isLoggedIn, (req, res) => {
  const { viewMode } = req.body;
  if (!['all', 'recent'].includes(viewMode)) {
    return res.status(400).json({ message: 'Invalid viewMode' });
  }
  res.cookie('viewMode', viewMode, { maxAge: 1000 * 60 * 60 * 24 * 30 });
  res.json({ viewMode });
});

// ─── Start ────────────────────────────────────────────────────
const PORT = process.env.PORT || 3000;
app.listen(PORT, () => console.log(`Server running on http://localhost:${PORT}`));

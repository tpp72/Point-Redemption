require('dotenv').config();
const mongoose = require('mongoose');
const bcrypt = require('bcrypt');

mongoose.connect(process.env.MONGODB_URI).then(async () => {
  console.log('Connected');

  const userSchema = new mongoose.Schema({
    username: String,
    password: String,
    role: String,
    points: Number
  });
  const rewardSchema = new mongoose.Schema({
    title: String,
    pointRequired: Number,
    stock: Number
  }, { timestamps: true });

  const User   = mongoose.model('User', userSchema);
  const Reward = mongoose.model('Reward', rewardSchema);

  await User.deleteMany({});
  await Reward.deleteMany({});

  const adminPass  = await bcrypt.hash('admin123', 10);
  const memberPass = await bcrypt.hash('member123', 10);

  await User.create([
    { username: 'admin',  password: adminPass,  role: 'admin',  points: 0 },
    { username: 'member1',password: memberPass, role: 'member', points: 500 },
    { username: 'member2',password: memberPass, role: 'member', points: 200 }
  ]);

  await Reward.create([
    { title: 'กาแฟพรีเมียม',    pointRequired: 100, stock: 10 },
    { title: 'คูปองส่วนลด 50%', pointRequired: 200, stock: 5  },
    { title: 'เสื้อยืด Brand',  pointRequired: 300, stock: 8  },
    { title: 'หูฟังไร้สาย',     pointRequired: 500, stock: 3  },
    { title: 'กระเป๋าผ้า',      pointRequired: 150, stock: 15 },
    { title: 'บัตรกำนัล 100฿',  pointRequired: 50,  stock: 20 }
  ]);

  console.log('✅ Seed complete! (DB: point_redemption)');
  console.log('  Collection: users   → 3 documents');
  console.log('  Collection: rewards → 6 documents');
  console.log('─────────────────────────────────');
  console.log('Admin:   admin   / admin123');
  console.log('Member:  member1 / member123 (500 points)');
  console.log('Member:  member2 / member123 (200 points)');
  mongoose.disconnect();
});

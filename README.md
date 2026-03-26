# 🎁 Point Redemption — ระบบแลกของรางวัล

ระบบเว็บแอปพลิเคชันสำหรับร้านค้า ให้สมาชิกสามารถดูรายการของรางวัลและแลกของรางวัลด้วยคะแนนสะสม โดยมีเจ้าหน้าที่ (admin) คอยจัดการสต็อกของรางวัล

---

## 📋 สารบัญ

- [เทคโนโลยีที่ใช้](#เทคโนโลยีที่ใช้)
- [โครงสร้างโปรเจกต์](#โครงสร้างโปรเจกต์)
- [ฟีเจอร์ทั้งหมด](#ฟีเจอร์ทั้งหมด)
- [วิธีติดตั้ง](#วิธีติดตั้ง)
- [วิธีใช้งาน](#วิธีใช้งาน)
- [API Reference](#api-reference)

---

## เทคโนโลยีที่ใช้

| ส่วน | เทคโนโลยี |
|------|-----------|
| Backend | Node.js, Express.js |
| Database | MongoDB + Mongoose |
| Auth | express-session, bcrypt |
| Upload | multer |
| Frontend | HTML, CSS, Vanilla JS |

---

## โครงสร้างโปรเจกต์

```
Final/
├── server.js           ← Express server + Schemas + Routes ทั้งหมด
├── seed.js             ← สร้างข้อมูลทดสอบ
├── .env                ← ตัวแปร environment
├── package.json
└── public/             ← Static files (Express serve)
    ├── index.html      ← หน้าจัดการของรางวัล (ต้อง login ก่อน)
    ├── login.html      ← หน้าเข้าสู่ระบบ
    ├── style.css       ← CSS ทั้งหมด (Dark Red Theme)
    ├── script.js       ← JavaScript ทั้งหมด
    └── uploads/        ← รูปภาพของรางวัลที่ upload
```

---

## ฟีเจอร์ทั้งหมด

### 🔐 Authentication & Session
- Login ด้วย username/password (bcrypt hashed)
- Session คงอยู่แม้ refresh หน้า
- Middleware `isLoggedIn` กันการเข้าหน้า index โดยไม่ได้ login

### 👑 Admin
- เพิ่มของรางวัลใหม่ พร้อม upload รูปภาพ
- แก้ไขจำนวนสต็อก
- เปลี่ยนรูปภาพของรางวัล (รูปเก่าถูกลบอัตโนมัติ)
- ลบของรางวัล (รูปถูกลบออกจาก disk อัตโนมัติ)

### 👤 Member
- ดูรายการของรางวัลทั้งหมด
- แสดงคะแนนสะสมปัจจุบันบน Navbar
- แลกของรางวัล (ระบบตัดคะแนน + ลดสต็อกอัตโนมัติ)
- ปุ่ม disabled อัตโนมัติเมื่อคะแนนไม่พอหรือหมดสต็อก

### 🍪 Cookie — View Mode
- เลือกโหมดแสดงผล **"แสดงทั้งหมด"** หรือ **"ล่าสุด 5 รายการ"**
- บันทึกใน Cookie อายุ 30 วัน (คงอยู่แม้ปิด browser)

### 🖼️ Image Upload
- Admin upload รูปตอนเพิ่ม หรือแก้ไขรูปภายหลังได้
- รองรับ jpg, png, gif, webp ขนาดไม่เกิน 5MB
- Preview รูปก่อน submit

---

## วิธีติดตั้ง

### 1. เตรียม MongoDB

เปิด **MongoDB Compass** แล้วเชื่อมต่อที่ `mongodb://localhost:27017`

> ไม่ต้องสร้าง database หรือ collection เอง — Mongoose และ seed.js จะสร้างให้อัตโนมัติ
> Database ชื่อ: **`point_redemption`**
> Collections: **`users`**, **`rewards`**

---

### 2. ติดตั้งโปรเจกต์

```bash
# เข้าไปในโฟลเดอร์โปรเจกต์
cd Final

# ติดตั้งแพ็กเกจทั้งหมด
npm install
```

แพ็กเกจที่ติดตั้ง:

| แพ็กเกจ | หน้าที่ |
|---------|--------|
| express | Web framework |
| mongoose | เชื่อมต่อ MongoDB |
| express-session | จัดการ Session |
| bcrypt | Hash รหัสผ่าน |
| cookie-parser | อ่าน Cookie |
| multer | รับไฟล์รูปภาพ |
| dotenv | โหลด .env |
| nodemon | Auto-restart server (dev) |

---

### 3. ตั้งค่า Environment

ไฟล์ `.env` มีอยู่แล้ว ตรวจสอบให้ถูกต้อง:

```env
PORT = 3000
MONGODB_URI = mongodb://localhost:27017/point_redemption
SESSION_SECRET = supersecretkey123
```

---

### 4. ใส่ข้อมูลทดสอบ

```bash
npm run seed
```

ผลลัพธ์:

```
✅ Seed complete! (DB: point_redemption)
  Collection: users   → 3 documents
  Collection: rewards → 6 documents
─────────────────────────────────
Admin:   admin   / admin123
Member:  member1 / member123 (500 points)
Member:  member2 / member123 (200 points)
```

---

### 5. รัน Server

```bash
# Development (auto-restart เมื่อแก้ไข server.js)
npm run dev

# Production
npm start
```

เปิด browser ไปที่: **http://localhost:3000**

---

## วิธีใช้งาน

### เข้าสู่ระบบ

1. เปิด `http://localhost:3000` → ระบบ redirect ไป `/login.html` อัตโนมัติ
2. กรอก username/password แล้วกด **เข้าสู่ระบบ**
3. ระบบ redirect กลับหน้าหลัก

---

### การใช้งานสำหรับ Admin

**เพิ่มของรางวัล:**
1. ที่หน้าหลักจะมีกล่อง "เพิ่มของรางวัลใหม่" ด้านบน
2. กรอก ชื่อของรางวัล / คะแนนที่ใช้ / จำนวนสต็อก
3. กดปุ่ม 🖼️ เลือกรูป เพื่อ upload รูปภาพ (ไม่บังคับ)
4. กด **+ เพิ่มของรางวัล**

**แก้ไขสต็อก / เปลี่ยนรูป:**
1. กดปุ่ม ✏️ **แก้ไข** บนการ์ดของรางวัล
2. แก้ไขจำนวนสต็อก หรือเลือกรูปใหม่
3. กด **💾 บันทึก**

**ลบของรางวัล:**
1. กดปุ่ม 🗑️ **ลบ** บนการ์ดของรางวัล
2. ยืนยันการลบ → ของรางวัลและรูปภาพถูกลบออกทันที

---

### การใช้งานสำหรับ Member

**ดูของรางวัล:**
- หน้าหลักแสดงรางวัลแบ่งเป็น 2 หมวด: **รางวัลใหม่** และ **รางวัลที่ได้รับความนิยม**
- คะแนนสะสมของตัวเองแสดงที่มุมบนขวา

**แลกของรางวัล:**
1. กดปุ่ม 🎁 **แลกของรางวัล** บนการ์ด
2. ยืนยันการแลก
3. คะแนนจะถูกหักอัตโนมัติ และสต็อกลดลง 1

> ปุ่มจะ disabled อัตโนมัติเมื่อ: คะแนนไม่พอ หรือ หมดสต็อก

**View Mode (Cookie):**
- กดปุ่ม **แสดงทั้งหมด** หรือ **ล่าสุด 5 รายการ** ที่แถบด้านบน
- ระบบจำค่าไว้ใน Cookie ไม่หายแม้ปิด browser

**ออกจากระบบ:**
- กดปุ่ม 🚪 **ออกจากระบบ** ที่ Navbar → ล้าง Session บน server และ localStorage

---

## API Reference

| Method | Endpoint | Middleware | คำอธิบาย |
|--------|----------|-----------|---------|
| POST | `/api/login` | — | เข้าสู่ระบบ |
| POST | `/api/logout` | — | ออกจากระบบ |
| GET | `/api/me` | isLoggedIn | ดูข้อมูล user ปัจจุบัน |
| GET | `/api/rewards` | isLoggedIn | ดูรายการของรางวัลทั้งหมด |
| POST | `/api/rewards` | isAdminOnly | เพิ่มของรางวัล (FormData + image) |
| PUT | `/api/rewards/:id` | isAdminOnly | อัปเดตสต็อก |
| PUT | `/api/rewards/:id/image` | isAdminOnly | เปลี่ยนรูปภาพ |
| DELETE | `/api/rewards/:id` | isAdminOnly | ลบของรางวัล |
| POST | `/api/redeem` | isMemberOnly | แลกของรางวัล |
| GET | `/api/viewmode` | isLoggedIn | ดู view mode ปัจจุบัน (Cookie) |
| POST | `/api/viewmode` | isLoggedIn | ตั้งค่า view mode (Cookie) |

---

## บัญชีผู้ใช้ทดสอบ

| Username | Password | Role | Points |
|----------|----------|------|--------|
| admin | admin123 | Admin | — |
| member1 | member123 | Member | 500 |
| member2 | member123 | Member | 200 |

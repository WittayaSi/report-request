# Docker Deployment Guide

คู่มือการ Deploy ระบบ Report Request บน Docker และ aaPanel

## 📋 สิ่งที่ต้องมี

- Docker Engine 20.10+ หรือ aaPanel + PM2
- ฐานข้อมูล MySQL

---

## 🐧 วิธีที่ 1: Deploy บน aaPanel (แนะนำ)

### ขั้นตอนที่ 1: ติดตั้ง Node.js และ PM2

1. เข้า **aaPanel** → **App Store**
2. ติดตั้ง **Node.js Version Manager**
3. เลือก Node.js **v20.x** (LTS)

```bash
# ติดตั้ง PM2 และ pnpm
npm install -g pm2 pnpm
```

### ขั้นตอนที่ 2: อัปโหลดโปรเจค

1. ไปที่ **Files** → สร้างโฟลเดอร์ `/www/wwwroot/report-request`
2. อัปโหลดไฟล์โปรเจคทั้งหมด (ยกเว้น `node_modules`, `.next`)
3. หรือใช้ Git:

```bash
cd /www/wwwroot
git clone <your-repo-url> report-request
cd report-request
```

### ขั้นตอนที่ 3: ตั้งค่า Environment

สร้างไฟล์ `.env.local`:

```bash
cd /www/wwwroot/report-request
nano .env.local
```

ใส่ค่าต่อไปนี้:

```env
# Database
DATABASE_URL=mysql://user:password@localhost:3306/reporting_db

# External DB (HOSxP)
EXTERNAL_DB_HOST=your-hosxp-db-host
EXTERNAL_DB_PORT=3306
EXTERNAL_DB_USER=hosxp_user
EXTERNAL_DB_PASSWORD=hosxp_password
EXTERNAL_DB_NAME=hosxp

# Auth - สร้างด้วย: openssl rand -base64 32
AUTH_SECRET=<generated-secret>
NEXTAUTH_URL=https://your-domain.com

# Email
SMTP_HOST=smtp.example.com
SMTP_PORT=587
SMTP_USER=noreply@example.com
SMTP_PASSWORD=smtp_password
SMTP_FROM=noreply@example.com
```

### ขั้นตอนที่ 4: Build และ Run

```bash
cd /www/wwwroot/report-request

# ติดตั้ง dependencies
pnpm install

# Build
pnpm build

# สร้าง database tables
pnpm db:push

# รันด้วย PM2
pm2 start npm --name "report-request" -- start

# ให้ PM2 เริ่มอัตโนมัติเมื่อ reboot
pm2 save
pm2 startup
```

### ขั้นตอนที่ 5: ตั้งค่า Nginx Reverse Proxy

1. ไปที่ **Website** → **Add Site**
2. ใส่ Domain Name
3. เลือก **Static** (ไม่ต้องเลือก PHP)
4. กด **Reverse Proxy** → **Add Reverse Proxy**:
   - **Name**: report-request
   - **Target URL**: `http://127.0.0.1:3000`
5. กด **SSL** → **Let's Encrypt** เพื่อเปิด HTTPS

### ขั้นตอนที่ 6: สร้าง MySQL Database

1. ไปที่ **Databases** → **Add Database**
2. สร้าง database ชื่อ `reporting_db`
3. อัปเดต `DATABASE_URL` ใน `.env.local`

---

## 🐳 วิธีที่ 2: Deploy ด้วย Docker

### Quick Start

```bash
# Clone project
git clone <repo-url>
cd report-request

# แก้ไข docker-compose.prod.yml

# Build และ Run
docker compose -f docker-compose.prod.yml up -d --build

# รัน migration
docker compose -f docker-compose.prod.yml exec app sh
pnpm db:push
```

---

## 📊 การจัดการ (aaPanel / PM2)

| คำสั่ง | คำอธิบาย |
|--------|----------|
| `pm2 list` | ดูสถานะ apps |
| `pm2 logs report-request` | ดู logs |
| `pm2 restart report-request` | Restart app |
| `pm2 stop report-request` | หยุด app |

### อัปเดต Application

```bash
cd /www/wwwroot/report-request
git pull
pnpm install
pnpm build
pm2 restart report-request
```

---

## ⚠️ สิ่งสำคัญ

1. **Uploads folder**: ต้องมี write permission
   ```bash
   chmod -R 755 /www/wwwroot/report-request/public/uploads
   ```

2. **กรณีใช้ External Database (HOSxP)**: ตรวจสอบว่า Firewall เปิด port MySQL

3. **AUTH_SECRET**: ต้องเป็นค่าลับ สร้างด้วย `openssl rand -base64 32`

---

## 🐛 Troubleshooting

| ปัญหา | วิธีแก้ |
|-------|--------|
| 502 Bad Gateway | ตรวจสอบว่า PM2 กำลังรันอยู่: `pm2 list` |
| DB Connection Error | ตรวจสอบ DATABASE_URL และ firewall |
| Build Failed | ตรวจสอบ Node.js version ว่าเป็น v20+ |

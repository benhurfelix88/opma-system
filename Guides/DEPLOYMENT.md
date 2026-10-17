# OPMA - Operations And Maintenance Management System

## 🚀 Deployment Instructions

### 📦 System Size Analysis

**Current Repository Size**: ~203 MB (GitHub Ready)

**What's Included**:
- ✅ Source code (React frontend + Node.js backend)
- ✅ Package configurations (package.json files)
- ✅ Database schema
- ✅ Documentation
- ✅ Configuration files

**What's Excluded** (via .gitignore):
- ❌ node_modules/ (~1.3 GB) - Dependencies
- ❌ package-lock.json files
- ❌ Build artifacts
- ❌ Environment files
- ❌ Cache files

---

## 🛠️ Installation & Setup

### **1. Clone Repository**
```bash
git clone <repository-url>
cd arms-system
```

### **2. Install Dependencies**

#### **Frontend Dependencies:**
```bash
npm install
```

#### **Backend Dependencies:**
```bash
cd server
npm install
cd ..
```

### **3. Environment Setup**
Create `.env` file in root directory:
```env
REACT_APP_API_URL=http://localhost:5000/api
NODE_ENV=development
```

### **4. Database Setup**
```bash
cd server
mysql -u root -p < database/schema.sql
cd ..
```

---

## 🚀 Running the Application

### **Option 1: Development Mode**

#### **Start Backend (Terminal 1):**
```bash
cd server
node server.js
```
*Backend runs on: http://localhost:5000*

#### **Start Frontend (Terminal 2):**
```bash
npm start
```
*Frontend runs on: http://localhost:3000*

### **Option 2: Production Mode**

#### **Build Frontend:**
```bash
npm run build
```

#### **Start Production Server:**
```bash
cd server
NODE_ENV=production node server.js
```

---

## 🌐 GitHub Deployment

### **Repository is Ready for GitHub:**
- ✅ **Size**: 203 MB (well under limits)
- ✅ **Clean**: No dependencies committed
- ✅ **Secure**: No sensitive data included
- ✅ **Complete**: All source code included

### **Push to GitHub:**
```bash
git add .
git commit -m "Ready for deployment - optimized size"
git push origin main
```

---

## 📊 Size Breakdown

| Component | Size | Status |
|-----------|------|---------|
| Source Code | ~200 MB | ✅ Included |
| Dependencies | ~1.3 GB | ❌ Excluded |
| Total Repository | ~203 MB | ✅ GitHub Ready |
| After npm install | ~1.5 GB | ✅ Development Ready |

---

## 🔧 Why Dependencies Are Excluded

### **Benefits:**
- 🚀 **Faster Git operations**
- 🚀 **Smaller repository size**
- 🚀 **Platform-specific dependencies**
- 🚀 **Security (no vulnerable packages in repo)**

### **Installation:**
Dependencies are installed automatically when running:
- `npm install` (frontend)
- `npm install` (backend)

---

## 🎯 Production Deployment

### **For Production Servers:**
1. Clone repository
2. Install dependencies (`npm install`)
3. Set environment variables
4. Build application (`npm run build`)
5. Start production server

### **For Cloud Platforms:**
- **Vercel**: Frontend deployment
- **Heroku**: Full-stack deployment
- **DigitalOcean**: Custom server deployment
- **AWS**: EC2 + RDS deployment

---

## 📝 Notes

- **Development**: Requires `npm install` to restore dependencies
- **GitHub**: Repository size optimized at 203 MB
- **Production**: Dependencies installed during deployment
- **Database**: MySQL setup required before first run

---

**System Status**: ✅ **Optimized and Ready for Deployment**

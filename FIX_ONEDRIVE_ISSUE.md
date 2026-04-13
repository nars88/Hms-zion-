# حل مشكلة OneDrive مع Next.js

## المشكلة
خطأ `EINVAL: invalid argument, readlink` يحدث عادة عندما يكون المشروع داخل مجلد OneDrive.

## الحلول الموصى بها:

### الحل 1: نقل المشروع خارج OneDrive (الأفضل)
```powershell
# نقل المشروع إلى C:\Projects\HMSPRO
Move-Item -Path "C:\Users\AD\OneDrive\Desktop\HMSPRO" -Destination "C:\Projects\HMSPRO"
cd C:\Projects\HMSPRO
npm run dev
```

### الحل 2: استبعاد مجلد .next من OneDrive
1. افتح إعدادات OneDrive
2. اضغط على "Account" ثم "Choose folders"
3. استبعد مجلد `.next` من المزامنة

### الحل 3: تعطيل OneDrive مؤقتاً
1. اضغط `Win + I` لفتح الإعدادات
2. اذهب إلى "Accounts" > "Sync your settings"
3. أوقف مزامنة OneDrive مؤقتاً

### الحل 4: استخدام WSL (Windows Subsystem for Linux)
إذا كان متوفراً:
```bash
wsl
cd /mnt/c/Users/AD/OneDrive/Desktop/HMSPRO
npm run dev
```

## حل سريع مؤقت:
```powershell
# حذف .next وإعادة البناء
Remove-Item -Recurse -Force .next -ErrorAction SilentlyContinue
npm run dev
```


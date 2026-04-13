'use client'

import { createContext, useContext, useState, ReactNode, useEffect } from 'react'

export type Language = 'en' | 'ar'

interface LanguageContextType {
  language: Language
  setLanguage: (lang: Language) => void
  t: (key: string) => string
  isRTL: boolean
  formatNumber: (num: number | string) => string
}

const LanguageContext = createContext<LanguageContextType | undefined>(undefined)

// Translation keys - Comprehensive Dictionary
const translations: Record<Language, Record<string, string>> = {
  en: {
    // Common
    'common.welcome': 'Welcome',
    'common.loading': 'Loading...',
    'common.save': 'Save',
    'common.cancel': 'Cancel',
    'common.delete': 'Delete',
    'common.edit': 'Edit',
    'common.close': 'Close',
    'common.search': 'Search',
    'common.submit': 'Submit',
    'common.confirm': 'Confirm',
    'common.back': 'Back',
    'common.next': 'Next',
    'common.previous': 'Previous',
    'common.selected': 'Selected',
    'common.years': 'years',
    'common.min': 'min',
    'common.inQueue': 'in queue',
    
    // Theme
    'theme.dark': 'Dark',
    'theme.light': 'Light',
    'theme.switchToDark': 'Switch to Dark Mode',
    'theme.switchToLight': 'Switch to Light Mode',
    
    // Auth
    'auth.login': 'Sign In',
    'auth.username': 'Username',
    'auth.password': 'Password',
    'auth.signOut': 'Sign Out',
    'auth.welcomeBack': 'Welcome back,',
    
    // Dashboard
    'dashboard.title': 'Dashboard',
    'dashboard.admin': 'Admin Dashboard',
    'dashboard.doctor': "Doctor's Dashboard",
    'dashboard.reception': 'Reception Dashboard',
    'dashboard.pharmacy': 'Pharmacy Dashboard',
    'dashboard.cashier': 'Payments Dashboard',
    'dashboard.manager': 'Manager Dashboard',
    'dashboard.hospital': 'ZION HOSPITAL',
    
    // Sidebar Menu Items
    'sidebar.managerDashboard': 'Manager Dashboard',
    'sidebar.analytics': 'Analytics',
    'sidebar.finance': 'Finance',
    'sidebar.staffManagement': 'Staff Management',
    'sidebar.allDepartments': 'All Departments',
    'sidebar.patientList': 'Patient List',
    'sidebar.diagnosticsResults': 'Diagnostics Results',
    'sidebar.eprescription': 'E-Prescription',
    'sidebar.labRequests': 'Lab Requests',
    'sidebar.prescriptions': 'Prescriptions',
    'sidebar.inventory': 'Inventory',
    'sidebar.patientRegistration': 'Patient Registration',
    'sidebar.billingFinance': 'Billing & Finance',
    'sidebar.billing': 'Billing',
    'sidebar.paymentHistory': 'Payment History',
    
    // Patient
    'patient.name': 'Patient Name',
    'patient.age': 'Age',
    'patient.gender': 'Gender',
    'patient.phone': 'Phone',
    'patient.id': 'Patient ID',
    'patient.queue': 'Patient Queue',
    'patient.waiting': 'Waiting Patients',
    'patient.select': 'Select a patient to begin consultation',
    'patient.chooseFromList': 'Choose a patient from the waiting list',
    'patient.chiefComplaint': 'Chief Complaint',
    'patient.waitTime': 'Wait Time',
    'patient.checkInTime': 'Check In',
    'patient.emergency': 'EMERGENCY',
    'patient.priority': 'Priority',
    'patient.high': 'High',
    'patient.medium': 'Medium',
    'patient.low': 'Low',
    
    // ER / Emergency
    'er.title': 'Emergency Room',
    'er.emergencyProcedures': 'Emergency Procedures',
    'er.quickDiagnosisActions': 'Quick Diagnosis Actions',
    'er.clinicalNotes': "Doctor's Clinical Notes",
    'er.diagnosisNotes': 'Diagnosis / Notes',
    'er.saveDiagnosis': 'Save Diagnosis',
    'er.completeVisit': 'Complete ER Visit',
    'er.backToQueue': 'Back to Queue',
    'er.visit': 'Visit',
    'er.ivFluid': 'IV Fluid',
    'er.injection': 'Injection',
    'er.woundDressing': 'Wound Dressing',
    'er.stitching': 'Stitching',
    'er.oxygen': 'Oxygen',
    'er.appliedProcedures': 'Applied Procedures',
    
    // Doctor
    'doctor.diagnosis': 'Diagnosis',
    'doctor.prescription': 'Prescription & Medication',
    'doctor.completeVisit': 'Complete Visit',
    'doctor.labTests': 'Lab Tests',
    'doctor.takeTest': 'Take Test',
    'doctor.testName': 'Test Name',
    'doctor.testCategory': 'Test Category',
    'doctor.testNamePlaceholder': 'Type test name or select from list...',
    'doctor.testSearchPlaceholder': 'Search or type test name...',
    'doctor.selectRadiologyTest': 'Select Radiology Test',
    'doctor.confirmAddBill': 'Confirm & Add to Bill',
    'doctor.diagnosticTestAdded': 'Diagnostic test added',
    'doctor.testPrice': 'Price (IQD)',
    'doctor.priceAuto': 'Auto',
    'doctor.priceManual': 'Enter price manually',
    'doctor.pricePending': 'Pending',
    'doctor.componentError': 'Component loading error',
    
    // Pharmacy
    'pharmacy.prescriptions': 'Prescriptions',
    'pharmacy.pending': 'Pending Prescriptions',
    'pharmacy.dispenseInternal': 'Confirm Dispense (Internal - Add to Invoice)',
    'pharmacy.dispenseExternal': 'External Prescription (Print Only - No Charge)',
    
    // Inventory
    'inventory.title': 'Inventory Management',
    'inventory.list': 'Inventory List',
    'inventory.stockEntry': 'Stock Entry',
    'inventory.alerts': 'Alerts',
    'inventory.reports': 'Reports',
    'inventory.lowStock': 'Low Stock',
    'inventory.outOfStock': 'Out of Stock',
    'inventory.expiringSoon': 'Expiring Soon',
    
    // Cashier
    'cashier.queue': 'QUEUE',
    'cashier.total': 'Total Amount',
    'cashier.paymentMethod': 'Payment Method',
    'cashier.confirmPayment': 'Confirm Payment',
    
    // Manager
    'manager.generateReport': 'Generate Monthly Report',
    'manager.totalRevenue': 'Total Revenue',
    'manager.patientTraffic': 'Patient Traffic',
    'manager.topDoctor': 'Top Doctor',
  },
  ar: {
    // Common
    'common.welcome': 'مرحباً',
    'common.loading': 'جاري التحميل...',
    'common.save': 'حفظ',
    'common.cancel': 'إلغاء',
    'common.delete': 'حذف',
    'common.edit': 'تعديل',
    'common.close': 'إغلاق',
    'common.search': 'بحث',
    'common.submit': 'إرسال',
    'common.confirm': 'تأكيد',
    'common.back': 'رجوع',
    'common.next': 'التالي',
    'common.previous': 'السابق',
    'common.selected': 'محدد',
    'common.years': 'سنة',
    'common.min': 'دقيقة',
    'common.inQueue': 'في قائمة الانتظار',
    
    // Theme
    'theme.dark': 'داكن',
    'theme.light': 'فاتح',
    'theme.switchToDark': 'التبديل إلى الوضع الداكن',
    'theme.switchToLight': 'التبديل إلى الوضع الفاتح',
    
    // Auth
    'auth.login': 'تسجيل الدخول',
    'auth.username': 'اسم المستخدم',
    'auth.password': 'كلمة المرور',
    'auth.signOut': 'تسجيل الخروج',
    'auth.welcomeBack': 'مرحباً بعودتك،',
    
    // Dashboard
    'dashboard.title': 'لوحة التحكم',
    'dashboard.admin': 'لوحة تحكم المدير',
    'dashboard.doctor': 'لوحة تحكم الطبيب',
    'dashboard.reception': 'لوحة تحكم الاستقبال',
    'dashboard.pharmacy': 'لوحة تحكم الصيدلية',
    'dashboard.cashier': 'لوحة المدفوعات',
    'dashboard.manager': 'لوحة تحكم المدير',
    'dashboard.hospital': 'مستشفى زيون',
    
    // Sidebar Menu Items
    'sidebar.managerDashboard': 'لوحة تحكم المدير',
    'sidebar.analytics': 'التحليلات',
    'sidebar.finance': 'المالية',
    'sidebar.staffManagement': 'إدارة الموظفين',
    'sidebar.allDepartments': 'جميع الأقسام',
    'sidebar.patientList': 'قائمة المرضى',
    'sidebar.diagnosticsResults': 'نتائج التشخيص',
    'sidebar.eprescription': 'الوصفة الإلكترونية',
    'sidebar.labRequests': 'طلبات المختبر',
    'sidebar.prescriptions': 'الوصفات',
    'sidebar.inventory': 'المخزون',
    'sidebar.patientRegistration': 'تسجيل المرضى',
    'sidebar.billingFinance': 'الفواتير والمالية',
    'sidebar.billing': 'الفواتير',
    'sidebar.paymentHistory': 'سجل المدفوعات',
    
    // Patient
    'patient.name': 'اسم المريض',
    'patient.age': 'العمر',
    'patient.gender': 'الجنس',
    'patient.phone': 'الهاتف',
    'patient.id': 'رقم المريض',
    'patient.queue': 'قائمة الانتظار',
    'patient.waiting': 'المرضى المنتظرون',
    'patient.select': 'اختر مريضاً لبدء الاستشارة',
    'patient.chooseFromList': 'اختر مريضاً من قائمة الانتظار',
    'patient.chiefComplaint': 'الشكوى الرئيسية',
    'patient.waitTime': 'وقت الانتظار',
    'patient.checkInTime': 'وقت التسجيل',
    'patient.emergency': 'طوارئ',
    'patient.priority': 'الأولوية',
    'patient.high': 'عالية',
    'patient.medium': 'متوسطة',
    'patient.low': 'منخفضة',
    
    // ER / Emergency
    'er.title': 'غرفة الطوارئ',
    'er.emergencyProcedures': 'الإجراءات الطارئة',
    'er.quickDiagnosisActions': 'إجراءات التشخيص السريع',
    'er.clinicalNotes': 'الملاحظات السريرية للطبيب',
    'er.diagnosisNotes': 'التشخيص / الملاحظات',
    'er.saveDiagnosis': 'حفظ التشخيص',
    'er.completeVisit': 'إكمال زيارة الطوارئ',
    'er.backToQueue': 'العودة إلى قائمة الانتظار',
    'er.visit': 'الزيارة',
    'er.ivFluid': 'السوائل الوريدية',
    'er.injection': 'حقنة',
    'er.woundDressing': 'ضماد الجرح',
    'er.stitching': 'خياطة',
    'er.oxygen': 'أكسجين',
    'er.appliedProcedures': 'الإجراءات المطبقة',
    
    // Doctor
    'doctor.diagnosis': 'التشخيص',
    'doctor.prescription': 'الوصفة الطبية',
    'doctor.completeVisit': 'إكمال الزيارة',
    'doctor.labTests': 'الفحوصات المخبرية',
    'doctor.takeTest': 'طلب فحص',
    'doctor.testName': 'اسم الفحص',
    'doctor.testCategory': 'فئة الفحص',
    'doctor.testNamePlaceholder': 'اكتب اسم الفحص أو اختر من القائمة...',
    'doctor.testSearchPlaceholder': 'ابحث أو اكتب اسم الفحص...',
    'doctor.selectRadiologyTest': 'اختر فحص الأشعة',
    'doctor.confirmAddBill': 'تأكيد وإضافة للفاتورة',
    'doctor.diagnosticTestAdded': 'تم إضافة الفحص التشخيصي',
    'doctor.testPrice': 'السعر (دينار عراقي)',
    'doctor.priceAuto': 'تلقائي',
    'doctor.priceManual': 'أدخل السعر يدوياً',
    'doctor.pricePending': 'قيد الانتظار',
    'doctor.componentError': 'خطأ في تحميل المكون',
    
    // Pharmacy
    'pharmacy.prescriptions': 'الوصفات',
    'pharmacy.pending': 'الوصفات المعلقة',
    'pharmacy.dispenseInternal': 'تأكيد الصرف داخل المستشفى (إضافة للفاتورة)',
    'pharmacy.dispenseExternal': 'وصفة خارجية (طباعة فقط - بدون تكلفة)',
    
    // Inventory
    'inventory.title': 'إدارة المخزون',
    'inventory.list': 'قائمة المخزون',
    'inventory.stockEntry': 'إدخال المخزون',
    'inventory.alerts': 'التنبيهات',
    'inventory.reports': 'التقارير',
    'inventory.lowStock': 'مخزون منخفض',
    'inventory.outOfStock': 'نفد المخزون',
    'inventory.expiringSoon': 'ينتهي قريباً',
    
    // Cashier
    'cashier.queue': 'قائمة الانتظار',
    'cashier.total': 'المبلغ الإجمالي',
    'cashier.paymentMethod': 'طريقة الدفع',
    'cashier.confirmPayment': 'تأكيد الدفع',
    
    // Manager
    'manager.generateReport': 'إنشاء تقرير شهري',
    'manager.totalRevenue': 'إجمالي الإيرادات',
    'manager.patientTraffic': 'عدد المرضى',
    'manager.topDoctor': 'الطبيب الأكثر نشاطاً',
  },
}

export function LanguageProvider({ children }: { children: ReactNode }) {
  const [language, setLanguageState] = useState<Language>(() => {
    if (typeof window !== 'undefined') {
      const saved = localStorage.getItem('zionmed_language')
      if (saved === 'ar' || saved === 'en') {
        return saved
      }
    }
    return 'en'
  })

  useEffect(() => {
    if (typeof window !== 'undefined') {
      localStorage.setItem('zionmed_language', language)
      // Update document direction
      document.documentElement.setAttribute('dir', language === 'ar' ? 'rtl' : 'ltr')
      document.documentElement.setAttribute('lang', language)
    }
  }, [language])

  const setLanguage = (lang: Language) => {
    setLanguageState(lang)
  }

  const t = (key: string): string => {
    return translations[language][key] || key
  }

  // Format numbers to always display in English format (for billing clarity)
  const formatNumber = (num: number | string): string => {
    const numStr = typeof num === 'number' ? num.toString() : num
    // Remove any existing formatting and keep as English digits
    return numStr.replace(/[٠-٩]/g, (d) => '٠١٢٣٤٥٦٧٨٩'.indexOf(d).toString())
  }

  const isRTL = language === 'ar'

  return (
    <LanguageContext.Provider value={{ language, setLanguage, t, isRTL, formatNumber }}>
      {children}
    </LanguageContext.Provider>
  )
}

export function useLanguage() {
  const context = useContext(LanguageContext)
  if (context === undefined) {
    throw new Error('useLanguage must be used within a LanguageProvider')
  }
  return context
}


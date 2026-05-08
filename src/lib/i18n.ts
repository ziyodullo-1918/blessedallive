// Uzbek (Latin) strings for the production tracking app.
export const t = {
  appName: "Blessed Al Live",
  appTagline: "Blessed Al Live — kunlik ishlab chiqarish va maosh hisobot tizimi",

  // Auth
  signIn: "Kirish",
  signOut: "Chiqish",
  admin: "Administrator",
  worker: "Hodim",
  email: "Email",
  password: "Parol",
  workerCode: "Hodim ID",
  pin: "PIN-kod",
  loginAsAdmin: "Administrator sifatida kirish",
  loginAsWorker: "Hodim sifatida kirish",
  invalidCredentials: "Noto‘g‘ri ma’lumotlar",
  invalidPin: "Noto‘g‘ri ID yoki PIN-kod",
  signUp: "Ro‘yxatdan o‘tish",
  noAccount: "Hisobingiz yo‘qmi?",
  haveAccount: "Hisobingiz bormi?",
  createAdmin: "Administrator yaratish",
  sessionExpired: "Sessiya tugadi, qaytadan kiring",

  // Nav
  dashboard: "Boshqaruv paneli",
  workers: "Hodimlar",
  products: "Mahsulotlar",
  categories: "Kategoriyalar",
  reports: "Hisobotlar",
  liveFeed: "Jonli yozuvlar",
  myWork: "Mening ishim",
  addEntry: "Yangi yozuv",

  // Workers
  workerName: "Ism",
  addWorker: "Hodim qo‘shish",
  editWorker: "Tahrirlash",
  deleteWorker: "O‘chirish",
  active: "Faol",
  inactive: "Faol emas",
  newPin: "Yangi PIN (bo‘sh qoldirsangiz o‘zgarmaydi)",

  // Products
  productName: "Mahsulot nomi",
  category: "Kategoriya",
  price: "Narx",
  pricePerUnit: "Narx (1 dona)",
  addProduct: "Mahsulot qo‘shish",
  addCategory: "Kategoriya qo‘shish",
  selectCategory: "Kategoriya tanlang",
  noCategory: "Kategoriyasiz",

  // Settings & PIN
  settings: "Sozlamalar",
  adminPin: "Admin PIN-kod",
  enterPin: "PIN-kodni kiriting",
  oldPin: "Eski PIN",
  newPin2: "Yangi PIN",
  confirmNewPin: "Yangi PIN (takror)",
  changePin: "PIN-kodni o‘zgartirish",
  pinChanged: "PIN-kod yangilandi",
  pinMismatch: "PIN-kodlar mos emas",
  pinTooShort: "PIN kamida 4 ta belgidan iborat bo‘lsin",
  invalidOldPin: "Eski PIN noto‘g‘ri",
  pinLocked: "Bu bo‘lim PIN-kod bilan himoyalangan",
  unlock: "Ochish",
  lock: "Yopish",
  editCategory: "Kategoriyani tahrirlash",
  categoryHint: "Masalan: Qish, Bahor, Yoz, Kuz yoki mavsumiy kolleksiya",
  todayTotalsByWorker: "Bugungi hodimlar yakuni",

  // Work entries
  selectProduct: "Mahsulot tanlang",
  quantity: "Miqdor",
  date: "Sana",
  total: "Jami",
  product: "Mahsulot",
  submit: "Saqlash",
  cancel: "Bekor qilish",
  save: "Saqlash",
  delete: "O‘chirish",
  edit: "Tahrirlash",
  confirm: "Tasdiqlash",
  search: "Qidirish",
  filter: "Filter",
  all: "Hammasi",
  exportPdf: "PDF ga eksport",
  salaries: "Maoshlar",
  salariesReport: "Hodimlar maoshlari",
  liveUpdate: "Real vaqt",
  period: "Davr",
  periodName: "Davr nomi",
  from: "Boshlanish",
  to: "Tugash",
  startDate: "Boshlanish sanasi",
  endDate: "Tugash sanasi",
  nextStartDate: "Keyingi davr boshlanishi",
  autoNext: "Avto: tugagan kuning ertasi",

  // Periods
  currentPeriod: "Joriy davr",
  closePeriod: "Davrni tugatish",
  closePeriodConfirm: "Joriy davrni tugatishga ishonchingiz komilmi? Hodimlar eski yozuvlarni avtomatik ravishda tarixda ko‘rishadi.",
  periodClosed: "Davr tugatildi",
  periodHistory: "Davrlar tarixi",
  open: "Ochiq",
  closed: "Yopilgan",
  noPeriods: "Davrlar yo‘q",
  viewPeriod: "Davrni ko‘rish",
  selectPeriod: "Davr tanlash",
  customRange: "O‘zim tanlayman",

  // Reports
  monthlyReport: "Oylik hisobot",
  workersMonthlyReport: "Hodimlar oylik hisoboti",
  productsReport: "Mahsulotlar hisoboti",
  totalProduction: "Umumiy ishlab chiqarish",
  totalEarnings: "Umumiy daromad",
  overallTotal: "Umumiy summa",
  productionByProduct: "Mahsulot bo‘yicha ishlab chiqarish",
  earningsByWorker: "Hodim bo‘yicha daromad",
  totalEntries: "Yozuvlar soni",
  units: "dona",
  noData: "Ma’lumot yo‘q",
  todaySummary: "Bugungi xulosa",
  todaySummaryAndCount: "Bugungi xulosa va yozuvlar",
  myProductionSummary: "Mening ishlab chiqarishim",
  downloadPdf: "PDF yuklab olish",
  records: "Yozuvlar",
  generatedAt: "Yaratilgan vaqt",
  productsBreakdown: "Mahsulotlar bo‘yicha taqsimot",

  // Common
  loading: "Yuklanmoqda…",
  saved: "Saqlandi",
  deleted: "O‘chirildi",
  error: "Xato",
  back: "Orqaga",
  welcome: "Xush kelibsiz",
  hello: "Salom",
  yourProduction: "Sizning ishlab chiqargan ishingiz",
};

export type Dict = typeof t;

export const formatMoney = (n: number) =>
  new Intl.NumberFormat("uz-UZ", { maximumFractionDigits: 0 }).format(Math.round(n)) + " so'm";

export const formatNumber = (n: number) =>
  new Intl.NumberFormat("uz-UZ", { maximumFractionDigits: 2 }).format(n);

export const monthName = (m: number) => {
  const names = [
    "Yanvar", "Fevral", "Mart", "Aprel", "May", "Iyun",
    "Iyul", "Avgust", "Sentyabr", "Oktyabr", "Noyabr", "Dekabr",
  ];
  return names[m] ?? "";
};

// Auto-name a period like the database function (Aprel boshi/o'rtasi/oxiri)
export function autoPeriodName(dateStr: string): string {
  const d = new Date(dateStr + "T00:00:00");
  const day = d.getDate();
  const part = day <= 10 ? "boshi" : day <= 20 ? "o'rtasi" : "oxiri";
  return `${monthName(d.getMonth())} ${part}`;
}

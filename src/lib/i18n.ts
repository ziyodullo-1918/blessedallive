// Uzbek (Latin) strings for the production tracking app.
export const t = {
  appName: "Ishlab Chiqarish",
  appTagline: "Kichik ishlab chiqarish uchun kunlik hisobot tizimi",

  // Auth
  signIn: "Kirish",
  signOut: "Chiqish",
  admin: "Administrator",
  worker: "Ishchi",
  email: "Email",
  password: "Parol",
  workerCode: "Ishchi ID",
  pin: "PIN-kod",
  loginAsAdmin: "Administrator sifatida kirish",
  loginAsWorker: "Ishchi sifatida kirish",
  invalidCredentials: "Noto‘g‘ri ma’lumotlar",
  invalidPin: "Noto‘g‘ri ID yoki PIN-kod",
  signUp: "Ro‘yxatdan o‘tish",
  noAccount: "Hisobingiz yo‘qmi?",
  haveAccount: "Hisobingiz bormi?",
  createAdmin: "Administrator yaratish",

  // Nav
  dashboard: "Boshqaruv paneli",
  workers: "Ishchilar",
  products: "Mahsulotlar",
  categories: "Kategoriyalar",
  reports: "Hisobotlar",
  myWork: "Mening ishim",
  addEntry: "Yangi yozuv",

  // Workers
  workerName: "Ism",
  addWorker: "Ishchi qo‘shish",
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
  exportCsv: "CSV ga eksport",
  exportPdf: "PDF ga eksport",
  salaries: "Maoshlar",
  salariesReport: "Ishchilar maoshlari",
  liveUpdate: "Real vaqt",
  period: "Davr",
  from: "Boshlanish",
  to: "Tugash",

  // Periods
  currentPeriod: "Joriy davr",
  closePeriod: "Davrni tugatish",
  closePeriodConfirm: "Joriy davrni tugatishga ishonchingiz komilmi? Yangi davr ertasi kunidan boshlanadi va ishchilar eski yozuvlarni ko‘rmaydi.",
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
  workersMonthlyReport: "Ishchilar oylik hisoboti",
  productsReport: "Mahsulotlar hisoboti",
  totalProduction: "Umumiy ishlab chiqarish",
  totalEarnings: "Umumiy daromad",
  overallTotal: "Umumiy summa",
  productionByProduct: "Mahsulot bo‘yicha ishlab chiqarish",
  earningsByWorker: "Ishchi bo‘yicha daromad",
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

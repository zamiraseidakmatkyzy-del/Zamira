export type LocaleType = 'en' | 'ru' | 'es';

export interface TranslationSchema {
  appTitle: string;
  appSubtitle: string;
  exportExcel: string;
  exportPdf: string;
  scanPhoto: string;
  addManual: string;
  grouping: string;
  groupByType: string;
  groupBySupplier: string;
  groupByDate: string;
  quickFilters: string;
  resetFilters: string;
  searchPlaceholder: string;
  searchLabel: string;
  itemTypeLabel: string;
  allTypes: string;
  goods: string;
  services: string;
  incomes: string;
  goodsLabel: string;
  servicesLabel: string;
  incomesLabel: string;
  supplierLabel: string;
  allSuppliersPlaceholder: string;
  periodLabel: string;
  filteredSumLabel: string;
  statsTotalInvoices: string;
  statsGoodsSum: string;
  statsServicesSum: string;
  statsIncomesSum: string;
  tableColDate: string;
  tableColDoc: string;
  tableColSupplier: string;
  tableColDesc: string;
  tableColPrice: string;
  tableColObject: string;
  tableColQuarter: string;
  tableColActions: string;
  tooltipViewPhoto: string;
  tooltipEdit: string;
  tooltipDelete: string;
  emptyStateTitle: string;
  emptyStateDesc: string;
  uploadBtn: string;
  tableFooterTip: string;
  tableFooterShown: string;
  loadingTitle: string;
  loadingDesc: string;
  modalVerifyTitle: string;
  modalAddTitle: string;
  modalVerifySubtitle: string;
  originalDocLabel: string;
  fieldDocNumber: string;
  fieldSupplier: string;
  fieldDate: string;
  specTitle: string;
  btnAddItem: string;
  specColDesc: string;
  specColType: string;
  specColObject: string;
  specColQty: string;
  specColPrice: string;
  specColTotal: string;
  btnSave: string;
  btnCancel: string;
  confirmDelete: string;
  tipDragDrop: string;
  errorUpload: string;
  scanStepRead: string;
  scanStepGemini: string;
  scanStepAnalyze: string;
  scanStepClassify: string;
  fieldObjectName: string;
  fieldCurrency: string;
  filterObjectName: string;
  objectLabel: string;
  scanSuccessExtracted: string;
  duplicateWarningTitle: string;
  duplicateWarningDesc: string;
  btnYesContinue: string;
  btnNoCancel: string;
  specObjectInheritTip: string;
  filterExpenseCategory: string;
  labelExpenseCategory: string;
  expenseCategories: Record<string, string>;
  income: string;
  expense: string;
  invoiceType: string;
  profit: string;
  revenue: string;
  expenses: string;
  financialDashboard: string;
  byMonth: string;
  byObject: string;
  signInTitle: string;
  signInSubtitle: string;
  businessNamePlaceholder: string;
  btnSignIn: string;
  btnSwitchBusiness: string;
  currentWorkspace: string;
  tryDemoLink: string;
  passwordLabel: string;
  passwordPlaceholder: string;
  passwordErrorIncorrect: string;
  passwordHintNew: string;
  passwordHintExisting: string;
  authModeSignIn: string;
  authModeSignUp: string;
  btnSignUp: string;
  passwordErrorAlreadyExists: string;
  passwordErrorNotFound: string;
  passwordHintSignUp: string;
  passwordConfirmLabel: string;
  passwordConfirmPlaceholder: string;
  passwordErrorMismatch: string;
  tabInteractive: string;
  selectMonth: string;
  selectObject: string;
  allMonths: string;
  allObjects: string;
  interactiveTitle: string;
  interactiveSubtitle: string;
  tabManagementAnalysis: string;
  mgmtTitle: string;
  mgmtSubtitle: string;
  mgmtMostProfitableObj: string;
  mgmtTopSuppliers: string;
  mgmtTransactionsCount: string;
  mgmtTotalSpent: string;
  mgmtNoData: string;
  mgmtAvgReceipt: string;
  mgmtTopCategories: string;
  mgmtMostExpensivePurchase: string;
  taxAndQuartersTitle: string;
  taxAndQuartersSubtitle: string;
  taxAndQuartersTaxes: string;
  taxAndQuartersQuarters: string;
  taxAndQuartersCategories: string;
  totalDocuments: string;
  totalProjects: string;
  clients: string;
  companyName: string;
  contactPerson: string;
  phone: string;
  email: string;
  projects: string;
  totalRevenue: string;
  addClient: string;
  editClient: string;
  deleteClient: string;
  clientFormTitle: string;
  noClients: string;
  clientSearchPlaceholder: string;
  clientFormSubmit: string;
  clientFormCancel: string;
}

export const translations: Record<LocaleType, TranslationSchema> = {
  en: {
    appTitle: "FacturaScan",
    appSubtitle: "AI-Powered Invoice OCR & Specification Tracker",
    exportExcel: "Export to Excel",
    exportPdf: "Export to PDF",
    scanPhoto: "Scan Document",
    addManual: "Add Manually",
    grouping: "Data Grouping",
    groupByType: "By Type (Goods / Services)",
    groupBySupplier: "By Supplier Name",
    groupByDate: "By Issue Date",
    quickFilters: "Quick Filters",
    resetFilters: "Reset",
    searchPlaceholder: "Invoice #, description, item...",
    searchLabel: "Search Documents & Items",
    itemTypeLabel: "Item Category",
    allTypes: "All Categories",
    goods: "Goods",
    services: "Services",
    incomes: "Incomes",
    goodsLabel: "Goods (Material assets)",
    servicesLabel: "Services & Works",
    incomesLabel: "Incomes",
    supplierLabel: "Supplier Name",
    allSuppliersPlaceholder: "All suppliers...",
    periodLabel: "Issue Period",
    filteredSumLabel: "Filtered Sum",
    statsTotalInvoices: "Total Invoices",
    statsGoodsSum: "Goods Total",
    statsServicesSum: "Services Total",
    statsIncomesSum: "Incomes Total",
    tableColDate: "Date",
    tableColDoc: "Invoice #",
    tableColSupplier: "Supplier",
    tableColDesc: "Item Description / Specifications",
    tableColPrice: "Amount",
    tableColObject: "Object",
    tableColQuarter: "Quarter",
    tableColActions: "Actions",
    tooltipViewPhoto: "View original document photo",
    tooltipEdit: "Edit invoice data",
    tooltipDelete: "Delete invoice",
    emptyStateTitle: "No specifications found",
    emptyStateDesc: "Adjust your search filters, create one manually, or drop an image here to scan a new invoice with AI.",
    uploadBtn: "Upload File",
    tableFooterTip: "Tip: Drag and drop an invoice image into the table workspace to trigger automatic AI scanning.",
    tableFooterShown: "Showing {filtered} of {total} items ({docCount} documents)",
    loadingTitle: "Processing Invoice",
    loadingDesc: "Gemini 3.5 Flash is extracting text, parsing line-item details, and classifying items into goods and services.",
    modalVerifyTitle: "Verify Extracted Data",
    modalAddTitle: "Add New Invoice",
    modalVerifySubtitle: "Please review and confirm the AI extracted specifications before saving",
    originalDocLabel: "Original Document",
    fieldDocNumber: "Document Number",
    fieldSupplier: "Supplier / Vendor",
    fieldDate: "Issue Date",
    specTitle: "Line-Item Specification (Goods & Services)",
    btnAddItem: "Add New Line Item",
    specColDesc: "Item Description",
    specColType: "Type",
    specColObject: "Object",
    specColQty: "Qty",
    specColPrice: "Unit Price",
    specColTotal: "Total",
    btnSave: "Save Invoice",
    btnCancel: "Cancel",
    confirmDelete: "Are you sure you want to delete this invoice?",
    tipDragDrop: "Drag & Drop invoice image here to scan with Gemini AI",
    errorUpload: "Failed to analyze document. Please check the image quality or try another file.",
    scanStepRead: "Reading image file...",
    scanStepGemini: "Extracting text with Gemini AI...",
    scanStepAnalyze: "Analyzing line items & table contents...",
    scanStepClassify: "Classifying goods vs services...",
    fieldObjectName: "Object / Project",
    fieldCurrency: "Currency",
    filterObjectName: "All Objects",
    objectLabel: "Object",
    scanSuccessExtracted: "Invoice extracted successfully! Please review the details below and click Save.",
    duplicateWarningTitle: "Duplicate Invoice Detected",
    duplicateWarningDesc: "An invoice with number '{num}' already exists. Are you sure you want to proceed and save this invoice anyway?",
    btnYesContinue: "Yes, continue",
    btnNoCancel: "No, cancel",
    specObjectInheritTip: "If left blank, items inherit the document's main object. Specify different objects to distribute items across different projects.",
    filterExpenseCategory: "All Expense Categories",
    labelExpenseCategory: "Expense Category",
    expenseCategories: {
      materials: "Materials & Supplies 🧱",
      labor: "Labor & Wages 👷",
      equipment_rental: "Equipment Rental 🚜",
      fuel: "Fuel & Lubricants ⛽",
      permit: "Permits & Licenses 📜",
      office_expenses: "Office Expenses 🏢",
      insurance: "Insurance 🛡️",
      taxes_fees: "Taxes & Duties 🏛️",
      subcontracting: "Subcontracting 🤝",
      utility_expenses: "Utility Expenses ⚡",
      other: "Other Expenses 📁"
    },
    income: "Income",
    expense: "Expense",
    invoiceType: "Transaction Type",
    profit: "Net Profit",
    revenue: "Total Revenue",
    expenses: "Total Expenses",
    financialDashboard: "Financial Summary (Income, Expenses, Profit)",
    byMonth: "Monthly Overview",
    byObject: "Projects",
    signInTitle: "Enter Business Workspace",
    signInSubtitle: "Specify your business or project name to load your personalized, dedicated AI-powered workspace",
    businessNamePlaceholder: "e.g., Acme Corp, Coffee Shop, Construction LLC...",
    btnSignIn: "Open Workspace",
    btnSwitchBusiness: "Switch Workspace",
    currentWorkspace: "Workspace",
    tryDemoLink: "Want to try the demo? Enter 'FacturaScan' to load pre-loaded mock invoices.",
    passwordLabel: "Workspace Password",
    passwordPlaceholder: "Enter password...",
    passwordErrorIncorrect: "Incorrect password for this workspace. Please try again.",
    passwordHintNew: "This workspace is new. Enter a password to protect it.",
    passwordHintExisting: "This workspace is password protected. Enter its password.",
    authModeSignIn: "Sign In",
    authModeSignUp: "Register / Create",
    btnSignUp: "Register Workspace",
    passwordErrorAlreadyExists: "This workspace is already registered. Please sign in instead.",
    passwordErrorNotFound: "This workspace is not registered yet. Please switch to 'Register / Create' tab to create it.",
    passwordHintSignUp: "Set a password to secure your new workspace.",
    passwordConfirmLabel: "Confirm Password",
    passwordConfirmPlaceholder: "Re-enter password...",
    passwordErrorMismatch: "Passwords do not match. Please re-enter.",
    tabInteractive: "By Month & Object",
    selectMonth: "Select Month",
    selectObject: "Select Object",
    allMonths: "All Months",
    allObjects: "All Objects",
    interactiveTitle: "Financial Analytics Window",
    interactiveSubtitle: "Select any month and object to instantly calculate financial performance",
    tabManagementAnalysis: "Executive Analytics",
    mgmtTitle: "Management Insights & Performance",
    mgmtSubtitle: "Auto-computed smart reports highlighting your most profitable projects, frequent vendors, and optimization highlights",
    mgmtMostProfitableObj: "Most Profitable Project",
    mgmtTopSuppliers: "Top Suppliers & Vendors",
    mgmtTransactionsCount: "Purchases",
    mgmtTotalSpent: "Total Spent",
    mgmtNoData: "Insufficient invoice data to compute metrics.",
    mgmtAvgReceipt: "Average Bill / Receipt",
    mgmtTopCategories: "Primary Spending Categories",
    mgmtMostExpensivePurchase: "Highest Individual Transaction",
    taxAndQuartersTitle: "Tax & Quarterly Balance",
    taxAndQuartersSubtitle: "Overview of taxes paid, expense categories distribution, and detailed quarterly incomes, expenses, and profits",
    taxAndQuartersTaxes: "Taxes paid",
    taxAndQuartersQuarters: "Quarterly Performance",
    taxAndQuartersCategories: "Expenses by Category",
    totalDocuments: "Total Documents",
    totalProjects: "Total Projects",
    clients: "Clients",
    companyName: "Company Name",
    contactPerson: "Contact Person",
    phone: "Phone",
    email: "Email",
    projects: "Projects",
    totalRevenue: "Total Revenue",
    addClient: "Add Client",
    editClient: "Edit Client",
    deleteClient: "Delete Client",
    clientFormTitle: "Client Details",
    noClients: "No clients found. Click \"Add Client\" to create one.",
    clientSearchPlaceholder: "Search clients by company name, contact, phone...",
    clientFormSubmit: "Save Client",
    clientFormCancel: "Cancel",
  },
  ru: {
    appTitle: "FacturaScan",
    appSubtitle: "Умный ИИ-учет счет-фактур, товаров и услуг",
    exportExcel: "Выгрузить в Excel",
    exportPdf: "Выгрузить в PDF",
    scanPhoto: "Сканировать документ",
    addManual: "Добавить вручную",
    grouping: "Группировка данных",
    groupByType: "По типу (Товары / Услуги)",
    groupBySupplier: "По поставщику",
    groupByDate: "По дате выставления",
    quickFilters: "Быстрые фильтры",
    resetFilters: "Сбросить",
    searchPlaceholder: "Номер, описание, позиция...",
    searchLabel: "Поиск по документу / товару",
    itemTypeLabel: "Тип приобретения",
    allTypes: "Все позиции",
    goods: "Товары",
    services: "Услуги",
    incomes: "Доходы",
    goodsLabel: "Товары (Материальные ценности)",
    servicesLabel: "Услуги и Работы",
    incomesLabel: "Доходы",
    supplierLabel: "Поставщик",
    allSuppliersPlaceholder: "Все поставщики...",
    periodLabel: "Период выставления",
    filteredSumLabel: "Сумма отфильтрованных",
    statsTotalInvoices: "Всего счет-фактур",
    statsGoodsSum: "Сумма на товары",
    statsServicesSum: "Сумма на услуги",
    statsIncomesSum: "Сумма доходов",
    tableColDate: "Дата",
    tableColDoc: "Документ",
    tableColSupplier: "Поставщик",
    tableColDesc: "Описание позиции / товара",
    tableColPrice: "Сумма",
    tableColObject: "Объект",
    tableColQuarter: "Квартал",
    tableColActions: "Действия",
    tooltipViewPhoto: "Просмотреть фото документа",
    tooltipEdit: "Редактировать счет",
    tooltipDelete: "Удалить счет",
    emptyStateTitle: "Спецификаций не обнаружено",
    emptyStateDesc: "Измените фильтры, добавьте запись вручную или перетащите файл изображения для запуска автоматического ИИ-распознавания.",
    uploadBtn: "Загрузить файл",
    tableFooterTip: "Подсказка: Вы можете перетащить файл изображения в область таблицы для запуска автоматического ИИ-распознавания.",
    tableFooterShown: "Показано {filtered} из {total} спецификаций ({docCount} документов)",
    loadingTitle: "Обработка счет-фактуры",
    loadingDesc: "Модель Gemini 3.5 Flash считывает текст, распознает цены, классифицирует позиции на товары и услуги.",
    modalVerifyTitle: "Проверка распознанных данных",
    modalAddTitle: "Добавление счета-фактуры",
    modalVerifySubtitle: "Убедитесь в корректности распознанных данных перед сохранением",
    originalDocLabel: "Оригинальный документ",
    fieldDocNumber: "Номер документа",
    fieldSupplier: "Поставщик",
    fieldDate: "Дата выставления",
    specTitle: "Спецификация (Товары и Услуги)",
    btnAddItem: "Добавить позицию",
    specColDesc: "Описание позиции",
    specColType: "Тип",
    specColObject: "Объект",
    specColQty: "Кол-во",
    specColPrice: "Цена",
    specColTotal: "Итого",
    btnSave: "Сохранить счет",
    btnCancel: "Отмена",
    confirmDelete: "Вы уверены, что хотите удалить эту счет-фактуру?",
    tipDragDrop: "Перетащите сюда фото счета для ИИ-сканирования",
    errorUpload: "Не удалось распознать документ. Пожалуйста, попробуйте другое фото или введите данные вручную.",
    scanStepRead: "Чтение файла...",
    scanStepGemini: "Распознавание текста с помощью Gemini AI...",
    scanStepAnalyze: "Анализ табличной части, выделение товаров и услуг...",
    scanStepClassify: "Классификация позиций...",
    fieldObjectName: "Объект / Проект",
    fieldCurrency: "Валюта",
    filterObjectName: "Все объекты",
    objectLabel: "Объект",
    scanSuccessExtracted: "Счет-фактура успешно распознан! Пожалуйста, проверьте данные ниже и нажмите Сохранить.",
    duplicateWarningTitle: "Обнаружен дубликат счета-фактуры",
    duplicateWarningDesc: "Счет-фактура с номером «{num}» уже существует. Вы уверены, что хотите продолжить и все равно сохранить этот счет?",
    btnYesContinue: "Да, продолжить",
    btnNoCancel: "Нет, отменить",
    specObjectInheritTip: "Если оставить поле пустым, позиция унаследует общий объект документа. Укажите разные объекты, если товары или услуги относятся к разным проектам.",
    filterExpenseCategory: "Все категории расходов",
    labelExpenseCategory: "Категория расходов",
    expenseCategories: {
      materials: "Материалы и снабжение 🧱",
      labor: "Оплата труда и работы 👷",
      equipment_rental: "Аренда оборудования 🚜",
      fuel: "Топливо и ГСМ ⛽",
      permit: "Разрешения и лицензии 📜",
      office_expenses: "Офисные расходы 🏢",
      insurance: "Страхование 🛡️",
      taxes_fees: "Налоги и пошлины 🏛️",
      subcontracting: "Субподряд 🤝",
      utility_expenses: "Коммунальные услуги ⚡",
      other: "Прочие расходы 📁"
    },
    income: "Доход",
    expense: "Расход",
    invoiceType: "Тип транзакции",
    profit: "Чистая прибыль",
    revenue: "Общий доход",
    expenses: "Общие расходы",
    financialDashboard: "Финансовые итоги (Доходы, Расходы, Прибыль)",
    byMonth: "Ежемесячный обзор",
    byObject: "Проекты",
    signInTitle: "Вход в рабочий кабинет бизнеса",
    signInSubtitle: "Введите название вашего бизнеса или проекта, чтобы открыть выделенную персональную ИИ-страницу",
    businessNamePlaceholder: "например, Acme Corp, Кофейня, ООО СтройРесурс...",
    btnSignIn: "Войти в кабинет",
    btnSwitchBusiness: "Сменить кабинет",
    currentWorkspace: "Кабинет",
    tryDemoLink: "Хотите попробовать демо-версию? Войдите как 'FacturaScan' для загрузки готовых счет-фактур.",
    passwordLabel: "Пароль от кабинета",
    passwordPlaceholder: "Введите пароль...",
    passwordErrorIncorrect: "Неверный пароль для этого кабинета. Пожалуйста, попробуйте еще раз.",
    passwordHintNew: "Это новый кабинет. Задайте пароль для его защиты при будущих входах.",
    passwordHintExisting: "Этот кабинет защищен паролем. Введите пароль для входа.",
    authModeSignIn: "Войти",
    authModeSignUp: "Регистрация",
    btnSignUp: "Зарегистрировать кабинет",
    passwordErrorAlreadyExists: "Этот кабинет уже зарегистрирован. Пожалуйста, войдите в него.",
    passwordErrorNotFound: "Кабинет с таким названием еще не зарегистрирован. Переключитесь на вкладку 'Регистрация', чтобы создать его.",
    passwordHintSignUp: "Придумайте пароль для защиты вашего нового кабинета.",
    passwordConfirmLabel: "Подтвердите пароль",
    passwordConfirmPlaceholder: "Повторите пароль...",
    passwordErrorMismatch: "Пароли не совпадают. Пожалуйста, проверьте ввод.",
    tabInteractive: "По месяцу и объекту",
    selectMonth: "Выберите месяц",
    selectObject: "Выберите объект",
    allMonths: "Все месяцы",
    allObjects: "Все объекты",
    interactiveTitle: "Окошко финансовой аналитики",
    interactiveSubtitle: "Выберите любой месяц и объект для мгновенного расчета финансового результата",
    tabManagementAnalysis: "Анализ для менеджмента",
    mgmtTitle: "Аналитика управления и эффективности",
    mgmtSubtitle: "Автоматически рассчитываемые умные отчеты, выделяющие наиболее прибыльные проекты, частых поставщиков и резервы оптимизации",
    mgmtMostProfitableObj: "Самый доходный объект",
    mgmtTopSuppliers: "Где чаще всего отовариваемся (Поставщики)",
    mgmtTransactionsCount: "Покупок",
    mgmtTotalSpent: "Сумма расходов",
    mgmtNoData: "Недостаточно данных по счет-фактурам для построения управленческого анализа.",
    mgmtAvgReceipt: "Средний чек покупки",
    mgmtTopCategories: "Основные статьи расходов",
    mgmtMostExpensivePurchase: "Самая дорогая покупка",
    taxAndQuartersTitle: "Налоги и Квартальный Баланс",
    taxAndQuartersSubtitle: "Обзор уплаченных налогов, распределение расходов по категориям, а также подробные доходы, расходы и прибыль по кварталам",
    taxAndQuartersTaxes: "Уплаченные налоги",
    taxAndQuartersQuarters: "Квартальные показатели",
    taxAndQuartersCategories: "Расходы по категориям",
    totalDocuments: "Всего документов",
    totalProjects: "Всего проектов",
    clients: "Клиенты",
    companyName: "Название компании",
    contactPerson: "Контактное лицо",
    phone: "Телефон",
    email: "Email",
    projects: "Проекты",
    totalRevenue: "Общая выручка",
    addClient: "Добавить клиента",
    editClient: "Редактировать клиента",
    deleteClient: "Удалить клиента",
    clientFormTitle: "Карточка клиента",
    noClients: "Клиенты не найдены. Нажмите \"Добавить клиента\", чтобы создать новую карточку.",
    clientSearchPlaceholder: "Поиск по компании, контакту, телефону...",
    clientFormSubmit: "Сохранить клиента",
    clientFormCancel: "Отмена",
  },
  es: {
    appTitle: "FacturaScan",
    appSubtitle: "Seguimiento de especificaciones y OCR de facturas por IA",
    exportExcel: "Exportar a Excel",
    exportPdf: "Exportar a PDF",
    scanPhoto: "Escanear Documento",
    addManual: "Añadir Manualmente",
    grouping: "Agrupación de Datos",
    groupByType: "Por Tipo (Bienes / Servicios)",
    groupBySupplier: "Por Nombre del Proveedor",
    groupByDate: "Por Fecha de Emisión",
    quickFilters: "Filtros Rápidos",
    resetFilters: "Reiniciar",
    searchPlaceholder: "Factura #, descripción, artículo...",
    searchLabel: "Buscar Documentos y Artículos",
    itemTypeLabel: "Categoría de Artículo",
    allTypes: "Todas las categorías",
    goods: "Bienes",
    services: "Servicios",
    incomes: "Ingresos",
    goodsLabel: "Bienes (Activos materiales)",
    servicesLabel: "Servicios y Obras",
    incomesLabel: "Ingresos",
    supplierLabel: "Nombre del Proveedor",
    allSuppliersPlaceholder: "Todos los proveedores...",
    periodLabel: "Período de Emisión",
    filteredSumLabel: "Suma Filtrada",
    statsTotalInvoices: "Facturas Totales",
    statsGoodsSum: "Total Bienes",
    statsServicesSum: "Total Servicios",
    statsIncomesSum: "Total Ingresos",
    tableColDate: "Fecha",
    tableColDoc: "Factura #",
    tableColSupplier: "Proveedor",
    tableColDesc: "Descripción del Artículo / Especificaciones",
    tableColPrice: "Importe",
    tableColObject: "Objeto",
    tableColQuarter: "Trimestre",
    tableColActions: "Acciones",
    tooltipViewPhoto: "Ver foto original del documento",
    tooltipEdit: "Editar datos de factura",
    tooltipDelete: "Eliminar factura",
    emptyStateTitle: "No se encontraron especificaciones",
    emptyStateDesc: "Ajuste sus filtros de búsqueda, cree uno manualmente o arrastre una imagen aquí para escanear una nueva factura con IA.",
    uploadBtn: "Cargar Archivo",
    tableFooterTip: "Sugerencia: Arrastre y suelte una imagen de factura en la tabla para iniciar el escaneo de IA.",
    tableFooterShown: "Mostrando {filtered} de {total} artículos ({docCount} facturas)",
    loadingTitle: "Procesando Factura",
    loadingDesc: "Gemini 3.5 Flash está extrayendo texto, analizando detalles de partidas y clasificando artículos en bienes y servicios.",
    modalVerifyTitle: "Verificar Datos Extraídos",
    modalAddTitle: "Añadir Nueva Factura",
    modalVerifySubtitle: "Revise y confirme las especificaciones extraídas por la IA antes de guardar",
    originalDocLabel: "Documento Original",
    fieldDocNumber: "Número de Documento",
    fieldSupplier: "Proveedor",
    fieldDate: "Fecha de Emisión",
    specTitle: "Especificación de Partidas (Bienes y Servicios)",
    btnAddItem: "Añadir Nueva Partida",
    specColDesc: "Descripción del Artículo",
    specColType: "Tipo",
    specColObject: "Objeto",
    specColQty: "Cant.",
    specColPrice: "Precio Unit.",
    specColTotal: "Total",
    btnSave: "Guardar Factura",
    btnCancel: "Cancelar",
    confirmDelete: "¿Está seguro de que desea eliminar esta factura?",
    tipDragDrop: "Arrastre y suelte la imagen de la factura aquí para escanear con Gemini IA",
    errorUpload: "No se pudo analizar el documento. Compruebe la calidad de la imagen o intente con otro archivo.",
    scanStepRead: "Leyendo archivo...",
    scanStepGemini: "Extrayendo texto con Gemini IA...",
    scanStepAnalyze: "Analizando partidas y tabla...",
    scanStepClassify: "Clasificando bienes frente a servicios...",
    fieldObjectName: "Objeto / Proyecto",
    fieldCurrency: "Moneda",
    filterObjectName: "Todos los objetos",
    objectLabel: "Objeto",
    scanSuccessExtracted: "¡Factura extraída con éxito! Revise los detalles a continuación y haga clic en Guardar.",
    duplicateWarningTitle: "Factura duplicada detectada",
    duplicateWarningDesc: "Ya existe una factura con el número '{num}'. ¿Está seguro de que desea continuar y guardar esta factura de todos modos?",
    btnYesContinue: "Sí, continuar",
    btnNoCancel: "No, cancelar",
    specObjectInheritTip: "Si se deja en blanco, los artículos heredan el objeto principal del documento. Especifique diferentes objetos para distribuir artículos en diferentes proyectos.",
    filterExpenseCategory: "Todas las categorías de gastos",
    labelExpenseCategory: "Categoría de gastos",
    expenseCategories: {
      materials: "Materiales y Suministros 🧱",
      labor: "Mano de Obra y Salarios 👷",
      equipment_rental: "Alquiler de Equipamiento 🚜",
      fuel: "Combustible y Lubricantes ⛽",
      permit: "Permisos y Licencias 📜",
      office_expenses: "Gastos de Oficina 🏢",
      insurance: "Seguro 🛡️",
      taxes_fees: "Impuestos y Tasas 🏛️",
      subcontracting: "Subcontratación 🤝",
      utility_expenses: "Servicios Públicos ⚡",
      other: "Otros Gastos 📁"
    },
    income: "Ingreso",
    expense: "Gasto",
    invoiceType: "Tipo de transacción",
    profit: "Beneficio neto",
    revenue: "Ingresos totales",
    expenses: "Gastos totales",
    financialDashboard: "Resumen Financiero (Ingresos, Gastos, Ganancias)",
    byMonth: "Resumen Mensual",
    byObject: "Proyectos",
    signInTitle: "Ingresar al Gabinete del Negocio",
    signInSubtitle: "Escriba el nombre de su negocio o proyecto para abrir su espacio de trabajo personalizado por IA",
    businessNamePlaceholder: "ej. Acme Corp, Cafetería, Construcción LLC...",
    btnSignIn: "Entrar al Espacio",
    btnSwitchBusiness: "Cambiar Espacio",
    currentWorkspace: "Espacio",
    tryDemoLink: "¿Quiere probar la demostración? Ingrese 'FacturaScan' para cargar facturas de prueba.",
    passwordLabel: "Contraseña del Espacio",
    passwordPlaceholder: "Ingrese la contraseña...",
    passwordErrorIncorrect: "Contraseña incorrecta para este espacio. Inténtelo de nuevo.",
    passwordHintNew: "Este espacio es nuevo. Ingrese una contraseña para protegerlo.",
    passwordHintExisting: "Este espacio está protegido con contraseña. Ingrese su contraseña.",
    authModeSignIn: "Entrar",
    authModeSignUp: "Registrarse",
    btnSignUp: "Registrar Espacio",
    passwordErrorAlreadyExists: "Este espacio ya está registrado. Por favor, inicie sesión.",
    passwordErrorNotFound: "Este espacio aún no está registrado. Cambie a la pestaña 'Registrarse' para crearlo.",
    passwordHintSignUp: "Establezca una contraseña para asegurar su nuevo espacio de trabajo.",
    passwordConfirmLabel: "Confirmar contraseña",
    passwordConfirmPlaceholder: "Repita la contraseña...",
    passwordErrorMismatch: "Las contraseñas no coinciden. Por favor, verifíquelas.",
    tabInteractive: "Por Mes y Objeto",
    selectMonth: "Seleccione Mes",
    selectObject: "Seleccione Objeto",
    allMonths: "Todos los meses",
    allObjects: "Todos los objetos",
    interactiveTitle: "Ventana de Análisis Financiero",
    interactiveSubtitle: "Seleccione cualquier mes y objeto para calcular instantáneamente el rendimiento financiero",
    tabManagementAnalysis: "Análisis Gerencial",
    mgmtTitle: "Análisis de Gestión y Eficiencia",
    mgmtSubtitle: "Informes inteligentes calculados automáticamente que destacan los proyectos más rentables, los proveedores más habituales y las reservas de optimización",
    mgmtMostProfitableObj: "Proyecto Más Rentable",
    mgmtTopSuppliers: "Proveedores más frecuentes",
    mgmtTransactionsCount: "Compras",
    mgmtTotalSpent: "Gasto Total",
    mgmtNoData: "Datos de facturación insuficientes para generar el análisis de gestión.",
    mgmtAvgReceipt: "Ticket promedio de compra",
    mgmtTopCategories: "Principales categorías de gasto",
    mgmtMostExpensivePurchase: "Transacción individual más alta",
    taxAndQuartersTitle: "Impuestos y Balances Trimestrales",
    taxAndQuartersSubtitle: "Información sobre impuestos pagados, distribución de gastos por categoría y detalles trimestrales de ingresos, gastos y beneficios",
    taxAndQuartersTaxes: "Impuestos pagados",
    taxAndQuartersQuarters: "Rendimiento Trimestral",
    taxAndQuartersCategories: "Gastos por Categoría",
    totalDocuments: "Total Documentos",
    totalProjects: "Total Proyectos",
    clients: "Clientes",
    companyName: "Nombre de la empresa",
    contactPerson: "Persona de contacto",
    phone: "Teléfono",
    email: "Email",
    projects: "Proyectos",
    totalRevenue: "Ingresos totales",
    addClient: "Añadir Cliente",
    editClient: "Editar Cliente",
    deleteClient: "Eliminar Cliente",
    clientFormTitle: "Ficha del Cliente",
    noClients: "No se encontraron clientes. Haga clic en \"Añadir Cliente\" para crear uno.",
    clientSearchPlaceholder: "Buscar clientes por nombre de empresa, contacto, teléfono...",
    clientFormSubmit: "Guardar Cliente",
    clientFormCancel: "Cancelar",
  },
};

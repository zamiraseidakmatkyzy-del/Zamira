import React, { useState, useEffect, useMemo, useRef } from "react";
import { ResponsiveContainer, PieChart, Pie, Cell, Tooltip, Legend } from "recharts";
import { Invoice, InvoiceItem, ItemType, InvoiceType, Client } from "./types";
import { initialInvoices } from "./mockData";
import { exportInvoicesToExcel } from "./utils/excelExport";
import { exportInvoicesToPdf } from "./utils/pdfExport";
import { exportScheduleCToPdf, exportScheduleCToExcel } from "./utils/scheduleCExport";
import { LocaleType, translations } from "./locales";
import { compressImage } from "./utils/imageCompressor";
import ClientsTabContent from "./components/ClientsTabContent";
import ProjectsTabContent from "./components/ProjectsTabContent";
import {
  FileText,
  Upload,
  Plus,
  Trash2,
  Edit2,
  Calendar,
  Layers,
  Filter,
  Download,
  CheckCircle,
  Eye,
  AlertCircle,
  X,
  RefreshCw,
  Search,
  ChevronDown,
  ChevronRight,
  Package,
  Headphones,
  DollarSign,
  FileSpreadsheet,
  Folder,
  TrendingUp,
  TrendingDown,
  ArrowUpRight,
  ArrowDownRight,
  LogIn,
  LogOut,
  Building,
  Lock,
  Briefcase,
  Store,
  Users,
  Phone,
  Mail,
  User,
  Percent,
  HelpCircle,
  Info
} from "lucide-react";

const categoryExplanations: Record<string, { ru: string; en: string }> = {
  materials: {
    ru: "Строительные материалы, сырье, инструменты, крепеж, расходные материалы и защитная экипировка для проведения работ.",
    en: "Raw materials, construction supplies, tools, hardware, consumables, and protective gear used in operations."
  },
  labor: {
    ru: "Выплаты штатным сотрудникам, заработная плата, премии, отпускные и налоги на фонд оплаты труда.",
    en: "Wages, salaries, bonuses, and related payroll taxes for permanent and temporary employees."
  },
  equipment_rental: {
    ru: "Аренда строительной техники, автовышек, специализированного оборудования, генераторов или инструментов.",
    en: "Rental fees for heavy machinery, specialized tools, generators, vehicles, or industrial equipment."
  },
  fuel: {
    ru: "Бензин, дизельное топливо, моторные масла и смазочные материалы для служебного транспорта и генераторов.",
    en: "Gasoline, diesel, motor oils, and lubricants for company vehicles, machinery, and power generators."
  },
  permit: {
    ru: "Оплата государственных разрешений, строительных лицензий, экологических допусков и сертификатов соответствия.",
    en: "Government permit fees, construction licenses, certifications, compliance documents, and regulatory approvals."
  },
  office_expenses: {
    ru: "Аренда офиса, канцелярия, почтовые расходы, программное обеспечение, мебель и интернет для бэк-офиса.",
    en: "Office rent, stationery, postage, software subscriptions, office furniture, and admin supplies."
  },
  insurance: {
    ru: "Страхование гражданской ответственности, имущества, строительно-монтажных рисков, медицинские полисы.",
    en: "Liability insurance, commercial property insurance, builder's risk insurance, or group health plans."
  },
  taxes_fees: {
    ru: "Государственные пошлины, налоги на имущество, дорожные сборы, регистрационные платежи.",
    en: "State taxes, duties, property taxes, vehicle registration fees, and government transaction charges."
  },
  subcontracting: {
    ru: "Оплата услуг внешних подрядчиков, фрилансеров, специализированных бригад и сторонних компаний.",
    en: "Payments to third-party sub-contractors, freelancers, specialized agencies, and external labor forces."
  },
  utility_expenses: {
    ru: "Коммунальные услуги: электричество, водоснабжение, отопление, вывоз мусора на объектах и в офисах.",
    en: "Electricity, water, heating, waste disposal, and sewer services for work sites and office premises."
  },
  other: {
    ru: "Прочие операционные расходы, банковские комиссии, представительские расходы, не вошедшие в другие группы.",
    en: "Miscellaneous operating expenses, bank transaction fees, client entertainment, or other unclassified costs."
  }
};

export default function App() {
  // --- Legacy Data Migration ---
  // If we have previous invoices stored under the old key, migrate them to "FacturaScan" business workspace
  const legacyInvoices = localStorage.getItem("factura_scan_invoices");
  if (legacyInvoices) {
    if (!localStorage.getItem("factura_scan_invoices_facturascan")) {
      localStorage.setItem("factura_scan_invoices_facturascan", legacyInvoices);
    }
    if (!localStorage.getItem("factura_scan_active_business")) {
      localStorage.setItem("factura_scan_active_business", "FacturaScan");
    }
    localStorage.removeItem("factura_scan_invoices");
  }

  // --- States ---
  const [activeBusiness, setActiveBusiness] = useState<string>(() => {
    const active = localStorage.getItem("factura_scan_active_business") || "";
    const authorized = sessionStorage.getItem("factura_scan_session_authorized") === "true";
    return active && authorized ? active : "";
  });
  const [businessInput, setBusinessInput] = useState(() => {
    return localStorage.getItem("factura_scan_active_business") || "";
  });
  const [passwordInput, setPasswordInput] = useState("");
  const [passwordConfirmInput, setPasswordConfirmInput] = useState("");
  const [passwordError, setPasswordError] = useState("");
  const [authMode, setAuthMode] = useState<"signin" | "signup">("signin");

  useEffect(() => {
    if (!localStorage.getItem("factura_scan_password_facturascan")) {
      localStorage.setItem("factura_scan_password_facturascan", "1234");
    }
  }, []);

  const hasSavedPassword = useMemo(() => {
    const key = businessInput.toLowerCase().trim();
    if (!key) return false;
    return !!localStorage.getItem(`factura_scan_password_${key}`);
  }, [businessInput]);

  const lastLoadedBusinessRef = useRef<string>(localStorage.getItem("factura_scan_active_business") || "");

  const [isMobileFiltersOpen, setIsMobileFiltersOpen] = useState(false);
  const [invoices, setInvoices] = useState<Invoice[]>(() => {
    const active = localStorage.getItem("factura_scan_active_business") || "";
    if (!active) return [];
    const businessKey = active.toLowerCase().trim();
    const saved = localStorage.getItem(`factura_scan_invoices_${businessKey}`);
    if (saved) {
      try {
        const parsed = JSON.parse(saved);
        if (Array.isArray(parsed)) {
          // Robustly filter out any corrupted or incomplete legacy localStorage states
          const filtered = parsed.filter((inv: any) => {
            return (
              inv &&
              typeof inv === "object" &&
              typeof inv.id === "string" &&
              Array.isArray(inv.items) &&
              inv.items.every((item: any) => item && typeof item === "object")
            );
          });
          if (filtered.length > 0 || businessKey !== "facturascan") {
            return filtered;
          }
        }
      } catch (e) {
        console.error("Failed to parse invoices from localStorage", e);
      }
    }
    return businessKey === "facturascan" ? initialInvoices : [];
  });

  // Active filters and groupings
  const [activeDashboardTab, setActiveDashboardTab] = useState<"months" | "objects" | "interactive" | "management" | "clients">("management");
  const [clients, setClients] = useState<Client[]>(() => {
    const active = localStorage.getItem("factura_scan_active_business") || "";
    if (!active) return [];
    const businessKey = active.toLowerCase().trim();
    const saved = localStorage.getItem(`factura_scan_clients_${businessKey}`);
    if (saved) {
      try {
        const parsed = JSON.parse(saved);
        if (Array.isArray(parsed)) {
          return parsed;
        }
      } catch (e) {
        console.error("Failed to parse clients from localStorage", e);
      }
    }
    return businessKey === "facturascan" ? [
      {
        id: "client-1",
        companyName: "Acme Client Corp",
        contactPerson: "John Doe",
        phone: "+1 (555) 019-2834",
        email: "contact@acme.com",
        projects: ["Consulting"],
      },
      {
        id: "client-2",
        companyName: "Global Brands Corp",
        contactPerson: "Sarah Connor",
        phone: "+1 (555) 014-9988",
        email: "info@globalbrands.com",
        projects: ["Marketing Services"],
      },
      {
        id: "client-3",
        companyName: "Partner Tech Corp",
        contactPerson: "Alex Mercer",
        phone: "+1 (555) 012-3456",
        email: "support@partnertech.com",
        projects: ["Technical Support"],
      }
    ] : [];
  });
  const [selectedReportMonth, setSelectedReportMonth] = useState<string>("all");
  const [selectedReportObject, setSelectedReportObject] = useState<string>("all");
  const [isDashboardCollapsed, setIsDashboardCollapsed] = useState(false);
  const [showProjectsInline, setShowProjectsInline] = useState(false);
  const [showClientManager, setShowClientManager] = useState(false);
  const [showTaxDetails, setShowTaxDetails] = useState(false);
  const [selectedTaxYear, setSelectedTaxYear] = useState<string>("2026");
  const [showNeedsReviewSection, setShowNeedsReviewSection] = useState(false);
  const [activeTaxTab, setActiveTaxTab] = useState<string>("none");
  const handleTaxTabClick = (tabName: string) => {
    setActiveTaxTab(prev => {
      const next = prev === tabName ? "none" : tabName;
      setShowNeedsReviewSection(next === "needsReview");
      return next;
    });
  };
  const [selectedHelpCategory, setSelectedHelpCategory] = useState<string | null>(null);
  const [isClientsSidebarOpen, setIsClientsSidebarOpen] = useState(false);
  const [groupBy, setGroupBy] = useState<"type" | "supplier" | "date" | "category">("type");
  const [activeSection, setActiveSection] = useState<"documents" | "projects" | "revenue" | "expenses" | "profit" | "tax">("documents");
  const [filterType, setFilterType] = useState<"all" | "goods" | "service" | "income" | "expense">("all");
  const [filterCategory, setFilterCategory] = useState<string>("all");
  const [searchSupplier, setSearchSupplier] = useState("");
  const [searchQuery, setSearchQuery] = useState("");
  const [selectedObject, setSelectedObject] = useState("all");
  const [startDate, setStartDate] = useState("");
  const [endDate, setEndDate] = useState("");

  // Memoized unique object names for filtering dropdown
  const uniqueObjects = useMemo(() => {
    const set = new Set<string>();
    
    // Add from clients projects
    if (clients && Array.isArray(clients)) {
      clients.forEach((c) => {
        if (c.projects && Array.isArray(c.projects)) {
          c.projects.forEach((p) => {
            if (p && p.trim()) {
              set.add(p.trim());
            }
          });
        }
      });
    }

    invoices.forEach(inv => {
      if (inv) {
        if (inv.objectName && inv.objectName.trim()) {
          set.add(inv.objectName.trim());
        }
        if (inv.items) {
          inv.items.forEach(item => {
            if (item.objectName && item.objectName.trim()) {
              set.add(item.objectName.trim());
            }
          });
        }
      }
    });
    return Array.from(set).sort();
  }, [invoices, clients]);

  // Memoized unique month strings (YYYY-MM) from invoices
  const uniqueMonths = useMemo(() => {
    const set = new Set<string>();
    invoices.forEach(inv => {
      if (inv && inv.date && inv.date.length >= 7) {
        set.add(inv.date.substring(0, 7));
      }
    });
    return Array.from(set).sort((a, b) => b.localeCompare(a));
  }, [invoices]);

  // UI state
  const [isScanning, setIsScanning] = useState(false);
  const [scanStep, setScanStep] = useState("");
  const [scanError, setScanError] = useState<string | null>(null);
  const [scanSuccess, setScanSuccess] = useState<string | null>(null);
  
  // Modals / Editors
  const [isEditModalOpen, setIsEditModalOpen] = useState(false);
  const [editingInvoice, setEditingInvoice] = useState<Invoice | null>(null);
  const [viewingPhotoInvoice, setViewingPhotoInvoice] = useState<Invoice | null>(null);
  const [invoiceIdToDelete, setInvoiceIdToDelete] = useState<string | null>(null);
  const [editModalError, setEditModalError] = useState<string | null>(null);
  const [showDuplicateWarning, setShowDuplicateWarning] = useState(false);
  const [pendingInvoiceToSave, setPendingInvoiceToSave] = useState<Invoice | null>(null);

  // Locale state: default to 'en'
  const [locale, setLocale] = useState<LocaleType>(() => {
    const saved = localStorage.getItem("factura_scan_locale");
    if (saved === "en" || saved === "ru" || saved === "es") {
      return saved;
    }
    return "en";
  });

  // Keep localStorage in sync
  useEffect(() => {
    if (!activeBusiness) return;
    
    // CRITICAL PRESERVATION CHECK:
    // Only save invoices if the currently active state invoices belong to this specific business workspace.
    // This stops a race condition where changing workspace triggers an immediate sync of the old workspace's (or empty) invoices list.
    if (lastLoadedBusinessRef.current !== activeBusiness) {
      return;
    }

    const businessKey = activeBusiness.toLowerCase().trim();
    try {
      localStorage.setItem(`factura_scan_invoices_${businessKey}`, JSON.stringify(invoices));
    } catch (e: any) {
      if (e.name === "QuotaExceededError" || e.code === 22 || e.number === -2147024882) {
        console.warn("Storage quota exceeded. Initiating self-healing storage reduction...");
        // Keep image previews only for the 2 most recent invoices, strip images for older ones
        const healedInvoices = invoices.map((inv, idx) => {
          if (idx < 2) return inv;
          if (inv.imageUrl) {
            return { ...inv, imageUrl: undefined };
          }
          return inv;
        });

        try {
          localStorage.setItem(`factura_scan_invoices_${businessKey}`, JSON.stringify(healedInvoices));
          // Update local state to match the healed data
          setInvoices(healedInvoices);
          console.log("Self-healing successful! Retained metadata and cleared old preview images.");
        } catch (innerErr) {
          console.error("Storage still exceeded after healing, stripping all images...", innerErr);
          // Strip all invoice image previews entirely
          const stripAll = invoices.map(inv => ({ ...inv, imageUrl: undefined }));
          try {
            localStorage.setItem(`factura_scan_invoices_${businessKey}`, JSON.stringify(stripAll));
            setInvoices(stripAll);
          } catch (lastErr) {
            console.error("Failed to save even with all preview images stripped", lastErr);
          }
        }
      } else {
        console.error("Failed to write to localStorage:", e);
      }
    }
  }, [invoices, activeBusiness]);

  useEffect(() => {
    if (!activeBusiness) return;
    if (lastLoadedBusinessRef.current !== activeBusiness) {
      return;
    }
    const businessKey = activeBusiness.toLowerCase().trim();
    try {
      localStorage.setItem(`factura_scan_clients_${businessKey}`, JSON.stringify(clients));
    } catch (e) {
      console.error("Failed to write clients to localStorage:", e);
    }
  }, [clients, activeBusiness]);

  useEffect(() => {
    localStorage.setItem("factura_scan_active_business", activeBusiness);
  }, [activeBusiness]);

  // Handle business change (loads invoices for chosen business)
  useEffect(() => {
    if (!activeBusiness) {
      setInvoices([]);
      setClients([]);
      lastLoadedBusinessRef.current = "";
      return;
    }
    
    const businessKey = activeBusiness.toLowerCase().trim();
    
    // Load clients
    const savedClients = localStorage.getItem(`factura_scan_clients_${businessKey}`);
    if (savedClients) {
      try {
        const parsed = JSON.parse(savedClients);
        if (Array.isArray(parsed)) {
          setClients(parsed);
        }
      } catch (e) {
        console.error("Failed to parse clients from localStorage on workspace change", e);
      }
    } else {
      const defaultClients = businessKey === "facturascan" ? [
        {
          id: "client-1",
          companyName: "Acme Client Corp",
          contactPerson: "John Doe",
          phone: "+1 (555) 019-2834",
          email: "contact@acme.com",
          projects: ["Consulting"],
        },
        {
          id: "client-2",
          companyName: "Global Brands Corp",
          contactPerson: "Sarah Connor",
          phone: "+1 (555) 014-9988",
          email: "info@globalbrands.com",
          projects: ["Marketing Services"],
        },
        {
          id: "client-3",
          companyName: "Partner Tech Corp",
          contactPerson: "Alex Mercer",
          phone: "+1 (555) 012-3456",
          email: "support@partnertech.com",
          projects: ["Technical Support"],
        }
      ] : [];
      setClients(defaultClients);
    }

    const saved = localStorage.getItem(`factura_scan_invoices_${businessKey}`);
    
    if (saved) {
      try {
        const parsed = JSON.parse(saved);
        if (Array.isArray(parsed)) {
          let validated = parsed.filter((inv: any) => {
            return (
              inv &&
              typeof inv === "object" &&
              typeof inv.id === "string" &&
              Array.isArray(inv.items) &&
              inv.items.every((item: any) => item && typeof item === "object")
            );
          });
          
          // Heal empty state for facturascan demo workspace if it got wiped out
          if (validated.length === 0 && businessKey === "facturascan") {
            validated = initialInvoices;
          }
          
          setInvoices(validated);
          lastLoadedBusinessRef.current = activeBusiness;
          return;
        }
      } catch (e) {
        console.error("Failed to parse invoices from localStorage", e);
      }
    }
    
    // Default to initialInvoices for new workspace if it's the demo business, otherwise start empty
    const defaultInvoices = businessKey === "facturascan" ? initialInvoices : [];
    setInvoices(defaultInvoices);
    lastLoadedBusinessRef.current = activeBusiness;
  }, [activeBusiness]);

  useEffect(() => {
    localStorage.setItem("factura_scan_locale", locale);
  }, [locale]);

  // Active translation dictionary
  const t = translations[locale] || translations["en"];

  const formatCurrency = (val: any, currencyOverride?: string) => {
    const num = typeof val === "number" && !isNaN(val) ? val : 0;
    
    let curr = currencyOverride?.trim() || "";
    
    if (!curr) {
      const config = {
        en: "USD",
        ru: "RUB",
        es: "USD"
      }[locale] || "USD";
      curr = config;
    }

    // Standardize currency string (e.g., '₽' -> 'RUB', '₸' -> 'KZT', '$' -> 'USD', '€' -> 'EUR')
    let standardCode = "USD";
    let isCodeSymbol = false;
    const cleanCurr = curr.toUpperCase();

    if (cleanCurr === "RUB" || cleanCurr === "₽" || cleanCurr === "РУБ" || cleanCurr === "РУБ.") {
      standardCode = "RUB";
    } else if (cleanCurr === "USD" || cleanCurr === "$") {
      standardCode = "USD";
    } else if (cleanCurr === "EUR" || cleanCurr === "€") {
      standardCode = "EUR";
    } else if (cleanCurr === "KZT" || cleanCurr === "₸" || cleanCurr === "ТГ" || cleanCurr === "ТЕНГЕ") {
      standardCode = "KZT";
    } else {
      if (curr.length === 3 && /^[A-Z]{3}$/i.test(curr)) {
        standardCode = curr.toUpperCase();
      } else {
        isCodeSymbol = true;
      }
    }

    if (isCodeSymbol) {
      const formattedNum = new Intl.NumberFormat(locale === "ru" ? "ru-RU" : locale === "es" ? "es-US" : "en-US", {
        maximumFractionDigits: 0,
      }).format(num);
      return locale === "ru" ? `${formattedNum} ${curr}` : `${curr}${formattedNum}`;
    }

    try {
      const intlLocale = locale === "ru" ? "ru-RU" : locale === "es" ? "es-US" : "en-US";
      return new Intl.NumberFormat(intlLocale, {
        style: "currency",
        currency: standardCode,
        maximumFractionDigits: 0,
      }).format(num);
    } catch (e) {
      const formattedNum = new Intl.NumberFormat(locale === "ru" ? "ru-RU" : locale === "es" ? "es-US" : "en-US", {
        maximumFractionDigits: 0,
      }).format(num);
      const symbolMap: Record<string, string> = {
        USD: "$",
        RUB: "₽",
        EUR: "€",
        KZT: "₸",
      };
      const symbol = symbolMap[standardCode] || standardCode;
      return locale === "ru" ? `${formattedNum} ${symbol}` : `${symbol}${formattedNum}`;
    }
  };

  const formatDate = (dateStr: string) => {
    if (!dateStr) return "";
    try {
      const d = new Date(dateStr);
      if (isNaN(d.getTime())) return dateStr;
      const localeMap: Record<string, string> = {
        en: "en-US",
        ru: "ru-RU",
        es: "es-US"
      };
      const activeLocale = localeMap[locale] || "en-US";
      return d.toLocaleDateString(activeLocale, {
        day: "numeric",
        month: "long",
        year: "numeric"
      });
    } catch (e) {
      return dateStr;
    }
  };

  // --- Functions ---
  
  // Handle File Upload & Scan
  const handleFileUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    await processInvoiceFile(file);
  };

  const processInvoiceFile = async (file: File) => {
    setIsScanning(true);
    setScanError(null);
    setScanSuccess(null);
    setScanStep("Чтение файла...");

    try {
      // 1. Compress and convert image
      setScanStep("Сжатие изображения...");
      const dataUrl = await compressImage(file, 1024, 0.7);
      const parts = dataUrl.split(",");
      const mimeType = "image/jpeg"; // compressImage output is always image/jpeg
      const base64Data = parts[1];

      // 2. Mock stateful steps for feedback
      setScanStep("Распознавание текста с помощью Gemini AI...");
      await new Promise(r => setTimeout(r, 1200));
      
      setScanStep("Анализ табличной части, выделение товаров и услуг...");
      await new Promise(r => setTimeout(r, 1000));

      setScanStep("Классификация позиций...");
      
      // 3. API Call
      const response = await fetch("/api/analyze-invoice", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ image: base64Data, mimeType })
      });

      let result;
      const contentType = response.headers.get("content-type");
      if (contentType && contentType.includes("application/json")) {
        result = await response.json();
      }

      if (!response.ok) {
        const errorMsg = result?.error || `Ошибка при анализе на сервере (Код: ${response.status})`;
        throw new Error(errorMsg);
      }

      if (!result || !result.success || !result.invoice) {
        throw new Error(result?.error || "Не удалось корректно распознать счет-фактуру. Пожалуйста, попробуйте другую картинку.");
      }

      // Convert response to Invoice format
      const newInvoice: Invoice = {
        id: "inv-" + Date.now(),
        invoiceNumber: result.invoice.invoiceNumber || "Б/Н",
        supplierName: result.invoice.supplierName || "Неизвестный поставщик",
        date: result.invoice.date || new Date().toISOString().split("T")[0],
        totalAmount: result.invoice.totalAmount || 0,
        imageUrl: dataUrl, // Keep base64 photo preview
        createdAt: new Date().toISOString(),
        currency: result.invoice.currency || (locale === "ru" ? "RUB" : "USD"),
        items: (result.invoice.items || []).map((item: any, idx: number) => ({
          id: `item-${Date.now()}-${idx}`,
          description: item.description || "Товар/Услуга без названия",
          type: (item.type === "service" || item.type === "goods") ? item.type : "goods",
          quantity: typeof item.quantity === "number" ? item.quantity : 1,
          unitPrice: typeof item.unitPrice === "number" ? item.unitPrice : 0,
          totalPrice: typeof item.totalPrice === "number" ? item.totalPrice : 0,
          objectName: item.objectName || undefined,
          expenseCategory: item.expenseCategory || "other"
        }))
      };

      const successMsg = t.scanSuccessExtracted;
      setScanSuccess(successMsg);
      setScanError(null);

      // Open confirming dialog immediately for editing / validating
      setEditingInvoice(newInvoice);
      setIsEditModalOpen(true);
    } catch (err: any) {
      console.warn("Invoice scan failed:", err);
      setScanError(err.message || "Не удалось распознать документ. Пожалуйста, попробуйте другое фото или введите данные вручную.");
    } finally {
      setIsScanning(false);
      setScanStep("");
    }
  };

  // Drag and Drop support
  const [isDragging, setIsDragging] = useState(false);
  const handleDragOver = (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(true);
  };
  const handleDragLeave = () => {
    setIsDragging(false);
  };
  const handleDrop = async (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(false);
    const file = e.dataTransfer.files?.[0];
    if (file && file.type.startsWith("image/")) {
      await processInvoiceFile(file);
    }
  };

  // Trigger empty manual invoice creation
  const handleCreateManual = () => {
    const emptyInvoice: Invoice = {
      id: "inv-" + Date.now(),
      invoiceNumber: "",
      supplierName: "",
      date: new Date().toISOString().split("T")[0],
      totalAmount: 0,
      currency: locale === "ru" ? "RUB" : "USD",
      objectName: "",
      createdAt: new Date().toISOString(),
      items: [
        {
          id: `item-${Date.now()}-0`,
          description: "",
          type: "goods",
          quantity: 1,
          unitPrice: 0,
          totalPrice: 0,
          expenseCategory: "materials"
        }
      ]
    };
    setEditModalError(null);
    setEditingInvoice(emptyInvoice);
    setIsEditModalOpen(true);
  };

  // Edit action for existing invoice
  const handleEditExisting = (invoice: Invoice) => {
    setEditModalError(null);
    setEditingInvoice({ ...invoice, items: invoice.items.map(i => ({ ...i })) });
    setIsEditModalOpen(true);
  };

  // Delete invoice
  const handleDeleteInvoice = (id: string) => {
    setInvoiceIdToDelete(id);
  };

  // Save parsed or edited invoice
  const handleSaveInvoice = (savedInvoice: Invoice) => {
    // Recalculate invoice totals based on items just in case
    const updatedItems = savedInvoice.items.map(item => ({
      ...item,
      totalPrice: item.quantity * item.unitPrice
    }));
    const calculatedTotal = updatedItems.reduce((sum, item) => sum + item.totalPrice, 0);
    
    const finalInvoice: Invoice = {
      ...savedInvoice,
      currency: savedInvoice.currency?.trim() || (locale === "ru" ? "RUB" : "USD"),
      items: updatedItems,
      totalAmount: calculatedTotal
    };

    setInvoices(prev => {
      const exists = prev.some(inv => inv.id === finalInvoice.id);
      if (exists) {
        return prev.map(inv => inv.id === finalInvoice.id ? finalInvoice : inv);
      } else {
        return [finalInvoice, ...prev];
      }
    });

    setIsEditModalOpen(false);
    setEditingInvoice(null);
  };

  const triggerSaveWithDuplicateCheck = (savedInvoice: Invoice) => {
    const isDuplicate = invoices.some(inv => 
      inv.invoiceNumber &&
      inv.invoiceNumber.trim() !== "" &&
      inv.invoiceNumber.trim().toLowerCase() === savedInvoice.invoiceNumber.trim().toLowerCase() &&
      inv.id !== savedInvoice.id
    );

    if (isDuplicate) {
      setPendingInvoiceToSave(savedInvoice);
      setShowDuplicateWarning(true);
    } else {
      handleSaveInvoice(savedInvoice);
    }
  };

  // --- Data Calculations, Filtering, and Grouping ---

  // Helper to format "YYYY-MM" to a readable month string in the active locale
  const formatMonth = (monthKey: string): string => {
    if (!monthKey || monthKey === "unknown") return locale === "ru" ? "Неизвестный месяц" : locale === "es" ? "Mes desconocido" : "Unknown Month";
    const [year, month] = monthKey.split("-");
    const mIndex = parseInt(month, 10) - 1;
    const monthsRU = ["Январь", "Февраль", "Март", "Апрель", "Май", "Июнь", "Июль", "Август", "Сентябрь", "Октябрь", "Ноябрь", "Декабрь"];
    const monthsEN = ["January", "February", "March", "April", "May", "June", "July", "August", "September", "October", "November", "December"];
    const monthsES = ["Enero", "Febrero", "Marzo", "Abril", "Mayo", "Junio", "Julio", "Agosto", "Septiembre", "Octubre", "Noviembre", "Diciembre"];
    
    const monthName = locale === "ru" ? monthsRU[mIndex] : locale === "es" ? monthsES[mIndex] : monthsEN[mIndex];
    return `${monthName} ${year}`;
  };

  const getQuarterFromDate = (dateStr?: string) => {
    if (!dateStr || dateStr.length < 7) return 1;
    const month = parseInt(dateStr.substring(5, 7), 10);
    if (isNaN(month)) return 1;
    return Math.ceil(month / 3);
  };

  const getQuarterLabel = (quarter: number, year?: string) => {
    let base = "";
    if (locale === "ru") {
      base = `${["I", "II", "III", "IV"][quarter - 1]} кв.`;
    } else if (locale === "es") {
      base = `T${quarter}`;
    } else {
      base = `Q${quarter}`;
    }
    return year ? `${base} ${year}` : base;
  };

  const uniqueYears = useMemo(() => {
    const years = new Set<string>();
    invoices.forEach(inv => {
      if (inv && inv.date && inv.date.length >= 4) {
        const yr = inv.date.substring(0, 4);
        if (/^\d{4}$/.test(yr)) {
          years.add(yr);
        }
      }
    });
    if (years.size === 0) {
      years.add("2026");
      years.add("2025");
    }
    return Array.from(years).sort((a, b) => b.localeCompare(a));
  }, [invoices]);

  // Calculate Income, Expense, and Profit metrics memoized from invoices
  const financialMetrics = useMemo(() => {
    const overall: Record<string, { income: number; expense: number; profit: number }> = {};
    const monthly: Record<string, Record<string, { income: number; expense: number; profit: number }>> = {};
    const byObject: Record<string, Record<string, { income: number; expense: number; profit: number }>> = {};

    invoices.forEach(inv => {
      if (!inv) return;
      const type = inv.invoiceType || "expense";
      const currency = inv.currency?.trim() || (locale === "ru" ? "RUB" : "USD");
      const amount = inv.totalAmount || 0;
      
      const objectName = (inv.objectName || "").trim() || (locale === "ru" ? "Без объекта" : locale === "es" ? "Sin objeto" : "No Project");
      
      let monthKey = "unknown";
      if (inv.date && inv.date.length >= 7) {
        monthKey = inv.date.substring(0, 7);
      }

      if (!overall[currency]) {
        overall[currency] = { income: 0, expense: 0, profit: 0 };
      }
      
      if (monthKey !== "unknown") {
        if (!monthly[monthKey]) {
          monthly[monthKey] = {};
        }
        if (!monthly[monthKey][currency]) {
          monthly[monthKey][currency] = { income: 0, expense: 0, profit: 0 };
        }
      }

      if (!byObject[objectName]) {
        byObject[objectName] = {};
      }
      if (!byObject[objectName][currency]) {
        byObject[objectName][currency] = { income: 0, expense: 0, profit: 0 };
      }

      if (type === "income") {
        overall[currency].income += amount;
        overall[currency].profit += amount;

        if (monthKey !== "unknown") {
          monthly[monthKey][currency].income += amount;
          monthly[monthKey][currency].profit += amount;
        }

        byObject[objectName][currency].income += amount;
        byObject[objectName][currency].profit += amount;
      } else {
        overall[currency].expense += amount;
        overall[currency].profit -= amount;

        if (monthKey !== "unknown") {
          monthly[monthKey][currency].expense += amount;
          monthly[monthKey][currency].profit -= amount;
        }

        byObject[objectName][currency].expense += amount;
        byObject[objectName][currency].profit -= amount;
      }
    });

    return { overall, monthly, byObject };
  }, [invoices, locale]);

  // Calculate interactive metrics for the selected Month and selected Object
  const interactiveMetrics = useMemo(() => {
    const metrics: Record<string, { income: number; expense: number; profit: number; tax: number; categories: Record<string, number> }> = {};

    invoices.forEach(inv => {
      if (!inv) return;

      // 1. Filter by Month
      if (selectedReportMonth !== "all") {
        const invMonth = inv.date && inv.date.length >= 7 ? inv.date.substring(0, 7) : "unknown";
        if (invMonth !== selectedReportMonth) return;
      }

      // 2. Filter by Object
      if (selectedReportObject !== "all") {
        const docObject = (inv.objectName || "").trim();
        const standardObjName = docObject || (locale === "ru" ? "Без объекта" : locale === "es" ? "Sin objeto" : "No Project");
        if (standardObjName.toLowerCase() !== selectedReportObject.toLowerCase()) return;
      }

      const currency = inv.currency?.trim() || (locale === "ru" ? "RUB" : "USD");
      const type = inv.invoiceType || "expense";
      const amount = inv.totalAmount || 0;

      if (!metrics[currency]) {
        metrics[currency] = { income: 0, expense: 0, profit: 0, tax: 0, categories: {} };
      }

      if (type === "income") {
        metrics[currency].income += amount;
        metrics[currency].profit += amount;
      } else {
        metrics[currency].expense += amount;
        metrics[currency].profit -= amount;
        
        if (Array.isArray(inv.items)) {
          inv.items.forEach(item => {
            const itemCat = item.expenseCategory || "other";
            const itemAmt = item.totalPrice || 0;
            metrics[currency].categories[itemCat] = (metrics[currency].categories[itemCat] || 0) + itemAmt;
            if (itemCat === "taxes_fees") {
              metrics[currency].tax += itemAmt;
            }
          });
        } else {
          metrics[currency].categories["other"] = (metrics[currency].categories["other"] || 0) + amount;
        }
      }
    });

    return metrics;
  }, [invoices, selectedReportMonth, selectedReportObject, locale]);

  // Calculate management analysis metrics grouped by currency
  const managementAnalysis = useMemo(() => {
    const analysis: Record<string, {
      mostProfitableObject: {
        name: string;
        profit: number;
        income: number;
        expense: number;
      } | null;
      topSuppliers: Array<{
        name: string;
        count: number;
        totalAmount: number;
      }>;
      topCategories: Array<{
        name: string;
        totalAmount: number;
        percentage: number;
      }>;
      mostExpensivePurchase: {
        supplier: string;
        amount: number;
        category: string;
        date: string;
        objectName: string;
      } | null;
      avgReceipt: number;
      totalExpenses: number;
      expensesCount: number;
    }> = {};

    invoices.forEach(inv => {
      if (!inv) return;
      const currency = inv.currency?.trim() || (locale === "ru" ? "RUB" : "USD");
      if (!analysis[currency]) {
        analysis[currency] = {
          mostProfitableObject: null,
          topSuppliers: [],
          topCategories: [],
          mostExpensivePurchase: null,
          avgReceipt: 0,
          totalExpenses: 0,
          expensesCount: 0,
        };
      }
    });

    // Helper structures per currency
    const objectStats: Record<string, Record<string, { income: number; expense: number }>> = {};
    const supplierStats: Record<string, Record<string, { count: number; totalAmount: number }>> = {};
    const categoryStats: Record<string, Record<string, number>> = {};
    const maxPurchase: Record<string, any> = {};
    const totalExpAmount: Record<string, number> = {};
    const expCount: Record<string, number> = {};

    invoices.forEach(inv => {
      if (!inv) return;
      const currency = inv.currency?.trim() || (locale === "ru" ? "RUB" : "USD");
      const type = inv.invoiceType || "expense";
      const amount = inv.totalAmount || 0;
      const rawObject = (inv.objectName || "").trim();
      const objectName = rawObject || (locale === "ru" ? "Без объекта" : locale === "es" ? "Sin objeto" : "No Project");
      const supplier = (inv.supplierName || "").trim() || (locale === "ru" ? "Неизвестный поставщик" : locale === "es" ? "Proveedor desconocido" : "Unknown Supplier");

      // Initialize objectStats
      if (!objectStats[currency]) objectStats[currency] = {};
      if (!objectStats[currency][objectName]) {
        objectStats[currency][objectName] = { income: 0, expense: 0 };
      }

      if (type === "income") {
        objectStats[currency][objectName].income += amount;
      } else {
        objectStats[currency][objectName].expense += amount;
      }

      // Expenses statistics
      if (type === "expense") {
        // supplier
        if (!supplierStats[currency]) supplierStats[currency] = {};
        if (!supplierStats[currency][supplier]) {
          supplierStats[currency][supplier] = { count: 0, totalAmount: 0 };
        }
        supplierStats[currency][supplier].count += 1;
        supplierStats[currency][supplier].totalAmount += amount;

        // category
        if (!categoryStats[currency]) categoryStats[currency] = {};
        let topItemCategory = "other";
        let maxItemPrice = -1;
        if (Array.isArray(inv.items)) {
          inv.items.forEach(item => {
            const itemCat = item.expenseCategory || "other";
            const itemAmt = item.totalPrice || 0;
            categoryStats[currency][itemCat] = (categoryStats[currency][itemCat] || 0) + itemAmt;
            if (itemAmt > maxItemPrice) {
              maxItemPrice = itemAmt;
              topItemCategory = itemCat;
            }
          });
        } else {
          categoryStats[currency]["other"] = (categoryStats[currency]["other"] || 0) + amount;
        }

        // max purchase
        if (!maxPurchase[currency] || amount > maxPurchase[currency].amount) {
          maxPurchase[currency] = {
            supplier,
            amount,
            category: topItemCategory,
            date: inv.date || "",
            objectName,
          };
        }

        // totals
        totalExpAmount[currency] = (totalExpAmount[currency] || 0) + amount;
        expCount[currency] = (expCount[currency] || 0) + 1;
      }
    });

    // Populate the final analysis object for each currency
    Object.keys(analysis).forEach(currency => {
      // 1. Most profitable object
      let bestObj: { name: string; profit: number; income: number; expense: number } | null = null;
      if (objectStats[currency]) {
        Object.entries(objectStats[currency]).forEach(([name, vals]) => {
          const profit = vals.income - vals.expense;
          if (!bestObj || profit > bestObj.profit || (profit === bestObj.profit && vals.income > bestObj.income)) {
            bestObj = { name, profit, income: vals.income, expense: vals.expense };
          }
        });
      }

      // 2. Top suppliers by purchase count (or total amount spent if count is equal)
      const suppliersList: Array<{ name: string; count: number; totalAmount: number }> = [];
      if (supplierStats[currency]) {
        Object.entries(supplierStats[currency]).forEach(([name, val]) => {
          suppliersList.push({ name, count: val.count, totalAmount: val.totalAmount });
        });
        suppliersList.sort((a, b) => {
          if (b.count !== a.count) return b.count - a.count;
          return b.totalAmount - a.totalAmount;
        });
      }

      // 3. Top categories by spending
      const categoriesList: Array<{ name: string; totalAmount: number; percentage: number }> = [];
      const totalSpent = totalExpAmount[currency] || 0;
      if (categoryStats[currency] && totalSpent > 0) {
        Object.entries(categoryStats[currency]).forEach(([name, amt]) => {
          categoriesList.push({
            name,
            totalAmount: amt,
            percentage: Math.round((amt / totalSpent) * 100),
          });
        });
        categoriesList.sort((a, b) => b.totalAmount - a.totalAmount);
      }

      analysis[currency] = {
        mostProfitableObject: bestObj,
        topSuppliers: suppliersList.slice(0, 5), // top 5
        topCategories: categoriesList,
        mostExpensivePurchase: maxPurchase[currency] || null,
        avgReceipt: expCount[currency] ? Math.round(totalSpent / expCount[currency]) : 0,
        totalExpenses: totalSpent,
        expensesCount: expCount[currency] || 0,
      };
    });

    return analysis;
  }, [invoices, locale]);

  // 1. First, flat map or extract items according to current general search & filters
  interface FlattenedRow {
    invoiceId: string;
    invoiceNumber: string;
    supplierName: string;
    date: string;
    imageUrl?: string;
    objectName?: string;
    item: InvoiceItem;
    currency?: string;
    invoiceType?: InvoiceType;
  }

  const allRows: FlattenedRow[] = [];
  invoices.forEach(inv => {
    if (inv && Array.isArray(inv.items)) {
      inv.items.forEach(item => {
        if (item) {
          allRows.push({
            invoiceId: inv.id,
            invoiceNumber: inv.invoiceNumber || "",
            supplierName: inv.supplierName || "",
            date: inv.date || "",
            imageUrl: inv.imageUrl,
            objectName: item.objectName || inv.objectName || "",
            item,
            currency: inv.currency,
            invoiceType: inv.invoiceType || "expense"
          });
        }
      });
    }
  });

  // Apply filters to items
  const filteredRows = allRows.filter(row => {
    // Filter by type (goods / services / income / expense)
    if (filterType !== "all") {
      if (filterType === "income") {
        if (row.invoiceType !== "income") return false;
      } else if (filterType === "expense") {
        if (row.invoiceType === "income") return false;
      } else {
        if (row.invoiceType === "income" || row.item.type !== filterType) {
          return false;
        }
      }
    }
    // Filter by expense category
    if (filterCategory !== "all") {
      const cat = row.item.expenseCategory || "other";
      if (cat !== filterCategory) {
        return false;
      }
    }
    // Filter by Supplier search
    if (searchSupplier && !(row.supplierName || "").toLowerCase().includes(searchSupplier.toLowerCase())) {
      return false;
    }
    // Filter by Object
    if (selectedObject !== "all") {
      const objName = row.objectName || "";
      if (objName.trim().toLowerCase() !== selectedObject.trim().toLowerCase()) {
        return false;
      }
    }
    // General Search (by description, invoice number, supplier, object)
    if (searchQuery) {
      const query = searchQuery.toLowerCase();
      const matchDesc = (row.item?.description || "").toLowerCase().includes(query);
      const matchSupplier = (row.supplierName || "").toLowerCase().includes(query);
      const matchNum = (row.invoiceNumber || "").toLowerCase().includes(query);
      const matchObj = (row.objectName || "").toLowerCase().includes(query);
      if (!matchDesc && !matchSupplier && !matchNum && !matchObj) {
        return false;
      }
    }
    // Date ranges
    if (startDate && row.date < startDate) return false;
    if (endDate && row.date > endDate) return false;

    return true;
  });

  // 2. Perform Grouping on filtered rows
  interface GroupedData {
    groupKey: string;
    groupTitle: string;
    icon?: any;
    totalAmount: number;
    rows: FlattenedRow[];
  }

  const groupedSections: GroupedData[] = [];

  if (groupBy === "type") {
    // Group by Goods vs Services vs Income
    const goodsRows = filteredRows.filter(r => r.item.type === "goods" && r.invoiceType !== "income");
    const servicesRows = filteredRows.filter(r => r.item.type === "service" && r.invoiceType !== "income");
    const incomeRows = filteredRows.filter(r => r.invoiceType === "income");

    if (goodsRows.length > 0 || filterType === "all" || filterType === "goods") {
      groupedSections.push({
        groupKey: "goods",
        groupTitle: t.goodsLabel,
        icon: Package,
        totalAmount: goodsRows.reduce((sum, r) => sum + r.item.totalPrice, 0),
        rows: goodsRows
      });
    }
    if (servicesRows.length > 0 || filterType === "all" || filterType === "service") {
      groupedSections.push({
        groupKey: "service",
        groupTitle: t.servicesLabel,
        icon: Headphones,
        totalAmount: servicesRows.reduce((sum, r) => sum + r.item.totalPrice, 0),
        rows: servicesRows
      });
    }
    if (incomeRows.length > 0 || filterType === "all" || filterType === "income") {
      groupedSections.push({
        groupKey: "income",
        groupTitle: t.incomesLabel,
        icon: TrendingUp,
        totalAmount: incomeRows.reduce((sum, r) => sum + r.item.totalPrice, 0),
        rows: incomeRows
      });
    }
  } else if (groupBy === "supplier") {
    // Group by Supplier Name
    const supplierGroups: { [name: string]: FlattenedRow[] } = {};
    filteredRows.forEach(row => {
      const name = row.supplierName || (locale === "ru" ? "Без поставщика" : locale === "es" ? "Sin proveedor" : "No supplier");
      if (!supplierGroups[name]) {
        supplierGroups[name] = [];
      }
      supplierGroups[name].push(row);
    });

    Object.entries(supplierGroups)
      .sort((a, b) => b[1].reduce((s, r) => s + r.item.totalPrice, 0) - a[1].reduce((s, r) => s + r.item.totalPrice, 0)) // Sort by total sum
      .forEach(([supplier, rows]) => {
        groupedSections.push({
          groupKey: supplier,
          groupTitle: supplier,
          totalAmount: rows.reduce((sum, r) => sum + r.item.totalPrice, 0),
          rows
        });
      });
  } else if (groupBy === "date") {
    // Group by Date of Invoice
    const dateGroups: { [dateStr: string]: FlattenedRow[] } = {};
    filteredRows.forEach(row => {
      const d = row.date || (locale === "ru" ? "Дата не указана" : locale === "es" ? "Fecha no especificada" : "Date not specified");
      if (!dateGroups[d]) {
        dateGroups[d] = [];
      }
      dateGroups[d].push(row);
    });

    Object.entries(dateGroups)
      .sort((a, b) => b[0].localeCompare(a[0])) // Newest first
      .forEach(([dateStr, rows]) => {
        groupedSections.push({
          groupKey: dateStr,
          groupTitle: formatDate(dateStr),
          totalAmount: rows.reduce((sum, r) => sum + r.item.totalPrice, 0),
          rows
        });
      });
  } else if (groupBy === "category") {
    // Group by Expense Category
    const categoryGroups: { [cat: string]: FlattenedRow[] } = {};
    filteredRows.forEach(row => {
      if (row.invoiceType === "income") return; // Skip incomes in expense categorization list
      const cat = row.item.expenseCategory || "other";
      if (!categoryGroups[cat]) {
        categoryGroups[cat] = [];
      }
      categoryGroups[cat].push(row);
    });

    Object.entries(categoryGroups)
      .sort((a, b) => b[1].reduce((s, r) => s + r.item.totalPrice, 0) - a[1].reduce((s, r) => s + r.item.totalPrice, 0)) // Sort by sum descending
      .forEach(([cat, rows]) => {
        groupedSections.push({
          groupKey: cat,
          groupTitle: t.expenseCategories[cat as any] || cat,
          totalAmount: rows.reduce((sum, r) => sum + r.item.totalPrice, 0),
          rows
        });
      });
  }

  // Sums per currency for filtered subset
  const sumsByCurrency: Record<string, { total: number; goods: number; services: number; incomes: number }> = {};
  filteredRows.forEach(row => {
    const c = row.currency || (locale === "ru" ? "RUB" : "USD");
    if (!sumsByCurrency[c]) {
      sumsByCurrency[c] = { total: 0, goods: 0, services: 0, incomes: 0 };
    }
    sumsByCurrency[c].total += row.item.totalPrice;
    if (row.invoiceType === "income") {
      sumsByCurrency[c].incomes += row.item.totalPrice;
    } else if (row.item.type === "goods") {
      sumsByCurrency[c].goods += row.item.totalPrice;
    } else {
      sumsByCurrency[c].services += row.item.totalPrice;
    }
  });

  // Get overall totals by currency for stat blocks
  const totalGoodsByCurrency: Record<string, number> = {};
  const totalServicesByCurrency: Record<string, number> = {};
  const totalIncomesByCurrency: Record<string, number> = {};

  invoices.forEach(inv => {
    const c = inv.currency || (locale === "ru" ? "RUB" : "USD");
    const isIncome = inv.invoiceType === "income";

    if (isIncome) {
      const incomeSum = (inv.items || []).reduce((s, item) => s + (item?.totalPrice || 0), 0);
      if (incomeSum > 0) {
        totalIncomesByCurrency[c] = (totalIncomesByCurrency[c] || 0) + incomeSum;
      }
    } else {
      const goodsSum = (inv.items || []).filter(i => i && i.type === "goods").reduce((s, item) => s + item.totalPrice, 0);
      const servicesSum = (inv.items || []).filter(i => i && i.type === "service").reduce((s, item) => s + item.totalPrice, 0);

      if (goodsSum > 0) {
        totalGoodsByCurrency[c] = (totalGoodsByCurrency[c] || 0) + goodsSum;
      }
      if (servicesSum > 0) {
        totalServicesByCurrency[c] = (totalServicesByCurrency[c] || 0) + servicesSum;
      }
    }
  });

  // Calculate overall stats map for Dashboard KPI Cards
  const totalIncomesMap = useMemo(() => {
    const map: Record<string, number> = {};
    Object.entries(financialMetrics.overall).forEach(([curr, valObj]) => {
      const vals = valObj as { income: number; expense: number; profit: number };
      if (vals.income > 0) {
        map[curr] = vals.income;
      }
    });
    return map;
  }, [financialMetrics]);

  const totalExpensesMap = useMemo(() => {
    const map: Record<string, number> = {};
    Object.entries(financialMetrics.overall).forEach(([curr, valObj]) => {
      const vals = valObj as { income: number; expense: number; profit: number };
      if (vals.expense > 0) {
        map[curr] = vals.expense;
      }
    });
    return map;
  }, [financialMetrics]);

  const netProfitMap = useMemo(() => {
    const map: Record<string, number> = {};
    Object.entries(financialMetrics.overall).forEach(([curr, valObj]) => {
      const vals = valObj as { income: number; expense: number; profit: number };
      map[curr] = vals.profit;
    });
    return map;
  }, [financialMetrics]);

  // Compute quarterly overall analytics and category-wise expenses for Tax panel
  const quarterlyOverallAndCategories = useMemo(() => {
    const data: Record<string, {
      categories: Record<string, number>;
      quarters: Record<number, { income: number; expense: number; profit: number; tax: number }>;
    }> = {};

    invoices.forEach(inv => {
      if (!inv || !inv.date) return;
      const yr = inv.date.substring(0, 4);
      if (yr !== selectedTaxYear) return;

      const currency = inv.currency?.trim() || (locale === "ru" ? "RUB" : "USD");
      const amount = inv.totalAmount || 0;
      const type = inv.invoiceType || "expense";
      const q = getQuarterFromDate(inv.date);

      if (!data[currency]) {
        data[currency] = {
          categories: {},
          quarters: {
            1: { income: 0, expense: 0, profit: 0, tax: 0 },
            2: { income: 0, expense: 0, profit: 0, tax: 0 },
            3: { income: 0, expense: 0, profit: 0, tax: 0 },
            4: { income: 0, expense: 0, profit: 0, tax: 0 },
          }
        };
      }

      if (type === "income") {
        data[currency].quarters[q].income += amount;
        data[currency].quarters[q].profit += amount;
      } else {
        data[currency].quarters[q].expense += amount;
        data[currency].quarters[q].profit -= amount;
        
        if (Array.isArray(inv.items)) {
          inv.items.forEach(item => {
            const itemCat = item.expenseCategory || "other";
            const itemAmt = item.totalPrice || 0;
            data[currency].categories[itemCat] = (data[currency].categories[itemCat] || 0) + itemAmt;
            if (itemCat === "taxes_fees") {
              data[currency].quarters[q].tax += itemAmt;
            }
          });
        } else {
          data[currency].categories["other"] = (data[currency].categories["other"] || 0) + amount;
        }
      }
    });

    return data;
  }, [invoices, selectedTaxYear, locale]);

  const yearlyTaxSummaryData = useMemo(() => {
    const result: Record<string, {
      income: number;
      expense: number;
      profit: number;
      tax: number;
      categories: Record<string, number>;
    }> = {};

    invoices.forEach(inv => {
      if (!inv || !inv.date) return;
      const yr = inv.date.substring(0, 4);
      if (yr !== selectedTaxYear) return;

      const currency = inv.currency?.trim() || (locale === "ru" ? "RUB" : "USD");
      const amount = inv.totalAmount || 0;
      const type = inv.invoiceType || "expense";

      if (!result[currency]) {
        result[currency] = {
          income: 0,
          expense: 0,
          profit: 0,
          tax: 0,
          categories: {
            materials: 0,
            labor: 0,
            equipment_rental: 0,
            fuel: 0,
            permit: 0,
            office_expenses: 0,
            insurance: 0,
            taxes_fees: 0,
            subcontracting: 0,
            utility_expenses: 0,
            other: 0
          }
        };
      }

      if (type === "income") {
        result[currency].income += amount;
        result[currency].profit += amount;
      } else {
        result[currency].expense += amount;
        result[currency].profit -= amount;

        if (Array.isArray(inv.items)) {
          inv.items.forEach(item => {
            const itemCat = item.expenseCategory || "other";
            const itemAmt = item.totalPrice || 0;
            result[currency].categories[itemCat] = (result[currency].categories[itemCat] || 0) + itemAmt;
            if (itemCat === "taxes_fees") {
              result[currency].tax += itemAmt;
            }
          });
        } else {
          result[currency].categories["other"] = (result[currency].categories["other"] || 0) + amount;
        }
      }
    });

    return result;
  }, [invoices, selectedTaxYear, locale]);

  const yearlyTaxSummaryMetrics = useMemo(() => {
    const yrInvoices = invoices.filter(inv => {
      if (!inv || !inv.date) return false;
      return inv.date.substring(0, 4) === selectedTaxYear;
    });

    const totalDocs = yrInvoices.length;

    const uniqueClients = new Set<string>();
    const uniqueProjects = new Set<string>();

    yrInvoices.forEach(inv => {
      const supplier = (inv.supplierName || "").trim();
      if (supplier) {
        uniqueClients.add(supplier);
      }
      const project = (inv.objectName || "").trim();
      if (project) {
        uniqueProjects.add(project);
      }
    });

    const needsReviewInvoices = yrInvoices.filter(inv => {
      if (inv.invoiceType === "income") return false;
      if (!inv.items || inv.items.length === 0) return true;
      return inv.items.some(item => {
        const cat = (item.expenseCategory || "").trim();
        return !cat || cat === "uncategorized";
      });
    });

    const needsReviewCount = needsReviewInvoices.length;
    const categorizedCount = totalDocs - needsReviewCount;
    const readyForIRSPercent = totalDocs > 0 ? Math.round((categorizedCount / totalDocs) * 100) : 100;

    return {
      totalDocs,
      totalClients: uniqueClients.size,
      totalProjects: uniqueProjects.size,
      documentScanned: totalDocs,
      needsReview: needsReviewCount,
      categorized: categorizedCount,
      readyForIRS: readyForIRSPercent,
      needsReviewList: needsReviewInvoices
    };
  }, [invoices, selectedTaxYear]);

  const totalTaxesMap = useMemo(() => {
    const map: Record<string, number> = {};
    Object.entries(quarterlyOverallAndCategories).forEach(([curr, valObj]: [string, any]) => {
      const taxSum = (valObj?.categories && valObj.categories["taxes_fees"]) || 0;
      map[curr] = taxSum;
    });
    return map;
  }, [quarterlyOverallAndCategories]);

  const formatMultiCurrencySum = (sumMap: Record<string, number>) => {
    const entries = Object.entries(sumMap);
    if (entries.length === 0) {
      return formatCurrency(0);
    }
    return entries.map(([curr, val]) => formatCurrency(val, curr)).join(" / ");
  };

  // Calculate quarterly income breakdown (Q1, Q2, Q3, Q4) for incomes by currency
  const quarterlyIncomesByCurrency = useMemo(() => {
    const map: Record<string, Record<number, number>> = {};
    filteredRows.forEach(row => {
      if (row.invoiceType !== "income") return;
      const c = row.currency || (locale === "ru" ? "RUB" : "USD");
      if (!map[c]) {
        map[c] = { 1: 0, 2: 0, 3: 0, 4: 0 };
      }
      const q = getQuarterFromDate(row.date);
      map[c][q] = (map[c][q] || 0) + row.item.totalPrice;
    });
    return map;
  }, [filteredRows, locale]);

  const getGroupTotalStr = (rows: FlattenedRow[]) => {
    const groupSums: Record<string, number> = {};
    rows.forEach(r => {
      const c = r.currency || (locale === "ru" ? "RUB" : "USD");
      groupSums[c] = (groupSums[c] || 0) + r.item.totalPrice;
    });
    return Object.entries(groupSums).map(([curr, val]) => formatCurrency(val, curr)).join(" + ");
  };

  // General dashboard sums for filtered subset (as single-numeric fallbacks if needed)
  const totalFilteredSum = filteredRows.reduce((sum, r) => sum + r.item.totalPrice, 0);
  const goodsFilteredSum = filteredRows.filter(r => r.item.type === "goods" && r.invoiceType !== "income").reduce((sum, r) => sum + r.item.totalPrice, 0);
  const servicesFilteredSum = filteredRows.filter(r => r.item.type === "service" && r.invoiceType !== "income").reduce((sum, r) => sum + r.item.totalPrice, 0);
  const incomesFilteredSum = filteredRows.filter(r => r.invoiceType === "income").reduce((sum, r) => sum + r.item.totalPrice, 0);

  if (!activeBusiness) {
    return (
      <div className="flex flex-col min-h-screen w-full bg-slate-50 text-slate-900 font-sans antialiased justify-center items-center p-4 relative" id="signin-screen">
        {/* Language selector on top right */}
        <div className="absolute top-6 right-6 flex bg-white p-1 rounded-xl border border-slate-200 text-[11px] font-semibold text-slate-500 shadow-xs z-20">
          <button
            onClick={() => setLocale("en")}
            className={`px-3 py-1 rounded-lg transition-all cursor-pointer ${
              locale === "en" ? "bg-slate-900 text-white shadow-xs font-bold" : "hover:text-slate-900"
            }`}
          >
            EN
          </button>
          <button
            onClick={() => setLocale("ru")}
            className={`px-3 py-1 rounded-lg transition-all cursor-pointer ${
              locale === "ru" ? "bg-slate-900 text-white shadow-xs font-bold" : "hover:text-slate-900"
            }`}
          >
            RU
          </button>
          <button
            onClick={() => setLocale("es")}
            className={`px-3 py-1 rounded-lg transition-all cursor-pointer ${
              locale === "es" ? "bg-slate-900 text-white shadow-xs font-bold" : "hover:text-slate-900"
            }`}
          >
            ES
          </button>
        </div>

        <div className="w-full max-w-md bg-white border border-slate-200/90 rounded-2xl p-8 shadow-xs relative z-10 transition-all duration-200">
          <div className="flex flex-col items-center text-center mb-8">
            <div className="bg-slate-900 p-3.5 rounded-xl text-amber-400 shadow-xs border border-slate-800 mb-4 flex items-center justify-center">
              <Building className="w-7 h-7" />
            </div>
            <h2 className="text-xl font-bold text-slate-900 tracking-tight mb-1.5">
              {t.signInTitle}
            </h2>
            <p className="text-xs text-slate-500 leading-relaxed max-w-sm">
              {t.signInSubtitle}
            </p>
          </div>

          {/* Auth Tab Switcher */}
          <div className="flex bg-slate-100 p-1 rounded-xl mb-6 border border-slate-200/60">
            <button
              type="button"
              onClick={() => {
                setAuthMode("signin");
                setPasswordError("");
              }}
              className={`flex-1 py-2 text-xs font-semibold rounded-lg transition-all cursor-pointer ${
                authMode === "signin"
                  ? "bg-white text-slate-900 shadow-xs border border-slate-200/80 font-bold"
                  : "text-slate-600 hover:text-slate-900"
              }`}
            >
              {t.authModeSignIn}
            </button>
            <button
              type="button"
              onClick={() => {
                setAuthMode("signup");
                setPasswordError("");
              }}
              className={`flex-1 py-2 text-xs font-semibold rounded-lg transition-all cursor-pointer ${
                authMode === "signup"
                  ? "bg-white text-slate-900 shadow-xs border border-slate-200/80 font-bold"
                  : "text-slate-600 hover:text-slate-900"
              }`}
            >
              {t.authModeSignUp}
            </button>
          </div>

          <form
            onSubmit={(e) => {
              e.preventDefault();
              const name = businessInput.trim();
              if (!name) return;

              const psw = passwordInput.trim();
              if (!psw) {
                setPasswordError(
                  locale === "ru"
                    ? "Пожалуйста, введите пароль."
                    : locale === "es"
                    ? "Por favor, ingrese la contraseña."
                    : "Please enter a password."
                );
                return;
              }

              const businessKey = name.toLowerCase().trim();
              const savedPassword = localStorage.getItem(`factura_scan_password_${businessKey}`);

              if (authMode === "signup") {
                // Sign Up flow
                const pswConf = passwordConfirmInput.trim();
                if (!pswConf) {
                  setPasswordError(
                    locale === "ru"
                      ? "Пожалуйста, подтвердите пароль."
                      : locale === "es"
                      ? "Por favor, confirme la contraseña."
                      : "Please confirm your password."
                  );
                  return;
                }

                if (psw !== pswConf) {
                  setPasswordError(t.passwordErrorMismatch);
                  return;
                }

                if (savedPassword) {
                  setPasswordError(t.passwordErrorAlreadyExists);
                  return;
                }

                // Register successfully
                localStorage.setItem(`factura_scan_password_${businessKey}`, psw);
              } else {
                // Sign In flow
                if (!savedPassword && businessKey !== "facturascan") {
                  setPasswordError(t.passwordErrorNotFound);
                  return;
                }

                const effectivePassword = savedPassword || (businessKey === "facturascan" ? "1234" : "");
                if (psw !== effectivePassword) {
                  setPasswordError(t.passwordErrorIncorrect);
                  return;
                }
              }

              // Access success
              setPasswordError("");
              setActiveBusiness(name);
              localStorage.setItem("factura_scan_active_business", name);
              sessionStorage.setItem("factura_scan_session_authorized", "true");
            }}
            className="space-y-4.5"
          >
            <div>
              <label htmlFor="business-name-input" className="block text-[11px] font-semibold text-slate-600 uppercase tracking-wider mb-1.5">
                {locale === "ru" ? "Название вашего бизнеса" : locale === "es" ? "Nombre de su negocio" : "Business / Organization Name"}
              </label>
              <div className="relative">
                <span className="absolute inset-y-0 left-0 flex items-center pl-3.5 pointer-events-none text-slate-400">
                  <Building className="w-4 h-4" />
                </span>
                <input
                  id="business-name-input"
                  type="text"
                  required
                  value={businessInput}
                  onChange={(e) => {
                    setBusinessInput(e.target.value);
                    setPasswordError("");
                  }}
                  placeholder={t.businessNamePlaceholder}
                  className="w-full pl-10 pr-4 py-2.5 bg-white border border-slate-200 hover:border-slate-300 focus:border-slate-900 rounded-xl text-xs transition-all focus:outline-none focus:ring-1 focus:ring-slate-900/10 placeholder:text-slate-400 font-medium text-slate-900 shadow-xs"
                  autoFocus
                />
              </div>
            </div>

            <div>
              <label htmlFor="business-password-input" className="block text-[11px] font-semibold text-slate-600 uppercase tracking-wider mb-1.5">
                {t.passwordLabel}
              </label>
              <div className="relative">
                <span className="absolute inset-y-0 left-0 flex items-center pl-3.5 pointer-events-none text-slate-400">
                  <Lock className="w-4 h-4" />
                </span>
                <input
                  id="business-password-input"
                  type="password"
                  required
                  value={passwordInput}
                  onChange={(e) => {
                    setPasswordInput(e.target.value);
                    setPasswordError("");
                  }}
                  placeholder={t.passwordPlaceholder}
                  className="w-full pl-10 pr-4 py-2.5 bg-white border border-slate-200 hover:border-slate-300 focus:border-slate-900 rounded-xl text-xs transition-all focus:outline-none focus:ring-1 focus:ring-slate-900/10 placeholder:text-slate-400 font-medium text-slate-900 shadow-xs"
                />
              </div>
            </div>

            {authMode === "signup" && (
              <div>
                <label htmlFor="business-password-confirm-input" className="block text-[11px] font-semibold text-slate-600 uppercase tracking-wider mb-1.5">
                  {t.passwordConfirmLabel}
                </label>
                <div className="relative">
                  <span className="absolute inset-y-0 left-0 flex items-center pl-3.5 pointer-events-none text-slate-400">
                    <Lock className="w-4 h-4" />
                  </span>
                  <input
                    id="business-password-confirm-input"
                    type="password"
                    required
                    value={passwordConfirmInput}
                    onChange={(e) => {
                      setPasswordConfirmInput(e.target.value);
                      setPasswordError("");
                    }}
                    placeholder={t.passwordConfirmPlaceholder}
                    className="w-full pl-10 pr-4 py-2.5 bg-white border border-slate-200 hover:border-slate-300 focus:border-slate-900 rounded-xl text-xs transition-all focus:outline-none focus:ring-1 focus:ring-slate-900/10 placeholder:text-slate-400 font-medium text-slate-900 shadow-xs"
                  />
                </div>
              </div>
            )}

            {/* Dynamic Helper Hint */}
            {businessInput.trim() && (
              <div className="mt-2 text-[11px] text-slate-500 flex items-start gap-1 text-left">
                <span className="inline-block mt-0.5">•</span>
                <span>
                  {authMode === "signup" ? (
                    t.passwordHintSignUp
                  ) : (
                    hasSavedPassword ? t.passwordHintExisting : t.passwordErrorNotFound
                  )}
                  {businessInput.toLowerCase().trim() === "facturascan" && (
                    <span className="block font-semibold text-amber-700 mt-0.5">
                      {locale === "ru"
                        ? "Пароль по умолчанию: 1234"
                        : locale === "es"
                        ? "Contraseña por defecto: 1234"
                        : "Default password: 1234"}
                    </span>
                  )}
                </span>
              </div>
            )}

            {/* Error Message */}
            {passwordError && (
              <div className="flex items-center gap-2 text-rose-700 bg-rose-50 border border-rose-200/80 p-3 rounded-xl text-xs font-semibold text-left">
                <AlertCircle className="w-4 h-4 flex-shrink-0" />
                <span>{passwordError}</span>
              </div>
            )}

            <button
              type="submit"
              disabled={!businessInput.trim() || !passwordInput.trim() || (authMode === "signup" && !passwordConfirmInput.trim())}
              className="w-full bg-slate-900 hover:bg-slate-800 disabled:opacity-50 disabled:pointer-events-none text-white py-3 rounded-xl font-semibold text-xs shadow-xs hover:shadow transition-all cursor-pointer flex items-center justify-center gap-2 border border-slate-950/20 active:scale-[0.99]"
              id="btn-submit-signin"
            >
              <span>{authMode === "signup" ? t.btnSignUp : t.btnSignIn}</span>
              <LogIn className="w-4 h-4" />
            </button>
          </form>

          <div className="text-center mt-4 text-xs">
            <button
              type="button"
              onClick={() => {
                setBusinessInput("FacturaScan");
                setPasswordInput("1234");
                setPasswordConfirmInput("1234");
                setPasswordError("");
                setAuthMode("signin");
                setActiveBusiness("FacturaScan");
                localStorage.setItem("factura_scan_active_business", "FacturaScan");
                sessionStorage.setItem("factura_scan_session_authorized", "true");
                // Explicitly reload the fresh demo mock invoices containing Costco, Marshalls, etc.
                localStorage.setItem("factura_scan_invoices_facturascan", JSON.stringify(initialInvoices));
              }}
              className="text-amber-700 hover:text-amber-800 font-semibold underline underline-offset-4 cursor-pointer text-xs"
              id="btn-try-demo-direct"
            >
              {t.tryDemoLink}
            </button>
          </div>

          {/* Additional footer brand note */}
          <div className="mt-6 pt-5 border-t border-slate-100 text-center flex flex-col items-center gap-1">
            <div className="flex items-center gap-1 text-[10px] font-bold tracking-wider text-slate-400 uppercase">
              <FileText className="w-3.5 h-3.5 text-slate-500" />
              <span>FacturaScan Pro</span>
            </div>
            <p className="text-[10px] text-slate-400">
              {locale === "ru" ? "Ваши данные сохраняются локально для выбранного кабинета" : locale === "es" ? "Sus datos se guardan localmente para el gabinete seleccionado" : "Your data is stored locally for the chosen workspace"}
            </p>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="flex flex-col h-screen w-full bg-[#fafaf9] text-slate-900 font-sans antialiased overflow-hidden">
      
      {/* Top Header */}
      <header className="min-h-16 h-auto py-3 sm:py-0 sm:h-16 bg-white border-b border-stone-200/60 flex flex-col sm:flex-row items-start sm:items-center justify-between px-4 sm:px-6 flex-shrink-0 z-10 gap-3 sm:gap-4 shadow-[0_1px_3px_rgba(0,0,0,0.015)]" id="main-header">
        <div className="flex items-center gap-3">
          <div className="bg-slate-900 p-2 rounded-xl text-amber-500 shadow-sm border border-slate-800">
            <Building className="w-5.5 h-5.5" />
          </div>
          <div>
            <h1 className="text-sm font-bold font-display uppercase tracking-wider text-slate-900 flex items-center gap-2">
              {activeBusiness} <span className="text-[10px] tracking-widest font-bold text-amber-700 bg-amber-50 border border-amber-200/40 px-2 py-0.5 rounded-full font-mono">{t.currentWorkspace}</span>
            </h1>
            <p className="text-[10px] text-slate-400 font-semibold tracking-wide uppercase mt-0.5">{t.appSubtitle}</p>
          </div>
        </div>

        {/* Action Controls */}
        <div className="flex flex-wrap items-center gap-2 sm:gap-3 w-full sm:w-auto">
          {/* Mobile Filters Toggle */}
          <button
            onClick={() => setIsMobileFiltersOpen(prev => !prev)}
            className="lg:hidden flex items-center gap-1.5 bg-slate-100 hover:bg-slate-200 text-slate-700 px-3 py-2 rounded-lg font-bold text-xs transition-all cursor-pointer border border-stone-200/40"
          >
            <Filter className={`w-3.5 h-3.5 ${isMobileFiltersOpen ? "text-amber-500 animate-pulse" : "text-slate-500"}`} />
            <span>{t.quickFilters}</span>
          </button>

          {/* Language Selector */}
          <div className="flex bg-slate-100/70 p-0.5 rounded-lg border border-slate-200/40 text-[10px] font-bold text-slate-500" id="language-selector">
            <button
              onClick={() => setLocale("en")}
              className={`px-2 py-1 rounded-md transition-all cursor-pointer ${
                locale === "en" ? "bg-white text-slate-900 shadow-sm border border-slate-200/20" : "hover:text-slate-800"
              }`}
            >
              EN
            </button>
            <button
              onClick={() => setLocale("ru")}
              className={`px-2 py-1 rounded-md transition-all cursor-pointer ${
                locale === "ru" ? "bg-white text-slate-900 shadow-sm border border-slate-200/20" : "hover:text-slate-800"
              }`}
            >
              RU
            </button>
            <button
              onClick={() => setLocale("es")}
              className={`px-2 py-1 rounded-md transition-all cursor-pointer ${
                locale === "es" ? "bg-white text-slate-900 shadow-sm border border-slate-200/20" : "hover:text-slate-800"
              }`}
            >
              ES
            </button>
          </div>

          {/* Switch Workspace Button */}
          <button
            onClick={() => {
              setActiveBusiness("");
              setBusinessInput("");
              setPasswordInput("");
              setPasswordError("");
              localStorage.removeItem("factura_scan_active_business");
              sessionStorage.removeItem("factura_scan_session_authorized");
            }}
            className="flex items-center gap-1.5 bg-rose-50 hover:bg-rose-100 text-rose-700 px-3 py-2 rounded-lg font-bold text-xs transition-all cursor-pointer border border-rose-200/40 shadow-sm"
            id="btn-switch-business"
            title={t.btnSwitchBusiness}
          >
            <LogOut className="w-3.5 h-3.5" />
            <span className="hidden sm:inline">{t.btnSwitchBusiness}</span>
          </button>

          {/* Reset to Demo Data Button (Only for FacturaScan workspace) */}
          {activeBusiness.toLowerCase().trim() === "facturascan" && (
            <button
              onClick={() => {
                const isConfirmed = window.confirm(
                  locale === "ru" 
                    ? "Вы уверены, что хотите сбросить данные кабинета и загрузить исходные счет-фактуры от Costco, Marshalls и т.д.?" 
                    : locale === "es"
                    ? "¿Está seguro de que desea restablecer los datos y cargar las facturas de prueba de Costco, Marshalls, etc.?"
                    : "Are you sure you want to reset workspace data and reload the default Costco, Marshalls, etc. invoices?"
                );
                if (isConfirmed) {
                  setInvoices(initialInvoices);
                  localStorage.setItem("factura_scan_invoices_facturascan", JSON.stringify(initialInvoices));
                }
              }}
              className="flex items-center gap-1.5 bg-amber-50 hover:bg-amber-100 text-amber-700 px-3 py-2 rounded-lg font-bold text-xs transition-all cursor-pointer border border-amber-200/40 shadow-sm"
              id="btn-reset-demo-data"
              title={locale === "ru" ? "Сбросить до демо-данных" : "Reset to Demo Data"}
            >
              <RefreshCw className="w-3.5 h-3.5" />
              <span className="hidden sm:inline">{locale === "ru" ? "Сбросить демо" : "Reset Demo"}</span>
            </button>
          )}

          <button
            onClick={() => exportInvoicesToExcel(invoices, locale, {
              filterType,
              filterCategory,
              searchSupplier,
              searchQuery,
              selectedObject,
              startDate,
              endDate
            })}
            disabled={invoices.length === 0}
            className="flex items-center gap-2 bg-white hover:bg-slate-50 disabled:opacity-40 disabled:hover:bg-white text-slate-700 px-3.5 py-2 rounded-lg font-semibold text-xs border border-slate-200/60 transition-all cursor-pointer shadow-sm"
            id="btn-export-excel"
          >
            <FileSpreadsheet className="w-4 h-4 text-emerald-600" />
            <span className="hidden sm:inline">{t.exportExcel}</span>
          </button>

          <button
            onClick={() => exportInvoicesToPdf(invoices, locale, {
              filterType,
              filterCategory,
              searchSupplier,
              searchQuery,
              selectedObject,
              startDate,
              endDate
            })}
            disabled={invoices.length === 0}
            className="flex items-center gap-2 bg-white hover:bg-slate-50 disabled:opacity-40 disabled:hover:bg-white text-slate-700 px-3.5 py-2 rounded-lg font-semibold text-xs border border-slate-200/60 transition-all cursor-pointer shadow-sm"
            id="btn-export-pdf"
          >
            <FileText className="w-4 h-4 text-rose-600" />
            <span className="hidden sm:inline">{t.exportPdf}</span>
          </button>

          <label
            className="flex items-center gap-2 bg-slate-950 hover:bg-slate-900 text-white px-4 py-2 rounded-lg font-bold text-xs shadow-sm hover:shadow transition-all cursor-pointer border border-slate-950/20 tracking-wider uppercase"
            id="btn-scan-receipt"
          >
            <Upload className="w-4 h-4 text-amber-400" />
            <span className="hidden sm:inline">{t.scanPhoto}</span>
            <input
              type="file"
              accept="image/*"
              onChange={handleFileUpload}
              className="hidden"
            />
          </label>

          <button
            onClick={() => setIsClientsSidebarOpen(prev => !prev)}
            className={`flex items-center gap-1.5 border px-3.5 py-2 rounded-lg font-bold text-xs transition-all shadow-sm cursor-pointer tracking-wider uppercase ${
              isClientsSidebarOpen 
                ? "bg-slate-900 text-amber-400 border-slate-900" 
                : "bg-white hover:bg-slate-50 text-slate-800 border-slate-200/80"
            }`}
            id="btn-toggle-clients-sidebar"
          >
            <Users className="w-4 h-4" />
            <span>{t.clients}</span>
          </button>

          <button
            onClick={handleCreateManual}
            className="flex items-center gap-1.5 bg-white hover:bg-slate-50 text-slate-800 border border-slate-200/80 px-3.5 py-2 rounded-lg font-bold text-xs transition-all shadow-sm cursor-pointer tracking-wider uppercase"
            id="btn-add-manual"
          >
            <Plus className="w-4 h-4 text-slate-500" />
            <span className="hidden sm:inline">{t.addManual}</span>
          </button>
        </div>
      </header>

      {/* Main Grid View */}
      <main className="flex flex-1 overflow-hidden relative">
        
        {/* Backdrop for mobile filters drawer */}
        {activeSection === "documents" && isMobileFiltersOpen && (
          <div
            className="fixed inset-0 bg-slate-900/40 backdrop-blur-xs z-20 lg:hidden transition-opacity"
            onClick={() => setIsMobileFiltersOpen(false)}
          />
        )}

        {/* Sidebar / Filters panel (Responsive drawer on mobile, static sidebar on desktop) */}
        {activeSection === "documents" && (
          <aside className={`
            fixed inset-y-0 left-0 z-30 w-80 bg-white border-r border-slate-200/80 flex flex-col p-6 flex-shrink-0 overflow-y-auto transition-transform duration-300 ease-in-out
            lg:static lg:translate-x-0 lg:z-0
            ${isMobileFiltersOpen ? "translate-x-0 shadow-xl" : "-translate-x-full lg:shadow-none"}
          `} id="sidebar-filters">
          
          {/* Mobile Header for Filters Panel */}
          <div className="lg:hidden flex items-center justify-between pb-4 mb-4 border-b border-slate-150">
            <span className="text-[10px] font-bold text-slate-400 uppercase tracking-widest">{t.quickFilters}</span>
            <button
              onClick={() => setIsMobileFiltersOpen(false)}
              className="p-1.5 bg-slate-50 hover:bg-slate-100 border border-slate-200/60 rounded-lg text-slate-500 hover:text-slate-900 transition-colors cursor-pointer"
            >
              <X className="w-4 h-4" />
            </button>
          </div>
          <div className="space-y-6">
            
            {/* Grouping Section */}
            <div>
              <label className="text-[10px] font-bold text-slate-400 uppercase tracking-widest mb-3 block">{t.grouping}</label>
              <div className="space-y-1.5" id="group-buttons-container">
                <button
                  onClick={() => setGroupBy("type")}
                  className={`w-full flex items-center justify-between px-3.5 py-2.5 rounded-xl text-xs font-semibold uppercase tracking-wider transition-all cursor-pointer ${
                    groupBy === "type"
                      ? "bg-slate-900 text-white shadow-xs font-bold"
                      : "text-slate-600 hover:bg-slate-50 hover:text-slate-900 border border-transparent"
                  }`}
                >
                  <span className="flex items-center gap-2.5">
                    <Layers className={`w-4 h-4 ${groupBy === "type" ? "text-amber-400" : "text-slate-400"}`} />
                    {t.groupByType}
                  </span>
                  {groupBy === "type" && <div className="w-1.5 h-1.5 bg-amber-400 rounded-full animate-pulse" />}
                </button>

                <button
                  onClick={() => setGroupBy("supplier")}
                  className={`w-full flex items-center justify-between px-3.5 py-2.5 rounded-xl text-xs font-semibold uppercase tracking-wider transition-all cursor-pointer ${
                    groupBy === "supplier"
                      ? "bg-slate-900 text-white shadow-xs font-bold"
                      : "text-slate-600 hover:bg-slate-50 hover:text-slate-900 border border-transparent"
                  }`}
                >
                  <span className="flex items-center gap-2.5">
                    <FileText className={`w-4 h-4 ${groupBy === "supplier" ? "text-amber-400" : "text-slate-400"}`} />
                    {t.groupBySupplier}
                  </span>
                  {groupBy === "supplier" && <div className="w-1.5 h-1.5 bg-amber-400 rounded-full animate-pulse" />}
                </button>

                <button
                  onClick={() => setGroupBy("date")}
                  className={`w-full flex items-center justify-between px-3.5 py-2.5 rounded-xl text-xs font-semibold uppercase tracking-wider transition-all cursor-pointer ${
                    groupBy === "date"
                      ? "bg-slate-900 text-white shadow-xs font-bold"
                      : "text-slate-600 hover:bg-slate-50 hover:text-slate-900 border border-transparent"
                  }`}
                >
                  <span className="flex items-center gap-2.5">
                    <Calendar className={`w-4 h-4 ${groupBy === "date" ? "text-amber-400" : "text-slate-400"}`} />
                    {t.groupByDate}
                  </span>
                  {groupBy === "date" && <div className="w-1.5 h-1.5 bg-amber-400 rounded-full animate-pulse" />}
                </button>

                <button
                  onClick={() => setGroupBy("category")}
                  className={`w-full flex items-center justify-between px-3.5 py-2.5 rounded-xl text-xs font-semibold uppercase tracking-wider transition-all cursor-pointer ${
                    groupBy === "category"
                      ? "bg-slate-900 text-white shadow-xs font-bold"
                      : "text-slate-600 hover:bg-slate-50 hover:text-slate-900 border border-transparent"
                  }`}
                >
                  <span className="flex items-center gap-2.5">
                    <Folder className={`w-4 h-4 ${groupBy === "category" ? "text-amber-400" : "text-slate-400"}`} />
                    {t.groupByCategory || "By Category"}
                  </span>
                  {groupBy === "category" && <div className="w-1.5 h-1.5 bg-amber-400 rounded-full animate-pulse" />}
                </button>
              </div>
            </div>

            {/* Quick Filters */}
            <div className="pt-5 border-t border-slate-100">
              <div className="flex items-center justify-between mb-3.5">
                <label className="text-[10px] font-bold text-slate-400 uppercase tracking-widest block">{t.quickFilters}</label>
                {(filterType !== "all" || filterCategory !== "all" || searchSupplier || searchQuery || startDate || endDate || selectedObject !== "all") && (
                  <button
                    onClick={() => {
                      setFilterType("all");
                      setFilterCategory("all");
                      setSearchSupplier("");
                      setSearchQuery("");
                      setStartDate("");
                      setEndDate("");
                      setSelectedObject("all");
                    }}
                    className="text-[10px] text-amber-700 hover:text-amber-800 hover:underline font-bold tracking-wider uppercase cursor-pointer"
                  >
                    {t.resetFilters}
                  </button>
                )}
              </div>
              
              <div className="space-y-4">
                {/* Search Text */}
                <div>
                  <span className="text-[10px] text-slate-400 font-bold uppercase tracking-wider mb-1.5 block">{t.searchLabel}</span>
                  <div className="relative">
                    <Search className="w-4 h-4 absolute left-3 top-2.5 text-slate-400" />
                    <input
                      type="text"
                      placeholder={t.searchPlaceholder}
                      value={searchQuery}
                      onChange={(e) => setSearchQuery(e.target.value)}
                      className="w-full border border-slate-200 bg-slate-50/70 rounded-xl pl-9 pr-3 py-2 text-xs font-semibold text-slate-800 outline-none focus:bg-white focus:border-slate-400 focus:ring-2 focus:ring-slate-900/10 transition-all placeholder:text-slate-400"
                    />
                  </div>
                </div>

                {/* Filter Goods / Services */}
                <div>
                  <span className="text-[10px] text-slate-400 font-bold uppercase tracking-wider mb-1.5 block">{t.itemTypeLabel}</span>
                  <select
                    value={filterType}
                    onChange={(e) => setFilterType(e.target.value as any)}
                    className="w-full border border-slate-200 bg-slate-50/70 rounded-xl px-3 py-2 text-xs font-semibold text-slate-700 outline-none focus:bg-white focus:border-slate-400 focus:ring-2 focus:ring-slate-900/10 transition-all cursor-pointer"
                  >
                    <option value="all">{t.allTypes}</option>
                    <option value="goods">{t.goods}</option>
                    <option value="service">{t.services}</option>
                    <option value="expense">{t.expenses}</option>
                    <option value="income">{t.incomes}</option>
                  </select>
                </div>

                {/* Filter Expense Category */}
                <div>
                  <span className="text-[10px] text-slate-400 font-bold uppercase tracking-wider mb-1.5 block">{t.labelExpenseCategory}</span>
                  <select
                    value={filterCategory}
                    onChange={(e) => setFilterCategory(e.target.value)}
                    className="w-full border border-slate-200 bg-slate-50/70 rounded-xl px-3 py-2 text-xs font-bold text-slate-700 outline-none focus:bg-white focus:border-slate-400 focus:ring-2 focus:ring-slate-900/10 transition-all cursor-pointer"
                  >
                    <option value="all">{t.filterExpenseCategory}</option>
                    {Object.entries(t.expenseCategories).map(([key, label]) => (
                      <option key={key} value={key}>{label}</option>
                    ))}
                  </select>
                </div>

                {/* Filter Supplier Name */}
                <div>
                  <span className="text-[10px] text-slate-400 font-bold uppercase tracking-wider mb-1.5 block">{t.supplierLabel}</span>
                  <div className="relative">
                    <input
                      type="text"
                      placeholder={t.allSuppliersPlaceholder}
                      value={searchSupplier}
                      onChange={(e) => setSearchSupplier(e.target.value)}
                      className="w-full border border-slate-200 bg-slate-50/70 rounded-xl px-3 py-2 text-xs font-semibold text-slate-800 outline-none focus:bg-white focus:border-slate-400 focus:ring-2 focus:ring-slate-900/10 transition-all placeholder:text-slate-400"
                    />
                  </div>
                </div>

                {/* Filter Object / Project */}
                <div>
                  <span className="text-[10px] text-slate-400 font-bold uppercase tracking-wider mb-1.5 block">{t.fieldObjectName}</span>
                  <select
                    value={selectedObject}
                    onChange={(e) => setSelectedObject(e.target.value)}
                    className="w-full border border-slate-200 bg-slate-50/70 rounded-xl px-3 py-2 text-xs font-bold text-slate-700 outline-none focus:bg-white focus:border-slate-400 focus:ring-2 focus:ring-slate-900/10 transition-all cursor-pointer"
                  >
                    <option value="all">{t.filterObjectName}</option>
                    {uniqueObjects.map(obj => (
                      <option key={obj} value={obj}>{obj}</option>
                    ))}
                  </select>
                </div>

                {/* Filter Date range */}
                <div>
                  <span className="text-[10px] text-slate-400 font-bold uppercase tracking-wider mb-1.5 block">{t.periodLabel}</span>
                  <div className="grid grid-cols-2 gap-2">
                    <input
                      type="date"
                      value={startDate}
                      onChange={(e) => setStartDate(e.target.value)}
                      className="w-full border border-slate-200 bg-slate-50/70 rounded-xl p-1.5 text-xs font-semibold text-slate-700 outline-none focus:bg-white focus:border-slate-400 transition-all"
                    />
                    <input
                      type="date"
                      value={endDate}
                      onChange={(e) => setEndDate(e.target.value)}
                      className="w-full border border-slate-200 bg-slate-50/70 rounded-xl p-1.5 text-xs font-semibold text-slate-700 outline-none focus:bg-white focus:border-slate-400 transition-all"
                    />
                  </div>
                </div>
              </div>
            </div>

            {/* Total Budget Card */}
            <div className="pt-5 border-t border-slate-100">
              <div className="p-5 bg-slate-900 text-white rounded-2xl shadow-xs border border-slate-800 relative overflow-hidden space-y-4">
                <div className="absolute right-[-20px] top-[-20px] w-24 h-24 bg-amber-500/10 rounded-full blur-2xl pointer-events-none" />
                <div className="absolute left-[-20px] bottom-[-20px] w-24 h-24 bg-indigo-500/10 rounded-full blur-2xl pointer-events-none" />
                <p className="text-[10px] text-slate-400 font-bold uppercase tracking-widest mb-1.5">{t.filteredSumLabel}</p>
                
                {Object.keys(sumsByCurrency).length === 0 ? (
                  <h3 className="text-2xl font-black text-amber-300 font-mono tracking-tight">{formatCurrency(0)}</h3>
                ) : (
                  Object.entries(sumsByCurrency).map(([currCode, val], i) => (
                    <div key={currCode} className={`${i > 0 ? "pt-3.5 border-t border-slate-800/60" : ""}`}>
                      <div className="flex items-center justify-between mb-1.5">
                        <span className="text-[9px] font-bold text-amber-400 font-mono bg-slate-800 border border-slate-700/60 px-1.5 py-0.5 rounded">
                          {currCode}
                        </span>
                        <h3 className="text-xl font-black text-amber-300 font-mono tracking-tight">
                          {formatCurrency(val.total, currCode)}
                        </h3>
                      </div>
                      <div className="text-[10px] text-slate-400 flex justify-between flex-wrap gap-2">
                        <span>{t.goods}: <strong className="text-indigo-300 font-mono">{formatCurrency(val.goods, currCode)}</strong></span>
                        <span>{t.services}: <strong className="text-emerald-300 font-mono">{formatCurrency(val.services, currCode)}</strong></span>
                        <span>{t.incomes}: <strong className="text-amber-300 font-mono">{formatCurrency(val.incomes, currCode)}</strong></span>
                      </div>
                    </div>
                  ))
                )}
              </div>
            </div>

          </div>
        </aside>
        )}

        {/* Center Contents */}
        <div className="flex-1 flex flex-col overflow-y-auto">
          
          {/* Dashboard Stats Panel */}
          <div className="p-4 sm:p-6 pb-2 grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-6 gap-3 sm:gap-4 bg-[#fcfcfd] flex-shrink-0" id="top-quick-stats">
            <button
              onClick={() => {
                setActiveSection("documents");
                setFilterType("all");
                setSearchSupplier("");
                setSearchQuery("");
                setSelectedObject("all");
                setStartDate("");
                setEndDate("");
              }}
              className={`w-full text-left bg-white p-5 rounded-2xl border transition-all flex items-center justify-between group cursor-pointer ${
                activeSection === "documents"
                  ? "border-slate-900 ring-1 ring-slate-900/10 shadow-xs"
                  : "border-slate-200/80 shadow-2xs hover:border-slate-300 hover:shadow-xs"
              }`}
            >
              <div>
                <span className="text-slate-400 text-[10px] uppercase tracking-widest font-bold block">{t.totalDocuments}</span>
                <h4 className="text-2xl font-bold font-display mt-1.5 text-slate-900 group-hover:scale-[1.01] transition-transform">
                  {invoices.length} <span className="text-xs text-slate-400 font-medium tracking-normal font-sans">{locale === "ru" ? "шт" : locale === "es" ? "uds" : "pcs"}</span>
                </h4>
              </div>
              <div className={`p-3 rounded-xl border transition-all duration-300 ${
                activeSection === "documents"
                  ? "bg-slate-900 text-amber-400 border-slate-900"
                  : "bg-slate-50 text-slate-700 border-slate-200/60 group-hover:bg-slate-900 group-hover:text-amber-400"
              }`}>
                <FileText className="w-5 h-5" />
              </div>
            </button>

            <button
              onClick={() => {
                setActiveSection("projects");
                setFilterType("all");
                setSearchSupplier("");
                setSearchQuery("");
                setSelectedObject("all");
                setStartDate("");
                setEndDate("");
              }}
              className={`w-full text-left bg-white p-5 rounded-2xl border transition-all flex items-center justify-between group cursor-pointer ${
                activeSection === "projects"
                  ? "border-slate-900 ring-1 ring-slate-900/10 shadow-xs"
                  : "border-slate-200/80 shadow-2xs hover:border-slate-300 hover:shadow-xs"
              }`}
            >
              <div>
                <span className="text-slate-400 text-[10px] uppercase tracking-widest font-bold block">{t.totalProjects}</span>
                <h4 className="text-2xl font-bold font-display mt-1.5 text-slate-900 group-hover:scale-[1.01] transition-transform">
                  {uniqueObjects.length} <span className="text-xs text-slate-400 font-medium tracking-normal font-sans">
                    {locale === "ru" 
                      ? "объект." 
                      : locale === "es" 
                      ? "proy." 
                      : "proj."}
                  </span>
                </h4>
              </div>
              <div className={`p-3 rounded-xl border transition-all duration-300 ${
                activeSection === "projects"
                  ? "bg-slate-900 text-amber-400 border-slate-900"
                  : "bg-slate-50 text-slate-700 border-slate-200/60 group-hover:bg-slate-900 group-hover:text-amber-400"
              }`}>
                <Folder className="w-5 h-5" />
              </div>
            </button>

            <button
              onClick={() => {
                setActiveSection("revenue");
                setFilterType("income");
                setSearchSupplier("");
                setSearchQuery("");
                setSelectedObject("all");
                setStartDate("");
                setEndDate("");
              }}
              className={`w-full text-left bg-white p-5 rounded-2xl border transition-all flex items-center justify-between group cursor-pointer ${
                activeSection === "revenue"
                  ? "border-amber-500 ring-1 ring-amber-500/20 shadow-xs"
                  : "border-slate-200/80 shadow-2xs hover:border-slate-300 hover:shadow-xs"
              }`}
            >
              <div>
                <span className="text-slate-400 text-[10px] uppercase tracking-widest font-bold block">{t.revenue}</span>
                <h4 className="text-lg font-bold mt-1.5 text-slate-900 font-mono group-hover:scale-[1.01] transition-transform truncate" title={formatMultiCurrencySum(totalIncomesMap)}>
                  {formatMultiCurrencySum(totalIncomesMap)}
                </h4>
              </div>
              <div className={`p-3 rounded-xl border transition-all duration-300 ${
                activeSection === "revenue"
                  ? "bg-slate-900 text-amber-400 border-slate-900"
                  : "bg-amber-50 text-amber-600 border-amber-200/60 group-hover:bg-slate-900 group-hover:text-amber-400"
              }`}>
                <TrendingUp className="w-5 h-5" />
              </div>
            </button>

            <button
              onClick={() => {
                setActiveSection("expenses");
                setFilterType("expense");
                setSearchSupplier("");
                setSearchQuery("");
                setSelectedObject("all");
                setStartDate("");
                setEndDate("");
              }}
              className={`w-full text-left bg-white p-5 rounded-2xl border transition-all flex items-center justify-between group cursor-pointer ${
                activeSection === "expenses"
                  ? "border-rose-500 ring-1 ring-rose-500/20 shadow-xs"
                  : "border-slate-200/80 shadow-2xs hover:border-slate-300 hover:shadow-xs"
              }`}
            >
              <div>
                <span className="text-slate-400 text-[10px] uppercase tracking-widest font-bold block">{t.expenses}</span>
                <h4 className="text-lg font-bold mt-1.5 text-slate-900 font-mono group-hover:scale-[1.01] transition-transform truncate" title={formatMultiCurrencySum(totalExpensesMap)}>
                  {formatMultiCurrencySum(totalExpensesMap)}
                </h4>
              </div>
              <div className={`p-3 rounded-xl border transition-all duration-300 ${
                activeSection === "expenses"
                  ? "bg-slate-900 text-rose-400 border-slate-900"
                  : "bg-rose-50 text-rose-600 border-rose-200/60 group-hover:bg-slate-900 group-hover:text-rose-400"
              }`}>
                <TrendingDown className="w-5 h-5" />
              </div>
            </button>

            <button
              onClick={() => {
                setActiveSection("profit");
                setFilterType("all");
                setSearchSupplier("");
                setSearchQuery("");
                setSelectedObject("all");
                setStartDate("");
                setEndDate("");
              }}
              className={`w-full text-left bg-white p-5 rounded-2xl border transition-all flex items-center justify-between group cursor-pointer ${
                activeSection === "profit"
                  ? "border-emerald-500 ring-1 ring-emerald-500/20 shadow-xs"
                  : "border-slate-200/80 shadow-2xs hover:border-slate-300 hover:shadow-xs"
              }`}
            >
              <div>
                <span className="text-slate-400 text-[10px] uppercase tracking-widest font-bold block">{t.profit}</span>
                <h4 className="text-lg font-bold mt-1.5 text-slate-900 font-mono group-hover:scale-[1.01] transition-transform truncate" title={formatMultiCurrencySum(netProfitMap)}>
                  {formatMultiCurrencySum(netProfitMap)}
                </h4>
              </div>
              <div className={`p-3 rounded-xl border transition-all duration-300 ${
                activeSection === "profit"
                  ? "bg-slate-900 text-emerald-400 border-slate-900"
                  : "bg-emerald-50 text-emerald-600 border-emerald-200/60 group-hover:bg-slate-900 group-hover:text-emerald-400"
              }`}>
                <DollarSign className="w-5 h-5" />
              </div>
            </button>

            <button
              onClick={() => {
                setActiveSection("tax");
                setFilterType("all");
                setSearchSupplier("");
                setSearchQuery("");
                setSelectedObject("all");
                setStartDate("");
                setEndDate("");
              }}
              className={`w-full text-left bg-white p-5 rounded-2xl border transition-all flex items-center justify-between group cursor-pointer ${
                activeSection === "tax"
                  ? "border-red-500 ring-1 ring-red-500/20 shadow-xs"
                  : "border-slate-200/80 shadow-2xs hover:border-slate-300 hover:shadow-xs"
              }`}
            >
              <div>
                <span className="text-slate-400 text-[10px] uppercase tracking-widest font-bold block">{t.taxAndQuartersTitle}</span>
                <h4 className="text-lg font-bold mt-1.5 text-slate-900 font-mono group-hover:scale-[1.01] transition-transform truncate" title={formatMultiCurrencySum(totalTaxesMap)}>
                  {formatMultiCurrencySum(totalTaxesMap)}
                </h4>
              </div>
              <div className={`p-3 rounded-xl border transition-all duration-300 ${
                activeSection === "tax"
                  ? "bg-slate-900 text-red-400 border-slate-900"
                  : "bg-red-50 text-red-600 border-red-200/60 group-hover:bg-slate-900 group-hover:text-red-400"
              }`}>
                <Percent className="w-5 h-5" />
              </div>
            </button>
          </div>

          {/* DYNAMIC SECTION VIEWS (Projects, Revenue, Expenses, Profit) */}

          {activeSection === "projects" && (
            <div 
              id="projects-container" 
              className="mx-4 sm:mx-6 mb-6 p-6 bg-white border border-slate-200/80 rounded-2xl shadow-xs animate-fadeIn"
            >
              <div className="flex items-center justify-between border-b border-slate-100 pb-4 mb-5">
                <div className="flex items-center gap-3">
                  <div className="bg-slate-900 text-amber-400 p-2.5 rounded-xl border border-slate-900">
                    <Folder className="w-5 h-5" />
                  </div>
                  <div>
                    <h3 className="text-sm font-bold text-slate-900 tracking-tight">
                      {locale === "ru" ? "Карточки и аналитика объектов" : locale === "es" ? "Fichas y analíticas de proyectos" : "Project Cards & Analytics"}
                    </h3>
                    <p className="text-[10px] text-slate-400 font-semibold uppercase tracking-wider mt-0.5">
                      {locale === "ru" ? "Информация по каждому объекту: адреса, суммы контрактов, доходы, расходы и графики" : locale === "es" ? "Detalles por proyecto: direcciones, contratos, ingresos, gastos y gráficos" : "Details for each object: addresses, contract amounts, income, expenses, and charts"}
                    </p>
                  </div>
                </div>
              </div>

              <ProjectsTabContent
                clients={clients}
                invoices={invoices}
                locale={locale}
                t={t}
                formatCurrency={formatCurrency}
              />
            </div>
          )}

          {activeSection === "revenue" && (
            <div 
              id="revenue-container" 
              className="mx-4 sm:mx-6 mb-6 p-6 bg-white border border-slate-200/80 rounded-2xl shadow-xs animate-fadeIn space-y-6"
            >
              <div className="flex items-center justify-between border-b border-slate-100 pb-4">
                <div className="flex items-center gap-3">
                  <div className="bg-slate-900 text-amber-400 p-2.5 rounded-xl border border-slate-900">
                    <TrendingUp className="w-5 h-5" />
                  </div>
                  <div>
                    <h3 className="text-sm font-bold text-slate-900 tracking-tight">
                      {locale === "ru" ? "Аналитика доходов (Revenue)" : "Revenue & Income Analytics"}
                    </h3>
                    <p className="text-[10px] text-slate-400 font-semibold uppercase tracking-wider mt-0.5">
                      {locale === "ru" ? "Анализ выручки в разрезе клиентов, проектов и календарных периодов" : "Detailed breakdown of incoming payments, customer contributions, and quarterly flows"}
                    </p>
                  </div>
                </div>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                {/* Multi-currency revenue cards */}
                <div className="bg-slate-50/70 border border-slate-200/70 rounded-xl p-5 flex flex-col justify-between">
                  <span className="text-[10px] text-slate-400 uppercase tracking-widest font-black block mb-3">
                    💰 {locale === "ru" ? "Общий Доход по Валютам" : "Total Revenue by Currency"}
                  </span>
                  <div className="space-y-3">
                    {Object.entries(totalIncomesMap).map(([curr, val]) => (
                      <div key={curr} className="flex items-center justify-between py-1.5 border-b border-slate-100 last:border-0">
                        <span className="text-xs font-bold text-slate-500 font-mono">{curr}</span>
                        <span className="text-lg font-extrabold text-slate-900 font-mono">{formatCurrency(val, curr)}</span>
                      </div>
                    ))}
                    {Object.keys(totalIncomesMap).length === 0 && (
                      <span className="text-xs text-slate-400 italic">{locale === "ru" ? "Нет данных" : "No income data"}</span>
                    )}
                  </div>
                </div>

                {/* Top paying clients card */}
                <div className="bg-slate-50/70 border border-slate-200/70 rounded-xl p-5 col-span-2 flex flex-col justify-between">
                  <span className="text-[10px] text-slate-400 uppercase tracking-widest font-black block mb-3">
                    👥 {locale === "ru" ? "Доходы в разрезе Клиентов" : "Income by Client/Customer"}
                  </span>
                  <div className="space-y-2 max-h-[160px] overflow-y-auto pr-1">
                    {(() => {
                      // Compute total income per client
                      const clientIncomes: Record<string, Record<string, number>> = {};
                      invoices.forEach(inv => {
                        if (!inv || inv.invoiceType !== "income") return;
                        const clientName = (inv.supplierName || "").trim() || (locale === "ru" ? "Без клиента" : "No Client");
                        const curr = inv.currency?.trim() || (locale === "ru" ? "RUB" : "USD");
                        const amount = inv.totalAmount || 0;
                        if (!clientIncomes[clientName]) {
                          clientIncomes[clientName] = {};
                        }
                        clientIncomes[clientName][curr] = (clientIncomes[clientName][curr] || 0) + amount;
                      });

                      const entries = Object.entries(clientIncomes);
                      if (entries.length === 0) {
                        return <div className="text-xs text-slate-400 italic py-2">{locale === "ru" ? "Нет данных о клиентах" : "No client income records"}</div>;
                      }

                      return entries.map(([client, sums]) => (
                        <div key={client} className="flex items-center justify-between p-2.5 bg-white border border-slate-200/80 rounded-lg hover:border-amber-400 transition-colors">
                          <span className="text-xs font-black text-slate-800">{client}</span>
                          <div className="text-right space-y-0.5">
                            {Object.entries(sums).map(([curr, val]) => (
                              <span key={curr} className="block text-xs font-bold text-amber-700 font-mono">
                                {formatCurrency(val, curr)}
                              </span>
                            ))}
                          </div>
                        </div>
                      ));
                    })()}
                  </div>
                </div>
              </div>

              {/* Quarterly Incomes Grid */}
              <div className="space-y-3">
                <span className="text-[10px] text-slate-400 uppercase tracking-widest font-black block">
                  📊 {locale === "ru" ? "Поступления по Кварталам" : "Quarterly Income Breakdown"}
                </span>
                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
                  {[1, 2, 3, 4].map(q => {
                    const qIncomes: Record<string, number> = {};
                    invoices.forEach(inv => {
                      if (!inv || inv.invoiceType !== "income" || !inv.date) return;
                      // Extract quarter
                      const parts = inv.date.split("-");
                      const month = parts[1] ? parseInt(parts[1], 10) : 1;
                      const invQ = Math.ceil(month / 3);
                      if (invQ !== q) return;
                      const curr = inv.currency?.trim() || (locale === "ru" ? "RUB" : "USD");
                      qIncomes[curr] = (qIncomes[curr] || 0) + (inv.totalAmount || 0);
                    });

                    const hasData = Object.keys(qIncomes).length > 0;
                    return (
                      <div key={q} className="bg-slate-50/70 border border-slate-200/70 p-4 rounded-xl flex flex-col justify-between hover:border-amber-400 transition-colors">
                        <div className="flex flex-col mb-2">
                          <span className="text-[9px] font-black uppercase tracking-wider text-slate-400">
                            {locale === "ru" ? `${q}-й Квартал` : `Quarter ${q}`}
                          </span>
                          <span className="text-[10px] text-slate-500 font-bold font-mono">
                            {q === 1 ? "I (Jan-Mar)" : q === 2 ? "II (Apr-Jun)" : q === 3 ? "III (Jul-Sep)" : "IV (Oct-Dec)"}
                          </span>
                        </div>
                        {hasData ? (
                          <div className="space-y-1 mt-1 text-right">
                            {Object.entries(qIncomes).map(([curr, val]) => (
                              <span key={curr} className="block text-xs font-black text-emerald-600 font-mono">
                                +{formatCurrency(val, curr)}
                              </span>
                            ))}
                          </div>
                        ) : (
                          <span className="text-[10px] text-slate-400 italic block py-0.5">{locale === "ru" ? "Нет поступлений" : "No income"}</span>
                        )}
                      </div>
                    );
                  })}
                </div>
              </div>

              {/* Client Manager Toggle & Content */}
              <div className="pt-4 border-t border-slate-100 flex flex-col gap-4">
                <div className="flex items-center justify-between">
                  <div>
                    <h4 className="text-xs font-bold text-slate-800">👤 {locale === "ru" ? "Управление Базой Клиентов" : "Client Directory & Details"}</h4>
                    <p className="text-[10px] text-slate-400 font-semibold">{locale === "ru" ? "Просмотр реквизитов, контактов, договоров и добавление новых заказчиков" : "Add or modify company information, contact details, and custom contract values"}</p>
                  </div>
                  <button
                    onClick={() => setShowClientManager(prev => !prev)}
                    className={`inline-flex items-center gap-1.5 px-4 py-2 rounded-xl text-xs font-bold transition-all cursor-pointer border ${
                      showClientManager
                        ? "bg-slate-900 text-amber-400 border-slate-900 shadow-xs"
                        : "bg-white hover:bg-slate-50 border-slate-200 text-slate-700 hover:text-slate-900"
                    }`}
                  >
                    <span>{showClientManager ? (locale === "ru" ? "Скрыть редактор" : "Hide Directory") : (locale === "ru" ? "Открыть редактор" : "Manage Clients")}</span>
                  </button>
                </div>

                {showClientManager && (
                  <div className="p-4 bg-slate-50/50 border border-slate-200/70 rounded-xl animate-fadeIn">
                    <ClientsTabContent
                      clients={clients}
                      setClients={setClients}
                      invoices={invoices}
                      locale={locale}
                      t={t}
                      formatCurrency={formatCurrency}
                      formatMultiCurrencySum={formatMultiCurrencySum}
                      uniqueObjects={uniqueObjects}
                    />
                  </div>
                )}
              </div>
            </div>
          )}

          {activeSection === "expenses" && (
            <div 
              id="expenses-container" 
              className="mx-4 sm:mx-6 mb-6 p-6 bg-white border border-slate-200/80 rounded-2xl shadow-xs animate-fadeIn space-y-6"
            >
              <div className="flex items-center justify-between border-b border-slate-100 pb-4">
                <div className="flex items-center gap-3">
                  <div className="bg-slate-900 text-rose-400 p-2.5 rounded-xl border border-slate-900">
                    <TrendingDown className="w-5 h-5" />
                  </div>
                  <div>
                    <h3 className="text-sm font-bold text-slate-900 tracking-tight">
                      {locale === "ru" ? "Аналитика расходов (Expenses)" : "Expense & Cost Analytics"}
                    </h3>
                    <p className="text-[10px] text-slate-400 font-semibold uppercase tracking-wider mt-0.5">
                      {locale === "ru" ? "Анализ расходных категорий, основных поставщиков и крупнейших закупок" : "Analysis of cost categories, primary suppliers, and top purchases"}
                    </p>
                  </div>
                </div>
              </div>

              {/* Expense Specific Bento Grid */}
              <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                
                {/* Total expenses by currency */}
                <div className="bg-slate-50/70 border border-slate-200/70 rounded-xl p-5 flex flex-col justify-between">
                  <span className="text-[10px] text-slate-400 uppercase tracking-widest font-black block mb-3">
                    🛑 {locale === "ru" ? "Расходы по Валютам" : "Total Expenses by Currency"}
                  </span>
                  <div className="space-y-3">
                    {Object.entries(totalExpensesMap).map(([curr, val]) => (
                      <div key={curr} className="flex items-center justify-between py-1.5 border-b border-slate-100 last:border-0">
                        <span className="text-xs font-bold text-slate-500 font-mono">{curr}</span>
                        <span className="text-lg font-extrabold text-slate-900 font-mono">{formatCurrency(val, curr)}</span>
                      </div>
                    ))}
                    {Object.keys(totalExpensesMap).length === 0 && (
                      <span className="text-xs text-slate-400 italic">{locale === "ru" ? "Нет данных" : "No expense data"}</span>
                    )}
                  </div>
                </div>

                {/* Most expensive purchase spotlight */}
                <div className="bg-slate-50/70 border border-slate-200/70 rounded-xl p-5 col-span-2 flex flex-col justify-between">
                  <span className="text-[10px] text-slate-400 uppercase tracking-widest font-black block mb-2">
                    🎯 {locale === "ru" ? "Крупнейшая Единовременная Покупка" : "Most Expensive Single Purchase"}
                  </span>
                  {(() => {
                    let maxPurchaseItem: any = null;
                    let maxAmount = 0;
                    let maxCurrency = "";
                    let maxInv: any = null;

                    invoices.forEach(inv => {
                      if (!inv || inv.invoiceType === "income") return;
                      const items = inv.items || [];
                      items.forEach(item => {
                        if (item && item.totalPrice > maxAmount) {
                          maxAmount = item.totalPrice;
                          maxCurrency = inv.currency?.trim() || (locale === "ru" ? "RUB" : "USD");
                          maxPurchaseItem = item;
                          maxInv = inv;
                        }
                      });
                    });

                    if (!maxPurchaseItem) {
                      return <div className="text-xs text-slate-400 italic py-2">{locale === "ru" ? "Нет данных" : "No record found"}</div>;
                    }

                    return (
                      <div className="bg-white border border-slate-200/80 p-4 rounded-xl flex items-center justify-between gap-4">
                        <div className="space-y-1">
                          <span className="text-[9px] bg-rose-50 border border-rose-200/60 text-rose-700 px-2 py-0.5 rounded-full font-bold uppercase tracking-wider">
                            {t.expenseCategories[maxPurchaseItem.expenseCategory || "other"] || maxPurchaseItem.expenseCategory || "other"}
                          </span>
                          <h4 className="text-sm font-black text-slate-900 mt-1 leading-tight">{maxPurchaseItem.description}</h4>
                          <div className="flex items-center gap-2 text-slate-500 text-[11px] font-medium pt-1">
                            <span>🤝 {maxInv.supplierName || "Supplier"}</span>
                            <span>•</span>
                            <span>📅 {maxInv.date}</span>
                          </div>
                        </div>
                        <div className="text-right flex-shrink-0">
                          <span className="text-lg font-black text-rose-600 font-mono">
                            {formatCurrency(maxAmount, maxCurrency)}
                          </span>
                          <span className="block text-[9px] text-slate-400 font-medium">Qty: {maxPurchaseItem.quantity}</span>
                        </div>
                      </div>
                    );
                  })()}
                </div>
              </div>

              {/* Expense Category Distribution */}
              <div className="space-y-3">
                <span className="text-[10px] text-slate-400 uppercase tracking-widest font-black block">
                  📊 {locale === "ru" ? "Распределение по Категориям Расходов" : "Expense Category Distribution"}
                </span>
                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3.5">
                  {(() => {
                    // Compute sums by categories
                    const categorySums: Record<string, number> = {};
                    let grandTotal = 0;
                    invoices.forEach(inv => {
                      if (!inv || inv.invoiceType === "income") return;
                      const items = inv.items || [];
                      items.forEach(item => {
                        if (item) {
                          const cat = item.expenseCategory || "other";
                          categorySums[cat] = (categorySums[cat] || 0) + item.totalPrice;
                          grandTotal += item.totalPrice;
                        }
                      });
                    });

                    return Object.entries(t.expenseCategories).map(([key, label]) => {
                      const amount = categorySums[key] || 0;
                      const percentage = grandTotal > 0 ? Math.round((amount / grandTotal) * 100) : 0;
                      const isSelectedHelp = selectedHelpCategory === key;

                      return (
                        <div 
                          key={key} 
                          className={`p-4 rounded-xl border transition-all flex flex-col justify-between ${
                            isSelectedHelp 
                              ? "bg-amber-50/20 border-amber-400/80 shadow-2xs" 
                              : "bg-slate-50/50 border-slate-200/60 hover:bg-slate-50 hover:border-slate-300"
                          }`}
                        >
                          <div className="flex items-center justify-between mb-2">
                            <span className="text-xs font-black text-slate-800 flex items-center gap-1.5">
                              {label}
                            </span>
                            <button
                              onClick={() => setSelectedHelpCategory(isSelectedHelp ? null : key)}
                              className="p-1 hover:bg-white rounded border border-slate-200/60 text-slate-400 hover:text-slate-800 transition-colors cursor-pointer"
                              title={locale === "ru" ? "Показать описание категории" : "Show category description"}
                            >
                              <Info className="w-3.5 h-3.5" />
                            </button>
                          </div>
                          
                          <div className="mt-2 space-y-1.5">
                            <div className="flex items-end justify-between text-xs">
                              <span className="font-mono font-black text-slate-900">
                                {formatCurrency(amount, locale === "ru" ? "RUB" : "USD")}
                              </span>
                              <span className="text-[10px] text-slate-400 font-bold font-mono">{percentage}%</span>
                            </div>
                            <div className="w-full bg-slate-200/80 h-1.5 rounded-full overflow-hidden">
                              <div 
                                className="bg-rose-500 h-full rounded-full transition-all duration-500" 
                                style={{ width: `${percentage}%` }}
                              />
                            </div>
                          </div>

                          {isSelectedHelp && (
                            <div className="mt-3 p-2.5 bg-white border border-amber-200 rounded-lg text-[11px] text-slate-600 leading-relaxed animate-fadeIn">
                              <p className="font-semibold text-amber-800 mb-0.5">{label}</p>
                              {categoryExplanations[key]?.[locale] || categoryExplanations[key]?.en}
                            </div>
                          )}
                        </div>
                      );
                    });
                  })()}
                </div>
              </div>

              {/* Top suppliers spend list */}
              <div className="space-y-3">
                <span className="text-[10px] text-slate-400 uppercase tracking-widest font-black block">
                  🏢 {locale === "ru" ? "Топ-Поставщики по Объему Закупок" : "Top Suppliers by Spent Volume"}
                </span>
                <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                  {(() => {
                    const supplierSpend: Record<string, { total: number; count: number; currencies: Set<string> }> = {};
                    invoices.forEach(inv => {
                      if (!inv || inv.invoiceType === "income") return;
                      const supplier = (inv.supplierName || "").trim() || (locale === "ru" ? "Без поставщика" : "No Supplier");
                      const curr = inv.currency?.trim() || (locale === "ru" ? "RUB" : "USD");
                      const amt = inv.totalAmount || 0;

                      if (!supplierSpend[supplier]) {
                        supplierSpend[supplier] = { total: 0, count: 0, currencies: new Set() };
                      }
                      supplierSpend[supplier].total += amt;
                      supplierSpend[supplier].count += 1;
                      supplierSpend[supplier].currencies.add(curr);
                    });

                    const sortedSuppliers = Object.entries(supplierSpend)
                      .sort((a, b) => b[1].total - a[1].total)
                      .slice(0, 6);

                    if (sortedSuppliers.length === 0) {
                      return <div className="text-xs text-slate-400 italic py-2 col-span-3">{locale === "ru" ? "Нет данных" : "No data available"}</div>;
                    }

                    return sortedSuppliers.map(([name, data]) => (
                      <div key={name} className="bg-slate-50/50 border border-slate-200/70 p-4 rounded-xl flex items-center justify-between">
                        <div className="space-y-0.5">
                          <h4 className="text-xs font-black text-slate-800 truncate max-w-[150px]">{name}</h4>
                          <span className="text-[10px] text-slate-400 font-semibold uppercase tracking-wider block">
                            {data.count} {locale === "ru" ? "документов" : "documents"}
                          </span>
                        </div>
                        <span className="text-xs font-extrabold text-rose-600 font-mono">
                          {formatCurrency(data.total, Array.from(data.currencies)[0] || (locale === "ru" ? "RUB" : "USD"))}
                        </span>
                      </div>
                    ));
                  })()}
                </div>
              </div>
            </div>
          )}

          {activeSection === "profit" && (
            <div 
              id="profit-container" 
              className="mx-4 sm:mx-6 mb-6 p-6 bg-white border border-slate-200/80 rounded-2xl shadow-xs animate-fadeIn space-y-6"
            >
              <div className="flex items-center justify-between border-b border-slate-100 pb-4">
                <div className="flex items-center gap-3">
                  <div className="bg-slate-900 text-emerald-400 p-2.5 rounded-xl border border-slate-900">
                    <DollarSign className="w-5 h-5" />
                  </div>
                  <div>
                    <h3 className="text-sm font-bold text-slate-900 tracking-tight">
                      {locale === "ru" ? "Чистая прибыль и эффективность (Net Profit)" : "Business Performance & Net Profit"}
                    </h3>
                    <p className="text-[10px] text-slate-400 font-semibold uppercase tracking-wider mt-0.5">
                      {locale === "ru" ? "Оценка рентабельности бизнеса, баланс доходов и расходов, наиболее прибыльные объекты" : "Evaluation of profitability, margin ratios, and project performance"}
                    </p>
                  </div>
                </div>
              </div>

              {/* Profit Bento Grid */}
              <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                
                {/* Net Profit by Currency */}
                <div className="bg-slate-50/70 border border-slate-200/70 rounded-xl p-5 flex flex-col justify-between">
                  <span className="text-[10px] text-slate-400 uppercase tracking-widest font-black block mb-3">
                    📈 {locale === "ru" ? "Прибыль по Валютам" : "Net Profit by Currency"}
                  </span>
                  <div className="space-y-3">
                    {Object.entries(netProfitMap).map(([curr, val]) => {
                      const numVal = val as number;
                      const isPositive = numVal >= 0;
                      return (
                        <div key={curr} className="flex items-center justify-between py-1.5 border-b border-slate-100 last:border-0">
                          <span className="text-xs font-bold text-slate-500 font-mono">{curr}</span>
                          <span className={`text-lg font-black font-mono ${isPositive ? "text-emerald-600" : "text-rose-600"}`}>
                            {isPositive ? "+" : ""}{formatCurrency(numVal, curr)}
                          </span>
                        </div>
                      );
                    })}
                    {Object.keys(netProfitMap).length === 0 && (
                      <span className="text-xs text-slate-400 italic">{locale === "ru" ? "Нет данных" : "No performance data"}</span>
                    )}
                  </div>
                </div>

                {/* Most Profitable Object Spotlight */}
                <div className="bg-slate-50/70 border border-slate-200/70 rounded-xl p-5 col-span-2 flex flex-col justify-between">
                  <span className="text-[10px] text-slate-400 uppercase tracking-widest font-black block mb-2">
                    🏗️ {locale === "ru" ? "Самый Прибыльный Проект / Объект" : "Most Profitable Site / Project"}
                  </span>
                  {(() => {
                    // Calculate most profitable project manually
                    const objectProfitability: Record<string, Record<string, { income: number; expense: number; profit: number }>> = {};
                    invoices.forEach(inv => {
                      if (!inv) return;
                      const obj = (inv.objectName || "").trim() || (locale === "ru" ? "Без проекта" : "No Project");
                      const curr = inv.currency?.trim() || (locale === "ru" ? "RUB" : "USD");
                      const amount = inv.totalAmount || 0;
                      const type = inv.invoiceType || "expense";

                      if (!objectProfitability[obj]) {
                        objectProfitability[obj] = {};
                      }
                      if (!objectProfitability[obj][curr]) {
                        objectProfitability[obj][curr] = { income: 0, expense: 0, profit: 0 };
                      }

                      if (type === "income") {
                        objectProfitability[obj][curr].income += amount;
                        objectProfitability[obj][curr].profit += amount;
                      } else {
                        objectProfitability[obj][curr].expense += amount;
                        objectProfitability[obj][curr].profit -= amount;
                      }
                    });

                    let maxProfit = -999999999;
                    let bestObject = "";
                    let bestCurr = "";
                    let bestData = { income: 0, expense: 0, profit: 0 };

                    Object.entries(objectProfitability).forEach(([obj, currencySums]) => {
                      Object.entries(currencySums).forEach(([curr, val]) => {
                        if (val.profit > maxProfit && (val.income > 0 || val.expense > 0)) {
                          maxProfit = val.profit;
                          bestObject = obj;
                          bestCurr = curr;
                          bestData = val;
                        }
                      });
                    });

                    if (!bestObject) {
                      return <div className="text-xs text-slate-400 italic py-2">{locale === "ru" ? "Нет данных по проектам" : "No projects data available"}</div>;
                    }

                    return (
                      <div className="bg-white border border-slate-200/80 p-4 rounded-xl space-y-3">
                        <div className="flex items-center justify-between">
                          <h4 className="text-sm font-black text-slate-900">{bestObject}</h4>
                          <span className="text-[10px] bg-emerald-50 text-emerald-800 border border-emerald-200/60 px-2.5 py-0.5 rounded-full font-bold font-mono">
                            Profit: {formatCurrency(bestData.profit, bestCurr)}
                          </span>
                        </div>
                        <div className="grid grid-cols-2 gap-4 text-xs">
                          <div className="bg-emerald-50/30 border border-emerald-200/40 p-2.5 rounded-lg">
                            <span className="text-[9px] text-slate-400 block uppercase font-bold">{locale === "ru" ? "Доходы" : "Total Revenues"}</span>
                            <span className="font-mono font-black text-emerald-600">+{formatCurrency(bestData.income, bestCurr)}</span>
                          </div>
                          <div className="bg-rose-50/30 border border-rose-200/40 p-2.5 rounded-lg">
                            <span className="text-[9px] text-slate-400 block uppercase font-bold">{locale === "ru" ? "Расходы" : "Total Expenses"}</span>
                            <span className="font-mono font-black text-rose-600">-{formatCurrency(bestData.expense, bestCurr)}</span>
                          </div>
                        </div>
                      </div>
                    );
                  })()}
                </div>
              </div>

              {/* Profit & Loss statement */}
              <div className="space-y-3">
                <span className="text-[10px] text-slate-400 uppercase tracking-widest font-black block">
                  🧾 {locale === "ru" ? "Отчет о Прибылях и Убытках (P&L Summary)" : "Profit & Loss (P&L) Statement"}
                </span>
                <div className="bg-slate-50/50 border border-slate-200/70 rounded-2xl overflow-hidden">
                  <div className="grid grid-cols-5 bg-slate-900 text-white p-3.5 text-xs font-black uppercase tracking-wider text-center">
                    <span className="text-left">{locale === "ru" ? "Валюта" : "Currency"}</span>
                    <span>{locale === "ru" ? "Выручка (Доходы)" : "Revenue"}</span>
                    <span>{locale === "ru" ? "Затраты (Расходы)" : "Expenses"}</span>
                    <span>{locale === "ru" ? "Результат" : "Net Profit"}</span>
                    <span>{locale === "ru" ? "Рентабельность" : "Profit Margin"}</span>
                  </div>
                  <div className="divide-y divide-slate-100">
                    {(() => {
                      const plCurrencies = new Set([...Object.keys(totalIncomesMap), ...Object.keys(totalExpensesMap)]);
                      if (plCurrencies.size === 0) {
                        return <div className="text-center py-6 text-xs text-slate-400 italic">{locale === "ru" ? "Нет данных для составления отчета" : "No data available"}</div>;
                      }

                      return Array.from(plCurrencies).map(curr => {
                        const inc = totalIncomesMap[curr] || 0;
                        const exp = totalExpensesMap[curr] || 0;
                        const profit = inc - exp;
                        const margin = inc > 0 ? Math.round((profit / inc) * 100) : 0;

                        return (
                          <div key={curr} className="grid grid-cols-5 p-3.5 text-xs font-bold text-center items-center bg-white">
                            <span className="text-left font-mono font-black text-slate-900">{curr}</span>
                            <span className="text-emerald-600 font-mono">+{formatCurrency(inc, curr)}</span>
                            <span className="text-rose-500 font-mono">-{formatCurrency(exp, curr)}</span>
                            <span className={`font-mono font-black ${profit >= 0 ? "text-emerald-700" : "text-rose-600"}`}>
                              {profit >= 0 ? "+" : ""}{formatCurrency(profit, curr)}
                            </span>
                            <div className="flex flex-col items-center justify-center space-y-1">
                              <span className="font-mono text-[11px] font-black text-slate-800">{margin}%</span>
                              <div className="w-16 bg-slate-100 h-1 rounded-full overflow-hidden">
                                <div 
                                  className={`h-full rounded-full ${margin >= 0 ? "bg-emerald-500" : "bg-rose-500"}`}
                                  style={{ width: `${Math.min(100, Math.max(0, margin))}%` }}
                                />
                              </div>
                            </div>
                          </div>
                        );
                      });
                    })()}
                  </div>
                </div>
              </div>
            </div>
          )}

          {/* 5. Tax and Quarterly Balance Section */}
          {activeSection === "tax" && (
            <div 
              id="inline-taxes-container" 
              className="mx-4 sm:mx-6 mb-6 p-6 bg-white border border-stone-200/60 rounded-2xl shadow-[0_12px_40px_rgba(0,0,0,0.015)] transition-all animate-fadeIn"
            >
              <div className="flex items-center justify-between border-b border-stone-100 pb-4 mb-5">
                <div className="flex items-center gap-3">
                  <div className="bg-red-500/10 text-red-600 p-2.5 rounded-xl border border-red-100/50">
                    <Percent className="w-5 h-5" />
                  </div>
                  <div>
                    <h3 className="text-sm font-bold text-slate-900 tracking-tight">
                      {t.taxAndQuartersTitle}
                    </h3>
                    <p className="text-[10px] text-slate-400 font-semibold uppercase tracking-wider mt-0.5">
                      {t.taxAndQuartersSubtitle}
                    </p>
                  </div>
                </div>
              </div>

              {Object.keys(quarterlyOverallAndCategories).length === 0 ? (
                <div className="py-8 text-center text-slate-400 text-xs font-semibold">
                  {locale === "ru" ? "Нет данных для отображения налоговой аналитики" : "No invoice data to display tax analytics"}
                </div>
              ) : (
                <div className="space-y-8 divide-y divide-stone-100">
                  {Object.entries(quarterlyOverallAndCategories).map(([curr, data]: [string, any]) => {
                    const totalTaxAmount = data.categories["taxes_fees"] || 0;
                    
                    // Sort categories by amount, ensuring all 11 keys are present
                    const allCategoryKeys = [
                      "materials", "labor", "equipment_rental", "fuel", "permit",
                      "office_expenses", "insurance", "taxes_fees", "subcontracting",
                      "utility_expenses", "other"
                    ];
                    const sortedCategories = allCategoryKeys
                      .map(name => ({ name, totalAmount: Number((data?.categories && data.categories[name]) || 0) }))
                      .sort((a: any, b: any) => b.totalAmount - a.totalAmount);
                    
                    // Calculate total expenses for percentage calculation
                    const totalExpensesSum = sortedCategories.reduce((sum: number, item: any) => sum + item.totalAmount, 0);

                    return (
                      <div key={curr} className="pt-6 first:pt-0 space-y-6">
                        {/* Currency Header Badge */}
                        <div className="flex items-center justify-between">
                          <span className="text-xs font-black font-mono text-slate-900 bg-amber-400 border border-amber-500/20 px-3 py-1 rounded-md shadow-sm">
                            {curr}
                          </span>
                          <span className="text-xs font-bold text-slate-500">
                            {t.taxAndQuartersTaxes}: <strong className="text-red-600 font-mono text-sm">{formatCurrency(totalTaxAmount, curr)}</strong>
                          </span>
                        </div>

                        {/* Year Selector Pills */}
                        <div className="flex flex-wrap items-center justify-between gap-3 bg-stone-50 p-3 rounded-2xl border border-stone-100/80">
                          <div className="flex items-center gap-2">
                            <span className="text-xs font-bold text-slate-700">
                              {locale === "ru" ? "Выберите год:" : "Select Year:"}
                            </span>
                            <div className="flex flex-wrap gap-1 bg-stone-200/50 p-1 rounded-xl">
                              {uniqueYears.map((yr) => (
                                <button
                                  key={yr}
                                  onClick={() => setSelectedTaxYear(yr)}
                                  className={`px-3 py-1 text-xs font-bold rounded-lg transition-all cursor-pointer ${
                                    selectedTaxYear === yr
                                      ? "bg-white text-slate-900 shadow-sm border border-stone-200/40"
                                      : "text-slate-500 hover:text-slate-800"
                                  }`}
                                >
                                  {yr}
                                </button>
                              ))}
                            </div>
                          </div>
                          <span className="text-[10px] text-slate-400 font-bold uppercase tracking-wider">
                            {locale === "ru" ? "Интерактивная сводка по годам" : "Interactive yearly summary"}
                          </span>
                        </div>

                        {/* Selected Year Tax Summary Card */}
                        {(() => {
                          const yearlyData = yearlyTaxSummaryData[curr] || {
                            income: 0,
                            expense: 0,
                            profit: 0,
                            tax: 0,
                            categories: {
                              materials: 0, labor: 0, equipment_rental: 0, fuel: 0, permit: 0,
                              office_expenses: 0, insurance: 0, taxes_fees: 0, subcontracting: 0,
                              utility_expenses: 0, other: 0
                            }
                          };
                          const totalYearExpenses = Number(yearlyData.expense || 0);

                          const currencyInvoices = invoices.filter(inv => {
                            if (!inv || !inv.date) return false;
                            const invCurr = inv.currency?.trim() || (locale === "ru" ? "RUB" : "USD");
                            return inv.date.substring(0, 4) === selectedTaxYear && invCurr === curr;
                          });

                          const docScanned = currencyInvoices.length;

                          const needsReviewList = currencyInvoices.filter(inv => {
                            if (inv.invoiceType === "income") return false;
                            if (!inv.items || inv.items.length === 0) return true;
                            return inv.items.some(item => {
                              const cat = (item.expenseCategory || "").trim();
                              return !cat || cat === "uncategorized";
                            });
                          });

                          const needsReviewCount = needsReviewList.length;
                          const categorizedCount = docScanned - needsReviewCount;
                          const readyForIRS = docScanned > 0 ? Math.round((categorizedCount / docScanned) * 100) : 100;

                          return (
                            <div className="bg-slate-900 text-white rounded-2xl p-5 border border-slate-850 shadow-md space-y-5">
                              <div className="flex flex-col md:flex-row md:items-center justify-between border-b border-slate-800 pb-3 gap-3">
                                <div className="space-y-1.5 w-full">
                                  <div className="flex items-center justify-between">
                                    <div className="flex items-center gap-2">
                                      <div className="w-2.5 h-2.5 bg-amber-400 rounded-full animate-pulse" />
                                      <h4 className="text-xs font-black uppercase tracking-wider text-slate-300">
                                        {locale === "ru" ? "Annual Business Tax Summary" : "Annual Business Tax Summary"}
                                      </h4>
                                    </div>
                                    <span className="text-[10px] bg-slate-800 text-slate-300 px-2 py-0.5 rounded font-mono font-bold">
                                      {curr}
                                    </span>
                                  </div>
                                  <div className="flex flex-wrap gap-x-3 gap-y-1.5 text-[11px] text-slate-400 font-medium pt-1">
                                    <div className="flex items-center gap-1 bg-slate-850 px-2.5 py-1 rounded-lg border border-slate-800">
                                      <span className="text-slate-500 font-bold">{locale === "ru" ? "Год:" : "Year:"}</span>
                                      <span className="text-amber-400 font-mono font-black">{selectedTaxYear}</span>
                                    </div>
                                    <button
                                      onClick={() => {
                                        exportScheduleCToExcel({
                                          year: selectedTaxYear,
                                          currency: curr,
                                          businessName: activeBusiness,
                                          income: yearlyData.income,
                                          expense: yearlyData.expense,
                                          profit: yearlyData.profit,
                                          tax: yearlyData.tax,
                                          categories: yearlyData.categories,
                                          quarters: data.quarters
                                        }, locale);
                                      }}
                                      className="flex items-center gap-1.5 px-2.5 py-1 rounded-lg border bg-emerald-600 hover:bg-emerald-700 text-white border-emerald-600 hover:border-emerald-500 transition-all cursor-pointer font-bold"
                                      title={locale === "ru" ? "Экспорт в Excel как Schedule C" : "Export to Excel as IRS Schedule C"}
                                    >
                                      <FileSpreadsheet className="w-3.5 h-3.5" />
                                      <span>{locale === "ru" ? "Excel Schedule C" : "Excel Schedule C"}</span>
                                    </button>
                                    <button
                                      onClick={async () => {
                                        await exportScheduleCToPdf({
                                          year: selectedTaxYear,
                                          currency: curr,
                                          businessName: activeBusiness,
                                          income: yearlyData.income,
                                          expense: yearlyData.expense,
                                          profit: yearlyData.profit,
                                          tax: yearlyData.tax,
                                          categories: yearlyData.categories,
                                          quarters: data.quarters
                                        }, locale);
                                      }}
                                      className="flex items-center gap-1.5 px-2.5 py-1 rounded-lg border bg-rose-600 hover:bg-rose-700 text-white border-rose-600 hover:border-rose-500 transition-all cursor-pointer font-bold"
                                      title={locale === "ru" ? "Экспорт в PDF как Schedule C" : "Export to PDF as IRS Schedule C"}
                                    >
                                      <FileText className="w-3.5 h-3.5" />
                                      <span>{locale === "ru" ? "PDF Schedule C" : "PDF Schedule C"}</span>
                                    </button>
                                    <button
                                      onClick={() => handleTaxTabClick("documents")}
                                      className={`flex items-center gap-1.5 px-2.5 py-1 rounded-lg border transition-all cursor-pointer text-left ${
                                        activeTaxTab === "documents"
                                          ? "bg-amber-400 text-slate-900 border-amber-400 font-bold"
                                          : "bg-slate-850/50 hover:bg-slate-800 text-slate-200 border-slate-800 hover:border-slate-700"
                                      }`}
                                    >
                                      <span className={activeTaxTab === "documents" ? "text-slate-900 font-bold" : "text-slate-400"}>
                                        {locale === "ru" ? "Документы:" : "Documents:"}
                                      </span>
                                      <span className="font-mono font-extrabold">{docScanned}</span>
                                    </button>
                                    <button
                                      onClick={() => handleTaxTabClick("clients")}
                                      className={`flex items-center gap-1.5 px-2.5 py-1 rounded-lg border transition-all cursor-pointer text-left ${
                                        activeTaxTab === "clients"
                                          ? "bg-amber-400 text-slate-900 border-amber-400 font-bold"
                                          : "bg-slate-850/50 hover:bg-slate-800 text-slate-200 border-slate-800 hover:border-slate-700"
                                      }`}
                                    >
                                      <span className={activeTaxTab === "clients" ? "text-slate-900 font-bold" : "text-slate-400"}>
                                        {locale === "ru" ? "Клиенты:" : "Clients:"}
                                      </span>
                                      <span className="font-mono font-extrabold">{yearlyTaxSummaryMetrics.totalClients}</span>
                                    </button>
                                    <button
                                      onClick={() => handleTaxTabClick("projects")}
                                      className={`flex items-center gap-1.5 px-2.5 py-1 rounded-lg border transition-all cursor-pointer text-left ${
                                        activeTaxTab === "projects"
                                          ? "bg-amber-400 text-slate-900 border-amber-400 font-bold"
                                          : "bg-slate-850/50 hover:bg-slate-800 text-slate-200 border-slate-800 hover:border-slate-700"
                                      }`}
                                    >
                                      <span className={activeTaxTab === "projects" ? "text-slate-900 font-bold" : "text-slate-400"}>
                                        {locale === "ru" ? "Проекты:" : "Projects:"}
                                      </span>
                                      <span className="font-mono font-extrabold">{yearlyTaxSummaryMetrics.totalProjects}</span>
                                    </button>
                                  </div>

                                  {/* Document Status Bento Box */}
                                  <div className="mt-4 grid grid-cols-2 sm:grid-cols-4 gap-3 bg-slate-850 p-3 rounded-xl border border-slate-800/60">
                                    <button
                                      onClick={() => handleTaxTabClick("documents")}
                                      className={`flex flex-col text-left group p-2.5 rounded-lg transition-all cursor-pointer border ${
                                        activeTaxTab === "documents"
                                          ? "bg-indigo-500/10 border-indigo-500/40"
                                          : "bg-slate-900/30 border-slate-800/30 hover:bg-slate-800/50 hover:border-slate-700/50"
                                      }`}
                                    >
                                      <span className="text-[9px] text-slate-500 group-hover:text-indigo-400 uppercase tracking-wider font-extrabold">
                                        {locale === "ru" ? "Документы" : "Doc Scanned"}
                                      </span>
                                      <span className="text-xs font-mono font-extrabold text-indigo-400 mt-0.5">
                                        {docScanned}
                                      </span>
                                    </button>

                                    <button
                                      onClick={() => handleTaxTabClick("categorized")}
                                      className={`flex flex-col text-left group p-2.5 rounded-lg transition-all cursor-pointer border ${
                                        activeTaxTab === "categorized"
                                          ? "bg-emerald-500/10 border-emerald-500/40"
                                          : "bg-slate-900/30 border-slate-800/30 hover:bg-slate-800/50 hover:border-slate-700/50"
                                      }`}
                                    >
                                      <span className="text-[9px] text-slate-500 group-hover:text-emerald-400 uppercase tracking-wider font-extrabold">
                                        {locale === "ru" ? "Категоризировано" : "Categorized"}
                                      </span>
                                      <span className="text-xs font-mono font-extrabold text-emerald-400 mt-0.5">
                                        {categorizedCount}
                                      </span>
                                    </button>

                                    <button 
                                      onClick={() => handleTaxTabClick("needsReview")}
                                      className={`flex flex-col text-left group p-2.5 rounded-lg transition-all cursor-pointer border ${
                                        activeTaxTab === "needsReview" 
                                          ? "bg-amber-500/10 border-amber-500/40" 
                                          : "bg-slate-900/30 border-slate-800/30 hover:bg-slate-800/50 hover:border-slate-700/50"
                                      }`}
                                    >
                                      <span className="text-[9px] text-slate-500 group-hover:text-amber-400 uppercase tracking-wider font-extrabold flex items-center gap-1">
                                        {locale === "ru" ? "Требует внимания" : "Needs to Review"}
                                        {needsReviewCount > 0 && (
                                          <span className="w-1.5 h-1.5 bg-amber-500 rounded-full animate-ping" />
                                        )}
                                      </span>
                                      <span className="text-xs font-mono font-extrabold text-amber-400 mt-0.5 underline decoration-dotted decoration-amber-500/30 group-hover:decoration-amber-400">
                                        {needsReviewCount}
                                      </span>
                                    </button>

                                    <button
                                      onClick={() => handleTaxTabClick("readyForIrs")}
                                      className={`flex flex-col text-left group p-2.5 rounded-lg transition-all cursor-pointer border ${
                                        activeTaxTab === "readyForIrs"
                                          ? "bg-indigo-500/10 border-indigo-500/40"
                                          : "bg-slate-900/30 border-slate-800/30 hover:bg-slate-800/50 hover:border-slate-700/50"
                                      }`}
                                    >
                                      <span className="text-[9px] text-slate-500 group-hover:text-indigo-400 uppercase tracking-wider font-extrabold">
                                        {locale === "ru" ? "Готовность к IRS" : "Ready for IRS"}
                                      </span>
                                      <span className="text-xs font-mono font-extrabold text-indigo-400 mt-0.5">
                                        {readyForIRS}%
                                      </span>
                                    </button>
                                  </div>
                                </div>
                              </div>

                              {/* DYNAMIC DETAILED DRAWERS */}

                              {/* 1. All Scanned Documents */}
                              {activeTaxTab === "documents" && (
                                <div className="bg-slate-850/90 border border-slate-800 rounded-xl p-4 space-y-3 animate-fadeIn">
                                  <div className="flex items-center justify-between border-b border-slate-800/60 pb-2">
                                    <span className="text-xs font-black uppercase tracking-wider text-indigo-400 flex items-center gap-1.5">
                                      📁 {locale === "ru" ? "Список всех документов за" : "List of all documents for"} {selectedTaxYear} ({docScanned})
                                    </span>
                                    <button
                                      onClick={() => setActiveTaxTab("none")}
                                      className="text-[11px] text-slate-400 hover:text-white font-bold cursor-pointer transition-all"
                                    >
                                      {locale === "ru" ? "Скрыть" : "Hide"}
                                    </button>
                                  </div>

                                  {currencyInvoices.length === 0 ? (
                                    <div className="text-center py-6 text-slate-500 text-xs">
                                      📭 {locale === "ru" ? "Нет документов за этот год" : "No documents for this year"}
                                    </div>
                                  ) : (
                                    <div className="space-y-2 max-h-[320px] overflow-y-auto pr-1 text-xs">
                                      {currencyInvoices.map((inv) => {
                                        const isExp = inv.invoiceType === "expense";
                                        return (
                                          <div key={inv.id} className="bg-slate-900/50 p-2.5 rounded-lg border border-slate-800/60 flex items-center justify-between gap-3 hover:border-slate-700/60 transition-all">
                                            <div className="space-y-1 min-w-0 flex-1">
                                              <div className="flex items-center gap-2 flex-wrap">
                                                <span className={`px-1.5 py-0.5 rounded text-[9px] font-extrabold uppercase tracking-wide ${isExp ? "bg-rose-500/10 text-rose-400 border border-rose-500/20" : "bg-emerald-500/10 text-emerald-400 border border-emerald-500/20"}`}>
                                                  {isExp ? (locale === "ru" ? "Расход" : "Expense") : (locale === "ru" ? "Доход" : "Income")}
                                                </span>
                                                <span className="font-mono text-slate-300 font-bold truncate max-w-[120px]">
                                                  {inv.invoiceNumber || "#" + inv.id.substring(0, 6)}
                                                </span>
                                                <span className="text-slate-500 text-[10px] font-mono">{inv.date}</span>
                                              </div>
                                              <div className="flex items-center gap-2 text-[11px] text-slate-300 truncate">
                                                <span className="font-semibold text-slate-200">{inv.supplierName || "Unspecified"}</span>
                                                {inv.objectName && (
                                                  <span className="text-[10px] text-slate-400 bg-slate-800 px-1.5 py-0.5 rounded">
                                                    🏗️ {inv.objectName}
                                                  </span>
                                                )}
                                              </div>
                                            </div>
                                            <div className="text-right flex-shrink-0">
                                              <span className={`font-mono font-black ${isExp ? "text-rose-400" : "text-emerald-400"}`}>
                                                {isExp ? "-" : "+"}{formatCurrency(inv.totalAmount, inv.currency)}
                                              </span>
                                              <div className="text-[9px] text-slate-500 font-extrabold uppercase mt-0.5 tracking-wider">
                                                {inv.items?.[0]?.expenseCategory && inv.items[0].expenseCategory !== "uncategorized"
                                                  ? t.expenseCategories[inv.items[0].expenseCategory as keyof typeof t.expenseCategories] || inv.items[0].expenseCategory
                                                  : (locale === "ru" ? "⚠️ Без категории" : "⚠️ Uncategorized")}
                                              </div>
                                            </div>
                                          </div>
                                        );
                                      })}
                                    </div>
                                  )}
                                </div>
                              )}

                              {/* 2. Client & Supplier Analytics */}
                              {activeTaxTab === "clients" && (
                                <div className="bg-slate-850/90 border border-slate-800 rounded-xl p-4 space-y-3 animate-fadeIn">
                                  <div className="flex items-center justify-between border-b border-slate-800/60 pb-2">
                                    <span className="text-xs font-black uppercase tracking-wider text-amber-400 flex items-center gap-1.5">
                                      👥 {locale === "ru" ? "Аналитика контрагентов за" : "Client & Supplier Analytics for"} {selectedTaxYear}
                                    </span>
                                    <button
                                      onClick={() => setActiveTaxTab("none")}
                                      className="text-[11px] text-slate-400 hover:text-white font-bold cursor-pointer transition-all"
                                    >
                                      {locale === "ru" ? "Скрыть" : "Hide"}
                                    </button>
                                  </div>

                                  {(() => {
                                    const clientMap: Record<string, { docCount: number; totalExp: number; totalInc: number }> = {};
                                    let maxClientAmt = 1;
                                    currencyInvoices.forEach(inv => {
                                      const name = (inv.supplierName || "").trim() || (locale === "ru" ? "Не указан" : "Unspecified");
                                      if (!clientMap[name]) {
                                        clientMap[name] = { docCount: 0, totalExp: 0, totalInc: 0 };
                                      }
                                      clientMap[name].docCount += 1;
                                      if (inv.invoiceType === "income") {
                                        clientMap[name].totalInc += Number(inv.totalAmount || 0);
                                      } else {
                                        clientMap[name].totalExp += Number(inv.totalAmount || 0);
                                      }
                                    });

                                    const sortedClients = Object.entries(clientMap)
                                      .map(([name, data]) => ({ name, ...data, total: data.totalExp + data.totalInc }))
                                      .sort((a, b) => b.total - a.total);

                                    if (sortedClients.length > 0) {
                                      maxClientAmt = Math.max(...sortedClients.map(c => c.total)) || 1;
                                    }

                                    if (sortedClients.length === 0) {
                                      return (
                                        <div className="text-center py-6 text-slate-500 text-xs">
                                          📭 {locale === "ru" ? "Нет контрагентов за этот год" : "No counterparties for this year"}
                                        </div>
                                      );
                                    }

                                    return (
                                      <div className="space-y-2.5 max-h-[320px] overflow-y-auto pr-1">
                                        {sortedClients.map((client) => {
                                          const pct = Math.round((client.total / maxClientAmt) * 100);
                                          return (
                                            <div key={client.name} className="bg-slate-900/40 p-3 rounded-lg border border-slate-800/40 space-y-2">
                                              <div className="flex items-center justify-between text-xs">
                                                <span className="font-bold text-slate-200 truncate">{client.name}</span>
                                                <span className="text-[10px] text-slate-500 font-mono font-bold">
                                                  {client.docCount} {locale === "ru" ? "док." : "docs"}
                                                </span>
                                              </div>
                                              <div className="flex items-center justify-between text-[11px] font-mono">
                                                <div className="flex gap-2">
                                                  {client.totalInc > 0 && (
                                                    <span className="text-emerald-400">+{formatCurrency(client.totalInc, curr)}</span>
                                                  )}
                                                  {client.totalExp > 0 && (
                                                    <span className="text-rose-400">-{formatCurrency(client.totalExp, curr)}</span>
                                                  )}
                                                </div>
                                                <span className="text-slate-300 font-black">{formatCurrency(client.total, curr)}</span>
                                              </div>
                                              <div className="w-full bg-slate-950 rounded-full h-1 overflow-hidden">
                                                <div
                                                  style={{ width: `${pct}%` }}
                                                  className="h-full bg-amber-400 transition-all"
                                                />
                                              </div>
                                            </div>
                                          );
                                        })}
                                      </div>
                                    );
                                  })()}
                                </div>
                              )}

                              {/* 3. Project & Site Analytics */}
                              {activeTaxTab === "projects" && (
                                <div className="bg-slate-850/90 border border-slate-800 rounded-xl p-4 space-y-3 animate-fadeIn">
                                  <div className="flex items-center justify-between border-b border-slate-800/60 pb-2">
                                    <span className="text-xs font-black uppercase tracking-wider text-emerald-400 flex items-center gap-1.5">
                                      🏗️ {locale === "ru" ? "Проекты и строительные объекты за" : "Project & Site Analytics for"} {selectedTaxYear}
                                    </span>
                                    <button
                                      onClick={() => setActiveTaxTab("none")}
                                      className="text-[11px] text-slate-400 hover:text-white font-bold cursor-pointer transition-all"
                                    >
                                      {locale === "ru" ? "Скрыть" : "Hide"}
                                    </button>
                                  </div>

                                  {(() => {
                                    const projectMap: Record<string, { docCount: number; totalExp: number; totalInc: number }> = {};
                                    let maxProjectAmt = 1;
                                    currencyInvoices.forEach(inv => {
                                      const name = (inv.objectName || "").trim() || (locale === "ru" ? "Общие расходы" : "General / Admin");
                                      if (!projectMap[name]) {
                                        projectMap[name] = { docCount: 0, totalExp: 0, totalInc: 0 };
                                      }
                                      projectMap[name].docCount += 1;
                                      if (inv.invoiceType === "income") {
                                        projectMap[name].totalInc += Number(inv.totalAmount || 0);
                                      } else {
                                        projectMap[name].totalExp += Number(inv.totalAmount || 0);
                                      }
                                    });

                                    const sortedProjects = Object.entries(projectMap)
                                      .map(([name, data]) => ({ name, ...data, total: data.totalExp + data.totalInc }))
                                      .sort((a, b) => b.total - a.total);

                                    if (sortedProjects.length > 0) {
                                      maxProjectAmt = Math.max(...sortedProjects.map(p => p.total)) || 1;
                                    }

                                    if (sortedProjects.length === 0) {
                                      return (
                                        <div className="text-center py-6 text-slate-500 text-xs">
                                          📭 {locale === "ru" ? "Нет проектов за этот год" : "No projects for this year"}
                                        </div>
                                      );
                                    }

                                    return (
                                      <div className="space-y-2.5 max-h-[320px] overflow-y-auto pr-1">
                                        {sortedProjects.map((proj) => {
                                          const pct = Math.round((proj.total / maxProjectAmt) * 100);
                                          return (
                                            <div key={proj.name} className="bg-slate-900/40 p-3 rounded-lg border border-slate-800/40 space-y-2">
                                              <div className="flex items-center justify-between text-xs">
                                                <span className="font-bold text-slate-200 truncate flex items-center gap-1.5">
                                                  🔨 {proj.name}
                                                </span>
                                                <span className="text-[10px] text-slate-500 font-mono font-bold">
                                                  {proj.docCount} {locale === "ru" ? "док." : "docs"}
                                                </span>
                                              </div>
                                              <div className="flex items-center justify-between text-[11px] font-mono">
                                                <div className="flex gap-2">
                                                  {proj.totalInc > 0 && (
                                                    <span className="text-emerald-400">+{formatCurrency(proj.totalInc, curr)}</span>
                                                  )}
                                                  {proj.totalExp > 0 && (
                                                    <span className="text-rose-400">-{formatCurrency(proj.totalExp, curr)}</span>
                                                  )}
                                                </div>
                                                <span className="text-slate-300 font-black">{formatCurrency(proj.total, curr)}</span>
                                              </div>
                                              <div className="w-full bg-slate-950 rounded-full h-1 overflow-hidden">
                                                <div
                                                  style={{ width: `${pct}%` }}
                                                  className="h-full bg-emerald-400 transition-all"
                                                />
                                              </div>
                                            </div>
                                          );
                                        })}
                                      </div>
                                    );
                                  })()}
                                </div>
                              )}

                              {/* 4. Categorized Documents List */}
                              {activeTaxTab === "categorized" && (
                                <div className="bg-slate-850/90 border border-slate-800 rounded-xl p-4 space-y-3 animate-fadeIn">
                                  <div className="flex items-center justify-between border-b border-slate-800/60 pb-2">
                                    <span className="text-xs font-black uppercase tracking-wider text-emerald-400 flex items-center gap-1.5">
                                      ✅ {locale === "ru" ? "Категоризированные документы за" : "Categorized Documents for"} {selectedTaxYear} ({categorizedCount})
                                    </span>
                                    <button
                                      onClick={() => setActiveTaxTab("none")}
                                      className="text-[11px] text-slate-400 hover:text-white font-bold cursor-pointer transition-all"
                                    >
                                      {locale === "ru" ? "Скрыть" : "Hide"}
                                    </button>
                                  </div>

                                  {(() => {
                                    const categorizedInvoices = currencyInvoices.filter(inv => {
                                      if (inv.invoiceType === "income") return true;
                                      if (!inv.items || inv.items.length === 0) return false;
                                      return inv.items.every(item => item.expenseCategory && item.expenseCategory !== "uncategorized");
                                    });

                                    if (categorizedInvoices.length === 0) {
                                      return (
                                        <div className="text-center py-6 text-slate-500 text-xs">
                                          📭 {locale === "ru" ? "Нет категоризированных документов" : "No categorized documents yet"}
                                        </div>
                                      );
                                    }

                                    return (
                                      <div className="space-y-2 max-h-[320px] overflow-y-auto pr-1 text-xs">
                                        {categorizedInvoices.map((inv) => {
                                          const mainCategory = inv.items?.[0]?.expenseCategory || "other";
                                          return (
                                            <div key={inv.id} className="bg-slate-900/50 p-2.5 rounded-lg border border-slate-800/60 flex items-center justify-between gap-3">
                                              <div className="space-y-1 min-w-0 flex-1">
                                                <div className="flex items-center gap-2">
                                                  <span className="font-mono text-slate-300 font-bold">
                                                    {inv.invoiceNumber || "#" + inv.id.substring(0, 6)}
                                                  </span>
                                                  <span className="text-slate-500 font-mono text-[10px]">{inv.date}</span>
                                                </div>
                                                <div className="text-[11px] text-slate-300 font-medium truncate">{inv.supplierName || "Supplier"}</div>
                                              </div>
                                              <div className="text-right flex-shrink-0">
                                                <span className="font-mono font-bold text-slate-200">{formatCurrency(inv.totalAmount, curr)}</span>
                                                <div className="mt-0.5">
                                                  <span className="text-[9px] bg-emerald-500/10 border border-emerald-500/20 text-emerald-400 px-2 py-0.5 rounded font-extrabold uppercase tracking-wide">
                                                    {t.expenseCategories[mainCategory as keyof typeof t.expenseCategories] || mainCategory}
                                                  </span>
                                                </div>
                                              </div>
                                            </div>
                                          );
                                        })}
                                      </div>
                                    );
                                  })()}
                                </div>
                              )}

                              {/* 5. Needs Review (Categorizer) */}
                              {activeTaxTab === "needsReview" && (
                                <div className="bg-slate-850/90 border border-slate-800 rounded-xl p-4 space-y-3 animate-fadeIn">
                                  <div className="flex items-center justify-between border-b border-slate-800/60 pb-2">
                                    <div className="flex items-center gap-2">
                                      <span className="text-xs font-black uppercase tracking-wider text-amber-400">
                                        ⚠️ {locale === "ru" ? "Требует внимания (выберите категорию)" : "Needs Review (Assign categories)"}
                                      </span>
                                      <span className="text-[10px] bg-amber-500/20 text-amber-400 px-1.5 py-0.5 rounded font-mono font-bold">
                                        {needsReviewCount}
                                      </span>
                                    </div>
                                    <button
                                      onClick={() => setActiveTaxTab("none")}
                                      className="text-[11px] text-slate-400 hover:text-white font-bold cursor-pointer transition-all"
                                    >
                                      {locale === "ru" ? "Скрыть" : "Hide"}
                                    </button>
                                  </div>

                                  {/* Quick Category Reference with help icons */}
                                  <div className="bg-slate-900/40 p-3 rounded-lg border border-slate-800/50 space-y-2">
                                    <span className="text-[10px] text-slate-400 uppercase tracking-wider font-extrabold block">
                                      📖 {locale === "ru" ? "Справочник категорий (нажмите ℹ️ для описания):" : "Category Guide (Click ℹ️ for info):"}
                                    </span>
                                    <div className="flex flex-wrap gap-1.5">
                                      {Object.entries(t.expenseCategories).map(([key, label]) => {
                                        const isSelectedHelp = selectedHelpCategory === key;
                                        return (
                                          <button
                                            key={key}
                                            onClick={() => setSelectedHelpCategory(isSelectedHelp ? null : key)}
                                            className={`inline-flex items-center gap-1 text-[11px] px-2.5 py-1 rounded-full border transition-all cursor-pointer font-medium ${
                                              isSelectedHelp
                                                ? "bg-amber-500/20 border-amber-400 text-amber-300"
                                                : "bg-slate-800/40 border-slate-700/60 text-slate-300 hover:bg-slate-800 hover:border-slate-600"
                                            }`}
                                          >
                                            <span>{label}</span>
                                            <Info className={`w-3 h-3 ${isSelectedHelp ? "text-amber-300" : "text-slate-400"}`} />
                                          </button>
                                        );
                                      })}
                                    </div>
                                    
                                    {selectedHelpCategory && (
                                      <div className="bg-slate-900 border border-amber-500/30 rounded-lg p-3 text-xs space-y-1 animate-fadeIn relative">
                                        <button
                                          onClick={() => setSelectedHelpCategory(null)}
                                          className="absolute top-2 right-2 text-slate-400 hover:text-white"
                                        >
                                          <X className="w-3.5 h-3.5" />
                                        </button>
                                        <div className="font-bold text-amber-400 flex items-center gap-1">
                                          <span>{t.expenseCategories[selectedHelpCategory as keyof typeof t.expenseCategories]}</span>
                                        </div>
                                        <p className="text-slate-300 leading-relaxed text-[11px] pr-4">
                                          {categoryExplanations[selectedHelpCategory]?.[locale] || categoryExplanations[selectedHelpCategory]?.en}
                                        </p>
                                      </div>
                                    )}
                                  </div>

                                  {needsReviewCount === 0 ? (
                                    <div className="text-center py-5 text-slate-450 text-xs">
                                      🎉 {locale === "ru" ? "Все документы в этой валюте успешно категоризированы!" : "All documents in this currency are categorized!"}
                                    </div>
                                  ) : (
                                    <div className="space-y-2.5 max-h-[320px] overflow-y-auto pr-1">
                                      {needsReviewList.map((inv) => {
                                        const items = inv.items || [];
                                        return (
                                          <div key={inv.id} className="bg-slate-900/50 p-2.5 rounded-lg border border-slate-800/60 space-y-2 hover:border-slate-700/60 transition-all">
                                            <div className="flex flex-wrap items-center justify-between gap-2 text-xs">
                                              <div className="flex items-center gap-2">
                                                <span className="font-mono text-slate-300 font-bold bg-slate-800 px-1.5 py-0.5 rounded">
                                                  {inv.invoiceNumber || "#" + inv.id.substring(0, 6)}
                                                </span>
                                                <span className="text-slate-400">{inv.date}</span>
                                                <span className="text-slate-300 font-semibold truncate max-w-[130px]">
                                                  {inv.supplierName || "Supplier"}
                                                </span>
                                              </div>
                                              <span className="text-slate-200 font-mono font-bold">
                                                {formatCurrency(inv.totalAmount, inv.currency)}
                                              </span>
                                            </div>

                                            {/* Item assign logic */}
                                            <div className="pt-1.5 border-t border-slate-800/40">
                                              {items.length === 0 ? (
                                                <div className="flex items-center justify-between gap-2 text-xs">
                                                  <span className="text-slate-400 italic">
                                                    {locale === "ru" ? "Назначить категорию:" : "Assign category:"}
                                                  </span>
                                                  <div className="flex items-center gap-1.5">
                                                    <select
                                                      onChange={(e) => {
                                                        const selectedCat = e.target.value;
                                                        setInvoices(prev => prev.map(itemInv => {
                                                          if (itemInv.id === inv.id) {
                                                            return {
                                                              ...itemInv,
                                                              items: [{
                                                                id: "item-1",
                                                                description: itemInv.supplierName || "Expense",
                                                                quantity: 1,
                                                                unitPrice: itemInv.totalAmount || 0,
                                                                totalPrice: itemInv.totalAmount || 0,
                                                                expenseCategory: selectedCat
                                                              }]
                                                            };
                                                          }
                                                          return itemInv;
                                                        }));
                                                      }}
                                                      className="bg-slate-800 border border-slate-700 text-slate-200 text-xs rounded-lg px-2 py-1 outline-none focus:border-amber-400 cursor-pointer"
                                                      defaultValue="uncategorized"
                                                    >
                                                      <option value="uncategorized">{locale === "ru" ? "Выберите категорию..." : "Select category..."}</option>
                                                      {Object.entries(t.expenseCategories).map(([key, val]) => (
                                                        <option key={key} value={key}>{val}</option>
                                                      ))}
                                                    </select>
                                                    <button
                                                      onClick={() => {
                                                        setSelectedHelpCategory(selectedHelpCategory ? null : "other");
                                                      }}
                                                      className="text-slate-400 hover:text-amber-400 p-0.5 transition-colors"
                                                      title={locale === "ru" ? "Показать описание категории" : "Show category info"}
                                                    >
                                                      <HelpCircle className="w-3.5 h-3.5" />
                                                    </button>
                                                  </div>
                                                </div>
                                              ) : (
                                                <div className="space-y-1.5">
                                                  {items.map((item, idx) => {
                                                    const isUncategorized = !item.expenseCategory || item.expenseCategory === "uncategorized";
                                                    return (
                                                      <div key={item.id || idx} className="flex flex-col sm:flex-row sm:items-center justify-between gap-1.5 bg-slate-900/20 p-1.5 rounded border border-slate-800/30 text-[11px]">
                                                        <div className="space-y-0.5">
                                                          <span className="text-slate-300 font-medium block">
                                                            {item.description || "Expense item"}
                                                          </span>
                                                          <span className="text-[10px] text-slate-500 font-mono">
                                                            {item.quantity} x {formatCurrency(item.unitPrice, inv.currency)}
                                                          </span>
                                                        </div>
                                                        <div className="flex items-center gap-2">
                                                          <span className={`text-[10px] px-1.5 py-0.5 rounded font-mono font-bold ${isUncategorized ? "bg-amber-500/15 text-amber-400" : "bg-emerald-500/15 text-emerald-400"}`}>
                                                            {isUncategorized 
                                                              ? (locale === "ru" ? "Без категории" : "Uncategorized") 
                                                              : (t.expenseCategories[item.expenseCategory as keyof typeof t.expenseCategories] || item.expenseCategory)
                                                            }
                                                          </span>
                                                          <div className="flex items-center gap-1.5">
                                                            <select
                                                              value={item.expenseCategory || "uncategorized"}
                                                              onChange={(e) => {
                                                                const selectedCat = e.target.value;
                                                                setInvoices(prev => prev.map(itemInv => {
                                                                  if (itemInv.id === inv.id) {
                                                                    const updatedItems = (itemInv.items || []).map((it, i) => {
                                                                      if (i === idx) {
                                                                        return { ...it, expenseCategory: selectedCat };
                                                                      }
                                                                      return it;
                                                                    });
                                                                    return { ...itemInv, items: updatedItems };
                                                                  }
                                                                  return itemInv;
                                                                }));
                                                              }}
                                                              className="bg-slate-800 border border-slate-700 text-slate-200 text-xs rounded px-2 py-0.5 outline-none focus:border-amber-400 cursor-pointer"
                                                            >
                                                              <option value="uncategorized">{locale === "ru" ? "Без категории" : "Uncategorized"}</option>
                                                              {Object.entries(t.expenseCategories).map(([key, val]) => (
                                                                <option key={key} value={key}>{val}</option>
                                                              ))}
                                                            </select>
                                                            <button
                                                              onClick={() => {
                                                                const activeCat = item.expenseCategory && item.expenseCategory !== "uncategorized" ? item.expenseCategory : "other";
                                                                setSelectedHelpCategory(selectedHelpCategory === activeCat ? null : activeCat);
                                                              }}
                                                              className="text-slate-400 hover:text-amber-400 p-0.5 transition-colors"
                                                              title={locale === "ru" ? "Показать описание категории" : "Show category info"}
                                                            >
                                                              <HelpCircle className="w-3.5 h-3.5" />
                                                            </button>
                                                          </div>
                                                        </div>
                                                      </div>
                                                    );
                                                  })}
                                                </div>
                                              )}
                                            </div>
                                          </div>
                                        );
                                      })}
                                    </div>
                                  )}
                                </div>
                              )}

                              {/* 6. Ready for IRS Report */}
                              {activeTaxTab === "readyForIrs" && (
                                <div className="bg-slate-850/90 border border-slate-800 rounded-xl p-4 space-y-4 animate-fadeIn">
                                  <div className="flex items-center justify-between border-b border-slate-800/60 pb-2">
                                    <span className="text-xs font-black uppercase tracking-wider text-indigo-400 flex items-center gap-1.5">
                                      📊 {locale === "ru" ? "Готовность к налоговой отчетности (IRS)" : "IRS Tax Audit Readiness Check"}
                                    </span>
                                    <button
                                      onClick={() => setActiveTaxTab("none")}
                                      className="text-[11px] text-slate-400 hover:text-white font-bold cursor-pointer transition-all"
                                    >
                                      {locale === "ru" ? "Скрыть" : "Hide"}
                                    </button>
                                  </div>

                                  <div className="flex items-center gap-4 bg-slate-900/50 p-3.5 rounded-lg border border-slate-800/40">
                                    <div className="relative flex-shrink-0 w-16 h-16 rounded-full border-4 border-slate-800 flex items-center justify-center font-mono font-black text-xs text-indigo-400">
                                      {readyForIRS}%
                                    </div>
                                    <div className="space-y-1">
                                      <span className="text-xs font-bold block text-slate-200">
                                        {readyForIRS === 100
                                          ? (locale === "ru" ? "Ваш бизнес полностью готов к налогам!" : "Your business is 100% Tax-Ready!")
                                          : (locale === "ru" ? "Требуется доработка классификации" : "Needs category reviews before filing")}
                                      </span>
                                      <p className="text-[11px] text-slate-400 leading-relaxed">
                                        {locale === "ru"
                                          ? "IRS требует распределения всех расходов по стандартным категориям (материалы, аренда, зарплата и др.)."
                                          : "Filing requires distributing all company expenses into legal tax groups (materials, rental, fuel, labor)."}
                                      </p>
                                    </div>
                                  </div>

                                  <div className="space-y-2 text-xs">
                                    <div className="flex items-center gap-2 text-slate-300">
                                      <span>✅</span>
                                      <span>{locale === "ru" ? "Сбор всех транзакций за год:" : "Collect annual transactions:"} <strong>{docScanned} {locale === "ru" ? "шт." : "docs"}</strong></span>
                                    </div>
                                    <div className="flex items-center gap-2 text-slate-300">
                                      <span>{needsReviewCount === 0 ? "✅" : "⚠️"}</span>
                                      <span>
                                        {locale === "ru" ? "Категоризация расходов:" : "Expense categorization:"} <strong>{categorizedCount} / {docScanned}</strong>
                                        {needsReviewCount > 0 && <span className="text-amber-450 ml-1">({needsReviewCount} {locale === "ru" ? "осталось" : "remaining"})</span>}
                                      </span>
                                    </div>
                                    <div className="flex items-center gap-2 text-slate-300">
                                      <span>✅</span>
                                      <span>{locale === "ru" ? "Конвертация в валюту " : "Currency check for "}{curr}: <strong>100% {locale === "ru" ? "готово" : "ready"}</strong></span>
                                    </div>
                                  </div>

                                  <div className="bg-amber-500/10 border border-amber-500/20 rounded-lg p-2.5 text-[11px] text-amber-300 leading-relaxed">
                                    💡 <strong>{locale === "ru" ? "Совет:" : "Pro Tip:"}</strong>{" "}
                                    {locale === "ru"
                                      ? "Для завершения подготовки перейдите в раздел 'Требует внимания' и укажите категории для оставшихся счетов. Это обеспечит беспроблемный аудит."
                                      : "To finish tax preparation, head to 'Needs to Review' to label remaining transactions. This minimizes IRS audit risks."}
                                  </div>
                                </div>
                              )}

                              {/* 4-Column Grid for Year Metrics */}
                              <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
                                <div className="bg-slate-850/50 rounded-xl p-3 border border-slate-800/40">
                                  <span className="text-[9px] text-slate-400 block font-bold uppercase tracking-wider">{locale === "ru" ? "Доходы" : "Revenue"}</span>
                                  <span className="text-emerald-400 font-mono font-extrabold text-sm block mt-1">
                                    {formatCurrency(yearlyData.income, curr)}
                                  </span>
                                </div>
                                <div className="bg-slate-850/50 rounded-xl p-3 border border-slate-800/40">
                                  <span className="text-[9px] text-slate-400 block font-bold uppercase tracking-wider">{locale === "ru" ? "Расходы" : "Expenses"}</span>
                                  <span className="text-rose-400 font-mono font-extrabold text-sm block mt-1">
                                    {formatCurrency(yearlyData.expense, curr)}
                                  </span>
                                </div>
                                <div className="bg-slate-850/50 rounded-xl p-3 border border-slate-800/40">
                                  <span className="text-[9px] text-slate-400 block font-bold uppercase tracking-wider">{locale === "ru" ? "Чистая прибыль" : "Net Profit"}</span>
                                  <span className={`font-mono font-black text-sm block mt-1 ${yearlyData.profit >= 0 ? "text-emerald-300" : "text-rose-300"}`}>
                                    {yearlyData.profit >= 0 ? "+" : ""}{formatCurrency(yearlyData.profit, curr)}
                                  </span>
                                </div>
                                <div className="bg-slate-850/50 rounded-xl p-3 border border-slate-800/40">
                                  <span className="text-[9px] text-slate-400 block font-bold uppercase tracking-wider">{locale === "ru" ? "Налоги и сборы" : "Taxes & Fees"}</span>
                                  <span className="text-amber-300 font-mono font-extrabold text-sm block mt-1">
                                    {formatCurrency(yearlyData.tax, curr)}
                                  </span>
                                </div>
                              </div>

                              {/* Categorized Year Expenses List */}
                              <div className="space-y-3 pt-1">
                                <h5 className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">
                                  {locale === "ru" ? "Все расходы по категориям за" : "All categorized expenses for"} {selectedTaxYear}:
                                </h5>
                                
                                <div className="grid grid-cols-1 md:grid-cols-2 gap-x-6 gap-y-3.5 bg-slate-850/30 p-4 rounded-xl border border-slate-800/40">
                                  {allCategoryKeys.map(name => {
                                    const amt = Number(yearlyData.categories[name] || 0);
                                    const pct = totalYearExpenses > 0 ? Math.round((amt / totalYearExpenses) * 100) : 0;
                                    const isTaxCat = name === "taxes_fees";

                                    return (
                                      <div key={name} className="space-y-1">
                                        <div className="flex justify-between text-[10px] font-medium text-slate-400">
                                          <span className={`truncate max-w-[200px] ${isTaxCat ? "text-amber-300 font-bold" : "text-slate-300"}`}>
                                            {t.expenseCategories[name as keyof typeof t.expenseCategories] || name}
                                            {isTaxCat && " 🏛️"}
                                          </span>
                                          <span className={`font-mono font-bold ${isTaxCat ? "text-amber-300" : "text-slate-200"}`}>
                                            {formatCurrency(amt, curr)} ({pct}%)
                                          </span>
                                        </div>
                                        <div className="w-full bg-slate-800 rounded-full h-1 overflow-hidden flex">
                                          <div
                                            style={{ width: `${pct}%` }}
                                            className={`h-full transition-all ${isTaxCat ? "bg-amber-400" : "bg-indigo-400"}`}
                                          />
                                        </div>
                                      </div>
                                    );
                                  })}
                                </div>
                              </div>
                            </div>
                          );
                        })()}

                        {/* Two Columns Grid */}
                        <div className="grid grid-cols-1 lg:grid-cols-5 gap-6">
                          {/* Expenses by Category (2 Columns span) - Shown as Graphics/Chart */}
                          <div className="lg:col-span-2 bg-stone-50/55 rounded-2xl p-4 border border-stone-100/80 space-y-4">
                            <h4 className="text-xs font-black uppercase tracking-wider text-slate-700 border-b border-stone-200/40 pb-2">
                              {t.taxAndQuartersCategories}
                            </h4>
                            
                            {(() => {
                              const activeChartCategories = sortedCategories
                                .filter(cat => cat.totalAmount > 0)
                                .map(cat => ({
                                  name: t.expenseCategories[cat.name as keyof typeof t.expenseCategories] || cat.name,
                                  value: cat.totalAmount,
                                  rawName: cat.name
                                }));

                              if (activeChartCategories.length === 0) {
                                return (
                                  <div className="h-64 flex flex-col items-center justify-center text-slate-400 text-xs font-semibold">
                                    <span>{locale === "ru" ? "Нет расходов для отображения" : "No expenses to display"}</span>
                                  </div>
                                );
                              }

                              return (
                                <div className="relative h-64 w-full">
                                  <ResponsiveContainer width="100%" height="100%">
                                    <PieChart>
                                      <Pie
                                        data={activeChartCategories}
                                        cx="50%"
                                        cy="45%"
                                        innerRadius={55}
                                        outerRadius={80}
                                        paddingAngle={3}
                                        dataKey="value"
                                      >
                                        {activeChartCategories.map((entry, index) => {
                                          const CHART_COLORS = [
                                            "#6366f1", // indigo
                                            "#f59e0b", // amber
                                            "#10b981", // emerald
                                            "#ef4444", // red/rose
                                            "#3b82f6", // blue
                                            "#8b5cf6", // purple
                                            "#ec4899", // pink
                                            "#14b8a6", // teal
                                            "#06b6d4", // cyan
                                            "#84cc16", // lime
                                            "#78716c"  // stone/gray
                                          ];
                                          return (
                                            <Cell 
                                              key={`cell-${index}`} 
                                              fill={CHART_COLORS[index % CHART_COLORS.length]} 
                                            />
                                          );
                                        })}
                                      </Pie>
                                      <Tooltip
                                        formatter={(value: number) => [formatCurrency(value, curr), locale === "ru" ? "Сумма" : "Amount"]}
                                        contentStyle={{
                                          backgroundColor: "#ffffff",
                                          borderRadius: "12px",
                                          borderColor: "#e7e5e4",
                                          fontSize: "11px",
                                          fontWeight: "600",
                                          boxShadow: "0 4px 12px rgba(0,0,0,0.05)"
                                        }}
                                      />
                                      <Legend 
                                        verticalAlign="bottom" 
                                        height={36} 
                                        iconType="circle"
                                        iconSize={8}
                                        wrapperStyle={{ fontSize: "9px", fontWeight: "bold" }}
                                      />
                                    </PieChart>
                                  </ResponsiveContainer>
                                  {/* Center text for Donut */}
                                  <div className="absolute inset-0 flex flex-col items-center justify-center pointer-events-none pb-6">
                                    <span className="text-[9px] text-stone-400 font-bold uppercase tracking-wider">
                                      {locale === "ru" ? "Всего" : "Total"}
                                    </span>
                                    <span className="text-xs font-black font-mono text-slate-800">
                                      {formatCurrency(totalExpensesSum, curr)}
                                    </span>
                                  </div>
                                </div>
                              );
                            })()}
                          </div>

                          {/* Quarterly Breakdown (3 Columns span) */}
                          <div className="lg:col-span-3 bg-stone-50/55 rounded-2xl p-4 border border-stone-100/80 space-y-4">
                            <h4 className="text-xs font-black uppercase tracking-wider text-slate-700 border-b border-stone-200/40 pb-2">
                              {t.taxAndQuartersQuarters}
                            </h4>

                            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3.5">
                              {[1, 2, 3, 4].map((q) => {
                                const qData = data.quarters[q] || { income: 0, expense: 0, profit: 0, tax: 0 };
                                const hasData = qData.income > 0 || qData.expense > 0;
                                const isProfitPositive = qData.profit >= 0;

                                return (
                                  <div key={q} className="bg-white border border-stone-200/65 rounded-xl p-3.5 space-y-2.5 shadow-sm hover:shadow-md hover:border-stone-300 transition-all">
                                    <div className="flex items-center justify-between border-b border-stone-100 pb-1.5">
                                      <span className="text-[10px] text-slate-800 font-black uppercase tracking-wider">
                                        {getQuarterLabel(q, selectedTaxYear)}
                                      </span>
                                      {hasData && (
                                        <span className={`text-[9px] font-mono font-black px-1.5 py-0.5 rounded-md ${
                                          isProfitPositive ? "bg-emerald-50 text-emerald-700" : "bg-rose-50 text-rose-700"
                                        }`}>
                                          {isProfitPositive ? "PROFIT" : "LOSS"}
                                        </span>
                                      )}
                                    </div>

                                    <div className="grid grid-cols-2 gap-x-2 gap-y-1.5 text-[10px] font-medium">
                                      <div className="space-y-0.5">
                                        <span className="text-slate-400 block font-bold text-[8px] uppercase tracking-wider">{t.revenue}</span>
                                        <span className="text-emerald-600 font-mono font-bold block">{formatCurrency(qData.income, curr)}</span>
                                      </div>
                                      <div className="space-y-0.5">
                                        <span className="text-slate-400 block font-bold text-[8px] uppercase tracking-wider">{t.expenses}</span>
                                        <span className="text-rose-500 font-mono font-bold block">{formatCurrency(qData.expense, curr)}</span>
                                      </div>
                                      <div className="space-y-0.5 pt-1 border-t border-stone-100">
                                        <span className="text-slate-400 block font-bold text-[8px] uppercase tracking-wider">{locale === "ru" ? "Налоги" : "Taxes"}</span>
                                        <span className="text-red-500 font-mono font-bold block">{formatCurrency(qData.tax, curr)}</span>
                                      </div>
                                      <div className="space-y-0.5 pt-1 border-t border-stone-100">
                                        <span className="text-slate-400 block font-bold text-[8px] uppercase tracking-wider">{t.profit}</span>
                                        <span className={`font-mono font-extrabold block ${isProfitPositive ? "text-emerald-700" : "text-rose-700"}`}>
                                          {isProfitPositive ? "+" : ""}{formatCurrency(qData.profit, curr)}
                                        </span>
                                      </div>
                                    </div>
                                  </div>
                                );
                              })}
                            </div>
                          </div>
                        </div>
                      </div>
                    );
                  })}
                </div>
              )}
            </div>
          )}

          {/* Financial Dashboard (Income, Expenses, Profit) - Deprecated and Disabled */}
          {false && (
            <div className="mx-4 sm:mx-6 mb-4 bg-white border border-stone-200/60 rounded-2xl shadow-[0_8px_30px_rgb(0,0,0,0.015)] overflow-hidden" id="financial-dashboard-container">
            {/* Header */}
            <div className="px-5 py-4 bg-slate-900 text-white flex items-center justify-between">
              <div className="flex items-center gap-2.5">
                <div className="bg-slate-850 p-2 rounded-xl border border-slate-800 text-amber-400">
                  <TrendingUp className="w-4 h-4" />
                </div>
                <div>
                  <h3 className="text-xs font-bold uppercase tracking-widest font-display">{t.financialDashboard}</h3>
                  <p className="text-[10px] text-slate-400 font-semibold mt-0.5 uppercase tracking-wider">
                    {locale === "ru" ? "Управление прибылью и денежными потоками" : locale === "es" ? "Gestión de beneficios y flujos de caja" : "Manage profits and cash flows"}
                  </p>
                </div>
              </div>
              <button
                onClick={() => setIsDashboardCollapsed(prev => !prev)}
                className="text-slate-300 hover:text-white px-3 py-1.5 bg-slate-850 hover:bg-slate-800 border border-slate-750 rounded-xl text-xs font-bold cursor-pointer transition-all"
              >
                {isDashboardCollapsed ? (locale === "ru" ? "Показать" : locale === "es" ? "Mostrar" : "Show") : (locale === "ru" ? "Скрыть" : locale === "es" ? "Ocultar" : "Hide")}
              </button>
            </div>

            {!isDashboardCollapsed && (
              <div className="p-5 space-y-6">
                {/* Mode Selector Tabs */}
                <div className="flex border-b border-stone-100 pb-3.5 justify-between items-center flex-wrap gap-2">
                  <div className="flex bg-slate-100 p-0.5 rounded-xl border border-stone-200/30 text-[11px] font-bold text-slate-500 flex-wrap">
                    <button
                      onClick={() => setActiveDashboardTab("management")}
                      className={`px-3 py-1.5 rounded-lg transition-all cursor-pointer flex items-center gap-1.5 ${
                        activeDashboardTab === "management" ? "bg-white text-slate-900 shadow-sm border border-slate-200/20" : "hover:text-slate-800"
                      }`}
                    >
                      <Briefcase className="w-3.5 h-3.5 text-slate-400" />
                      {t.tabManagementAnalysis}
                    </button>
                    <button
                      onClick={() => setActiveDashboardTab("interactive")}
                      className={`px-3 py-1.5 rounded-lg transition-all cursor-pointer flex items-center gap-1.5 ${
                        activeDashboardTab === "interactive" ? "bg-white text-slate-900 shadow-sm border border-slate-200/20" : "hover:text-slate-800"
                      }`}
                    >
                      <TrendingUp className="w-3.5 h-3.5 text-slate-400" />
                      {t.tabInteractive}
                    </button>
                    <button
                      onClick={() => setActiveDashboardTab("months")}
                      className={`px-3 py-1.5 rounded-lg transition-all cursor-pointer flex items-center gap-1.5 ${
                        activeDashboardTab === "months" ? "bg-white text-slate-900 shadow-sm border border-slate-200/20" : "hover:text-slate-800"
                      }`}
                    >
                      <Calendar className="w-3.5 h-3.5 text-slate-400" />
                      {t.byMonth}
                    </button>
                    <button
                      onClick={() => setActiveDashboardTab("objects")}
                      className={`px-3 py-1.5 rounded-lg transition-all cursor-pointer flex items-center gap-1.5 ${
                        activeDashboardTab === "objects" ? "bg-white text-slate-950 shadow-sm border border-slate-200/20" : "hover:text-slate-800"
                      }`}
                    >
                      <Layers className="w-3.5 h-3.5 text-slate-400" />
                      {t.byObject}
                    </button>
                    <button
                      onClick={() => setActiveDashboardTab("clients")}
                      className={`px-3 py-1.5 rounded-lg transition-all cursor-pointer flex items-center gap-1.5 ${
                        activeDashboardTab === "clients" ? "bg-white text-slate-900 shadow-sm border border-slate-200/20" : "hover:text-slate-800"
                      }`}
                    >
                      <Users className="w-3.5 h-3.5 text-slate-400" />
                      {t.clients}
                    </button>
                  </div>

                  {/* Summary Overall Badges */}
                  <div className="flex flex-wrap gap-2 text-xs">
                    {Object.entries(financialMetrics.overall).map(([curr, vals]: [string, any]) => (
                      <div key={curr} className="bg-stone-50 border border-stone-200/40 rounded-xl px-3 py-1.5 flex items-center gap-2.5 shadow-sm">
                        <span className="font-mono font-bold text-[9px] bg-slate-900 text-amber-400 px-1.5 py-0.5 rounded">
                          {curr}
                        </span>
                        <div className="flex gap-2">
                          <span className="text-slate-400 font-bold uppercase text-[9px]">{t.profit}:</span>
                          <span className={`font-mono font-black text-xs ${vals.profit >= 0 ? "text-emerald-600" : "text-rose-600"}`}>
                            {vals.profit >= 0 ? "+" : ""}{formatCurrency(vals.profit, curr)}
                          </span>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>

                {/* Tab content 0: Management Executive Analytics */}
                {activeDashboardTab === "management" && (
                  <div className="space-y-6">
                    {/* Header info */}
                    <div className="bg-gradient-to-r from-amber-500/10 via-amber-400/5 to-transparent border border-amber-200/20 p-5 rounded-2xl flex flex-col md:flex-row md:items-center justify-between gap-4">
                      <div className="space-y-1">
                        <h4 className="text-sm font-black text-slate-900 tracking-tight flex items-center gap-2">
                          <Briefcase className="w-4.5 h-4.5 text-amber-500" />
                          {t.mgmtTitle}
                        </h4>
                        <p className="text-xs text-slate-500 leading-relaxed max-w-2xl">
                          {t.mgmtSubtitle}
                        </p>
                      </div>
                    </div>

                    {Object.keys(managementAnalysis).length === 0 ? (
                      <div className="bg-stone-50 border border-stone-200/50 rounded-2xl py-12 text-center text-slate-400 text-xs font-semibold">
                        {t.mgmtNoData}
                      </div>
                    ) : (
                      <div className="space-y-8">
                        {Object.entries(managementAnalysis).map(([curr, data]: [string, any]) => (
                          <div key={curr} className="space-y-6 border-b border-stone-200/40 last:border-0 pb-6 last:pb-0">
                            {/* Currency Title Badge */}
                            <div className="flex items-center">
                              <span className="text-xs font-black font-mono text-slate-900 bg-amber-400 border border-amber-500/20 px-3 py-1 rounded-md shadow-sm">
                                {curr}
                              </span>
                            </div>

                            {/* Two-Column Grid: Bento Stats & Vendor Analysis */}
                            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                              {/* Left Column: Key Highlights */}
                              <div className="space-y-4">
                                {/* Most Profitable Project */}
                                <div className="bg-white border border-stone-200/50 rounded-2xl p-5 shadow-[0_2px_8px_rgba(0,0,0,0.01)] hover:border-amber-200 hover:shadow-md transition-all flex flex-col justify-between min-h-[140px] relative overflow-hidden group">
                                  <div className="absolute right-[-10px] top-[-10px] w-16 h-16 bg-amber-400/5 rounded-full blur-xl pointer-events-none" />
                                  <div className="space-y-1">
                                    <span className="text-[10px] font-black uppercase tracking-wider text-slate-400 block">{t.mgmtMostProfitableObj}</span>
                                    <h5 className="text-sm font-extrabold text-slate-900 line-clamp-1">
                                      {data.mostProfitableObject ? data.mostProfitableObject.name : "—"}
                                    </h5>
                                  </div>
                                  
                                  {data.mostProfitableObject ? (
                                    <div className="flex items-end justify-between mt-4">
                                      <div className="space-y-1">
                                        <div className="text-[10px] text-slate-400 font-medium">
                                          {t.revenue}: <span className="font-mono text-emerald-600 font-semibold">{formatCurrency(data.mostProfitableObject.income, curr)}</span>
                                        </div>
                                        <div className="text-[10px] text-slate-400 font-medium">
                                          {t.expenses}: <span className="font-mono text-rose-500 font-semibold">{formatCurrency(data.mostProfitableObject.expense, curr)}</span>
                                        </div>
                                      </div>
                                      <div className="text-right">
                                        <span className="text-[9px] text-slate-400 font-bold block uppercase tracking-wider">{t.profit}</span>
                                        <span className={`text-base font-black font-mono tracking-tight ${data.mostProfitableObject.profit >= 0 ? "text-emerald-600" : "text-rose-600"}`}>
                                          {data.mostProfitableObject.profit >= 0 ? "+" : ""}{formatCurrency(data.mostProfitableObject.profit, curr)}
                                        </span>
                                      </div>
                                    </div>
                                  ) : (
                                    <p className="text-xs text-slate-400 mt-2 italic">{t.mgmtNoData}</p>
                                  )}
                                </div>

                                {/* Row of Two KPI Cards: Avg Receipt and Max Transaction */}
                                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                                  {/* Average Receipt Card */}
                                  <div className="bg-white border border-stone-200/50 rounded-2xl p-4.5 shadow-sm flex items-center justify-between">
                                    <div className="space-y-1">
                                      <span className="text-[10px] text-slate-400 font-black uppercase tracking-wider block">{t.mgmtAvgReceipt}</span>
                                      <h6 className="text-sm font-black font-mono text-slate-800">
                                        {formatCurrency(data.avgReceipt, curr)}
                                      </h6>
                                      <span className="text-[9px] text-slate-400 block font-medium">
                                        {locale === "ru" 
                                          ? `На основе ${data.expensesCount} расходов` 
                                          : locale === "es" 
                                            ? `Basado en ${data.expensesCount} gastos` 
                                            : `Based on ${data.expensesCount} expenses`}
                                      </span>
                                    </div>
                                    <div className="p-2.5 bg-amber-50 text-amber-600 rounded-xl border border-amber-100/30">
                                      <FileText className="w-4 h-4" />
                                    </div>
                                  </div>

                                  {/* Total Expenses / Purchase Count Card */}
                                  <div className="bg-white border border-stone-200/50 rounded-2xl p-4.5 shadow-sm flex items-center justify-between">
                                    <div className="space-y-1">
                                      <span className="text-[10px] text-slate-400 font-black uppercase tracking-wider block">{t.mgmtTotalSpent}</span>
                                      <h6 className="text-sm font-black font-mono text-rose-600">
                                        {formatCurrency(data.totalExpenses, curr)}
                                      </h6>
                                      <span className="text-[9px] text-slate-400 block font-medium">
                                        {locale === "ru" 
                                          ? `${data.expensesCount} транзакций` 
                                          : locale === "es" 
                                            ? `${data.expensesCount} transacciones` 
                                            : `${data.expensesCount} transactions`}
                                      </span>
                                    </div>
                                    <div className="p-2.5 bg-rose-50 text-rose-500 rounded-xl border border-rose-100/30">
                                      <TrendingDown className="w-4 h-4" />
                                    </div>
                                  </div>
                                </div>

                                {/* Highest Individual Transaction */}
                                {data.mostExpensivePurchase && (
                                  <div className="bg-slate-900 text-white rounded-2xl p-5 border border-slate-950 shadow-md relative overflow-hidden group">
                                    <div className="absolute right-[-15px] bottom-[-15px] w-20 h-20 bg-amber-500/10 rounded-full blur-xl pointer-events-none" />
                                    <span className="text-[10px] text-amber-400 font-black uppercase tracking-wider block">{t.mgmtMostExpensivePurchase}</span>
                                    <div className="flex items-start justify-between mt-2.5">
                                      <div className="space-y-1.5">
                                        <h6 className="text-sm font-extrabold tracking-tight">
                                          {data.mostExpensivePurchase.supplier}
                                        </h6>
                                        <div className="flex flex-wrap items-center gap-1.5 text-[10px] text-slate-400">
                                          <span className="bg-slate-800 text-slate-300 px-2 py-0.5 rounded-md font-medium">
                                            {t.expenseCategories[data.mostExpensivePurchase.category as keyof typeof t.expenseCategories] || data.mostExpensivePurchase.category}
                                          </span>
                                          <span>•</span>
                                          <span className="font-mono">{formatDate(data.mostExpensivePurchase.date)}</span>
                                          <span>•</span>
                                          <span className="text-amber-300 font-bold">{data.mostExpensivePurchase.objectName}</span>
                                        </div>
                                      </div>
                                      <div className="text-right">
                                        <span className="text-base font-black font-mono text-amber-400 tracking-tight">
                                          {formatCurrency(data.mostExpensivePurchase.amount, curr)}
                                        </span>
                                      </div>
                                    </div>
                                  </div>
                                )}
                              </div>

                              {/* Right Column: Vendor Analysis & Categories */}
                              <div className="bg-white border border-stone-200/50 rounded-2xl p-5 shadow-[0_2px_8px_rgba(0,0,0,0.01)] flex flex-col space-y-6">
                                {/* Frequent Stores */}
                                <div className="space-y-3">
                                  <h6 className="text-xs font-black uppercase tracking-wider text-slate-800 flex items-center gap-2">
                                    <Store className="w-4 h-4 text-amber-500" />
                                    {t.mgmtTopSuppliers}
                                  </h6>

                                  {data.topSuppliers.length === 0 ? (
                                    <p className="text-xs text-slate-400 italic py-2">{t.mgmtNoData}</p>
                                  ) : (
                                    <div className="divide-y divide-stone-100">
                                      {data.topSuppliers.map((sup: any, idx: number) => {
                                        // Calculate percentage relative to total expense
                                        const sharePct = data.totalExpenses > 0 ? Math.round((sup.totalAmount / data.totalExpenses) * 100) : 0;
                                        return (
                                          <div key={sup.name} className="flex items-center justify-between py-2.5 first:pt-0 last:pb-0 group">
                                            <div className="flex items-center gap-3">
                                              <span className="w-5 h-5 flex items-center justify-center bg-slate-100 text-slate-700 rounded-lg text-[10px] font-black font-mono group-hover:bg-amber-400 group-hover:text-slate-950 transition-colors">
                                                {idx + 1}
                                              </span>
                                              <div className="space-y-0.5">
                                                <span className="text-xs font-extrabold text-slate-800 group-hover:text-slate-900 transition-colors">
                                                  {sup.name}
                                                </span>
                                                <div className="flex items-center gap-1.5 text-[9px] text-slate-400">
                                                  <span className="font-bold uppercase tracking-wider">{t.mgmtTransactionsCount}:</span>
                                                  <span className="font-mono font-black text-slate-600 bg-slate-50 border border-stone-200/40 px-1 rounded">
                                                    {sup.count}
                                                  </span>
                                                </div>
                                              </div>
                                            </div>

                                            <div className="text-right space-y-0.5">
                                              <span className="text-xs font-black font-mono text-slate-800">
                                                {formatCurrency(sup.totalAmount, curr)}
                                              </span>
                                              <span className="text-[9px] font-bold text-slate-400 block">
                                                {sharePct}% {locale === "ru" ? "от всех трат" : locale === "es" ? "del gasto" : "of total spend"}
                                              </span>
                                            </div>
                                          </div>
                                        );
                                      })}
                                    </div>
                                  )}
                                </div>

                                {/* Primary Spending Categories */}
                                <div className="space-y-3 pt-4 border-t border-stone-100">
                                  <h6 className="text-xs font-black uppercase tracking-wider text-slate-800">
                                    {t.mgmtTopCategories}
                                  </h6>

                                  {data.topCategories.length === 0 ? (
                                    <p className="text-xs text-slate-400 italic py-2">{t.mgmtNoData}</p>
                                  ) : (
                                    <div className="space-y-3">
                                      {data.topCategories.slice(0, 4).map((cat: any) => (
                                        <div key={cat.name} className="space-y-1">
                                          <div className="flex justify-between text-[10px] font-bold text-slate-500">
                                            <span className="truncate max-w-[200px]">
                                              {t.expenseCategories[cat.name as keyof typeof t.expenseCategories] || cat.name}
                                            </span>
                                            <span className="font-mono text-slate-700">
                                              {formatCurrency(cat.totalAmount, curr)} ({cat.percentage}%)
                                            </span>
                                          </div>
                                          <div className="w-full bg-stone-100 rounded-full h-1.5 overflow-hidden flex border border-stone-200/30">
                                            <div
                                              style={{ width: `${cat.percentage}%` }}
                                              className="bg-amber-500 h-full transition-all"
                                            />
                                          </div>
                                        </div>
                                      ))}
                                    </div>
                                  )}
                                </div>
                              </div>
                            </div>
                          </div>
                        ))}
                      </div>
                    )}
                  </div>
                )}

                {/* Tab content 1: By Months */}
                {activeDashboardTab === "months" && (
                  <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                    {Object.keys(financialMetrics.monthly).length === 0 ? (
                      <div className="col-span-full py-8 text-center text-slate-400 text-xs font-semibold">
                        {locale === "ru" ? "Нет данных по месяцам" : locale === "es" ? "No hay datos mensuales" : "No monthly data available"}
                      </div>
                    ) : (
                      Object.entries(financialMetrics.monthly)
                        .sort((a, b) => b[0].localeCompare(a[0])) // Newest month first
                        .map(([monthKey, currencies]) => (
                          <div key={monthKey} className="bg-stone-50/50 hover:bg-stone-50 border border-stone-200/50 rounded-2xl p-4.5 transition-all shadow-[0_2px_8px_rgba(0,0,0,0.01)] flex flex-col space-y-4">
                            <div className="flex items-center justify-between pb-2 border-b border-stone-200/30">
                              <h4 className="text-xs font-black uppercase tracking-wider text-slate-800 flex items-center gap-1.5">
                                <Calendar className="w-4 h-4 text-amber-500" />
                                {formatMonth(monthKey)}
                              </h4>
                            </div>

                            <div className="space-y-4">
                              {Object.entries(currencies).map(([curr, vals]) => {
                                const netPositive = vals.profit >= 0;
                                return (
                                  <div key={curr} className="space-y-2.5">
                                    <div className="flex items-center justify-between">
                                      <span className="text-[10px] font-bold font-mono text-slate-400 bg-white border border-stone-200 px-1.5 py-0.5 rounded-md">
                                        {curr}
                                      </span>
                                      <span className={`text-xs font-black font-mono px-2 py-0.5 rounded-lg inline-flex items-center gap-1 ${
                                        netPositive ? "bg-emerald-50 text-emerald-700 border border-emerald-100" : "bg-rose-50 text-rose-700 border border-rose-100"
                                      }`}>
                                        {netPositive ? <ArrowUpRight className="w-3.5 h-3.5" /> : <ArrowDownRight className="w-3.5 h-3.5" />}
                                        {netPositive ? "+" : ""}{formatCurrency(vals.profit, curr)}
                                      </span>
                                    </div>

                                    {/* Visual distribution bar */}
                                    <div className="w-full bg-stone-200/50 rounded-full h-2 overflow-hidden flex">
                                      {vals.income + vals.expense > 0 ? (
                                        <>
                                          <div
                                            style={{ width: `${(vals.income / (vals.income + vals.expense)) * 100}%` }}
                                            className="bg-emerald-500 h-full transition-all"
                                            title={`${t.revenue}: ${formatCurrency(vals.income, curr)}`}
                                          />
                                          <div
                                            style={{ width: `${(vals.expense / (vals.income + vals.expense)) * 100}%` }}
                                            className="bg-rose-500 h-full transition-all"
                                            title={`${t.expenses}: ${formatCurrency(vals.expense, curr)}`}
                                          />
                                        </>
                                      ) : (
                                        <div className="w-full bg-stone-200 h-full" />
                                      )}
                                    </div>

                                    <div className="grid grid-cols-2 gap-2 text-[11px] font-semibold text-slate-500">
                                      <div className="bg-white p-2 rounded-xl border border-stone-200/30 flex flex-col">
                                        <span className="text-[9px] text-slate-400 font-bold uppercase tracking-wider">{t.revenue}</span>
                                        <span className="text-emerald-600 font-mono font-bold mt-0.5 truncate">{formatCurrency(vals.income, curr)}</span>
                                      </div>
                                      <div className="bg-white p-2 rounded-xl border border-stone-200/30 flex flex-col">
                                        <span className="text-[9px] text-slate-400 font-bold uppercase tracking-wider">{t.expenses}</span>
                                        <span className="text-rose-600 font-mono font-bold mt-0.5 truncate">{formatCurrency(vals.expense, curr)}</span>
                                      </div>
                                    </div>
                                  </div>
                                );
                              })}
                            </div>
                          </div>
                        ))
                    )}
                  </div>
                )}

                {/* Tab content 2: By Objects (Projects) */}
                {activeDashboardTab === "objects" && (
                  <ProjectsTabContent
                    clients={clients}
                    invoices={invoices}
                    locale={locale}
                    t={t}
                    formatCurrency={formatCurrency}
                  />
                )}

                {/* Tab content 3: Interactive Filter */}
                {activeDashboardTab === "interactive" && (
                  <div className="bg-stone-50/50 border border-stone-200/50 rounded-2xl p-5 md:p-6 transition-all shadow-[0_2px_8px_rgba(0,0,0,0.01)] flex flex-col space-y-6">
                    {/* Select Controls Header */}
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                      {/* Select Month */}
                      <div className="flex flex-col space-y-1.5">
                        <label className="text-[10px] font-black uppercase tracking-wider text-slate-400 flex items-center gap-1.5">
                          <Calendar className="w-3.5 h-3.5 text-amber-500" />
                          {t.selectMonth}
                        </label>
                        <select
                          value={selectedReportMonth}
                          onChange={(e) => setSelectedReportMonth(e.target.value)}
                          className="bg-white border border-stone-200 text-slate-800 text-xs font-bold rounded-xl px-3 py-2 cursor-pointer focus:outline-none focus:ring-2 focus:ring-amber-400/50 transition-all shadow-sm"
                        >
                          <option value="all">{t.allMonths}</option>
                          {uniqueMonths.map((monthKey) => (
                            <option key={monthKey} value={monthKey}>
                              {formatMonth(monthKey)}
                            </option>
                          ))}
                        </select>
                      </div>

                      {/* Select Object */}
                      <div className="flex flex-col space-y-1.5">
                        <label className="text-[10px] font-black uppercase tracking-wider text-slate-400 flex items-center gap-1.5">
                          <Layers className="w-3.5 h-3.5 text-amber-500" />
                          {t.selectObject}
                        </label>
                        <select
                          value={selectedReportObject}
                          onChange={(e) => setSelectedReportObject(e.target.value)}
                          className="bg-white border border-stone-200 text-slate-800 text-xs font-bold rounded-xl px-3 py-2 cursor-pointer focus:outline-none focus:ring-2 focus:ring-amber-400/50 transition-all shadow-sm"
                        >
                          <option value="all">{t.allObjects}</option>
                          {/* Include standard "Без объекта" if there are invoices without objects */}
                          {invoices.some(inv => !inv.objectName || !inv.objectName.trim()) && (
                            <option value={locale === "ru" ? "Без объекта" : locale === "es" ? "Sin objeto" : "No Project"}>
                              {locale === "ru" ? "Без объекта" : locale === "es" ? "Sin objeto" : "No Project"}
                            </option>
                          )}
                          {uniqueObjects.map((obj) => (
                            <option key={obj} value={obj}>
                              {obj}
                            </option>
                          ))}
                        </select>
                      </div>
                    </div>

                    {/* Results Display */}
                    {Object.keys(interactiveMetrics).length === 0 ? (
                      <div className="py-8 text-center text-slate-400 text-xs font-semibold">
                        {locale === "ru" 
                          ? "Нет данных за выбранный период или объект" 
                          : locale === "es" 
                            ? "No hay datos para el período u objeto seleccionado" 
                            : "No financial records match the selected month and project."}
                      </div>
                    ) : (
                      <div className="space-y-6">
                        {Object.entries(interactiveMetrics).map(([curr, vals]: [string, any]) => {
                          const netPositive = vals.profit >= 0;
                          return (
                            <div key={curr} className="space-y-4 border-b border-stone-100 last:border-0 pb-4 last:pb-0">
                              <div className="flex items-center justify-between">
                                <span className="text-[11px] font-black font-mono text-slate-900 bg-amber-400 border border-amber-500/20 px-2.5 py-0.5 rounded-md shadow-sm">
                                  {curr}
                                </span>
                                
                                {/* Net profit indicator badge */}
                                <div className="flex items-center gap-2">
                                  <span className="text-[10px] text-slate-400 uppercase font-black tracking-wider">{t.profit}:</span>
                                  <span className={`text-xs font-black font-mono px-2 py-0.5 rounded-lg inline-flex items-center gap-1.5 shadow-sm ${
                                    netPositive ? "bg-emerald-50 text-emerald-700 border border-emerald-100" : "bg-rose-50 text-rose-700 border border-rose-100"
                                  }`}>
                                    {netPositive ? <ArrowUpRight className="w-3.5 h-3.5 text-emerald-500" /> : <ArrowDownRight className="w-3.5 h-3.5 text-rose-500" />}
                                    {netPositive ? "+" : ""}{formatCurrency(vals.profit, curr)}
                                  </span>
                                </div>
                              </div>

                              {/* Four column grid of big cards representing Income, Expense, Profit, and Tax */}
                              <div className="grid grid-cols-1 sm:grid-cols-4 gap-4">
                                {/* Total Revenue (Доход) */}
                                <div className="bg-white border border-stone-200/50 rounded-2xl p-4 flex items-center justify-between shadow-sm hover:border-stone-300 transition-all group">
                                  <div className="space-y-1">
                                    <span className="text-[10px] text-slate-400 uppercase font-black tracking-wider">{t.revenue}</span>
                                    <h5 className="text-base font-black font-mono text-emerald-600 tracking-tight">
                                      {formatCurrency(vals.income, curr)}
                                    </h5>
                                  </div>
                                  <div className="p-2 bg-emerald-50 text-emerald-600 rounded-xl border border-emerald-100/50">
                                    <TrendingUp className="w-4 h-4" />
                                  </div>
                                </div>

                                {/* Total Expenses (Расход) */}
                                <div className="bg-white border border-stone-200/50 rounded-2xl p-4 flex items-center justify-between shadow-sm hover:border-stone-300 transition-all group">
                                  <div className="space-y-1">
                                    <span className="text-[10px] text-slate-400 uppercase font-black tracking-wider">{t.expenses}</span>
                                    <h5 className="text-base font-black font-mono text-rose-600 tracking-tight">
                                      {formatCurrency(vals.expense, curr)}
                                    </h5>
                                  </div>
                                  <div className="p-2 bg-rose-50 text-rose-600 rounded-xl border border-rose-100/50">
                                    <TrendingDown className="w-4 h-4" />
                                  </div>
                                </div>

                                {/* Net Profit (Прибыль) */}
                                <div className={`border rounded-2xl p-4 flex items-center justify-between shadow-sm transition-all group ${
                                  netPositive ? "bg-gradient-to-br from-emerald-50/20 to-transparent border-emerald-200" : "bg-gradient-to-br from-rose-50/20 to-transparent border-rose-200"
                                }`}>
                                  <div className="space-y-1">
                                    <span className="text-[10px] text-slate-400 uppercase font-black tracking-wider">{t.profit}</span>
                                    <h5 className={`text-base font-black font-mono tracking-tight ${netPositive ? "text-emerald-700" : "text-rose-700"}`}>
                                      {netPositive ? "+" : ""}{formatCurrency(vals.profit, curr)}
                                    </h5>
                                  </div>
                                  <div className={`p-2 rounded-xl border ${
                                    netPositive ? "bg-emerald-100/40 text-emerald-600 border-emerald-200/50" : "bg-rose-100/40 text-rose-600 border-rose-200/50"
                                  }`}>
                                    <TrendingUp className="w-4.5 h-4.5" />
                                  </div>
                                </div>

                                {/* Taxes Paid (Налог) */}
                                <div className="bg-white border border-stone-200/50 rounded-2xl p-4 flex items-center justify-between shadow-sm hover:border-stone-300 transition-all group">
                                  <div className="space-y-1">
                                    <span className="text-[10px] text-slate-400 uppercase font-black tracking-wider">{locale === "ru" ? "Уплаченные налоги" : locale === "es" ? "Impuestos pagados" : "Taxes Paid"}</span>
                                    <h5 className="text-base font-black font-mono text-red-600 tracking-tight">
                                      {formatCurrency(vals.tax || 0, curr)}
                                    </h5>
                                  </div>
                                  <div className="p-2 bg-red-50 text-red-600 rounded-xl border border-red-100/50">
                                    <Percent className="w-4 h-4" />
                                  </div>
                                </div>
                              </div>

                              {/* Progress bar visualizer */}
                              <div className="space-y-1 bg-white p-3 rounded-2xl border border-stone-200/50">
                                <div className="flex justify-between text-[10px] text-slate-400 font-bold uppercase tracking-wider">
                                  <span>{t.revenue} ({(vals.income + vals.expense > 0 ? (vals.income / (vals.income + vals.expense) * 100).toFixed(0) : 0)}%)</span>
                                  <span>{t.expenses} ({(vals.income + vals.expense > 0 ? (vals.expense / (vals.income + vals.expense) * 100).toFixed(0) : 0)}%)</span>
                                </div>
                                <div className="w-full bg-stone-100 rounded-full h-2 overflow-hidden flex border border-stone-200/30">
                                  {vals.income + vals.expense > 0 ? (
                                    <>
                                      <div
                                        style={{ width: `${(vals.income / (vals.income + vals.expense)) * 100}%` }}
                                        className="bg-emerald-500 h-full transition-all"
                                      />
                                      <div
                                        style={{ width: `${(vals.expense / (vals.income + vals.expense)) * 100}%` }}
                                        className="bg-rose-500 h-full transition-all"
                                      />
                                    </>
                                  ) : (
                                    <div className="w-full bg-stone-200 h-full" />
                                  )}
                                </div>
                              </div>

                              {/* Detailed Expenses Category and Quarterly Breakdown */}
                              <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mt-2">
                                <div className="bg-stone-50/50 p-4.5 rounded-2xl border border-stone-100 space-y-3">
                                  <h6 className="text-[10px] font-black uppercase tracking-wider text-slate-700 border-b border-stone-200/40 pb-1">
                                    {t.taxAndQuartersCategories}
                                  </h6>
                                  <div className="space-y-2.5">
                                    {[
                                      "materials", "labor", "equipment_rental", "fuel", "permit",
                                      "office_expenses", "insurance", "taxes_fees", "subcontracting",
                                      "utility_expenses", "other"
                                    ].map(name => ({
                                      name,
                                      amount: Number((vals?.categories && vals.categories[name]) || 0)
                                    }))
                                    .sort((a, b) => b.amount - a.amount)
                                    .map(({ name: catName, amount: catAmt }) => {
                                      const isTaxCategory = catName === "taxes_fees";
                                      const catPct = vals.expense > 0 ? Math.round((catAmt / vals.expense) * 100) : 0;
                                      return (
                                        <div key={catName} className="space-y-0.5">
                                          <div className="flex justify-between text-[9px] font-bold text-slate-500">
                                            <span className={isTaxCategory ? "text-red-600 font-extrabold" : "text-slate-600"}>
                                              {t.expenseCategories[catName as keyof typeof t.expenseCategories] || catName}
                                              {isTaxCategory && " 🏛️"}
                                            </span>
                                            <span className={`font-mono ${isTaxCategory ? "text-red-600 font-extrabold" : "text-slate-700"}`}>
                                              {formatCurrency(catAmt, curr)} ({catPct}%)
                                            </span>
                                          </div>
                                          <div className="w-full bg-stone-200/40 rounded-full h-1 overflow-hidden flex">
                                            <div
                                              style={{ width: `${catPct}%` }}
                                              className={`h-full ${isTaxCategory ? "bg-red-500" : "bg-slate-500"}`}
                                            />
                                          </div>
                                        </div>
                                      );
                                    })}
                                  </div>
                                </div>

                                {/* Quarterly breakdown of expenses and incomes for this selection */}
                                <div className="bg-stone-50/50 p-4.5 rounded-2xl border border-stone-100 space-y-3">
                                  <h6 className="text-[10px] font-black uppercase tracking-wider text-slate-700 border-b border-stone-200/40 pb-1">
                                    {t.taxAndQuartersQuarters}
                                  </h6>
                                  <div className="grid grid-cols-2 gap-2">
                                    {[1, 2, 3, 4].map(q => {
                                      // Sum for this quarter, filtered by selected object and month if applicable
                                      let qIncome = 0;
                                      let qExpense = 0;
                                      let qTax = 0;

                                      invoices.forEach(inv => {
                                        if (!inv) return;
                                        const invCurr = inv.currency?.trim() || (locale === "ru" ? "RUB" : "USD");
                                        if (invCurr !== curr) return;

                                        const qVal = getQuarterFromDate(inv.date);
                                        if (qVal !== q) return;

                                        // Apply interactive filters if they are active
                                        if (selectedReportMonth !== "all") {
                                          const invMonth = inv.date && inv.date.length >= 7 ? inv.date.substring(0, 7) : "unknown";
                                          if (invMonth !== selectedReportMonth) return;
                                        }
                                        if (selectedReportObject !== "all") {
                                          const docObject = (inv.objectName || "").trim();
                                          const standardObjName = docObject || (locale === "ru" ? "Без объекта" : locale === "es" ? "Sin objeto" : "No Project");
                                          if (standardObjName.toLowerCase() !== selectedReportObject.toLowerCase()) return;
                                        }

                                        const invType = inv.invoiceType || "expense";
                                        const invAmt = inv.totalAmount || 0;

                                        if (invType === "income") {
                                          qIncome += invAmt;
                                        } else {
                                          qExpense += invAmt;
                                          if (Array.isArray(inv.items)) {
                                            inv.items.forEach(item => {
                                              if (item.expenseCategory === "taxes_fees") {
                                                qTax += Number(item.totalPrice || 0);
                                              }
                                            });
                                          }
                                        }
                                      });

                                      const qProfit = qIncome - qExpense;
                                      const hasQData = qIncome > 0 || qExpense > 0;

                                      return (
                                        <div key={q} className="bg-white border border-stone-200/50 rounded-xl p-2 space-y-1 text-[9px] shadow-sm">
                                          <div className="border-b border-stone-100 pb-0.5 font-bold text-slate-800 uppercase flex justify-between">
                                            <span>{getQuarterLabel(q)}</span>
                                            {hasQData && <span className={qProfit >= 0 ? "text-emerald-600 font-extrabold font-mono" : "text-rose-600 font-extrabold font-mono"}>
                                              {qProfit >= 0 ? "+" : ""}{formatCurrency(qProfit, curr)}
                                            </span>}
                                          </div>
                                          {hasQData ? (
                                            <div className="grid grid-cols-2 gap-x-1 gap-y-0.5 text-slate-500 font-medium">
                                              <span>{locale === "ru" ? "Дох:" : "Inc:"} <strong className="text-emerald-600 font-mono font-bold">{formatCurrency(qIncome, curr)}</strong></span>
                                              <span>{locale === "ru" ? "Рас:" : "Exp:"} <strong className="text-rose-500 font-mono font-bold">{formatCurrency(qExpense, curr)}</strong></span>
                                              {qTax > 0 && <span className="col-span-2 text-[8px]">{locale === "ru" ? "Налог:" : "Tax:"} <strong className="text-red-600 font-mono font-bold">{formatCurrency(qTax, curr)}</strong></span>}
                                            </div>
                                          ) : (
                                            <span className="text-[8px] text-stone-400 italic block py-0.5">{locale === "ru" ? "Нет записей" : "No records"}</span>
                                          )}
                                        </div>
                                      );
                                    })}
                                  </div>
                                </div>
                              </div>
                            </div>
                          );
                        })}
                      </div>
                    )}
                  </div>
                )}

                {/* Tab content 4: Clients */}
                {activeDashboardTab === "clients" && (
                  <ClientsTabContent
                    clients={clients}
                    setClients={setClients}
                    invoices={invoices}
                    locale={locale}
                    t={t}
                    formatCurrency={formatCurrency}
                    formatMultiCurrencySum={formatMultiCurrencySum}
                    uniqueObjects={uniqueObjects}
                  />
                )}
              </div>
            )}
          </div>
          )}

          {/* Analysis Error Toast */}
          {scanError && (
            <div className="mx-6 mt-2 p-3 bg-red-50 border border-red-200 rounded-lg text-xs text-red-700 flex items-center justify-between animate-fade-in">
              <span className="flex items-center gap-2">
                <AlertCircle className="w-4 h-4 text-red-500 flex-shrink-0" />
                {scanError}
              </span>
              <button onClick={() => setScanError(null)} className="p-1 hover:bg-red-100 rounded text-red-700 cursor-pointer">
                <X className="w-3.5 h-3.5" />
              </button>
            </div>
          )}

          {/* Analysis Success Toast */}
          {scanSuccess && (
            <div className="mx-6 mt-2 p-3 bg-emerald-50 border border-emerald-200/80 rounded-lg text-xs text-emerald-800 flex items-center justify-between animate-fade-in shadow-sm">
              <span className="flex items-center gap-2">
                <CheckCircle className="w-4 h-4 text-emerald-600 flex-shrink-0" />
                {scanSuccess}
              </span>
              <button onClick={() => setScanSuccess(null)} className="p-1 hover:bg-emerald-100 rounded text-emerald-700 cursor-pointer">
                <X className="w-3.5 h-3.5" />
              </button>
            </div>
          )}

          {/* Table Container area */}
          {activeSection === "documents" && (
            <div className="px-3 sm:px-6 pb-3 sm:pb-6 pt-2 sm:pt-4 flex flex-col">
            
            {/* Main Table Card wrapper */}
            <div className="bg-white border border-stone-200/60 rounded-2xl flex flex-col shadow-[0_8px_30px_rgb(0,0,0,0.015)]">
              
              {/* Outer Drag Zone to trigger scans intuitively */}
              <div
                onDragOver={handleDragOver}
                onDragLeave={handleDragLeave}
                onDrop={handleDrop}
                className={`relative ${
                  isDragging ? "bg-amber-50/50 border-2 border-dashed border-amber-300 m-2 rounded-xl" : ""
                }`}
              >
                
                {isDragging && (
                  <div className="absolute inset-0 flex flex-col items-center justify-center bg-white/90 pointer-events-none z-20">
                    <Upload className="w-12 h-12 text-amber-500 animate-bounce mb-2" />
                    <p className="text-sm font-bold text-slate-800 uppercase tracking-wider">{t.tipDragDrop}</p>
                  </div>
                )}

                {filteredRows.length === 0 ? (
                  <div className="min-h-[260px] flex flex-col items-center justify-center p-12 text-center">
                    <div className="bg-slate-50 p-5 rounded-full text-slate-400 mb-5 border border-stone-100 shadow-sm">
                      <FileText className="w-8 h-8 text-amber-500/80" />
                    </div>
                    <h3 className="text-sm font-bold text-slate-800 mb-1">{t.emptyStateTitle}</h3>
                    <p className="text-xs text-slate-400 max-w-sm mb-5 font-medium leading-relaxed">{t.emptyStateDesc}</p>
                    <label className="bg-slate-950 hover:bg-slate-900 text-white font-bold text-xs px-4 py-2.5 rounded-xl shadow-sm hover:shadow transition-all cursor-pointer border border-slate-950/20 uppercase tracking-wider">
                      {t.uploadBtn}
                      <input type="file" accept="image/*" onChange={handleFileUpload} className="hidden" />
                    </label>
                  </div>
                ) : (
                  <div className="divide-y divide-stone-100">
                    
                    {groupedSections.map((group) => {
                      const GroupIcon = group.icon;
                      return (
                        <div key={group.groupKey} className="pb-4" id={`group-block-${group.groupKey}`}>
                          
                          {/* Group Header */}
                          <div className="bg-slate-50/90 sticky top-0 backdrop-blur-md px-5 py-3 border-b border-stone-200/50 flex items-center justify-between z-10 shadow-[0_1px_2px_rgba(0,0,0,0.01)]">
                            <div className="flex items-center gap-2">
                              {GroupIcon ? (
                                <GroupIcon className="w-4 h-4 text-slate-400" />
                              ) : (
                                <div className="w-2 h-2 rounded-full bg-slate-900" />
                              )}
                              <span className="text-xs font-bold text-slate-800 uppercase tracking-wider font-display">{group.groupTitle}</span>
                              <span className="bg-stone-150 border border-stone-200/40 text-slate-600 text-[9px] font-bold uppercase tracking-wider px-2 py-0.5 rounded-full font-mono">
                                {group.rows.length} {
                                  locale === "ru" 
                                    ? (group.rows.length === 1 ? "строка" : "строк") 
                                    : locale === "es" 
                                    ? (group.rows.length === 1 ? "línea" : "líneas") 
                                    : (group.rows.length === 1 ? "item" : "items")
                                }
                              </span>
                            </div>
                            <span className="text-xs font-bold text-slate-900 font-mono">
                              {locale === "ru" ? "Итого:" : locale === "es" ? "Total:" : "Total:"} <span className="text-amber-700">{getGroupTotalStr(group.rows)}</span>
                            </span>
                          </div>

                          {/* Quarterly Incomes Breakdown for Incomes section */}
                          {group.groupKey === "income" && (
                            <div className="mx-5 my-4 p-4.5 bg-emerald-500/5 border border-emerald-500/10 rounded-2xl">
                              <div className="flex items-center justify-between border-b border-stone-100 pb-2 mb-3">
                                <h4 className="text-[11px] font-black uppercase tracking-wider text-slate-700 flex items-center gap-1.5">
                                  <TrendingUp className="w-4 h-4 text-emerald-500" />
                                  {locale === "ru" ? "Доходы за квартал (4 квартала)" : locale === "es" ? "Ingresos por trimestre (4 trimestres)" : "Quarterly Incomes (4 Quarters)"}
                                </h4>
                              </div>
                              <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
                                {[1, 2, 3, 4].map(q => {
                                  const qSums = Object.entries(quarterlyIncomesByCurrency).map(([curr, qMap]) => {
                                    const amt = qMap[q] || 0;
                                    return amt > 0 ? formatCurrency(amt, curr) : null;
                                  }).filter(Boolean);

                                  const qLabel = getQuarterLabel(q);
                                  const qFullLabel = locale === "ru" 
                                    ? `${q}-й Квартал` 
                                    : locale === "es" 
                                    ? `${q}º Trimestre` 
                                    : `Quarter ${q}`;

                                  return (
                                    <div key={q} className="bg-white border border-stone-200/55 p-3 rounded-xl flex flex-col justify-between shadow-3xs hover:border-emerald-200 transition-colors">
                                      <div>
                                        <span className="text-[9px] font-black uppercase tracking-wider text-slate-400 block">{qFullLabel}</span>
                                        <span className="text-[10px] text-slate-500 font-bold font-mono">{qLabel}</span>
                                      </div>
                                      <div className="mt-2 text-xs font-black font-mono text-emerald-600">
                                        {qSums.length > 0 ? qSums.join(" / ") : formatCurrency(0)}
                                      </div>
                                    </div>
                                  );
                                })}
                              </div>
                            </div>
                          )}

                          {/* Group Table */}
                          <table className="w-full text-left border-collapse table-fixed hidden lg:table">
                            <thead className="text-[10px] text-slate-400 uppercase font-bold tracking-widest border-b border-stone-100 bg-white sticky top-[38px] z-10">
                              {group.groupKey === "income" ? (
                                <tr>
                                  <th className="px-5 py-3 w-[10%]">{t.tableColDate}</th>
                                  <th className="px-5 py-3 w-[11%]">{t.tableColDoc}</th>
                                  <th className="px-5 py-3 w-[16%]">{t.tableColSupplier}</th>
                                  <th className="px-5 py-3 w-[21%]">{t.tableColDesc}</th>
                                  <th className="px-5 py-3 w-[15%]">{t.tableColObject}</th>
                                  <th className="px-5 py-3 w-[9%]">{t.tableColQuarter}</th>
                                  <th className="px-5 py-3 w-[11%] text-right">{t.tableColPrice}</th>
                                  <th className="px-5 py-3 w-[7%] text-center">{t.tableColActions}</th>
                                </tr>
                              ) : (
                                <tr>
                                  <th className="px-5 py-3 w-[11%]">{t.tableColDate}</th>
                                  <th className="px-5 py-3 w-[12%]">{t.tableColDoc}</th>
                                  <th className="px-5 py-3 w-[18%]">{t.tableColSupplier}</th>
                                  <th className="px-5 py-3 w-[24%]">{t.tableColDesc}</th>
                                  <th className="px-5 py-3 w-[17%]">{t.tableColObject}</th>
                                  <th className="px-5 py-3 w-[11%] text-right">{t.tableColPrice}</th>
                                  <th className="px-5 py-3 w-[7%] text-center">{t.tableColActions}</th>
                                </tr>
                              )}
                            </thead>
                            <tbody className="text-sm divide-y divide-stone-100/60">
                              {group.rows.map((row, idx) => (
                                <tr
                                  key={`${row.invoiceId}-${row.item.id}-${idx}`}
                                  className="group hover:bg-[#fafaf9] transition-all"
                                >
                                  {/* Date */}
                                  <td className="px-5 py-3.5 text-xs text-slate-500 font-medium">
                                    {formatDate(row.date)}
                                  </td>

                                  {/* Invoice number */}
                                  <td className="px-5 py-3.5 text-xs font-semibold text-slate-700 truncate">
                                    {row.invoiceNumber || (locale === "ru" ? "Б/Н" : locale === "es" ? "S/N" : "N/A")}
                                  </td>

                                  {/* Supplier */}
                                  <td className="px-5 py-3.5 text-xs font-bold text-slate-800 truncate">
                                    {row.supplierName}
                                  </td>

                                  {/* Item Description */}
                                  <td className="px-5 py-3.5 text-xs text-slate-600">
                                    <div className="flex flex-col">
                                      <span className="font-semibold text-slate-900 truncate">{row.item.description}</span>
                                      <span className="text-[10px] text-slate-400 flex items-center gap-1.5 mt-1 flex-wrap font-medium">
                                        {row.invoiceType === "income" ? (
                                          <>
                                            <span className="w-1.5 h-1.5 rounded-full bg-emerald-500" />
                                            {t.income} • {row.item.quantity} {locale === "ru" ? "шт" : locale === "es" ? "uds" : "pcs"} × {formatCurrency(row.item.unitPrice, row.currency)}
                                            <span className="bg-emerald-50 border border-emerald-200/40 text-emerald-800 px-1.5 py-0.5 rounded text-[9px] font-bold uppercase tracking-wider">
                                              {t.income}
                                            </span>
                                          </>
                                        ) : (
                                          <>
                                            <span className={`w-1.5 h-1.5 rounded-full ${row.item.type === 'goods' ? 'bg-indigo-400' : 'bg-emerald-400'}`} />
                                            {row.item.type === "goods" ? t.goods : t.services} • {row.item.quantity} {locale === "ru" ? "шт" : locale === "es" ? "uds" : "pcs"} × {formatCurrency(row.item.unitPrice, row.currency)}
                                            <span className="bg-amber-50 border border-amber-200/40 text-amber-800 px-1.5 py-0.5 rounded text-[9px] font-bold uppercase tracking-wider">
                                              {t.expenseCategories[row.item.expenseCategory || "other"] || row.item.expenseCategory || "other"}
                                            </span>
                                          </>
                                        )}
                                      </span>
                                    </div>
                                  </td>

                                  {/* Object/Project */}
                                  <td className="px-5 py-3.5 text-xs text-slate-600 truncate">
                                    {row.objectName ? (
                                      <span className="bg-stone-100 border border-stone-200/30 text-stone-700 px-2.5 py-1 rounded-full font-bold text-[9px] uppercase tracking-wider inline-flex items-center gap-1" title={row.objectName}>
                                        <span className="w-1.5 h-1.5 bg-amber-500 rounded-full" /> {row.objectName}
                                      </span>
                                    ) : (
                                      <span className="text-slate-300 font-medium">—</span>
                                    )}
                                  </td>

                                  {/* Quarter - ONLY if group is income */}
                                  {group.groupKey === "income" && (
                                    <td className="px-5 py-3.5 text-xs text-slate-600 font-semibold font-mono">
                                      <span className="bg-emerald-50 border border-emerald-100 text-emerald-800 px-2 py-0.5 rounded-md text-[10px] font-bold">
                                        {getQuarterLabel(getQuarterFromDate(row.date))}
                                      </span>
                                    </td>
                                  )}

                                  {/* Total Price */}
                                  <td className="px-5 py-3.5 text-right text-xs font-bold text-slate-900 font-mono">
                                    {formatCurrency(row.item.totalPrice, row.currency)}
                                  </td>

                                  {/* Actions */}
                                  <td className="px-5 py-3.5 text-center">
                                    <div className="flex items-center justify-center gap-1 opacity-20 group-hover:opacity-100 transition-opacity">
                                      {/* View photo if present */}
                                      {row.imageUrl ? (
                                        <button
                                          onClick={() => {
                                            const originalInvoice = invoices.find(inv => inv.id === row.invoiceId);
                                            if (originalInvoice) setViewingPhotoInvoice(originalInvoice);
                                          }}
                                          title={t.tooltipViewPhoto}
                                          className="p-1 text-slate-600 hover:text-slate-900 hover:bg-slate-100 rounded transition-colors cursor-pointer"
                                        >
                                          <Eye className="w-3.5 h-3.5" />
                                        </button>
                                      ) : (
                                        <div className="w-5" />
                                      )}

                                      {/* Edit */}
                                      <button
                                        onClick={() => {
                                          const originalInvoice = invoices.find(inv => inv.id === row.invoiceId);
                                          if (originalInvoice) handleEditExisting(originalInvoice);
                                        }}
                                        title={t.tooltipEdit}
                                        className="p-1 text-slate-600 hover:text-slate-900 hover:bg-slate-100 rounded transition-colors cursor-pointer"
                                      >
                                        <Edit2 className="w-3.5 h-3.5" />
                                      </button>

                                      {/* Delete */}
                                      <button
                                        onClick={() => handleDeleteInvoice(row.invoiceId)}
                                        title={t.tooltipDelete}
                                        className="p-1 text-red-500 hover:text-red-700 hover:bg-red-50 rounded transition-colors cursor-pointer"
                                      >
                                        <Trash2 className="w-3.5 h-3.5" />
                                      </button>
                                    </div>
                                  </td>
                                </tr>
                              ))}
                            </tbody>
                          </table>

                          {/* Mobile/Tablet Card Layout */}
                          <div className="block lg:hidden divide-y divide-stone-100/60 bg-stone-50/15">
                            {group.rows.map((row, idx) => (
                              <div
                                key={`${row.invoiceId}-${row.item.id}-${idx}`}
                                className="p-4 space-y-3.5 hover:bg-[#fafaf9] transition-all bg-white"
                              >
                                <div className="flex items-center justify-between gap-2">
                                  <div className="flex items-center gap-1.5 text-xs text-slate-500 font-semibold">
                                    <span>{formatDate(row.date)}</span>
                                    <span className="text-slate-300">•</span>
                                    <span className="text-slate-600 font-bold">
                                      {row.invoiceNumber || (locale === "ru" ? "Б/Н" : locale === "es" ? "S/N" : "N/A")}
                                    </span>
                                  </div>
                                  
                                  {/* Action Buttons with high touch target compliance */}
                                  <div className="flex items-center gap-1 bg-stone-50 border border-stone-200/50 p-0.5 rounded-lg">
                                    {row.imageUrl && (
                                      <button
                                        onClick={() => {
                                          const originalInvoice = invoices.find(inv => inv.id === row.invoiceId);
                                          if (originalInvoice) setViewingPhotoInvoice(originalInvoice);
                                        }}
                                        title={t.tooltipViewPhoto}
                                        className="p-1.5 text-slate-600 hover:text-slate-900 hover:bg-white rounded transition-colors cursor-pointer min-h-[30px] min-w-[30px] flex items-center justify-center"
                                      >
                                        <Eye className="w-3.5 h-3.5" />
                                      </button>
                                    )}
                                    <button
                                      onClick={() => {
                                        const originalInvoice = invoices.find(inv => inv.id === row.invoiceId);
                                        if (originalInvoice) handleEditExisting(originalInvoice);
                                      }}
                                      title={t.tooltipEdit}
                                      className="p-1.5 text-slate-600 hover:text-slate-900 hover:bg-white rounded transition-colors cursor-pointer min-h-[30px] min-w-[30px] flex items-center justify-center"
                                    >
                                      <Edit2 className="w-3.5 h-3.5" />
                                    </button>
                                    <button
                                      onClick={() => handleDeleteInvoice(row.invoiceId)}
                                      title={t.tooltipDelete}
                                      className="p-1.5 text-red-500 hover:text-red-700 hover:bg-white rounded transition-colors cursor-pointer min-h-[30px] min-w-[30px] flex items-center justify-center"
                                    >
                                      <Trash2 className="w-3.5 h-3.5" />
                                    </button>
                                  </div>
                                </div>

                                <div className="flex items-start justify-between gap-4">
                                  <div className="space-y-1">
                                    <h4 className="text-sm font-black text-slate-900 leading-snug">{row.supplierName}</h4>
                                    <p className="text-xs font-semibold text-slate-800 leading-relaxed">{row.item.description}</p>
                                  </div>
                                </div>

                                <div className="flex flex-wrap items-center justify-between gap-3 pt-2 border-t border-stone-100/60">
                                  <div className="flex items-center gap-2">
                                    {row.objectName ? (
                                      <span className="bg-stone-100 border border-stone-200/30 text-stone-700 px-2.5 py-1 rounded-full font-bold text-[9px] uppercase tracking-wider inline-flex items-center gap-1">
                                        <span className="w-1.5 h-1.5 bg-amber-500 rounded-full" /> {row.objectName}
                                      </span>
                                    ) : (
                                      <span className="text-slate-300 font-medium text-xs">—</span>
                                    )}
                                    
                                    {row.invoiceType === "income" ? (
                                      <>
                                        <span className="text-[10px] text-slate-400 font-bold bg-emerald-50 border border-emerald-100 px-2 py-0.5 rounded flex items-center gap-1">
                                          <span className="w-1 h-1 rounded-full bg-emerald-500" />
                                          {t.income}
                                        </span>
                                        <span className="text-[10px] text-emerald-800 font-bold bg-emerald-50 border border-emerald-100 px-2 py-0.5 rounded flex items-center gap-1 font-mono">
                                          {getQuarterLabel(getQuarterFromDate(row.date))}
                                        </span>
                                      </>
                                    ) : (
                                      <>
                                        <span className="text-[10px] text-slate-400 font-bold bg-slate-50 border border-slate-100 px-2 py-0.5 rounded flex items-center gap-1">
                                          <span className={`w-1 h-1 rounded-full ${row.item.type === 'goods' ? 'bg-indigo-400' : 'bg-emerald-400'}`} />
                                          {row.item.type === "goods" ? t.goods : t.services}
                                        </span>

                                        <span className="bg-amber-50 border border-amber-200/40 text-amber-800 px-1.5 py-0.5 rounded text-[9px] font-bold uppercase tracking-wider inline-flex items-center">
                                          {t.expenseCategories[row.item.expenseCategory || "other"] || row.item.expenseCategory || "other"}
                                        </span>
                                      </>
                                    )}
                                  </div>

                                  <div className="text-right">
                                    <span className="text-[10px] text-slate-400 block font-medium">
                                      {row.item.quantity} {locale === "ru" ? "шт" : locale === "es" ? "uds" : "pcs"} × {formatCurrency(row.item.unitPrice, row.currency)}
                                    </span>
                                    <span className="text-sm font-bold text-amber-700 font-mono block mt-0.5">
                                      {formatCurrency(row.item.totalPrice, row.currency)}
                                    </span>
                                  </div>
                                </div>
                              </div>
                            ))}
                          </div>
                        </div>
                      );
                    })}
                  </div>
                )}

              </div>

              {/* Table Footer */}
              <div className="mt-auto border-t border-stone-200/50 p-4 bg-stone-50/55 rounded-b-2xl flex flex-col sm:flex-row justify-between items-center text-xs text-slate-400 gap-3">
                <span className="font-semibold text-slate-500">
                  {t.tableFooterShown
                    .replace("{filtered}", String(filteredRows.length))
                    .replace("{total}", String(allRows.length))
                    .replace("{docCount}", String(invoices.length))}
                </span>
                <p className="text-[10px] text-slate-400 italic">
                  {t.tableFooterTip}
                </p>
              </div>

            </div>

          </div>
          )}

        </div>

        {/* Backdrop for mobile clients drawer */}
        {isClientsSidebarOpen && (
          <div
            className="fixed inset-0 bg-slate-900/40 backdrop-blur-xs z-20 lg:hidden transition-opacity"
            onClick={() => setIsClientsSidebarOpen(false)}
          />
        )}

        {/* Right Sidebar: Clients Panel */}
        <aside className={`
          fixed inset-y-0 right-0 z-30 w-full sm:w-[580px] lg:w-[640px] bg-white border-l border-stone-200/60 flex flex-col p-5 md:p-6 flex-shrink-0 overflow-y-auto transition-transform duration-300 ease-in-out
          lg:static lg:translate-x-0 lg:z-0
          ${isClientsSidebarOpen ? "translate-x-0 shadow-2xl lg:shadow-none" : "translate-x-full lg:hidden"}
        `} id="right-sidebar-clients">
          
          <div className="flex items-center justify-between pb-4 mb-4 border-b border-stone-150">
            <div className="flex items-center gap-2">
              <Users className="w-5 h-5 text-amber-500" />
              <span className="text-xs font-bold text-slate-850 uppercase tracking-widest">{t.clients}</span>
            </div>
            <button
              onClick={() => setIsClientsSidebarOpen(false)}
              className="p-1.5 hover:bg-stone-100 border border-stone-200/50 rounded-lg text-slate-500 hover:text-slate-900 transition-colors cursor-pointer"
            >
              <X className="w-4 h-4" />
            </button>
          </div>
          
          <ClientsTabContent
            clients={clients}
            setClients={setClients}
            invoices={invoices}
            locale={locale}
            t={t}
            formatCurrency={formatCurrency}
            formatMultiCurrencySum={formatMultiCurrencySum}
            uniqueObjects={uniqueObjects}
            isSidebar={true}
          />
        </aside>

      </main>

      {/* --- MODAL DIALOGS --- */}

      {/* 1. Loading Overlay for scanning */}
      {isScanning && (
        <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-sm flex flex-col items-center justify-center z-50 p-6 animate-fade-in" id="loading-overlay">
          <div className="bg-white p-8 rounded-2xl shadow-xl max-w-sm w-full text-center flex flex-col items-center border border-slate-100">
            <div className="relative mb-6">
              <div className="w-16 h-16 border-4 border-blue-100 border-t-blue-600 rounded-full animate-spin" />
              <FileText className="w-6 h-6 text-blue-600 absolute inset-0 m-auto animate-pulse" />
            </div>
            
            <h3 className="text-base font-bold text-slate-800 mb-1">{t.loadingTitle}</h3>
            <p className="text-xs text-blue-600 font-semibold mb-3 animate-pulse">
              {scanStep === "Чтение файла..." ? t.scanStepRead :
               scanStep === "Распознавание текста с помощью Gemini AI..." ? t.scanStepGemini :
               scanStep === "Анализ табличной части, выделение товаров и услуг..." ? t.scanStepAnalyze :
               scanStep === "Классификация позиций..." ? t.scanStepClassify : scanStep}
            </p>
            <p className="text-xs text-slate-400">
              {t.loadingDesc}
            </p>
          </div>
        </div>
      )}

      {/* 2. Full Edit / Confirmation Modal */}
      {isEditModalOpen && editingInvoice && (
        <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-sm flex items-center justify-center z-40 p-4 overflow-y-auto animate-fade-in" id="edit-invoice-modal">
          <div className="bg-white rounded-2xl shadow-2xl max-w-4xl w-full flex flex-col overflow-hidden max-h-[90vh] border border-slate-100">
            
            {/* Modal Header */}
            <div className="px-6 py-5 bg-slate-950 text-white flex items-center justify-between border-b border-slate-900">
              <div>
                <h3 className="text-sm font-bold uppercase tracking-widest flex items-center gap-2 font-display">
                  <FileText className="w-4 h-4 text-amber-500" />
                  {editingInvoice.id.startsWith("inv-17") || editingInvoice.imageUrl ? t.modalVerifyTitle : t.modalAddTitle}
                </h3>
                <p className="text-[11px] text-slate-400 mt-0.5 tracking-wide">{t.modalVerifySubtitle}</p>
              </div>
              <button
                onClick={() => {
                  setIsEditModalOpen(false);
                  setEditingInvoice(null);
                  setEditModalError(null);
                }}
                className="text-slate-400 hover:text-white transition-colors cursor-pointer bg-slate-900/50 hover:bg-slate-900 p-1.5 rounded-lg border border-slate-800"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            {/* Modal Content - Side by side layout if image exists */}
            <div className="flex-1 overflow-y-auto p-6 flex flex-col md:flex-row gap-6">
              
              {/* Left Column: Image preview if uploaded */}
              {editingInvoice.imageUrl && (
                <div className="md:w-1/3 flex flex-col border border-stone-200/60 rounded-xl bg-stone-50 p-2 max-h-[50vh] md:max-h-none overflow-hidden">
                  <span className="text-[10px] font-bold text-slate-400 mb-2 block text-center uppercase tracking-wider">{t.originalDocLabel}</span>
                  <div className="flex-1 overflow-auto rounded-lg bg-white border border-stone-100 flex items-center justify-center p-1">
                    <img
                      src={editingInvoice.imageUrl}
                      alt="Uploaded Invoice"
                      className="max-w-full max-h-[400px] object-contain rounded-md"
                    />
                  </div>
                </div>
              )}

              {/* Right Column: Editable Fields form */}
              <div className="flex-1 space-y-4">
                
                {/* Invoice Main Metadata */}
                <div className="grid grid-cols-1 sm:grid-cols-6 gap-3 bg-stone-50 p-3.5 rounded-xl border border-stone-200/40">
                  <div>
                    <label className="text-[10px] font-bold text-slate-400 uppercase tracking-wider mb-1 block">{t.fieldDocNumber}</label>
                    <input
                      type="text"
                      value={editingInvoice.invoiceNumber}
                      onChange={(e) => setEditingInvoice({ ...editingInvoice, invoiceNumber: e.target.value })}
                      placeholder="SF-4829"
                      className="w-full bg-white border border-stone-200 rounded-lg px-2.5 py-1.5 text-xs outline-none focus:ring-2 focus:ring-slate-100 focus:border-slate-500 font-semibold text-slate-800 transition-all"
                    />
                  </div>
                  <div>
                    <label className="text-[10px] font-bold text-slate-400 uppercase tracking-wider mb-1 block">{t.fieldSupplier}</label>
                    <input
                      type="text"
                      value={editingInvoice.supplierName}
                      onChange={(e) => setEditingInvoice({ ...editingInvoice, supplierName: e.target.value })}
                      placeholder="ACME Corp"
                      className="w-full bg-white border border-stone-200 rounded-lg px-2.5 py-1.5 text-xs outline-none focus:ring-2 focus:ring-slate-100 focus:border-slate-500 font-bold text-slate-800 transition-all"
                    />
                  </div>
                  <div>
                    <label className="text-[10px] font-bold text-slate-400 uppercase tracking-wider mb-1 block">{t.invoiceType}</label>
                    <select
                      value={editingInvoice.invoiceType || "expense"}
                      onChange={(e) => setEditingInvoice({ ...editingInvoice, invoiceType: e.target.value as "expense" | "income" })}
                      className="w-full bg-white border border-stone-200 rounded-lg px-2 py-1.5 text-xs outline-none focus:ring-2 focus:ring-slate-100 focus:border-slate-500 font-bold text-slate-800 transition-all cursor-pointer"
                    >
                      <option value="expense">{t.expense}</option>
                      <option value="income">{t.income}</option>
                    </select>
                  </div>
                  <div>
                    <label className="text-[10px] font-bold text-slate-400 uppercase tracking-wider mb-1 block">{t.fieldDate}</label>
                    <input
                      type="date"
                      value={editingInvoice.date}
                      onChange={(e) => setEditingInvoice({ ...editingInvoice, date: e.target.value })}
                      className="w-full bg-white border border-stone-200 rounded-lg px-2.5 py-1.5 text-xs outline-none focus:ring-2 focus:ring-slate-100 focus:border-slate-500 text-slate-700 transition-all font-semibold"
                    />
                  </div>
                  <div>
                    <label className="text-[10px] font-bold text-slate-400 uppercase tracking-wider mb-1 block">{t.fieldObjectName}</label>
                    <input
                      type="text"
                      value={editingInvoice.objectName || ""}
                      onChange={(e) => setEditingInvoice({ ...editingInvoice, objectName: e.target.value })}
                      placeholder={locale === "ru" ? "Объект или проект" : locale === "es" ? "Objeto o proyecto" : "Object / Project"}
                      className="w-full bg-white border border-stone-200 rounded-lg px-2.5 py-1.5 text-xs outline-none focus:ring-2 focus:ring-slate-100 focus:border-slate-500 font-bold text-slate-800 transition-all"
                    />
                  </div>
                  <div>
                    <label className="text-[10px] font-bold text-slate-400 uppercase tracking-wider mb-1 block">{t.fieldCurrency}</label>
                    <input
                      type="text"
                      value={editingInvoice.currency || ""}
                      onChange={(e) => setEditingInvoice({ ...editingInvoice, currency: e.target.value })}
                      placeholder="RUB, USD, KZT, etc."
                      className="w-full bg-white border border-stone-200 rounded-lg px-2.5 py-1.5 text-xs outline-none focus:ring-2 focus:ring-slate-100 focus:border-slate-500 font-bold text-slate-800 transition-all"
                    />
                  </div>
                </div>

                {/* Error Banner inside Edit Modal */}
                {editModalError && (
                  <div className="mt-4 p-3 bg-red-50 border border-red-200 text-red-700 text-xs rounded-xl flex items-center justify-between animate-fade-in">
                    <span>{editModalError}</span>
                    <button
                      type="button"
                      onClick={() => setEditModalError(null)}
                      className="text-red-500 hover:text-red-700 font-bold ml-2 cursor-pointer"
                    >
                      ✕
                    </button>
                  </div>
                )}

                {/* Items Specification Table */}
                <div className="mt-4">
                  <div className="flex items-center justify-between mb-2">
                    <h4 className="text-[10px] font-bold text-slate-400 uppercase tracking-widest">{t.specTitle}</h4>
                    <button
                      type="button"
                      onClick={() => {
                        const newItem: InvoiceItem = {
                          id: `item-${Date.now()}-${editingInvoice.items.length}`,
                          description: "",
                          type: "goods",
                          quantity: 1,
                          unitPrice: 0,
                          totalPrice: 0,
                          expenseCategory: "materials"
                        };
                        setEditingInvoice({
                          ...editingInvoice,
                          items: [...editingInvoice.items, newItem]
                        });
                      }}
                      className="text-xs text-amber-700 hover:text-amber-800 font-bold flex items-center gap-1 cursor-pointer transition-colors"
                    >
                      <Plus className="w-3.5 h-3.5 text-amber-600" />
                      {t.btnAddItem}
                    </button>
                  </div>

                  <p className="text-[10px] text-slate-500 font-medium mb-3.5 bg-stone-50 border border-stone-200/50 px-3 py-2.5 rounded-xl flex items-start gap-1.5 leading-relaxed">
                    <span className="text-amber-500 flex-shrink-0 text-xs">💡</span>
                    <span>{t.specObjectInheritTip}</span>
                  </p>

                  <div className="border border-stone-200/60 rounded-xl overflow-x-auto shadow-[0_4px_20px_rgba(0,0,0,0.01)]">
                    <table className="w-full text-left text-xs">
                      <thead className="bg-[#fafaf9] text-slate-400 uppercase font-bold text-[10px] tracking-wider border-b border-stone-200/60">
                        <tr>
                          <th className="p-3.5 w-[24%]">{t.specColDesc}</th>
                          <th className="p-3.5 w-[11%]">{t.specColType}</th>
                          {editingInvoice.invoiceType !== "income" && (
                            <th className="p-3.5 w-[18%]">{t.labelExpenseCategory}</th>
                          )}
                          <th className={`p-3.5 ${editingInvoice.invoiceType === "income" ? "w-[36%]" : "w-[18%]"}`}>{t.specColObject}</th>
                          <th className="p-3.5 w-[6%] text-center">{t.specColQty}</th>
                          <th className="p-3.5 w-[11%] text-right">{t.specColPrice}</th>
                          <th className="p-3.5 w-[12%] text-right">{t.specColTotal}</th>
                          <th className="p-3.5 w-[8%] text-center"></th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-stone-100">
                        {editingInvoice.items.map((item, idx) => (
                          <tr key={item.id} className="hover:bg-stone-50/50 transition-colors">
                            {/* Description input */}
                            <td className="p-2">
                              <input
                                type="text"
                                value={item.description}
                                onChange={(e) => {
                                  const updated = [...editingInvoice.items];
                                  updated[idx].description = e.target.value;
                                  setEditingInvoice({ ...editingInvoice, items: updated });
                                }}
                                placeholder="Office supplies, consulting, shipping..."
                                className="w-full border border-stone-200 rounded-lg px-2.5 py-1.5 text-xs outline-none focus:border-slate-500 font-semibold text-slate-800 transition-colors bg-white"
                              />
                            </td>

                            {/* Type selector toggle */}
                            <td className="p-2">
                              <select
                                value={item.type}
                                onChange={(e) => {
                                  const updated = [...editingInvoice.items];
                                  updated[idx].type = e.target.value as ItemType;
                                  setEditingInvoice({ ...editingInvoice, items: updated });
                                }}
                                className="w-full border border-stone-200 rounded-lg px-1.5 py-1.5 text-xs outline-none bg-white focus:border-slate-500 font-bold text-slate-800 transition-colors cursor-pointer"
                              >
                                <option value="goods">{t.goods} 📦</option>
                                <option value="service">{t.services} 🎧</option>
                              </select>
                            </td>

                            {/* Expense Category Selector */}
                            {editingInvoice.invoiceType !== "income" && (
                              <td className="p-2">
                                <select
                                  value={item.expenseCategory || "other"}
                                  onChange={(e) => {
                                    const updated = [...editingInvoice.items];
                                    updated[idx].expenseCategory = e.target.value as any;
                                    setEditingInvoice({ ...editingInvoice, items: updated });
                                  }}
                                  className="w-full border border-stone-200 rounded-lg px-1.5 py-1.5 text-xs outline-none bg-white focus:border-slate-500 font-bold text-slate-800 transition-colors cursor-pointer"
                                >
                                  {Object.entries(t.expenseCategories).map(([key, label]) => (
                                    <option key={key} value={key}>{label}</option>
                                  ))}
                                </select>
                              </td>
                            )}

                            {/* Item Object / Project Name */}
                            <td className="p-2">
                              <input
                                type="text"
                                list={`objects-dl-${item.id}`}
                                value={item.objectName || ""}
                                onChange={(e) => {
                                  const updated = [...editingInvoice.items];
                                  updated[idx].objectName = e.target.value;
                                  setEditingInvoice({ ...editingInvoice, items: updated });
                                }}
                                placeholder={editingInvoice.objectName || (locale === "ru" ? "По умолчанию" : locale === "es" ? "Por defecto" : "Default")}
                                className="w-full border border-stone-200 rounded-lg px-1.5 py-1.5 text-xs outline-none focus:border-slate-500 font-bold text-slate-700 bg-white transition-colors"
                              />
                              <datalist id={`objects-dl-${item.id}`}>
                                {uniqueObjects.map(obj => (
                                  <option key={obj} value={obj} />
                                ))}
                              </datalist>
                            </td>

                            {/* Quantity input */}
                            <td className="p-2">
                              <input
                                type="number"
                                min="1"
                                value={item.quantity}
                                onChange={(e) => {
                                  const updated = [...editingInvoice.items];
                                  const val = parseInt(e.target.value) || 1;
                                  updated[idx].quantity = val;
                                  updated[idx].totalPrice = val * updated[idx].unitPrice;
                                  setEditingInvoice({ ...editingInvoice, items: updated });
                                }}
                                className="w-full border border-stone-200 rounded-lg px-1.5 py-1.5 text-xs text-center outline-none focus:border-slate-500 font-mono font-semibold text-slate-800 transition-colors"
                              />
                            </td>

                            {/* Unit price input */}
                            <td className="p-2">
                              <input
                                type="number"
                                min="0"
                                value={item.unitPrice}
                                onChange={(e) => {
                                  const updated = [...editingInvoice.items];
                                  const val = parseFloat(e.target.value) || 0;
                                  updated[idx].unitPrice = val;
                                  updated[idx].totalPrice = updated[idx].quantity * val;
                                  setEditingInvoice({ ...editingInvoice, items: updated });
                                }}
                                className="w-full border border-stone-200 rounded-lg px-1.5 py-1.5 text-xs text-right outline-none focus:border-slate-500 font-mono font-semibold text-slate-800 transition-colors"
                              />
                            </td>

                            {/* Line total (readonly display) */}
                            <td className="p-2 text-right font-mono font-bold text-slate-700">
                              {formatCurrency(item.quantity * item.unitPrice, editingInvoice.currency)}
                            </td>

                            {/* Delete button */}
                            <td className="p-2 text-center">
                              <button
                                type="button"
                                onClick={() => {
                                  if (editingInvoice.items.length <= 1) {
                                    const errMsg = locale === "ru" 
                                      ? "Счет должен содержать как минимум одну позицию." 
                                      : locale === "es"
                                      ? "La factura debe contener al menos un artículo."
                                      : "An invoice must contain at least one line item.";
                                    setEditModalError(errMsg);
                                    return;
                                  }
                                  setEditModalError(null);
                                  const updated = editingInvoice.items.filter((_, i) => i !== idx);
                                  setEditingInvoice({ ...editingInvoice, items: updated });
                                }}
                                className="p-1 text-red-500 hover:bg-red-50 rounded cursor-pointer"
                              >
                                <Trash2 className="w-3.5 h-3.5" />
                              </button>
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                </div>

                {/* Live calculated grand total */}
                <div className="p-4 bg-stone-50 border border-stone-200/60 rounded-xl flex items-center justify-between">
                  <div className="text-xs text-slate-500">
                    <div className="font-semibold text-slate-700">
                      {locale === "ru" ? "Позиций всего: " : locale === "es" ? "Artículos totales: " : "Total Items: "}
                      <strong className="text-slate-900">{editingInvoice.items.length}</strong>
                    </div>
                    <div className="text-[10px] text-slate-400 mt-1">
                      {t.goods}: <strong className="text-slate-600 font-mono">{formatCurrency(editingInvoice.items.filter(i => i.type === 'goods').reduce((s, i) => s + (i.quantity * i.unitPrice), 0), editingInvoice.currency)}</strong> | {t.services}: <strong className="text-slate-600 font-mono">{formatCurrency(editingInvoice.items.filter(i => i.type === 'service').reduce((s, i) => s + (i.quantity * i.unitPrice), 0), editingInvoice.currency)}</strong>
                    </div>
                  </div>
                  <div className="text-right">
                    <span className="text-[9px] text-slate-400 font-bold uppercase tracking-widest block mb-0.5">
                      {locale === "ru" ? "Итоговая сумма" : locale === "es" ? "Monto Total" : "Grand Total"}
                    </span>
                    <span className="text-xl font-bold text-amber-700 font-mono">
                      {formatCurrency(editingInvoice.items.reduce((sum, item) => sum + (item.quantity * item.unitPrice), 0), editingInvoice.currency)}
                    </span>
                  </div>
                </div>

              </div>

            </div>

            {/* Modal Footer actions */}
            <div className="px-6 py-4 bg-stone-50/50 border-t border-stone-200/40 flex justify-end gap-3 flex-shrink-0">
              <button
                type="button"
                onClick={() => {
                  setIsEditModalOpen(false);
                  setEditingInvoice(null);
                  setEditModalError(null);
                }}
                className="px-4 py-2 bg-white border border-stone-200 text-slate-700 font-bold rounded-lg text-xs hover:bg-stone-50 transition-all uppercase tracking-wide cursor-pointer shadow-sm"
              >
                {t.btnCancel}
              </button>
              <button
                type="button"
                onClick={() => triggerSaveWithDuplicateCheck(editingInvoice)}
                className="px-5 py-2 bg-slate-950 hover:bg-slate-900 text-white font-bold rounded-lg text-xs shadow-sm hover:shadow transition-all cursor-pointer flex items-center gap-1.5 uppercase tracking-wide"
              >
                <CheckCircle className="w-4 h-4 text-amber-400" />
                {t.btnSave}
              </button>
            </div>

          </div>
        </div>
      )}

      {/* 3. Photo Viewer Modal */}
      {viewingPhotoInvoice && (
        <div className="fixed inset-0 bg-slate-900/70 backdrop-blur-sm flex items-center justify-center z-40 p-4 animate-fade-in" id="photo-viewer-modal">
          <div className="bg-white rounded-2xl shadow-2xl max-w-2xl w-full overflow-hidden flex flex-col border border-slate-100">
            <div className="px-5 py-3.5 bg-slate-900 text-white flex items-center justify-between">
              <div>
                <h3 className="text-sm font-bold truncate">
                  {locale === "ru" ? "Фото документа: " : locale === "es" ? "Foto del documento: " : "Document Photo: "}
                  {viewingPhotoInvoice.invoiceNumber || (locale === "ru" ? "Б/Н" : locale === "es" ? "S/N" : "N/A")}
                </h3>
                <p className="text-xs text-slate-400">
                  {locale === "ru" ? "Поставщик: " : locale === "es" ? "Proveedor: " : "Supplier: "}
                  {viewingPhotoInvoice.supplierName}
                </p>
              </div>
              <button
                onClick={() => setViewingPhotoInvoice(null)}
                className="text-slate-400 hover:text-white transition-colors cursor-pointer"
              >
                <X className="w-5 h-5" />
              </button>
            </div>
            
            <div className="p-4 bg-slate-50 flex items-center justify-center overflow-auto max-h-[60vh] md:max-h-[70vh]">
              {viewingPhotoInvoice.imageUrl ? (
                <img
                  src={viewingPhotoInvoice.imageUrl}
                  alt="Scanned Invoice original"
                  className="max-w-full max-h-[40vh] md:max-h-[550px] object-contain rounded-lg shadow-sm border border-slate-200"
                />
              ) : (
                <p className="text-xs text-slate-400">
                  {locale === "ru" ? "Фото отсутствует" : locale === "es" ? "La foto no está disponible" : "Photo not available"}
                </p>
              )}
            </div>

            <div className="px-5 py-3 bg-slate-100 border-t border-slate-200 flex items-center justify-between text-xs text-slate-500">
              <span>
                {locale === "ru" ? "Сумма документа: " : locale === "es" ? "Monto del documento: " : "Document Amount: "}
                <strong className="text-slate-800 font-mono">{formatCurrency(viewingPhotoInvoice.totalAmount, viewingPhotoInvoice.currency)}</strong>
              </span>
              <button
                onClick={() => {
                  setViewingPhotoInvoice(null);
                  handleEditExisting(viewingPhotoInvoice);
                }}
                className="text-blue-600 hover:underline font-bold cursor-pointer"
              >
                {locale === "ru" ? "Редактировать спецификацию" : locale === "es" ? "Editar especificación" : "Edit Specification"}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* 4. Delete Confirmation Modal */}
      {invoiceIdToDelete && (
        <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-sm flex items-center justify-center z-50 p-4 animate-fade-in" id="delete-confirmation-modal">
          <div className="bg-white rounded-2xl shadow-2xl max-w-sm w-full overflow-hidden border border-slate-100 p-6 flex flex-col items-center text-center">
            <div className="w-12 h-12 rounded-full bg-red-100 flex items-center justify-center text-red-600 mb-4 animate-pulse">
              <Trash2 className="w-6 h-6" />
            </div>
            <h3 className="text-base font-bold text-slate-800 mb-2">
              {locale === "ru" ? "Удаление счета-фактуры" : locale === "es" ? "Eliminar factura" : "Delete Invoice"}
            </h3>
            <p className="text-xs text-slate-500 mb-6 leading-relaxed">
              {t.confirmDelete}
            </p>
            <div className="flex gap-3 w-full">
              <button
                onClick={() => setInvoiceIdToDelete(null)}
                className="flex-1 py-2 bg-slate-100 hover:bg-slate-200 text-slate-700 font-bold rounded-lg text-xs transition-all cursor-pointer"
              >
                {t.btnCancel}
              </button>
              <button
                onClick={() => {
                  // Delete invoice
                  setInvoices(prev => prev.filter(inv => inv.id !== invoiceIdToDelete));
                  if (viewingPhotoInvoice?.id === invoiceIdToDelete) {
                    setViewingPhotoInvoice(null);
                  }
                  setInvoiceIdToDelete(null);
                }}
                className="flex-1 py-2 bg-red-600 hover:bg-red-700 text-white font-bold rounded-lg text-xs transition-all cursor-pointer shadow-sm shadow-red-200"
              >
                {locale === "ru" ? "Удалить" : locale === "es" ? "Eliminar" : "Delete"}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* 5. Duplicate Invoice Warning Modal */}
      {showDuplicateWarning && pendingInvoiceToSave && (
        <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-sm flex items-center justify-center z-50 p-4 animate-fade-in" id="duplicate-warning-modal">
          <div className="bg-white rounded-2xl shadow-2xl max-w-md w-full overflow-hidden border border-slate-100 p-6 flex flex-col items-center text-center">
            <div className="w-12 h-12 rounded-full bg-amber-100 flex items-center justify-center text-amber-600 mb-4 shadow-sm shadow-amber-100">
              <AlertCircle className="w-6 h-6 animate-pulse" />
            </div>
            <h3 className="text-base font-bold text-slate-800 mb-2">
              {t.duplicateWarningTitle}
            </h3>
            <p className="text-xs text-slate-500 mb-6 leading-relaxed">
              {t.duplicateWarningDesc.replace("{num}", pendingInvoiceToSave.invoiceNumber || "")}
            </p>
            <div className="flex gap-3 w-full">
              <button
                onClick={() => {
                  setShowDuplicateWarning(false);
                  setPendingInvoiceToSave(null);
                }}
                className="flex-1 py-2.5 bg-slate-100 hover:bg-slate-200 text-slate-700 font-bold rounded-lg text-xs transition-all cursor-pointer uppercase tracking-wider"
              >
                {t.btnNoCancel}
              </button>
              <button
                onClick={() => {
                  if (pendingInvoiceToSave) {
                    handleSaveInvoice(pendingInvoiceToSave);
                  }
                  setShowDuplicateWarning(false);
                  setPendingInvoiceToSave(null);
                }}
                className="flex-1 py-2.5 bg-amber-600 hover:bg-amber-700 text-white font-bold rounded-lg text-xs transition-all cursor-pointer shadow-sm shadow-amber-100 uppercase tracking-wider"
              >
                {t.btnYesContinue}
              </button>
            </div>
          </div>
        </div>
      )}

    </div>
  );
}

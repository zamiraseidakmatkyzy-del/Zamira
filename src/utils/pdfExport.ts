import { jsPDF } from "jspdf";
import autoTable from "jspdf-autotable";
import { Invoice } from "../types";

// Helper to convert ArrayBuffer to Base64 in a browser environment
function arrayBufferToBase64(buffer: ArrayBuffer): string {
  let binary = "";
  const bytes = new Uint8Array(buffer);
  const len = bytes.byteLength;
  for (let i = 0; i < len; i++) {
    binary += String.fromCharCode(bytes[i]);
  }
  return window.btoa(binary);
}

// Robust currency formatter that handles custom currency symbols safely
function formatCurrency(amount: number, currencyCode: string, locale: string): string {
  const code = (currencyCode || "USD").toUpperCase().trim();
  const valStr = amount.toLocaleString(locale === "ru" ? "ru-RU" : "en-US", {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2
  });
  if (code === "RUB" || code === "₽" || code === "РУБ") {
    return `${valStr} ₽`;
  }
  if (code === "KZT" || code === "₸" || code === "ТГ") {
    return `${valStr} ₸`;
  }
  if (code === "EUR" || code === "€") {
    return `€ ${valStr}`;
  }
  if (code === "USD" || code === "$") {
    return `$ ${valStr}`;
  }
  return `${valStr} ${code}`;
}

const expenseCategoriesMap: Record<string, Record<string, string>> = {
  ru: {
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
  en: {
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
  es: {
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
  }
};

const pivotTranslations = {
  ru: {
    title: "ФИНАНСОВЫЙ СВОДНЫЙ ОТЧЕТ",
    subtitle: "Экспорт аналитики и спецификаций счет-фактур",
    dateGenerated: "Дата создания",
    byObjectTitle: "Сводка по объектам / проектам",
    bySupplierTitle: "Сводка по поставщикам (расходы)",
    byClientIncomeTitle: "Доходы от клиентов",
    byCategoryTitle: "Сводка по категориям расходов",
    detailedTitle: "Спецификация всех позиций",
    colObject: "Объект / Проект",
    colSupplier: "Поставщик",
    colClient: "Клиент",
    colCategory: "Категория расходов",
    colTotal: "Сумма",
    grandTotal: "Итого по отчету",
    colIncome: "Доходы",
    colExpense: "Расходы",
    colProfit: "Прибыль",
    colTransType: "Тип операции",
    colDate: "Дата",
    colDoc: "Документ",
    colDesc: "Позиция",
    colType: "Тип позиции",
    colQty: "Кол-во",
    colPrice: "Цена",
    colCurrency: "Вал.",
    goodsVal: "Товар",
    servicesVal: "Услуга",
    overallMetrics: "Общие финансовые показатели",
    noData: "Нет данных для отображения",
    footerText: "Стр. {page} из {total}"
  },
  es: {
    title: "INFORME FINANCIERO RESUMIDO",
    subtitle: "Exportación de analíticas y especificaciones de facturas",
    dateGenerated: "Fecha de generación",
    byObjectTitle: "Resumen por objetos / proyectos",
    bySupplierTitle: "Resumen por proveedores (gastos)",
    byClientIncomeTitle: "Ingresos de clientes",
    byCategoryTitle: "Resumen por categorías de gastos",
    detailedTitle: "Especificación de todas las partidas",
    colObject: "Objeto / Proyecto",
    colSupplier: "Proveedor",
    colClient: "Cliente",
    colCategory: "Categoría de gastos",
    colTotal: "Importe",
    grandTotal: "Total general",
    colIncome: "Ingresos",
    colExpense: "Gastos",
    colProfit: "Beneficios",
    colTransType: "Tipo de transacción",
    colDate: "Fecha",
    colDoc: "Documento",
    colDesc: "Artículo",
    colType: "Tipo",
    colQty: "Cant.",
    colPrice: "Precio",
    colCurrency: "Mon.",
    goodsVal: "Bienes",
    servicesVal: "Servicio",
    overallMetrics: "Métricas financieras generales",
    noData: "No hay datos para mostrar",
    footerText: "Pág. {page} de {total}"
  },
  en: {
    title: "FINANCIAL SUMMARY REPORT",
    subtitle: "Exported invoice analytics & specifications tracker",
    dateGenerated: "Date generated",
    byObjectTitle: "Summary by objects / projects",
    bySupplierTitle: "Summary by suppliers (expenses)",
    byClientIncomeTitle: "Incomes from clients",
    byCategoryTitle: "Summary by expense categories",
    detailedTitle: "All line-item specifications",
    colObject: "Object / Project",
    colSupplier: "Supplier",
    colClient: "Client",
    colCategory: "Expense Category",
    colTotal: "Amount",
    grandTotal: "Grand Total",
    colIncome: "Income",
    colExpense: "Expenses",
    colProfit: "Net Profit",
    colTransType: "Transaction Type",
    colDate: "Date",
    colDoc: "Doc #",
    colDesc: "Description",
    colType: "Type",
    colQty: "Qty",
    colPrice: "Unit Price",
    colCurrency: "Curr.",
    goodsVal: "Goods",
    servicesVal: "Service",
    overallMetrics: "Overall Financial Metrics",
    noData: "No data available to display",
    footerText: "Page {page} of {total}"
  }
};

export async function exportInvoicesToPdf(
  invoices: Invoice[],
  locale: string = "en",
  filters?: {
    filterType?: string;
    filterCategory?: string;
    searchSupplier?: string;
    searchQuery?: string;
    selectedObject?: string;
    startDate?: string;
    endDate?: string;
  }
) {
  const doc = new jsPDF("p", "mm", "a4");
  const pt = pivotTranslations[locale as "ru" | "es" | "en"] || pivotTranslations.en;
  const defObj = locale === "ru" ? "Без объекта" : locale === "es" ? "Sin objeto" : "No Object/Project";

  // Check if we can load the custom Roboto font to support Cyrillic characters perfectly
  let isRobotoLoaded = false;
  try {
    const timeout = (ms: number) => new Promise((_, reject) => setTimeout(() => reject(new Error("Timeout")), ms));
    const fontFetchPromise = Promise.all([
      fetch("https://cdn.jsdelivr.net/npm/roboto-fontface-bower@0.8.0/fonts/roboto/Roboto-Regular.ttf"),
      fetch("https://cdn.jsdelivr.net/npm/roboto-fontface-bower@0.8.0/fonts/roboto/Roboto-Bold.ttf")
    ]);

    // We race with a 3.5-second timeout so the PDF exporter fails gracefully to Helvetica if the network is slow
    const results = (await Promise.race([fontFetchPromise, timeout(3500)])) as Response[];
    
    if (results && results[0]?.ok && results[1]?.ok) {
      const [regBuffer, boldBuffer] = await Promise.all([
        results[0].arrayBuffer(),
        results[1].arrayBuffer()
      ]);
      const regBase64 = arrayBufferToBase64(regBuffer);
      const boldBase64 = arrayBufferToBase64(boldBuffer);
      
      doc.addFileToVFS("Roboto-Regular.ttf", regBase64);
      doc.addFont("Roboto-Regular.ttf", "Roboto", "normal");
      doc.addFileToVFS("Roboto-Bold.ttf", boldBase64);
      doc.addFont("Roboto-Bold.ttf", "Roboto", "bold");
      
      doc.setFont("Roboto", "normal");
      isRobotoLoaded = true;
    }
  } catch (error) {
    console.error("Failed to load custom Unicode font, using built-in standard Helvetica:", error);
  }

  const activeFont = isRobotoLoaded ? "Roboto" : "Helvetica";
  doc.setFont(activeFont, "normal");

  // 1. Filter and Aggregate Data
  const objectSummaryMap: Record<string, Record<string, { income: number; expense: number; profit: number }>> = {};
  const supplierSummaryMap: Record<string, Record<string, { income: number; expense: number; profit: number }>> = {};
  const clientIncomeSummaryMap: Record<string, Record<string, number>> = {};
  const categorySummaryMap: Record<string, Record<string, { income: number; expense: number; profit: number }>> = {};
  
  // Overall metrics grouped by Currency
  const overallMetricsMap: Record<string, { income: number; expense: number; profit: number; count: number }> = {};
  const detailedItemsList: any[] = [];

  invoices.forEach((inv) => {
    if (!inv) return;
    const items = Array.isArray(inv.items) ? inv.items : [];
    const currency = (inv.currency || "USD").toUpperCase().trim();

    items.forEach((item) => {
      if (!item) return;

      // Apply Filters
      if (filters) {
        const {
          filterType = "all",
          filterCategory = "all",
          searchSupplier = "",
          searchQuery = "",
          selectedObject = "all",
          startDate = "",
          endDate = ""
        } = filters;

        if (filterType !== "all" && item.type !== filterType) return;
        if (filterCategory !== "all" && (item.expenseCategory || "other") !== filterCategory) return;
        if (searchSupplier && !(inv.supplierName || "").toLowerCase().includes(searchSupplier.toLowerCase())) return;
        if (selectedObject !== "all") {
          const objName = item.objectName || inv.objectName || "";
          if (objName.trim().toLowerCase() !== selectedObject.trim().toLowerCase()) return;
        }
        if (searchQuery) {
          const q = searchQuery.toLowerCase();
          const matchDesc = (item.description || "").toLowerCase().includes(q);
          const matchSupplier = (inv.supplierName || "").toLowerCase().includes(q);
          const matchNum = (inv.invoiceNumber || "").toLowerCase().includes(q);
          const matchObj = (item.objectName || inv.objectName || "").toLowerCase().includes(q);
          if (!matchDesc && !matchSupplier && !matchNum && !matchObj) return;
        }
        if (startDate && (inv.date || "") < startDate) return;
        if (endDate && (inv.date || "") > endDate) return;
      }

      const objName = (item.objectName || inv.objectName || "").trim() || defObj;
      const supName = (inv.supplierName || "").trim() || (locale === "ru" ? "Неизвестный поставщик" : locale === "es" ? "Proveedor desconocido" : "Unknown Supplier");
      const val = Number(item.totalPrice) || 0;
      const isIncome = inv.invoiceType === "income";

      // 1.1 Store detailed item
      detailedItemsList.push({
        date: inv.date || "",
        docNum: inv.invoiceNumber || (locale === "ru" ? "Б/Н" : locale === "es" ? "S/N" : "N/A"),
        supplier: supName,
        objectName: objName,
        description: item.description || "",
        type: item.type === "goods" ? pt.goodsVal : pt.servicesVal,
        transType: isIncome ? pt.colIncome : pt.colExpense,
        category: isIncome ? "" : (expenseCategoriesMap[locale as "ru"|"es"|"en"]?.[item.expenseCategory || "other"] || item.expenseCategory || "other"),
        qty: Number(item.quantity) || 0,
        price: Number(item.unitPrice) || 0,
        total: val,
        currency
      });

      // 1.2 Overall aggregations
      if (!overallMetricsMap[currency]) {
        overallMetricsMap[currency] = { income: 0, expense: 0, profit: 0, count: 0 };
      }
      if (isIncome) {
        overallMetricsMap[currency].income += val;
        overallMetricsMap[currency].profit += val;
      } else {
        overallMetricsMap[currency].expense += val;
        overallMetricsMap[currency].profit -= val;
      }

      // 1.3 Object aggregation
      if (!objectSummaryMap[objName]) {
        objectSummaryMap[objName] = {};
      }
      if (!objectSummaryMap[objName][currency]) {
        objectSummaryMap[objName][currency] = { income: 0, expense: 0, profit: 0 };
      }
      if (isIncome) {
        objectSummaryMap[objName][currency].income += val;
        objectSummaryMap[objName][currency].profit += val;
      } else {
        objectSummaryMap[objName][currency].expense += val;
        objectSummaryMap[objName][currency].profit -= val;
      }

      // 1.4 Supplier aggregation or Client income aggregation
      if (isIncome) {
        if (!clientIncomeSummaryMap[supName]) {
          clientIncomeSummaryMap[supName] = {};
        }
        clientIncomeSummaryMap[supName][currency] = (clientIncomeSummaryMap[supName][currency] || 0) + val;
      } else {
        if (!supplierSummaryMap[supName]) {
          supplierSummaryMap[supName] = {};
        }
        if (!supplierSummaryMap[supName][currency]) {
          supplierSummaryMap[supName][currency] = { income: 0, expense: 0, profit: 0 };
        }
        supplierSummaryMap[supName][currency].expense += val;
        supplierSummaryMap[supName][currency].profit -= val;
      }

      // 1.5 Category aggregation
      if (!isIncome) {
        const catLabel = expenseCategoriesMap[locale as "ru"|"es"|"en"]?.[item.expenseCategory || "other"] || item.expenseCategory || "other";
        if (!categorySummaryMap[catLabel]) {
          categorySummaryMap[catLabel] = {};
        }
        if (!categorySummaryMap[catLabel][currency]) {
          categorySummaryMap[catLabel][currency] = { income: 0, expense: 0, profit: 0 };
        }
        categorySummaryMap[catLabel][currency].expense += val;
        categorySummaryMap[catLabel][currency].profit -= val;
      }
    });
  });

  // Unique document counter
  const uniqueDocIds = new Set(invoices.map(i => i.id));
  const docsCount = uniqueDocIds.size;

  // Header Draw helper (runs on every page)
  let yPos = 15;

  const drawHeader = (pageNumber: number) => {
    // Top primary banner bar
    doc.setFillColor(30, 41, 59); // Slate 800
    doc.rect(15, 12, 180, 20, "F");

    // Title text inside banner
    doc.setFont(activeFont, "bold");
    doc.setFontSize(14);
    doc.setTextColor(255, 255, 255);
    doc.text(pt.title, 20, 21);

    // Subtitle
    doc.setFont(activeFont, "normal");
    doc.setFontSize(8.5);
    doc.setTextColor(148, 163, 184); // Slate 400
    doc.text(pt.subtitle, 20, 27);

    // Brand Label on right
    doc.setFont(activeFont, "bold");
    doc.setFontSize(15);
    doc.setTextColor(245, 158, 11); // Amber 500
    doc.text("FacturaScan", 155, 25);

    // Generation Info Line
    doc.setFont(activeFont, "normal");
    doc.setFontSize(7.5);
    doc.setTextColor(100, 116, 139); // Slate 500
    const nowStr = new Date().toLocaleString(locale === "ru" ? "ru-RU" : "en-US");
    doc.text(`${pt.dateGenerated}: ${nowStr}  |  Doc count: ${docsCount}  |  Filter items: ${detailedItemsList.length}`, 15, 38);

    // Bottom double line
    doc.setDrawColor(226, 232, 240); // Slate 200
    doc.setLineWidth(0.5);
    doc.line(15, 41, 195, 41);
  };

  // Draw Header for Page 1
  drawHeader(1);
  yPos = 47;

  // 2. Section: Overall Financial Metrics (Bento metrics)
  doc.setFont(activeFont, "bold");
  doc.setFontSize(11);
  doc.setTextColor(30, 41, 59);
  doc.text(`📊 ${pt.overallMetrics.toUpperCase()}`, 15, yPos);
  yPos += 5;

  // Create Overall Metrics Rows
  const overallRows: any[] = [];
  Object.entries(overallMetricsMap).forEach(([currency, stats]) => {
    overallRows.push([
      currency,
      formatCurrency(stats.income, currency, locale),
      formatCurrency(stats.expense, currency, locale),
      formatCurrency(stats.profit, currency, locale)
    ]);
  });

  if (overallRows.length === 0) {
    overallRows.push(["-", pt.noData, "-", "-"]);
  }

  autoTable(doc, {
    startY: yPos,
    margin: { left: 15, right: 15 },
    head: [[pt.colCurrency, pt.colIncome, pt.colExpense, pt.colProfit]],
    body: overallRows,
    theme: "grid",
    styles: {
      font: activeFont,
      fontSize: 9,
      textColor: [51, 65, 85],
      cellPadding: 3
    },
    headStyles: {
      fillColor: [51, 65, 85], // Slate 700
      textColor: [255, 255, 255],
      fontStyle: "bold"
    },
    columnStyles: {
      0: { fontStyle: "bold", halign: "center", cellWidth: 30 },
      1: { halign: "right", textColor: [22, 163, 74] }, // Green
      2: { halign: "right", textColor: [220, 38, 38] }, // Red
      3: { halign: "right", fontStyle: "bold" }
    },
    didDrawPage: (data) => {
      yPos = data.cursor ? data.cursor.y + 10 : yPos + 25;
    }
  });

  // 3. Section: Object/Project Summary
  if (yPos > 240) {
    doc.addPage();
    drawHeader(doc.getNumberOfPages());
    yPos = 47;
  }

  doc.setFont(activeFont, "bold");
  doc.setFontSize(10.5);
  doc.setTextColor(30, 41, 59);
  doc.text(`📊 ${pt.byObjectTitle.toUpperCase()}`, 15, yPos);
  yPos += 5;

  const objectRows: any[] = [];
  Object.entries(objectSummaryMap).forEach(([objName, currencies]) => {
    Object.entries(currencies).forEach(([currency, stats]) => {
      objectRows.push([
        objName,
        currency,
        formatCurrency(stats.income, currency, locale),
        formatCurrency(stats.expense, currency, locale),
        formatCurrency(stats.profit, currency, locale)
      ]);
    });
  });

  if (objectRows.length === 0) {
    objectRows.push([pt.noData, "-", "-", "-", "-"]);
  }

  autoTable(doc, {
    startY: yPos,
    margin: { left: 15, right: 15 },
    head: [[pt.colObject, pt.colCurrency, pt.colIncome, pt.colExpense, pt.colProfit]],
    body: objectRows,
    theme: "striped",
    styles: {
      font: activeFont,
      fontSize: 8.5,
      textColor: [51, 65, 85],
      cellPadding: 2.5
    },
    headStyles: {
      fillColor: [71, 85, 105], // Slate 600
      textColor: [255, 255, 255],
      fontStyle: "bold"
    },
    columnStyles: {
      0: { fontStyle: "bold" },
      1: { halign: "center" },
      2: { halign: "right" },
      3: { halign: "right" },
      4: { halign: "right", fontStyle: "bold" }
    },
    didDrawPage: (data) => {
      yPos = data.cursor ? data.cursor.y + 10 : yPos + 30;
    }
  });

  // 4. Section: Category Summary
  if (yPos > 240) {
    doc.addPage();
    drawHeader(doc.getNumberOfPages());
    yPos = 47;
  }

  doc.setFont(activeFont, "bold");
  doc.setFontSize(10.5);
  doc.setTextColor(30, 41, 59);
  doc.text(`📊 ${pt.byCategoryTitle.toUpperCase()}`, 15, yPos);
  yPos += 5;

  const categoryRows: any[] = [];
  Object.entries(categorySummaryMap).forEach(([catName, currencies]) => {
    Object.entries(currencies).forEach(([currency, stats]) => {
      categoryRows.push([
        catName,
        currency,
        formatCurrency(stats.expense, currency, locale)
      ]);
    });
  });

  if (categoryRows.length === 0) {
    categoryRows.push([pt.noData, "-", "-"]);
  }

  autoTable(doc, {
    startY: yPos,
    margin: { left: 15, right: 15 },
    head: [[pt.colCategory, pt.colCurrency, pt.colTotal]],
    body: categoryRows,
    theme: "striped",
    styles: {
      font: activeFont,
      fontSize: 8.5,
      textColor: [51, 65, 85],
      cellPadding: 2.5
    },
    headStyles: {
      fillColor: [71, 85, 105], // Slate 600
      textColor: [255, 255, 255],
      fontStyle: "bold"
    },
    columnStyles: {
      0: { fontStyle: "bold" },
      1: { halign: "center", cellWidth: 30 },
      2: { halign: "right", fontStyle: "bold" }
    },
    didDrawPage: (data) => {
      yPos = data.cursor ? data.cursor.y + 10 : yPos + 30;
    }
  });

  // 5. Section: Supplier Summary (Expenses only)
  if (yPos > 240) {
    doc.addPage();
    drawHeader(doc.getNumberOfPages());
    yPos = 47;
  }

  doc.setFont(activeFont, "bold");
  doc.setFontSize(10.5);
  doc.setTextColor(30, 41, 59);
  doc.text(`📊 ${pt.bySupplierTitle.toUpperCase()}`, 15, yPos);
  yPos += 5;

  const supplierRows: any[] = [];
  Object.entries(supplierSummaryMap).forEach(([supName, currencies]) => {
    Object.entries(currencies).forEach(([currency, stats]) => {
      supplierRows.push([
        supName,
        currency,
        formatCurrency(stats.expense, currency, locale)
      ]);
    });
  });

  if (supplierRows.length === 0) {
    supplierRows.push([pt.noData, "-", "-"]);
  }

  autoTable(doc, {
    startY: yPos,
    margin: { left: 15, right: 15 },
    head: [[pt.colSupplier, pt.colCurrency, pt.colExpense]],
    body: supplierRows,
    theme: "striped",
    styles: {
      font: activeFont,
      fontSize: 8.5,
      textColor: [51, 65, 85],
      cellPadding: 2.5
    },
    headStyles: {
      fillColor: [71, 85, 105], // Slate 600
      textColor: [255, 255, 255],
      fontStyle: "bold"
    },
    columnStyles: {
      0: { fontStyle: "bold" },
      1: { halign: "center", cellWidth: 30 },
      2: { halign: "right", fontStyle: "bold" }
    },
    didDrawPage: (data) => {
      yPos = data.cursor ? data.cursor.y + 10 : yPos + 30;
    }
  });

  // 5.5. Section: Client Incomes Summary
  if (yPos > 240) {
    doc.addPage();
    drawHeader(doc.getNumberOfPages());
    yPos = 47;
  }

  doc.setFont(activeFont, "bold");
  doc.setFontSize(10.5);
  doc.setTextColor(30, 41, 59);
  doc.text(`📊 ${pt.byClientIncomeTitle.toUpperCase()}`, 15, yPos);
  yPos += 5;

  const clientIncomeRows: any[] = [];
  Object.entries(clientIncomeSummaryMap).forEach(([clientName, currencies]) => {
    Object.entries(currencies).forEach(([currency, val]) => {
      clientIncomeRows.push([
        clientName,
        currency,
        formatCurrency(val, currency, locale)
      ]);
    });
  });

  if (clientIncomeRows.length === 0) {
    clientIncomeRows.push([pt.noData, "-", "-"]);
  }

  autoTable(doc, {
    startY: yPos,
    margin: { left: 15, right: 15 },
    head: [[pt.colClient, pt.colCurrency, pt.colIncome]],
    body: clientIncomeRows,
    theme: "striped",
    styles: {
      font: activeFont,
      fontSize: 8.5,
      textColor: [51, 65, 85],
      cellPadding: 2.5
    },
    headStyles: {
      fillColor: [71, 85, 105], // Slate 600
      textColor: [255, 255, 255],
      fontStyle: "bold"
    },
    columnStyles: {
      0: { fontStyle: "bold" },
      1: { halign: "center", cellWidth: 30 },
      2: { halign: "right", fontStyle: "bold" }
    },
    didDrawPage: (data) => {
      yPos = data.cursor ? data.cursor.y + 10 : yPos + 30;
    }
  });

  // 6. Section: Detailed Specifications
  // Let's force a page break for the detailed item list to start fresh, clean, and spacious!
  doc.addPage();
  drawHeader(doc.getNumberOfPages());
  yPos = 47;

  doc.setFont(activeFont, "bold");
  doc.setFontSize(11);
  doc.setTextColor(30, 41, 59);
  doc.text(`📊 ${pt.detailedTitle.toUpperCase()}`, 15, yPos);
  yPos += 5;

  const detailedBody: any[] = [];
  detailedItemsList.forEach((item) => {
    detailedBody.push([
      item.date,
      item.docNum,
      item.supplier,
      item.objectName,
      item.description,
      item.type,
      item.transType,
      item.category,
      item.qty,
      formatCurrency(item.price, item.currency, locale),
      formatCurrency(item.total, item.currency, locale)
    ]);
  });

  if (detailedBody.length === 0) {
    detailedBody.push([pt.noData, "-", "-", "-", "-", "-", "-", "-", "-", "-", "-"]);
  }

  autoTable(doc, {
    startY: yPos,
    margin: { left: 15, right: 15 },
    head: [[
      pt.colDate,
      pt.colDoc,
      pt.colSupplier,
      pt.colObject,
      pt.colDesc,
      pt.colType,
      pt.colTransType,
      pt.colCategory,
      pt.colQty,
      pt.colPrice,
      pt.colTotal
    ]],
    body: detailedBody,
    theme: "grid",
    styles: {
      font: activeFont,
      fontSize: 7,
      cellPadding: 1.8,
      textColor: [51, 65, 85],
      overflow: "linebreak"
    },
    headStyles: {
      fillColor: [30, 41, 59], // Slate 800
      textColor: [255, 255, 255],
      fontStyle: "bold",
      fontSize: 7.5
    },
    columnStyles: {
      0: { halign: "center", cellWidth: 14 }, // Date
      1: { halign: "center", cellWidth: 12 }, // Doc #
      2: { cellWidth: 22 },                  // Supplier
      3: { cellWidth: 18 },                  // Object
      4: { cellWidth: 26 },                  // Description
      5: { halign: "center", cellWidth: 11 }, // Type
      6: { halign: "center", cellWidth: 15 }, // Trans Type
      7: { cellWidth: 18 },                  // Category
      8: { halign: "center", cellWidth: 8 },  // Qty
      9: { halign: "right", cellWidth: 16 }, // Unit Price
      10: { halign: "right", fontStyle: "bold", cellWidth: 18 } // Total
    },
    didDrawPage: (data) => {
      // Draw header on new pages if we've page-broken during detailed list
      const currentPage = data.pageNumber;
      if (currentPage > 1) {
        // Redraw nice header for secondary pages!
        drawHeader(currentPage);
      }
    }
  });

  // 7. Add professional Page numbers in footer of ALL pages
  const totalPages = doc.getNumberOfPages();
  for (let i = 1; i <= totalPages; i++) {
    doc.setPage(i);
    doc.setFont(activeFont, "normal");
    doc.setFontSize(7.5);
    doc.setTextColor(148, 163, 184); // Slate 400
    const footerText = pt.footerText.replace("{page}", String(i)).replace("{total}", String(totalPages));
    doc.text(footerText, 195 - doc.getTextWidth(footerText), 287);
    doc.text("FacturaScan © 2026 - AI OCR Assistant", 15, 287);
  }

  // Save the PDF
  const filename = `Financial_Report_${new Date().toISOString().slice(0, 10)}.pdf`;
  doc.save(filename);
}

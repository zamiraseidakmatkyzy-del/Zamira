import { jsPDF } from "jspdf";
import autoTable from "jspdf-autotable";
import XLSX from "xlsx-js-style";

interface ScheduleCData {
  year: string;
  currency: string;
  businessName: string;
  income: number;
  expense: number;
  profit: number;
  tax: number;
  categories: Record<string, number>;
  quarters: Record<number, { income: number; expense: number; profit: number; tax: number }>;
}

// Helpers for currency formatting
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

// Helper to convert ArrayBuffer to Base64 (needed for loading Roboto font)
function arrayBufferToBase64(buffer: ArrayBuffer): string {
  let binary = "";
  const bytes = new Uint8Array(buffer);
  const len = bytes.byteLength;
  for (let i = 0; i < len; i++) {
    binary += String.fromCharCode(bytes[i]);
  }
  return window.btoa(binary);
}

// Map app categories to Schedule C lines
function mapCategoriesToIRS(categories: Record<string, number>) {
  const fuel = categories["fuel"] || 0; // Line 9
  const subcontracting = categories["subcontracting"] || 0; // Line 11
  const insurance = categories["insurance"] || 0; // Line 15
  const office = categories["office_expenses"] || 0; // Line 18
  const rent = categories["equipment_rental"] || 0; // Line 20a
  const taxes = (categories["taxes_fees"] || 0) + (categories["permit"] || 0); // Line 23
  const utilities = categories["utility_expenses"] || 0; // Line 25
  const wages = categories["labor"] || 0; // Line 26
  const materials = categories["materials"] || 0; // Mapped as Cost of Goods Sold (COGS)
  const other = categories["other"] || 0; // Line 27a

  const totalPartIIExpenses = fuel + subcontracting + insurance + office + rent + taxes + utilities + wages + other;

  return {
    fuel,
    subcontracting,
    insurance,
    office,
    rent,
    taxes,
    utilities,
    wages,
    materials, // COGS
    other,
    totalPartIIExpenses
  };
}

export async function exportScheduleCToPdf(data: ScheduleCData, locale: string = "en") {
  const doc = new jsPDF("p", "mm", "a4");
  const isRu = locale === "ru";
  
  // Try to load Roboto Font for Cyrillic support
  let isRobotoLoaded = false;
  try {
    const timeout = (ms: number) => new Promise((_, reject) => setTimeout(() => reject(new Error("Timeout")), ms));
    const fontFetchPromise = Promise.all([
      fetch("https://cdn.jsdelivr.net/npm/roboto-fontface-bower@0.8.0/fonts/roboto/Roboto-Regular.ttf"),
      fetch("https://cdn.jsdelivr.net/npm/roboto-fontface-bower@0.8.0/fonts/roboto/Roboto-Bold.ttf")
    ]);

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
    console.error("Failed to load custom Unicode font, fallback to standard:", error);
  }

  const font = isRobotoLoaded ? "Roboto" : "Helvetica";
  const currency = data.currency;

  const irsData = mapCategoriesToIRS(data.categories);

  // 1. PAGE HEADER (IRS Schedule C style)
  doc.setLineWidth(0.8);
  doc.line(10, 10, 200, 10); // top border

  doc.setFont(font, "bold");
  doc.setFontSize(14);
  doc.text("SCHEDULE C", 12, 16);
  doc.setFontSize(10);
  doc.text("(Form 1040)", 12, 21);

  doc.setFont(font, "bold");
  doc.setFontSize(11);
  doc.text(isRu ? "Прибыль или убыток от бизнеса (Индивидуальное предприятие)" : "Profit or Loss From Business (Sole Proprietorship)", 50, 16);
  doc.setFont(font, "normal");
  doc.setFontSize(8.5);
  doc.text(isRu ? "Министерство финансов США - Налоговая служба (IRS)" : "Department of the Treasury - Internal Revenue Service (IRS)", 50, 21);

  // OMB and Year Box
  doc.rect(165, 11, 35, 12);
  doc.setFont(font, "bold");
  doc.setFontSize(12);
  doc.text(data.year, 182, 19, { align: "center" });
  doc.setFontSize(7);
  doc.text("Attachment Sequence No. 09", 182, 22, { align: "center" });

  doc.setLineWidth(0.4);
  doc.line(10, 24, 200, 24);

  // 2. BUSINESS DETAILS BLOCK
  doc.setFont(font, "bold");
  doc.setFontSize(8);
  doc.text(isRu ? "Имя владельца бизнеса (Workspace):" : "Name of Proprietor (Workspace):", 12, 29);
  doc.setFont(font, "normal");
  doc.text(data.businessName, 60, 29);

  doc.setFont(font, "bold");
  doc.text(isRu ? "Вид деятельности / Проект:" : "Principal Business or Profession:", 12, 34);
  doc.setFont(font, "normal");
  doc.text(isRu ? "Строительство / Девелопмент" : "Construction & Professional Services", 60, 34);

  doc.setFont(font, "bold");
  doc.text(isRu ? "Идентификационный номер EIN:" : "Employer ID Number (EIN):", 140, 29);
  doc.setFont(font, "normal");
  doc.text("XX-XXXXXXX", 180, 29);

  doc.setFont(font, "bold");
  doc.text(isRu ? "Отчетный период:" : "Reporting Period:", 140, 34);
  doc.setFont(font, "normal");
  doc.text(`Jan 1 - Dec 31, ${data.year}`, 180, 34);

  doc.setLineWidth(0.6);
  doc.line(10, 37, 200, 37);

  // 3. PART I: INCOME
  doc.setFillColor(245, 245, 245);
  doc.rect(10, 38, 190, 6, "F");
  doc.setFont(font, "bold");
  doc.setFontSize(9);
  doc.text(isRu ? "Часть I: Доходы (Part I: Income)" : "Part I: Income", 12, 42);
  doc.line(10, 44, 200, 44);

  // Income Table
  const incomeRows = [
    ["1", isRu ? "Валовая выручка или продажи" : "Gross receipts or sales", formatCurrency(data.income, currency, locale)],
    ["2", isRu ? "Возвраты и скидки" : "Returns and allowances", formatCurrency(0, currency, locale)],
    ["3", isRu ? "Чистая выручка (Вычесть строку 2 из строки 1)" : "Subtract line 2 from line 1", formatCurrency(data.income, currency, locale)],
    ["4", isRu ? "Себестоимость проданных товаров (Часть III, закупка материалов)" : "Cost of goods sold (Part III / Materials)", formatCurrency(irsData.materials, currency, locale)],
    ["5", isRu ? "Валовая прибыль (Вычесть строку 4 из строки 3)" : "Gross profit (Subtract line 4 from line 3)", formatCurrency(data.income - irsData.materials, currency, locale)],
    ["7", isRu ? "Валовой доход" : "Gross income", formatCurrency(data.income - irsData.materials, currency, locale)]
  ];

  let y = 49;
  doc.setFont(font, "normal");
  doc.setFontSize(8);
  incomeRows.forEach((row) => {
    doc.setFont(font, row[0] === "5" || row[0] === "7" ? "bold" : "normal");
    doc.text(row[0], 12, y);
    doc.text(row[1], 18, y);
    doc.text(row[2], 195, y, { align: "right" });
    doc.setDrawColor(230, 230, 230);
    doc.line(10, y + 2, 200, y + 2);
    y += 6;
  });

  // 4. PART II: EXPENSES
  y += 2;
  doc.setFillColor(245, 245, 245);
  doc.setDrawColor(0, 0, 0);
  doc.rect(10, y, 190, 6, "F");
  doc.setFont(font, "bold");
  doc.setFontSize(9);
  doc.text(isRu ? "Часть II: Расходы (Part II: Expenses)" : "Part II: Expenses", 12, y + 4);
  doc.line(10, y + 6, 200, y + 6);
  y += 11;

  const expenseRows = [
    ["9", isRu ? "Расходы на транспорт и топливо (Fuel & Lubricants)" : "Car and truck expenses (Fuel & Lubricants)", formatCurrency(irsData.fuel, currency, locale)],
    ["11", isRu ? "Контрактные работы и субподряд (Subcontracting)" : "Contract labor (Subcontracting)", formatCurrency(irsData.subcontracting, currency, locale)],
    ["15", isRu ? "Страхование (Insurance)" : "Insurance (other than health)", formatCurrency(irsData.insurance, currency, locale)],
    ["18", isRu ? "Офисные расходы (Office Expenses)" : "Office expense (Office Expenses)", formatCurrency(irsData.office, currency, locale)],
    ["20a", isRu ? "Аренда оборудования и машин (Equipment Rental)" : "Rent: Vehicles, machinery, and equipment", formatCurrency(irsData.rent, currency, locale)],
    ["23", isRu ? "Налоги, лицензии и пошлины (Taxes & Fees, Permits)" : "Taxes and licenses (Taxes & Fees, Permits)", formatCurrency(irsData.taxes, currency, locale)],
    ["25", isRu ? "Коммунальные услуги (Utility Expenses)" : "Utilities (Utility Expenses)", formatCurrency(irsData.utilities, currency, locale)],
    ["26", isRu ? "Заработная плата и оплата труда (Labor & Wages)" : "Wages (less employment credits)", formatCurrency(irsData.wages, currency, locale)],
    ["27a", isRu ? "Прочие расходы (Other Expenses)" : "Other expenses (Other Expenses)", formatCurrency(irsData.other, currency, locale)],
    ["28", isRu ? "Общие расходы до использования дома (Сумма строк 9-27a)" : "Total expenses before home use (Sum lines 9-27a)", formatCurrency(irsData.totalPartIIExpenses, currency, locale)],
    ["31", isRu ? "Чистая прибыль или убыток (Вычесть строку 28 из строки 5)" : "Net profit or loss (Subtract line 28 from line 5)", formatCurrency(data.profit, currency, locale)]
  ];

  doc.setFont(font, "normal");
  doc.setFontSize(8);
  expenseRows.forEach((row) => {
    const isNetProfit = row[0] === "31";
    const isTotalExp = row[0] === "28";
    doc.setFont(font, isNetProfit || isTotalExp ? "bold" : "normal");
    
    if (isNetProfit) {
      doc.setFillColor(254, 243, 199); // Light yellow highlight for Net Profit
      doc.rect(10, y - 4, 190, 6, "F");
    }

    doc.text(row[0], 12, y);
    doc.text(row[1], 18, y);
    doc.text(row[2], 195, y, { align: "right" });
    doc.setDrawColor(230, 230, 230);
    doc.line(10, y + 2, 200, y + 2);
    y += 6;
  });

  // Check page break or continue
  // Visual graphs and Quarterly are extremely critical, so let's place them on PAGE 2 or space them beautifully!
  // Let's force page break to keep Page 1 perfectly styled as IRS Form, and Page 2 as the visual analytic report!
  doc.addPage();
  
  // PAGE 2 HEADER
  doc.setLineWidth(0.8);
  doc.setDrawColor(0, 0, 0);
  doc.line(10, 10, 200, 10);
  
  doc.setFont(font, "bold");
  doc.setFontSize(13);
  doc.text(isRu ? "АНАЛИТИЧЕСКИЙ ОТЧЕТ И ГРАФИКА РАСХОДОВ" : "EXPENSE DISTRIBUTION ANALYTICS & GRAPHICS", 12, 16);
  doc.setFont(font, "normal");
  doc.setFontSize(8.5);
  doc.text(`${data.businessName} • ${isRu ? "Год" : "Year"} ${data.year} • ${currency}`, 12, 21);

  doc.setLineWidth(0.4);
  doc.line(10, 24, 200, 24);

  // 5. GRAPHICS SECTION (Visual progress bars for category share)
  y = 30;
  doc.setFont(font, "bold");
  doc.setFontSize(10);
  doc.text(isRu ? "Распределение расходов по категориям (в процентах):" : "Expense Category Share & Percentages:", 12, y);
  y += 5;

  const totalExpense = data.expense || 1;
  const sortedCategoriesList = Object.entries(data.categories)
    .map(([name, amount]) => ({
      name,
      amount,
      percentage: Math.round((amount / totalExpense) * 100)
    }))
    .sort((a, b) => b.amount - a.amount);

  const categoryTranslations: Record<string, string> = {
    materials: isRu ? "Материалы и снабжение" : "Materials & Supplies",
    labor: isRu ? "Оплата труда и работы" : "Labor & Wages",
    equipment_rental: isRu ? "Аренда оборудования" : "Equipment Rental",
    fuel: isRu ? "Топливо и ГСМ" : "Fuel & Lubricants",
    permit: isRu ? "Разрешения и лицензии" : "Permits & Licenses",
    office_expenses: isRu ? "Офисные расходы" : "Office Expenses",
    insurance: isRu ? "Страхование" : "Insurance",
    taxes_fees: isRu ? "Налоги и пошлины" : "Taxes & Duties",
    subcontracting: isRu ? "Субподряд" : "Subcontracting",
    utility_expenses: isRu ? "Коммунальные услуги" : "Utility Expenses",
    other: isRu ? "Прочие расходы" : "Other Expenses"
  };

  sortedCategoriesList.forEach((cat) => {
    if (cat.amount === 0) return; // skip zero categories

    const label = categoryTranslations[cat.name] || cat.name;
    const valueStr = `${formatCurrency(cat.amount, currency, locale)} (${cat.percentage}%)`;

    doc.setFont(font, "bold");
    doc.setFontSize(8);
    doc.setTextColor(51, 65, 85); // Slate 700
    doc.text(label, 12, y);

    doc.setFont(font, "mono");
    doc.setFontSize(8);
    doc.setTextColor(100, 116, 139); // Slate 500
    doc.text(valueStr, 195, y, { align: "right" });

    y += 2.5;

    // Draw custom graphical progress bar!
    // Background track
    doc.setFillColor(241, 245, 249); // light slate background
    doc.roundedRect(12, y, 175, 3, 1, 1, "F");

    // Colored progress fill
    const fillWidth = Math.max(1, (cat.percentage / 100) * 175);
    doc.setFillColor(99, 102, 241); // Indigo-500 brand color
    doc.roundedRect(12, y, fillWidth, 3, 1, 1, "F");

    y += 8;
  });

  // 6. QUARTERLY PERFORMANCE TABLE
  y += 4;
  doc.setFont(font, "bold");
  doc.setFontSize(10);
  doc.setTextColor(0, 0, 0);
  doc.text(isRu ? "Квартальные показатели деятельности (Quarterly Performance):" : "Quarterly Business Performance Breakdown:", 12, y);
  y += 4;

  const quartersHeaders = [
    [isRu ? "Квартал" : "Quarter", isRu ? "Доходы" : "Income", isRu ? "Расходы" : "Expenses", isRu ? "Чистая прибыль" : "Net Profit", isRu ? "Маржинальность" : "Margin"]
  ];

  const quartersRows = [1, 2, 3, 4].map((q) => {
    const qData = data.quarters[q] || { income: 0, expense: 0, profit: 0 };
    const qMargin = qData.income > 0 ? `${Math.round((qData.profit / qData.income) * 100)}%` : "0%";
    return [
      `Q${q}`,
      formatCurrency(qData.income, currency, locale),
      formatCurrency(qData.expense, currency, locale),
      `${qData.profit >= 0 ? "+" : ""}${formatCurrency(qData.profit, currency, locale)}`,
      qMargin
    ];
  });

  autoTable(doc, {
    startY: y,
    head: quartersHeaders,
    body: quartersRows,
    styles: { font: font, fontSize: 8 },
    headStyles: { fillColor: [30, 41, 59], fontStyle: "bold" }, // Slate 800
    alternateRowStyles: { fillColor: [248, 250, 252] },
    columnStyles: {
      0: { fontStyle: "bold", halign: "center" },
      1: { halign: "right" },
      2: { halign: "right" },
      3: { halign: "right", fontStyle: "bold" },
      4: { halign: "center" }
    }
  });

  // Add professional Page numbers in footer of ALL pages
  const totalPages = doc.getNumberOfPages();
  for (let i = 1; i <= totalPages; i++) {
    doc.setPage(i);
    doc.setFont(font, "normal");
    doc.setFontSize(7.5);
    doc.setTextColor(148, 163, 184); // Slate 400
    const pageStr = isRu ? `Страница ${i} из ${totalPages}` : `Page ${i} of ${totalPages}`;
    doc.text(pageStr, 195 - doc.getTextWidth(pageStr), 287);
    doc.text(`FacturaScan © 2026 - IRS Schedule C Helper • ${data.businessName}`, 12, 287);
  }

  // Save the PDF
  const filename = `Schedule_C_Report_${data.businessName.replace(/\s+/g, "_")}_${data.year}_${currency}.pdf`;
  doc.save(filename);
}

export function exportScheduleCToExcel(data: ScheduleCData, locale: string = "en") {
  const isRu = locale === "ru";
  const currency = data.currency;

  const irsData = mapCategoriesToIRS(data.categories);

  // Sheet 1: IRS Schedule C Form
  const formAoa: any[][] = [];

  // IRS Style Header
  formAoa.push(["SCHEDULE C (Form 1040)", "", "", "", "Profit or Loss From Business (Sole Proprietorship)", "", "", "Tax Year:", data.year]);
  formAoa.push(["Department of the Treasury - IRS", "", "", "", "Sole Proprietor Financial Summary Mapping", "", "", "Currency:", currency]);
  formAoa.push([]); // blank row

  // Business info
  formAoa.push(["Proprietor/Workspace:", data.businessName, "", "", "Employer ID (EIN):", "XX-XXXXXXX"]);
  formAoa.push(["Business Activity:", isRu ? "Строительство / Девелопмент" : "Construction & Professional Services", "", "", "Reporting Period:", `Jan 1 - Dec 31, ${data.year}`]);
  formAoa.push([]); // blank row

  // PART I: INCOME
  formAoa.push(["PART I: INCOME", "", "", "", "", "", "", "", "Amount"]);
  formAoa.push(["Line 1", isRu ? "Валовая выручка или продажи" : "Gross receipts or sales", "", "", "", "", "", "", data.income]);
  formAoa.push(["Line 2", isRu ? "Возвраты и скидки" : "Returns and allowances", "", "", "", "", "", "", 0]);
  formAoa.push(["Line 3", isRu ? "Чистая выручка (Строка 1 минус Строка 2)" : "Subtract line 2 from line 1", "", "", "", "", "", "", data.income]);
  formAoa.push(["Line 4", isRu ? "Себестоимость товаров (Часть III, закупка материалов)" : "Cost of goods sold (Part III / Materials)", "", "", "", "", "", "", irsData.materials]);
  formAoa.push(["Line 5", isRu ? "Валовая прибыль (Вычесть строку 4 из строки 3)" : "Gross profit (Subtract line 4 from line 3)", "", "", "", "", "", "", data.income - irsData.materials]);
  formAoa.push(["Line 7", isRu ? "Валовой доход" : "Gross income", "", "", "", "", "", "", data.income - irsData.materials]);
  formAoa.push([]); // blank row

  // PART II: EXPENSES
  formAoa.push(["PART II: EXPENSES", "", "", "", "", "", "", "", "Amount"]);
  formAoa.push(["Line 9", isRu ? "Расходы на транспорт и топливо (Fuel)" : "Car and truck expenses (Fuel)", "", "", "", "", "", "", irsData.fuel]);
  formAoa.push(["Line 11", isRu ? "Контрактные работы и субподряд (Subcontracting)" : "Contract labor (Subcontracting)", "", "", "", "", "", "", irsData.subcontracting]);
  formAoa.push(["Line 15", isRu ? "Страхование (Insurance)" : "Insurance (other than health)", "", "", "", "", "", "", irsData.insurance]);
  formAoa.push(["Line 18", isRu ? "Офисные расходы (Office Expenses)" : "Office expense (Office Expenses)", "", "", "", "", "", "", irsData.office]);
  formAoa.push(["Line 20a", isRu ? "Аренда оборудования и машин (Rental)" : "Rent or lease: Vehicles, machinery, equipment", "", "", "", "", "", "", irsData.rent]);
  formAoa.push(["Line 23", isRu ? "Налоги, лицензии и пошлины (Taxes & Permits)" : "Taxes and licenses (Taxes & Permits)", "", "", "", "", "", "", irsData.taxes]);
  formAoa.push(["Line 25", isRu ? "Коммунальные услуги (Utility Expenses)" : "Utilities (Utility Expenses)", "", "", "", "", "", "", irsData.utilities]);
  formAoa.push(["Line 26", isRu ? "Заработная плата и оплата труда (Labor)" : "Wages (less employment credits)", "", "", "", "", "", "", irsData.wages]);
  formAoa.push(["Line 27a", isRu ? "Прочие расходы (Other Expenses)" : "Other expenses (Other Expenses)", "", "", "", "", "", "", irsData.other]);
  formAoa.push(["Line 28", isRu ? "Общие расходы до использования дома" : "Total expenses before home use (Sum lines 9-27a)", "", "", "", "", "", "", irsData.totalPartIIExpenses]);
  formAoa.push(["Line 31", isRu ? "Чистая прибыль или убыток (Net Profit)" : "Net profit or loss (Net Profit)", "", "", "", "", "", "", data.profit]);

  // Sheet 2: Quarterly Performance & Category Analysis
  const analyticsAoa: any[][] = [];
  analyticsAoa.push(["📊 QUARTERLY BUSINESS PERFORMANCE BREAKDOWN", "", "", "", ""]);
  analyticsAoa.push([]); // blank
  analyticsAoa.push([
    isRu ? "Квартал" : "Quarter",
    isRu ? "Доходы" : "Income",
    isRu ? "Расходы" : "Expenses",
    isRu ? "Чистая прибыль" : "Net Profit",
    isRu ? "Маржинальность" : "Profit Margin"
  ]);

  [1, 2, 3, 4].forEach((q) => {
    const qData = data.quarters[q] || { income: 0, expense: 0, profit: 0 };
    const margin = qData.income > 0 ? (qData.profit / qData.income) : 0;
    analyticsAoa.push([
      `Quarter ${q}`,
      qData.income,
      qData.expense,
      qData.profit,
      margin
    ]);
  });

  analyticsAoa.push([]); // blank
  analyticsAoa.push([]); // blank
  analyticsAoa.push(["📈 CATEGORY EXPENSE RATIOS & SHARES (GRAPHICS DATA)", "", "", "", ""]);
  analyticsAoa.push([]); // blank
  analyticsAoa.push([
    isRu ? "Категория расходов" : "Expense Category",
    isRu ? "Сумма расходов" : "Expense Amount",
    isRu ? "Процент от общих расходов" : "Percentage Share"
  ]);

  const totalExpense = data.expense || 1;
  const categoryTranslations: Record<string, string> = {
    materials: isRu ? "Материалы и снабжение 🧱" : "Materials & Supplies 🧱",
    labor: isRu ? "Оплата труда и работы 👷" : "Labor & Wages 👷",
    equipment_rental: isRu ? "Аренда оборудования 🚜" : "Equipment Rental 🚜",
    fuel: isRu ? "Топливо и ГСМ ⛽" : "Fuel & Lubricants ⛽",
    permit: isRu ? "Разрешения и лицензии 📜" : "Permits & Licenses 📜",
    office_expenses: isRu ? "Офисные расходы 🏢" : "Office Expenses 🏢",
    insurance: isRu ? "Страхование 🛡️" : "Insurance 🛡️",
    taxes_fees: isRu ? "Налоги и пошлины 🏛️" : "Taxes & Duties 🏛️",
    subcontracting: isRu ? "Субподряд 🤝" : "Subcontracting 🤝",
    utility_expenses: isRu ? "Коммунальные услуги ⚡" : "Utility Expenses ⚡",
    other: isRu ? "Прочие расходы 📁" : "Other Expenses 📁"
  };

  Object.entries(data.categories)
    .sort((a, b) => b[1] - a[1])
    .forEach(([catName, val]) => {
      if (val === 0) return;
      analyticsAoa.push([
        categoryTranslations[catName] || catName,
        val,
        val / totalExpense
      ]);
    });

  const wsForm = XLSX.utils.aoa_to_sheet(formAoa);
  const wsAnalytics = XLSX.utils.aoa_to_sheet(analyticsAoa);

  // Apply elegant styling using xlsx-js-style
  // Custom helper for cell style settings
  const applyStyles = (sheet: any, isFormSheet: boolean) => {
    let currencyFormat = `$#,##0.00`;
    if (currency === "RUB" || currency === "₽") {
      currencyFormat = `#,##0.00" ₽"`;
    } else if (currency === "EUR" || currency === "€") {
      currencyFormat = `€#,##0.00`;
    }

    for (const cellAddr in sheet) {
      if (cellAddr.startsWith("!")) continue;
      const cell = sheet[cellAddr];
      const match = cellAddr.match(/^([A-Z]+)([0-9]+)$/);
      if (!match) continue;
      const col = match[1];
      const row = parseInt(match[2], 10);

      // Defaults
      cell.s = {
        font: { name: "Segoe UI", sz: 10, color: { rgb: "334155" } },
        alignment: { vertical: "center" }
      };

      if (isFormSheet) {
        // Form Title & Headers
        if (row === 1) {
          cell.s = {
            font: { name: "Segoe UI", sz: 14, bold: true, color: { rgb: "0F172A" } },
            fill: { patternType: "solid", fgColor: { rgb: "F1F5F9" } }
          };
        } else if (row === 2) {
          cell.s = {
            font: { name: "Segoe UI", sz: 9, italic: true, color: { rgb: "64748B" } },
            fill: { patternType: "solid", fgColor: { rgb: "F1F5F9" } }
          };
        } else if (row === 4 || row === 5) {
          cell.s = {
            font: { name: "Segoe UI", sz: 9, bold: true, color: { rgb: "334155" } }
          };
        }

        // Section Headers
        const valStr = cell.v ? String(cell.v) : "";
        if (valStr.startsWith("PART ")) {
          cell.s = {
            font: { name: "Segoe UI", sz: 11, bold: true, color: { rgb: "FFFFFF" } },
            fill: { patternType: "solid", fgColor: { rgb: "1E293B" } }, // Slate 800
            alignment: { horizontal: "left" }
          };
        }

        // Line totals highlights
        if (valStr === "Line 5" || valStr === "Line 7" || valStr === "Line 28" || valStr === "Line 31") {
          const targetRow = row;
          // Apply to the entire row within columns A-I
          sheet[`A${targetRow}`].s = { font: { name: "Segoe UI", sz: 10, bold: true, color: { rgb: "0F172A" } }, fill: { patternType: "solid", fgColor: { rgb: "FEF3C7" } } };
          sheet[`B${targetRow}`].s = { font: { name: "Segoe UI", sz: 10, bold: true, color: { rgb: "0F172A" } }, fill: { patternType: "solid", fgColor: { rgb: "FEF3C7" } } };
          if (sheet[`I${targetRow}`]) {
            sheet[`I${targetRow}`].s = { 
              font: { name: "Segoe UI", sz: 10, bold: true, color: { rgb: "0F172A" } }, 
              fill: { patternType: "solid", fgColor: { rgb: "FEF3C7" } },
              numFmt: currencyFormat,
              alignment: { horizontal: "right" }
            };
          }
        }

        // Apply number formats for money values in column I
        if (col === "I" && typeof cell.v === "number") {
          cell.s.numFmt = currencyFormat;
          cell.s.alignment = { horizontal: "right" };
        }
      } else {
        // Analytics Sheet Styling
        if (row === 1) {
          cell.s = {
            font: { name: "Segoe UI", sz: 12, bold: true, color: { rgb: "1E293B" } }
          };
        } else if (row === 3 || row === 14) {
          cell.s = {
            font: { name: "Segoe UI", sz: 10, bold: true, color: { rgb: "FFFFFF" } },
            fill: { patternType: "solid", fgColor: { rgb: "475569" } }, // Slate 600
            alignment: { horizontal: "center" }
          };
        } else if (row === 12) {
          cell.s = {
            font: { name: "Segoe UI", sz: 11, bold: true, color: { rgb: "0F172A" } }
          };
        }

        // Align values and formats
        if (typeof cell.v === "number") {
          if (cellAddr.endsWith("E") || (row >= 15 && col === "C")) {
            cell.s.numFmt = "0.0%";
            cell.s.alignment = { horizontal: "center" };
          } else {
            cell.s.numFmt = currencyFormat;
            cell.s.alignment = { horizontal: "right" };
          }
        }
      }
    }
  };

  applyStyles(wsForm, true);
  applyStyles(wsAnalytics, false);

  // Column Widths
  wsForm["!cols"] = [
    { wch: 10 }, // Line No
    { wch: 45 }, // Description
    { wch: 10 },
    { wch: 10 },
    { wch: 10 },
    { wch: 10 },
    { wch: 10 },
    { wch: 10 },
    { wch: 18 }  // Amount
  ];

  wsAnalytics["!cols"] = [
    { wch: 32 }, // Quarter / Category
    { wch: 18 }, // Income / Expense Amount
    { wch: 18 }, // Expense / Ratio
    { wch: 18 }, // Net Profit
    { wch: 15 }  // Margin
  ];

  const wb = XLSX.utils.book_new();
  XLSX.utils.book_append_sheet(wb, wsForm, "IRS Schedule C");
  XLSX.utils.book_append_sheet(wb, wsAnalytics, "Quarterly & Analytics");

  XLSX.writeFile(wb, `Schedule_C_${data.businessName.replace(/\s+/g, "_")}_${data.year}.xlsx`);
}

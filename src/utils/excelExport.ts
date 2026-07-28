// @ts-ignore
import XLSX from "xlsx-js-style";
import { Invoice } from "../types";

// Helper to parse row and col from cell address (e.g., "A1" -> { col: "A", row: 1 })
function getRowAndCol(cellRef: string) {
  const match = cellRef.match(/^([A-Z]+)([0-9]+)$/);
  if (!match) return null;
  return {
    col: match[1],
    row: parseInt(match[2], 10)
  };
}

// Helper to get Excel currency format string
function getExcelCurrencyFormat(currencyCode: string): string {
  const code = (currencyCode || "USD").toUpperCase().trim();
  if (code === "RUB" || code === "₽" || code === "РУБ" || code === "РУБ.") {
    return `#,##0.00" ₽"`;
  }
  if (code === "KZT" || code === "₸" || code === "ТГ" || code === "ТЕНГЕ") {
    return `#,##0.00" ₸"`;
  }
  if (code === "EUR" || code === "€") {
    return `€#,##0.00`;
  }
  if (code === "USD" || code === "$") {
    return `$#,##0.00`;
  }
  return `#,##0.00" "${code}`;
}

const pivotTranslations = {
  ru: {
    pivotSheetName: "Сводная таблица",
    title: "Сводный аналитический отчет",
    byObjectTitle: "Свод по Объектам / Проектам",
    bySupplierTitle: "Свод по Поставщикам (Расходы)",
    byClientIncomeTitle: "Доходы от клиентов",
    byCategoryTitle: "Свод по Категориям Расходов",
    detailedTitle: "Детальный свод: Объект и Поставщик",
    colObject: "Объект / Проект",
    colSupplier: "Поставщик",
    colClient: "Клиент",
    colCategory: "Категория расходов",
    colGoods: "Сумма (Товары)",
    colServices: "Сумма (Услуги)",
    colTotal: "Общая сумма",
    grandTotal: "Итого",
    colIncome: "Доходы",
    colExpense: "Расходы",
    colProfit: "Прибыль",
    colTransType: "Тип операции"
  },
  es: {
    pivotSheetName: "Tabla Dinámica",
    title: "Informe Resumido Analítico",
    byObjectTitle: "Resumen por Objeto / Proyecto",
    bySupplierTitle: "Resumen por Proveedor (Gastos)",
    byClientIncomeTitle: "Ingresos de Clientes",
    byCategoryTitle: "Resumen por Categoría de Gastos",
    detailedTitle: "Resumen Detallado: Objeto y Proveedor",
    colObject: "Objeto / Proyecto",
    colSupplier: "Proveedor",
    colClient: "Cliente",
    colCategory: "Categoría de Gastos",
    colGoods: "Importe (Bienes)",
    colServices: "Importe (Servicios)",
    colTotal: "Importe Total",
    grandTotal: "Total General",
    colIncome: "Ingresos",
    colExpense: "Gastos",
    colProfit: "Beneficio",
    colTransType: "Tipo de transacción"
  },
  en: {
    pivotSheetName: "Pivot Summary",
    title: "Pivoted Analytical Summary",
    byObjectTitle: "Summary by Object / Project",
    bySupplierTitle: "Summary by Supplier (Expenses)",
    byClientIncomeTitle: "Incomes from Clients",
    byCategoryTitle: "Summary by Expense Category",
    detailedTitle: "Detailed Pivot: Object & Supplier",
    colObject: "Object / Project",
    colSupplier: "Supplier",
    colClient: "Client",
    colCategory: "Expense Category",
    colGoods: "Goods Amount",
    colServices: "Services Amount",
    colTotal: "Total Amount",
    grandTotal: "Grand Total",
    colIncome: "Income",
    colExpense: "Expenses",
    colProfit: "Profit",
    colTransType: "Transaction Type"
  }
};

function stylePivotSheet(pivotSheet: any, locale: string) {
  const pt = pivotTranslations[locale as "ru" | "es" | "en"] || pivotTranslations.en;
  
  // Initialize merges for Title
  pivotSheet["!merges"] = pivotSheet["!merges"] || [];
  pivotSheet["!merges"].push({ s: { r: 0, c: 0 }, e: { r: 0, c: 4 } });

  let summaryCurrencyFormat = `$#,##0.00`;
  if (locale === "ru") {
    summaryCurrencyFormat = `#,##0.00" ₽"`;
  } else if (locale === "es") {
    summaryCurrencyFormat = `#,##0.00" €"`;
  }

  for (const cellAddress in pivotSheet) {
    if (cellAddress.startsWith("!")) continue;
    const cell = pivotSheet[cellAddress];
    const parsed = getRowAndCol(cellAddress);
    if (!parsed) continue;

    const { col, row } = parsed;

    // Default style
    cell.s = {
      font: { name: "Segoe UI", sz: 10, color: { rgb: "334155" } },
      alignment: { vertical: "center" },
      border: {
        bottom: { style: "thin", color: { rgb: "F1F5F9" } }
      }
    };

    // 1. Title Row (Row 1)
    if (row === 1) {
      cell.s = {
        font: { name: "Segoe UI", sz: 15, bold: true, color: { rgb: "1E293B" } },
        alignment: { horizontal: "left", vertical: "center" },
        fill: { patternType: "solid", fgColor: { rgb: "F8FAFC" } },
        border: {
          bottom: { style: "medium", color: { rgb: "cbd5e1" } }
        }
      };
      continue;
    }

    // 2. Subtitle Row (Row 2)
    if (row === 2) {
      cell.s = {
        font: { name: "Segoe UI", sz: 9, italic: true, color: { rgb: "64748B" } },
        alignment: { horizontal: "left", vertical: "center" },
        fill: { patternType: "solid", fgColor: { rgb: "F8FAFC" } }
      };
      continue;
    }

    const cellA = pivotSheet[`A${row}`];
    const valA = cellA ? String(cellA.v).trim() : "";

    // 3. Section Header Row
    if (valA.startsWith("📊")) {
      cell.s = {
        font: { name: "Segoe UI", sz: 11, bold: true, color: { rgb: "1E293B" } },
        alignment: { horizontal: "left", vertical: "center" },
        fill: { patternType: "solid", fgColor: { rgb: "F1F5F9" } },
        border: {
          top: { style: "thin", color: { rgb: "cbd5e1" } },
          bottom: { style: "medium", color: { rgb: "D97706" } } // Elegant Amber/Gold line
        }
      };
      continue;
    }

    // 4. Table Header Row
    const isHeaderRow = [
      pt.colObject, pt.colGoods, pt.colServices, pt.colTotal, pt.colSupplier, pt.colClient, pt.colCategory, pt.colIncome, pt.colExpense, pt.colProfit
    ].includes(valA);

    const cellValStr = cell.v ? String(cell.v).trim() : "";
    const isHeaderCell = [
      pt.colObject, pt.colGoods, pt.colServices, pt.colTotal, pt.colSupplier, pt.colClient, pt.colCategory, pt.colIncome, pt.colExpense, pt.colProfit
    ].includes(cellValStr);

    if (isHeaderCell || isHeaderRow) {
      cell.s = {
        font: { name: "Segoe UI", sz: 9.5, bold: true, color: { rgb: "FFFFFF" } },
        fill: { patternType: "solid", fgColor: { rgb: "334155" } }, // Slate 700
        alignment: { horizontal: (col === "A" || (col === "B" && cellValStr === pt.colSupplier)) ? "left" : "right", vertical: "center" },
        border: {
          bottom: { style: "medium", color: { rgb: "1E293B" } }
        }
      };
      continue;
    }

    // 5. Grand Total Row
    if (valA === pt.grandTotal) {
      cell.s = {
        font: { name: "Segoe UI", sz: 10, bold: true, color: { rgb: "1E293B" } },
        fill: { patternType: "solid", fgColor: { rgb: "FEF3C7" } }, // Highlighted amber
        alignment: { horizontal: col === "A" || (col === "B" && cell.t !== "n") ? "left" : "right", vertical: "center" },
        border: {
          top: { style: "thin", color: { rgb: "D97706" } },
          bottom: { style: "double", color: { rgb: "D97706" } } // Accounting double line
        }
      };

      if (cell.t === "n") {
        cell.z = summaryCurrencyFormat;
      }
      continue;
    }

    // 6. Regular Data Row
    const isEven = row % 2 === 0;
    const bgHex = isEven ? "F8FAFC" : "FFFFFF";

    cell.s = {
      font: { name: "Segoe UI", sz: 9.5, color: { rgb: "334155" } },
      fill: { patternType: "solid", fgColor: { rgb: bgHex } },
      alignment: {
        horizontal: (col === "A" || (col === "B" && cell.t !== "n")) ? "left" : "right",
        vertical: "center"
      },
      border: {
        bottom: { style: "thin", color: { rgb: "E2E8F0" } },
        top: { style: "thin", color: { rgb: "E2E8F0" } },
        left: { style: "thin", color: { rgb: "E2E8F0" } },
        right: { style: "thin", color: { rgb: "E2E8F0" } }
      }
    };

    if (cell.t === "n") {
      cell.z = summaryCurrencyFormat;
    }
  }
}

function styleWorksheet(worksheet: any, locale: string, h: any) {
  for (const cellAddress in worksheet) {
    if (cellAddress.startsWith("!")) continue;
    const cell = worksheet[cellAddress];
    const parsed = getRowAndCol(cellAddress);
    if (!parsed) continue;

    const { col, row } = parsed;

    // 1. Header Row (Row 1)
    if (row === 1) {
      cell.s = {
        font: { name: "Segoe UI", sz: 10, bold: true, color: { rgb: "FFFFFF" } },
        fill: { patternType: "solid", fgColor: { rgb: "0F172A" } }, // Slate 900
        alignment: { horizontal: "center", vertical: "center", wrapText: true },
        border: {
          bottom: { style: "medium", color: { rgb: "1E293B" } }
        }
      };
      continue;
    }

    // 2. Data Rows
    const isEven = row % 2 === 0;
    const bgHex = isEven ? "F8FAFC" : "FFFFFF";

    let alignmentHorizontal = "left";
    // Columns: A=DocNum, B=Supplier, C=Date, D=Object, E=Desc, F=Type, G=TransactionType, H=ExpenseCategory, I=Qty, J=UnitPrice, K=LineTotal, L=InvoiceTotal, M=Currency, N=AddedDate
    if (col === "A" || col === "C" || col === "F" || col === "G" || col === "M" || col === "N") {
      alignmentHorizontal = "center";
    } else if (col === "I" || col === "J" || col === "K" || col === "L") {
      alignmentHorizontal = "right";
    }

    cell.s = {
      font: { name: "Segoe UI", sz: 9.5, color: { rgb: "334155" } },
      fill: { patternType: "solid", fgColor: { rgb: bgHex } },
      alignment: { horizontal: alignmentHorizontal, vertical: "center" },
      border: {
        bottom: { style: "thin", color: { rgb: "E2E8F0" } },
        top: { style: "thin", color: { rgb: "E2E8F0" } },
        left: { style: "thin", color: { rgb: "E2E8F0" } },
        right: { style: "thin", color: { rgb: "E2E8F0" } }
      }
    };

    if (col === "I") {
      cell.z = "#,##0";
    } else if (col === "J" || col === "K" || col === "L") {
      const currencyCell = worksheet[`M${row}`];
      const currencyCode = currencyCell ? String(currencyCell.v) : "";
      cell.z = getExcelCurrencyFormat(currencyCode);
    }
  }
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

export function exportInvoicesToExcel(
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
  const rows: any[] = [];

  const headers = {
    ru: {
      docNum: "Номер документа",
      supplier: "Поставщик",
      date: "Дата выставления",
      desc: "Наименование товара/услуги",
      type: "Тип позиции",
      transType: "Тип операции",
      expenseCategoryVal: "Категория расходов",
      qty: "Количество",
      unitPrice: "Цена за единицу",
      lineTotal: "Сумма по строке",
      total: "Общая сумма счета",
      addedDate: "Дата добавления",
      goodsVal: "Товар",
      servicesVal: "Услуга",
      sheetName: "Спецификация счетов",
      objectVal: "Объект / Проект",
      currencyVal: "Валюта",
    },
    es: {
      docNum: "Número de documento",
      supplier: "Proveedor",
      date: "Fecha de emisión",
      desc: "Descripción del artículo",
      type: "Tipo",
      transType: "Tipo de transacción",
      expenseCategoryVal: "Categoría de gastos",
      qty: "Cantidad",
      unitPrice: "Precio unitario",
      lineTotal: "Suma de línea",
      total: "Monto total del documento",
      addedDate: "Fecha de creación",
      goodsVal: "Bienes",
      servicesVal: "Servicio",
      sheetName: "Especificaciones",
      objectVal: "Objeto / Proyecto",
      currencyVal: "Moneda",
    },
    en: {
      docNum: "Document Number",
      supplier: "Supplier",
      date: "Issue Date",
      desc: "Item Description",
      type: "Type",
      transType: "Transaction Type",
      expenseCategoryVal: "Expense Category",
      qty: "Quantity",
      unitPrice: "Unit Price",
      lineTotal: "Line Total",
      total: "Total Invoice Amount",
      addedDate: "Added Date",
      goodsVal: "Goods",
      servicesVal: "Service",
      sheetName: "Invoice Specifications",
      objectVal: "Object / Project",
      currencyVal: "Currency",
    },
  };

  const h = headers[locale as "ru" | "es" | "en"] || headers.en;
  const pt = pivotTranslations[locale as "ru" | "es" | "en"] || pivotTranslations.en;
  const defObj = locale === "ru" ? "Без объекта" : locale === "es" ? "Sin objeto" : "No Object/Project";

  // Aggregators for Pivot Table
  const objectSummaryMap: Record<string, { income: number; expense: number; profit: number }> = {};
  const supplierSummaryMap: Record<string, { income: number; expense: number; profit: number }> = {};
  const clientIncomeSummaryMap: Record<string, number> = {};
  const categorySummaryMap: Record<string, { income: number; expense: number; profit: number }> = {};
  const detailedSummaryMap: Record<string, { objectName: string; supplierName: string; income: number; expense: number; profit: number }> = {};

  invoices.forEach((inv) => {
    if (!inv) return;
    const items = Array.isArray(inv.items) ? inv.items : [];
    items.forEach((item) => {
      if (!item) return;

      // Apply filters if provided
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

        // Filter by type (goods / services)
        if (filterType !== "all" && item.type !== filterType) {
          return;
        }
        // Filter by expense category
        if (filterCategory !== "all") {
          const cat = item.expenseCategory || "other";
          if (cat !== filterCategory) {
            return;
          }
        }
        // Filter by Supplier search
        if (searchSupplier && !(inv.supplierName || "").toLowerCase().includes(searchSupplier.toLowerCase())) {
          return;
        }
        // Filter by Object
        if (selectedObject !== "all") {
          const objName = item.objectName || inv.objectName || "";
          if (objName.trim().toLowerCase() !== selectedObject.trim().toLowerCase()) {
            return;
          }
        }
        // General Search (by description, invoice number, supplier, object)
        if (searchQuery) {
          const query = searchQuery.toLowerCase();
          const matchDesc = (item.description || "").toLowerCase().includes(query);
          const matchSupplier = (inv.supplierName || "").toLowerCase().includes(query);
          const matchNum = (inv.invoiceNumber || "").toLowerCase().includes(query);
          const matchObj = (item.objectName || inv.objectName || "").toLowerCase().includes(query);
          if (!matchDesc && !matchSupplier && !matchNum && !matchObj) {
            return;
          }
        }
        // Date ranges
        if (startDate && (inv.date || "") < startDate) return;
        if (endDate && (inv.date || "") > endDate) return;
      }

      const objName = ((item.objectName || inv.objectName || "").trim()) || defObj;
      const supName = ((inv.supplierName || "").trim()) || (locale === "ru" ? "Неизвестный поставщик" : locale === "es" ? "Proveedor desconocido" : "Unknown Supplier");
      const val = Number(item.totalPrice) || 0;
      const isIncome = inv.invoiceType === "income";

      // 1. Fill main raw rows list
      let formattedAddedDate = "";
      try {
        if (inv.createdAt) {
          formattedAddedDate = new Date(inv.createdAt).toLocaleDateString(locale === "ru" ? "ru-RU" : "en-US");
        }
      } catch (e) {
        formattedAddedDate = "";
      }

      rows.push({
        [h.docNum]: inv.invoiceNumber || (locale === "ru" ? "Б/Н" : locale === "es" ? "S/N" : "N/A"),
        [h.supplier]: inv.supplierName || "",
        [h.date]: inv.date || "",
        [h.objectVal]: objName,
        [h.desc]: item.description || "",
        [h.type]: item.type === "goods" ? h.goodsVal : h.servicesVal,
        [h.transType]: isIncome ? pt.colIncome : pt.colExpense,
        [h.expenseCategoryVal]: isIncome ? "" : (expenseCategoriesMap[locale as "ru"|"es"|"en"]?.[item.expenseCategory || "other"] || item.expenseCategory || "other"),
        [h.qty]: Number(item.quantity) || 0,
        [h.unitPrice]: Number(item.unitPrice) || 0,
        [h.lineTotal]: val,
        [h.total]: Number(inv.totalAmount) || 0,
        [h.currencyVal]: inv.currency || "",
        [h.addedDate]: formattedAddedDate,
      });

      // 2. Aggregate: Object summary
      if (!objectSummaryMap[objName]) {
        objectSummaryMap[objName] = { income: 0, expense: 0, profit: 0 };
      }
      if (isIncome) {
        objectSummaryMap[objName].income += val;
        objectSummaryMap[objName].profit += val;
      } else {
        objectSummaryMap[objName].expense += val;
        objectSummaryMap[objName].profit -= val;
      }

      // 3. Aggregate: Supplier summary or Client income summary
      if (isIncome) {
        clientIncomeSummaryMap[supName] = (clientIncomeSummaryMap[supName] || 0) + val;
      } else {
        if (!supplierSummaryMap[supName]) {
          supplierSummaryMap[supName] = { income: 0, expense: 0, profit: 0 };
        }
        supplierSummaryMap[supName].expense += val;
        supplierSummaryMap[supName].profit -= val;
      }

      // 4. Aggregate: Category summary
      if (!isIncome) {
        const catKey = item.expenseCategory || "other";
        const catLabel = expenseCategoriesMap[locale as "ru"|"es"|"en"]?.[catKey] || catKey;
        if (!categorySummaryMap[catLabel]) {
          categorySummaryMap[catLabel] = { income: 0, expense: 0, profit: 0 };
        }
        categorySummaryMap[catLabel].expense += val;
        categorySummaryMap[catLabel].profit -= val;
      }

      // 5. Aggregate: Detailed summary (Object & Supplier combo)
      const detailedKey = `${objName}|||${supName}`;
      if (!detailedSummaryMap[detailedKey]) {
        detailedSummaryMap[detailedKey] = {
          objectName: objName,
          supplierName: supName,
          income: 0,
          expense: 0,
          profit: 0
        };
      }
      if (isIncome) {
        detailedSummaryMap[detailedKey].income += val;
        detailedSummaryMap[detailedKey].profit += val;
      } else {
        detailedSummaryMap[detailedKey].expense += val;
        detailedSummaryMap[detailedKey].profit -= val;
      }
    });
  });

  // --- Construct Pivot Sheet array of arrays (AOA) ---
  const pivotAoa: any[][] = [];

  // Report Main Header
  pivotAoa.push([pt.title.toUpperCase()]);
  pivotAoa.push([`${locale === "ru" ? "Сгенерировано" : locale === "es" ? "Generado" : "Generated"}: ${new Date().toLocaleDateString(locale === "ru" ? "ru-RU" : "en-US")} ${new Date().toLocaleTimeString(locale === "ru" ? "ru-RU" : "en-US")}`]);
  pivotAoa.push([]); // blank

  // 1. Object Summary Section
  pivotAoa.push([`📊 1. ${pt.byObjectTitle.toUpperCase()}`]);
  pivotAoa.push([pt.colObject, pt.colIncome, pt.colExpense, pt.colProfit]);

  let totalObjIncome = 0;
  let totalObjExpense = 0;
  let totalObjProfit = 0;

  Object.entries(objectSummaryMap).forEach(([objName, stats]) => {
    pivotAoa.push([objName, stats.income, stats.expense, stats.profit]);
    totalObjIncome += stats.income;
    totalObjExpense += stats.expense;
    totalObjProfit += stats.profit;
  });
  pivotAoa.push([pt.grandTotal, totalObjIncome, totalObjExpense, totalObjProfit]);

  pivotAoa.push([]); // blank
  pivotAoa.push([]); // blank

  // 2. Supplier Summary Section
  pivotAoa.push([`📊 2. ${pt.bySupplierTitle.toUpperCase()}`]);
  pivotAoa.push([pt.colSupplier, pt.colExpense]);

  let totalSupExpense = 0;
  Object.entries(supplierSummaryMap).forEach(([supName, stats]) => {
    pivotAoa.push([supName, stats.expense]);
    totalSupExpense += stats.expense;
  });
  pivotAoa.push([pt.grandTotal, totalSupExpense]);

  pivotAoa.push([]); // blank
  pivotAoa.push([]); // blank

  // 3. Client Income Section
  pivotAoa.push([`📊 3. ${pt.byClientIncomeTitle.toUpperCase()}`]);
  pivotAoa.push([pt.colClient, pt.colIncome]);

  let totalClientIncome = 0;
  Object.entries(clientIncomeSummaryMap).forEach(([clientName, incomeVal]) => {
    pivotAoa.push([clientName, incomeVal]);
    totalClientIncome += incomeVal;
  });
  pivotAoa.push([pt.grandTotal, totalClientIncome]);

  pivotAoa.push([]); // blank
  pivotAoa.push([]); // blank

  // 4. Category Summary Section
  pivotAoa.push([`📊 4. ${pt.byCategoryTitle.toUpperCase()}`]);
  pivotAoa.push([pt.colCategory, pt.colExpense]);

  let totalCatExpense = 0;
  Object.entries(categorySummaryMap).forEach(([catName, stats]) => {
    pivotAoa.push([catName, stats.expense]);
    totalCatExpense += stats.expense;
  });
  pivotAoa.push([pt.grandTotal, totalCatExpense]);

  pivotAoa.push([]); // blank
  pivotAoa.push([]); // blank

  // 5. Detailed Object & Supplier combo
  pivotAoa.push([`📊 5. ${pt.detailedTitle.toUpperCase()}`]);
  pivotAoa.push([pt.colObject, pt.colSupplier, pt.colIncome, pt.colExpense, pt.colProfit]);

  let totalDetIncome = 0;
  let totalDetExpense = 0;
  let totalDetProfit = 0;

  Object.values(detailedSummaryMap).forEach((stats) => {
    pivotAoa.push([stats.objectName, stats.supplierName, stats.income, stats.expense, stats.profit]);
    totalDetIncome += stats.income;
    totalDetExpense += stats.expense;
    totalDetProfit += stats.profit;
  });
  pivotAoa.push([pt.grandTotal, "", totalDetIncome, totalDetExpense, totalDetProfit]);

  // Convert raw rows & pivot data to sheets
  const worksheet = XLSX.utils.json_to_sheet(rows);
  const pivotSheet = XLSX.utils.aoa_to_sheet(pivotAoa);

  // Apply elegant, expensive styling!
  stylePivotSheet(pivotSheet, locale);
  styleWorksheet(worksheet, locale, h);

  // Add Excel Autofilter to the Specifications sheet (second sheet)
  if (rows.length > 0 && worksheet["!ref"]) {
    const range = XLSX.utils.decode_range(worksheet["!ref"]);
    worksheet["!autofilter"] = {
      ref: XLSX.utils.encode_range({
        s: { r: 0, c: 0 },
        e: { r: range.e.r, c: range.e.c }
      })
    };
  }

  // Set widths for specifications sheet
  worksheet["!cols"] = [
    { wch: 18 }, // Document Number
    { wch: 28 }, // Supplier
    { wch: 16 }, // Issue Date
    { wch: 22 }, // Object / Project
    { wch: 45 }, // Description
    { wch: 12 }, // Type
    { wch: 18 }, // Transaction Type (Income/Expense)
    { wch: 24 }, // Expense Category
    { wch: 10 }, // Quantity
    { wch: 16 }, // Unit Price
    { wch: 16 }, // Line Total
    { wch: 18 }, // Invoice Total
    { wch: 12 }, // Currency
    { wch: 16 }, // Added Date
  ];

  // Set widths for Pivot Summary sheet
  pivotSheet["!cols"] = [
    { wch: 30 }, // Object Name
    { wch: 30 }, // Supplier Name / Goods
    { wch: 20 }, // Services
    { wch: 20 }, // Total
    { wch: 22 }, // Total
  ];

  // Create workbook and append sheets
  const workbook = XLSX.utils.book_new();
  
  // Pivot sheet is placed first for immediate visibility
  XLSX.utils.book_append_sheet(workbook, pivotSheet, pt.pivotSheetName);
  XLSX.utils.book_append_sheet(workbook, worksheet, h.sheetName);

  // Write file
  XLSX.writeFile(workbook, `invoice_report_${new Date().toISOString().split("T")[0]}.xlsx`);
}

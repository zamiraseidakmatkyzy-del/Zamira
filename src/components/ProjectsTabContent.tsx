import React, { useState, useMemo } from "react";
import { Client, Invoice, ExpenseCategory } from "../types";
import {
  Folder,
  MapPin,
  Calendar,
  DollarSign,
  TrendingUp,
  TrendingDown,
  Layers,
  PieChart,
  Info,
  Building,
  CheckCircle,
  Clock,
  ArrowUpRight,
  ArrowDownRight,
  Search,
  X,
  AlertCircle
} from "lucide-react";
import { motion } from "motion/react";

const getQuarterFromDate = (dateStr?: string) => {
  if (!dateStr || dateStr.length < 7) return 1;
  const month = parseInt(dateStr.substring(5, 7), 10);
  if (isNaN(month)) return 1;
  return Math.ceil(month / 3);
};

const getQuarterLabel = (quarter: number, locale: string) => {
  if (locale === "ru") {
    return `${["I", "II", "III", "IV"][quarter - 1]} кв.`;
  } else if (locale === "es") {
    return `T${quarter}`;
  } else {
    return `Q${quarter}`;
  }
};

interface ProjectsTabContentProps {
  clients: Client[];
  invoices: Invoice[];
  locale: string;
  t: any;
  formatCurrency: (val: any, currencyOverride?: string) => string;
}

export default function ProjectsTabContent({
  clients,
  invoices,
  locale,
  t,
  formatCurrency,
}: ProjectsTabContentProps) {
  const [searchQuery, setSearchQuery] = useState("");
  const [selectedCategoryFilter, setSelectedCategoryFilter] = useState<string>("all");
  const [hoveredCategory, setHoveredCategory] = useState<string | null>(null);

  // Get list of all unique object/project names referenced in invoices or clients
  const allProjectNames = useMemo(() => {
    const namesSet = new Set<string>();
    
    // Add from clients projects
    clients.forEach((c) => {
      if (c.projects && Array.isArray(c.projects)) {
        c.projects.forEach((p) => {
          if (p && p.trim()) {
            namesSet.add(p.trim());
          }
        });
      }
    });

    // Add from invoices
    invoices.forEach((inv) => {
      if (inv) {
        if (inv.objectName && inv.objectName.trim()) {
          namesSet.add(inv.objectName.trim());
        }
        if (inv.items && Array.isArray(inv.items)) {
          inv.items.forEach((item) => {
            if (item.objectName && item.objectName.trim()) {
              namesSet.add(item.objectName.trim());
            }
          });
        }
      }
    });

    return Array.from(namesSet).sort((a, b) => a.localeCompare(b));
  }, [clients, invoices]);

  // Lookup client metadata for a given project/object name
  const getProjectMetadata = (projectName: string) => {
    const pLower = projectName.toLowerCase().trim();

    // 1. Try exact project match
    let matchedClient = clients.find(
      (c) =>
        c.projects &&
        c.projects.some(
          (p) => p.toLowerCase().trim() === pLower
        )
    );

    let exactKey = projectName;

    if (matchedClient && matchedClient.projects) {
      exactKey = matchedClient.projects.find(
        (p) => p.toLowerCase().trim() === pLower
      ) || projectName;
    }

    // 2. Try exact company name match
    if (!matchedClient) {
      matchedClient = clients.find(
        (c) => c.companyName.toLowerCase().trim() === pLower
      );
      if (matchedClient) {
        exactKey = matchedClient.companyName;
      }
    }

    // 3. Try substring match (e.g. "Acme Corp" matches "Acme Corp - Warehouse")
    if (!matchedClient) {
      matchedClient = clients.find((c) => {
        const cLower = c.companyName.toLowerCase().trim();
        return pLower.includes(cLower) || cLower.includes(pLower);
      });
      if (matchedClient) {
        // Find if they have any project configured, else use company name
        exactKey = matchedClient.projects?.[0] || matchedClient.companyName;
      }
    }

    if (!matchedClient) return null;

    return {
      clientName: matchedClient.companyName,
      address: matchedClient.address || "",
      contractAmount: matchedClient.projectContracts?.[exactKey] || matchedClient.projectContracts?.[projectName] || 0,
      startDate: matchedClient.projectStartDates?.[exactKey] || matchedClient.projectStartDates?.[projectName] || "",
      endDate: matchedClient.projectEndDates?.[exactKey] || matchedClient.projectEndDates?.[projectName] || "",
      status: matchedClient.projectStatuses?.[exactKey] || matchedClient.projectStatuses?.[projectName] || "active",
    };
  };

  // Helper to calculate exact financials and expense category breakdown for an object/project
  const getProjectFinancialsAndClassification = (projectName: string) => {
    let totalIncome = 0;
    let totalExpense = 0;
    let mainCurrency = locale === "ru" ? "RUB" : "USD";
    const categorySum: Record<string, number> = {};
    const quarterlyIncomes: Record<number, number> = { 1: 0, 2: 0, 3: 0, 4: 0 };

    invoices.forEach((inv) => {
      const invCurrency = inv.currency || (locale === "ru" ? "RUB" : "USD");
      const isIncome = inv.invoiceType === "income";
      const isRootMatch =
        inv.objectName &&
        inv.objectName.toLowerCase().trim() === projectName.toLowerCase().trim();

      if (isIncome) {
        const q = getQuarterFromDate(inv.date);
        if (isRootMatch) {
          totalIncome += inv.totalAmount || 0;
          quarterlyIncomes[q] = (quarterlyIncomes[q] || 0) + (inv.totalAmount || 0);
          mainCurrency = invCurrency;
        } else if (inv.items && Array.isArray(inv.items)) {
          let itemsSum = 0;
          inv.items.forEach((item) => {
            const itemObjectName = item.objectName || inv.objectName || "";
            if (
              itemObjectName.toLowerCase().trim() === projectName.toLowerCase().trim()
            ) {
              itemsSum += item.totalPrice || 0;
            }
          });
          if (itemsSum > 0) {
            totalIncome += itemsSum;
            quarterlyIncomes[q] = (quarterlyIncomes[q] || 0) + itemsSum;
            mainCurrency = invCurrency;
          }
        }
      } else {
        // Expense
        if (isRootMatch) {
          totalExpense += inv.totalAmount || 0;
          mainCurrency = invCurrency;

          if (inv.items && Array.isArray(inv.items)) {
            inv.items.forEach((item) => {
              const category = item.expenseCategory || "other";
              categorySum[category] =
                (categorySum[category] || 0) + (item.totalPrice || 0);
            });
          } else {
            categorySum["other"] =
              (categorySum["other"] || 0) + (inv.totalAmount || 0);
          }
        } else if (inv.items && Array.isArray(inv.items)) {
          let itemMatchedSum = 0;
          inv.items.forEach((item) => {
            const itemObjectName = item.objectName || inv.objectName || "";
            if (
              itemObjectName.toLowerCase().trim() === projectName.toLowerCase().trim()
            ) {
              const category = item.expenseCategory || "other";
              categorySum[category] =
                (categorySum[category] || 0) + (item.totalPrice || 0);
              itemMatchedSum += item.totalPrice || 0;
            }
          });
          if (itemMatchedSum > 0) {
            totalExpense += itemMatchedSum;
            mainCurrency = invCurrency;
          }
        }
      }
    });

    return {
      totalIncome,
      totalExpense,
      currency: mainCurrency,
      categoryBreakdown: categorySum,
      quarterlyIncomes,
    };
  };

  // Process and filter the list of projects based on search query
  const filteredProjects = useMemo(() => {
    const q = searchQuery.toLowerCase().trim();
    return allProjectNames.filter((name) => {
      const matchName = name.toLowerCase().includes(q);
      const metadata = getProjectMetadata(name);
      const matchClient = metadata
        ? metadata.clientName.toLowerCase().includes(q) ||
          metadata.address.toLowerCase().includes(q)
        : false;
      return matchName || matchClient;
    });
  }, [allProjectNames, searchQuery, clients]);

  // Color mapper for expense categories to keep charts visually striking
  const getCategoryColor = (cat: string) => {
    const colors: Record<string, string> = {
      materials: "#eab308", // Yellow 500
      labor: "#3b82f6", // Blue 500
      equipment_rental: "#f97316", // Orange 500
      fuel: "#ef4444", // Red 500
      permit: "#a855f7", // Purple 500
      office_expenses: "#06b6d4", // Cyan 500
      insurance: "#6366f1", // Indigo 500
      taxes_fees: "#ec4899", // Pink 500
      subcontracting: "#10b981", // Emerald 500
      utility_expenses: "#14b8a6", // Teal 500
      other: "#64748b", // Slate 500
    };
    return colors[cat] || "#64748b";
  };

  // Helper to format Date string beautifully
  const formatDateBeautiful = (dateStr?: string) => {
    if (!dateStr) return "";
    try {
      const d = new Date(dateStr);
      if (isNaN(d.getTime())) return dateStr;
      return d.toLocaleDateString(
        locale === "ru" ? "ru-RU" : locale === "es" ? "es-ES" : "en-US",
        {
          day: "numeric",
          month: "short",
          year: "numeric",
        }
      );
    } catch {
      return dateStr;
    }
  };

  const getStatusLabel = (status: string) => {
    const labels: Record<string, Record<string, string>> = {
      planned: { ru: "Планируется", es: "Planificado", en: "Planned" },
      active: { ru: "Активен", es: "Activo", en: "Active" },
      completed: { ru: "Завершен", es: "Completado", en: "Completed" },
      paused: { ru: "На паузе", es: "En pausa", en: "Paused" },
    };
    return labels[status]?.[locale] || labels[status]?.["en"] || status;
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case "planned":
        return "bg-sky-50 text-sky-700 border-sky-200/60";
      case "active":
        return "bg-amber-50 text-amber-700 border-amber-200/60";
      case "completed":
        return "bg-emerald-50 text-emerald-700 border-emerald-200/60";
      case "paused":
        return "bg-stone-100 text-stone-600 border-stone-200";
      default:
        return "bg-slate-50 text-slate-600 border-slate-200";
    }
  };

  return (
    <div className="space-y-6" id="projects-tab-container">
      {/* Search Header Control Panel */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 bg-stone-50/50 p-4 rounded-2xl border border-stone-200/40">
        <div className="relative flex-1 max-w-md">
          <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
          <input
            type="text"
            placeholder={
              locale === "ru"
                ? "Поиск проектов по названию, клиенту или адресу..."
                : locale === "es"
                ? "Buscar proyectos por nombre, cliente o dirección..."
                : "Search projects by name, client or address..."
            }
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="w-full pl-10 pr-4 py-2.5 bg-white border border-stone-200 rounded-xl text-xs font-semibold focus:outline-none focus:ring-2 focus:ring-amber-400/50 transition-all placeholder-slate-400 text-slate-850"
          />
          {searchQuery && (
            <button
              onClick={() => setSearchQuery("")}
              className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600 cursor-pointer"
            >
              <X className="w-4 h-4" />
            </button>
          )}
        </div>

        {/* Counter Info Badge */}
        <div className="text-[11px] font-black uppercase tracking-wider text-slate-500 bg-white border border-stone-200 px-3 py-2 rounded-xl flex items-center gap-1.5 self-start md:self-auto">
          <Layers className="w-4 h-4 text-amber-500" />
          <span>
            {locale === "ru"
              ? `Всего проектов: ${allProjectNames.length}`
              : locale === "es"
              ? `Total proyectos: ${allProjectNames.length}`
              : `Total Projects: ${allProjectNames.length}`}
          </span>
        </div>
      </div>

      {/* Grid of Projects cards */}
      {filteredProjects.length === 0 ? (
        <div className="text-center py-12 bg-stone-50/50 border border-stone-200/40 rounded-2xl">
          <Folder className="w-8 h-8 text-stone-300 mx-auto mb-2" />
          <p className="text-xs font-bold text-slate-400 uppercase tracking-widest">
            {locale === "ru"
              ? "Проекты не найдены"
              : locale === "es"
              ? "No se encontraron proyectos"
              : "No projects found"}
          </p>
        </div>
      ) : (
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          {filteredProjects.map((p) => {
            const metadata = getProjectMetadata(p);
            const financials = getProjectFinancialsAndClassification(p);

            const receivedIncome = financials.totalIncome;
            const totalExpense = financials.totalExpense;
            const netProfit = receivedIncome - totalExpense;
            const margin =
              receivedIncome > 0
                ? Math.round((netProfit / receivedIncome) * 100)
                : 0;

            const projCurrency = financials.currency;
            const contractAmount = metadata?.contractAmount || 0;
            const remainingContract = contractAmount - receivedIncome;
            const hasContract = contractAmount > 0;
            const percentPaid = hasContract
              ? Math.min(100, Math.round((receivedIncome / contractAmount) * 100))
              : 0;

            // Generate category breakdown list
            const categoriesList = Object.entries(financials.categoryBreakdown)
              .map(([cat, amount]) => ({
                key: cat,
                label: t.expenseCategories?.[cat] || cat,
                amount,
                color: getCategoryColor(cat),
                percentage: totalExpense > 0 ? Math.round((amount / totalExpense) * 100) : 0,
              }))
              .sort((a, b) => b.amount - a.amount);

            // Compute SVG Donut segments
            let accumulatedPercentage = 0;
            const donutRadius = 38;
            const donutCircumference = 2 * Math.PI * donutRadius; // ~238.76

            const donutSegments = categoriesList.map((cat) => {
              const currentOffset = accumulatedPercentage;
              accumulatedPercentage += cat.percentage;
              return {
                ...cat,
                strokeDashArray: `${(cat.percentage * donutCircumference) / 100} ${donutCircumference}`,
                strokeDashOffset: -((currentOffset * donutCircumference) / 100),
              };
            });

            return (
              <div
                key={p}
                className="bg-white border border-stone-200 rounded-3xl shadow-xs hover:shadow-md transition-all p-5 md:p-6 hover:border-amber-400/45 relative flex flex-col justify-between overflow-hidden group"
              >
                {/* Decorative status bar */}
                <div className="absolute left-0 top-0 right-0 h-1.5 bg-stone-100 group-hover:bg-amber-400 transition-colors" />

                <div className="space-y-5">
                  {/* Title & Status Badge */}
                  <div className="flex items-start justify-between gap-2 pt-1">
                    <div className="space-y-1 min-w-0">
                      <h4 className="text-sm font-black text-slate-850 tracking-wide uppercase font-display flex items-center gap-2 truncate">
                        <Folder className="w-5 h-5 text-amber-500 flex-shrink-0" />
                        <span className="truncate" title={p}>{p}</span>
                      </h4>
                      {metadata?.clientName ? (
                        <p className="text-[11px] text-slate-500 font-bold flex items-center gap-1.5 tracking-wide">
                          <Building className="w-4 h-4 text-slate-400 flex-shrink-0" />
                          <span className="truncate">{metadata.clientName}</span>
                        </p>
                      ) : (
                        <p className="text-[10px] text-slate-400 font-medium italic">
                          {locale === "ru" ? "Внеконтрактный объект" : "Unlinked workspace object"}
                        </p>
                      )}
                    </div>

                    {metadata?.status && (
                      <span
                        className={`px-2.5 py-1 rounded-xl text-[9px] font-black uppercase border tracking-wider flex-shrink-0 ${getStatusColor(
                          metadata.status
                        )}`}
                      >
                        {getStatusLabel(metadata.status)}
                      </span>
                    )}
                  </div>

                  {/* Project Address & Dates Bento Section */}
                  {(metadata?.address || metadata?.startDate || metadata?.endDate) && (
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 bg-stone-50/50 p-3 rounded-2xl border border-stone-200/40 text-xs">
                      {/* Address */}
                      {metadata?.address && (
                        <div className="space-y-1 sm:col-span-2">
                          <span className="text-[9px] font-black uppercase tracking-wider text-slate-400 block">
                            {locale === "ru" ? "Адрес объекта" : "Project Address"}
                          </span>
                          <div className="flex items-center gap-1.5 text-slate-700 font-bold">
                            <MapPin className="w-4 h-4 text-amber-500 flex-shrink-0" />
                            <span className="truncate" title={metadata.address}>
                              {metadata.address}
                            </span>
                          </div>
                        </div>
                      )}

                      {/* Dates */}
                      {(metadata?.startDate || metadata?.endDate) && (
                        <div className="space-y-1 sm:col-span-2 pt-1.5 border-t border-stone-200/30">
                          <span className="text-[9px] font-black uppercase tracking-wider text-slate-400 block">
                            {locale === "ru" ? "Сроки реализации" : "Project Dates"}
                          </span>
                          <div className="flex items-center gap-2 text-slate-700 font-bold">
                            <Calendar className="w-4 h-4 text-slate-400 flex-shrink-0" />
                            <span className="font-mono">
                              {metadata.startDate ? formatDateBeautiful(metadata.startDate) : "—"}
                            </span>
                            <span className="text-slate-350">→</span>
                            <span className="font-mono">
                              {metadata.endDate ? formatDateBeautiful(metadata.endDate) : (locale === "ru" ? "Окончание" : "Completion")}
                            </span>
                          </div>
                        </div>
                      )}
                    </div>
                  )}

                  {/* Contract Completion Progress Bar */}
                  {hasContract && (
                    <div className="space-y-1.5">
                      <div className="flex justify-between items-center text-[9px] text-slate-400 font-black uppercase tracking-wider">
                        <span>{locale === "ru" ? "Оплачено контракта" : "Contract Paid"}: {percentPaid}%</span>
                        {remainingContract > 0 ? (
                          <span className="text-amber-600 font-black">
                            {locale === "ru" ? "Осталось" : "Remaining"}: {formatCurrency(remainingContract, projCurrency)}
                          </span>
                        ) : (
                          <span className="text-emerald-600 font-extrabold">
                            {locale === "ru" ? "Оплачен полностью" : "Fully paid"}
                          </span>
                        )}
                      </div>
                      <div className="w-full bg-stone-200/60 rounded-full h-2 overflow-hidden shadow-inner">
                        <div
                          className={`h-full rounded-full transition-all duration-500 ${
                            percentPaid >= 100 ? "bg-emerald-500" : "bg-amber-400"
                          }`}
                          style={{ width: `${percentPaid}%` }}
                        />
                      </div>
                    </div>
                  )}

                  {/* Dynamic Financials Bento Grid */}
                  <div className="grid grid-cols-2 sm:grid-cols-4 gap-2.5">
                    {/* Contract Sum */}
                    {hasContract && (
                      <div className="bg-stone-50/40 p-2.5 rounded-2xl border border-stone-200/40 flex flex-col justify-between min-h-[58px]">
                        <span className="text-[8px] text-slate-400 uppercase tracking-wider font-bold">
                          {locale === "ru" ? "Контракт" : "Contract"}
                        </span>
                        <span className="text-slate-800 font-mono font-black text-xs truncate">
                          {formatCurrency(contractAmount, projCurrency)}
                        </span>
                      </div>
                    )}

                    {/* Total Income */}
                    <div className="bg-stone-50/40 p-2.5 rounded-2xl border border-stone-200/40 flex flex-col justify-between min-h-[58px]">
                      <span className="text-[8px] text-slate-400 uppercase tracking-wider font-bold">
                        {locale === "ru" ? "Доходы" : "Income"}
                      </span>
                      <span className="text-emerald-600 font-mono font-black text-xs truncate">
                        {receivedIncome > 0 ? `+${formatCurrency(receivedIncome, projCurrency)}` : "0"}
                      </span>
                    </div>

                    {/* Total Expense */}
                    <div className="bg-stone-50/40 p-2.5 rounded-2xl border border-stone-200/40 flex flex-col justify-between min-h-[58px]">
                      <span className="text-[8px] text-slate-400 uppercase tracking-wider font-bold">
                        {locale === "ru" ? "Расходы" : "Expenses"}
                      </span>
                      <span className={`font-mono font-black text-xs truncate ${totalExpense > 0 ? "text-rose-600" : "text-slate-400"}`}>
                        {totalExpense > 0 ? `-${formatCurrency(totalExpense, projCurrency)}` : "0"}
                      </span>
                    </div>

                    {/* Net Profit & Margin */}
                    <div className="bg-gradient-to-br from-emerald-50/10 to-transparent p-2.5 rounded-2xl border border-emerald-100 flex flex-col justify-between min-h-[58px] col-span-2 sm:col-span-1">
                      <div className="flex items-center justify-between gap-1">
                        <span className="text-[8px] text-emerald-800/80 uppercase tracking-wider font-bold">
                          {locale === "ru" ? "Прибыль" : "Profit"}
                        </span>
                        {receivedIncome > 0 && (
                          <span className="bg-emerald-100 text-emerald-800 text-[8px] px-1 py-0.5 rounded-md font-black">
                            {margin}%
                          </span>
                        )}
                      </div>
                      <span className={`font-mono font-black text-xs truncate ${netProfit >= 0 ? "text-emerald-700" : "text-rose-700"}`}>
                        {formatCurrency(netProfit, projCurrency)}
                      </span>
                    </div>
                  </div>

                  {/* Quarterly Income Breakdown for this Project */}
                  <div className="bg-emerald-500/5 border border-emerald-500/10 rounded-2xl p-3 space-y-2 mt-1">
                    <span className="text-[9px] text-slate-500 font-black uppercase tracking-wider block">
                      {locale === "ru" ? "Доходы по кварталам:" : "Quarterly Incomes:"}
                    </span>
                    <div className="grid grid-cols-4 gap-2 text-center">
                      {[1, 2, 3, 4].map(q => {
                        const amt = financials.quarterlyIncomes?.[q] || 0;
                        const label = getQuarterLabel(q, locale);
                        return (
                          <div key={q} className="bg-white border border-stone-200/50 p-1.5 rounded-lg">
                            <span className="text-[8px] text-slate-400 font-bold block">{label}</span>
                            <span className={`text-[10px] font-mono font-black block mt-0.5 ${amt > 0 ? "text-emerald-600" : "text-stone-400"}`}>
                              {amt > 0 ? formatCurrency(amt, projCurrency) : "0"}
                            </span>
                          </div>
                        );
                      })}
                    </div>
                  </div>

                  {/* Expense Classification Segment with SVG Donut Chart */}
                  {totalExpense > 0 ? (
                    <div className="pt-3.5 border-t border-stone-200/30 space-y-4">
                      <span className="text-[9px] text-slate-400 font-black uppercase tracking-wider block">
                        {locale === "ru" ? "Классификация и диаграмма расходов:" : "Expense Classification Chart:"}
                      </span>

                      <div className="flex flex-col sm:flex-row items-center gap-6 bg-stone-50/30 p-4 rounded-2xl border border-stone-150 shadow-3xs">
                        {/* Interactive SVG Donut Chart */}
                        <div className="relative flex-shrink-0 w-[110px] h-[110px] flex items-center justify-center">
                          <svg className="w-full h-full -rotate-90" viewBox="0 0 100 100">
                            {/* Background circle */}
                            <circle
                              cx="50"
                              cy="50"
                              r={donutRadius}
                              fill="transparent"
                              stroke="#f1f1f0"
                              strokeWidth="11"
                            />
                            {/* Colored donut segments */}
                            {donutSegments.map((seg, i) => {
                              const isHovered = hoveredCategory === seg.key;
                              return (
                                <motion.circle
                                  key={seg.key}
                                  cx="50"
                                  cy="50"
                                  r={donutRadius}
                                  fill="transparent"
                                  stroke={seg.color}
                                  strokeWidth={isHovered ? "15" : "11"}
                                  strokeDasharray={seg.strokeDashArray}
                                  strokeDashoffset={seg.strokeDashOffset}
                                  strokeLinecap={seg.percentage > 4 ? "round" : "butt"}
                                  className="transition-all duration-350 cursor-pointer"
                                  onMouseEnter={() => setHoveredCategory(seg.key)}
                                  onMouseLeave={() => setHoveredCategory(null)}
                                  style={{ transformOrigin: "center" }}
                                />
                              );
                            })}
                          </svg>

                          {/* Central Value display */}
                          <div className="absolute inset-0 flex flex-col items-center justify-center pointer-events-none text-center p-1">
                            <span className="text-[10px] font-black text-slate-800 font-mono tracking-tight leading-none">
                              {formatCurrency(totalExpense, projCurrency)}
                            </span>
                            <span className="text-[8px] text-slate-450 uppercase font-black tracking-widest mt-0.5">
                              {locale === "ru" ? "Расход" : "Spent"}
                            </span>
                          </div>
                        </div>

                        {/* Interactive Categories legend list */}
                        <div className="flex-1 w-full space-y-2.5">
                          {categoriesList.slice(0, 5).map((seg) => {
                            const isHovered = hoveredCategory === seg.key;
                            return (
                              <div
                                key={seg.key}
                                className={`flex items-center justify-between text-[11px] font-semibold px-2 py-1.5 rounded-xl border transition-all ${
                                  isHovered
                                    ? "bg-white border-amber-300 shadow-3xs translate-x-1"
                                    : "bg-white/40 border-transparent"
                                }`}
                                onMouseEnter={() => setHoveredCategory(seg.key)}
                                onMouseLeave={() => setHoveredCategory(null)}
                              >
                                <div className="flex items-center gap-2 min-w-0">
                                  <span
                                    className="w-2.5 h-2.5 rounded-full flex-shrink-0"
                                    style={{ backgroundColor: seg.color }}
                                  />
                                  <span className="text-slate-700 truncate font-sans">
                                    {seg.label}
                                  </span>
                                </div>
                                <div className="flex items-center gap-1.5 font-mono flex-shrink-0 pl-2">
                                  <span className="text-slate-400 text-[10px]">
                                    ({seg.percentage}%)
                                  </span>
                                  <span className="text-slate-800 font-black">
                                    {formatCurrency(seg.amount, projCurrency)}
                                  </span>
                                </div>
                              </div>
                            );
                          })}
                          {categoriesList.length > 5 && (
                            <p className="text-[9px] text-slate-400 italic text-right font-medium pr-1">
                              {locale === "ru"
                                ? `+ ещё ${categoriesList.length - 5} категорий расходов`
                                : `+ ${categoriesList.length - 5} more expense categories`}
                            </p>
                          )}
                        </div>
                      </div>
                    </div>
                  ) : (
                    <div className="pt-3.5 border-t border-stone-200/30 flex items-center justify-center p-4 bg-stone-50/50 rounded-2xl border border-dashed border-stone-200">
                      <div className="text-center">
                        <AlertCircle className="w-5 h-5 text-slate-400 mx-auto mb-1.5" />
                        <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest leading-none">
                          {locale === "ru" ? "Нет расходов по объекту" : "No expense tracking registered"}
                        </p>
                      </div>
                    </div>
                  )}
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}

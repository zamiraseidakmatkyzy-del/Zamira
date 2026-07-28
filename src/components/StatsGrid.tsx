import React from "react";
import { Invoice } from "../types";
import { DollarSign, Package, Headphones, FileText, TrendingUp } from "lucide-react";

interface StatsGridProps {
  invoices: Invoice[];
}

export default function StatsGrid({ invoices }: StatsGridProps) {
  // Calculations
  const totalAmount = invoices.reduce((sum, inv) => sum + inv.totalAmount, 0);
  
  let goodsTotal = 0;
  let servicesTotal = 0;
  
  invoices.forEach((inv) => {
    inv.items.forEach((item) => {
      if (item.type === "goods") {
        goodsTotal += item.totalPrice;
      } else {
        servicesTotal += item.totalPrice;
      }
    });
  });

  const formatCurrency = (val: number) => {
    return new Intl.NumberFormat("ru-RU", {
      style: "currency",
      currency: "RUB",
      maximumFractionDigits: 0,
    }).format(val);
  };

  const stats = [
    {
      id: "stat-total",
      title: "Общая сумма",
      value: formatCurrency(totalAmount),
      description: "Все учтенные расходы",
      icon: DollarSign,
      colorClass: "bg-emerald-50 text-emerald-700 border-emerald-100 dark:bg-emerald-950/20 dark:text-emerald-400 dark:border-emerald-900/30",
    },
    {
      id: "stat-goods",
      title: "Товары",
      value: formatCurrency(goodsTotal),
      description: `${Math.round((goodsTotal / (totalAmount || 1)) * 100)}% от общих трат`,
      icon: Package,
      colorClass: "bg-blue-50 text-blue-700 border-blue-100 dark:bg-blue-950/20 dark:text-blue-400 dark:border-blue-900/30",
    },
    {
      id: "stat-services",
      title: "Услуги",
      value: formatCurrency(servicesTotal),
      description: `${Math.round((servicesTotal / (totalAmount || 1)) * 100)}% от общих трат`,
      icon: Headphones,
      colorClass: "bg-purple-50 text-purple-700 border-purple-100 dark:bg-purple-950/20 dark:text-purple-400 dark:border-purple-900/30",
    },
    {
      id: "stat-count",
      title: "Документы",
      value: invoices.length,
      description: "Счет-фактур загружено",
      icon: FileText,
      colorClass: "bg-amber-50 text-amber-700 border-amber-100 dark:bg-amber-950/20 dark:text-amber-400 dark:border-amber-900/30",
    },
  ];

  return (
    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4" id="dashboard-stats-grid">
      {stats.map((stat) => {
        const Icon = stat.icon;
        return (
          <div
            key={stat.id}
            id={stat.id}
            className={`p-5 rounded-2xl border flex flex-col justify-between shadow-sm transition-all hover:shadow-md ${stat.colorClass}`}
          >
            <div className="flex items-start justify-between">
              <div>
                <p className="text-xs font-medium uppercase tracking-wider opacity-80">{stat.title}</p>
                <h3 className="text-2xl font-bold mt-2 font-sans tracking-tight">{stat.value}</h3>
              </div>
              <div className="p-2 rounded-xl bg-white/65 dark:bg-black/25 shadow-sm">
                <Icon className="w-5 h-5" />
              </div>
            </div>
            <p className="text-xs mt-3 font-medium opacity-70 flex items-center gap-1">
              <TrendingUp className="w-3.5 h-3.5 inline" />
              {stat.description}
            </p>
          </div>
        );
      })}
    </div>
  );
}

import React, { useState, useMemo } from "react";
import { Client, Invoice } from "../types";
import {
  Users,
  Search,
  Plus,
  Building,
  User,
  Phone,
  Mail,
  Folder,
  DollarSign,
  Edit2,
  Trash2,
  X,
  TrendingUp,
  FileText,
  ChevronDown,
  ChevronUp,
  Clock,
  MapPin,
  Calendar,
  Coins,
  Percent,
  PlusCircle
} from "lucide-react";

interface ClientsTabContentProps {
  clients: Client[];
  setClients: React.Dispatch<React.SetStateAction<Client[]>>;
  invoices: Invoice[];
  locale: string;
  t: any;
  formatCurrency: (val: any, currencyOverride?: string) => string;
  formatMultiCurrencySum: (sumMap: Record<string, number>) => string;
  uniqueObjects: string[];
  isSidebar?: boolean;
}

export default function ClientsTabContent({
  clients,
  setClients,
  invoices,
  locale,
  t,
  formatCurrency,
  formatMultiCurrencySum,
  uniqueObjects,
  isSidebar = false,
}: ClientsTabContentProps) {
  const [searchQuery, setSearchQuery] = useState("");
  const [editingClient, setEditingClient] = useState<Client | null>(null);
  const [isAdding, setIsAdding] = useState(false);
  const [expandedPayments, setExpandedPayments] = useState<Record<string, boolean>>({});

  // Form States
  const [companyName, setCompanyName] = useState("");
  const [contactPerson, setContactPerson] = useState("");
  const [phone, setPhone] = useState("");
  const [email, setEmail] = useState("");
  const [address, setAddress] = useState("");
  
  // Projects builder states
  const [formProjects, setFormProjects] = useState<string[]>([]);
  const [newProjectName, setNewProjectName] = useState("");
  
  // Project properties inputs
  const [projectContractsInput, setProjectContractsInput] = useState<Record<string, number | string>>({});
  const [projectStartDatesInput, setProjectStartDatesInput] = useState<Record<string, string>>({});
  const [projectEndDatesInput, setProjectEndDatesInput] = useState<Record<string, string>>({});
  const [projectStatusesInput, setProjectStatusesInput] = useState<Record<string, string>>({});

  // Confirmation Delete State
  const [confirmDeleteId, setConfirmDeleteId] = useState<string | null>(null);

  // Filter clients based on search query
  const filteredClients = useMemo(() => {
    const q = searchQuery.toLowerCase().trim();
    if (!q) return clients;
    return clients.filter(
      (c) =>
        c.companyName.toLowerCase().includes(q) ||
        (c.contactPerson && c.contactPerson.toLowerCase().includes(q)) ||
        (c.phone && c.phone.toLowerCase().includes(q)) ||
        (c.email && c.email.toLowerCase().includes(q)) ||
        (c.address && c.address.toLowerCase().includes(q)) ||
        c.projects.some((p) => p.toLowerCase().includes(q))
    );
  }, [clients, searchQuery]);

  // Open Add Client Form
  const handleOpenAdd = () => {
    setCompanyName("");
    setContactPerson("");
    setPhone("");
    setEmail("");
    setAddress("");
    setFormProjects([]);
    setNewProjectName("");
    setProjectContractsInput({});
    setProjectStartDatesInput({});
    setProjectEndDatesInput({});
    setProjectStatusesInput({});
    setEditingClient(null);
    setIsAdding(true);
  };

  // Open Edit Client Form
  const handleOpenEdit = (client: Client) => {
    setCompanyName(client.companyName);
    setContactPerson(client.contactPerson || "");
    setPhone(client.phone || "");
    setEmail(client.email || "");
    setAddress(client.address || "");
    setFormProjects(client.projects || []);
    setNewProjectName("");
    setProjectContractsInput(client.projectContracts || {});
    setProjectStartDatesInput(client.projectStartDates || {});
    setProjectEndDatesInput(client.projectEndDates || {});
    setProjectStatusesInput(client.projectStatuses || {});
    setEditingClient(client);
    setIsAdding(false);
  };

  // Toggle quick selection of standard projects
  const handleToggleQuickProject = (project: string) => {
    if (formProjects.includes(project)) {
      setFormProjects((prev) => prev.filter((p) => p !== project));
    } else {
      setFormProjects((prev) => [...prev, project]);
      // Set default active status
      if (!projectStatusesInput[project]) {
        setProjectStatusesInput((prev) => ({ ...prev, [project]: "active" }));
      }
    }
  };

  // Add custom project manually
  const handleAddCustomProject = () => {
    const trimmed = newProjectName.trim();
    if (trimmed && !formProjects.includes(trimmed)) {
      setFormProjects((prev) => [...prev, trimmed]);
      setProjectStatusesInput((prev) => ({ ...prev, [trimmed]: "active" }));
      setNewProjectName("");
    }
  };

  // Remove project from list
  const handleRemoveProject = (project: string) => {
    setFormProjects((prev) => prev.filter((p) => p !== project));
  };

  // Handle Save Client
  const handleSave = (e: React.FormEvent) => {
    e.preventDefault();
    if (!companyName.trim()) return;

    // Clean up project properties to only keep contracts/dates for active projects
    const cleanedContracts: Record<string, number> = {};
    const cleanedStartDates: Record<string, string> = {};
    const cleanedEndDates: Record<string, string> = {};
    const cleanedStatuses: Record<string, string> = {};

    formProjects.forEach((proj) => {
      // Contract
      const val = projectContractsInput[proj];
      if (val !== undefined && val !== "") {
        const parsed = typeof val === "number" ? val : parseFloat(val);
        cleanedContracts[proj] = isNaN(parsed) ? 0 : parsed;
      }
      // Dates
      if (projectStartDatesInput[proj]) cleanedStartDates[proj] = projectStartDatesInput[proj];
      if (projectEndDatesInput[proj]) cleanedEndDates[proj] = projectEndDatesInput[proj];
      // Status
      cleanedStatuses[proj] = projectStatusesInput[proj] || "active";
    });

    if (editingClient) {
      // Update existing client
      setClients((prev) =>
        prev.map((c) =>
          c.id === editingClient.id
            ? {
                ...c,
                companyName: companyName.trim(),
                contactPerson: contactPerson.trim(),
                phone: phone.trim(),
                email: email.trim(),
                address: address.trim(),
                projects: formProjects,
                projectContracts: cleanedContracts,
                projectStartDates: cleanedStartDates,
                projectEndDates: cleanedEndDates,
                projectStatuses: cleanedStatuses,
              }
            : c
        )
      );
      setEditingClient(null);
    } else {
      // Create new client
      const newClient: Client = {
        id: `client-${Date.now()}`,
        companyName: companyName.trim(),
        contactPerson: contactPerson.trim(),
        phone: phone.trim(),
        email: email.trim(),
        address: address.trim(),
        projects: formProjects,
        projectContracts: cleanedContracts,
        projectStartDates: cleanedStartDates,
        projectEndDates: cleanedEndDates,
        projectStatuses: cleanedStatuses,
      };
      setClients((prev) => [...prev, newClient]);
      setIsAdding(false);
    }
  };

  // Handle Delete Client
  const handleDelete = (id: string) => {
    setClients((prev) => prev.filter((c) => c.id !== id));
    if (confirmDeleteId === id) {
      setConfirmDeleteId(null);
    }
  };

  // Toggle Expanded Payments list
  const toggleExpandedPayments = (clientId: string) => {
    setExpandedPayments((prev) => ({
      ...prev,
      [clientId]: !prev[clientId],
    }));
  };

  // Helper to dynamically calculate precise financial details for a single project/object
  const getProjectFinancials = (projectName: string) => {
    let income = 0;
    let expense = 0;
    let currency = "";

    invoices.forEach((inv) => {
      const invCurrency = inv.currency || (locale === "ru" ? "RUB" : "USD");
      const isIncome = inv.invoiceType === "income";
      
      // Check if root object matches
      const rootMatch = inv.objectName && inv.objectName.toLowerCase().trim() === projectName.toLowerCase().trim();
      
      // Or check if any items match this project
      let itemMatchSum = 0;
      let hasItemMatch = false;

      if (inv.items && Array.isArray(inv.items)) {
        inv.items.forEach((item) => {
          const itemObjectName = item.objectName || inv.objectName || "";
          if (itemObjectName && itemObjectName.toLowerCase().trim() === projectName.toLowerCase().trim()) {
            itemMatchSum += item.totalPrice || 0;
            hasItemMatch = true;
          }
        });
      }

      const matchedAmount = rootMatch ? (inv.totalAmount || 0) : (hasItemMatch ? itemMatchSum : 0);

      if (matchedAmount > 0) {
        if (!currency) currency = invCurrency;
        if (isIncome) {
          income += matchedAmount;
        } else {
          expense += matchedAmount;
        }
      }
    });

    const profit = income - expense;
    const margin = income > 0 ? Math.round((profit / income) * 100) : 0;

    return { income, expense, profit, margin, currency };
  };

  // Dynamically calculate overall metrics for a client (all matched income invoices)
  const getClientMetrics = (client: Client) => {
    const matchedInvoicesSet = new Set<Invoice>();
    
    invoices.forEach((inv) => {
      if (inv.invoiceType !== "income") return;

      const matchesClientName = inv.supplierName && inv.supplierName.toLowerCase().trim() === client.companyName.toLowerCase().trim();
      
      let matchesProject = false;
      if (client.projects && client.projects.length > 0) {
        client.projects.forEach((proj) => {
          if (inv.objectName && inv.objectName.toLowerCase().trim() === proj.toLowerCase().trim()) {
            matchesProject = true;
          }
          if (inv.items && Array.isArray(inv.items)) {
            inv.items.forEach((item) => {
              const itemObjectName = item.objectName || inv.objectName || "";
              if (itemObjectName && itemObjectName.toLowerCase().trim() === proj.toLowerCase().trim()) {
                matchesProject = true;
              }
            });
          }
        });
      }

      if (matchesClientName || matchesProject) {
        matchedInvoicesSet.add(inv);
      }
    });

    const matchedInvoices = Array.from(matchedInvoicesSet);
    const revenueMap: Record<string, number> = {};
    
    matchedInvoices.forEach((inv) => {
      const curr = inv.currency || (locale === "ru" ? "RUB" : "USD");
      let matchedAmount = 0;
      let hasSpecificProjectMatch = false;

      if (client.projects && client.projects.length > 0 && inv.items && Array.isArray(inv.items)) {
        inv.items.forEach((item) => {
          const itemObjectName = item.objectName || inv.objectName || "";
          const matchesAnyProj = client.projects.some(
            (proj) => itemObjectName && itemObjectName.toLowerCase().trim() === proj.toLowerCase().trim()
          );
          if (matchesAnyProj) {
            matchedAmount += item.totalPrice || 0;
            hasSpecificProjectMatch = true;
          }
        });
      }

      if (!hasSpecificProjectMatch) {
        matchedAmount = inv.totalAmount || 0;
      }

      revenueMap[curr] = (revenueMap[curr] || 0) + matchedAmount;
    });

    return {
      invoices: matchedInvoices,
      revenueMap,
      hasRevenue: Object.keys(revenueMap).length > 0,
    };
  };

  // Translate project status label helper
  const getStatusLabel = (status: string) => {
    const labels: Record<string, Record<string, string>> = {
      planned: { ru: "Планируется", es: "Planificado", en: "Planned" },
      active: { ru: "Активен", es: "Activo", en: "Active" },
      completed: { ru: "Завершен", es: "Completado", en: "Completed" },
      paused: { ru: "На паузе", es: "En pausa", en: "Paused" },
    };
    return labels[status]?.[locale] || labels[status]?.["en"] || status;
  };

  // Get project status color styling
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

  // Helper to format Date string beautifully
  const formatDateBeautiful = (dateStr?: string) => {
    if (!dateStr) return "";
    try {
      const d = new Date(dateStr);
      if (isNaN(d.getTime())) return dateStr;
      return d.toLocaleDateString(locale === "ru" ? "ru-RU" : locale === "es" ? "es-ES" : "en-US", {
        day: "numeric",
        month: "short",
        year: "numeric"
      });
    } catch {
      return dateStr;
    }
  };

  return (
    <div className="space-y-6" id="clients-tab-container">
      {/* Tab Header Controls */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 bg-stone-50/50 p-4 rounded-2xl border border-stone-200/40">
        <div className="relative flex-1 max-w-md">
          <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
          <input
            type="text"
            placeholder={t.clientSearchPlaceholder || "Search clients..."}
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

        {!isAdding && !editingClient && (
          <button
            onClick={handleOpenAdd}
            className="px-4 py-2.5 bg-slate-900 text-amber-400 border border-slate-950 rounded-xl text-xs font-black uppercase tracking-wider flex items-center justify-center gap-1.5 cursor-pointer hover:bg-slate-850 hover:text-amber-300 transition-all shadow-[0_4px_12px_rgba(0,0,0,0.04)]"
          >
            <Plus className="w-4 h-4" />
            {t.addClient}
          </button>
        )}
      </div>

      {/* Add / Edit Form Block */}
      {(isAdding || editingClient) && (
        <div className="bg-stone-50 border border-stone-200/60 rounded-2xl p-5 md:p-6 shadow-[0_8px_30px_rgb(0,0,0,0.015)] animate-fade-in">
          <div className="flex items-center justify-between pb-4 border-b border-stone-200/40 mb-5">
            <h4 className="text-sm font-black text-slate-900 tracking-tight flex items-center gap-2">
              <Building className="w-5 h-5 text-amber-500" />
              {editingClient ? t.editClient : t.addClient}
            </h4>
            <button
              onClick={() => {
                setIsAdding(false);
                setEditingClient(null);
              }}
              className="p-1.5 hover:bg-stone-200/60 rounded-lg text-slate-400 hover:text-slate-600 transition-all cursor-pointer"
            >
              <X className="w-4 h-4" />
            </button>
          </div>

          <form onSubmit={handleSave} className="space-y-6">
            {/* Primary Contact Information */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {/* Company Name */}
              <div className="flex flex-col space-y-1.5">
                <label className="text-[10px] font-black uppercase tracking-wider text-slate-400">
                  {t.companyName} <span className="text-rose-500">*</span>
                </label>
                <input
                  type="text"
                  required
                  placeholder="e.g. Acme Corp"
                  value={companyName}
                  onChange={(e) => setCompanyName(e.target.value)}
                  className="bg-white border border-stone-200 text-slate-800 text-xs font-semibold rounded-xl px-3 py-2.5 focus:outline-none focus:ring-2 focus:ring-amber-400/50 transition-all shadow-sm"
                />
              </div>

              {/* Contact Person */}
              <div className="flex flex-col space-y-1.5">
                <label className="text-[10px] font-black uppercase tracking-wider text-slate-400">
                  {t.contactPerson}
                </label>
                <input
                  type="text"
                  placeholder="e.g. John Doe"
                  value={contactPerson}
                  onChange={(e) => setContactPerson(e.target.value)}
                  className="bg-white border border-stone-200 text-slate-800 text-xs font-semibold rounded-xl px-3 py-2.5 focus:outline-none focus:ring-2 focus:ring-amber-400/50 transition-all shadow-sm"
                />
              </div>

              {/* Phone */}
              <div className="flex flex-col space-y-1.5">
                <label className="text-[10px] font-black uppercase tracking-wider text-slate-400">
                  {t.phone}
                </label>
                <input
                  type="tel"
                  placeholder="e.g. +1 (555) 019-2834"
                  value={phone}
                  onChange={(e) => setPhone(e.target.value)}
                  className="bg-white border border-stone-200 text-slate-800 text-xs font-semibold rounded-xl px-3 py-2.5 focus:outline-none focus:ring-2 focus:ring-amber-400/50 transition-all shadow-sm"
                />
              </div>

              {/* Email */}
              <div className="flex flex-col space-y-1.5">
                <label className="text-[10px] font-black uppercase tracking-wider text-slate-400">
                  {t.email}
                </label>
                <input
                  type="email"
                  placeholder="e.g. contact@acme.com"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  className="bg-white border border-stone-200 text-slate-800 text-xs font-semibold rounded-xl px-3 py-2.5 focus:outline-none focus:ring-2 focus:ring-amber-400/50 transition-all shadow-sm"
                />
              </div>

              {/* Address (NEW) */}
              <div className="flex flex-col space-y-1.5 md:col-span-2">
                <label className="text-[10px] font-black uppercase tracking-wider text-slate-400">
                  {locale === "ru" ? "Адрес клинета" : locale === "es" ? "Dirección del cliente" : "Client Address"}
                </label>
                <div className="relative">
                  <MapPin className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
                  <input
                    type="text"
                    placeholder={locale === "ru" ? "Улица, офис, город, страна" : locale === "es" ? "Calle, oficina, ciudad, país" : "Street, office, city, country"}
                    value={address}
                    onChange={(e) => setAddress(e.target.value)}
                    className="bg-white border border-stone-200 text-slate-800 text-xs font-semibold rounded-xl pl-10 pr-3 py-2.5 w-full focus:outline-none focus:ring-2 focus:ring-amber-400/50 transition-all shadow-sm"
                  />
                </div>
              </div>
            </div>

            {/* Projects list builder (Highly upgraded to avoid key issues and manage project contracts comfortably) */}
            <div className="flex flex-col space-y-4 pt-2 border-t border-stone-200/40">
              <div className="space-y-1">
                <label className="text-[10px] font-black uppercase tracking-wider text-slate-400">
                  {t.projects}
                </label>
                <span className="text-[10px] text-slate-400 block font-medium">
                  {locale === "ru" 
                    ? "Укажите проекты, связанные с этим клиентом. Для каждого проекта вы можете настроить сумму по контракту, даты начала и окончания, а также статус." 
                    : locale === "es" 
                      ? "Asigne proyectos para este cliente. Puede establecer montos de contrato, fechas de inicio y fin, y el estado del proyecto." 
                      : "Assign projects to this client. You can configure contract amounts, start and end dates, and project statuses."}
                </span>
              </div>
              
              {/* Quick Select Panel from existing workspace objects */}
              {uniqueObjects.length > 0 && (
                <div className="space-y-2 bg-white p-3 border border-stone-200 rounded-xl shadow-xs">
                  <span className="text-[9px] text-slate-400 font-bold uppercase tracking-wider block">
                    {locale === "ru" ? "Быстрый выбор из объектов:" : locale === "es" ? "Seleccionar de objetos:" : "Quick select from objects:"}
                  </span>
                  <div className="flex flex-wrap gap-1.5">
                    {uniqueObjects.map((obj) => {
                      const isSelected = formProjects.includes(obj);
                      return (
                        <button
                          key={obj}
                          type="button"
                          onClick={() => handleToggleQuickProject(obj)}
                          className={`px-2.5 py-1.5 rounded-lg text-[10px] font-bold border transition-all cursor-pointer flex items-center gap-1.5 ${
                            isSelected
                              ? "bg-amber-400/10 text-amber-950 border-amber-300 shadow-3xs"
                              : "bg-slate-50 text-slate-500 border-stone-200 hover:bg-slate-100"
                          }`}
                        >
                          <Folder className="w-3 h-3 text-slate-450" />
                          {obj}
                        </button>
                      );
                    })}
                  </div>
                </div>
              )}

              {/* Add Custom Project Manually Input */}
              <div className="flex items-center gap-2">
                <input
                  type="text"
                  placeholder={locale === "ru" ? "Добавить новый проект..." : locale === "es" ? "Agregar nuevo proyecto..." : "Add new project..."}
                  value={newProjectName}
                  onChange={(e) => setNewProjectName(e.target.value)}
                  onKeyDown={(e) => {
                    if (e.key === "Enter") {
                      e.preventDefault();
                      handleAddCustomProject();
                    }
                  }}
                  className="bg-white border border-stone-200 text-slate-850 text-xs font-semibold rounded-xl px-3 py-2 flex-1 focus:outline-none focus:ring-2 focus:ring-amber-400/50 transition-all shadow-3xs"
                />
                <button
                  type="button"
                  onClick={handleAddCustomProject}
                  className="px-4 py-2 bg-slate-900 text-amber-400 border border-slate-950 rounded-xl text-xs font-bold uppercase tracking-wider hover:bg-slate-850 cursor-pointer transition-all flex items-center gap-1 shadow-3xs"
                >
                  <PlusCircle className="w-4 h-4" />
                  {locale === "ru" ? "Добавить" : "Add"}
                </button>
              </div>

              {/* Projects Grid Configuration List */}
              {formProjects.length > 0 ? (
                <div className="space-y-4">
                  {formProjects.map((proj) => {
                    const details = getProjectFinancials(proj);
                    const projCurrency = details.currency || (locale === "ru" ? "RUB" : "USD");

                    return (
                      <div
                        key={proj}
                        className="bg-white p-4 border border-stone-200/80 rounded-2xl shadow-3xs space-y-3 relative group"
                      >
                        {/* Project Header inside form */}
                        <div className="flex items-center justify-between border-b border-stone-100 pb-2">
                          <span className="text-xs font-black text-slate-800 flex items-center gap-1.5 truncate">
                            <Folder className="w-4 h-4 text-amber-500 flex-shrink-0" />
                            {proj}
                          </span>
                          <button
                            type="button"
                            onClick={() => handleRemoveProject(proj)}
                            title={locale === "ru" ? "Удалить проект" : "Remove project"}
                            className="p-1 hover:bg-rose-50 border border-transparent hover:border-rose-200 rounded-lg text-slate-400 hover:text-rose-600 transition-all cursor-pointer"
                          >
                            <X className="w-3.5 h-3.5" />
                          </button>
                        </div>

                        {/* Interactive inputs for the project */}
                        <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-4 gap-3">
                          {/* Contract Amount */}
                          <div className="flex flex-col space-y-1">
                            <span className="text-[9px] font-black uppercase tracking-wider text-slate-400">
                              {locale === "ru" ? "Сумма контракта" : locale === "es" ? "Monto contrato" : "Contract Sum"}
                            </span>
                            <div className="relative">
                              <input
                                type="number"
                                min="0"
                                step="any"
                                placeholder="0"
                                value={projectContractsInput[proj] !== undefined ? projectContractsInput[proj] : ""}
                                onChange={(e) => {
                                  const valStr = e.target.value;
                                  setProjectContractsInput((prev) => ({
                                    ...prev,
                                    [proj]: valStr === "" ? "" : parseFloat(valStr) || 0,
                                  }));
                                }}
                                className="bg-stone-50/50 border border-stone-200 text-slate-800 text-xs font-semibold rounded-lg pl-3 pr-10 py-1.5 w-full focus:outline-none focus:ring-1 focus:ring-amber-400/50 font-mono"
                              />
                              <span className="absolute right-2.5 top-1/2 -translate-y-1/2 text-[9px] font-black text-slate-400 font-mono">
                                {projCurrency}
                              </span>
                            </div>
                          </div>

                          {/* Project Status Selection */}
                          <div className="flex flex-col space-y-1">
                            <span className="text-[9px] font-black uppercase tracking-wider text-slate-400">
                              {locale === "ru" ? "Статус проекта" : locale === "es" ? "Estado proyecto" : "Project Status"}
                            </span>
                            <select
                              value={projectStatusesInput[proj] || "active"}
                              onChange={(e) => {
                                const val = e.target.value;
                                setProjectStatusesInput((prev) => ({
                                  ...prev,
                                  [proj]: val,
                                }));
                              }}
                              className="bg-stone-50/50 border border-stone-200 text-slate-800 text-xs font-semibold rounded-lg px-2.5 py-1.5 w-full focus:outline-none focus:ring-1 focus:ring-amber-400/50 cursor-pointer"
                            >
                              <option value="planned">{locale === "ru" ? "Планируется" : locale === "es" ? "Planificado" : "Planned"}</option>
                              <option value="active">{locale === "ru" ? "Активен" : locale === "es" ? "Activo" : "Active"}</option>
                              <option value="completed">{locale === "ru" ? "Завершен" : locale === "es" ? "Completado" : "Completed"}</option>
                              <option value="paused">{locale === "ru" ? "На паузе" : locale === "es" ? "En pausa" : "Paused"}</option>
                            </select>
                          </div>

                          {/* Project Start Date */}
                          <div className="flex flex-col space-y-1">
                            <span className="text-[9px] font-black uppercase tracking-wider text-slate-400">
                              {locale === "ru" ? "Начало" : locale === "es" ? "Inicio" : "Start Date"}
                            </span>
                            <input
                              type="date"
                              value={projectStartDatesInput[proj] || ""}
                              onChange={(e) => {
                                const val = e.target.value;
                                setProjectStartDatesInput((prev) => ({
                                  ...prev,
                                  [proj]: val,
                                }));
                              }}
                              className="bg-stone-50/50 border border-stone-200 text-slate-800 text-xs font-semibold rounded-lg px-2 py-1.5 w-full focus:outline-none focus:ring-1 focus:ring-amber-400/50 font-mono"
                            />
                          </div>

                          {/* Project End Date */}
                          <div className="flex flex-col space-y-1">
                            <span className="text-[9px] font-black uppercase tracking-wider text-slate-400">
                              {locale === "ru" ? "Конец" : locale === "es" ? "Fin" : "End Date"}
                            </span>
                            <input
                              type="date"
                              value={projectEndDatesInput[proj] || ""}
                              onChange={(e) => {
                                const val = e.target.value;
                                setProjectEndDatesInput((prev) => ({
                                  ...prev,
                                  [proj]: val,
                                }));
                              }}
                              className="bg-stone-50/50 border border-stone-200 text-slate-800 text-xs font-semibold rounded-lg px-2 py-1.5 w-full focus:outline-none focus:ring-1 focus:ring-amber-400/50 font-mono"
                            />
                          </div>
                        </div>
                      </div>
                    );
                  })}
                </div>
              ) : (
                <div className="text-center py-6 bg-white border border-stone-200/50 border-dashed rounded-xl">
                  <span className="text-[10px] font-bold text-slate-400 uppercase tracking-widest block">
                    {locale === "ru" ? "Проекты не добавлены" : "No projects added"}
                  </span>
                </div>
              )}
            </div>

            {/* Form Actions */}
            <div className="flex items-center justify-end gap-3 pt-3 border-t border-stone-200/40">
              <button
                type="button"
                onClick={() => {
                  setIsAdding(false);
                  setEditingClient(null);
                }}
                className="px-3.5 py-2 bg-white hover:bg-slate-50 text-slate-700 border border-stone-200 rounded-xl text-xs font-bold cursor-pointer transition-all"
              >
                {locale === "ru" ? "Отмена" : locale === "es" ? "Cancelar" : "Cancel"}
              </button>
              <button
                type="submit"
                className="px-4 py-2 bg-slate-900 text-amber-400 hover:bg-slate-850 rounded-xl text-xs font-black uppercase tracking-wider transition-all shadow-[0_2px_8px_rgba(0,0,0,0.08)] cursor-pointer"
              >
                {locale === "ru" ? "Сохранить" : locale === "es" ? "Guardar" : "Save"}
              </button>
            </div>
          </form>
        </div>
      )}

      {/* Grid of Clients Cards - Designed desktop-first with extreme clarity */}
      {filteredClients.length === 0 ? (
        <div className="text-center py-12 bg-stone-50/50 border border-stone-200/40 rounded-2xl">
          <Users className="w-8 h-8 text-stone-300 mx-auto mb-2" />
          <p className="text-xs font-bold text-slate-400 uppercase tracking-widest">
            {locale === "ru" ? "Клиенты не найдены" : locale === "es" ? "No se encontraron clientes" : "No clients found"}
          </p>
        </div>
      ) : (
        <div className={isSidebar ? "grid grid-cols-1 gap-5" : "grid grid-cols-1 md:grid-cols-2 lg:grid-cols-1 xl:grid-cols-2 gap-6"}>
          {filteredClients.map((client) => {
            const metrics = getClientMetrics(client);
            const isPaymentsExpanded = !!expandedPayments[client.id];
            const isConfirming = confirmDeleteId === client.id;

            return (
              <div
                key={client.id}
                id={client.id}
                className="bg-white border border-stone-200 rounded-2xl shadow-sm hover:shadow-md transition-all flex flex-col hover:border-amber-450/40 overflow-hidden relative group"
              >
                {/* Decorative Amber Left Stripe */}
                <div className="absolute left-0 top-0 bottom-0 w-1.5 bg-amber-400 group-hover:bg-amber-500 transition-colors" />

                {/* Client Card Header */}
                <div className="p-5 pl-7 border-b border-stone-100 bg-stone-50/30 flex justify-between items-start">
                  <div className="space-y-1">
                    <h4 className="text-sm font-black text-slate-850 tracking-wide uppercase font-display flex items-center gap-2">
                      <Building className="w-4.5 h-4.5 text-amber-500" />
                      {client.companyName}
                    </h4>
                    {client.contactPerson && (
                      <p className="text-[11px] text-slate-500 font-bold flex items-center gap-1.5 tracking-wide">
                        <User className="w-4.5 h-4.5 text-slate-400" />
                        {client.contactPerson}
                      </p>
                    )}
                  </div>

                  {/* Actions buttons */}
                  <div className="flex items-center gap-1.5">
                    <button
                      onClick={() => handleOpenEdit(client)}
                      title={t.editClient}
                      className="p-1.5 bg-white border border-stone-200 text-slate-500 hover:text-slate-850 hover:border-stone-350 rounded-lg transition-all cursor-pointer shadow-3xs"
                    >
                      <Edit2 className="w-3.5 h-3.5" />
                    </button>
                    
                    {isConfirming ? (
                      <div className="flex items-center gap-1 bg-rose-50 border border-rose-200 rounded-lg p-0.5 shadow-xs">
                        <button
                          onClick={() => handleDelete(client.id)}
                          className="px-2 py-1 bg-rose-600 text-white rounded text-[9px] font-bold cursor-pointer hover:bg-rose-700 transition-all"
                        >
                          {locale === "ru" ? "Да" : locale === "es" ? "Sí" : "Yes"}
                        </button>
                        <button
                          onClick={() => setConfirmDeleteId(null)}
                          className="px-1.5 py-1 text-slate-500 hover:text-slate-700 rounded text-[9px] font-bold cursor-pointer"
                        >
                          <X className="w-3 h-3" />
                        </button>
                      </div>
                    ) : (
                      <button
                        onClick={() => setConfirmDeleteId(client.id)}
                        title={t.deleteClient}
                        className="p-1.5 bg-white border border-stone-200 text-rose-500 hover:bg-rose-50 hover:border-rose-200 rounded-lg transition-all cursor-pointer shadow-3xs"
                      >
                        <Trash2 className="w-3.5 h-3.5" />
                      </button>
                    )}
                  </div>
                </div>

                {/* Contact details, Address, and list of Projects */}
                <div className="p-5 pl-7 flex-1 flex flex-col space-y-5">
                  
                  {/* Contact Badges Row */}
                  {(client.phone || client.email || client.address) && (
                    <div className="flex flex-wrap gap-2">
                      {client.phone && (
                        <a
                          href={`tel:${client.phone}`}
                          className="inline-flex items-center gap-1.5 px-2.5 py-1.5 bg-stone-50 hover:bg-stone-100 border border-stone-200/50 rounded-lg text-[10px] font-bold text-slate-600 transition-all shadow-3xs"
                        >
                          <Phone className="w-3.5 h-3.5 text-slate-400" />
                          <span>{client.phone}</span>
                        </a>
                      )}
                      {client.email && (
                        <a
                          href={`mailto:${client.email}`}
                          className="inline-flex items-center gap-1.5 px-2.5 py-1.5 bg-stone-50 hover:bg-stone-100 border border-stone-200/50 rounded-lg text-[10px] font-bold text-slate-600 transition-all shadow-3xs break-all max-w-[200px] truncate"
                          title={client.email}
                        >
                          <Mail className="w-3.5 h-3.5 text-slate-400" />
                          <span>{client.email}</span>
                        </a>
                      )}
                      {client.address && (
                        <span className="inline-flex items-center gap-1.5 px-2.5 py-1.5 bg-stone-50 border border-stone-200/50 rounded-lg text-[10px] font-bold text-slate-600 shadow-3xs">
                          <MapPin className="w-3.5 h-3.5 text-amber-500" />
                          <span className="truncate max-w-[240px]" title={client.address}>{client.address}</span>
                        </span>
                      )}
                    </div>
                  )}

                  {/* Projects List (Stunning upgraded design showing complete contract tracking, expenses, profit, margins, start/end dates, and status) */}
                  {client.projects.length > 0 ? (
                    <div className="space-y-3.5">
                      <span className="text-[10px] text-slate-400 font-black uppercase tracking-wider block">
                        {locale === "ru" ? "Проекты и аналитика по объектам:" : locale === "es" ? "Proyectos y analíticas:" : "Projects & Object Analytics:"}
                      </span>
                      <div className="space-y-4">
                        {client.projects.map((p) => {
                          const financials = getProjectFinancials(p);
                          const contractAmount = client.projectContracts?.[p] || 0;
                          const receivedIncome = financials.income;
                          const expenses = financials.expense;
                          const profit = financials.profit;
                          const margin = financials.margin;
                          const projCurrency = financials.currency || (locale === "ru" ? "RUB" : "USD");

                          const remainingContract = contractAmount - receivedIncome;
                          const hasContract = contractAmount > 0;
                          const percentPaid = hasContract ? Math.min(100, Math.round((receivedIncome / contractAmount) * 100)) : 0;

                          // Project Metadata (Dates & Status)
                          const projStatus = client.projectStatuses?.[p] || "active";
                          const projStartDate = client.projectStartDates?.[p];
                          const projEndDate = client.projectEndDates?.[p];

                          return (
                            <div
                              key={p}
                              className="p-4 bg-stone-50/50 border border-stone-150 rounded-2xl space-y-3.5 shadow-3xs hover:border-stone-250 transition-colors"
                            >
                              {/* 1. Project Title & Status Badge Row */}
                              <div className="flex items-center justify-between gap-2">
                                <span className="text-xs font-black text-slate-800 flex items-center gap-2 truncate" title={p}>
                                  <Folder className="w-4 h-4 text-amber-500 flex-shrink-0" />
                                  {p}
                                </span>
                                <span className={`px-2 py-0.5 rounded-lg text-[9px] font-bold border ${getStatusColor(projStatus)}`}>
                                  {getStatusLabel(projStatus)}
                                </span>
                              </div>

                              {/* 2. Start & End Dates Row */}
                              {(projStartDate || projEndDate) && (
                                <div className="flex items-center gap-1.5 text-[10px] text-slate-500 font-semibold bg-white p-2 rounded-xl border border-stone-100/50 shadow-3xs w-fit">
                                  <Calendar className="w-3.5 h-3.5 text-slate-400" />
                                  <span>
                                    {projStartDate ? formatDateBeautiful(projStartDate) : "—"}
                                  </span>
                                  <span className="text-slate-350">→</span>
                                  <span>
                                    {projEndDate ? formatDateBeautiful(projEndDate) : (locale === "ru" ? "Конец по контр." : "End by contr.")}
                                  </span>
                                </div>
                              )}

                              {/* 3. Progress bar representing contract completion */}
                              {hasContract && (
                                <div className="space-y-1.5">
                                  <div className="w-full bg-stone-200/60 rounded-full h-1.5 overflow-hidden">
                                    <div 
                                      className={`h-full rounded-full transition-all duration-500 ${
                                        percentPaid >= 100 ? "bg-emerald-500" : "bg-amber-400"
                                      }`}
                                      style={{ width: `${percentPaid}%` }}
                                    />
                                  </div>
                                  <div className="flex justify-between items-center text-[9px] text-slate-400 font-black uppercase tracking-wider">
                                    <span>{locale === "ru" ? "Оплачено" : "Paid"}: {percentPaid}%</span>
                                    {remainingContract > 0 ? (
                                      <span className="text-amber-600">{locale === "ru" ? "Осталось" : "Remaining"}: {formatCurrency(remainingContract, projCurrency)}</span>
                                    ) : (
                                      <span className="text-emerald-600 font-extrabold">{locale === "ru" ? "Полностью" : "Fully paid"}</span>
                                    )}
                                  </div>
                                </div>
                              )}

                              {/* 4. Complete 2x2 Bento Financial Analytics Grid (Contract, Income, Expenses, Profit with Margin) */}
                              <div className="grid grid-cols-2 gap-2 text-[10px] font-semibold text-slate-500">
                                {/* Contract sum */}
                                <div className="bg-white p-2.5 rounded-xl border border-stone-100 flex flex-col shadow-3xs">
                                  <span className="text-[8px] text-slate-400 uppercase tracking-wider font-bold">
                                    {locale === "ru" ? "Сумма Контракта" : locale === "es" ? "Monto de Contrato" : "Contract Sum"}
                                  </span>
                                  <span className="text-slate-800 font-mono font-black mt-1 text-xs truncate">
                                    {hasContract ? formatCurrency(contractAmount, projCurrency) : "—"}
                                  </span>
                                </div>

                                {/* Income / Payments received */}
                                <div className="bg-white p-2.5 rounded-xl border border-stone-100 flex flex-col shadow-3xs">
                                  <span className="text-[8px] text-slate-400 uppercase tracking-wider font-bold">
                                    {locale === "ru" ? "Поступления (Доход)" : locale === "es" ? "Ingresos Recibidos" : "Received (Income)"}
                                  </span>
                                  <span className="text-emerald-600 font-mono font-black mt-1 text-xs truncate">
                                    {receivedIncome > 0 ? `+${formatCurrency(receivedIncome, projCurrency)}` : "—"}
                                  </span>
                                </div>

                                {/* Expenses incurred */}
                                <div className="bg-white p-2.5 rounded-xl border border-stone-100 flex flex-col shadow-3xs">
                                  <span className="text-[8px] text-slate-400 uppercase tracking-wider font-bold">
                                    {locale === "ru" ? "Расходы по Объекту" : locale === "es" ? "Gastos Objeto" : "Object Expenses"}
                                  </span>
                                  <span className={`font-mono font-black mt-1 text-xs truncate ${expenses > 0 ? "text-rose-600" : "text-slate-400"}`}>
                                    {expenses > 0 ? `-${formatCurrency(expenses, projCurrency)}` : "—"}
                                  </span>
                                </div>

                                {/* Clean profit & Margin % */}
                                <div className="bg-gradient-to-br from-emerald-50/20 to-transparent p-2.5 rounded-xl border border-emerald-150/40 flex flex-col shadow-3xs">
                                  <div className="flex items-center justify-between gap-1">
                                    <span className="text-[8px] text-emerald-800/80 uppercase tracking-wider font-bold">
                                      {locale === "ru" ? "Чистая Прибыль" : locale === "es" ? "Beneficio" : "Net Profit"}
                                    </span>
                                    {receivedIncome > 0 && (
                                      <span className="bg-emerald-100 text-emerald-800 text-[8px] px-1 py-0.5 rounded-md font-black">
                                        {margin}%
                                      </span>
                                    )}
                                  </div>
                                  <span className={`font-mono font-black mt-1 text-xs truncate ${profit >= 0 ? "text-emerald-700" : "text-rose-750"}`}>
                                    {formatCurrency(profit, projCurrency)}
                                  </span>
                                </div>
                              </div>
                            </div>
                          );
                        })}
                      </div>
                    </div>
                  ) : (
                    <div className="py-2 text-[10px] text-slate-400 font-semibold italic flex items-center gap-1.5">
                      <Clock className="w-3.5 h-3.5" />
                      {locale === "ru" ? "Нет закрепленных проектов" : locale === "es" ? "Sin proyectos asignados" : "No assigned projects"}
                    </div>
                  )}

                  {/* Overall Client Revenue Summary */}
                  <div className="bg-gradient-to-br from-emerald-50/40 via-transparent to-transparent border border-emerald-200/50 rounded-2xl p-4 flex items-center justify-between shadow-3xs mt-auto">
                    <div className="space-y-0.5">
                      <span className="text-[9px] text-slate-400 uppercase font-black tracking-wider block">
                        {t.totalRevenue}
                      </span>
                      <h5 className="text-sm font-black font-mono text-emerald-700">
                        {metrics.hasRevenue ? formatMultiCurrencySum(metrics.revenueMap) : formatCurrency(0)}
                      </h5>
                    </div>
                    <div className="p-2 bg-emerald-50 text-emerald-600 rounded-xl border border-emerald-100/50 shadow-3xs">
                      <TrendingUp className="w-4 h-4" />
                    </div>
                  </div>
                </div>

                {/* Collapsible Invoice/Payment history */}
                {metrics.invoices.length > 0 && (
                  <div className="border-t border-stone-100">
                    <button
                      onClick={() => toggleExpandedPayments(client.id)}
                      className="w-full px-5 py-3 text-left text-[9px] font-black uppercase tracking-wider text-slate-500 hover:text-slate-800 transition-all flex items-center justify-between bg-stone-50/10 hover:bg-stone-50/45 cursor-pointer border-t border-transparent"
                    >
                      <span className="flex items-center gap-1.5">
                        <FileText className="w-3.5 h-3.5 text-slate-450" />
                        {locale === "ru" 
                          ? `История платежей (${metrics.invoices.length})` 
                          : locale === "es" 
                            ? `Historial de pagos (${metrics.invoices.length})` 
                            : `Payment history (${metrics.invoices.length})`}
                      </span>
                      {isPaymentsExpanded ? (
                        <ChevronUp className="w-3.5 h-3.5 text-slate-450" />
                      ) : (
                        <ChevronDown className="w-3.5 h-3.5 text-slate-450" />
                      )}
                    </button>

                    {isPaymentsExpanded && (
                      <div className="px-5 pb-4 pt-1 space-y-2 bg-stone-50/15 max-h-48 overflow-y-auto border-t border-stone-100/60 animate-fade-in font-sans">
                        {metrics.invoices
                          .sort((a, b) => b.date.localeCompare(a.date)) // Newest first
                          .map((inv) => (
                            <div
                              key={inv.id}
                              className="flex items-center justify-between text-[10px] font-semibold text-slate-600 py-2 border-b border-dashed border-stone-100 last:border-0"
                            >
                              <div className="space-y-0.5 pr-2 truncate">
                                <span className="text-slate-900 font-bold block truncate">
                                  #{inv.invoiceNumber || "—"} • {inv.supplierName}
                                </span>
                                <span className="text-[9px] text-slate-450 block font-mono">
                                  {inv.date} {inv.objectName ? `• ${inv.objectName}` : ""}
                                </span>
                              </div>
                              <span className="font-mono font-black text-emerald-600 flex-shrink-0">
                                +{formatCurrency(inv.totalAmount, inv.currency)}
                              </span>
                            </div>
                          ))}
                      </div>
                    )}
                  </div>
                )}
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}

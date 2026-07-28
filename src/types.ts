export type ItemType = 'goods' | 'service';
export type InvoiceType = 'expense' | 'income';

export type ExpenseCategory = 
  | 'materials' 
  | 'labor' 
  | 'equipment_rental' 
  | 'fuel' 
  | 'permit' 
  | 'office_expenses' 
  | 'insurance' 
  | 'taxes_fees' 
  | 'subcontracting' 
  | 'utility_expenses' 
  | 'other';

export interface InvoiceItem {
  id: string;
  description: string;
  type: ItemType;
  quantity: number;
  unitPrice: number;
  totalPrice: number;
  objectName?: string; // Optional object name specific to this line item
  expenseCategory?: ExpenseCategory; // Categorization according to tax reports
}

export interface Invoice {
  id: string;
  invoiceNumber: string;
  supplierName: string;
  date: string; // YYYY-MM-DD
  items: InvoiceItem[];
  totalAmount: number;
  objectName?: string; // E.g., project name, construction site, property
  imageUrl?: string; // base64 or blob URL
  createdAt: string;
  currency?: string; // E.g. 'RUB', 'USD', 'EUR', 'KZT', '₸', '₽'
  invoiceType?: InvoiceType; // E.g., 'expense' or 'income'
}

export interface AnalysisResponse {
  success: boolean;
  invoice?: Omit<Invoice, 'id' | 'createdAt' | 'imageUrl'>;
  error?: string;
}

export interface Client {
  id: string;
  companyName: string;
  contactPerson: string;
  phone: string;
  email: string;
  address?: string;
  projects: string[];
  projectContracts?: Record<string, number>;
  projectStartDates?: Record<string, string>;
  projectEndDates?: Record<string, string>;
  projectStatuses?: Record<string, string>;
}


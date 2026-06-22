export type Currency = 'USD' | 'IQD'
export type PaymentType = 'نقد' | 'دين' | 'أقساط'
export type SaleStatus = 'مدفوع' | 'جزئي' | 'دين'
export type OrderStatus = 'معلق' | 'جزئي' | 'مدفوع'
export type TransactionType = 'دخول' | 'خروج' | 'تعديل'
export type InstallmentStatus = 'معلق' | 'مدفوع'

export interface Category {
  id: string
  name: string
  created_at: string
}

export interface Product {
  id: string
  name: string
  category_id: string | null
  unit: string
  cost_price_usd: number
  sale_price_usd: number
  price_currency: Currency
  barcode: string | null
  description: string | null
  created_at: string
  categories?: Category
}

export interface Inventory {
  id: string
  product_id: string
  quantity: number
  min_quantity: number
  warehouse_location: string | null
  updated_at: string
  products?: Product
}

export interface InventoryTransaction {
  id: string
  product_id: string
  type: TransactionType
  quantity: number
  reference_type: string | null
  reference_id: string | null
  note: string | null
  created_at: string
  products?: Product
}

export interface Supplier {
  id: string
  name: string
  phone: string | null
  address: string | null
  balance_owed: number
  currency: Currency
  created_at: string
}

export interface PurchaseOrder {
  id: string
  supplier_id: string
  order_date: string
  total_amount: number
  currency: Currency
  exchange_rate: number
  amount_paid: number
  status: OrderStatus
  note: string | null
  created_at: string
  suppliers?: Supplier
  purchase_order_items?: PurchaseOrderItem[]
}

export interface PurchaseOrderItem {
  id: string
  purchase_order_id: string
  product_id: string
  quantity: number
  unit_price: number
  total: number
  products?: Product
}

export interface SupplierPayment {
  id: string
  supplier_id: string
  purchase_order_id: string | null
  amount: number
  currency: Currency
  exchange_rate: number
  payment_date: string
  note: string | null
  created_at: string
}

export interface Customer {
  id: string
  name: string
  phone: string | null
  address: string | null
  balance_owed: number
  created_at: string
}

export interface Sale {
  id: string
  customer_id: string | null
  sale_date: string
  total_amount: number
  currency: Currency
  exchange_rate: number
  payment_type: PaymentType
  amount_paid: number
  status: SaleStatus
  note: string | null
  created_at: string
  customers?: Customer
  sale_items?: SaleItem[]
}

export interface SaleItem {
  id: string
  sale_id: string
  product_id: string
  quantity: number
  unit_price: number
  total: number
  products?: Product
}

export interface Installment {
  id: string
  sale_id: string
  due_date: string
  amount: number
  paid_at: string | null
  status: InstallmentStatus
}

export interface CustomerPayment {
  id: string
  customer_id: string
  sale_id: string | null
  amount: number
  currency: Currency
  exchange_rate: number
  payment_date: string
  note: string | null
  created_at: string
}

export interface ExchangeRate {
  id: string
  usd_to_iqd: number
  rate_date: string
  created_at: string
}

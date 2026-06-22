import { supabase } from './supabase'

export async function fetchExchangeRate(): Promise<{ usd_to_iqd: number; rate_date: string }> {
  const { data } = await supabase
    .from('exchange_rates')
    .select('*')
    .order('rate_date', { ascending: false })
    .limit(1)
    .single()
  return data ?? { usd_to_iqd: 1310, rate_date: new Date().toISOString().split('T')[0] }
}

export async function saveExchangeRate(usd_to_iqd: number) {
  const { data, error } = await supabase
    .from('exchange_rates')
    .insert({ usd_to_iqd, rate_date: new Date().toISOString().split('T')[0] })
    .select()
    .single()
  if (error) throw error
  return data
}

export async function fetchCategories() {
  const { data, error } = await supabase.from('categories').select('*').order('name')
  if (error) throw error
  return data ?? []
}

export async function createCategory(name: string) {
  const { data, error } = await supabase.from('categories').insert({ name }).select().single()
  if (error) throw error
  return data
}

export async function fetchCustomers() {
  const { data, error } = await supabase
    .from('customers')
    .select('*')
    .order('created_at', { ascending: false })
  if (error) throw error
  return data ?? []
}

export async function createCustomer(body: { name: string; phone?: string; address?: string }) {
  const { data, error } = await supabase.from('customers').insert(body).select().single()
  if (error) throw error
  return data
}

export async function updateCustomer(id: string, body: { name: string; phone?: string; address?: string }) {
  const { data, error } = await supabase.from('customers').update(body).eq('id', id).select().single()
  if (error) throw error
  return data
}

export async function createCustomerPayment(body: {
  customer_id: string
  sale_id?: string | null
  amount: number
  currency: string
  exchange_rate: number
  payment_date: string
  note?: string | null
}) {
  const { data: payment, error } = await supabase
    .from('customer_payments')
    .insert(body)
    .select()
    .single()
  if (error) throw error

  const { data: cust } = await supabase.from('customers').select('balance_owed').eq('id', body.customer_id).single()
  await supabase.from('customers').update({ balance_owed: Math.max(0, (cust?.balance_owed ?? 0) - body.amount) }).eq('id', body.customer_id)

  if (body.sale_id) {
    const { data: sale } = await supabase.from('sales').select('total_amount, amount_paid').eq('id', body.sale_id).single()
    if (sale) {
      const newPaid = sale.amount_paid + body.amount
      await supabase.from('sales').update({
        amount_paid: newPaid,
        status: newPaid >= sale.total_amount ? 'مدفوع' : 'جزئي',
      }).eq('id', body.sale_id)
    }
  }
  return payment
}

export async function fetchSales() {
  const { data, error } = await supabase
    .from('sales')
    .select('*, customers(name, phone), sale_items(*, products(name, unit))')
    .order('created_at', { ascending: false })
  if (error) throw error
  return data ?? []
}

export async function createSale(body: {
  customer_id?: string | null
  sale_date: string
  total_amount: number
  currency: string
  exchange_rate: number
  payment_type: string
  amount_paid: number
  note?: string | null
  items: { product_id: string; quantity: number; unit_price: number }[]
  installments?: { due_date: string; amount: number }[]
}) {
  const { items, installments: installmentData, ...saleData } = body

  let status = 'مدفوع'
  if (saleData.payment_type === 'دين') { status = 'دين'; saleData.amount_paid = 0 }
  else if (saleData.payment_type === 'أقساط') { status = saleData.amount_paid > 0 ? 'جزئي' : 'دين' }
  else if (saleData.amount_paid < saleData.total_amount) { status = 'جزئي' }

  const { data: sale, error: saleError } = await supabase.from('sales').insert({ ...saleData, status }).select().single()
  if (saleError) throw saleError

  if (items.length > 0) {
    // Validate stock before inserting anything
    for (const item of items) {
      const { data: inv } = await supabase.from('inventory').select('quantity, products(name)').eq('product_id', item.product_id).single()
      const available = inv?.quantity ?? 0
      if (available < item.quantity) {
        await supabase.from('sales').delete().eq('id', sale.id)
        const productName = (inv as { products?: { name?: string } } | null)?.products?.name ?? 'المنتج'
        throw new Error(`الكمية المطلوبة (${item.quantity}) أكبر من المتوفر في المخزون (${available}) للمنتج: ${productName}`)
      }
    }
    await supabase.from('sale_items').insert(items.map(i => ({ ...i, sale_id: sale.id })))
    for (const item of items) {
      const { data: inv } = await supabase.from('inventory').select('quantity').eq('product_id', item.product_id).single()
      const newQty = (inv?.quantity ?? 0) - item.quantity
      await supabase.from('inventory').update({ quantity: newQty, updated_at: new Date().toISOString() }).eq('product_id', item.product_id)
      await supabase.from('inventory_transactions').insert({
        product_id: item.product_id,
        type: 'خروج',
        quantity: item.quantity,
        reference_type: 'بيع',
        reference_id: sale.id,
      })
    }
  }

  if (installmentData && installmentData.length > 0) {
    await supabase.from('installments').insert(installmentData.map(i => ({ ...i, sale_id: sale.id, status: 'معلق' })))
  }

  if (saleData.customer_id && status !== 'مدفوع') {
    const remaining = saleData.total_amount - (saleData.amount_paid ?? 0)
    const { data: cust } = await supabase.from('customers').select('balance_owed').eq('id', saleData.customer_id).single()
    await supabase.from('customers').update({ balance_owed: (cust?.balance_owed ?? 0) + remaining }).eq('id', saleData.customer_id)
  }

  return sale
}

export async function fetchProducts() {
  const { data, error } = await supabase
    .from('products')
    .select('*, categories(name)')
    .order('name')
  if (error) throw error
  return data ?? []
}

export async function createProduct(body: {
  name: string
  category_id?: string | null
  unit: string
  cost_price_usd: number
  sale_price_usd: number
  price_currency?: string
  barcode?: string | null
  description?: string | null
}) {
  const { data, error } = await supabase.from('products').insert(body).select().single()
  if (error) throw error
  return data
}

export async function updateProduct(id: string, body: object) {
  const { data, error } = await supabase.from('products').update(body).eq('id', id).select().single()
  if (error) throw error
  return data
}

export async function deleteProduct(id: string) {
  const { error } = await supabase.from('products').delete().eq('id', id)
  if (error) throw error
}

export async function fetchSuppliers() {
  const { data, error } = await supabase
    .from('suppliers')
    .select('*')
    .order('created_at', { ascending: false })
  if (error) throw error
  return data ?? []
}

export async function createSupplier(body: { name: string; phone?: string; address?: string; currency?: string }) {
  const { data, error } = await supabase.from('suppliers').insert(body).select().single()
  if (error) throw error
  return data
}

export async function updateSupplier(id: string, body: object) {
  const { data, error } = await supabase.from('suppliers').update(body).eq('id', id).select().single()
  if (error) throw error
  return data
}

export async function fetchPurchaseOrders(supplierId: string) {
  const { data, error } = await supabase
    .from('purchase_orders')
    .select('*, suppliers(name), purchase_order_items(*, products(name, unit))')
    .eq('supplier_id', supplierId)
    .order('created_at', { ascending: false })
  if (error) throw error
  return data ?? []
}

export async function createPurchaseOrder(body: {
  supplier_id: string
  order_date: string
  total_amount: number
  currency: string
  exchange_rate: number
  amount_paid: number
  status: string
  note?: string | null
  items: { product_id: string; quantity: number; unit_price: number }[]
}) {
  const { items, ...orderData } = body
  const { data: order, error: orderError } = await supabase.from('purchase_orders').insert(orderData).select().single()
  if (orderError) throw orderError

  if (items.length > 0) {
    await supabase.from('purchase_order_items').insert(items.map(i => ({ ...i, purchase_order_id: order.id })))
    for (const item of items) {
      const { data: inv } = await supabase.from('inventory').select('quantity').eq('product_id', item.product_id).single()
      const newQty = (inv?.quantity ?? 0) + item.quantity
      await supabase.from('inventory').upsert({ product_id: item.product_id, quantity: newQty, updated_at: new Date().toISOString() }, { onConflict: 'product_id' })
      await supabase.from('inventory_transactions').insert({
        product_id: item.product_id,
        type: 'دخول',
        quantity: item.quantity,
        reference_type: 'شراء',
        reference_id: order.id,
      })
    }
  }

  if (orderData.supplier_id) {
    const remaining = orderData.total_amount - (orderData.amount_paid ?? 0)
    const { data: sup } = await supabase.from('suppliers').select('balance_owed').eq('id', orderData.supplier_id).single()
    await supabase.from('suppliers').update({ balance_owed: (sup?.balance_owed ?? 0) + remaining }).eq('id', orderData.supplier_id)
  }

  return order
}

export async function createSupplierPayment(body: {
  supplier_id: string
  purchase_order_id?: string | null
  amount: number
  currency: string
  exchange_rate: number
  payment_date: string
  note?: string | null
}) {
  const { data: payment, error } = await supabase.from('supplier_payments').insert(body).select().single()
  if (error) throw error

  const { data: sup } = await supabase.from('suppliers').select('balance_owed').eq('id', body.supplier_id).single()
  await supabase.from('suppliers').update({ balance_owed: Math.max(0, (sup?.balance_owed ?? 0) - body.amount) }).eq('id', body.supplier_id)

  if (body.purchase_order_id) {
    const { data: po } = await supabase.from('purchase_orders').select('total_amount, amount_paid').eq('id', body.purchase_order_id).single()
    if (po) {
      const newPaid = po.amount_paid + body.amount
      await supabase.from('purchase_orders').update({
        amount_paid: newPaid,
        status: newPaid >= po.total_amount ? 'مدفوع' : 'جزئي',
      }).eq('id', body.purchase_order_id)
    }
  }
  return payment
}

export async function fetchInventory() {
  const { data, error } = await supabase
    .from('inventory')
    .select('*, products(*, categories(name))')
    .order('updated_at', { ascending: false })
  if (error) throw error
  return data ?? []
}

export async function updateInventory(body: {
  product_id: string
  quantity: number
  min_quantity: number
  warehouse_location?: string | null
  note?: string | null
}) {
  const { data: current } = await supabase.from('inventory').select('quantity').eq('product_id', body.product_id).single()
  const { data, error } = await supabase
    .from('inventory')
    .update({ quantity: body.quantity, min_quantity: body.min_quantity, warehouse_location: body.warehouse_location, updated_at: new Date().toISOString() })
    .eq('product_id', body.product_id)
    .select()
    .single()
  if (error) throw error

  const diff = body.quantity - (current?.quantity ?? 0)
  if (diff !== 0) {
    await supabase.from('inventory_transactions').insert({
      product_id: body.product_id,
      type: 'تعديل',
      quantity: Math.abs(diff),
      reference_type: 'تعديل يدوي',
      note: body.note,
    })
  }
  return data
}

export async function fetchDashboardStats() {
  const today = new Date().toISOString().split('T')[0]
  const monthStart = new Date(new Date().getFullYear(), new Date().getMonth(), 1).toISOString().split('T')[0]

  const [todaySales, monthSales, customerDebt, supplierDebt, lowStock] = await Promise.all([
    supabase.from('sales').select('total_amount, currency, exchange_rate').eq('sale_date', today),
    supabase.from('sales').select('total_amount, currency, exchange_rate').gte('sale_date', monthStart),
    supabase.from('customers').select('balance_owed').gt('balance_owed', 0),
    supabase.from('suppliers').select('balance_owed').gt('balance_owed', 0),
    supabase.from('inventory').select('quantity, min_quantity').filter('quantity', 'lte', 'min_quantity'),
  ])

  const sumUSD = (rows: { total_amount: number; currency: string; exchange_rate: number }[]) =>
    rows.reduce((s, r) => s + (r.currency === 'USD' ? r.total_amount : r.total_amount / r.exchange_rate), 0)

  return {
    today_sales_usd: sumUSD(todaySales.data ?? []),
    month_sales_usd: sumUSD(monthSales.data ?? []),
    customer_debt_usd: (customerDebt.data ?? []).reduce((s, r) => s + r.balance_owed, 0),
    supplier_debt_usd: (supplierDebt.data ?? []).reduce((s, r) => s + r.balance_owed, 0),
    low_stock_count: (lowStock.data ?? []).length,
  }
}

export async function fetchSalesReport(from?: string, to?: string) {
  let query = supabase
    .from('sales')
    .select('*, customers(name), sale_items(quantity, unit_price, total, products(name))')
    .order('sale_date', { ascending: false })
  if (from) query = query.gte('sale_date', from)
  if (to) query = query.lte('sale_date', to)
  const { data, error } = await query
  if (error) throw error
  return data ?? []
}

export async function fetchDebtsReport() {
  const [customers, suppliers] = await Promise.all([
    supabase.from('customers').select('*').gt('balance_owed', 0).order('balance_owed', { ascending: false }),
    supabase.from('suppliers').select('*').gt('balance_owed', 0).order('balance_owed', { ascending: false }),
  ])
  return { customers: customers.data ?? [], suppliers: suppliers.data ?? [] }
}

export interface Expense {
  id: string
  category: string
  description: string
  amount: number
  currency: 'USD' | 'IQD'
  exchange_rate: number
  expense_date: string
  note?: string
  created_at: string
}

export async function fetchExpenses(from?: string, to?: string) {
  let query = supabase
    .from('expenses')
    .select('*')
    .order('expense_date', { ascending: false })
  if (from) query = query.gte('expense_date', from)
  if (to) query = query.lte('expense_date', to)
  const { data, error } = await query
  if (error) throw error
  return (data ?? []) as Expense[]
}

export async function createExpense(body: {
  category: string
  description: string
  amount: number
  currency: 'USD' | 'IQD'
  exchange_rate: number
  expense_date: string
  note?: string
}) {
  const { data, error } = await supabase.from('expenses').insert(body).select().single()
  if (error) throw error
  return data as Expense
}

export async function deleteExpense(id: string) {
  const { error } = await supabase.from('expenses').delete().eq('id', id)
  if (error) throw error
}

export async function fetchFinancialSummary() {
  const IQD_RATE = 1310
  const [sales, saleItems, expenses, inventory, customers, suppliers] = await Promise.all([
    supabase.from('sales').select('total_amount, currency, exchange_rate'),
    supabase.from('sale_items').select('quantity, products(cost_price_usd, price_currency)'),
    supabase.from('expenses').select('amount, currency, exchange_rate'),
    supabase.from('inventory').select('quantity, products(cost_price_usd, price_currency)'),
    supabase.from('customers').select('balance_owed').gt('balance_owed', 0),
    supabase.from('suppliers').select('balance_owed, currency').gt('balance_owed', 0),
  ])

  const toUSD = (amount: number, currency: string, rate: number) =>
    currency === 'USD' ? amount : amount / rate

  const totalRevenue = (sales.data ?? []).reduce((s, r) =>
    s + toUSD(r.total_amount, r.currency, r.exchange_rate), 0)

  const costOfGoods = (saleItems.data ?? []).reduce((s, si) => {
    const p = si.products as { cost_price_usd?: number; price_currency?: string } | null
    const cost = p?.price_currency === 'IQD'
      ? (p?.cost_price_usd ?? 0) / IQD_RATE
      : (p?.cost_price_usd ?? 0)
    return s + si.quantity * cost
  }, 0)

  const totalExpenses = (expenses.data ?? []).reduce((s, e) =>
    s + toUSD(e.amount, e.currency, e.exchange_rate), 0)

  const inventoryValue = (inventory.data ?? []).reduce((s, i) => {
    const p = i.products as { cost_price_usd?: number; price_currency?: string } | null
    const cost = p?.price_currency === 'IQD'
      ? (p?.cost_price_usd ?? 0) / IQD_RATE
      : (p?.cost_price_usd ?? 0)
    return s + i.quantity * cost
  }, 0)

  const customerDebt = (customers.data ?? []).reduce((s, r) => s + r.balance_owed, 0)
  const supplierDebt = (suppliers.data ?? []).reduce((s, r) =>
    s + toUSD(r.balance_owed, r.currency, IQD_RATE), 0)

  return {
    total_revenue_usd: totalRevenue,
    cost_of_goods_usd: costOfGoods,
    total_expenses_usd: totalExpenses,
    inventory_value_usd: inventoryValue,
    customer_debt_usd: customerDebt,
    supplier_debt_usd: supplierDebt,
    net_profit_usd: totalRevenue - costOfGoods - totalExpenses,
  }
}

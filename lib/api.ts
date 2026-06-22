import { supabase } from './supabase'

const FUNCTIONS_URL = process.env.NEXT_PUBLIC_SUPABASE_URL + '/functions/v1'

async function callEdgeFn(path: string, options: RequestInit = {}) {
  const { data: { session } } = await supabase.auth.getSession()
  const res = await fetch(`${FUNCTIONS_URL}${path}`, {
    ...options,
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${session?.access_token}`,
      ...(options.headers as Record<string, string> ?? {}),
    },
  })
  if (!res.ok) {
    const err = await res.json().catch(() => ({ error: res.statusText }))
    throw new Error(err.error ?? 'خطأ في الاتصال')
  }
  return res.json()
}

export async function listOrganizations() {
  return callEdgeFn('/manage-orgs')
}

export async function createOrganization(body: { name: string; adminEmail: string; adminPassword: string; adminName: string }) {
  return callEdgeFn('/manage-orgs', { method: 'POST', body: JSON.stringify(body) })
}

export async function toggleOrganization(org_id: string, active: boolean) {
  return callEdgeFn('/manage-orgs', { method: 'PATCH', body: JSON.stringify({ org_id, active }) })
}

export async function listUsers() {
  return callEdgeFn('/manage-users')
}

export async function createUser(body: { email: string; password: string; name: string; role: string }) {
  return callEdgeFn('/manage-users', { method: 'POST', body: JSON.stringify(body) })
}

export async function deleteUser(id: string) {
  return callEdgeFn('/manage-users', { method: 'DELETE', body: JSON.stringify({ id }) })
}

export async function updateUserRole(id: string, role: string, name?: string) {
  return callEdgeFn('/manage-users', { method: 'PATCH', body: JSON.stringify({ id, role, name }) })
}

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
  const { data, error } = await supabase.from('categories').select('*').is('deleted_at', null).order('name')
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
    .is('deleted_at', null)
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

export async function deleteCustomer(id: string) {
  const { error } = await supabase.from('customers').update({ deleted_at: new Date().toISOString() }).eq('id', id)
  if (error) throw error
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

  const amtUSD = body.currency === 'USD' ? body.amount : body.amount / body.exchange_rate
  const { data: cust } = await supabase.from('customers').select('balance_owed').eq('id', body.customer_id).single()
  await supabase.from('customers').update({ balance_owed: Math.max(0, (cust?.balance_owed ?? 0) - amtUSD) }).eq('id', body.customer_id)

  if (body.sale_id) {
    const { data: sale } = await supabase.from('sales').select('total_amount, amount_paid, currency, exchange_rate').eq('id', body.sale_id).single()
    if (sale) {
      let amtInSaleCur = body.amount
      if (body.currency !== sale.currency) {
        const rate = body.exchange_rate || sale.exchange_rate || 1310
        amtInSaleCur = body.currency === 'USD'
          ? body.amount * rate
          : body.amount / rate
      }
      const newPaid = sale.amount_paid + amtInSaleCur
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
    .is('deleted_at', null)
    .order('created_at', { ascending: false })
  if (error) throw error
  return data ?? []
}

export async function deleteSale(id: string) {
  const now = new Date().toISOString()

  const [{ data: sale }, { data: saleItems }] = await Promise.all([
    supabase.from('sales').select('customer_id, total_amount, amount_paid, currency, exchange_rate, status').eq('id', id).single(),
    supabase.from('sale_items').select('product_id, quantity').eq('sale_id', id).is('deleted_at', null),
  ])

  // Restore inventory quantities
  if (saleItems && saleItems.length > 0) {
    for (const item of saleItems) {
      const { data: inv } = await supabase.from('inventory').select('quantity').eq('product_id', item.product_id).single()
      await supabase.from('inventory').update({ quantity: (inv?.quantity ?? 0) + item.quantity, updated_at: now }).eq('product_id', item.product_id)
      await supabase.from('inventory_transactions').insert({
        product_id: item.product_id,
        type: 'إدخال',
        quantity: item.quantity,
        reference_type: 'إلغاء بيع',
        reference_id: id,
      })
    }
  }

  // Deduct outstanding debt from customer balance (stored in USD)
  if (sale?.customer_id && sale.status !== 'مدفوع') {
    const outstanding = sale.total_amount - sale.amount_paid
    const outstandingUSD = sale.currency === 'USD' ? outstanding : outstanding / (sale.exchange_rate || 1310)
    const { data: cust } = await supabase.from('customers').select('balance_owed').eq('id', sale.customer_id).single()
    await supabase.from('customers').update({ balance_owed: Math.max(0, (cust?.balance_owed ?? 0) - outstandingUSD) }).eq('id', sale.customer_id)
  }

  await Promise.all([
    supabase.from('sales').update({ deleted_at: now }).eq('id', id),
    supabase.from('sale_items').update({ deleted_at: now }).eq('sale_id', id),
  ])
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
    const remainingUSD = saleData.currency === 'USD' ? remaining : remaining / (saleData.exchange_rate || 1310)
    const { data: cust } = await supabase.from('customers').select('balance_owed').eq('id', saleData.customer_id).single()
    await supabase.from('customers').update({ balance_owed: (cust?.balance_owed ?? 0) + remainingUSD }).eq('id', saleData.customer_id)
  }

  return sale
}

export async function fetchProducts() {
  const { data, error } = await supabase
    .from('products')
    .select('*, categories(name)')
    .is('deleted_at', null)
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
  initial_quantity?: number
}) {
  const { initial_quantity, ...productBody } = body
  const { data, error } = await supabase.from('products').insert(productBody).select().single()
  if (error) throw error
  if (data && (initial_quantity ?? 0) > 0) {
    await supabase.from('inventory').upsert(
      { product_id: data.id, quantity: initial_quantity, updated_at: new Date().toISOString() },
      { onConflict: 'product_id' }
    )
  }
  return data
}

export async function updateProduct(id: string, body: object) {
  const { data, error } = await supabase.from('products').update(body).eq('id', id).select().single()
  if (error) throw error
  return data
}

export async function deleteProduct(id: string) {
  const { error } = await supabase.from('products').update({ deleted_at: new Date().toISOString() }).eq('id', id)
  if (error) throw error
}

export async function fetchSuppliers() {
  const { data, error } = await supabase
    .from('suppliers')
    .select('*')
    .is('deleted_at', null)
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

export async function deleteSupplier(id: string) {
  const { error } = await supabase.from('suppliers').update({ deleted_at: new Date().toISOString() }).eq('id', id)
  if (error) throw error
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
    const { data: sup } = await supabase.from('suppliers').select('balance_owed, currency').eq('id', orderData.supplier_id).single()
    const supCur = sup?.currency ?? 'USD'
    let remainingInSupCur = remaining
    if (orderData.currency !== supCur) {
      const rate = orderData.exchange_rate || 1310
      remainingInSupCur = orderData.currency === 'USD' ? remaining * rate : remaining / rate
    }
    await supabase.from('suppliers').update({ balance_owed: (sup?.balance_owed ?? 0) + remainingInSupCur }).eq('id', orderData.supplier_id)
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

  const { data: sup } = await supabase.from('suppliers').select('balance_owed, currency').eq('id', body.supplier_id).single()
  const supCur = sup?.currency ?? 'USD'
  let amtInSupCur = body.amount
  if (body.currency !== supCur) {
    const rate = body.exchange_rate || 1310
    amtInSupCur = body.currency === 'USD' ? body.amount * rate : body.amount / rate
  }
  await supabase.from('suppliers').update({ balance_owed: Math.max(0, (sup?.balance_owed ?? 0) - amtInSupCur) }).eq('id', body.supplier_id)

  if (body.purchase_order_id) {
    const { data: po } = await supabase.from('purchase_orders').select('total_amount, amount_paid, currency, exchange_rate').eq('id', body.purchase_order_id).single()
    if (po) {
      let amtInPoCur = body.amount
      if (body.currency !== po.currency) {
        const rate = body.exchange_rate || po.exchange_rate || 1310
        amtInPoCur = body.currency === 'USD' ? body.amount * rate : body.amount / rate
      }
      const newPaid = po.amount_paid + amtInPoCur
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
    .is('deleted_at', null)
    .order('updated_at', { ascending: false })
  if (error) throw error
  return data ?? []
}

export async function deleteInventoryItem(id: string) {
  const { error } = await supabase.from('inventory').update({ deleted_at: new Date().toISOString() }).eq('id', id)
  if (error) throw error
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
  const IQD = 1310

  const [todaySales, monthSales, customerDebt, supplierDebt, allInventory] = await Promise.all([
    supabase.from('sales').select('total_amount, currency, exchange_rate').is('deleted_at', null).eq('sale_date', today),
    supabase.from('sales').select('total_amount, currency, exchange_rate').is('deleted_at', null).gte('sale_date', monthStart),
    supabase.from('customers').select('balance_owed').is('deleted_at', null).gt('balance_owed', 0),
    supabase.from('suppliers').select('balance_owed, currency').is('deleted_at', null).gt('balance_owed', 0),
    supabase.from('inventory').select('quantity, min_quantity').is('deleted_at', null),
  ])

  const sumUSD = (rows: { total_amount: number; currency: string; exchange_rate: number }[]) =>
    rows.reduce((s, r) => s + (r.currency === 'USD' ? r.total_amount : r.total_amount / r.exchange_rate), 0)

  return {
    today_sales_usd: sumUSD(todaySales.data ?? []),
    month_sales_usd: sumUSD(monthSales.data ?? []),
    customer_debt_usd: (customerDebt.data ?? []).reduce((s, r) => s + r.balance_owed, 0),
    supplier_debt_usd: (supplierDebt.data ?? []).reduce((s, r) =>
      s + (r.currency === 'IQD' ? r.balance_owed / IQD : r.balance_owed), 0),
    low_stock_count: (allInventory.data ?? []).filter(r => r.quantity <= r.min_quantity).length,
  }
}

export async function fetchSalesReport(from?: string, to?: string) {
  let query = supabase
    .from('sales')
    .select('*, customers(name), sale_items(quantity, unit_price, total, products(name))')
    .is('deleted_at', null)
    .order('sale_date', { ascending: false })
  if (from) query = query.gte('sale_date', from)
  if (to) query = query.lte('sale_date', to)
  const { data, error } = await query
  if (error) throw error
  return data ?? []
}

export async function fetchDebtsReport() {
  const [customers, suppliers] = await Promise.all([
    supabase.from('customers').select('*').is('deleted_at', null).gt('balance_owed', 0).order('balance_owed', { ascending: false }),
    supabase.from('suppliers').select('*').is('deleted_at', null).gt('balance_owed', 0).order('balance_owed', { ascending: false }),
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
    .is('deleted_at', null)
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
  const { error } = await supabase.from('expenses').update({ deleted_at: new Date().toISOString() }).eq('id', id)
  if (error) throw error
}

export async function fetchNotifications(): Promise<{
  low_stock: { quantity: number; min_quantity: number; products: { name: string } | null }[]
  upcoming_installments: { id: string; due_date: string; amount: number; sales: { currency: string; exchange_rate: number; customers: { name: string; phone: string | null } | null } | null }[]
}> {
  const nextWeek = new Date(Date.now() + 7 * 24 * 60 * 60 * 1000).toISOString().split('T')[0]
  const today = new Date().toISOString().split('T')[0]

  const [{ data: invData }, { data: installData }] = await Promise.all([
    supabase
      .from('inventory')
      .select('quantity, min_quantity, products(name)')
      .is('deleted_at', null),
    supabase
      .from('installments')
      .select('id, due_date, amount, sales!inner(currency, exchange_rate, deleted_at, customers(name, phone))')
      .eq('status', 'معلق')
      .is('sales.deleted_at', null)
      .gte('due_date', today)
      .lte('due_date', nextWeek)
      .order('due_date')
      .limit(20),
  ])

  return {
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    low_stock: ((invData ?? []) as any[])
      .filter((i: { quantity: number; min_quantity: number }) => i.quantity <= i.min_quantity)
      .map((i: { quantity: number; min_quantity: number; products: { name: string } | { name: string }[] | null }) => ({
        quantity: i.quantity,
        min_quantity: i.min_quantity,
        products: Array.isArray(i.products) ? (i.products[0] ?? null) : i.products,
      })),
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    upcoming_installments: ((installData ?? []) as any[]).map((i: {
      id: string; due_date: string; amount: number;
      sales: { currency: string; exchange_rate: number; customers: { name: string; phone: string | null } | null } | { currency: string; exchange_rate: number; customers: { name: string; phone: string | null } | null }[] | null
    }) => ({
      id: i.id,
      due_date: i.due_date,
      amount: i.amount,
      sales: Array.isArray(i.sales) ? (i.sales[0] ?? null) : i.sales,
    })),
  }
}

export async function fetchFinancialSummary() {
  const IQD_RATE = 1310
  const [sales, saleItems, expenses, inventory, customers, suppliers] = await Promise.all([
    supabase.from('sales').select('total_amount, currency, exchange_rate').is('deleted_at', null),
    supabase.from('sale_items').select('quantity, products(cost_price_usd, price_currency)').is('deleted_at', null),
    supabase.from('expenses').select('amount, currency, exchange_rate').is('deleted_at', null),
    supabase.from('inventory').select('quantity, products(cost_price_usd, price_currency)').is('deleted_at', null),
    supabase.from('customers').select('balance_owed').is('deleted_at', null).gt('balance_owed', 0),
    supabase.from('suppliers').select('balance_owed, currency').is('deleted_at', null).gt('balance_owed', 0),
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

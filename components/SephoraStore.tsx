'use client'

import { useState, useEffect } from 'react'

// ─── CONFIG ───────────────────────────────────────────────────────────────────
const CONFIG = {
  whatsapp: '9647701234567', // ← غيّر هذا لرقمك بصيغة دولية
  iqdRate: 1470,             // سعر صرف الدولار بالدينار
  marginUsd: 15,             // هامش/شحن بالدولار لكل منتج
  aedToUsd: 3.6725,          // سعر صرف الدرهم
  roundTo: 250,              // تقريب السعر لأقرب 250 دينار
}

// ─── PRICING ──────────────────────────────────────────────────────────────────
function calcIQD(aed: number): number {
  const usd = aed / CONFIG.aedToUsd
  const withMargin = usd + CONFIG.marginUsd
  const iqd = withMargin * CONFIG.iqdRate
  return Math.round(iqd / CONFIG.roundTo) * CONFIG.roundTo
}

// ─── TYPES ────────────────────────────────────────────────────────────────────
type Lang = 'ar' | 'en' | 'ku'
type Category = 'perfumes' | 'face' | 'lips' | 'cheeks' | 'skincare'

interface Product {
  id: string
  name: Record<Lang, string>
  brand: string
  category: Category
  aed: number
}

interface CartItem {
  product: Product
  qty: number
}

// ─── PRODUCTS ─────────────────────────────────────────────────────────────────
const PRODUCTS: Product[] = [
  {
    id: 'kayali-vanilla-28',
    name: { ar: 'كيالي فانيلا 28 — 50مل', en: 'KAYALI Vanilla 28 — 50ml', ku: 'کایالی وانیلا 28 — 50مل' },
    brand: 'KAYALI', category: 'perfumes', aed: 420,
  },
  {
    id: 'kayali-elixir-11',
    name: { ar: 'كيالي إكسير 11 — 50مل', en: 'KAYALI Elixir 11 — 50ml', ku: 'کایالی ئیلیکسیر 11 — 50مل' },
    brand: 'KAYALI', category: 'perfumes', aed: 385,
  },
  {
    id: 'kayali-white-flower-57',
    name: { ar: 'كيالي ديجافو وايت فلاور 57 — 50مل', en: 'KAYALI Déjà Vu White Flower 57 — 50ml', ku: 'کایالی دێژافو وایت فلاور 57 — 50مل' },
    brand: 'KAYALI', category: 'perfumes', aed: 395,
  },
  {
    id: 'ct-pillow-talk-lipstick',
    name: { ar: 'شارلوت تيلبري بيلو توك — أحمر شفاه', en: 'Charlotte Tilbury Pillow Talk Lipstick', ku: 'شارلۆت تیلبەری پیلۆ تاک ڕووژ' },
    brand: 'Charlotte Tilbury', category: 'lips', aed: 145,
  },
  {
    id: 'ct-pillow-talk-eyeshadow',
    name: { ar: 'شارلوت تيلبري بيلو توك — باليت ظلال', en: 'Charlotte Tilbury Pillow Talk Eye Shadow Palette', ku: 'شارلۆت تیلبەری پیلۆ تاک — سێبەری چاو' },
    brand: 'Charlotte Tilbury', category: 'face', aed: 175,
  },
  {
    id: 'ct-pillow-talk-blush',
    name: { ar: 'شارلوت تيلبري بيلو توك — بودرة خدود', en: 'Charlotte Tilbury Pillow Talk Blush', ku: 'شارلۆت تیلبەری پیلۆ تاک بلەش' },
    brand: 'Charlotte Tilbury', category: 'cheeks', aed: 155,
  },
  {
    id: 'fenty-gloss-bomb',
    name: { ar: 'فينتي بيوتي — غلوس بوم', en: 'Fenty Beauty Gloss Bomb', ku: 'فینتی بیوتی گلۆس بۆم' },
    brand: 'Fenty Beauty', category: 'lips', aed: 95,
  },
  {
    id: 'fenty-pro-filtr',
    name: { ar: 'فينتي بيوتي — كريم أساس برو فيلتر', en: "Fenty Beauty Pro Filt'r Foundation", ku: "فینتی بیوتی پڕۆ فیلتر فاوندەیشن" },
    brand: 'Fenty Beauty', category: 'face', aed: 155,
  },
  {
    id: 'fenty-match-stix',
    name: { ar: 'فينتي بيوتي — ماتش ستيكس', en: 'Fenty Beauty Match Stix', ku: 'فینتی بیوتی ماچ ستیکس' },
    brand: 'Fenty Beauty', category: 'cheeks', aed: 125,
  },
  {
    id: 'rare-beauty-blush',
    name: { ar: 'ريير بيوتي — سوفت بينش خدود', en: 'Rare Beauty Soft Pinch Blush', ku: 'ریر بیوتی سۆفت پینچ بلەش' },
    brand: 'Rare Beauty', category: 'cheeks', aed: 110,
  },
  {
    id: 'rare-beauty-liner',
    name: { ar: 'ريير بيوتي — بيرفيكت ستروكس كحل', en: 'Rare Beauty Perfect Strokes Liner', ku: 'ریر بیوتی پێرفیکت ستڕۆکس لاینەر' },
    brand: 'Rare Beauty', category: 'face', aed: 85,
  },
  {
    id: 'hourglass-ambient-powder',
    name: { ar: 'هاورغلاس — أمبيانت لايتينج بودر', en: 'Hourglass Ambient Lighting Powder', ku: 'هاورگلاس ئامبیەنت لایتینگ پاودەر' },
    brand: 'Hourglass', category: 'face', aed: 220,
  },
  {
    id: 'hourglass-confession-lipstick',
    name: { ar: 'هاورغلاس — كونفيشن أحمر شفاه', en: 'Hourglass Confession Lipstick', ku: 'هاورگلاس کنفیشن ڕووژ' },
    brand: 'Hourglass', category: 'lips', aed: 165,
  },
]

// ─── TRANSLATIONS ─────────────────────────────────────────────────────────────
const T = {
  ar: {
    tagline: 'منتجات تجميل أصلية من الإمارات',
    heroSub: 'أجود ماركات العالم — توصيل لجميع محافظات كردستان والعراق',
    allCats: 'الكل',
    cats: { perfumes: 'عطور', face: 'وجه', lips: 'شفاه', cheeks: 'خدود', skincare: 'عناية' },
    addToCart: 'أضف للسلة',
    inCart: (n: number) => `✓ في السلة (${n})`,
    cart: 'السلة',
    total: 'المجموع',
    checkout: 'اطلب عبر واتساب',
    emptyCart: 'السلة فارغة',
    orderHeader: '🛍️ طلب جديد من سيفورا كردستان',
    orderLine: (name: string, qty: number, price: number) =>
      `• ${name} × ${qty} = ${price.toLocaleString()} د.ع`,
    orderTotal: (t: number) => `\n💰 المجموع: ${t.toLocaleString()} د.ع\n\nالدفع: كاش عند الاستلام`,
    dir: 'rtl' as const,
  },
  en: {
    tagline: 'Original Beauty Products from UAE',
    heroSub: 'Top global brands — delivered across Kurdistan & Iraq',
    allCats: 'All',
    cats: { perfumes: 'Perfumes', face: 'Face', lips: 'Lips', cheeks: 'Cheeks', skincare: 'Skincare' },
    addToCart: 'Add to Cart',
    inCart: (n: number) => `✓ In Cart (${n})`,
    cart: 'Cart',
    total: 'Total',
    checkout: 'Order via WhatsApp',
    emptyCart: 'Your cart is empty',
    orderHeader: '🛍️ New Order — Sephora Kurdistan',
    orderLine: (name: string, qty: number, price: number) =>
      `• ${name} × ${qty} = ${price.toLocaleString()} IQD`,
    orderTotal: (t: number) => `\n💰 Total: ${t.toLocaleString()} IQD\n\nPayment: Cash on delivery`,
    dir: 'ltr' as const,
  },
  ku: {
    tagline: 'بەرهەمە ئەسڵییەکانی جوانکاری لە ئیمارات',
    heroSub: 'باشترین براندەکانی جیهان — گەیاندن بۆ هەموو پارێزگاکانی کوردستان و عێراق',
    allCats: 'هەمووی',
    cats: { perfumes: 'بۆن', face: 'ڕووخسار', lips: 'لێو', cheeks: 'گوێچکە', skincare: 'چارەسەری پێست' },
    addToCart: 'زیادبکە بۆ سەبەتە',
    inCart: (n: number) => `✓ لە سەبەتەدایە (${n})`,
    cart: 'سەبەتە',
    total: 'کۆی گشتی',
    checkout: 'داواکاری لە ڕێگای واتساپ',
    emptyCart: 'سەبەتەکەت بەتاڵە',
    orderHeader: '🛍️ داواکاری نوێ — سیفۆرا کوردستان',
    orderLine: (name: string, qty: number, price: number) =>
      `• ${name} × ${qty} = ${price.toLocaleString()} د.ع`,
    orderTotal: (t: number) => `\n💰 کۆی گشتی: ${t.toLocaleString()} د.ع\n\nپارەدان: کاش لە کاتی وەرگرتن`,
    dir: 'rtl' as const,
  },
}

const CATEGORY_ICON: Record<string, string> = {
  perfumes: '🌸', face: '✨', lips: '💋', cheeks: '🌷', skincare: '🧴',
}

const STORE_NAME: Record<Lang, string> = {
  ar: 'سيفورا كردستان',
  en: 'Sephora Kurdistan',
  ku: 'سیفۆرا کوردستان',
}

const CATEGORIES: Array<'all' | Category> = ['all', 'perfumes', 'face', 'lips', 'cheeks', 'skincare']

// ─── STYLES ───────────────────────────────────────────────────────────────────
const GOLD = '#C9A84C'
const GOLD_DIM = '#C9A84C44'
const BG = '#0a0a0a'
const SURFACE = '#111111'
const SURFACE2 = '#161616'
const BORDER = '#222222'

// ─── COMPONENT ────────────────────────────────────────────────────────────────
export default function SephoraStore() {
  const [lang, setLang] = useState<Lang>('ar')
  const [activeCategory, setActiveCategory] = useState<'all' | Category>('all')
  const [cart, setCart] = useState<CartItem[]>([])
  const [cartOpen, setCartOpen] = useState(false)

  const t = T[lang]

  useEffect(() => {
    document.documentElement.lang = lang
    document.documentElement.dir = t.dir
  }, [lang, t.dir])

  const addToCart = (product: Product) => {
    setCart(prev => {
      const existing = prev.find(i => i.product.id === product.id)
      if (existing) return prev.map(i => i.product.id === product.id ? { ...i, qty: i.qty + 1 } : i)
      return [...prev, { product, qty: 1 }]
    })
  }

  const updateQty = (id: string, delta: number) => {
    setCart(prev =>
      prev.map(i => i.product.id === id ? { ...i, qty: i.qty + delta } : i)
          .filter(i => i.qty > 0)
    )
  }

  const removeItem = (id: string) => setCart(prev => prev.filter(i => i.product.id !== id))

  const cartTotal = cart.reduce((sum, i) => sum + calcIQD(i.product.aed) * i.qty, 0)
  const cartCount = cart.reduce((sum, i) => sum + i.qty, 0)

  const handleCheckout = () => {
    if (!cart.length) return
    const lines = cart.map(i => t.orderLine(i.product.name[lang], i.qty, calcIQD(i.product.aed) * i.qty))
    const msg = `${t.orderHeader}\n\n${lines.join('\n')}${t.orderTotal(cartTotal)}`
    window.open(`https://wa.me/${CONFIG.whatsapp}?text=${encodeURIComponent(msg)}`, '_blank')
  }

  const filtered = activeCategory === 'all' ? PRODUCTS : PRODUCTS.filter(p => p.category === activeCategory)

  return (
    <div style={{ background: BG, minHeight: '100vh', color: '#fff', direction: t.dir }}>

      {/* ── HEADER ── */}
      <header style={{ background: '#000', borderBottom: `1px solid ${GOLD_DIM}`, position: 'sticky', top: 0, zIndex: 50 }}>
        <div style={{ maxWidth: 1200, margin: '0 auto', padding: '0 1.25rem', display: 'flex', alignItems: 'center', justifyContent: 'space-between', height: 64 }}>

          {/* Logo */}
          <div>
            <div style={{ fontSize: '1.15rem', fontWeight: 800, color: GOLD, letterSpacing: '0.06em' }}>
              {STORE_NAME[lang]}
            </div>
            <div style={{ fontSize: '0.6rem', color: '#666', letterSpacing: '0.12em', textTransform: 'uppercase', marginTop: 1 }}>
              {t.tagline}
            </div>
          </div>

          {/* Controls */}
          <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
            {/* Language tabs */}
            <div style={{ display: 'flex', background: '#0f0f0f', borderRadius: 8, border: `1px solid ${BORDER}`, overflow: 'hidden' }}>
              {(['ar', 'en', 'ku'] as Lang[]).map(l => (
                <button key={l} onClick={() => setLang(l)} style={{
                  padding: '5px 11px', fontSize: '0.72rem', fontWeight: lang === l ? 700 : 400,
                  background: lang === l ? GOLD : 'transparent',
                  color: lang === l ? '#000' : '#666',
                  border: 'none', cursor: 'pointer', transition: 'all 0.15s',
                  fontFamily: 'inherit',
                }}>
                  {l === 'ar' ? 'عربي' : l === 'en' ? 'EN' : 'کوردی'}
                </button>
              ))}
            </div>

            {/* Cart */}
            <button onClick={() => setCartOpen(true)} style={{
              display: 'flex', alignItems: 'center', gap: 6,
              background: 'transparent', border: `1px solid ${GOLD}`,
              borderRadius: 8, padding: '6px 13px',
              color: GOLD, cursor: 'pointer', fontSize: '0.82rem', fontFamily: 'inherit',
            }}>
              🛍️ {t.cart}
              {cartCount > 0 && (
                <span style={{
                  background: GOLD, color: '#000', borderRadius: '50%',
                  width: 18, height: 18, display: 'flex', alignItems: 'center', justifyContent: 'center',
                  fontSize: '0.65rem', fontWeight: 800,
                }}>{cartCount}</span>
              )}
            </button>
          </div>
        </div>
      </header>

      {/* ── HERO ── */}
      <div style={{
        background: 'linear-gradient(160deg, #0a0a0a 0%, #130e03 50%, #0a0a0a 100%)',
        padding: '3.5rem 1.25rem 3rem',
        textAlign: 'center',
        borderBottom: `1px solid ${GOLD_DIM}`,
        position: 'relative', overflow: 'hidden',
      }}>
        <div style={{
          position: 'absolute', inset: 0, pointerEvents: 'none',
          background: 'radial-gradient(ellipse 60% 50% at 50% 100%, #C9A84C18 0%, transparent 70%)',
        }} />
        <div style={{ position: 'relative', maxWidth: 560, margin: '0 auto' }}>
          <div style={{ fontSize: '0.65rem', letterSpacing: '0.35em', color: GOLD, textTransform: 'uppercase', marginBottom: '1.25rem' }}>
            ✦ &nbsp; SEPHORA KURDISTAN &nbsp; ✦
          </div>
          <h1 style={{ fontSize: 'clamp(1.6rem, 4.5vw, 2.6rem)', fontWeight: 900, margin: '0 0 1rem', lineHeight: 1.25, color: '#fff' }}>
            {t.tagline}
          </h1>
          <p style={{ color: '#888', fontSize: '0.95rem', lineHeight: 1.7, margin: 0 }}>
            {t.heroSub}
          </p>
          <div style={{ display: 'flex', alignItems: 'center', gap: '1rem', margin: '1.75rem auto 0', maxWidth: 280 }}>
            <div style={{ flex: 1, height: 1, background: `linear-gradient(to ${t.dir === 'rtl' ? 'left' : 'right'}, transparent, ${GOLD})` }} />
            <span style={{ color: GOLD }}>✦</span>
            <div style={{ flex: 1, height: 1, background: `linear-gradient(to ${t.dir === 'rtl' ? 'right' : 'left'}, transparent, ${GOLD})` }} />
          </div>
        </div>
      </div>

      {/* ── CATEGORY FILTER ── */}
      <div style={{ background: '#050505', padding: '1.25rem', borderBottom: `1px solid ${BORDER}` }}>
        <div style={{ maxWidth: 1200, margin: '0 auto', display: 'flex', gap: '0.6rem', flexWrap: 'wrap', justifyContent: 'center' }}>
          {CATEGORIES.map(cat => (
            <button key={cat} onClick={() => setActiveCategory(cat)} style={{
              padding: '7px 18px', borderRadius: 100,
              border: activeCategory === cat ? `1px solid ${GOLD}` : `1px solid ${BORDER}`,
              background: activeCategory === cat ? GOLD : 'transparent',
              color: activeCategory === cat ? '#000' : '#777',
              cursor: 'pointer', fontWeight: activeCategory === cat ? 700 : 400,
              fontSize: '0.82rem', transition: 'all 0.15s', fontFamily: 'inherit',
            }}>
              {cat === 'all' ? t.allCats : `${CATEGORY_ICON[cat]} ${t.cats[cat as Category]}`}
            </button>
          ))}
        </div>
      </div>

      {/* ── PRODUCTS GRID ── */}
      <main style={{ maxWidth: 1200, margin: '0 auto', padding: '2rem 1.25rem 4rem' }}>
        <div style={{
          display: 'grid',
          gridTemplateColumns: 'repeat(auto-fill, minmax(220px, 1fr))',
          gap: '1.25rem',
        }}>
          {filtered.map(product => {
            const iqd = calcIQD(product.aed)
            const inCart = cart.find(i => i.product.id === product.id)
            return (
              <ProductCard
                key={product.id}
                product={product}
                iqd={iqd}
                lang={lang}
                inCart={inCart?.qty ?? 0}
                addToCart={addToCart}
                addToCartLabel={inCart ? t.inCart(inCart.qty) : t.addToCart}
              />
            )
          })}
        </div>
      </main>

      {/* ── CART DRAWER ── */}
      {cartOpen && (
        <>
          <div onClick={() => setCartOpen(false)} style={{
            position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.72)',
            zIndex: 100, backdropFilter: 'blur(3px)',
          }} />
          <div style={{
            position: 'fixed', top: 0, bottom: 0,
            [t.dir === 'rtl' ? 'left' : 'right']: 0,
            width: 'min(390px, 96vw)',
            background: '#0f0f0f',
            [t.dir === 'rtl' ? 'borderRight' : 'borderLeft']: `1px solid ${GOLD_DIM}`,
            zIndex: 101, display: 'flex', flexDirection: 'column',
          }}>
            {/* Cart header */}
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '1.1rem 1.25rem', borderBottom: `1px solid ${BORDER}` }}>
              <h2 style={{ margin: 0, color: GOLD, fontWeight: 800, fontSize: '1rem' }}>🛍️ {t.cart}</h2>
              <button onClick={() => setCartOpen(false)} style={{
                background: 'transparent', border: `1px solid ${BORDER}`,
                borderRadius: 6, width: 30, height: 30,
                color: '#666', cursor: 'pointer', fontSize: '0.9rem',
                display: 'flex', alignItems: 'center', justifyContent: 'center',
              }}>✕</button>
            </div>

            {/* Cart items */}
            <div style={{ flex: 1, overflowY: 'auto', padding: '1rem 1.25rem' }}>
              {cart.length === 0 ? (
                <div style={{ textAlign: 'center', padding: '3rem 0', color: '#444' }}>
                  <div style={{ fontSize: '2.5rem', marginBottom: '0.75rem' }}>🛒</div>
                  <div>{t.emptyCart}</div>
                </div>
              ) : (
                <div style={{ display: 'flex', flexDirection: 'column', gap: '0.75rem' }}>
                  {cart.map(item => {
                    const price = calcIQD(item.product.aed)
                    return (
                      <div key={item.product.id} style={{ background: SURFACE2, borderRadius: 10, padding: '0.875rem', border: `1px solid ${BORDER}` }}>
                        <div style={{ display: 'flex', justifyContent: 'space-between', gap: '0.5rem', marginBottom: '0.6rem' }}>
                          <div style={{ fontSize: '0.83rem', fontWeight: 600, lineHeight: 1.35, flex: 1 }}>
                            {item.product.name[lang]}
                          </div>
                          <button onClick={() => removeItem(item.product.id)} style={{
                            background: 'transparent', border: 'none', color: '#444',
                            cursor: 'pointer', fontSize: '0.8rem', flexShrink: 0, padding: 2,
                          }}>🗑️</button>
                        </div>
                        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                          <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                            <QtyBtn onClick={() => updateQty(item.product.id, -1)}>−</QtyBtn>
                            <span style={{ minWidth: 22, textAlign: 'center', fontWeight: 700, fontSize: '0.9rem' }}>{item.qty}</span>
                            <QtyBtn onClick={() => updateQty(item.product.id, 1)}>+</QtyBtn>
                          </div>
                          <div style={{ color: GOLD, fontWeight: 700, fontSize: '0.88rem' }}>
                            {(price * item.qty).toLocaleString()} <span style={{ fontSize: '0.62rem' }}>د.ع</span>
                          </div>
                        </div>
                      </div>
                    )
                  })}
                </div>
              )}
            </div>

            {/* Cart footer */}
            {cart.length > 0 && (
              <div style={{ padding: '1.1rem 1.25rem', borderTop: `1px solid ${BORDER}` }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '0.875rem' }}>
                  <span style={{ color: '#888', fontSize: '0.88rem' }}>{t.total}</span>
                  <span style={{ color: GOLD, fontWeight: 800, fontSize: '1.15rem' }}>
                    {cartTotal.toLocaleString()} <span style={{ fontSize: '0.68rem' }}>د.ع</span>
                  </span>
                </div>
                <button onClick={handleCheckout} style={{
                  width: '100%', background: 'linear-gradient(135deg, #25D366, #128C7E)',
                  border: 'none', borderRadius: 10, padding: '13px 0',
                  color: '#fff', fontSize: '0.95rem', fontWeight: 700,
                  cursor: 'pointer', fontFamily: 'inherit',
                  display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 8,
                }}>
                  <WhatsAppIcon />
                  {t.checkout}
                </button>
              </div>
            )}
          </div>
        </>
      )}

      {/* ── FOOTER ── */}
      <footer style={{ textAlign: 'center', padding: '2rem 1.25rem', borderTop: `1px solid ${GOLD_DIM}`, color: '#444', fontSize: '0.78rem' }}>
        <div style={{ color: GOLD, marginBottom: '0.4rem', letterSpacing: '0.25em', fontSize: '0.65rem' }}>
          ✦ &nbsp; SEPHORA KURDISTAN &nbsp; ✦
        </div>
        <div>Original beauty products from UAE — Cash on delivery</div>
      </footer>
    </div>
  )
}

// ─── SUB-COMPONENTS ───────────────────────────────────────────────────────────
function ProductCard({ product, iqd, lang, inCart, addToCart, addToCartLabel }: {
  product: Product
  iqd: number
  lang: Lang
  inCart: number
  addToCart: (p: Product) => void
  addToCartLabel: string
}) {
  const [hovered, setHovered] = useState(false)
  return (
    <div
      onMouseEnter={() => setHovered(true)}
      onMouseLeave={() => setHovered(false)}
      style={{
        background: SURFACE, borderRadius: 12, overflow: 'hidden',
        border: `1px solid ${hovered ? '#C9A84C66' : BORDER}`,
        transform: hovered ? 'translateY(-3px)' : 'none',
        transition: 'all 0.2s',
        boxShadow: hovered ? `0 8px 24px rgba(201,168,76,0.1)` : 'none',
      }}
    >
      {/* Image area */}
      <div style={{
        width: '100%', aspectRatio: '1',
        background: 'linear-gradient(135deg, #151005 0%, #1e1508 50%, #0f0d03 100%)',
        display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', gap: 6,
      }}>
        <div style={{ fontSize: '0.55rem', letterSpacing: '0.2em', color: `${GOLD}88`, textTransform: 'uppercase' }}>
          {product.brand}
        </div>
        <div style={{ fontSize: '2.8rem' }}>{CATEGORY_ICON[product.category]}</div>
        <div style={{ color: GOLD, fontSize: '0.55rem', letterSpacing: '0.2em', opacity: 0.7 }}>✦ ORIGINAL ✦</div>
      </div>

      {/* Info */}
      <div style={{ padding: '0.875rem' }}>
        <div style={{ fontSize: '0.58rem', color: '#555', textTransform: 'uppercase', letterSpacing: '0.1em', marginBottom: 3 }}>
          {product.brand}
        </div>
        <div style={{ fontSize: '0.85rem', fontWeight: 600, lineHeight: 1.4, minHeight: '2.4em', marginBottom: '0.75rem' }}>
          {product.name[lang]}
        </div>
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: '0.5rem', flexWrap: 'wrap' }}>
          <div>
            <div style={{ color: GOLD, fontWeight: 800, fontSize: '0.95rem' }}>
              {iqd.toLocaleString()} <span style={{ fontSize: '0.65rem', fontWeight: 400 }}>د.ع</span>
            </div>
            <div style={{ color: '#444', fontSize: '0.65rem' }}>{product.aed} AED</div>
          </div>
          <button onClick={() => addToCart(product)} style={{
            background: inCart > 0 ? GOLD : 'transparent',
            border: `1px solid ${GOLD}`,
            color: inCart > 0 ? '#000' : GOLD,
            borderRadius: 8, padding: '6px 12px',
            fontSize: '0.75rem', cursor: 'pointer', fontFamily: 'inherit',
            fontWeight: 700, transition: 'all 0.15s', whiteSpace: 'nowrap',
          }}>
            {addToCartLabel}
          </button>
        </div>
      </div>
    </div>
  )
}

function QtyBtn({ onClick, children }: { onClick: () => void; children: React.ReactNode }) {
  return (
    <button onClick={onClick} style={{
      width: 28, height: 28, background: '#1e1e1e',
      border: `1px solid ${BORDER}`, borderRadius: 6,
      color: '#fff', cursor: 'pointer', fontSize: '1rem',
      display: 'flex', alignItems: 'center', justifyContent: 'center',
    }}>
      {children}
    </button>
  )
}

function WhatsAppIcon() {
  return (
    <svg width="18" height="18" viewBox="0 0 24 24" fill="white">
      <path d="M17.472 14.382c-.297-.149-1.758-.867-2.03-.967-.273-.099-.471-.148-.67.15-.197.297-.767.966-.94 1.164-.173.199-.347.223-.644.075-.297-.15-1.255-.463-2.39-1.475-.883-.788-1.48-1.761-1.653-2.059-.173-.297-.018-.458.13-.606.134-.133.298-.347.446-.52.149-.174.198-.298.298-.497.099-.198.05-.371-.025-.52-.075-.149-.669-1.612-.916-2.207-.242-.579-.487-.5-.669-.51-.173-.008-.371-.01-.57-.01-.198 0-.52.074-.792.372-.272.297-1.04 1.016-1.04 2.479 0 1.462 1.065 2.875 1.213 3.074.149.198 2.096 3.2 5.077 4.487.709.306 1.262.489 1.694.625.712.227 1.36.195 1.871.118.571-.085 1.758-.719 2.006-1.413.248-.694.248-1.289.173-1.413-.074-.124-.272-.198-.57-.347m-5.421 7.403h-.004a9.87 9.87 0 01-5.031-1.378l-.361-.214-3.741.982.998-3.648-.235-.374a9.86 9.86 0 01-1.51-5.26c.001-5.45 4.436-9.884 9.888-9.884 2.64 0 5.122 1.03 6.988 2.898a9.825 9.825 0 012.893 6.994c-.003 5.45-4.437 9.884-9.885 9.884m8.413-18.297A11.815 11.815 0 0012.05 0C5.495 0 .16 5.335.157 11.892c0 2.096.547 4.142 1.588 5.945L.057 24l6.305-1.654a11.882 11.882 0 005.683 1.448h.005c6.554 0 11.89-5.335 11.893-11.893a11.821 11.821 0 00-3.48-8.413z" />
    </svg>
  )
}

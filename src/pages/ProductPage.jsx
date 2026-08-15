import { useEffect, useRef, useState } from 'react'
import { useParams, Link, useNavigate } from 'react-router-dom'
import { useCatalog, discountPercent } from '../context/CatalogContext.jsx'
import { useI18n } from '../i18n/I18nContext.jsx'
import { useShop } from '../context/ShopContext.jsx'
import { IconHeart, IconBag, IconShare, IconSparkle, IconChevron, IconBox } from '../components/Icons.jsx'
import ProductImage from '../components/ProductImage.jsx'
import ProductCard from '../components/ProductCard.jsx'
import Rating from '../components/Rating.jsx'
import { galleryForImage } from '../data/realProducts.js'

export default function ProductPage() {
  const { id } = useParams()
  const navigate = useNavigate()
  const { t } = useI18n()
  const { getProduct, products } = useCatalog()
  const { addToCart, toggleFavorite, isFavorite, canShop, promptAuth } = useShop()

  const product = getProduct(id)
  const needsSize = product && product.sizes && product.sizes.length > 1
  const [size, setSize] = useState(needsSize ? null : product?.sizes?.[0] ?? null)
  const [warn, setWarn] = useState(false)
  const [added, setAdded] = useState(false)
  const [selectedImage, setSelectedImage] = useState(null)
  const [shareNote, setShareNote] = useState(false)

  // Qalereya jesti: DOM node + jest arbitrajı üçün ref-lər.
  // Şaquli jest → HEÇ VAXT preventDefault etmirik (səhifə sürüşməsi sərbəst).
  // Yalnız TƏSDİQLƏNMİŞ üfüqi jestdə brauzeri dayandırıb şəkli dəyişirik.
  const galleryRef = useRef(null)
  const galleryLenRef = useRef(0)
  const switchRef = useRef(() => {})

  useEffect(() => {
    const el = galleryRef.current
    if (!el) return

    const DIR_THRESHOLD = 10 // istiqamət təyini üçün minimum piksel
    const SWIPE_MIN = 40 // şəkli dəyişmək üçün minimum üfüqi məsafə
    let start = null

    const onStart = (e) => {
      if (e.touches.length !== 1) { start = null; return }
      const p = e.touches[0]
      start = { x: p.clientX, y: p.clientY, dir: null }
    }

    const onMove = (e) => {
      if (!start) return
      const p = e.touches[0]
      const dx = p.clientX - start.x
      const dy = p.clientY - start.y
      // İstiqamət bir dəfə kilidlənir ki, jest ortada "sıçramasın".
      if (start.dir === null && (Math.abs(dx) > DIR_THRESHOLD || Math.abs(dy) > DIR_THRESHOLD)) {
        start.dir = Math.abs(dx) > Math.abs(dy) ? 'h' : 'v'
      }
      // Üfüqi jest təsdiqlənəndə (və birdən çox şəkil varsa) brauzerin öz
      // davranışını (kənardan geri-swipe, üfüqi rezin effekt) dayandırırıq.
      // Şaquli jestə TOXUNMURUQ → səhifə normal sürüşür.
      if (start.dir === 'h' && galleryLenRef.current > 1 && e.cancelable) {
        e.preventDefault()
      }
    }

    const onEnd = (e) => {
      const s = start
      start = null
      if (!s || s.dir !== 'h' || galleryLenRef.current < 2) return
      const dx = e.changedTouches[0].clientX - s.x
      if (Math.abs(dx) < SWIPE_MIN) return
      switchRef.current(dx < 0 ? 1 : -1)
    }

    // touchmove qeyri-passiv olmalıdır ki, üfüqi jestdə preventDefault işləsin.
    el.addEventListener('touchstart', onStart, { passive: true })
    el.addEventListener('touchmove', onMove, { passive: false })
    el.addEventListener('touchend', onEnd, { passive: true })
    el.addEventListener('touchcancel', onEnd, { passive: true })
    return () => {
      el.removeEventListener('touchstart', onStart)
      el.removeEventListener('touchmove', onMove)
      el.removeEventListener('touchend', onEnd)
      el.removeEventListener('touchcancel', onEnd)
    }
  }, [])

  if (!product) {
    return (
      <div className="container empty-state" style={{ padding: '80px 0' }}>
        <h3>{t('nothing_found')}</h3>
        <Link to="/catalog" className="btn btn-primary">{t('back_to_catalog')}</Link>
      </div>
    )
  }

  const onSale = Boolean(product.oldPrice)
  // Rəng seçimi YALNIZ real məlumatı əks etdirir:
  //  - eyni kodlu, adlandırılmış variantlar (product.variants) varsa → onları göstəririk;
  //  - əks halda məhsulun BİR real rəngi (color_hex, yoxdursa palitranın əsas tonu).
  // `product.colors` — parçanın DEKORATİV palitrasıdır (şəkil gradient-i üçün), satın
  // alına bilən ayrı rənglər DEYİL — ona görə onu artıq "seçilə bilən rənglər" kimi
  // sıralamırıq (tək məhsula uydurma çoxrənglilik yaratmasın).
  const singleColor = product.colorHex || product.colors?.[0] || ''
  const savedImages = product.images?.length ? product.images : (product.image ? [product.image] : [])
  // Qalereya məhsulun ÖZ şəklinin qovluğundan qurulur (linen-01, linen-02...).
  // Koda görə axtarmaq olmaz: rəng variantlarında kod ortaqdır və narıncı don
  // bej şəkillərini göstərərdi. Qovluq isə hər rəngdə fərqlidir.
  const folderGallery = galleryForImage(savedImages[0] || product.image)
  const gallery = savedImages.length > 1
    ? savedImages
    : (folderGallery.length ? folderGallery : savedImages)
  const mainImage = selectedImage || gallery[0] || product.image
  const currentIndex = Math.max(0, gallery.indexOf(mainImage))
  const atFirst = currentIndex <= 0
  const atLast = currentIndex >= gallery.length - 1
  // Sərhədli naviqasiya (TASK 2): sonuncudan → birinciyə KEÇMİR, əksi də.
  // Modulo/wrap-around çıxarıldı; həddə çatanda dəyişmir. Swipe də bunu çağırır.
  const switchGalleryImage = (direction) => {
    const nextIndex = currentIndex + direction
    if (nextIndex < 0 || nextIndex >= gallery.length) return
    setSelectedImage(gallery[nextIndex])
  }
  // Native touch listener-i (yuxarıdakı useEffect) hər renderdə ən son
  // qalereya uzunluğunu və switch funksiyasını ref vasitəsilə oxuyur.
  galleryLenRef.current = gallery.length
  switchRef.current = switchGalleryImage
  const fav = isFavorite(product.id)
  const related = products
    .filter((p) => p.category === product.category && p.id !== product.id)
    .slice(0, 9)

  // Xarakteristikalar: YALNIZ məhsulda həqiqi dəyər olduqda göstərilir.
  // Bu sahələr hazırda bazada yoxdur → blok görünmür (uydurma dəyər yaradılmır).
  const attributes = [
    { label: 'attr_material', value: product.material },
    { label: 'attr_fit', value: product.fit },
    { label: 'attr_neckline', value: product.neckline },
    { label: 'attr_season', value: product.season },
  ].filter((a) => a.value)

  // Şəkil üzərində sürüşdürmə (swipe) məntiqi yuxarıdakı useEffect-dədir:
  // qeyri-passiv native listener yalnız üfüqi jesti tutur, şaquli səhifə
  // sürüşməsinə isə heç vaxt mane olmur.

  // Yoxlama SIRASI: əvvəl GİRİŞ, sonra ölçü.
  // Girişsiz alıcıdan ölçü soruşmağın mənası yoxdur — onsuz da əlavə edə bilmir.
  // Stok statusu — kataloqdan (canlı). Stokda yoxdursa məhsulu almaq olmaz:
  // düymələr bloklanır, mətn göstərilir. Əsas qorunma isə addToCart-da və
  // bazadakı place_order-dədir (köhnə tab/cache buradan da keçə bilməz).
  const outOfStock = product.inStock === false

  const handleAdd = async () => {
    if (!canShop) {
      promptAuth('cart')
      return
    }
    if (outOfStock) return
    if (needsSize && !size) {
      setWarn(true)
      return
    }
    if (!(await addToCart(product.id, size, 1))) return
    setAdded(true)
    setTimeout(() => setAdded(false), 3000)
  }

  const handleBuy = async () => {
    if (!canShop) {
      promptAuth('cart')
      return
    }
    if (outOfStock) return
    if (needsSize && !size) {
      setWarn(true)
      return
    }
    if (!(await addToCart(product.id, size, 1))) return
    navigate('/cart')
  }

  const handleFavorite = () => {
    toggleFavorite(product.id)
  }

  // Paylaş: mobil Web Share API varsa onu, yoxdursa keçidi panoya kopyalayır.
  // İstifadəçi ləğv edərsə (AbortError) — səssiz keçir.
  const handleShare = async () => {
    const shareData = { title: t(product.name), text: product.brand, url: window.location.href }
    try {
      if (navigator.share) {
        await navigator.share(shareData)
        return
      }
      if (navigator.clipboard?.writeText) {
        await navigator.clipboard.writeText(window.location.href)
        setShareNote(true)
        setTimeout(() => setShareNote(false), 2000)
      }
    } catch {
      // İstifadəçi paylaşmanı ləğv etdi — heç nə etmirik.
    }
  }

  return (
    <div className="container product-page">
      {/* Desktop-da "kataloqa qayıt" düyməsi. Mobildə başlıqdakı "geri" oxu var. */}
      <Link to="/catalog" className="back-link">{t('back_to_catalog')}</Link>

      <div className="product-detail">
        <div className="product-gallery">
          <div className="gallery-main" ref={galleryRef}>
            <ProductImage product={{ ...product, image: mainImage, name: t(product.name) }} eager />

            {/* Sol üst: universal "yeni" qığılcımı + BİR "Pulsuz çatdırılma" nişanı
                (qutu ikonu + 2 sətirli mətn). "Sabah göndərilir" nişanı silindi.
                Türk mətni yoxdur — hamısı i18n. */}
            <div className="pd-media-badges">
              {product.tag && (
                <span className="product-badge" role="img" aria-label={t('new_arrivals')} title={t('new_arrivals')}>
                  <IconSparkle />
                </span>
              )}
              <span className="pd-badge pd-badge-free pd-badge-delivery">
                <span className="pd-badge-icon" aria-hidden="true"><IconBox /></span>
                <span className="pd-badge-text">
                  {t('badge_free_delivery').split(' ').map((word, i) => (
                    <span key={i}>{word}</span>
                  ))}
                </span>
              </span>
              {onSale && (
                <span className="pd-badge pd-badge-sale">-{discountPercent(product)}%</span>
              )}
            </div>

            {/* Sağ üst: Sevimli + Paylaş (ağ dairə, outline ikon) */}
            <div className="pd-media-actions">
              <button
                type="button"
                className={`pd-fab${fav ? ' active' : ''}`}
                onClick={handleFavorite}
                aria-label={t('favorites')}
                aria-pressed={fav}
              >
                <IconHeart />
              </button>
              <button type="button" className="pd-fab" onClick={handleShare} aria-label={t('share')}>
                <IconShare />
              </button>
            </div>

            {gallery.length > 1 && (
              <>
                <button
                  type="button"
                  className="gallery-nav gallery-nav-prev"
                  onClick={() => switchGalleryImage(-1)}
                  aria-label={t('image_prev')}
                  disabled={atFirst}
                >
                  <IconChevron />
                </button>
                <button
                  type="button"
                  className="gallery-nav gallery-nav-next"
                  onClick={() => switchGalleryImage(1)}
                  aria-label={t('image_next')}
                  disabled={atLast}
                >
                  <IconChevron />
                </button>
              </>
            )}
          </div>

          {shareNote && <p className="pd-share-note" role="status">{t('link_copied')}</p>}

          {/* Dot indikator — real şəkil sayına görə */}
          {gallery.length > 1 && (
            <div className="gallery-dots" aria-hidden="true">
              {gallery.map((image, index) => (
                <span key={image} className={`gallery-dot${index === currentIndex ? ' active' : ''}`} />
              ))}
            </div>
          )}

          {gallery.length > 1 && (
            <div className="gallery-thumbs" aria-label={t('product_images')}>
              {gallery.map((image, index) => (
                <button
                  key={image}
                  className={`gallery-thumb${mainImage === image ? ' active' : ''}`}
                  onClick={() => setSelectedImage(image)}
                  aria-label={`${t('image_word')} ${index + 1}`}
                >
                  <img src={image} alt="" loading="lazy" />
                </button>
              ))}
            </div>
          )}
        </div>

        <div className="product-detail-info">
          <span className="product-brand">
            {product.brand}
            {product.code && <em className="product-code">{t('field_code')}: {product.code}</em>}
          </span>
          <h1 className="product-detail-name">{t(product.name)}</h1>

          <Rating value={product.rating} reviews={product.reviews} reviewsLabel={t('reviews')} />

          {/* Stok statusu: yalnız HƏQİQİ məlumat (in_stock=false). Say uydurulmur. */}
          {!product.inStock && (
            <span className="pd-stock-out">{t('out_of_stock')}</span>
          )}

          <div className={`detail-price${onSale ? ' on-sale' : ''}`}>
            <span className="new">{product.price} ₼</span>
            {onSale && <span className="old">{product.oldPrice} ₼</span>}
            {onSale && <span className="save">-{discountPercent(product)}%</span>}
          </div>

          {/* Rəng variantları: hər biri ayrıca məhsuldur (öz şəkilləri,
              öz qiyməti, öz ölçüləri). Seçəndə həmin məhsula keçirik. */}
          {product.variants?.length > 1 ? (
            <div className="detail-field">
              <div className="color-variants" role="group" aria-label={t('color')}>
                {product.variants.map((v) => (
                  <button
                    key={v.id}
                    type="button"
                    className={`color-variant${v.id === product.id ? ' active' : ''}${v.inStock ? '' : ' out'}`}
                    onClick={() => navigate(`/product/${v.id}`)}
                    aria-pressed={v.id === product.id}
                    aria-label={v.inStock ? v.colorName : `${v.colorName} — ${t('out_of_stock')}`}
                    title={v.inStock ? v.colorName : `${v.colorName} — ${t('out_of_stock')}`}
                  >
                    <span className="color-variant-dot" style={{ background: v.colorHex || '#ccc' }} />
                  </button>
                ))}
              </div>
              {!product.inStock && (
                <span className="size-warn">{t('out_of_stock')}</span>
              )}
            </div>
          ) : singleColor ? (
            <div className="detail-field">
              <span className="field-label">{t('color')}</span>
              <div className="color-swatches">
                {/* Tək real rəng — məhsulun öz color-way-i (uydurma variant yoxdur) */}
                <span className="swatch-wrap">
                  <span className="swatch" style={{ background: singleColor }} title={singleColor} />
                </span>
              </div>
            </div>
          ) : null}

          <div className="detail-field">
            <span className="field-label">
              {t('size')}{needsSize && <em className="req"> *</em>}
            </span>
            <div className={`size-options${warn ? ' warn' : ''}`}>
              {product.sizes.map((s) => (
                <button
                  key={s}
                  className={`size-btn${size === s ? ' active' : ''}`}
                  onClick={() => { setSize((selectedSize) => selectedSize === s ? null : s); setWarn(false) }}
                >
                  {s}
                </button>
              ))}
            </div>
            {warn && <span className="size-warn">{t('choose_size_first')}</span>}
          </div>

          {/* Kompakt xarakteristika kartları — yalnız real dəyər olduqda */}
          {attributes.length > 0 && (
            <div className="pd-attrs">
              {attributes.map((a) => (
                <div key={a.label} className="pd-attr">
                  <span className="pd-attr-label">{t(a.label)}</span>
                  <span className="pd-attr-value">{a.value}</span>
                </div>
              ))}
            </div>
          )}

          {/* Masaüstü alış düymələri. Mobildə gizlənir — altdakı sabit panel var. */}
          <div className="detail-actions">
            <button className="btn btn-primary btn-lg" onClick={handleAdd} disabled={outOfStock}>
              <IconBag /> {outOfStock ? t('out_of_stock') : (added ? t('in_cart') + ' ✓' : t('add_to_cart'))}
            </button>
            <button className="btn btn-ghost btn-lg" onClick={handleBuy} disabled={outOfStock}>
              {t('buy_now')}
            </button>
            <button
              className={`icon-square${fav ? ' active' : ''}`}
              aria-label={t('favorites')}
              aria-pressed={fav}
              onClick={handleFavorite}
            >
              <IconHeart />
            </button>
          </div>

          <div className="delivery-note">
            <b>{t('delivery')}:</b> {t('delivery_info')}
          </div>

          <div className="detail-field">
            <span className="field-label">{t('description')}</span>
            <p className="detail-desc">{t('product_desc_generic')}</p>
          </div>
        </div>

        {related.length > 0 && (
          <aside className="product-aside" aria-label={t('related')}>
            <span className="product-aside-title">{t('related')}</span>
            <div className="product-aside-grid">
              {related.map((p) => (
                <Link key={p.id} to={`/product/${p.id}`} className="related-mini">
                  <span className="related-mini-image">
                    <ProductImage product={{ ...p, name: t(p.name) }} />
                  </span>
                  <span className="related-mini-price">{p.price} ₼</span>
                </Link>
              ))}
            </div>
          </aside>
        )}
      </div>

      {related.length > 0 && (
        <section className="related">
          <h2 className="section-title" style={{ fontSize: '1.8rem' }}>{t('related')}</h2>
          {/* Mobildə bu şəbəkə üfüqi lentə çevrilir (CSS) — səhifə uzanmasın */}
          <div className="product-grid related-grid">
            {related.map((p) => (
              <ProductCard key={p.id} product={p} />
            ))}
          </div>
        </section>
      )}

      {/* Mobil sabit alış paneli: solda qiymət + pulsuz çatdırılma, sağda "Səbətə əlavə et".
          Masaüstündə gizlidir (yuxarıdakı .detail-actions işləyir).
          TASK 5 — ölçü seçilməyibsə, düymənin ÜSTÜNDƏ (elə burada) validasiya mesajı
          göstərilir; alert/scroll yoxdur; ölçü seçiləndə mesaj itir. */}
      <div className="product-buybar">
        {warn && (
          <p className="pd-buybar-warn" role="alert">{t('choose_size_first')}</p>
        )}
        <div className="pd-buybar-row">
          <div className="pd-buybar-price">
            <span className="pd-buybar-amount">
              {product.price} ₼
              {onSale && <s>{product.oldPrice} ₼</s>}
            </span>
            <span className="pd-buybar-delivery">{t('badge_free_delivery')}</span>
          </div>
          <button className="pd-buybar-cta" onClick={handleAdd} disabled={outOfStock}>
            <IconBag /> {outOfStock ? t('out_of_stock') : (added ? t('in_cart') + ' ✓' : t('add_to_cart'))}
          </button>
        </div>
      </div>
    </div>
  )
}

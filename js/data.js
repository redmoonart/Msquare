/* ==========================================================
   M SQUARE — بيانات المتجر
   التصنيفات الأربعة: العلامة التجارية / الستايل / السعر / الفصول
   ========================================================== */

const CATEGORIES = {
  brand: [
    { id: 'nike',        label: { ar: 'Nike',        fr: 'Nike' } },
    { id: 'adidas',      label: { ar: 'Adidas',      fr: 'Adidas' } },
    { id: 'puma',        label: { ar: 'Puma',        fr: 'Puma' } },
    { id: 'newbalance',  label: { ar: 'New Balance', fr: 'New Balance' } },
    { id: 'converse',    label: { ar: 'Converse',    fr: 'Converse' } },
    { id: 'vans',        label: { ar: 'Vans',        fr: 'Vans' } },
    { id: 'timberland',  label: { ar: 'Timberland',  fr: 'Timberland' } },
    { id: 'skechers',    label: { ar: 'Skechers',    fr: 'Skechers' } }
  ],
  style: [
    { id: 'sport',      shape: 'runner',  label: { ar: 'رياضي',        fr: 'Sport' } },
    { id: 'casual',     shape: 'sneaker', label: { ar: 'كاجوال',       fr: 'Casual' } },
    { id: 'streetwear', shape: 'high',    label: { ar: 'ستريت وير',    fr: 'Streetwear' } },
    { id: 'classic',    shape: 'classic', label: { ar: 'كلاسيكي',      fr: 'Classique' } },
    { id: 'outdoor',    shape: 'boot',    label: { ar: 'أحذية بوت',    fr: 'Bottes & Outdoor' } },
    { id: 'sandals',    shape: 'sandal',  label: { ar: 'صنادل',        fr: 'Sandales' } }
  ],
  price: [
    { id: 'p1', min: 0,     max: 7999,     label: { ar: 'أقل من 8,000 دج',      fr: 'Moins de 8 000 DA' } },
    { id: 'p2', min: 8000,  max: 14999,    label: { ar: '8,000 – 15,000 دج',    fr: '8 000 – 15 000 DA' } },
    { id: 'p3', min: 15000, max: 24999,    label: { ar: '15,000 – 25,000 دج',   fr: '15 000 – 25 000 DA' } },
    { id: 'p4', min: 25000, max: Infinity, label: { ar: 'أكثر من 25,000 دج',    fr: 'Plus de 25 000 DA' } }
  ],
  season: [
    { id: 'spring', icon: '🌸', label: { ar: 'الربيع', fr: 'Printemps' } },
    { id: 'summer', icon: '☀️', label: { ar: 'الصيف',  fr: 'Été' } },
    { id: 'autumn', icon: '🍂', label: { ar: 'الخريف', fr: 'Automne' } },
    { id: 'winter', icon: '❄️', label: { ar: 'الشتاء', fr: 'Hiver' } }
  ]
};

/* كل منتج:
   colors: [لون الجزء العلوي, لون التفاصيل, لون النعل]
   image: (اختياري) رابط صورة حقيقية — إذا وُضع يُعرض بدل الرسم */
const PRODUCTS = [
  { id: 1,  name: 'Air Pulse Runner',      brand: 'nike',       style: 'sport',      seasons: ['spring','summer','autumn'], price: 18950, colors: ['#111111','#ff4d2e','#f2f2f2'], isNew: true,  best: true },
  { id: 2,  name: 'Court Vision Low',      brand: 'nike',       style: 'casual',     seasons: ['spring','autumn'],          price: 14950, colors: ['#ffffff','#1d1d1d','#e9e2d0'], isNew: false, best: true },
  { id: 3,  name: 'Dunk Street Hi',        brand: 'nike',       style: 'streetwear', seasons: ['autumn','winter'],          price: 24950, oldPrice: 29950, colors: ['#2b4c7e','#f5f5f5','#f5f5f5'] },
  { id: 4,  name: 'Sunray Slide',          brand: 'nike',       style: 'sandals',    seasons: ['summer'],                   price: 5950,  colors: ['#000000','#ffffff','#2d2d2d'], isNew: true },
  { id: 5,  name: 'Ultra Boost Light',     brand: 'adidas',     style: 'sport',      seasons: ['spring','summer'],          price: 26950, colors: ['#e8e8e8','#0d0d0d','#ffffff'], best: true },
  { id: 6,  name: 'Stan Classic',          brand: 'adidas',     style: 'casual',     seasons: ['spring','summer','autumn'], price: 13950, colors: ['#ffffff','#0f7a3a','#ffffff'] },
  { id: 7,  name: 'Forum Mid Street',      brand: 'adidas',     style: 'streetwear', seasons: ['autumn','winter'],          price: 19950, oldPrice: 23950, colors: ['#ffffff','#1e3fa0','#efe6d2'], isNew: true },
  { id: 8,  name: 'Terrex Trail Boot',     brand: 'adidas',     style: 'outdoor',    seasons: ['autumn','winter'],          price: 28950, colors: ['#3d3f36','#ff7a00','#1b1b1b'] },
  { id: 9,  name: 'Suede Heritage',        brand: 'puma',       style: 'casual',     seasons: ['spring','autumn'],          price: 16950, colors: ['#7a1020','#ffffff','#ffffff'], best: true },
  { id: 10, name: 'Velocity Nitro',        brand: 'puma',       style: 'sport',      seasons: ['spring','summer','autumn'], price: 21950, colors: ['#ffe500','#111111','#ffffff'], isNew: true },
  { id: 11, name: 'Palermo Leather',       brand: 'puma',       style: 'streetwear', seasons: ['spring','autumn'],          price: 15950, oldPrice: 18950, colors: ['#1a5d3a','#f1d9a8','#c79a5b'] },
  { id: 12, name: 'Leadcat Slide',         brand: 'puma',       style: 'sandals',    seasons: ['summer'],                   price: 4950,  colors: ['#c8102e','#ffffff','#1b1b1b'] },
  { id: 13, name: '574 Core',              brand: 'newbalance', style: 'casual',     seasons: ['spring','autumn','winter'], price: 17950, colors: ['#8a8d91','#1b2a4a','#f2f2f2'], best: true },
  { id: 14, name: 'Fresh Foam 1080',       brand: 'newbalance', style: 'sport',      seasons: ['spring','summer'],          price: 27950, colors: ['#1f3b73','#7fd1ff','#ffffff'], isNew: true },
  { id: 15, name: '990 Made Classic',      brand: 'newbalance', style: 'classic',    seasons: ['autumn','winter'],          price: 32950, colors: ['#9b9b9b','#5c5c5c','#e6e6e6'] },
  { id: 16, name: '550 Street',            brand: 'newbalance', style: 'streetwear', seasons: ['spring','autumn'],          price: 18950, oldPrice: 21950, colors: ['#ffffff','#2e7d32','#f4efe1'] },
  { id: 17, name: 'Chuck 70 Hi',           brand: 'converse',   style: 'streetwear', seasons: ['spring','summer','autumn'], price: 12950, colors: ['#111111','#ffffff','#f4efe1'], best: true },
  { id: 18, name: 'All Star Ox',           brand: 'converse',   style: 'casual',     seasons: ['spring','summer'],          price: 9950,  colors: ['#d81f26','#ffffff','#ffffff'] },
  { id: 19, name: 'Run Star Motion',       brand: 'converse',   style: 'streetwear', seasons: ['autumn','winter'],          price: 19950, colors: ['#f4efe1','#111111','#111111'], isNew: true },
  { id: 20, name: 'Old Skool',             brand: 'vans',       style: 'casual',     seasons: ['spring','summer','autumn'], price: 10950, colors: ['#111111','#ffffff','#ffffff'], best: true },
  { id: 21, name: 'Sk8-Hi',                brand: 'vans',       style: 'streetwear', seasons: ['autumn','winter'],          price: 12950, oldPrice: 14950, colors: ['#5b2a86','#ffffff','#ffffff'] },
  { id: 22, name: 'Classic Slip-On',       brand: 'vans',       style: 'casual',     seasons: ['summer'],                   price: 7950,  colors: ['#2d6a4f','#ffffff','#ffffff'] },
  { id: 23, name: 'La Costa Slide',        brand: 'vans',       style: 'sandals',    seasons: ['summer'],                   price: 4450,  colors: ['#f4a261','#2b2b2b','#2b2b2b'] },
  { id: 24, name: '6-Inch Premium Boot',   brand: 'timberland', style: 'outdoor',    seasons: ['autumn','winter'],          price: 34950, colors: ['#c58a3a','#6b4423','#3b2a1a'], best: true },
  { id: 25, name: 'Euro Hiker',            brand: 'timberland', style: 'outdoor',    seasons: ['autumn','winter'],          price: 29950, oldPrice: 33950, colors: ['#5a3e2b','#b22222','#2b2b2b'] },
  { id: 26, name: 'Heritage Oxford',       brand: 'timberland', style: 'classic',    seasons: ['spring','autumn'],          price: 23950, colors: ['#6b3e26','#3a2416','#2a1a10'], isNew: true },
  { id: 27, name: 'Bradstreet Loafer',     brand: 'timberland', style: 'classic',    seasons: ['spring','summer'],          price: 21950, colors: ['#1c1c1c','#444444','#111111'] },
  { id: 28, name: 'Go Walk Flex',          brand: 'skechers',   style: 'sport',      seasons: ['spring','summer'],          price: 8950,  colors: ['#4a6fa5','#ffffff','#ffffff'] },
  { id: 29, name: 'D\'Lites Retro',        brand: 'skechers',   style: 'casual',     seasons: ['spring','autumn'],          price: 11950, oldPrice: 13950, colors: ['#ffffff','#e63946','#ffffff'] },
  { id: 30, name: 'Arch Fit Sandal',       brand: 'skechers',   style: 'sandals',    seasons: ['summer'],                   price: 6950,  colors: ['#3b3b3b','#9c6644','#1e1e1e'], isNew: true },
  { id: 31, name: 'Relaxed Fit Boot',      brand: 'skechers',   style: 'outdoor',    seasons: ['winter'],                   price: 15950, colors: ['#4b3621','#d2b48c','#2b2b2b'] },
  { id: 32, name: 'Gazelle Indoor',        brand: 'adidas',     style: 'classic',    seasons: ['spring','autumn','winter'], price: 16950, colors: ['#1d3557','#f1faee','#c9a227'], isNew: true }
];

const SIZES = [38, 39, 40, 41, 42, 43, 44, 45];

/* الترجمة */
const I18N = {
  ar: {
    promo: 'التوصيل متوفر إلى 69 ولاية — الدفع عند الاستلام',
    search: 'ابحث عن حذاء، علامة، ستايل...',
    account: 'حسابي', wishlist: 'المفضلة', cart: 'السلة', help: 'المساعدة',
    new: 'جديد', sale: 'تخفيضات', all: 'الكل', shopAll: 'تسوق الكل',
    brand: 'العلامة التجارية', style: 'الستايل', price: 'السعر', season: 'الفصول',
    shopNow: 'تسوق الآن', discover: 'اكتشف الآن', viewAll: 'عرض الكل',
    heroT1: 'خطوتك الأولى', heroS1: 'عروض خاصة بانتظارك على تشكيلة الموسم',
    heroT2: 'جاهز للشتاء', heroS2: 'أحذية بوت دافئة ومقاومة للماء',
    heroT3: 'خفيف. سريع. مريح', heroS3: 'أحدث أحذية الجري وصلت',
    newArrivals: 'وصل حديثاً', bestSellers: 'الأكثر مبيعاً',
    bySeason: 'تسوق حسب الفصل', byStyle: 'تسوق حسب الستايل', byBrand: 'العلامات التجارية', byPrice: 'تسوق حسب الميزانية',
    seasonSub: 'حذاء مناسب لكل طقس',
    bannerT: 'ستريت وير', bannerS: 'الشارع ملكك — اختر ستايلك',
    filters: 'التصفية', clearAll: 'مسح الكل', results: 'منتج', sort: 'ترتيب حسب',
    sortDefault: 'المقترح', sortLow: 'السعر: من الأقل', sortHigh: 'السعر: من الأعلى', sortNew: 'الأحدث',
    noResults: 'لا توجد منتجات مطابقة لاختياراتك.', showResults: 'عرض النتائج',
    size: 'المقاس', chooseSize: 'اختر المقاس', addToCart: 'أضف إلى السلة', added: 'تمت الإضافة إلى السلة',
    pickSize: 'يرجى اختيار المقاس أولاً', related: 'قد يعجبك أيضاً', details: 'التفاصيل',
    delivery: 'التوصيل إلى 69 ولاية خلال 24 – 72 ساعة', cod: 'الدفع عند الاستلام', exchange: 'استبدال مجاني خلال 7 أيام',
    emptyCart: 'سلتك فارغة', subtotal: 'المجموع', checkout: 'إتمام الطلب', remove: 'حذف', continue: 'متابعة التسوق',
    fullName: 'الاسم الكامل', phone: 'رقم الهاتف', wilaya: 'الولاية', address: 'العنوان', confirmOrder: 'تأكيد الطلب',
    orderDone: 'شكراً! تم استلام طلبك وسنتصل بك لتأكيده.', orderNo: 'رقم الطلب', sending: 'جاري الإرسال...',
    orderError: 'تعذر إرسال الطلب. تحقق من الاتصال بالإنترنت وحاول مرة أخرى.', emptyWish: 'لا توجد منتجات في المفضلة',
    newsletterT: 'اشترك في النشرة', newsletterS: 'كن أول من يعرف بالوصولات الجديدة والعروض', subscribe: 'اشتراك', email: 'بريدك الإلكتروني',
    subscribed: 'تم الاشتراك بنجاح!',
    needHelp: 'تحتاج مساعدة؟', contactUs: 'اتصل بنا', aboutUs: 'من نحن', followUs: 'تابعنا',
    shipping: 'التوصيل', returns: 'الإرجاع والاستبدال', privacy: 'حماية البيانات', terms: 'شروط البيع', faq: 'الأسئلة الشائعة',
    aboutText: 'M Square — متجر جزائري للأحذية الأصلية من أشهر العلامات العالمية.',
    rights: 'جميع الحقوق محفوظة.', home: 'الرئيسية', da: 'دج', off: 'خصم'
  },
  fr: {
    promo: 'Livraison vers les 69 wilayas — paiement à la livraison',
    search: 'Rechercher une chaussure, une marque, un style...',
    account: 'Mon compte', wishlist: 'Favoris', cart: 'Panier', help: 'Assistance',
    new: 'Nouveautés', sale: 'Promos', all: 'Tout', shopAll: 'Tout voir',
    brand: 'Marque', style: 'Style', price: 'Prix', season: 'Saisons',
    shopNow: 'Achetez maintenant', discover: 'Découvrez maintenant', viewAll: 'Voir tout',
    heroT1: 'Votre premier pas', heroS1: 'Des offres spéciales sur la collection de la saison',
    heroT2: 'Prêt pour l\'hiver', heroS2: 'Des bottes chaudes et imperméables',
    heroT3: 'Léger. Rapide. Confort.', heroS3: 'Les nouvelles chaussures de running sont arrivées',
    newArrivals: 'Nouveautés', bestSellers: 'Best seller',
    bySeason: 'Acheter par saison', byStyle: 'Acheter par style', byBrand: 'Marques', byPrice: 'Acheter par budget',
    seasonSub: 'Une chaussure pour chaque météo',
    bannerT: 'Streetwear', bannerS: 'La rue est à vous — choisissez votre style',
    filters: 'Filtres', clearAll: 'Tout effacer', results: 'produits', sort: 'Trier par',
    sortDefault: 'Recommandé', sortLow: 'Prix croissant', sortHigh: 'Prix décroissant', sortNew: 'Nouveautés',
    noResults: 'Aucun produit ne correspond à votre sélection.', showResults: 'Voir les résultats',
    size: 'Pointure', chooseSize: 'Choisissez la pointure', addToCart: 'Ajouter au panier', added: 'Ajouté au panier',
    pickSize: 'Veuillez choisir une pointure', related: 'Vous aimerez aussi', details: 'Détails',
    delivery: 'Livraison 69 wilayas en 24 – 72 h', cod: 'Paiement à la livraison', exchange: 'Échange gratuit sous 7 jours',
    emptyCart: 'Votre panier est vide', subtotal: 'Sous-total', checkout: 'Commander', remove: 'Supprimer', continue: 'Continuer mes achats',
    fullName: 'Nom complet', phone: 'Téléphone', wilaya: 'Wilaya', address: 'Adresse', confirmOrder: 'Confirmer la commande',
    orderDone: 'Merci ! Votre commande a été reçue, nous vous appellerons pour la confirmer.', orderNo: 'N° de commande', sending: 'Envoi en cours...',
    orderError: 'Impossible d\'envoyer la commande. Vérifiez votre connexion et réessayez.', emptyWish: 'Aucun favori pour le moment',
    newsletterT: 'Newsletter', newsletterS: 'Soyez les premiers informés des nouveautés et des offres', subscribe: 'S\'inscrire', email: 'Votre e-mail',
    subscribed: 'Inscription réussie !',
    needHelp: 'Besoin d\'aide ?', contactUs: 'Contactez-nous', aboutUs: 'À propos', followUs: 'Suivez-nous',
    shipping: 'Livraison', returns: 'Retours & échanges', privacy: 'Protection des données', terms: 'Conditions générales de vente', faq: 'FAQ',
    aboutText: 'M Square — boutique algérienne de chaussures originales des plus grandes marques.',
    rights: 'Tous droits réservés.', home: 'Accueil', da: 'DA', off: 'de remise'
  }
};

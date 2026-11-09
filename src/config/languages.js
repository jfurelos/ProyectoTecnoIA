/**
 * Configuración de Idiomas y Mapeo de Fotos de Muebles
 * Sincroniza los 4 idiomas solicitados con sus imágenes correspondientes:
 *  - es (Español) -> foto mueble.png
 *  - ca (Catalán) -> foto moble.png
 *  - en (Inglés)  -> photo furniture.png
 *  - zh (Chino)   -> jiājù zhàopiàn.png
 */

export const LANGUAGE_IMAGES = {
  es: "/foto mueble.png",
  ca: "/foto moble.png",
  en: "/photo furniture.png",
  zh: "/jiājù zhàopiàn.png"
};

export const UI_TRANSLATIONS = {
  es: {
    name: "Castellano",
    searchPlaceholder: "Buscar por pieza, material o estilo...",
    styleLabel: "Estilo:",
    roomTitle: "Recomendaciones para tu Espacio",
    statsText: "Calculando afinidad vectorial con piezas catalogadas",
    cestaBtn: "🧺 Cesta",
    preferencesBtn: "Preferencias",
    allCategory: "Todos los Muebles",
    catAsientos: "Asientos & Sofás",
    catMesas: "Mesas & Escritorios",
    catAlmacenaje: "Almacenaje & Librerías",
    catIluminacion: "Iluminación",
    catDormitorio: "Dormitorio",
    catAccesorios: "Accesorios & Textil",
    toast: "Idioma cambiado a Castellano (foto mueble)"
  },
  ca: {
    name: "Català",
    searchPlaceholder: "Cercar per peça, material o estil...",
    styleLabel: "Estil:",
    roomTitle: "Recomanacions per al teu Espai",
    statsText: "Calculant afinitat vectorial amb peces catalogades",
    cestaBtn: "🧺 Cistella",
    preferencesBtn: "Preferències",
    allCategory: "Tots els Mobles",
    catAsientos: "Seients & Sofàs",
    catMesas: "Taules & Escriptoris",
    catAlmacenaje: "Emmagatzematge & Llibreries",
    catIluminacion: "Il·luminació",
    catDormitorio: "Dormitori",
    catAccesorios: "Accessoris & Tèxtil",
    toast: "Idioma canviat a Català (foto moble)"
  },
  en: {
    name: "English",
    searchPlaceholder: "Search by piece, material, or style...",
    styleLabel: "Style:",
    roomTitle: "Recommendations for your Space",
    statsText: "Computing vector affinity with cataloged pieces",
    cestaBtn: "🧺 Cart",
    preferencesBtn: "Preferences",
    allCategory: "All Furniture",
    catAsientos: "Seating & Sofas",
    catMesas: "Tables & Desks",
    catAlmacenaje: "Storage & Bookcases",
    catIluminacion: "Lighting",
    catDormitorio: "Bedroom",
    catAccesorios: "Accessories & Textiles",
    toast: "Language changed to English (photo furniture)"
  },
  zh: {
    name: "中文",
    searchPlaceholder: "按家具、材质或风格搜索...",
    styleLabel: "风格:",
    roomTitle: "专属于您空间的建筑家具推荐",
    statsText: "正在计算与目录家具的向量契合度",
    cestaBtn: "🧺 购物篮",
    preferencesBtn: "偏好设置",
    allCategory: "所有家具",
    catAsientos: "座椅与沙发",
    catMesas: "桌几与书桌",
    catAlmacenaje: "收纳与书架",
    catIluminacion: "照明灯具",
    catDormitorio: "卧室家具",
    catAccesorios: "配饰与软装",
    toast: "语言已切换为中文 (jiājù zhàopiàn)"
  }
};


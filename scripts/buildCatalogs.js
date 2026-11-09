import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { FURNITURE_CATALOG_RAG } from '../src/data/furnitureCatalogRAG.js';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const rootDir = path.resolve(__dirname, '..');

const CATEGORY_MAP = {
  "Asientos": { ca: "Seients", en: "Seating", zh: "座椅" },
  "Mesas": { ca: "Taules", en: "Tables", zh: "桌几" },
  "Almacenaje": { ca: "Emmagatzematge", en: "Storage", zh: "收纳" },
  "Iluminación": { ca: "Il·luminació", en: "Lighting", zh: "照明" },
  "Dormitorio": { ca: "Dormitori", en: "Bedroom", zh: "卧室" },
  "Accesorios": { ca: "Accessoris", en: "Accessories", zh: "配饰" }
};

const ROOM_MAP = {
  "salón": { ca: "saló", en: "living room", zh: "客厅" },
  "comedor": { ca: "menjador", en: "dining room", zh: "餐厅" },
  "dormitorio": { ca: "dormitori", en: "bedroom", zh: "卧室" },
  "estudio": { ca: "estudi", en: "study", zh: "书房" }
};

const STYLE_MAP = {
  "Japandi": { ca: "Japandi", en: "Japandi", zh: "日式Japandi" },
  "Minimalismo Cálido": { ca: "Minimalisme Càlid", en: "Warm Minimalism", zh: "暖调极简" },
  "Industrial Sutil": { ca: "Industrial Subtil", en: "Subtle Industrial", zh: "细腻工业风" },
  "Mediterráneo": { ca: "Mediterrani", en: "Mediterranean", zh: "地中海风" },
  "Rústico Contemporáneo": { ca: "Rústic Contemporani", en: "Contemporary Rustic", zh: "当代质朴风" },
  "Nórdico": { ca: "Nòrdic", en: "Nordic", zh: "北欧风" },
  "Mid-Century": { ca: "Mid-Century", en: "Mid-Century", zh: "世纪中叶现代" },
  "Wabi-Sabi": { ca: "Wabi-Sabi", en: "Wabi-Sabi", zh: "侘寂风" },
  "Bauhaus": { ca: "Bauhaus", en: "Bauhaus", zh: "包豪斯" },
  "Zen": { ca: "Zen", en: "Zen", zh: "禅意风" },
  "Brutalista Sutil": { ca: "Brutalista Subtil", en: "Subtle Brutalist", zh: "细腻粗野主义" }
};

const MATERIAL_MAP = {
  "Aceite biológico": { ca: "Oli biològic", en: "Organic Oil Finish", zh: "有机植物油" },
  "Acero Pavonado": { ca: "Acer Pavonat", en: "Blued Steel", zh: "发黑钢" },
  "Aluminio mate": { ca: "Alumini mat", en: "Matte Aluminum", zh: "哑光铝合金" },
  "Barniz biológico": { ca: "Vernís biològic", en: "Bio-Varnish", zh: "环保生物清漆" },
  "Barro Cocido": { ca: "Fang Cuit", en: "Fired Clay", zh: "陶土烧制" },
  "Cable textil": { ca: "Cable tèxtil", en: "Textile Cable", zh: "织物编织线" },
  "Cera virgen": { ca: "Cera verge", en: "Virgin Beeswax", zh: "天然蜂蜡" },
  "Cerámica Artesanal": { ca: "Ceràmica Artesanal", en: "Artisanal Ceramic", zh: "手工陶瓷" },
  "Cuerda Kraft": { ca: "Corda Kraft", en: "Kraft Paper Cord", zh: "牛皮纸绳" },
  "Cuero Vegetal": { ca: "Cuir Vegetal", en: "Vegetable-Tanned Leather", zh: "植鞣皮革" },
  "Herrajes invisibles": { ca: "Ferratges invisibles", en: "Concealed Hardware", zh: "隐形五金件" },
  "LED Cálido": { ca: "LED Càlid", en: "Warm LED", zh: "暖光 LED" },
  "Lana Virgen": { ca: "Llana Verge", en: "Virgin Wool", zh: "初剪羊毛" },
  "Latón Satinado": { ca: "Llautó Satinat", en: "Satin Brass", zh: "缎面黄铜" },
  "Lino Belga": { ca: "Lli Belga", en: "Belgian Linen", zh: "比利时亚麻" },
  "Madera Recuperada": { ca: "Fusta Recuperada", en: "Reclaimed Wood", zh: "回收老木" },
  "Madera de Cedro": { ca: "Fusta de Cedre", en: "Cedar Wood", zh: "雪松木" },
  "Madera de Fresno": { ca: "Fusta de Freixe", en: "Ash Wood", zh: "白蜡木" },
  "Madera de Nogal": { ca: "Fusta de Noguera", en: "Walnut Wood", zh: "胡桃木" },
  "Mortero": { ca: "Morter", en: "Mortar", zh: "微水泥/砂浆" },
  "Mármol Travertino": { ca: "Marbre Travertí", en: "Travertine Marble", zh: "洞石大理石" },
  "Papel Washi": { ca: "Paper Washi", en: "Washi Paper", zh: "和纸" },
  "Piedra Caliza": { ca: "Pedra Calcària", en: "Limestone", zh: "石灰石" },
  "Roble Macizo": { ca: "Roure Massís", en: "Solid Oak", zh: "实木橡木" },
  "Tatami": { ca: "Tatami", en: "Tatami", zh: "榻榻米" },
  "Tejido Bouclé": { ca: "Teixit Bouclé", en: "Bouclé Fabric", zh: "羊羔绒面料" },
  "Textura Bouclé": { ca: "Textura Bouclé", en: "Bouclé Texture", zh: "羊羔绒质感" },
  "Vidrio Estriado": { ca: "Vidre Estriat", en: "Fluted Glass", zh: "长虹条纹玻璃" }
};

const TAG_MAP = {
  "Absorción Acústica": { ca: "Absorció Acústica", en: "Acoustic Absorption", zh: "声学吸音" },
  "Acero Pavonado": { ca: "Acer Pavonat", en: "Blued Steel", zh: "发黑钢" },
  "Barro Cocido": { ca: "Fang Cuit", en: "Fired Clay", zh: "陶土烧制" },
  "Bauhaus": { ca: "Bauhaus", en: "Bauhaus", zh: "包豪斯" },
  "Brutalista Sutil": { ca: "Brutalista Subtil", en: "Subtle Brutalist", zh: "细腻粗野主义" },
  "Cerámica Artesanal": { ca: "Ceràmica Artesanal", en: "Artisanal Ceramic", zh: "手工陶瓷" },
  "Confort Ergonómico": { ca: "Confort Ergonòmic", en: "Ergonomic Comfort", zh: "人体工学舒适" },
  "Cuerda Kraft": { ca: "Corda Kraft", en: "Kraft Paper Cord", zh: "牛皮纸绳编织" },
  "Cuero Vegetal": { ca: "Cuir Vegetal", en: "Vegetable-Tanned Leather", zh: "植鞣皮革" },
  "Estructura Suspendida": { ca: "Estructura Suspesa", en: "Suspended Structure", zh: "悬浮结构" },
  "Geometría Pura": { ca: "Geometria Pura", en: "Pure Geometry", zh: "纯粹几何" },
  "Iluminación Indirecta": { ca: "Il·luminació Indirecta", en: "Indirect Lighting", zh: "间接照明" },
  "Industrial Sutil": { ca: "Industrial Subtil", en: "Subtle Industrial", zh: "细腻工业风" },
  "Japandi": { ca: "Japandi", en: "Japandi", zh: "日式Japandi" },
  "Lana Virgen": { ca: "Llana Verge", en: "Virgin Wool", zh: "初剪羊毛" },
  "Latón Satinado": { ca: "Llautó Satinat", en: "Satin Brass", zh: "缎面黄铜" },
  "Lino Belga": { ca: "Lli Belga", en: "Belgian Linen", zh: "比利时亚麻" },
  "Low-Sitting": { ca: "Low-Sitting", en: "Low-Sitting", zh: "低矮坐姿" },
  "Luz Cenital": { ca: "Llum Zenital", en: "Overhead Light", zh: "天光漫射" },
  "Luz Tenue": { ca: "Llum Tènue", en: "Soft Ambient Light", zh: "柔和弱光" },
  "Líneas Orgánicas": { ca: "Línies Orgàniques", en: "Organic Lines", zh: "有机曲线" },
  "Madera Recuperada": { ca: "Fusta Recuperada", en: "Reclaimed Wood", zh: "回收老木" },
  "Madera de Cedro": { ca: "Fusta de Cedre", en: "Cedar Wood", zh: "雪松木" },
  "Madera de Fresno": { ca: "Fusta de Freixe", en: "Ash Wood", zh: "水曲柳/白蜡木" },
  "Madera de Nogal": { ca: "Fusta de Noguera", en: "Walnut Wood", zh: "胡桃木" },
  "Mediterráneo": { ca: "Mediterrani", en: "Mediterranean", zh: "地中海风" },
  "Mid-Century": { ca: "Mid-Century", en: "Mid-Century", zh: "世纪中叶" },
  "Minimalismo Cálido": { ca: "Minimalisme Càlid", en: "Warm Minimalism", zh: "暖调极简" },
  "Modular": { ca: "Modular", en: "Modular", zh: "模块化" },
  "Mármol Travertino": { ca: "Marbre Travertí", en: "Travertine Marble", zh: "洞石大理石" },
  "Nórdico": { ca: "Nòrdic", en: "Nordic", zh: "北欧风" },
  "Papel Washi": { ca: "Paper Washi", en: "Washi Paper", zh: "和纸" },
  "Perfil Extraplano": { ca: "Perfil Extraplà", en: "Ultra-Slim Profile", zh: "超薄扁平构型" },
  "Piedra Caliza": { ca: "Pedra Calcària", en: "Limestone", zh: "石灰石" },
  "Pátina Artesanal": { ca: "Pàtina Artesanal", en: "Artisanal Patina", zh: "手作包浆" },
  "Roble Macizo": { ca: "Roure Massís", en: "Solid Oak", zh: "实木橡木" },
  "Rústico Contemporáneo": { ca: "Rústic Contemporani", en: "Contemporary Rustic", zh: "当代质朴风" },
  "Tacto Poroso": { ca: "Tacte Porós", en: "Porous Tactility", zh: "多孔肌理" },
  "Tatami": { ca: "Tatami", en: "Tatami", zh: "榻榻米" },
  "Textura Bouclé": { ca: "Textura Bouclé", en: "Bouclé Texture", zh: "羊羔绒肌理" },
  "Vidrio Estriado": { ca: "Vidre Estriat", en: "Fluted Glass", zh: "长虹条纹玻璃" },
  "Wabi-Sabi": { ca: "Wabi-Sabi", en: "Wabi-Sabi", zh: "侘寂" },
  "Zen": { ca: "Zen", en: "Zen", zh: "禅意" }
};

const COLOR_MAP = {
  "Acero Lacado": { ca: "Acer Lacat", en: "Lacquered Steel", zh: "烤漆钢" },
  "Acero Negro": { ca: "Acer Negre", en: "Black Steel", zh: "黑钢" },
  "Acero Oscuro": { ca: "Acer Fosc", en: "Dark Steel", zh: "深色钢" },
  "Acero Pavonado": { ca: "Acer Pavonat", en: "Blued Steel", zh: "发黑钢" },
  "Acero y Cristal": { ca: "Acer i Cristall", en: "Steel & Glass", zh: "钢与玻璃" },
  "Acero y Cuero": { ca: "Acer i Cuir", en: "Steel & Leather", zh: "钢与皮革" },
  "Acero y Fresno": { ca: "Acer i Freixe", en: "Steel & Ash", zh: "钢与白蜡木" },
  "Acero y Nogal": { ca: "Acer i Noguera", en: "Steel & Walnut", zh: "钢与胡桃木" },
  "Acero y Vidrio": { ca: "Acer i Vidre", en: "Steel & Fluted Glass", zh: "钢与长虹玻璃" },
  "Arcilla Viva": { ca: "Argila Viva", en: "Raw Terracotta", zh: "天然红陶" },
  "Arena Cálida": { ca: "Sorra Càlida", en: "Warm Sand", zh: "暖沙色" },
  "Arena Suave": { ca: "Sorra Suau", en: "Soft Sand", zh: "柔沙色" },
  "Barro Ceniza": { ca: "Fang Cendra", en: "Ash Clay", zh: "灰烬陶土" },
  "Barro Negro": { ca: "Fang Negre", en: "Black Clay", zh: "黑陶" },
  "Barro y Ceniza": { ca: "Fang i Cendra", en: "Clay & Ash", zh: "陶土与灰烬" },
  "Barro y Yute": { ca: "Fang i Jute", en: "Clay & Jute", zh: "陶土与黄麻" },
  "Blanco Crudo": { ca: "Blanc Cru", en: "Raw White", zh: "原白" },
  "Blanco Roto": { ca: "Blanc Trencat", en: "Off-White", zh: "米白" },
  "Blanco Yeso": { ca: "Blanc Guix", en: "Chalk White", zh: "白垩石膏色" },
  "Blanco y Fresno": { ca: "Blanc i Freixe", en: "White & Ash", zh: "纯白与白蜡木" },
  "Caliza Blanca": { ca: "Calcària Blanca", en: "White Limestone", zh: "白石灰石" },
  "Caliza Crema": { ca: "Calcària Crema", en: "Cream Limestone", zh: "奶油石灰石" },
  "Caliza Porosa": { ca: "Calcària Porosa", en: "Porous Limestone", zh: "多孔石灰石" },
  "Caliza y Cuero": { ca: "Calcària i Cuir", en: "Limestone & Leather", zh: "石灰石与皮艺" },
  "Caliza y Fresno": { ca: "Calcària i Freixe", en: "Limestone & Ash", zh: "石灰石与白蜡木" },
  "Caliza y Roble": { ca: "Calcària i Roure", en: "Limestone & Oak", zh: "石灰石与橡木" },
  "Castaño Tostado": { ca: "Castanyer Torrat", en: "Toasted Chestnut", zh: "烘烤栗木色" },
  "Castaño Viejo": { ca: "Castanyer Vell", en: "Aged Chestnut", zh: "陈年老栗木色" },
  "Cedro Aromático": { ca: "Cedre Aromàtic", en: "Aromatic Cedar", zh: "雪松原色" },
  "Cedro Claro": { ca: "Cedre Clar", en: "Pale Cedar", zh: "淡色雪松" },
  "Cedro Japonés": { ca: "Cedre Japonès", en: "Japanese Cedar (Sugi)", zh: "日本杉木原色" },
  "Cedro Natural": { ca: "Cedre Natural", en: "Natural Cedar", zh: "天然雪松" },
  "Cuero Caramelo": { ca: "Cuir Caramel", en: "Caramel Leather", zh: "焦糖色皮革" },
  "Cuero Robusto": { ca: "Cuir Robust", en: "Saddle Leather", zh: "厚质原色鞍皮" },
  "Cuero y Acero": { ca: "Cuir i Acer", en: "Leather & Steel", zh: "皮艺与钢" },
  "Cuero y Nogal": { ca: "Cuir i Noguera", en: "Leather & Walnut", zh: "皮艺与胡桃木" },
  "Cuero y Roble": { ca: "Cuir i Roure", en: "Leather & Oak", zh: "皮艺与橡木" },
  "Dorado Satinado": { ca: "Daurat Satinat", en: "Satin Gold", zh: "缎面哑金" },
  "Fresno Blanco": { ca: "Freixe Blanc", en: "White Ash", zh: "白蜡白" },
  "Fresno Blanqueado": { ca: "Freixe Emblanquinat", en: "Bleached Ash", zh: "漂白水曲柳" },
  "Fresno Claro": { ca: "Freixe Clar", en: "Light Ash", zh: "浅白蜡木" },
  "Fresno Natural": { ca: "Freixe Natural", en: "Natural Ash", zh: "天然水曲柳" },
  "Fresno y Acero": { ca: "Freixe i Acer", en: "Ash & Steel", zh: "白蜡木与钢" },
  "Fresno y Lino": { ca: "Freixe i Lli", en: "Ash & Linen", zh: "白蜡木与亚麻" },
  "Gris Cemento": { ca: "Gris Ciment", en: "Concrete Grey", zh: "清水水泥灰" },
  "Gris Ceniza": { ca: "Gris Cendra", en: "Ash Grey", zh: "草木灰" },
  "Gris y Crudo": { ca: "Gris i Cru", en: "Grey & Raw Ecru", zh: "浅灰与原色" },
  "Hierro y Barro": { ca: "Ferro i Fang", en: "Iron & Clay", zh: "铁与陶" },
  "Lana Cruda": { ca: "Llana Crua", en: "Raw Wool", zh: "原色羊毛" },
  "Latón Satinado": { ca: "Llautó Satinat", en: "Satin Brass", zh: "缎面黄铜" },
  "Lino Crudo": { ca: "Lli Cru", en: "Raw Linen", zh: "原胚亚麻" },
  "Lino Grisáceo": { ca: "Lli Grisenc", en: "Greyish Linen", zh: "灰质亚麻" },
  "Lino Natural": { ca: "Lli Natural", en: "Natural Linen", zh: "本色亚麻" },
  "Lino Tostado": { ca: "Lli Torrat", en: "Toasted Linen", zh: "烘烤亚麻" },
  "Lino y Tiza": { ca: "Lli i Guix", en: "Linen & Chalk", zh: "亚麻与白垩" },
  "Madera Quemada": { ca: "Fusta Cremada", en: "Charred Wood (Yakisugi)", zh: "烧杉黑木" },
  "Madera Rubia": { ca: "Fusta Rúbia", en: "Blonde Wood", zh: "浅金原木" },
  "Madera Vieja": { ca: "Fusta Vella", en: "Aged Timber", zh: "陈年老木" },
  "Madera y Olivo": { ca: "Fusta i Olivera", en: "Timber & Olive", zh: "原木与橄榄木" },
  "Negro Humo": { ca: "Negre Fum", en: "Smoke Black", zh: "烟黑" },
  "Negro Mate": { ca: "Negre Mat", en: "Matte Black", zh: "哑光黑" },
  "Negro Pavonado": { ca: "Negre Pavonat", en: "Blued Black", zh: "发黑哑光" },
  "Nogal Ahumado": { ca: "Noguera Fumada", en: "Smoked Walnut", zh: "烟熏胡桃木" },
  "Nogal Cálido": { ca: "Noguera Càlida", en: "Warm Walnut", zh: "温润胡桃木" },
  "Nogal Intenso": { ca: "Noguera Intensa", en: "Deep Walnut", zh: "深邃胡桃木" },
  "Nogal Suave": { ca: "Noguera Suau", en: "Soft Walnut", zh: "柔和胡桃木" },
  "Nogal y Acero": { ca: "Noguera i Acer", en: "Walnut & Steel", zh: "胡桃木与钢" },
  "Nogal y Mármol": { ca: "Noguera i Marbre", en: "Walnut & Marble", zh: "胡桃木与大理石" },
  "Nogal y Ocre": { ca: "Noguera i Ocre", en: "Walnut & Ochre", zh: "胡桃木与赭黄" },
  "Ocre Siena": { ca: "Ocre Siena", en: "Sienna Ochre", zh: "锡耶纳赭石色" },
  "Ocre y Terracota": { ca: "Ocre i Terracota", en: "Ochre & Terracotta", zh: "赭黄与赤陶" },
  "Oliva Seco": { ca: "Oliva Sec", en: "Dried Olive", zh: "枯橄榄绿" },
  "Papel Crudo": { ca: "Paper Cru", en: "Raw Washi Ecru", zh: "原色和纸" },
  "Papel y Roble": { ca: "Paper i Roure", en: "Paper & Oak", zh: "纸席与橡木" },
  "Piedra Blanca": { ca: "Pedra Blanca", en: "White Stone", zh: "白石原色" },
  "Roble Añejo": { ca: "Roure An替", en: "Aged Oak", zh: "老橡木" },
  "Roble Blanqueado": { ca: "Roure Emblanquinat", en: "Bleached Oak", zh: "白化橡木" },
  "Roble Claro": { ca: "Roure Clar", en: "Light Oak", zh: "浅色橡木" },
  "Roble Natural": { ca: "Roure Natural", en: "Natural Oak", zh: "天然橡木" },
  "Roble Oscuro": { ca: "Roure Fosc", en: "Dark Oak", zh: "深色橡木" },
  "Roble Rubio": { ca: "Roure Rubió", en: "Golden Oak", zh: "金黄橡木" },
  "Roble Suave": { ca: "Roure Suau", en: "Soft Oak", zh: "柔润橡木" },
  "Roble y Gris": { ca: "Roure i Gris", en: "Oak & Grey", zh: "橡木与素灰" },
  "Roble y Junco": { ca: "Roure i Jonc", en: "Oak & Reed", zh: "橡木与芦苇编织" },
  "Roble y Lino": { ca: "Roure i Lli", en: "Oak & Linen", zh: "橡木与亚麻" },
  "Roble y Washi": { ca: "Roure i Washi", en: "Oak & Washi", zh: "橡木与和纸" },
  "Terracota Clara": { ca: "Terracota Clara", en: "Pale Terracotta", zh: "淡陶土色" },
  "Terracota Cálida": { ca: "Terracota Càlida", en: "Warm Terracotta", zh: "暖赤陶色" },
  "Terracota Mate": { ca: "Terracota Mate", en: "Matte Terracotta", zh: "哑光赤陶" },
  "Terracota Seca": { ca: "Terracota Seca", en: "Sun-Dried Terracotta", zh: "风干陶土色" },
  "Travertino Apomazado": { ca: "Travertí Esmolat", en: "Honed Travertine", zh: "哑光研磨洞石" },
  "Travertino Crema": { ca: "Travertí Crema", en: "Cream Travertine", zh: "米黄洞石" },
  "Travertino Natural": { ca: "Travertí Natural", en: "Natural Travertine", zh: "天然洞石" },
  "Travertino Poroso": { ca: "Travertí Porós", en: "Porous Travertine", zh: "多孔洞石" },
  "Travertino Romano": { ca: "Travertí Romà", en: "Roman Travertine", zh: "罗马洞石" },
  "Travertino y Ópalo": { ca: "Travertí i Òpal", en: "Travertine & Opal Glass", zh: "洞石与蛋白玻璃" },
  "Verde Oliva": { ca: "Verd Oliva", en: "Olive Green", zh: "橄榄绿" }
};

const NAME_MAP = {
  "furn-001": { ca: "Sofà Modular Kumo Low", en: "Kumo Low Modular Sofa", zh: "Kumo Low 模块化矮沙发" },
  "furn-002": { ca: "Butaca Curva Bouclé Silvestre", en: "Silvestre Curved Bouclé Armchair", zh: "Silvestre 弧形羊羔绒单人沙发" },
  "furn-003": { ca: "Butaca Club Cuir Taller", en: "Workshop Leather Club Chair", zh: "工坊复古皮艺俱乐部扶手椅" },
  "furn-004": { ca: "Chaise Longue Escultòrica Calma", en: "Calma Sculptural Chaise Longue", zh: "Calma 雕塑感静谧躺椅" },
  "furn-005": { ca: "Banc Entrada Dovetail Roure", en: "Dovetail Oak Entryway Bench", zh: "燕尾榫实木橡木玄关长凳" },
  "furn-006": { ca: "Joc 4 Cadires Menjador Cordó", en: "Set of 4 Cord Dining Chairs", zh: "纸绳编织餐椅4件套" },
  "furn-007": { ca: "Butaca Orejona Mid-Century Cantilever", en: "Mid-Century Cantilever Wing Chair", zh: "世纪中叶悬臂翼耳扶手椅" },
  "furn-008": { ca: "Taburet Monolític Ceràmic", en: "Monolithic Ceramic Stool", zh: "一体式陶瓷雕塑圆凳" },
  "furn-009": { ca: "Cadira Bauhaus Tubular Cantilever", en: "Bauhaus Tubular Cantilever Chair", zh: "包豪斯钢管悬臂椅" },
  "furn-010": { ca: "Banc de Descans Zenit Tatami", en: "Zenit Tatami Daybed Bench", zh: "Zenit 榻榻米休闲长凳" },
  "furn-011": { ca: "Sofà Racó Diàfan Lli", en: "Airy Linen Sectional Sofa", zh: "通透亚麻转角沙发" },
  "furn-012": { ca: "Butaca Giratòria Cuir Negre", en: "Black Leather Swivel Armchair", zh: "黑色皮艺旋转单人沙发" },
  "furn-013": { ca: "Banc Peu de Llit Enllistonat", en: "Slatted Bed-End Bench", zh: "格栅排骨床尾凳" },
  "furn-014": { ca: "Butaca Lectura Llana Bouclé", en: "Bouclé Wool Reading Chair", zh: "羊羔绒羊毛阅读扶手椅" },
  "furn-015": { ca: "Puff Orgànic Argila", en: "Clay Organic Pouf", zh: "陶土有机形态脚踏软凳" },
  "furn-016": { ca: "Cadira Estudi Ergonòmica Nòrdica", en: "Nordic Ergonomic Desk Chair", zh: "北欧人体工学书房椅" },
  "furn-017": { ca: "Butaca Escultòrica Asimètrica", en: "Asymmetric Sculptural Armchair", zh: "非对称雕塑单人扶手椅" },
  "furn-018": { ca: "Sofà Dues Places Vellut Lli", en: "Two-Seater Linen Velvet Sofa", zh: "双人亚麻天鹅绒沙发" },
  "furn-019": { ca: "Banqueta Baixa de Cuina Rústica", en: "Rustic Low Kitchen Stool", zh: "质朴矮款厨房长条凳" },
  "furn-020": { ca: "Butaca de Meditació Zafu Wood", en: "Zafu Wood Meditation Chair", zh: "Zafu 木质冥想扶手椅" },
  "furn-021": { ca: "Taula Menjador Temple Roure Massís", en: "Temple Solid Oak Dining Table", zh: "Temple 殿堂实木橡木餐桌" },
  "furn-022": { ca: "Taula Centre Monolítica Calcària", en: "Monolithic Limestone Coffee Table", zh: "一体式石灰石茶几" },
  "furn-023": { ca: "Escriptori Tècnic d'Arquitecte", en: "Architect's Drafting Desk", zh: "建筑师专业制图书桌" },
  "furn-024": { ca: "Taula Auxiliar Cilíndrica en Llautó", en: "Cylindrical Brass Side Table", zh: "圆柱形黄铜边几" },
  "furn-025": { ca: "Taula de Te Japonesa Tatami", en: "Japanese Tatami Tea Table", zh: "日式榻榻米茶桌" },
  "furn-026": { ca: "Taula Menjador Oval Escultòrica", en: "Sculptural Oval Dining Table", zh: "雕塑感椭圆形餐桌" },
  "furn-027": { ca: "Consola Suspesa Umbral", en: "Umbral Floating Console Table", zh: "Umbral 悬浮玄关壁案" },
  "furn-028": { ca: "Taula Centre Asimètrica Tronc Viu", en: "Live-Edge Asymmetric Coffee Table", zh: "不规则原木实木边缘茶几" },
  "furn-029": { ca: "Taula Rodona Bauhaus Trípode", en: "Bauhaus Tripod Round Table", zh: "包豪斯三足圆形餐桌" },
  "furn-030": { ca: "Taula Auxiliar Zenit Travertí", en: "Zenit Travertine Side Table", zh: "Zenit 洞石边几" },
  "furn-031": { ca: "Taula Menjador Noguera Canaletto", en: "Canaletto Walnut Dining Table", zh: "卡纳莱托胡桃木餐桌" },
  "furn-032": { ca: "Taula Centre Niu Vidre Estriat", en: "Fluted Glass Nesting Coffee Tables", zh: "长虹条纹玻璃子母茶几套组" },
  "furn-033": { ca: "Velador de Terrassa Forjat", en: "Wrought Iron Terrace Bistro Table", zh: "锻铁户外露台圆几" },
  "furn-034": { ca: "Escriptori Compacte Mural Plegable", en: "Wall-Mounted Folding Desk", zh: "壁挂折叠紧凑型写字台" },
  "furn-035": { ca: "Taula Centre Doble Alçada Japandi", en: "Japandi Dual-Height Coffee Table", zh: "日式Japandi高低双层茶几" },
  "furn-036": { ca: "Taula Menjador Monòlit Formigó", en: "Monolith Concrete Dining Table", zh: "混凝土清水巨石餐桌" },
  "furn-037": { ca: "Taula Auxiliar Escultòrica Argila", en: "Sculptural Terracotta Side Table", zh: "雕塑感赤陶边几" },
  "furn-038": { ca: "Taula Centre Bloc Travertí Enrasat", en: "Flush Travertine Block Coffee Table", zh: "平接纯块体洞石茶几" },
  "furn-039": { ca: "Escriptori d'Estudi Noguera Pura", en: "Solid Walnut Study Desk", zh: "纯正实木胡桃木书桌" },
  "furn-040": { ca: "Taula Racó Te Ceràmica & Roure", en: "Ceramic & Oak Tea Corner Table", zh: "陶瓷与橡木角隅茶桌" },
  "furn-041": { ca: "Aparador Coplanar Noguera i Travertí", en: "Coplanar Walnut & Travertine Sideboard", zh: "胡桃木与洞石共面移门餐边柜" },
  "furn-042": { ca: "Llibreria Reticular Modular Grid", en: "Modular Grid Bookcase", zh: "网格模数化开放式书架" },
  "furn-043": { ca: "Prestatgeria Flotant Suspesa", en: "Suspended Floating Shelves", zh: "悬浮壁挂轻盈置物架" },
  "furn-044": { ca: "Alhacena Rústica de Fusta Centenària", en: "Centenary Wood Rustic Cupboard", zh: "百年老木质朴立柜" },
  "furn-045": { ca: "Llibreria Loft Perfils d'Acer", en: "Steel Profile Loft Bookcase", zh: "轻钢型材工业风格书架" },
  "furn-046": { ca: "Còmoda 6 Calaixos Enrasats", en: "6-Drawer Flush Dresser", zh: "纯平无把手6抽屉斗柜" },
  "furn-047": { ca: "Vitrina Transparent Acer i Cristall", en: "Steel & Glass Display Cabinet", zh: "通透钢玻展示陈列柜" },
  "furn-048": { ca: "Plint Contenidor Pedra Calcària", en: "Limestone Storage Plinth", zh: "石灰石基座储纳台" },
  "furn-049": { ca: "Aparador Zen Portes Shoji", en: "Shoji Screen Zen Sideboard", zh: "障子纸移门禅意矮柜" },
  "furn-050": { ca: "Baül Rústic amb Ferratges Forjats", en: "Rustic Trunk with Wrought Iron Fittings", zh: "锻铁五金复古实木收纳箱" },
  "furn-051": { ca: "Moble Bar Suspès Travertí", en: "Floating Travertine Bar Cabinet", zh: "壁挂悬浮洞石酒柜" },
  "furn-052": { ca: "Llibreria Baixa Divisòria Oberta", en: "Open Low Room Divider Bookcase", zh: "通透开放式矮款空间隔断书架" },
  "furn-053": { ca: "Xifonier Esvelt 5 Calaixos", en: "Slender 5-Drawer Chiffonier", zh: "纤巧5抽屉高斗柜" },
  "furn-054": { ca: "Consola Magatzem Entrada Rústica", en: "Rustic Entryway Storage Console", zh: "玄关质朴收纳案几" },
  "furn-055": { ca: "Mòdul Emmagatzematge Apilable Box", en: "Stackable Box Storage Module", zh: "Box 组合式叠放收纳箱格" },
  "furn-056": { ca: "Aparador Monolític Esculpit", en: "Sculpted Monolith Sideboard", zh: "雕塑质感整体边柜" },
  "furn-057": { ca: "Prestatge Repisa Corruda Extraplana", en: "Ultra-Slim Continuous Ledge Shelf", zh: "超薄连贯通长展示隔板" },
  "furn-058": { ca: "Còmoda Japandi Portes Corredisses", en: "Japandi Sliding Door Dresser", zh: "Japandi 移门储物矮柜" },
  "furn-059": { ca: "Arxivador Tècnic amb Gavetes", en: "Technical Drawer Filing Cabinet", zh: "工程制图抽屉式档案收纳柜" },
  "furn-060": { ca: "Alhacena Vaixellera Calada Washi", en: "Washi Paper Lattice China Cabinet", zh: "和纸镂空格栅餐具储藏柜" },
  "furn-061": { ca: "Llum Suspensió Vel Washi", en: "Washi Veil Pendant Lamp", zh: "和纸轻纱垂吊灯" },
  "furn-062": { ca: "Aplisc Rasant Terracota Bruna", en: "Warm Terracotta Grazing Wall Sconce", zh: "暖棕赤陶洗墙壁灯" },
  "furn-063": { ca: "Llum de Peu Arc Llautó Massís", en: "Solid Brass Arc Floor Lamp", zh: "实心黄铜钓鱼落地灯" },
  "furn-064": { ca: "Focus Tècnic Orientable Taller", en: "Adjustable Workshop Spotlight", zh: "工坊定向调节射灯" },
  "furn-065": { ca: "Sobremesa Ceràmica Esmaltada Ocre", en: "Ochre Glazed Ceramic Table Lamp", zh: "赭黄色釉面陶瓷台灯" },
  "furn-066": { ca: "Campana Zenital Nòrdica Difusa", en: "Nordic Diffused Dome Pendant", zh: "北欧漫射伞形吊灯" },
  "furn-067": { ca: "Columna de Terra Andon Zen", en: "Zen Andon Floor Column Lantern", zh: "行灯立柱式落地禅意纸灯" },
  "furn-068": { ca: "Llum Lineal Bauhaus de Taller", en: "Bauhaus Workshop Linear Pendant", zh: "包豪斯线条工坊吊灯" },
  "furn-069": { ca: "Aplisc Escultòric Calcària Natural", en: "Natural Limestone Sculptural Sconce", zh: "天然石灰石雕塑壁灯" },
  "furn-070": { ca: "Fanalet Wabi-Sabi Argila Fumada", en: "Smoked Clay Wabi-Sabi Lantern", zh: "烟熏灰陶侘寂灯笼" },
  "furn-071": { ca: "Llum Suspensió Dom Ceràmic", en: "Ceramic Dome Pendant Lamp", zh: "陶瓷圆顶悬吊灯" },
  "furn-072": { ca: "Aplisc Doble Feix Indirecte", en: "Dual-Beam Indirect Wall Sconce", zh: "双向出光间接壁灯" },
  "furn-073": { ca: "Llum Sobremesa Esfera Travertí", en: "Travertine Sphere Table Lamp", zh: "洞石球形台灯" },
  "furn-074": { ca: "Peu de Saló Fust Esvelt Negre", en: "Slender Black Stem Floor Lamp", zh: "纤细黑轴客厅落地灯" },
  "furn-075": { ca: "Penjant Cilíndric Roure Massís", en: "Solid Oak Cylindrical Pendant", zh: "实木橡木圆柱吊灯" },
  "furn-076": { ca: "Aplisc Articulat Lectura Cuir", en: "Articulated Leather Reading Sconce", zh: "皮质关节阅读壁灯" },
  "furn-077": { ca: "Llum de Taula Plisada Washi", en: "Pleated Washi Paper Table Lamp", zh: "和纸折褶艺术台灯" },
  "furn-078": { ca: "Aplisc Monòlit Pedra Campaspero", en: "Campaspero Stone Monolith Sconce", zh: "坎帕斯佩罗石雕刻壁灯" },
  "furn-079": { ca: "Lluminària Penjant Corda i Fang", en: "Rope & Terracotta Pendant Light", zh: "绳编与陶土挂式灯具" },
  "furn-080": { ca: "Sobremesa Escultòrica Cúpula Zen", en: "Zen Dome Sculptural Table Lamp", zh: "禅意穹顶雕塑台灯" },
  "furn-081": { ca: "Llit Flotant Tatami Kyoto", en: "Kyoto Floating Tatami Bed", zh: "京都悬浮榻榻米大床" },
  "furn-082": { ca: "Capçal Acústic Enllistonat Lli", en: "Slatted Acoustic Linen Headboard", zh: "亚麻吸音格栅床头板" },
  "furn-083": { ca: "Tauleta de Nit Bloc Travertí", en: "Travertine Block Nightstand", zh: "洞石整体床头柜" },
  "furn-084": { ca: "Tauleta Nit Volada Suspesa", en: "Floating Cantilever Nightstand", zh: "悬挑壁挂轻盈床头几" },
  "furn-085": { ca: "Galan de Nit Acer i Cuir", en: "Steel & Leather Valet Stand", zh: "钢与皮革男士西服衣帽架" },
  "furn-086": { ca: "Banc Peu de Llit Llana Bouclé", en: "Bouclé Wool Bed-End Bench", zh: "羊羔绒羊毛床尾长凳" },
  "furn-087": { ca: "Llit Dòsel Minimalista Línies Pures", en: "Pure Lines Minimalist Canopy Bed", zh: "极简四柱纯线条天篷床" },
  "furn-088": { ca: "Tocador Extraplà Pedra i Mirall", en: "Ultra-Slim Stone & Mirror Vanity", zh: "超薄石材梳妆台配梳妆镜" },
  "furn-089": { ca: "Mirall Joier Pivotant Noguera", en: "Pivoting Walnut Jewelry Mirror", zh: "胡桃木旋转全身首饰镜" },
  "furn-090": { ca: "Capçal Rústic Olivera Centenària", en: "Centenary Olive Wood Rustic Headboard", zh: "百年橄榄木质朴自然边床头板" },
  "furn-091": { ca: "Llit Plataforma Roure Baixes Cotes", en: "Low-Profile Oak Platform Bed", zh: "低姿橡木地台式矮床" },
  "furn-092": { ca: "Tauleta Cilíndrica Fusta de Cedre", en: "Cylindrical Cedar Wood Bedside Table", zh: "香柏木圆柱床头小几" },
  "furn-093": { ca: "Capçal Entapissat Lli Encoixinat", en: "Quilted Linen Upholstered Headboard", zh: "绗缝软包亚麻床头靠背" },
  "furn-094": { ca: "Tauleta de Nit Industrial Xapa", en: "Sheet Metal Industrial Nightstand", zh: "复古钢板工业风床头柜" },
  "furn-095": { ca: "Llit Dòsel de Fusta i Lli", en: "Wood & Linen Canopy Bed", zh: "实木亚麻幔帐大床" },
  "furn-096": { ca: "Comodí Sabater Estret Enrasat", en: "Flush Narrow Shoe Cabinet Dresser", zh: "窄体平齐隐形鞋柜斗柜" },
  "furn-097": { ca: "Tauleta Monolítica Calcària Esmolada", en: "Honed Limestone Monolithic Nightstand", zh: "哑光研磨石灰石整体床头几" },
  "furn-098": { ca: "Banc Descalçador Cuir Trenat", en: "Braided Leather Dressing Bench", zh: "编织植鞣皮革换鞋长凳" },
  "furn-099": { ca: "Capçal Biombol Plegable Washi", en: "Folding Washi Screen Headboard", zh: "和纸折叠屏风式床头" },
  "furn-100": { ca: "Tauleta Rústica Tronc de Castanyer", en: "Rustic Chestnut Tree Trunk End Table", zh: "质朴栗木整木年轮小几" },
  "furn-101": { ca: "Catifa Teixida Llana Duna", en: "Duna Handwoven Wool Rug", zh: "沙丘纹手工编织纯羊毛地毯" },
  "furn-102": { ca: "Biomb Enllistonat Shoji Tres Fulles", en: "Three-Panel Shoji Slatted Screen", zh: "三扇和风隔栅障子折叠屏风" },
  "furn-103": { ca: "Mirall Monumental Terra Arc", en: "Arched Floor Standing Monumental Mirror", zh: "落地拱形巨幅建筑全身穿衣镜" },
  "furn-104": { ca: "Gerro Ceràmic Negre Escultural", en: "Sculptural Black Ceramic Vessel", zh: "黑色陶艺雕塑感大花器" },
  "furn-105": { ca: "Plint Escultòric en Travertí Pur", en: "Pure Travertine Sculptural Plinth", zh: "纯洞石艺术展台基座" },
  "furn-106": { ca: "Tapís Mural Filat d'Autor", en: "Artisan Hand-Spun Wall Tapestry", zh: "大师手纺壁挂编织艺术挂毯" },
  "furn-107": { ca: "Joc Coixins Bouclé Geomètrics", en: "Geometric Bouclé Cushion Set", zh: "几何羊羔绒靠枕套组" },
  "furn-108": { ca: "Revister de Cuir Cosit Taller", en: "Hand-Stitched Leather Magazine Rack", zh: "手工缝线皮革杂志架" },
  "furn-109": { ca: "Centre de Taula Petri Vado", en: "Vado Carved Stone Centerpiece", zh: "Vado 浅槽原石茶几果盘摆件" },
  "furn-110": { ca: "Catifa Mediterrània Llana i Jute", en: "Mediterranean Wool & Jute Rug", zh: "地中海羊毛与天然黄麻地毯" },
  "furn-111": { ca: "Mirall Circular sense Marc Calcària", en: "Frameless Circular Limestone Mirror", zh: "石灰石底托无框圆形梳妆镜" },
  "furn-112": { ca: "Penjador de Peu Tija Escultòric", en: "Sculptural Stem Coat Rack", zh: "雕塑枝干立式衣帽架" },
  "furn-113": { ca: "Gerro Alt en Terracota Porosa", en: "Tall Porous Terracotta Vessel", zh: "多孔赤陶素烧高瓶" },
  "furn-114": { ca: "Manta Niu Llana Merina Gruixuda", en: "Chunky Merino Wool Throw Blanket", zh: "美利奴粗羊毛蜂巢保暖披毯" },
  "furn-115": { ca: "Biomb de Roure Enllistonat Divisori", en: "Slatted Oak Room Divider Screen", zh: "橡木格栅空间分隔艺术屏风" },
  "furn-116": { ca: "Coixí Cilíndric Tatami Rotllo", en: "Tatami Roll Bolster Cushion", zh: "榻榻米圆柱形护腰靠枕" },
  "furn-117": { ca: "Safata Monolítica en Travertí", en: "Monolithic Travertine Tray", zh: "一体式洞石雕琢置物托盘" },
  "furn-118": { ca: "Escultura Mural Enllistonada de Cedre", en: "Slatted Cedar Wall Sculpture", zh: "雪松木实木格栅立体壁挂雕塑" },
  "furn-119": { ca: "Gerro Rústic Modelat al Torn", en: "Wheel-Thrown Rustic Ceramic Vase", zh: "拉胚手工质朴陶艺花瓶" },
  "furn-120": { ca: "Cistella Revister Cuir i Roure", en: "Leather & Oak Magazine Basket", zh: "实木橡木与皮革手提杂志篮" }
};

const LANG_CONFIGS = {
  es: {
    imageUrl: "/foto mueble.png",
    formatDesc: (style, mats) => `Pieza arquitectónica de autor concebida para proyectar una atmósfera ${style.toLowerCase()}. Combina ${mats.join(" y ").toLowerCase()} con proporciones equilibradas.`,
    formatDetail: (w, h, d, room) => `Cotas arquitectónicas de plano: ${w} cm (Ancho) × ${h} cm (Alto) × ${d} cm (Profundidad). Ensamble de precisión idóneo para ${room}.`,
    formatRag: (name, cat, room, style, tags, mats, color, w, h, d, desc, detail) =>
      `${name}. Categoría: ${cat}. Estancia idónea: ${room}. Estilo: ${style}. Etiquetas de diseño: ${tags.join(", ")}. Materiales certificados: ${mats.join(", ")}. Acabado cromático: ${color}. Dimensiones técnicas: ${w} cm de ancho por ${h} cm de alto por ${d} cm de fondo. ${desc} ${detail}`
  },
  ca: {
    imageUrl: "/foto moble.png",
    formatDesc: (style, mats) => `Peça arquitectònica d'autor concebuda per projectar una atmosfera ${style.toLowerCase()}. Combina ${mats.join(" i ").toLowerCase()} amb proporcions equilibrades.`,
    formatDetail: (w, h, d, room) => `Cotes arquitectòniques de pla: ${w} cm (Amplada) × ${h} cm (Alçada) × ${d} cm (Profunditat). Encaix de precisió idoni per a ${room}.`,
    formatRag: (name, cat, room, style, tags, mats, color, w, h, d, desc, detail) =>
      `${name}. Categoria: ${cat}. Estança idònia: ${room}. Estil: ${style}. Etiquetes de disseny: ${tags.join(", ")}. Materials certificats: ${mats.join(", ")}. Acabat cromàtic: ${color}. Dimensions tècniques: ${w} cm d'amplada per ${h} cm d'alçada per ${d} cm de fons. ${desc} ${detail}`
  },
  en: {
    imageUrl: "/photo furniture.png",
    formatDesc: (style, mats) => `Signature architectural piece designed to evoke a ${style.toLowerCase()} atmosphere. Combines ${mats.join(" and ").toLowerCase()} with balanced proportions.`,
    formatDetail: (w, h, d, room) => `Architectural blueprint dimensions: ${w} cm (Width) × ${h} cm (Height) × ${d} cm (Depth). Precision joinery ideal for ${room}.`,
    formatRag: (name, cat, room, style, tags, mats, color, w, h, d, desc, detail) =>
      `${name}. Category: ${cat}. Ideal space: ${room}. Style: ${style}. Design tags: ${tags.join(", ")}. Certified materials: ${mats.join(", ")}. Color finish: ${color}. Technical dimensions: ${w} cm wide by ${h} cm high by ${d} cm deep. ${desc} ${detail}`
  },
  zh: {
    imageUrl: "/jiājù zhàopiàn.png",
    formatDesc: (style, mats) => `大师级原创建筑家具，旨在营造${style}的空间氛围。精妙融合${mats.join("与")}，呈现均衡尺度比例。`,
    formatDetail: (w, h, d, room) => `建筑工程图纸标高尺寸：${w} cm（宽）× ${h} cm（高）× ${d} cm（深）。精工榫卯结构，完美契合${room}。`,
    formatRag: (name, cat, room, style, tags, mats, color, w, h, d, desc, detail) =>
      `${name}。类别：${cat}。适用空间：${room}。风格：${style}。设计标签：${tags.join("、")}。认证材质：${mats.join("、")}。色彩外观：${color}。技术尺寸：宽 ${w} cm，高 ${h} cm，深 ${d} cm。${desc} ${detail}`
  }
};

function buildCatalog(lang) {
  const conf = LANG_CONFIGS[lang];
  return FURNITURE_CATALOG_RAG.map(item => {
    const isEs = lang === 'es';
    const name = isEs ? item.name : (NAME_MAP[item.id]?.[lang] || item.name);
    const category = isEs ? item.category : (CATEGORY_MAP[item.category]?.[lang] || item.category);
    const room = isEs ? item.room : (ROOM_MAP[item.room]?.[lang] || item.room);
    const style = isEs ? item.style : (STYLE_MAP[item.style]?.[lang] || item.style);
    const color = isEs ? item.color : (COLOR_MAP[item.color]?.[lang] || item.color);
    const materials = isEs ? [...item.materials] : item.materials.map(m => MATERIAL_MAP[m]?.[lang] || m);
    const tags = isEs ? [...item.tags] : item.tags.map(t => TAG_MAP[t]?.[lang] || t);
    const { width, height, depth } = item.dimensions;

    const description = isEs ? item.description : conf.formatDesc(style, materials);
    const architecturalDetail = isEs ? item.architecturalDetail : conf.formatDetail(width, height, depth, room);
    const ragContext = isEs ? item.ragContext : conf.formatRag(name, category, room, style, tags, materials, color, width, height, depth, description, architecturalDetail);

    return {
      id: item.id,
      name,
      category,
      categoryKey: item.category,
      room,
      roomKey: item.room,
      price: item.price,
      style,
      styleKey: item.style,
      color,
      paletteKey: item.paletteKey,
      dimensions: { ...item.dimensions },
      materials,
      imageUrl: conf.imageUrl,
      description,
      architecturalDetail,
      tags,
      ragContext
    };
  });
}

const catalogsDir = path.resolve(rootDir, 'src', 'data', 'catalogs');
if (!fs.existsSync(catalogsDir)) {
  fs.mkdirSync(catalogsDir, { recursive: true });
}

for (const lang of ['es', 'ca', 'en', 'zh']) {
  const catalog = buildCatalog(lang);
  const varName = `CATALOG_${lang.toUpperCase()}`;
  const code = `/**
 * Catálogo Curado de Mobiliario Arquitectónico (${lang.toUpperCase()})
 * Piezas: 120 | Categorías: 6 | Etiquetas: 4 a 6 por pieza
 */
export const ${varName} = ${JSON.stringify(catalog, null, 2)};
`;
  const filePath = path.join(catalogsDir, `catalog_${lang}.js`);
  fs.writeFileSync(filePath, code, 'utf-8');
  console.log(`Generated ${filePath} with ${catalog.length} items`);
}

const indexCode = `import { CATALOG_ES } from './catalog_es.js';
import { CATALOG_CA } from './catalog_ca.js';
import { CATALOG_EN } from './catalog_en.js';
import { CATALOG_ZH } from './catalog_zh.js';

export { CATALOG_ES, CATALOG_CA, CATALOG_EN, CATALOG_ZH };

export const CATALOGS_BY_LANG = {
  es: CATALOG_ES,
  ca: CATALOG_CA,
  en: CATALOG_EN,
  zh: CATALOG_ZH
};

export function getCatalogByLang(lang) {
  return CATALOGS_BY_LANG[lang] || CATALOGS_BY_LANG.es;
}
`;
fs.writeFileSync(path.join(catalogsDir, 'index.js'), indexCode, 'utf-8');
console.log('Generated index.js in catalogs directory');

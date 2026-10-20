/**
 * PARSER UNIVERSAL DE CSV PARA CATÁLOGOS DE MUEBLES
 * Compatible con delimitadores de coma o punto y coma (Excel ES),
 * y mapeo flexible de cabeceras en español e inglés.
 */

export class CsvCatalogParser {
  /**
   * Procesa el texto de un CSV y devuelve un array normalizado de FurnitureItem
   */
  static parse(csvText) {
    if (!csvText || typeof csvText !== "string") {
      throw new Error("El archivo CSV está vacío o no es válido.");
    }

    const lines = csvText
      .split(/\r\n|\n|\r/)
      .map(line => line.trim())
      .filter(line => line.length > 0);

    if (lines.length < 2) {
      throw new Error("El CSV debe contener al menos una cabecera y una fila de datos.");
    }

    // Detectar separador (coma o punto y coma)
    const headerLine = lines[0];
    const separator = headerLine.includes(";") ? ";" : ",";

    const rawHeaders = this.parseCsvLine(headerLine, separator).map(h =>
      h.toLowerCase().trim().replace(/['"]/g, "")
    );

    const headerMap = this.mapHeaders(rawHeaders);

    const items = [];
    const errors = [];

    for (let i = 1; i < lines.length; i++) {
      const lineText = lines[i];
      if (!lineText) continue;

      try {
        const values = this.parseCsvLine(lineText, separator);
        if (values.length < 2) continue;

        const rowData = {};
        rawHeaders.forEach((header, index) => {
          rowData[header] = values[index] ? values[index].trim() : "";
        });

        const item = this.normalizeItem(rowData, headerMap, i);
        if (item) {
          items.push(item);
        }
      } catch (err) {
        errors.push(`Línea ${i + 1}: ${err.message}`);
      }
    }

    if (items.length === 0) {
      throw new Error("No se pudo extraer ningún mueble válido del archivo CSV. Revisa el formato de las columnas.");
    }

    return {
      success: true,
      items,
      errors,
      totalParsed: items.length
    };
  }

  /**
   * Parsea una línea de CSV respetando comillas
   */
  static parseCsvLine(line, separator = ",") {
    const result = [];
    let current = "";
    let insideQuotes = false;

    for (let i = 0; i < line.length; i++) {
      const char = line[i];
      if (char === '"') {
        insideQuotes = !insideQuotes;
      } else if (char === separator && !insideQuotes) {
        result.push(current.trim());
        current = "";
      } else {
        current += char;
      }
    }
    result.push(current.trim());
    return result;
  }

  /**
   * Detecta y asocia los nombres de columna estándar
   */
  static mapHeaders(headers) {
    const findHeader = (candidates) => {
      return headers.find(h => candidates.some(c => h.includes(c))) || null;
    };

    return {
      name: findHeader(["nombre", "name", "producto", "mueble", "title", "item"]),
      category: findHeader(["categoria", "category", "tipo", "type"]),
      price: findHeader(["precio", "price", "cost", "coste", "pvp"]),
      style: findHeader(["estilo", "style", "tendencia"]),
      color: findHeader(["color", "colour", "tono", "tonalidad"]),
      room: findHeader(["estancia", "habitacion", "room", "espacio", "zona"]),
      materials: findHeader(["material", "materiales", "materials", "acabado"]),
      image: findHeader(["imagen", "image", "url", "foto", "photo", "link"]),
      // Dimensiones separadas
      width: findHeader(["ancho", "width", "w"]),
      height: findHeader(["alto", "height", "h"]),
      depth: findHeader(["profund", "fondo", "depth", "d", "largo"]),
      // O dimensión unificada
      dimensions: findHeader(["dimension", "medidas", "cotas", "tamano", "size"])
    };
  }

  /**
   * Normaliza una fila a la estructura FurnitureItem
   */
  static normalizeItem(row, map, index) {
    const name = (map.name && row[map.name]) || `Mueble de Catálogo #${index}`;
    
    // Parseo de precio numérico (admite "450 €", "450.00", "450,50")
    let price = 500;
    if (map.price && row[map.price]) {
      const cleanPrice = row[map.price].replace(/[^0-9.,]/g, "").replace(",", ".");
      price = parseFloat(cleanPrice) || 500;
    }

    const style = (map.style && row[map.style]) || "Contemporáneo";
    const category = (map.category && row[map.category]) || "Mobiliario";
    const color = (map.color && row[map.color]) || "Madera Natural";
    const room = (map.room && row[map.room].toLowerCase()) || "salón";

    // Parseo de dimensiones
    let width = 120, height = 75, depth = 60;
    if (map.dimensions && row[map.dimensions]) {
      const dimMatch = row[map.dimensions].match(/(\d+)\s*[xX*×]\s*(\d+)(?:\s*[xX*×]\s*(\d+))?/);
      if (dimMatch) {
        width = parseInt(dimMatch[1], 10);
        height = parseInt(dimMatch[2], 10);
        depth = dimMatch[3] ? parseInt(dimMatch[3], 10) : 50;
      }
    } else {
      if (map.width && row[map.width]) width = parseInt(row[map.width], 10) || 120;
      if (map.height && row[map.height]) height = parseInt(row[map.height], 10) || 75;
      if (map.depth && row[map.depth]) depth = parseInt(row[map.depth], 10) || 60;
    }

    // Materiales
    let materials = ["Madera tratada", "Acabado mate"];
    if (map.materials && row[map.materials]) {
      materials = row[map.materials].split(/[,/|-]/).map(m => m.trim()).filter(Boolean);
    }

    // Imagen
    let imageUrl = "https://images.unsplash.com/photo-1555041469-a586c61ea9bc?auto=format&fit=crop&w=800&q=80";
    if (map.image && row[map.image] && row[map.image].startsWith("http")) {
      imageUrl = row[map.image];
    }

    // Mapeo de paleta de color para el matching
    const paletteKey = this.inferPaletteKey(color, style);

    return {
      id: `custom-csv-${index}-${Date.now().toString(36)}`,
      name,
      category,
      room,
      price: Math.round(price),
      style,
      color,
      paletteKey,
      dimensions: { width, height, depth },
      materials,
      imageUrl,
      description: `Pieza catalogada para ${room}. Acabado en ${color.toLowerCase()} con estética ${style}.`,
      architecturalDetail: `Cotas técnicas: ${width} cm (Ancho) × ${height} cm (Alto) × ${depth} cm (Fondo).`
    };
  }

  /**
   * Infiere la clave de paleta interna
   */
  static inferPaletteKey(color, style) {
    const text = (color + " " + style).toLowerCase();
    if (text.includes("terra") || text.includes("arcilla") || text.includes("roj")) return "terracota";
    if (text.includes("lino") || text.includes("blanco") || text.includes("crudo") || text.includes("beige")) return "lino";
    if (text.includes("roble") || text.includes("fresno") || text.includes("claro")) return "roble";
    if (text.includes("nogal") || text.includes("oscuro") || text.includes("marron")) return "nogal";
    if (text.includes("oliva") || text.includes("verde") || text.includes("musgo")) return "oliva";
    if (text.includes("ocre") || text.includes("siena") || text.includes("dorado") || text.includes("mostaza")) return "ocre";
    if (text.includes("piedra") || text.includes("caliza") || text.includes("arena")) return "caliza";
    return "lino";
  }

  /**
   * Genera el contenido de una plantilla CSV descargable
   */
  static generateSampleCsv() {
    return `nombre,categoria,estancia,precio,estilo,color,ancho,alto,profundidad,materiales,imagen
Mesa de Comedor Bauhaus,Mesas,comedor,1150,Nórdico,Roble Claro,200,75,90,Roble macizo / Acero blanco,https://images.unsplash.com/photo-1615066390971-03e4e1c36ddf?auto=format&fit=crop&w=800&q=80
Sillón Terracota Atrio,Asientos,salón,540,Minimalismo Cálido,Terracota,85,76,80,Tejido bouclé / Fresno,https://images.unsplash.com/photo-1586023492125-27b2c045efd7?auto=format&fit=crop&w=800&q=80
Aparador Bajo Arcos,Almacenaje,salón,1380,Mid-Century Modern,Nogal Ahumado,175,70,45,Nogal canaletto / Latón cepillado,https://images.unsplash.com/photo-1538688525198-9b88f6f53126?auto=format&fit=crop&w=800&q=80
Lámpara Colgante Velo,Iluminación,comedor,280,Japandi,Lino Natural,50,35,50,Lino crudo / Madera de cerezo,https://images.unsplash.com/photo-1513506003901-1e6a229e2d15?auto=format&fit=crop&w=800&q=80
Escritorio Suspendido Taller,Mesas,estudio,720,Industrial Sutil,Nogal Ahumado,140,75,65,Acero pavonado / Chapa de nogal,https://images.unsplash.com/photo-1518455027359-f3f8164ba6bd?auto=format&fit=crop&w=800&q=80`;
  }
}

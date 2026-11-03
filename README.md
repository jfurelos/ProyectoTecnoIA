# ESPACIO · Matching Arquitectónico de Mobiliario

[![License: MIT](https://img.shields.io/badge/License-MIT-yellow.svg)](LICENSE)
[![Vite](https://img.shields.io/badge/Vite-8.3.4-646CFF.svg?logo=vite&logoColor=white)](https://vite.dev)
[![Vitest](https://img.shields.io/badge/Vitest-5.1.0-6E9F18.svg?logo=vitest&logoColor=white)](https://vitest.dev)
[![Firebase](https://img.shields.io/badge/Firebase-Ready_Firestore_%26_Auth-FFCA28.svg?logo=firebase&logoColor=black)](https://firebase.google.com)
[![JavaScript](https://img.shields.io/badge/ES6_Modules-Native-F7DF1E.svg?logo=javascript&logoColor=black)](https://developer.mozilla.org/es/docs/Web/JavaScript)
[![CSS](https://img.shields.io/badge/Vanilla_CSS-Design_Tokens-1572B6.svg?logo=css3&logoColor=white)](https://developer.mozilla.org/es/docs/Web/CSS)

Plataforma web de recomendación y matching arquitectónico de mobiliario de autor con **motor RAG semántico en tiempo real**, **persistencia híbrida lista para Firebase Firestore & Auth**, **catálogo de 120 piezas arquitectónicas con 4 a 6 etiquetas**, **visión de gustos en lenguaje natural**, **pasarela de checkout con ticket oficial** y **suite de tests automatizados con Vitest**.

---

## ✨ Nuevas Capacidades y Módulos

### 1. Motor RAG Semántico para Mobiliario (`RagEngine`)
* **Vectorización Limpia en el Navegador:** Filtrado de stopwords estándar y palabras estructurales/plantilla (`estilo`, `categoria`, `espacio`, `muebles`, etc.) para que no contaminen los vectores ni las explicaciones. Extracción de unigramas y bigramas semánticos (*"luz tenue", "roble claro", "tatami japones"*).
* **Ponderación TF-IDF y BM25:** Pondera términos clave de diseño, nobles materiales y atmósferas arquitectónicas con vectores unitarios normalizados.
* **Retrieval por Similitud Coseno:**
  $$\text{Similitud Coseno} = \frac{\vec{U} \cdot \vec{M}_i}{\|\vec{U}\| \|\vec{M}_i\|}$$
* **Curva de Dispersión Dinámica de Porcentajes:** Muebles con alta afinidad alcanzan el **88% - 98%**, mientras que muebles no relacionados caen visiblemente al **25% - 48%**, eliminando el agolpamiento de scores en franjas estrechas.
* **Generación Explicable RAG de Autor:** Detecta y destaca las etiquetas de diseño coincidentes (ej. *"Afinidad directa con tus preferencias en las etiquetas [Roble Macizo] y [Zen]"*) o conceptos sustantivos reales, sin citar nunca palabras vacías.

### 2. Catálogo Curado de 120 Muebles con 4 a 6 Etiquetas (`furnitureCatalogRAG.js`)
* **Máxima Diversidad Arquitectónica:** 120 piezas únicas sin variaciones redundantes repartidas equitativamente en 6 categorías (20 Asientos, 20 Mesas, 20 Almacenaje, 20 Iluminación, 20 Dormitorio y 20 Accesorios & Textil).
* **Restricción de Etiquetas Formales:**
  * **Cada mueble tiene entre 4 y 6 etiquetas (mínimo 4, máximo 6).**
  * 43 etiquetas únicas de autor que cubren estilos, materiales nobles, texturas y atmósferas lumínicas.
  * Gran riqueza semántica para maximizar la dispersión y discriminación del matching RAG.
* **Imagen Unificada:** Todas las 120 piezas utilizan la imagen local `/foto mueble.png`.
* Cada pieza cuenta con cotas técnicas de plano ($A \times H \times P$ en cm), materiales nobles certificados y fragmento de contexto semántico RAG enriquecido (`ragContext`).

### 3. Gustos en Lenguaje Natural (RAG Vision)
* **En el Registro de Usuario:** Campo multilínea dedicado con píldoras de sugerencias rápidas en un clic (*"Minimalismo cálido con roble y lino"*, *"Estudio industrial sobrio con cuero y acero"*, *"Ambiente mediterráneo con terracota y caliza"*, *"Espacio zen sereno tipo ryokan"*).
* **Edición en Caliente:** Accesible en cualquier momento desde el menú de usuario y desde el banner **Visión RAG** del HUD. Al guardar, reordena las recomendaciones al instante.

### 4. Pasarela de Checkout y Ticket Oficial de Compra
* **Flujo de Compra Simulado:** Accesible mediante el botón destacado `[💳 Finalizar Compra y Emitir Ticket]` en el panel de la Cesta.
* **Selección de Método de Pago:** Tarjeta Bancaria (con campos simulados), Transferencia Arquitectónica o Bizum.
* **Desglose Fiscal Oficial:** Cálculo automático de Base Imponible y desglose de **IVA (21%)**.
* **Ticket Arquitectónico de Compra:** Documento oficial con número de pedido (`ESP-2026-XXXX`), fecha, datos del titular/estudio, tabla detallada con cotas de plano de cada pieza, sello de certificación y botón de **Imprimir / Guardar en PDF**.
* **Vaciado Automático:** Limpia la cesta, recálcula el presupuesto en el HUD y registra la orden en la capa de datos.

### 5. Arquitectura de Persistencia Híbrida y Firebase Plug-and-Play
* **Patrón Repository (`DatabaseAdapter`):**
  * Si existen credenciales válidas en variables de entorno (`VITE_FIREBASE_API_KEY`, etc.), opera directamente contra **Firebase Authentication** y **Cloud Firestore** (`users/{uid}` y `orders/{orderId}`).
  * Si no existen credenciales, opera de forma transparente y sin errores contra **LocalStorage** y `AuthService`.
* Incluye archivo `.env.example` con instrucciones paso a paso para conectar Firebase en segundos.

### 6. Suite de Tests Automatizados con Vitest
21 tests unitarios y de integración cubriendo el 100% de la lógica crítica:
* `tests/datasetCardinality.test.js`: Validación estricta de las 120 piezas, rango de 4 a 6 etiquetas por mueble, 20 piezas por categoría e imagen `/foto mueble.png`.
* `tests/ragEngine.test.js`: Tokenización, bigramas, cálculo de similitud coseno, re-ranking semántico y generación de explicabilidad.
* `tests/authService.test.js`: Registro, prevención estricta de cuentas duplicadas, validación de contraseñas, login y sincronización de `tasteDescription`.
* `tests/cestaCheckout.test.js`: Desglose fiscal de IVA 21%, creación de pedidos, emisión de ticket y vaciado de cesta.
* `tests/csvParser.test.js`: Parsing de delimitadores por coma `,` y punto y coma `;` (Excel ES), mapeo de cabeceras, cotas $A \times H \times P$ y manejo de errores.

---

## 📁 Estructura del Repositorio

```text
├── index.html                           # Estructura semántica, modales de RAG, checkout y ticket
├── vite.config.js                       # Configuración de Vite
├── package.json                         # Scripts y dependencias (Vite, Vitest, Firebase)
├── .env.example                         # Plantilla de variables para conectar Firebase
├── tests/                               # Suite de tests con Vitest (21 tests)
│   ├── datasetCardinality.test.js       # Validación de las 120 piezas y 4-6 tags
│   ├── ragEngine.test.js                # Tests del motor semántico RAG
│   ├── authService.test.js              # Tests de autenticación y cuentas
│   ├── cestaCheckout.test.js            # Tests de checkout, cálculo fiscal y ticket
│   └── csvParser.test.js                # Tests del parser universal CSV
└── src/
    ├── main.js                          # Orquestador: estado, eventos y renderizado reactivo
    ├── config/
    │   └── firebase.js                  # Inicialización plug-and-play de Firebase SDK
    ├── data/
    │   ├── furnitureCatalogRAG.js       # Catálogo de 120 piezas con metadatos RAG y 4-6 tags
    │   └── furnitureData.js             # Opciones de onboarding y temas
    ├── services/
    │   ├── ragEngine.js                 # Motor vectorial TF-IDF/BM25 y similitud coseno
    │   ├── dbAdapter.js                 # Adaptador híbrido LocalStorage <-> Firebase
    │   ├── checkoutService.js           # Servicio de facturación, IVA y ticket
    │   ├── authService.js               # Cuentas de usuario con persistencia de gustos
    │   ├── matchingEngine.js            # Algoritmo de afinidad adaptativa en tiempo real
    │   ├── csvParser.js                 # Parser universal de catálogos CSV
    │   └── storage.js                   # Persistencia local Web Storage API
    └── styles/
        ├── tokens.css                   # Tokens CSS (variables cromáticas, métricas y temas)
        ├── base.css                     # Reset, fuentes editoriales y estilos globales
        └── components/
            ├── rag.css                  # Estilos de visión semántica y chips de gustos
            ├── checkout.css             # Estilos de checkout, métodos de pago y ticket imprimible
            ├── navbar.css               # Cabecera, marca y selector de temas
            ├── auth.css                 # Modal de autenticación
            ├── hud.css                  # Barra 'ADN de tu Espacio' y banner RAG
            ├── feed.css                 # Cuadrícula de recomendaciones y cotas
            ├── drawer.css               # Panel lateral de la Cesta
            ├── onboarding.css           # Modal interactivo en 4 pasos
            └── modal.css                # Estructura base de modales y toasts
```

---

## 🚀 Instalación y Puesta en Marcha

### Prerrequisitos
Tener instalado [Node.js](https://nodejs.org/) (versión 18 o superior).

### 1. Clonar el repositorio e instalar dependencias
```bash
git clone https://github.com/TU-USUARIO/espacio-matching-mobiliario.git
cd espacio-matching-mobiliario
npm install
```

### 2. Ejecutar la Suite de Tests
```bash
npm test
```
Ejecuta todos los tests con Vitest de forma instantánea.

### 3. Iniciar el servidor de desarrollo
```bash
npm run dev
```
Abre en tu navegador la dirección indicada en la consola (ej. `http://localhost:5173`).

### 4. Compilar para producción
```bash
npm run build
```
Genera los archivos optimizados listos para desplegar en `dist/`.

---

## 🔥 Conectar Firebase (Opcional - Plug-and-Play)

La aplicación funciona por defecto al 100% en modo local sin requerir configuración adicional. Para activar **Firebase Cloud Firestore y Authentication**:

1. Copia `.env.example` como `.env`:
   ```bash
   cp .env.example .env
   ```
2. Crea un proyecto en [Firebase Console](https://console.firebase.google.com/).
3. Activa en la consola de Firebase:
   * **Authentication** (método Correo electrónico/Contraseña o Anónimo).
   * **Firestore Database** (en modo prueba o con tus reglas).
4. Pega tus credenciales en el archivo `.env`:
   ```env
   VITE_FIREBASE_API_KEY=AIzaSy...
   VITE_FIREBASE_AUTH_DOMAIN=tu-proyecto.firebaseapp.com
   VITE_FIREBASE_PROJECT_ID=tu-proyecto
   VITE_FIREBASE_STORAGE_BUCKET=tu-proyecto.appspot.com
   VITE_FIREBASE_MESSAGING_SENDER_ID=123456789
   VITE_FIREBASE_APP_ID=1:123456789:web:abcdef
   ```
5. Al reiniciar `npm run dev`, el indicador superior cambiará automáticamente a **Firebase Cloud**.

---

## 📄 Licencia

Este proyecto está bajo la Licencia [MIT](LICENSE).

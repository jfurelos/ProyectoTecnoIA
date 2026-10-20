# ESPACIO · Matching Arquitectónico de Mobiliario

[![License: MIT](https://img.shields.io/badge/License-MIT-yellow.svg)](LICENSE)
[![Vite](https://img.shields.io/badge/Vite-8.3.4-646CFF.svg?logo=vite&logoColor=white)](https://vite.dev)
[![JavaScript](https://img.shields.io/badge/ES6_Modules-Native-F7DF1E.svg?logo=javascript&logoColor=black)](https://developer.mozilla.org/es/docs/Web/JavaScript)
[![CSS](https://img.shields.io/badge/Vanilla_CSS-Design_Tokens-1572B6.svg?logo=css3&logoColor=white)](https://developer.mozilla.org/es/docs/Web/CSS)

Plataforma web de recomendación y matching arquitectónico de mobiliario de autor con **aprendizaje adaptativo en tiempo real**, **diseño editorial cálido y otoñal**, **sistema de cuentas con prevención de duplicados**, **gestión de cesta** e **importador universal de catálogos CSV**.

---

## ✨ Características Principales

### 1. Onboarding Guiado (Opción A) + Descubrimiento Progresivo (Opción C)
* **Perfilado inicial en 4 pasos:** Estancia (salón, comedor, etc.), estilo base con moodboards fotográficos, presupuesto interactivo y paleta cromática otoñal.
* **Living Profile HUD ("ADN de tu Espacio"):** Monitor superior que refleja en vivo cómo evolucionan los porcentajes de afinidad de estilos (*Japandi, Nórdico, Minimalismo...*), las muestras de color dominantes y la barra de consumo de presupuesto.

### 2. Feed de Recomendaciones Arquitectónico
* **Fichas Técnicas de Autor:** Cada mueble incluye fotografías en alta resolución, precio en euros, materiales, estilo y **cotas técnicas normalizadas de plano de arquitectura** (*Ancho × Alto × Fondo en cm*).
* **Score de Afinidad (% Match):** Calculado vectorialmente ponderando estilo ($35\%$), paleta cromática ($25\%$), presupuesto restante ($25\%$) y adecuación a la estancia ($15\%$).
* **Explicabilidad Algorítmica:** Explicación en lenguaje natural de diseño de por qué encaja cada pieza (*"Afinidad: Armoniza con tu preferencia Japandi y gama cromática en terracota"*).

### 3. Interacción Dinámica: Aceptar Oferta o Negar
* **Al Aceptar Oferta:** El mueble pasa al estado *"✓ Añadido a tu Cesta"*, se descuenta del saldo disponible y el algoritmo incrementa el peso de sus atributos, recalculando el feed al instante.
* **Al Negar:** La tarjeta se desvanece suavemente, el algoritmo atenúa los atributos descartados y se muestra un toast inferior con opción de **Deshacer**.

### 4. Panel Desplegable "Tu Cesta" & Control de Presupuesto
* Visualización de todas las piezas aceptadas con medidas y precios.
* Barra de presupuesto dinámica con alertas en caso de superar el límite asignado.
* Botón **Descargar Resumen de la Cesta** (exporta el dossier técnico en formato JSON).

### 5. Sistema de Cuentas de Usuario y Sesiones
* Registro y login con nombre y contraseña.
* **Comprobación estricta de no duplicidad de cuentas** (case-insensitive).
* Cada usuario mantiene su propia Cesta, presupuesto y ponderaciones vectoriales de estilo de forma independiente.

### 6. Importador Universal de Catálogos CSV
* Carga de catálogos mediante arrastrar y soltar (*drag & drop*).
* Detección automática de delimitadores (coma `,` o punto y coma `;` de Excel en español).
* Mapeo inteligente de cabeceras en español e inglés (`nombre`/`name`, `precio`/`price`, `ancho`/`alto`/`profundidad` o `dimensiones`, `estilo`/`style`, `color`, `materiales`, `imagen`).
* Incluye opción de **Descargar Plantilla CSV de Muestra** y **Restaurar catálogo por defecto**.

### 7. Sistema de Diseño Flexible con Tokens CSS
* Tipografía editorial cuidada: *Cormorant Garamond*, *Plus Jakarta Sans* y *JetBrains Mono*.
* Selector de 4 temas arquitectónicos intercambiables en caliente:
  * **Otoño Cálido** (predeterminado: lino, yeso, terracota, caliza).
  * **Nórdico Claro** (diáfano, neutros fríos y azules acerados).
  * **Terracota & Roble** (modo oscuro sobrio y maderas nobles).
  * **Ceniza & Oliva** (tonos botánicos y minerales).

---

## 📁 Estructura del Repositorio

```text
├── index.html                           # Estructura semántica HTML5, modales y drawer
├── vite.config.js                       # Configuración de Vite (allowedHosts habilitado)
├── package.json                         # Scripts y dependencias
├── .gitignore                           # Exclusión de node_modules, dist, temporales
├── LICENSE                              # Licencia MIT
├── README.md                            # Documentación del proyecto
└── src/
    ├── main.js                          # Orquestador: estado, eventos y renderizado reactivo
    ├── data/
    │   └── furnitureData.js             # Catálogo de 18 piezas arquitectónicas y datos de onboarding
    ├── services/
    │   ├── matchingEngine.js            # Algoritmo de matching vectorial y aprendizaje adaptativo
    │   ├── authService.js               # Sistema de cuentas, anti-duplicidad y sesiones
    │   ├── csvParser.js                 # Parser universal de archivos CSV
    │   └── storage.js                   # Capa de persistencia con Web Storage API
    └── styles/
        ├── tokens.css                   # Tokens CSS (variables cromáticas, métricas y temas)
        ├── base.css                     # Reset, fuentes editoriales y botones base
        └── components/
            ├── navbar.css               # Cabecera, marca y selector de temas
            ├── auth.css                 # Modal de autenticación y menú de usuario
            ├── hud.css                  # Barra 'ADN de tu Espacio'
            ├── feed.css                 # Cuadrícula de muebles y tarjetas con cotas
            ├── drawer.css               # Panel lateral de la Cesta y presupuesto
            ├── onboarding.css           # Modal interactivo en 4 pasos
            └── modal.css                # Modal de importación CSV y toasts
```

---

## 🚀 Instalación y Puesta en Marcha

### Prerrequisitos
Tener instalado [Node.js](https://nodejs.org/) (versión 18 o superior).

### 1. Clonar el repositorio
```bash
git clone https://github.com/TU-USUARIO/espacio-matching-mobiliario.git
cd espacio-matching-mobiliario
```

### 2. Instalar dependencias
```bash
npm install
```

### 3. Iniciar el servidor de desarrollo local
```bash
npm run dev
```
Abre en tu navegador la dirección que indique la terminal (generalmente `http://localhost:5173`).

### 4. Compilar para producción
```bash
npm run build
```
Los archivos optimizados y listos para desplegar en cualquier hosting estático se generarán en la carpeta `dist/`.

---

## 📊 Formato de Catálogo CSV Soportado

Puedes importar tu propio archivo `.csv` directamente desde la interfaz. Acepta cabeceras en español o inglés:

```csv
nombre,categoria,estancia,precio,estilo,color,ancho,alto,profundidad,materiales,imagen
Mesa de Comedor Templo,Mesas,comedor,1420,Nórdico,Roble Claro,220,75,95,Roble macizo / Barniz mate,https://images.unsplash.com/photo-1615066390971-03e4e1c36ddf?auto=format&fit=crop&w=800&q=80
Sillón Terracota Bruna,Asientos,salón,680,Minimalismo Cálido,Terracota,84,78,82,Tejido bouclé / Fresno,https://images.unsplash.com/photo-1586023492125-27b2c045efd7?auto=format&fit=crop&w=800&q=80
Aparador Bajo Arcos,Almacenaje,salón,1650,Mid-Century Modern,Nogal Ahumado,180,74,45,Nogal canaletto / Travertino,https://images.unsplash.com/photo-1538688525198-9b88f6f53126?auto=format&fit=crop&w=800&q=80
```

---

## 📐 Algoritmo de Afinidad

El cálculo de compatibilidad ($0\% - 100\%$) se rige por la siguiente fórmula ponderada:

$$\text{Composite Score} = (V_{\text{estilo}} \cdot 0.35) + (V_{\text{paleta}} \cdot 0.25) + (V_{\text{presupuesto}} \cdot 0.25) + (V_{\text{estancia}} \cdot 0.15)$$

El sistema normaliza el resultado al rango de $52\%$ a $99\%$ y reordena automáticamente el feed tras cada interacción sin recargas de página.

---

## 📄 Licencia

Este proyecto está bajo la Licencia [MIT](LICENSE).

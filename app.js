// ================================================================
//  app.js — FacturaIA Reval
//  Lee la config desde config.js (variable global CONFIG)
// ================================================================

// ---- DOM refs ----
const fileInput         = document.querySelector("#invoiceFile");
const fileName          = document.querySelector("#fileName");
const processButton     = document.querySelector("#processButton");
const jsonOutput        = document.querySelector("#jsonOutput");
const copyJson          = document.querySelector("#copyJson");
const sendToRevalsoft   = document.querySelector("#sendToRevalsoft");
const steps             = document.querySelectorAll(".step");
const previewImg        = document.querySelector("#previewImg");
const orderResultSection= document.querySelector("#orderResultSection");
const orderResult       = document.querySelector("#orderResult");

// Gemini state
const geminiKeyInput        = document.querySelector("#geminiKey");
const geminiStateIndicator  = document.querySelector("#geminiStateIndicator");
const geminiStateText       = document.querySelector("#geminiStateText");

// Revalsoft config fields
const cfgBaseUrl    = document.querySelector("#cfgBaseUrl");
const cfgCompany    = document.querySelector("#cfgCompany");
const cfgEmail      = document.querySelector("#cfgEmail");
const cfgPassword   = document.querySelector("#cfgPassword");
const rvsStateIndicator = document.querySelector("#rvsStateIndicator");
const rvsStateText      = document.querySelector("#rvsStateText");

// Metrics
const metricFields  = document.querySelector("#metricFields");
const metricItems   = document.querySelector("#metricItems");
const metricErrors  = document.querySelector("#metricErrors");

// ---- Inicializar campos desde config.js ----
cfgBaseUrl.value  = CONFIG.revalsoft.baseUrl;
cfgCompany.value  = CONFIG.revalsoft.company;
cfgEmail.value    = CONFIG.revalsoft.email;
cfgPassword.value = CONFIG.revalsoft.password;

// Gemini key: prioridad localStorage, luego config.js
const savedKey = localStorage.getItem("gemini_api_key") || CONFIG.gemini.apiKey;
if (savedKey) {
  geminiKeyInput.value = savedKey;
  updateGeminiState(true);
}

// ---- Helpers de estado visual ----
function updateGeminiState(hasKey) {
  if (hasKey) {
    geminiStateIndicator.style.background  = "var(--green)";
    geminiStateIndicator.style.boxShadow   = "0 0 8px var(--green)";
    geminiStateText.textContent            = "API Key configurada";
    document.querySelector("#geminiState").style.color = "var(--green)";
  } else {
    geminiStateIndicator.style.background  = "var(--text-dim)";
    geminiStateIndicator.style.boxShadow   = "none";
    geminiStateText.textContent            = "API Key requerida";
    document.querySelector("#geminiState").style.color = "var(--text-dim)";
  }
}

function updateRvsState(ok, msg) {
  rvsStateIndicator.style.background = ok ? "var(--green)" : "#e44160";
  rvsStateIndicator.style.boxShadow  = ok ? "0 0 8px var(--green)" : "0 0 8px #e44160";
  rvsStateText.textContent           = msg;
  document.querySelector("#rvsState").style.color = ok ? "var(--green)" : "#e44160";
}

function updateStep(index, state) {
  const step = steps[index];
  if (!step) return;
  step.classList.remove("done", "active");
  if (state === "done")   step.classList.add("done");
  if (state === "active") step.classList.add("active");
}

// ---- Eventos config ----
geminiKeyInput.addEventListener("input", () => {
  const key = geminiKeyInput.value.trim();
  updateGeminiState(key.length > 0);
  key ? localStorage.setItem("gemini_api_key", key) : localStorage.removeItem("gemini_api_key");
});

// ---- Vista previa de archivo ----
fileInput.addEventListener("change", () => {
  const file = fileInput.files[0];
  fileName.textContent = file ? file.name : "Esperando comprobante";
  if (file) {
    updateStep(0, "done");
    updateStep(1, "active");
    // Mostrar preview si es imagen
    if (file.type.startsWith("image/")) {
      const reader = new FileReader();
      reader.onload = e => {
        previewImg.src = e.target.result;
        
        // Actualizar contenedor de factura original en la sección inferior
        const realInvoiceImg = document.querySelector("#realInvoiceImg");
        const originalPlaceholder = document.querySelector("#originalPlaceholder");
        realInvoiceImg.src = e.target.result;
        realInvoiceImg.style.display = "block";
        originalPlaceholder.style.display = "none";
      };
      reader.readAsDataURL(file);
    }
  }
});

// ---- Convertir archivo a base64 ----
function fileToBase64Part(file) {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onloadend = () => resolve({ mimeType: file.type, data: reader.result.split(",")[1] });
    reader.onerror   = reject;
    reader.readAsDataURL(file);
  });
}

// ================================================================
//  PASO 1 — Procesar factura con Gemini
// ================================================================
processButton.addEventListener("click", async () => {
  const file   = fileInput.files[0];
  const apiKey = geminiKeyInput.value.trim();

  if (!file)   { alert("Seleccioná primero un archivo de factura."); return; }
  if (!apiKey) { alert("Ingresá tu API Key de Gemini en la barra lateral."); geminiKeyInput.focus(); return; }

  processButton.disabled = true;
  processButton.textContent = "Procesando...";
  sendToRevalsoft.disabled = true;
  orderResultSection.style.display = "none";
  
  // Ocultar factura previa y mostrar placeholder
  document.querySelector("#renderedInvoice").style.display = "none";
  const transformedPlaceholder = document.querySelector("#transformedPlaceholder");
  transformedPlaceholder.style.display = "block";
  transformedPlaceholder.textContent = "Iniciando lectura con Inteligencia Artificial...";
  
  jsonOutput.textContent = "Iniciando lectura con Inteligencia Artificial...";
  updateStep(0, "done"); updateStep(1, "active"); updateStep(2, ""); updateStep(3, "");

  try {
    const filePart = await fileToBase64Part(file);

    const prompt = `Analiza la imagen o PDF de la factura provista y extrae sus datos estructurados en formato JSON.
Tu respuesta debe ser EXCLUSIVAMENTE el objeto JSON, sin bloques markdown ni texto adicional.
Esquema requerido:
{
  "estado": "procesada",
  "confianza": <0-1>,
  "comprobante": { "tipo": "", "punto_venta": "", "numero": "", "fecha_emision": "YYYY-MM-DD", "moneda": "" },
  "proveedor": { "razon_social": "", "cuit": "", "condicion_iva": "" },
  "cliente":   { "razon_social": "", "cuit": "" },
  "totales":   { "subtotal": 0, "descuento": 0, "subtotal_gravado": 0, "iva_21": 0, "percepciones": 0, "total": 0 },
  "items": [ { "descripcion": "", "cantidad": 0, "precio_unitario": 0, "alicuota_iva": 21, "total": 0 } ]
}`;

    const url = `https://generativelanguage.googleapis.com/v1beta/models/${CONFIG.gemini.model}:generateContent?key=${apiKey}`;
    jsonOutput.textContent = "Analizando con Gemini...";
    transformedPlaceholder.textContent = "Analizando factura con Gemini...";

    const resp = await fetch(url, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ contents: [{ parts: [{ text: prompt }, { inlineData: filePart }] }] })
    });

    if (!resp.ok) {
      const err = await resp.json().catch(() => ({}));
      throw new Error(err.error?.message || `Error ${resp.status}`);
    }

    const data = await resp.json();
    let text = data.candidates?.[0]?.content?.parts?.[0]?.text || "";
    updateStep(1, "done"); updateStep(2, "active");
    jsonOutput.textContent = "Validando estructura...";
    transformedPlaceholder.textContent = "Validando estructura de datos...";

    // Limpiar markdown si el modelo los agregó
    text = text.trim().replace(/^```json/, "").replace(/^```/, "").replace(/```$/, "").trim();

    try {
      const parsed = JSON.parse(text);
      updateStep(2, "done"); updateStep(3, "active");
      jsonOutput.textContent = JSON.stringify(parsed, null, 2);

      // --- Renderizar factura en pantalla ---
      transformedPlaceholder.style.display = "none";
      const renderedInvoice = document.querySelector("#renderedInvoice");
      
      // Actualizar datos de cabecera
      document.querySelector("#invType").textContent = parsed.comprobante?.tipo || "FACTURA";
      document.querySelector("#invNumber").textContent = `N° ${parsed.comprobante?.punto_venta || "0000"}-${parsed.comprobante?.numero || "00000000"}`;
      
      // Proveedor y Cliente
      document.querySelector("#invProvName").textContent = parsed.proveedor?.razon_social || "—";
      document.querySelector("#invProvCuit").textContent = `CUIT: ${parsed.proveedor?.cuit || "—"}`;
      document.querySelector("#invCliName").textContent = parsed.cliente?.razon_social || "—";
      document.querySelector("#invCliCuit").textContent = `CUIT: ${parsed.cliente?.cuit || "—"}`;
      
      // Items de la tabla
      const tbody = document.querySelector("#invItemsBody");
      tbody.innerHTML = "";
      
      const cleanNum = (val) => {
        if (typeof val === "number") return val;
        if (typeof val === "string") {
          // Limpieza de formatos argentinos: "415.855,00" -> 415855.00
          let cleaned = val.replace(/\./g, "").replace(/,/g, ".");
          let num = parseFloat(cleaned);
          return isNaN(num) ? 0 : num;
        }
        return 0;
      };

      (parsed.items || []).forEach(item => {
        const cant = cleanNum(item.cantidad);
        const unit = cleanNum(item.precio_unitario);
        const tot = cleanNum(item.total);
        const tr = document.createElement("tr");
        tr.style.borderBottom = "1px solid #dee2e6";
        tr.innerHTML = `
          <td style="padding: 6px; color: #495057;">${item.descripcion}</td>
          <td style="padding: 6px; text-align: center; color: #495057;">${cant}</td>
          <td style="padding: 6px; text-align: right; color: #495057;">$${unit.toLocaleString('es-AR', {minimumFractionDigits: 2})}</td>
          <td style="padding: 6px; text-align: right; font-weight: bold; color: #212529;">$${tot.toLocaleString('es-AR', {minimumFractionDigits: 2})}</td>
        `;
        tbody.appendChild(tr);
      });
      
      // Totales
      const formatCurr = (val) => {
        const num = cleanNum(val);
        return `$${num.toLocaleString('es-AR', {minimumFractionDigits: 2})}`;
      };
      document.querySelector("#invSubtotal").textContent = formatCurr(parsed.totales?.subtotal || parsed.totales?.subtotal_gravado);
      document.querySelector("#invIva").textContent = formatCurr(parsed.totales?.iva_21 || parsed.totales?.iva_debito_fiscal);
      document.querySelector("#invTotal").textContent = formatCurr(parsed.totales?.total);

      // Mostrar factura
      renderedInvoice.style.display = "flex";

      // Actualizar métricas
      const itemCount = parsed.items?.length || 0;
      metricFields.textContent = parsed.confianza ? Math.round(parsed.confianza * 100) + "%" : "—";
      metricItems.textContent  = itemCount;
      metricErrors.textContent = 0;

      // Habilitar botón de envío
      sendToRevalsoft.disabled = false;

    } catch (errParse) {
      updateStep(2, "active");
      transformedPlaceholder.style.display = "block";
      transformedPlaceholder.textContent = "Error al parsear el JSON de respuesta.";
      jsonOutput.textContent = `Error al parsear JSON:\n\n${text}\n\nDetalle: ${errParse.message}`;
      metricErrors.textContent = 1;
    }

  } catch (err) {
    updateStep(1, "active");
    transformedPlaceholder.style.display = "block";
    transformedPlaceholder.textContent = `Error: ${err.message}`;
    jsonOutput.textContent = `Error: ${err.message}`;
    metricErrors.textContent = 1;
  } finally {
    processButton.disabled = false;
    processButton.textContent = "Procesar factura";
  }
});

// ================================================================
//  PASO 2 — Crear orden en Revalsoft
// ================================================================
sendToRevalsoft.addEventListener("click", async () => {
  let invoiceData;
  try {
    invoiceData = JSON.parse(jsonOutput.textContent);
  } catch {
    alert("El JSON no es válido. Procesá la factura primero."); return;
  }

  const baseUrl  = cfgBaseUrl.value.trim();
  const company  = cfgCompany.value.trim();
  const email    = cfgEmail.value.trim();
  const password = cfgPassword.value.trim();

  sendToRevalsoft.disabled = true;
  sendToRevalsoft.textContent = "Conectando...";
  updateRvsState(false, "Conectando...");

  try {
    // --- Login ---
    const loginResp = await fetch(`${baseUrl}/api/user/login`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ company, email, password })
    });
    if (!loginResp.ok) throw new Error("Error de login en Revalsoft");
    const loginData = await loginResp.json();
    const token = loginData.data?.token;
    if (!token) throw new Error("No se obtuvo token de Revalsoft");
    updateRvsState(true, "Conectado ✓");

    const headers = { Authorization: `Bearer ${token}`, "Content-Type": "application/json" };

    // --- Buscar proveedor por nombre ---
    sendToRevalsoft.textContent = "Buscando proveedor...";
    const provName = invoiceData.proveedor?.razon_social?.split(" ")[0] || "";
    const partnerResp = await fetch(`${baseUrl}/api/partner/search?text=${encodeURIComponent(provName)}&partnerType=2`, { headers });
    const partnerData = await partnerResp.json();
    const partner = Array.isArray(partnerData) ? partnerData[0] : partnerData;
    if (!partner?.id) throw new Error(`Proveedor "${provName}" no encontrado en Revalsoft`);

    // --- Buscar productos ----
    sendToRevalsoft.textContent = "Buscando productos...";
    const purchaseOrderItems = [];
    for (const item of (invoiceData.items || [])) {
      const keyword = item.descripcion.split(" ").slice(0, 2).join(" ");
      const prodResp = await fetch(`${baseUrl}/api/product/search?text=${encodeURIComponent(keyword)}&limit=1`, { headers });
      const prodData = await prodResp.json();
      const product  = Array.isArray(prodData) ? prodData[0] : prodData;

      purchaseOrderItems.push({
        id: 0, purchaseOrderID: 0,
        product: product ? { name: product.name, id: String(product.id) } : { name: item.descripcion, id: null },
        productUom: { name: "Unidad (es)", productUnitOfMeasureCategoryID: 1, uom_type: 2, active: true, ratio: 1, rounding: 0, id: 1 },
        quantity:      item.cantidad,
        unitPrice:     item.precio_unitario,
        standardPrice: item.precio_unitario,
        taxAmount: 0, discount: 0, discountAmount: 0,
        netAmount:   item.total,
        totalAmount: item.total,
        costPrice: 0, productUnitOfMeasure: null, invoiceStatus: 0,
        taxes: [{ id: CONFIG.purchaseOrder.taxId, name: CONFIG.purchaseOrder.taxName, amount: 0 }]
      });
    }

    // --- Crear orden ---
    sendToRevalsoft.textContent = "Creando orden...";
    const ref = `${invoiceData.comprobante?.tipo?.charAt(0) || "A"}-${invoiceData.comprobante?.punto_venta || "0000"}-${invoiceData.comprobante?.numero || "00000000"}`;

    const orderBody = {
      data: {
        id: 0, companyID: 0, name: null,
        partnerReference: ref,
        partner,
        dateOrder:    invoiceData.comprobante?.fecha_emision ? `${invoiceData.comprobante.fecha_emision}T00:00` : new Date().toISOString(),
        dateApprove:  null,
        datePlanned:  invoiceData.comprobante?.fecha_emision ? `${invoiceData.comprobante.fecha_emision}T00:00` : new Date().toISOString(),
        netAmount: 0, taxAmount: 0, discountAmount: 0, totalAmount: 0, balance: 0,
        notes: `Importado por FacturaIA Reval`,
        dueDate: new Date().toISOString(),
        accountJournal:    { name: CONFIG.purchaseOrder.journalName,     id: CONFIG.purchaseOrder.journalId },
        state: 1, invoiceStatus: 0,
        accountPaymentTerm:{ name: CONFIG.purchaseOrder.paymentTermName, id: CONFIG.purchaseOrder.paymentTermId, due: 0, active: true },
        stockPickingType:  { companyID: parseInt(company), name: CONFIG.purchaseOrder.pickingTypeName, prefix: "REC", active: true, pickingType: 1, sequence: 1, id: CONFIG.purchaseOrder.pickingTypeId },
        stockPickings: [], accountInvoices: [], accountPaymentItems: [],
        priceList: { name: CONFIG.purchaseOrder.priceListName, id: CONFIG.purchaseOrder.priceListId },
        purchaseOrderItems
      },
      "": true
    };

    const orderResp = await fetch(`${baseUrl}/api/purchaseorder`, {
      method: "POST",
      headers,
      body: JSON.stringify(orderBody)
    });

    const orderData = await orderResp.json();
    if (!orderData.ok) throw new Error(orderData.message || "Error al crear la orden");

    const orderId   = orderData.data?.id;
    const orderName = orderData.data?.name;

    updateStep(3, "done");
    updateRvsState(true, `Orden ${orderName} creada ✓`);

    orderResultSection.style.display = "block";
    orderResult.textContent = JSON.stringify({
      resultado: "✅ Orden creada exitosamente",
      id:     orderId,
      nombre: orderName,
      url:    `${baseUrl}/purchases/purchaseorder/${orderId}`
    }, null, 2);

    metricErrors.textContent = 0;

  } catch (err) {
    updateRvsState(false, "Error: " + err.message);
    orderResultSection.style.display = "block";
    orderResult.textContent = `❌ Error:\n${err.message}`;
    metricErrors.textContent = 1;
  } finally {
    sendToRevalsoft.disabled = false;
    sendToRevalsoft.textContent = "Crear en Revalsoft";
  }
});

// ---- Copiar JSON ----
copyJson.addEventListener("click", async () => {
  try {
    await navigator.clipboard.writeText(jsonOutput.textContent);
    copyJson.textContent = "Copiado";
    setTimeout(() => { copyJson.textContent = "Copiar"; }, 1200);
  } catch {}
});

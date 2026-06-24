// ============================================================
//  CONFIGURACION FacturaIA Reval
//  Edita este archivo para cambiar de servidor o credenciales
// ============================================================

const CONFIG = {

  // --- REVALSOFT ---
  revalsoft: {
    baseUrl:  "https://app.revalsoft.com.ar",   // URL base del servidor
    company:  "2",                               // ID de empresa
    email:    "ia@revalsoft.com.ar",             // Usuario
    password: "5749"                             // Contraseña
  },

  // --- GEMINI IA ---
  gemini: {
    apiKey: "",           // API Key de Google Gemini (se guarda tambien en localStorage)
    model:  "gemini-2.5-flash"
  },

  // --- ORDEN DE COMPRA (valores por defecto) ---
  purchaseOrder: {
    journalId:        "5",           // ID del diario: Pedido de compra
    journalName:      "Pedido de compra",
    pickingTypeId:    4,             // ID tipo de recepcion
    pickingTypeName:  "APN: Recepciones",
    paymentTermId:    1,             // ID condicion de pago
    paymentTermName:  "Pago inmediato",
    priceListId:      "1",
    priceListName:    "Tarifa publica",
    taxId:            3,             // ID IVA compras 21%
    taxName:          "IVA compras 21 %"
  }

};

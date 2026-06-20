const fileInput = document.querySelector("#invoiceFile");
const fileName = document.querySelector("#fileName");
const processButton = document.querySelector("#processButton");
const jsonOutput = document.querySelector("#jsonOutput");
const copyJson = document.querySelector("#copyJson");

const exampleInvoice = {
  estado: "procesada",
  confianza: 0.98,
  comprobante: {
    tipo: "Factura A",
    punto_venta: "0004",
    numero: "00001872",
    fecha_emision: "2026-06-20",
    moneda: "ARS"
  },
  proveedor: {
    razon_social: "Proveedor Demo SA",
    cuit: "30-71234567-8",
    condicion_iva: "Responsable Inscripto"
  },
  cliente: {
    razon_social: "Revalsoft Testing",
    cuit: "30-87654321-2"
  },
  totales: {
    subtotal: 184500,
    iva_21: 38745,
    percepciones: 0,
    total: 223245
  },
  items: [
    {
      descripcion: "Servicio de mantenimiento mensual",
      cantidad: 1,
      precio_unitario: 184500,
      alicuota_iva: 21,
      total: 184500
    }
  ],
  destino_api: {
    base_url: "https://app.revalsoft.com.ar",
    endpoint: "/api/facturas",
    metodo: "POST"
  }
};

fileInput.addEventListener("change", () => {
  const file = fileInput.files[0];
  fileName.textContent = file ? file.name : "Esperando comprobante";
});

processButton.addEventListener("click", () => {
  const file = fileInput.files[0];
  const payload = {
    ...exampleInvoice,
    archivo_original: file ? file.name : "factura-demo.pdf",
    procesado_en: new Date().toISOString()
  };

  jsonOutput.textContent = JSON.stringify(payload, null, 2);
});

copyJson.addEventListener("click", async () => {
  await navigator.clipboard.writeText(jsonOutput.textContent);
  copyJson.textContent = "Copiado";
  setTimeout(() => {
    copyJson.textContent = "Copiar";
  }, 1200);
});

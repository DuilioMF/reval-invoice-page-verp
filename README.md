# FacturaIA Reval

Pagina inicial para un sistema que lee facturas, genera JSON validado y prepara la insercion en una API externa como Revalsoft.

## Que incluye

- Pantalla para subir PDF o imagen de factura.
- Flujo visual de procesamiento.
- JSON de ejemplo con datos de comprobante, proveedor, cliente, totales e items.
- Panel de configuracion para API de testing.
- Archivos listos para publicar en GitHub Pages.

## Publicar en GitHub Pages

1. Crear un repositorio en GitHub.
2. Subir estos archivos al repositorio:
   - `index.html`
   - `styles.css`
   - `app.js`
   - `invoice-preview.png`
3. Ir a Settings > Pages.
4. Elegir Deploy from a branch.
5. Seleccionar la rama principal y la carpeta raiz.

## Proximo paso tecnico

Conectar el boton `Procesar factura` a un backend real:

- Subida del archivo.
- Lectura con IA.
- Validacion del JSON.
- Envio `POST` a la API de Revalsoft.

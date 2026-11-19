"use client";

import { jsPDF } from "jspdf";
import { useState } from "react";
import { ApiClientError, apiRequest } from "@/lib/api/client";

export default function ReceiptDownload({ paymentId }) {
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");

  async function download() {
    setBusy(true);
    setError("");
    try {
      const { data } = await apiRequest(`/api/v1/pagos/${paymentId}/recibo`);
      const pdf = new jsPDF({ unit: "mm", format: "a4" });
      pdf.setFont("helvetica", "bold");
      pdf.setFontSize(18);
      pdf.text("RECIBO DE PAGO", 20, 24);
      pdf.setFont("helvetica", "normal");
      pdf.setFontSize(11);
      const lines = [
        ["Número", data.numero],
        ["Fecha", new Date(data.fecha).toLocaleDateString()],
        ["Cliente", data.cliente],
        ["Lote / manzano", `${data.lote} / ${data.manzano}`],
        ["Urbanización", data.urbanizacion],
        ["Concepto", data.concepto],
        ["Importe", `${data.monto} ${data.moneda}`],
        ["Medio de pago", data.medio_pago],
        ["Receptor", data.receptor || "Identidad de cuenta no disponible"],
        ["Estado", data.estado === "valido" ? "Válido" : "ANULADO"],
      ];
      let y = 40;
      for (const [label, value] of lines) {
        pdf.setFont("helvetica", "bold");
        pdf.text(`${label}:`, 20, y);
        pdf.setFont("helvetica", "normal");
        const content = pdf.splitTextToSize(String(value ?? "—"), 125);
        pdf.text(content, 62, y);
        y += Math.max(8, content.length * 5);
      }
      pdf.setFontSize(9);
      pdf.text("Documento generado electrónicamente. No es una copia firmada.", 20, y + 8);
      pdf.save(`${safeFilename(data.numero)}.pdf`);
    } catch (caught) {
      setError(caught instanceof ApiClientError ? caught.message : "No se pudo generar el PDF. Puedes volver a intentarlo.");
    } finally {
      setBusy(false);
    }
  }

  return (
    <span className="inline-flex flex-col items-start gap-1">
      <button
        className="btn-secondary min-h-10 px-3 py-2 text-sm"
        disabled={busy}
        onClick={download}
        type="button"
      >
        {busy ? "Generando…" : "Ver / descargar PDF"}
      </button>
      {error ? <span className="text-xs text-red-700" role="alert">{error}</span> : null}
    </span>
  );
}

function safeFilename(value) {
  return String(value || "recibo").replace(/[^a-zA-Z0-9_-]/g, "-");
}

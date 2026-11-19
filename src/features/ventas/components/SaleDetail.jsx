"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import ReceiptDownload from "@/features/ventas/components/ReceiptDownload";
import { ApiClientError, apiRequest } from "@/lib/api/client";

const paymentMethods = ["Efectivo", "Transferencia", "Depósito bancario", "Cheque", "Otro"];
const today = () => new Date().toISOString().slice(0, 10);

export default function SaleDetail({ saleId }) {
  const [sale, setSale] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [notice, setNotice] = useState("");
  const [payment, setPayment] = useState({
    monto: "",
    moneda: "",
    medio_pago: "",
    fecha_pago: today(),
  });
  const [review, setReview] = useState(false);
  const [pendingAttempt, setPendingAttempt] = useState(null);
  const [submitting, setSubmitting] = useState(false);

  useEffect(() => {
    let active = true;
    apiRequest(`/api/v1/ventas/${saleId}`)
      .then((result) => {
        if (!active) return;
        setSale(result.data);
        setPayment((current) => ({ ...current, moneda: result.data.moneda }));
      })
      .catch((caught) => {
        if (active) setError(caught instanceof ApiClientError ? caught.message : "No se pudo cargar la venta.");
      })
      .finally(() => {
        if (active) setLoading(false);
      });
    Promise.resolve().then(() => {
      if (!active) return;
      try {
        const saved = window.sessionStorage.getItem(storageKey(saleId));
        if (!saved) return;
        const attempt = JSON.parse(saved);
        if (
          typeof attempt.idempotency_key === "string" &&
          typeof attempt.monto === "string" &&
          typeof attempt.medio_pago === "string" &&
          typeof attempt.fecha_pago === "string"
        ) {
          setPendingAttempt(attempt);
          setReview(true);
          setPayment({
            monto: attempt.monto,
            moneda: attempt.moneda,
            medio_pago: attempt.medio_pago,
            fecha_pago: attempt.fecha_pago,
          });
        } else {
          window.sessionStorage.removeItem(storageKey(saleId));
        }
      } catch {
        if (active) setError("No se pudo recuperar el intento de pago guardado en esta pestaña.");
      }
    });
    return () => {
      active = false;
    };
  }, [saleId]);

  async function submitPayment(event) {
    event.preventDefault();
    setError("");
    setNotice("");
    setReview(true);
  }

  async function confirmPayment() {
    setSubmitting(true);
    setError("");
    setNotice("");
    let attempt = pendingAttempt;
    if (!attempt) {
      attempt = {
        ...payment,
        idempotency_key: window.crypto.randomUUID(),
      };
      window.sessionStorage.setItem(storageKey(saleId), JSON.stringify(attempt));
      setPendingAttempt(attempt);
    }

    try {
      const result = await apiRequest(`/api/v1/ventas/${saleId}/pagos`, {
        method: "POST",
        body: JSON.stringify(attempt),
      });
      window.sessionStorage.removeItem(storageKey(saleId));
      setPendingAttempt(null);
      setPayment((current) => ({ ...current, monto: "", medio_pago: "", fecha_pago: today() }));
      setReview(false);
      setNotice(`Pago confirmado. Recibo ${result.data.recibo.numero} disponible.`);
      setSale(result.data.sale);
    } catch (caught) {
      setError(caught instanceof ApiClientError ? caught.message : "No se confirmó la respuesta. Reintenta con los mismos datos; la operación es idempotente.");
    } finally {
      setSubmitting(false);
    }
  }

  function discardAttempt() {
    const confirmed = window.confirm(
      "Descarta el intento solo después de comprobar el historial de pagos. Si el servidor registró el pago, reintentar el mismo intento es más seguro.",
    );
    if (!confirmed) return;
    window.sessionStorage.removeItem(storageKey(saleId));
    setPendingAttempt(null);
    setReview(false);
    setError("");
    setNotice("");
  }

  if (loading) return <p role="status">Cargando venta y saldo…</p>;
  if (!sale) return <p className="rounded-lg bg-red-50 p-3 text-red-800" role="alert">{error || "No se encontró la venta."}</p>;

  return (
    <section className="mx-auto max-w-5xl space-y-6">
      <Link className="text-sm font-semibold text-brand hover:text-brand-hover" href="/panel/ventas">← Volver a ventas</Link>
      <header className="flex flex-wrap items-start justify-between gap-4">
        <div>
          <p className="text-xs font-bold uppercase tracking-[0.16em] text-brand">UH-8 · UH-9</p>
          <h1 className="mt-1 text-3xl font-bold text-slate-900">Venta {sale.id.slice(0, 8)}</h1>
          <p className="mt-2 break-words text-slate-600">{sale.cliente.nombre} · Manzano {sale.lote.manzano.codigo || sale.lote.manzano.numero}, lote {sale.lote.numero}</p>
        </div>
        <span className={`business-status ${sale.estado === "vigente" ? "business-status-available" : "business-status-sold"}`}>
          {sale.estado === "totalmente_pagada" ? "Totalmente pagada" : sale.estado === "cancelada" ? "Cancelada" : "Vigente"}
        </span>
      </header>

      {error ? <p className="form-alert" role="alert">{error}</p> : null}
      {notice ? <p className="form-alert" role="status">{notice}</p> : null}

      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <Metric label="Precio final" value={`${sale.precio_final} ${sale.moneda}`} />
        <Metric label="Total pagado" value={`${sale.total_pagado} ${sale.moneda}`} />
        <Metric label="Saldo pendiente" value={`${sale.saldo_pendiente} ${sale.moneda}`} emphasis />
        <Metric label="Fecha / modalidad" value={`${new Date(sale.fecha_venta).toLocaleDateString()} · ${sale.tipo}`} />
      </div>
      <p className="rounded-xl border border-border-subtle bg-white p-4 text-sm leading-6 text-slate-700">
        Forma de pago pactada: {sale.forma_pago}. El saldo descuenta únicamente pagos válidos recibidos en la moneda de la venta.
      </p>

      <section className="space-y-3">
        <h2 className="text-xl font-semibold text-slate-900">Historial de pagos</h2>
        {sale.pagos.length === 0 ? (
          <p className="rounded-xl border border-slate-200 bg-white p-5 text-slate-600">Esta venta aún no tiene pagos registrados. No se generó un pago inicial al crearla.</p>
        ) : (
          <>
          <div className="hidden overflow-x-auto rounded-xl border border-slate-200 bg-white lg:block">
            <table className="min-w-full divide-y divide-slate-200 text-left text-sm">
              <thead className="bg-slate-50 text-slate-600">
                <tr><th className="px-4 py-3">Fecha</th><th className="px-4 py-3">Recibo</th><th className="px-4 py-3">Importe</th><th className="px-4 py-3">Medio</th><th className="px-4 py-3">Estado</th><th className="px-4 py-3">Documento</th></tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {sale.pagos.map((item) => (
                  <tr key={item.id}>
                    <td className="px-4 py-3">{new Date(item.fecha_pago).toLocaleDateString()}</td>
                    <td className="px-4 py-3 font-mono">{item.numero_recibo}</td>
                    <td className="px-4 py-3">{item.monto} {item.moneda}</td>
                    <td className="px-4 py-3">{item.medio_pago}</td>
                    <td className="px-4 py-3">{item.estado === "valido" ? "Válido" : "Anulado"}</td>
                    <td className="px-4 py-3"><ReceiptDownload paymentId={item.id} /></td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
          <div className="grid gap-3 lg:hidden">
            {sale.pagos.map((item) => (
              <article className="min-w-0 rounded-xl border border-border-subtle bg-white p-4" key={item.id}>
                <div className="flex flex-wrap items-start justify-between gap-2">
                  <div>
                    <p className="text-xs text-text-secondary">Recibo</p>
                    <p className="break-all font-mono text-sm font-semibold">{item.numero_recibo}</p>
                  </div>
                  <span className={`business-status ${item.estado === "valido" ? "business-status-available" : "business-status-sold"}`}>
                    {item.estado === "valido" ? "Válido" : "Anulado"}
                  </span>
                </div>
                <dl className="mt-3 grid grid-cols-2 gap-3 text-sm">
                  <Data label="Fecha" value={new Date(item.fecha_pago).toLocaleDateString()} />
                  <Data label="Importe" value={`${item.monto} ${item.moneda}`} />
                  <Data label="Medio de pago" value={item.medio_pago} />
                </dl>
                <div className="mt-3">
                  <ReceiptDownload paymentId={item.id} />
                </div>
              </article>
            ))}
          </div>
          </>
        )}
      </section>

      {sale.saldo_pendiente !== "0.00" ? (
        <section className="form-card form-stack">
          <div>
            <h2 className="text-xl font-semibold text-slate-900">Registrar pago recibido</h2>
            <p className="mt-1 text-sm text-slate-600">Al confirmar, declaras que recibiste el dinero. El recibo queda vinculado al pago.</p>
          </div>
          <div className="grid gap-3 rounded-xl border border-brand/20 bg-brand-soft/50 p-4 sm:grid-cols-2">
            <p className="text-sm font-semibold text-slate-700">Saldo pendiente</p>
            <p className="text-xl font-bold text-brand sm:text-right">{sale.saldo_pendiente} {sale.moneda}</p>
          </div>
          <form className="form-section grid min-w-0 gap-4 sm:grid-cols-2 lg:grid-cols-3" onSubmit={submitPayment}>
            <label className="form-label">
              Importe a recibir ({sale.moneda}) <span className="required-mark" aria-hidden="true">*</span><span className="sr-only"> obligatorio</span>
              <input
                className="form-control"
                aria-describedby="payment-amount-help"
                disabled={Boolean(pendingAttempt) || submitting}
                id="payment-amount"
                inputMode="decimal"
                onChange={(event) => setPayment((current) => ({ ...current, monto: event.target.value }))}
                required
                value={payment.monto}
              />
              <span className="field-help" id="payment-amount-help">El importe no puede superar el saldo pendiente.</span>
            </label>
            <label className="form-label">
              Fecha de recepción <span className="required-mark" aria-hidden="true">*</span><span className="sr-only"> obligatorio</span>
              <input
                className="form-control"
                disabled={Boolean(pendingAttempt) || submitting}
                id="payment-date"
                onChange={(event) => setPayment((current) => ({ ...current, fecha_pago: event.target.value }))}
                required
                type="date"
                value={payment.fecha_pago}
              />
            </label>
            <label className="form-label">
              Medio de pago <span className="required-mark" aria-hidden="true">*</span><span className="sr-only"> obligatorio</span>
              <select
                className="form-control"
                disabled={Boolean(pendingAttempt) || submitting}
                id="payment-method"
                onChange={(event) => setPayment((current) => ({ ...current, medio_pago: event.target.value }))}
                required
                value={payment.medio_pago}
              >
                <option value="">Selecciona un medio</option>
                {paymentMethods.map((method) => <option key={method} value={method}>{method}</option>)}
              </select>
            </label>
            {review ? (
              <div className="form-alert space-y-3 sm:col-span-2 lg:col-span-3" data-tone="info">
                <h3 className="font-semibold text-emerald-950">{pendingAttempt ? "Reintenta el mismo envío de forma segura" : "Confirma la recepción del pago"}</h3>
                <p className="text-sm text-slate-700">
                  {pendingAttempt?.monto ?? payment.monto} {sale.moneda} · {pendingAttempt?.medio_pago ?? payment.medio_pago} · {pendingAttempt?.fecha_pago ?? payment.fecha_pago}
                </p>
                <div className="form-actions">
                  <button className="btn-primary" disabled={submitting} onClick={confirmPayment} type="button">
                    {submitting ? "Registrando pago…" : pendingAttempt ? "Reintentar pago con la misma clave" : "Confirmar pago recibido"}
                  </button>
                  {pendingAttempt ? (
                    <button className="btn-danger" disabled={submitting} onClick={discardAttempt} type="button">
                      Descartar intento…
                    </button>
                  ) : (
                    <button className="btn-secondary" disabled={submitting} onClick={() => setReview(false)} type="button">Volver</button>
                  )}
                </div>
              </div>
            ) : (
              <button className="btn-primary sm:col-span-2 sm:justify-self-start lg:col-span-3" type="submit">
                Revisar pago
              </button>
            )}
          </form>
        </section>
      ) : (
        <p className="form-alert" role="status">La venta está totalmente pagada. Sigue bloqueando el lote.</p>
      )}
    </section>
  );
}

function Metric({ label, value, emphasis = false }) {
  return (
    <div className={`rounded-xl border p-4 ${emphasis ? "border-brand bg-brand-soft" : "border-border-subtle bg-white"}`}>
      <p className="text-sm text-slate-600">{label}</p>
      <p className="mt-1 text-xl font-bold text-slate-900">{value}</p>
    </div>
  );
}

function Data({ label, value }) {
  return <div className="min-w-0"><dt className="text-xs text-text-secondary">{label}</dt><dd className="mt-1 break-words font-medium text-slate-800">{value}</dd></div>;
}

function storageKey(id) {
  return `huajojo:pending-payment:${id}`;
}

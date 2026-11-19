"use client";

import Link from "next/link";
import { useEffect, useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import { ApiClientError, apiRequest } from "@/lib/api/client";

const today = () => new Date().toISOString().slice(0, 10);

export default function SaleForm() {
  const router = useRouter();
  const [lots, setLots] = useState([]);
  const [customers, setCustomers] = useState([]);
  const [selectedCustomer, setSelectedCustomer] = useState(null);
  const [customerQuery, setCustomerQuery] = useState("");
  const [registerCustomer, setRegisterCustomer] = useState(false);
  const [customer, setCustomer] = useState({
    nombre: "",
    identificacion: "",
    telefono: "",
    email: "",
    direccion: "",
  });
  const [sale, setSale] = useState({
    lote_id: "",
    tipo: "contado",
    precio_final: "",
    moneda: "USD",
    forma_pago: "",
    fecha_venta: today(),
  });
  const [loading, setLoading] = useState(true);
  const [pending, setPending] = useState(false);
  const [review, setReview] = useState(false);
  const [error, setError] = useState("");

  useEffect(() => {
    Promise.all([
      apiRequest("/api/v1/lotes?disponibilidad=disponible&page=1&page_size=100"),
      apiRequest("/api/v1/clientes?limit=25"),
    ])
      .then(([lotResult, customerResult]) => {
        setLots(lotResult.data);
        setCustomers(customerResult.data);
      })
      .catch((caught) => {
        setError(caught instanceof ApiClientError ? caught.message : "No se pudieron cargar los datos.");
      })
      .finally(() => setLoading(false));
  }, []);

  const selectedLot = useMemo(
    () => lots.find((lot) => lot.id === sale.lote_id),
    [lots, sale.lote_id],
  );

  async function searchCustomers(event) {
    event.preventDefault();
    setError("");
    try {
      const params = new URLSearchParams({ limit: "25" });
      if (customerQuery.trim()) params.set("q", customerQuery.trim());
      const result = await apiRequest(`/api/v1/clientes?${params}`);
      setCustomers(result.data);
    } catch (caught) {
      setError(caught instanceof ApiClientError ? caught.message : "No se pudo buscar clientes.");
    }
  }

  function updateSale(field, value) {
    setSale((current) => ({ ...current, [field]: value }));
  }

  function updateCustomer(field, value) {
    setCustomer((current) => ({ ...current, [field]: value }));
  }

  function reviewSale(event) {
    event.preventDefault();
    setError("");
    setReview(true);
  }

  async function confirmSale() {
    setPending(true);
    setError("");
    try {
      const input = {
        ...sale,
        ...(registerCustomer ? { cliente: customer } : { cliente_id: selectedCustomer?.id }),
      };
      const result = await apiRequest("/api/v1/ventas", {
        method: "POST",
        body: JSON.stringify(input),
      });
      router.push(`/panel/ventas/${result.data.id}`);
    } catch (caught) {
      setReview(false);
      setError(caught instanceof ApiClientError ? caught.message : "No se pudo registrar la venta.");
    } finally {
      setPending(false);
    }
  }

  if (loading) return <p role="status">Cargando lotes y clientes…</p>;

  return (
    <section className="mx-auto max-w-3xl space-y-6">
      <Link className="text-sm font-semibold text-brand hover:text-brand-hover" href="/panel/ventas">← Volver a ventas</Link>
      <header>
        <p className="text-xs font-bold uppercase tracking-[0.16em] text-brand">UH-7 · Nueva operación</p>
        <h1 className="mt-1 text-3xl font-bold text-slate-900">Registrar venta</h1>
        <p className="mt-2 max-w-2xl text-sm leading-6 text-slate-600">
          La venta no registra un pago. Registra cada importe solo después de confirmar su recepción.
        </p>
      </header>

      {error ? <p className="form-alert" role="alert">{error}</p> : null}
      {lots.length === 0 ? (
        <p className="form-alert" data-tone="warning">
          No hay lotes habilitados y disponibles para vender. No se modificarán lotes con habilitación desconocida.
        </p>
      ) : null}

      <form className="form-card form-stack" onSubmit={reviewSale}>
        <section className="form-section">
          <h2 className="form-section-title">Lote</h2>
          <label className="form-label">
          Lote disponible <span className="required-mark" aria-hidden="true">*</span><span className="sr-only"> obligatorio</span>
          <select
            className="form-control"
            id="sale-lot"
            onChange={(event) => {
              const lot = lots.find((item) => item.id === event.target.value);
              updateSale("lote_id", event.target.value);
              if (lot?.moneda_referencia) updateSale("moneda", lot.moneda_referencia);
              if (!sale.precio_final && lot?.precio_referencia_total) {
                updateSale("precio_final", lot.precio_referencia_total);
              }
            }}
            required
            value={sale.lote_id}
          >
            <option value="">Selecciona un lote habilitado</option>
            {lots.map((lot) => (
              <option key={lot.id} value={lot.id}>
                Manzano {lot.manzano_codigo || lot.manzano_numero} · Lote {lot.numero}
              </option>
            ))}
          </select>
          </label>
        </section>

        <fieldset className="form-section">
          <legend className="form-section-title">Cliente</legend>
          <div className="flex flex-wrap gap-2">
            <button
              aria-pressed={!registerCustomer}
              className={!registerCustomer ? "btn-primary" : "btn-secondary"}
              onClick={() => setRegisterCustomer(false)}
              type="button"
            >
              Seleccionar cliente
            </button>
            <button
              aria-pressed={registerCustomer}
              className={registerCustomer ? "btn-primary" : "btn-secondary"}
              onClick={() => {
                setRegisterCustomer(true);
                setSelectedCustomer(null);
              }}
              type="button"
            >
              Registrar cliente nuevo
            </button>
          </div>
          {!registerCustomer ? (
            <div className="space-y-3">
              <div className="grid min-w-0 gap-2 sm:grid-cols-[minmax(0,1fr)_auto] sm:items-end">
                <label className="form-label">
                  Buscar cliente
                <input
                  className="form-control"
                  id="customer-search"
                  onChange={(event) => setCustomerQuery(event.target.value)}
                  placeholder="Nombre, identificación, teléfono o correo"
                  value={customerQuery}
                />
                </label>
                <button className="btn-secondary" onClick={searchCustomers} type="button">Buscar</button>
              </div>
              {customers.length === 0 ? <p className="text-sm text-slate-600">No se encontraron clientes.</p> : null}
              <div className="grid gap-2 sm:grid-cols-2">
                {customers.map((item) => (
                  <button
                    aria-pressed={selectedCustomer?.id === item.id}
                    className={`min-w-0 rounded-lg border p-3 text-left text-sm focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-brand ${selectedCustomer?.id === item.id ? "border-brand bg-brand-soft" : "border-border-subtle bg-white hover:bg-slate-50"}`}
                    key={item.id}
                    onClick={() => setSelectedCustomer(item)}
                    type="button"
                  >
                    <span className="block font-semibold">{item.nombre}</span>
                    <span className="break-words text-slate-600">{item.identificacion || item.telefono || item.email || "Sin dato de contacto"}</span>
                  </button>
                ))}
              </div>
              {!selectedCustomer ? <p className="form-alert" data-tone="warning">Selecciona un cliente.</p> : null}
            </div>
          ) : (
            <div className="grid min-w-0 gap-4 sm:grid-cols-2">
              <TextField id="customer-name" label="Nombre completo" required value={customer.nombre} onChange={(value) => updateCustomer("nombre", value)} />
              <TextField id="customer-identification" label="Identificación (opcional)" value={customer.identificacion} onChange={(value) => updateCustomer("identificacion", value)} />
              <TextField id="customer-phone" label="Teléfono (opcional)" value={customer.telefono} onChange={(value) => updateCustomer("telefono", value)} />
              <TextField id="customer-email" label="Correo (opcional)" type="email" value={customer.email} onChange={(value) => updateCustomer("email", value)} />
              <TextField id="customer-address" label="Dirección (opcional)" value={customer.direccion} onChange={(value) => updateCustomer("direccion", value)} />
            </div>
          )}
        </fieldset>

          <section className="form-section">
            <h2 className="form-section-title">Condiciones de venta</h2>
            <div className="grid min-w-0 gap-4 sm:grid-cols-2">
            <label className="form-label">
            Modalidad pactada
              <select className="form-control" id="sale-type" onChange={(event) => updateSale("tipo", event.target.value)} value={sale.tipo}>
              <option value="contado">Contado</option>
              <option value="cuotas">A cuotas</option>
            </select>
          </label>
          <TextField id="sale-date" label="Fecha de venta" required type="date" value={sale.fecha_venta} onChange={(value) => updateSale("fecha_venta", value)} />
          <TextField id="sale-price" label="Precio final pactado" required inputMode="decimal" value={sale.precio_final} onChange={(value) => updateSale("precio_final", value)} />
          <label className="form-label">
            Moneda pactada
            <select className="form-control" id="sale-currency" onChange={(event) => updateSale("moneda", event.target.value)} value={sale.moneda}>
              <option value="USD">USD</option>
              <option value="BOB">BOB</option>
            </select>
          </label>
          <TextField id="sale-method" label="Forma de pago / acuerdo" required value={sale.forma_pago} onChange={(value) => updateSale("forma_pago", value)} />
          </div>
        </section>
        {sale.tipo === "cuotas" ? (
          <p className="form-alert" data-tone="info">
            No se generan cuotas, intereses ni multas automáticamente. Registra pagos solo cuando se reciban.
          </p>
        ) : null}

        {!review ? (
          <button
            className="btn-primary sm:justify-self-start"
            disabled={!lots.length || (!registerCustomer && !selectedCustomer)}
            type="submit"
          >
            Revisar venta
          </button>
        ) : (
          <div className="form-alert space-y-4 sm:p-5" data-tone="info">
            <h2 className="font-semibold text-emerald-950">Confirma los datos de la venta</h2>
            <dl className="grid gap-2 text-sm sm:grid-cols-2">
              <Summary label="Lote" value={selectedLot ? `${selectedLot.manzano_codigo || selectedLot.manzano_numero} · ${selectedLot.numero}` : ""} />
              <Summary label="Cliente" value={registerCustomer ? customer.nombre : selectedCustomer?.nombre} />
              <Summary label="Precio final" value={`${sale.precio_final} ${sale.moneda}`} />
              <Summary label="Modalidad" value={sale.tipo === "cuotas" ? "A cuotas" : "Contado"} />
              <Summary label="Forma de pago" value={sale.forma_pago} />
              <Summary label="Fecha" value={sale.fecha_venta} />
            </dl>
            <p className="text-sm text-slate-700">No se registrará ningún pago ni recibo con esta operación.</p>
            <div className="form-actions">
              <button className="btn-primary" disabled={pending} onClick={confirmSale} type="button">
                {pending ? "Registrando…" : "Confirmar y registrar venta"}
              </button>
              <button className="btn-secondary" disabled={pending} onClick={() => setReview(false)} type="button">
                Volver a editar
              </button>
            </div>
          </div>
        )}
      </form>
    </section>
  );
}

function TextField({ id, label, value, onChange, required = false, type = "text", inputMode }) {
  return (
    <label className="form-label" htmlFor={id}>
      {label} {required ? <><span className="required-mark" aria-hidden="true">*</span><span className="sr-only"> obligatorio</span></> : null}
      <input
        className="form-control"
        id={id}
        inputMode={inputMode}
        onChange={(event) => onChange(event.target.value)}
        required={required}
        type={type}
        value={value}
      />
    </label>
  );
}

function Summary({ label, value }) {
  return <div><dt className="text-slate-600">{label}</dt><dd className="font-medium">{value || "—"}</dd></div>;
}

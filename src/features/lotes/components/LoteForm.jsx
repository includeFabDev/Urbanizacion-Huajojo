"use client";

import Link from "next/link";
import { useEffect, useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import { apiRequest } from "@/lib/api/client";
import {
  createLoteSchema,
  updateLoteFieldsSchema,
} from "@/features/lotes/schemas";

const emptyValues = {
  manzano_id: "",
  numero: "",
  categoria: "",
  superficie: "",
  precio_por_m2: "",
  precio_referencia_total: "",
  moneda_referencia: "USD",
  habilitado_para_venta: "null",
  observaciones: "",
  lados: ["", "", "", ""],
};

function nullableValue(value) {
  return value === "" ? null : value;
}

function valueForEnabled(value) {
  if (value === true) return "true";
  if (value === false) return "false";
  return "null";
}

function formErrors(issues) {
  return Object.fromEntries(
    issues.map((issue) => [issue.path[0] ?? "form", issue.message]),
  );
}

export default function LoteForm({ loteId = null }) {
  const router = useRouter();
  const editing = Boolean(loteId);
  const [values, setValues] = useState(emptyValues);
  const [baseline, setBaseline] = useState(null);
  const [manzanos, setManzanos] = useState([]);
  const [loading, setLoading] = useState(true);
  const [pending, setPending] = useState(false);
  const [errors, setErrors] = useState({});
  const [message, setMessage] = useState("");

  useEffect(() => {
    let active = true;
    async function load() {
      try {
        const [manzanoResponse, loteResponse] = await Promise.all([
          apiRequest("/api/v1/manzanos"),
          editing ? apiRequest(`/api/v1/lotes/${loteId}`) : Promise.resolve(null),
        ]);
        if (!active) return;
        setManzanos(manzanoResponse.data);
        if (loteResponse) {
          const lote = loteResponse.data;
          const initial = {
            manzano_id: lote.manzano_id,
            numero: String(lote.numero),
            categoria: lote.categoria ?? "",
            superficie: lote.superficie_verificada_m2 == null ? "" : String(lote.superficie_verificada_m2),
            precio_por_m2: lote.precio_por_m2 == null ? "" : String(lote.precio_por_m2),
            precio_referencia_total: lote.precio_referencia_total == null ? "" : String(lote.precio_referencia_total),
            moneda_referencia: lote.moneda_referencia ?? "",
            habilitado_para_venta: valueForEnabled(lote.habilitado_para_venta),
            observaciones: lote.observaciones ?? "",
            version: lote.version,
          };
          setValues((current) => ({ ...current, ...initial }));
          setBaseline({
            manzano_id: initial.manzano_id,
            numero: initial.numero,
            categoria: nullableValue(initial.categoria),
            superficie_verificada_m2: nullableValue(initial.superficie),
            precio_por_m2: nullableValue(initial.precio_por_m2),
            precio_referencia_total: nullableValue(initial.precio_referencia_total),
            moneda_referencia: nullableValue(initial.moneda_referencia),
            habilitado_para_venta: lote.habilitado_para_venta,
            observaciones: nullableValue(initial.observaciones),
            version: initial.version,
          });
        }
      } catch (error) {
        if (active) setMessage(error.message);
      } finally {
        if (active) setLoading(false);
      }
    }
    load();
    return () => {
      active = false;
    };
  }, [editing, loteId]);

  const surfaceLabel = useMemo(
    () => (editing ? "Superficie verificada nueva (m²)" : "Superficie informada (m²)"),
    [editing],
  );

  function change(field, value) {
    setValues((current) => ({ ...current, [field]: value }));
    setErrors((current) => ({ ...current, [field]: undefined, form: undefined }));
    setMessage("");
  }

  function changeSide(index, value) {
    setValues((current) => {
      const sides = [...current.lados];
      sides[index] = value;
      return { ...current, lados };
    });
    setErrors((current) => ({ ...current, lados: undefined, form: undefined }));
  }

  async function submit(event) {
    event.preventDefault();
    setErrors({});
    setMessage("");
    setPending(true);

    try {
      if (editing) {
        const fields = {};
        const fieldMap = {
          manzano_id: values.manzano_id,
          numero: values.numero,
          categoria: nullableValue(values.categoria),
          superficie_verificada_m2: nullableValue(values.superficie),
          precio_por_m2: nullableValue(values.precio_por_m2),
          precio_referencia_total: nullableValue(values.precio_referencia_total),
          moneda_referencia: nullableValue(values.moneda_referencia),
          habilitado_para_venta:
            values.habilitado_para_venta === "null"
              ? null
              : values.habilitado_para_venta === "true",
          observaciones: nullableValue(values.observaciones),
        };
        for (const [field, value] of Object.entries(fieldMap)) {
          if (baseline[field] !== value) fields[field] = value;
        }

        const parsed = updateLoteFieldsSchema.safeParse(fields);
        if (!parsed.success) {
          setErrors(formErrors(parsed.error.issues));
          return;
        }

        const result = await apiRequest(`/api/v1/lotes/${loteId}`, {
          method: "PATCH",
          body: JSON.stringify({ version: baseline.version, fields: parsed.data }),
        });
        setBaseline({
          ...baseline,
          ...parsed.data,
          version: result.data.version,
        });
        setValues((current) => ({
          ...current,
          manzano_id: fields.manzano_id ?? current.manzano_id,
          numero: fields.numero ?? current.numero,
          categoria: Object.hasOwn(fields, "categoria") ? fields.categoria ?? "" : current.categoria,
          superficie: Object.hasOwn(fields, "superficie_verificada_m2")
            ? fields.superficie_verificada_m2 ?? ""
            : current.superficie,
          precio_por_m2: Object.hasOwn(fields, "precio_por_m2")
            ? fields.precio_por_m2 ?? ""
            : current.precio_por_m2,
          precio_referencia_total: Object.hasOwn(fields, "precio_referencia_total")
            ? fields.precio_referencia_total ?? ""
            : current.precio_referencia_total,
          moneda_referencia: Object.hasOwn(fields, "moneda_referencia")
            ? fields.moneda_referencia ?? ""
            : current.moneda_referencia,
          habilitado_para_venta: Object.hasOwn(fields, "habilitado_para_venta")
            ? valueForEnabled(fields.habilitado_para_venta)
            : current.habilitado_para_venta,
          observaciones: Object.hasOwn(fields, "observaciones")
            ? fields.observaciones ?? ""
            : current.observaciones,
        }));
        setMessage("Los cambios se guardaron correctamente.");
        router.refresh();
      } else {
        const sideValues = values.lados
          .map((length, index) => ({
            orden: index + 1,
            longitud_m: length,
          }))
          .filter((side) => side.longitud_m !== "");
        const input = {
          manzano_id: values.manzano_id,
          numero: values.numero,
          categoria: nullableValue(values.categoria),
          superficie_m2: nullableValue(values.superficie),
          precio_por_m2: nullableValue(values.precio_por_m2),
          precio_referencia_total: nullableValue(values.precio_referencia_total),
          moneda_referencia:
            values.precio_por_m2 || values.precio_referencia_total
              ? values.moneda_referencia
              : null,
          habilitado_para_venta:
            values.habilitado_para_venta === "null"
              ? null
              : values.habilitado_para_venta === "true",
          observaciones: nullableValue(values.observaciones),
          ...(sideValues.length ? { lados: sideValues } : {}),
        };
        const parsed = createLoteSchema.safeParse(input);
        if (!parsed.success) {
          setErrors(formErrors(parsed.error.issues));
          return;
        }

        const manzano = manzanos.find((item) => item.id === values.manzano_id);
        const confirmed = window.confirm(
          `Registrar lote ${manzano?.codigo ?? ""}-${values.numero} con habilitación ${
            values.habilitado_para_venta === "true"
              ? "confirmada"
              : values.habilitado_para_venta === "false"
                ? "no habilitada"
                : "sin confirmar"
          }?`,
        );
        if (!confirmed) return;

        const result = await apiRequest("/api/v1/lotes", {
          method: "POST",
          body: JSON.stringify(parsed.data),
        });
        router.replace(`/panel/lotes/${result.data.id}`);
        router.refresh();
      }
    } catch (error) {
      setMessage(error.message);
    } finally {
      setPending(false);
    }
  }

  if (loading) {
    return <p className="p-6 text-slate-600" role="status">Cargando formulario…</p>;
  }
  if (editing && !baseline) {
    return <p className="form-alert" role="alert">{message || "No fue posible cargar el lote para editarlo."}</p>;
  }

  return (
    <form className="form-stack" onSubmit={submit}>
      <fieldset className="form-section">
        <legend className="form-section-title">Identificación</legend>
        <div className="grid min-w-0 gap-4 sm:grid-cols-2">
        <label className="form-label">
          Manzano <RequiredMark />
          <select
            className="form-control"
            aria-describedby={errors.manzano_id ? "lot-manzano-error" : undefined}
            aria-invalid={Boolean(errors.manzano_id)}
            id="lot-manzano"
            onChange={(event) => change("manzano_id", event.target.value)}
            required
            value={values.manzano_id}
          >
            <option value="">Selecciona un manzano</option>
            {manzanos.map((manzano) => (
              <option key={manzano.id} value={manzano.id}>
                {manzano.codigo} — {manzano.urbanizacion?.nombre}
              </option>
            ))}
          </select>
          {errors.manzano_id ? <FieldError id="lot-manzano-error">{errors.manzano_id}</FieldError> : null}
        </label>

        <Field
          error={errors.numero}
          id="lot-number"
          label="Número de lote"
          onChange={(value) => change("numero", value)}
          required
          value={values.numero}
        />
        <label className="form-label">
          Categoría
          <select
            className="form-control"
            aria-describedby={errors.categoria ? "lot-category-error" : undefined}
            aria-invalid={Boolean(errors.categoria)}
            id="lot-category"
            onChange={(event) => change("categoria", event.target.value)}
            value={values.categoria}
          >
            <option value="">Sin informar</option>
            <option value="REGULAR">Regular</option>
            <option value="VIS">Vivienda de interés social (VIS)</option>
          </select>
          {errors.categoria ? <FieldError id="lot-category-error">{errors.categoria}</FieldError> : null}
        </label>
        </div>
      </fieldset>

      <fieldset className="form-section">
        <legend className="form-section-title">Características físicas</legend>
        <Field
          error={errors.superficie}
          id="lot-surface"
          label={surfaceLabel}
          onChange={(value) => change("superficie", value)}
          value={values.superficie}
        />
        <p className="field-help">
          {editing
            ? "La nueva superficie se guarda como verificada; la estimación de origen se conserva aparte."
            : "La superficie informada no se considera verificada en campo."}
        </p>
        {!editing ? (
          <div className="rounded-xl border border-border-subtle bg-background p-4">
            <h2 className="text-sm font-semibold text-slate-800">Longitudes de lados (opcional)</h2>
            <p className="field-help mb-3">
              Registra las longitudes informadas; quedarán pendientes de verificación.
            </p>
            <div className="grid min-w-0 gap-3 sm:grid-cols-2 lg:grid-cols-4">
              {values.lados.map((value, index) => (
                <Field
                  key={index}
                  error={index === 0 ? errors.lados : undefined}
                  id={`lot-side-${index + 1}`}
                  label={`Lado ${index + 1} (m)`}
                  onChange={(next) => changeSide(index, next)}
                  value={value}
                />
              ))}
            </div>
          </div>
        ) : null}
      </fieldset>

      <fieldset className="form-section">
        <legend className="form-section-title">Información comercial</legend>
        <div className="grid min-w-0 gap-4 sm:grid-cols-2">
        <Field
          error={errors.precio_por_m2}
          id="lot-price-area"
          label="Precio por m² (opcional)"
          onChange={(value) => change("precio_por_m2", value)}
          value={values.precio_por_m2}
        />
        <Field
          error={errors.precio_referencia_total}
          id="lot-price-total"
          label="Precio total de referencia (opcional)"
          onChange={(value) => change("precio_referencia_total", value)}
          value={values.precio_referencia_total}
        />
        <label className="form-label">
          Moneda
          <select
            className="form-control"
            id="lot-currency"
            onChange={(event) => change("moneda_referencia", event.target.value)}
            value={values.moneda_referencia}
          >
            <option value="">Sin informar</option>
            <option value="USD">USD — dólar estadounidense</option>
            <option value="BOB">BOB — boliviano</option>
          </select>
        </label>
        <label className="form-label">
          Habilitación comercial
          <select
            className="form-control"
            id="lot-enabled"
            onChange={(event) => change("habilitado_para_venta", event.target.value)}
            value={values.habilitado_para_venta}
          >
            <option value="null">Sin confirmar</option>
            <option value="true">Habilitado para venta</option>
            <option value="false">No habilitado</option>
          </select>
          <span className="field-help">La habilitación es distinta de la disponibilidad calculada.</span>
        </label>
        </div>
      </fieldset>

      {editing ? (
        <section className="rounded-xl border border-slate-200 bg-slate-50 p-4 text-sm">
          <h2 className="font-semibold text-slate-800">Procedencia conservada</h2>
          <p className="mt-1 text-slate-600">
            La superficie de origen y los lados importados no se sobrescriben.
            La nueva superficie se guarda separada como verificada por el
            propietario que la registra.
          </p>
        </section>
      ) : null}

      <label className="form-label">
        Observaciones internas (opcional)
        <textarea
          className="form-control"
          aria-describedby={errors.observaciones ? "lot-notes-error" : undefined}
          aria-invalid={Boolean(errors.observaciones)}
          id="lot-notes"
          maxLength={1000}
          onChange={(event) => change("observaciones", event.target.value)}
          value={values.observaciones}
        />
        {errors.observaciones ? <FieldError id="lot-notes-error">{errors.observaciones}</FieldError> : null}
      </label>

      {message ? (
        <p className="form-alert" role={message.includes("guardaron") ? "status" : "alert"}>
          {message}
        </p>
      ) : null}
      {errors.form ? <FieldError>{errors.form}</FieldError> : null}

      <div className="form-actions border-t border-border-subtle pt-4">
        <button
          className="btn-primary"
          disabled={pending || manzanos.length === 0}
          type="submit"
        >
          {pending ? "Guardando…" : editing ? "Guardar cambios" : "Registrar lote"}
        </button>
        <Link
          className="btn-secondary"
          href={editing ? `/panel/lotes/${loteId}` : "/panel/lotes"}
        >
          Cancelar
        </Link>
      </div>
    </form>
  );
}

function Field({ error, id, label, onChange, required = false, value }) {
  const errorId = `${id}-error`;
  return (
    <label className="form-label" htmlFor={id}>
      {label} {required ? <RequiredMark /> : null}
      <input
        aria-describedby={error ? errorId : undefined}
        aria-invalid={Boolean(error)}
        className="form-control"
        id={id}
        inputMode={label.includes("m²") || label.includes("(m)") ? "decimal" : "numeric"}
        onChange={(event) => onChange(event.target.value)}
        required={required}
        type="text"
        value={value}
      />
      {error ? <FieldError id={errorId}>{error}</FieldError> : null}
    </label>
  );
}

function RequiredMark() {
  return <><span className="required-mark" aria-hidden="true">*</span><span className="sr-only"> obligatorio</span></>;
}

function FieldError({ children, id }) {
  return <span className="field-error" id={id}>{children}</span>;
}

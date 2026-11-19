import "server-only";

export async function listAdminLotes(supabase, query) {
  const { data, error } = await supabase.rpc("admin_list_lotes", {
    p_search: query.q || null,
    p_manzano_id: query.manzano_id || null,
    p_disponibilidad: query.disponibilidad || null,
    p_categoria: query.categoria || null,
    p_area_min: query.area_min || null,
    p_area_max: query.area_max || null,
    p_precio_min: query.precio_min || null,
    p_precio_max: query.precio_max || null,
    p_order_by: query.order_by,
    p_order_ascending: query.order === "asc",
    p_limit: query.page_size,
    p_offset: (query.page - 1) * query.page_size,
  });
  if (error) return { error };

  const rows = data ?? [];
  return {
    items: rows.map((row) => row.item),
    total: rows.length ? Number(rows[0].total_count) : 0,
  };
}

export async function getAdminLote(supabase, id) {
  const { data, error } = await supabase.rpc("admin_get_lote", { p_lote_id: id });
  return { data, error };
}

export async function createLote(supabase, input) {
  const { data, error } = await supabase.rpc("create_lote", { p_input: input });
  return { data, error };
}

export async function updateLote(supabase, id, version, fields) {
  const { data, error } = await supabase.rpc("update_lote", {
    p_lote_id: id,
    p_expected_version: version,
    p_input: fields,
  });
  return { data, error };
}

export async function listManzanos(supabase) {
  const { data, error } = await supabase
    .from("manzanos")
    .select("id,codigo,numero,urbanizacion:urbanizaciones(nombre)")
    .order("codigo", { ascending: true });
  return { data, error };
}

export async function listPublicManzanos(supabase) {
  const { data, error } = await supabase
    .from("manzanos")
    .select("id,codigo,numero")
    .order("codigo", { ascending: true });
  return { data, error };
}

export async function listPublicLotes(supabase, query) {
  const { data, error } = await supabase.rpc("public_list_lotes", {
    p_search: query.q || null,
    p_manzano_id: query.manzano_id || null,
    p_categoria: query.categoria || null,
    p_area_min: query.area_min || null,
    p_area_max: query.area_max || null,
    p_precio_min: query.precio_min || null,
    p_precio_max: query.precio_max || null,
    p_order_by: query.order_by,
    p_order_ascending: query.order === "asc",
    p_limit: query.page_size,
    p_offset: (query.page - 1) * query.page_size,
  });
  if (error) return { error };

  const rows = data ?? [];
  return {
    items: rows.map((row) => row.item),
    total: rows.length ? Number(rows[0].total_count) : 0,
  };
}

export async function getPublicLote(supabase, id) {
  const { data, error } = await supabase
    .from("lotes")
    .select(
      "id,manzano_id,numero,categoria,superficie_m2,superficie_estimada_pdf_m2,superficie_verificada_m2,superficies_procedencia,precio_por_m2,precio_referencia_total,precio_lista,moneda_referencia,moneda,manzano:manzanos!inner(codigo,numero,urbanizacion:urbanizaciones!inner(nombre,ubicacion)),lados:lote_lados(orden,cota_plano_m,longitud_m,longitud_estimada_pdf_m,longitud_procedencia)",
    )
    .eq("id", id)
    .maybeSingle();

  if (error) return { error };
  if (!data) return { data: null, error: null };
  return {
    data: {
      id: data.id,
      numero: data.numero,
      categoria: data.categoria,
      manzano: {
        codigo: data.manzano.codigo,
        numero: data.manzano.numero,
      },
      urbanizacion: data.manzano.urbanizacion,
      superficie_m2: data.superficie_m2,
      superficie_estimada_pdf_m2: data.superficie_estimada_pdf_m2,
      superficie_verificada_m2: data.superficie_verificada_m2,
      superficies_procedencia: data.superficies_procedencia,
      precio_por_m2: data.precio_por_m2,
      precio_referencia_total: data.precio_referencia_total,
      precio_lista: data.precio_lista,
      moneda_referencia: data.moneda_referencia,
      moneda: data.moneda,
      lados: data.lados ?? [],
    },
    error: null,
  };
}

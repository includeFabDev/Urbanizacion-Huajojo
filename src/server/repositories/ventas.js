import "server-only";

export async function listSaleClients(supabase, query) {
  const { data, error } = await supabase.rpc("list_sale_clients", {
    p_search: query.q || null,
    p_limit: query.limit,
  });
  return { data: (data ?? []).map((row) => row.item), error };
}

export async function createSaleClient(supabase, input) {
  const { data, error } = await supabase.rpc("create_sale_client", { p_input: input });
  return { data, error };
}

export async function listSales(supabase, query) {
  const { data, error } = await supabase.rpc("admin_list_sales", {
    p_search: query.q || null,
    p_limit: query.page_size,
    p_offset: (query.page - 1) * query.page_size,
  });
  if (error) return { error };
  const rows = data ?? [];
  return {
    items: rows.map((row) => row.item).filter(Boolean),
    total: rows.length ? Number(rows[0].total_count) : 0,
    error: null,
  };
}

export async function getSale(supabase, id) {
  const { data, error } = await supabase.rpc("admin_sale_detail", { p_sale_id: id });
  return { data, error };
}

export async function insertSale(supabase, input) {
  const { data, error } = await supabase.rpc("register_sale", { p_input: input });
  return { data, error };
}

export async function insertSalePayment(supabase, saleId, input) {
  const { data, error } = await supabase.rpc("register_sale_payment", {
    p_sale_id: saleId,
    p_input: input,
  });
  return { data, error };
}

export async function getPaymentReceipt(supabase, id) {
  const { data, error } = await supabase.rpc("admin_payment_receipt", {
    p_payment_id: id,
  });
  return { data, error };
}

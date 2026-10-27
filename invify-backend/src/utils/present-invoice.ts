export function presentInvoice(row: any) {
  const customer = row?.customer;
  const customerName =
    customer?.name ||
    row?.customer_name ||
    row?.metadata?.customer_name ||
    null;
  return {
    ...row,
    status: row?.payment_status || row?.status,
    customer_name: customerName,
    metadata: {
      ...(row?.metadata || {}),
      customer_name: customerName || row?.metadata?.customer_name,
    },
  };
}

import { component$ } from "@builder.io/qwik";
import { routeLoader$ } from "@builder.io/qwik-city";
import { getTransactions } from "../../db";

export const useTransactions = routeLoader$(async (requestEvent) => {
  const from = requestEvent.url.searchParams.get("from");
  const to = requestEvent.url.searchParams.get("to");
  const category = requestEvent.url.searchParams.get("category");

  const transactions = getTransactions({ from, to, category });

  return {
    transactions,
    filters: { from, to, category },
  };
});

export default component$(() => {
  const data = useTransactions();

  const searchParams = new URLSearchParams();
  if (data.value.filters.from) searchParams.set("from", data.value.filters.from);
  if (data.value.filters.to) searchParams.set("to", data.value.filters.to);
  if (data.value.filters.category) searchParams.set("category", data.value.filters.category);

  const searchStr = searchParams.toString();
  const exportHref = `/reports/export${searchStr ? "?" + searchStr : ""}`;

  return (
    <div style={{ padding: "20px", fontFamily: "sans-serif" }}>
      <h1>Expense Transactions Report</h1>

      <form method="get" action="/reports" style={{ marginBottom: "20px", display: "flex", gap: "15px", alignItems: "flex-end" }}>
        <div>
          <label style={{ display: "block", marginBottom: "5px" }} for="from">From Date:</label>
          <input type="date" id="from" name="from" value={data.value.filters.from || ""} style={{ padding: "5px" }} />
        </div>
        <div>
          <label style={{ display: "block", marginBottom: "5px" }} for="to">To Date:</label>
          <input type="date" id="to" name="to" value={data.value.filters.to || ""} style={{ padding: "5px" }} />
        </div>
        <div>
          <label style={{ display: "block", marginBottom: "5px" }} for="category">Category:</label>
          <input type="text" id="category" name="category" value={data.value.filters.category || ""} style={{ padding: "5px" }} />
        </div>
        <button type="submit" style={{ padding: "6px 12px", cursor: "pointer" }}>Filter</button>
        <a href="/reports" style={{ padding: "6px 12px", textDecoration: "none", background: "#eee", color: "#333", border: "1px solid #ccc", borderRadius: "3px" }}>Clear</a>
      </form>

      <div style={{ marginBottom: "20px" }}>
        <a href={exportHref} style={{ fontSize: "16px", fontWeight: "bold", textDecoration: "underline" }}>Download CSV</a>
      </div>

      <table border="1" cellPadding="8" style={{ borderCollapse: "collapse", width: "100%" }}>
        <thead>
          <tr style={{ backgroundColor: "#f2f2f2" }}>
            <th>ID</th>
            <th>Date</th>
            <th>Category</th>
            <th>Description</th>
            <th>Amount</th>
          </tr>
        </thead>
        <tbody>
          {data.value.transactions.length === 0 ? (
            <tr>
              <td colSpan={5} style={{ textAlign: "center" }}>No transactions found</td>
            </tr>
          ) : (
            data.value.transactions.map((t) => (
              <tr key={t.id}>
                <td>{t.id}</td>
                <td>{t.date}</td>
                <td>{t.category}</td>
                <td>{t.description}</td>
                <td>{t.amount}</td>
              </tr>
            ))
          )}
        </tbody>
      </table>
    </div>
  );
});

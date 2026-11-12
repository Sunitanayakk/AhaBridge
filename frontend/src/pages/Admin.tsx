import { useQuery } from "@tanstack/react-query";
import { api } from "../lib/api";
import { ErrorBox, Loading, PageTitle } from "../components/ui";
export function Admin() {
  const q = useQuery({
      queryKey: ["admin-health"],
      queryFn: () => api("/admin/health-summary"),
    }),
    logs = useQuery({
      queryKey: ["audit"],
      queryFn: () => api("/admin/audit"),
    });
  return (
    <section className="section-wrap">
      <PageTitle
        eyebrow="PLATFORM STEWARD"
        title="Health, with learner privacy intact."
      >
        Aggregate health and elevated-action history. Provision approved
        teachers using the operator CLI documented in the README.
      </PageTitle>
      <ErrorBox error={q.error || logs.error} />
      {q.isPending ? (
        <Loading />
      ) : (
        <div className="metric-grid">
          {["organizations", "classrooms", "users"].map((k) => (
            <div className="paper metric" key={k}>
              <strong>{q.data?.[k]}</strong>
              <span>{k}</span>
            </div>
          ))}
        </div>
      )}
      <div className="paper table-scroll">
        <h2>Audit history</h2>
        <table>
          <thead>
            <tr>
              <th>Action</th>
              <th>Target</th>
              <th>Time</th>
            </tr>
          </thead>
          <tbody>
            {logs.data?.items.map((l: any) => (
              <tr key={l.id}>
                <td>{l.action}</td>
                <td>{l.target_type}</td>
                <td>{new Date(l.created_at).toLocaleString()}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </section>
  );
}

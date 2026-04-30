type StatCardProps = {
  label: string;
  value: string;
  change: string;
  trend: "up" | "down";
};

const stats: StatCardProps[] = [
  { label: "Total Orders", value: "23,450", change: "+12.3% vs last week", trend: "up" },
  { label: "Avg. Delivery Time", value: "32 min", change: "-4 min vs avg", trend: "down" },
  { label: "Active Drivers", value: "142", change: "+18 vs yesterday", trend: "up" },
  { label: "Customer Satisfaction", value: "4.8 / 5", change: "+0.2 vs last month", trend: "up" },
];

const recentOrders = [
  { id: "#42103", hub: "Central Kitchen", customer: "Noora Patel", status: "Delivered", total: "$48.60" },
  { id: "#42102", hub: "Uptown Hub", customer: "Marcus Lee", status: "In Transit", total: "$32.20" },
  { id: "#42101", hub: "Harbor Hub", customer: "Dana Miller", status: "Delayed", total: "$58.10" },
  { id: "#42100", hub: "Central Kitchen", customer: "Alex Santos", status: "Preparing", total: "$22.40" },
];

const schedule = [
  { time: "08:30", task: "Driver briefing – morning shift", owner: "Logistics" },
  { time: "11:00", task: "Menu sync with suppliers", owner: "Procurement" },
  { time: "15:30", task: "QA spot checks (zone 3)", owner: "Ops" },
];

const activity = [
  { label: "On-time deliveries", value: "92%", meta: "Target: 90%" },
  { label: "New signups", value: "318", meta: "Past 7 days" },
  { label: "Refunds issued", value: "12", meta: "Down 8% vs last week" },
];

function SectionCard({ title, action, children }: { title: string; action?: string; children: React.ReactNode }) {
  return (
    <section className="rounded-3xl border border-slate-800 bg-slate-900/60 p-6 shadow-xl shadow-black/30">
      <div className="mb-4 flex items-center justify-between gap-4">
        <h2 className="text-base font-semibold text-white">{title}</h2>
        {action ? (
          <button className="text-xs font-medium text-sky-400 transition hover:text-sky-200">{action}</button>
        ) : null}
      </div>
      {children}
    </section>
  );
}

function TrendSparkline({ trend }: { trend: "up" | "down" }) {
  return (
    <span
      aria-hidden
      className={`inline-flex h-6 w-6 items-center justify-center rounded-full text-xs font-semibold ${
        trend === "up" ? "bg-emerald-500/20 text-emerald-300" : "bg-rose-500/20 text-rose-300"
      }`}
    >
      {trend === "up" ? "↑" : "↓"}
    </span>
  );
}

export default function DashboardHome() {
  return (
    <>
      <header className="flex flex-col gap-4 rounded-3xl border border-slate-900 bg-slate-900/70 px-6 py-5 shadow-lg shadow-black/30 lg:flex-row lg:items-center lg:justify-between">
        <div>
          <p className="text-sm text-slate-400">Friday, 21 Nov 2025</p>
          <h2 className="text-2xl font-semibold text-white">Dashboard Overview</h2>
        </div>
        <div className="flex flex-wrap gap-3 text-sm">
          <button className="rounded-2xl bg-slate-800/80 px-4 py-2 font-medium text-white shadow-lg shadow-black/30 transition hover:bg-slate-700/80">
            New campaign
          </button>
          <button className="rounded-2xl bg-sky-500 px-4 py-2 font-semibold text-slate-950 shadow-lg shadow-sky-500/40 hover:bg-sky-400">
            Sync reports
          </button>
        </div>
      </header>

      <section className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
        {stats.map((item) => (
          <div key={item.label} className="flex items-center gap-4 rounded-3xl border border-slate-900 bg-slate-900/60 p-5 shadow-lg shadow-black/20">
            <TrendSparkline trend={item.trend} />
            <div className="flex-1">
              <p className="text-xs uppercase tracking-wide text-slate-500">{item.label}</p>
              <p className="text-xl font-semibold text-white">{item.value}</p>
              <p className={`text-xs ${item.trend === "up" ? "text-green-400" : "text-rose-400"}`}>{item.change}</p>
            </div>
          </div>
        ))}
      </section>

      <section className="grid gap-6 lg:grid-cols-3">
        <SectionCard title="Recent Orders" action="View all">
          <div className="space-y-4">
            {recentOrders.map((order) => (
              <div
                key={order.id}
                className="flex flex-wrap items-center gap-3 rounded-2xl border border-slate-900 bg-slate-950/40 px-4 py-3 text-sm"
              >
                <div className="flex-1">
                  <p className="font-semibold text-white">{order.customer}</p>
                  <p className="text-xs text-slate-500">
                    {order.id} · {order.hub}
                  </p>
                </div>
                <span className="rounded-full bg-white/5 px-3 py-1 text-xs text-white">{order.status}</span>
                <p className="font-semibold text-white">{order.total}</p>
              </div>
            ))}
          </div>
        </SectionCard>

        <SectionCard title="Ops Schedule" action="Edit">
          <div className="space-y-4">
            {schedule.map((item) => (
              <div key={item.task} className="rounded-2xl border border-slate-900 bg-slate-950/40 px-4 py-3">
                <p className="text-xs text-slate-500">{item.time}</p>
                <p className="text-sm font-semibold text-white">{item.task}</p>
                <p className="text-xs text-slate-400">Owner: {item.owner}</p>
              </div>
            ))}
          </div>
        </SectionCard>

        <SectionCard title="Live Activity">
          <div className="space-y-5">
            {activity.map((item) => (
              <div key={item.label} className="flex items-center justify-between">
                <div>
                  <p className="text-sm text-slate-400">{item.label}</p>
                  <p className="text-xs text-slate-500">{item.meta}</p>
                </div>
                <p className="text-xl font-semibold text-white">{item.value}</p>
              </div>
            ))}
            <div className="rounded-2xl border border-slate-900 bg-gradient-to-r from-sky-600/20 to-cyan-500/10 px-5 py-4 text-sm">
              <p className="font-semibold text-white">Logistics Update</p>
              <p className="text-slate-300">Zone 2 backlog cleared. Expect 15% faster routing after 16:00.</p>
            </div>
          </div>
        </SectionCard>
      </section>
    </>
  );
}


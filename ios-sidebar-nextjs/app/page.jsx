export default function HomePage() {
  const cards = [
    { label: "Active Revenue", value: "$12,450", trend: "+12%", color: "#007AFF" },
    { label: "Total Students", value: "1,240", trend: "+5%", color: "#34C759" },
    { label: "Completion Rate", value: "88%", trend: "+2%", color: "#FF9500" },
    { label: "New Inquiries", value: "24", trend: "-3%", color: "#FF3B30" },
  ];

  return (
    <div style={{ maxWidth: "1200px", margin: "0 auto" }}>
      {/* Page Header */}
      <header style={{ marginBottom: "40px" }}>
        <h1 style={{ fontSize: "32px", fontWeight: 800, color: "#1c1c1e", letterSpacing: "-1px", margin: 0 }}>
          Welcome back, Admin 👋
        </h1>
        <p style={{ color: "#636366", fontSize: "15px", marginTop: "8px", fontWeight: 500 }}>
          Manage your educational platform with ease and elegance.
        </p>
      </header>

      {/* Stat Grid */}
      <div style={{
        display: "grid",
        gridTemplateColumns: "repeat(auto-fit, minmax(240px, 1fr))",
        gap: "24px",
        marginBottom: "40px",
      }}>
        {cards.map((card, i) => (
          <div
            key={i}
            style={{
              backgroundColor: "rgba(255,255,255,0.7)",
              backdropFilter: "blur(20px)",
              borderRadius: "24px",
              padding: "28px",
              border: "1px solid rgba(255,255,255,0.5)",
              boxShadow: "0 8px 32px rgba(0,0,0,0.06)",
              transition: "transform 0.3s ease",
              cursor: "pointer",
            }}
            onMouseEnter={(e) => e.currentTarget.style.transform = "translateY(-6px)"}
            onMouseLeave={(e) => e.currentTarget.style.transform = "translateY(0)"}
          >
            <p style={{ margin: "0 0 12px 0", fontSize: "13px", fontWeight: 700, color: "#8e8e93", textTransform: "uppercase" }}>
              {card.label}
            </p>
            <div style={{ display: "flex", alignItems: "flex-end", gap: "10px" }}>
              <span style={{ fontSize: "32px", fontWeight: 800, color: card.color }}>{card.value}</span>
              <span style={{ fontSize: "14px", fontWeight: 700, color: card.trend.startsWith('+') ? "#34C759" : "#FF3B30", paddingBottom: "4px" }}>
                {card.trend}
              </span>
            </div>
          </div>
        ))}
      </div>

      {/* Large Content Area */}
      <section style={{
        backgroundColor: "rgba(255,255,255,0.6)",
        backdropFilter: "blur(24px)",
        borderRadius: "28px",
        border: "1px solid rgba(255,255,255,0.4)",
        padding: "40px",
        minHeight: "400px",
        boxShadow: "0 4px 24px rgba(0,0,0,0.05)",
      }}>
        <h2 style={{ fontSize: "20px", fontWeight: 700, color: "#1c1c1e", marginBottom: "20px" }}>
          Platform Analytics Overview
        </h2>
        <div style={{ display: "flex", flexDirection: "column", gap: "16px" }}>
          {[1, 2, 3].map(item => (
            <div key={item} style={{ height: "12px", borderRadius: "6px", backgroundColor: "rgba(0,0,0,0.05)", width: `${100 - item * 20}%` }} />
          ))}
          <p style={{ color: "#8e8e93", fontSize: "14px", lineHeight: 1.6, marginTop: "20px" }}>
            The sidebar to your left is fully interactive. Try clicking the toggle icon at the top to collapse it into icon-only mode. 
            On mobile devices, this sidebar transforms into a hidden drawer activated by a hamburger menu. 
            All styles are implemented using inline CSS and standard React hooks to ensure a lightweight, library-free experience.
          </p>
        </div>
      </section>
    </div>
  );
}

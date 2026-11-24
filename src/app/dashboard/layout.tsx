import "../management.css";
import RetentionNotice from "@/components/RetentionNotice";

export default function DashboardLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <>
      {/* Guasto dell'ultimo giro di conservazione dati: visibile in tutta l'area staff. */}
      <RetentionNotice />
      {children}
    </>
  );
}

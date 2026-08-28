/* ═══════════════════════════════════════════════════════════════
   TUS DATOS DE SUPABASE

   Estos dos valores son PUBLICOS por diseño. La anon key solo puede
   hacer lo que permiten las reglas de la base (Row Level Security),
   y esas reglas exigen tener la sesión iniciada. Sin tu contraseña,
   quien tenga esta clave no ve ni una fila.

   La que NUNCA va acá es la "service_role" / "secret key": esa se
   saltea todas las reglas.
   ═══════════════════════════════════════════════════════════════ */
window.CONFIG = {
  SUPABASE_URL: 'https://fwfaecdrgavcewrmijaz.supabase.co',
  SUPABASE_ANON_KEY: 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImZ3ZmFlY2RyZ2F2Y2V3cm1pamF6Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3ODc5MzI3OTgsImV4cCI6MjEwMzUwODc5OH0.hgq9yEjIdnvwhZC2irI4B9dqGWDdkfh9elcArYjPt80'
};

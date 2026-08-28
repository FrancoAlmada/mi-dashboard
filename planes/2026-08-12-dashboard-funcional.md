# Dashboard funcional — tareas propias, frase del día y mails

> **Reconstrucción a posteriori.** Este documento se armó desde el commit
> `8eb9031` y su diff. No es el plan original, que se perdió al sobrescribirse
> el archivo de la sesión.

**Commit:** `8eb9031` · 2026-08-12

## El problema

`dashboard-estilo-dos.html` era una maqueta linda pero muerta. Los datos de
tareas, eventos y mails venían de tres llamadas MCP (`window.cowork.callMcpTool`
a Notion, Google Calendar y Gmail) que **solo funcionan dentro del entorno de
Claude Cowork**. Abriendo el archivo en el navegador, ese bloque siempre
fallaba y la página se quedaba para siempre con los datos de respaldo de mayo.

## Decisiones tomadas

- **Tareas**: modelo unificado. "Hoy" es una vista de la columna del día actual
  dentro de los datos de la semana, no una lista aparte. Lo que cargás para el
  jueves aparece solo en "hoy" cuando llega el jueves.
- **Pendientes**: las tareas sin completar de días ya pasados se muestran al pie
  de la semana en un apartado rojo, "Tareas No Completadas".
- **Calendario**: se elimina. No se actualizaba fuera de Cowork y mostraba
  eventos viejos para siempre.
- **Gmail**: se difiere. La sección se construye completa con datos de ejemplo
  y el punto de conexión preparado, porque conectarlo de verdad requiere pasos
  manuales en Google Cloud.

## Qué se hizo

- Título "Dashboard" grande con gradiente lime → sky → peri
- Frase del día: 10 frases rotativas que nunca repiten la anterior
- Tareas de hoy y de la semana con una sola fuente de datos por semana
  (`tareas_wk_AAAA_M_D` en localStorage)
- Las tildadas quedan tachadas pero visibles; botón × para borrar
- Bloque rojo con los pendientes de días ya pasados
- Tracker de hábitos intacto
- Mails con UI completa y datos de ejemplo, con todo el acceso a datos aislado
  en `fetchMails()` para poder conectar Gmail después cambiando una sola función
- Eliminado el calendario y todo el código muerto de Notion/Calendar/MCP

## Lo que quedó pendiente

Conectar Gmail de verdad (OAuth con Google Identity Services, sirviendo la
página desde `http://localhost`).

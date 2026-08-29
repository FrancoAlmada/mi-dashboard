# Planes

Registro de los planes de trabajo del dashboard.

Claude guarda el plan de cada tanda en `~/.claude/plans/`, pero ahí hay **un solo
archivo por conversación y se sobrescribe** cada vez que se arma un plan nuevo.
Esta carpeta existe para que el registro no se pierda y quede versionado con Git.

Cada plan explica el **por qué** de los cambios: qué problema resolvía, qué
alternativas se descartaron y qué decisiones se tomaron. Eso es lo que un
mensaje de commit no alcanza a contar.

## Índice

| Fecha | Plan | Commits |
|---|---|---|
| 2026-08-12 | [Dashboard funcional](2026-08-12-dashboard-funcional.md) | `8eb9031` |
| 2026-08-24 | [Etiquetas, arrastre entre semanas y rachas](2026-08-24-etiquetas-arrastre-rachas.md) | `4538b7b` `8469bf0` |
| 2026-08-27 | [Layout: hoy y semana a todo el ancho](2026-08-27-layout-hoy-y-semana.md) | `da901c9` |
| 2026-08-27 | [Respaldo, tiempo medido y cierre de semana](2026-08-27-respaldo-tiempo-y-cierre-de-semana.md) | `1b733ca` → `12f097c` |
| 2026-08-28 | [Tarjetas de la semana parejas](2026-08-28-tarjetas-parejas.md) | `a8b3d16` `428e93f` `2bdc64b` |
| 2026-08-28 | [Mover tareas entre días arrastrando](2026-08-28-mover-tareas-arrastrando.md) | `86cb0f9` |
| 2026-08-28 | [App instalable y datos sincronizados](2026-08-28-app-instalable-y-sincronizada.md) | `1a21043` → `d6e37ed` |
| 2026-08-29 | [Arreglos de pantalla en celular y escritorio](2026-08-29-arreglos-de-pantalla.md) | (este) |

## Aviso sobre los cuatro primeros

Los planes anteriores al 2026-08-28 son **reconstrucciones a posteriori**,
armadas a partir de los mensajes de commit y de los diffs. No son los
documentos que se aprobaron en su momento: esos se perdieron al sobrescribirse
el archivo de la sesión. Cada uno lo aclara arriba de todo.

Del 2026-08-28 en adelante, el plan se guarda acá **antes** de empezar a
implementar, así queda el documento real.

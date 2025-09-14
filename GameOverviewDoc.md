TÍTULO <NombreGenericoDeAutoBattler> — Documento de Diseño Básico (v0.2)

RESUMEN
Auto‑battler por turnos con foco en lectura del rival y gestión de pool limitada. Cada cuenta desbloquea nuevas pools de PJ/campeones al subir de nivel. El combate alterna acciones entre jugadores y sus 3 PJ activos; el orden lo define la posición en tablero. Partidas en lobby par (8 jugadores objetivo). Si queda número impar, un jugador se empareja con el “fantasma” del último eliminado. Duración objetivo por match: \~10 minutos (máx. \~15).

PILARES DE DISEÑO
• Claridad táctica: tablero 3×6 (3×3 por lado) y orden de turno determinista por posición.
• Decisiones entre rondas: reposicionamiento, compras y rerolls fuera del combate.
• Progresión significativa: economía de XP en partida y progresión de cuenta a largo plazo.

1. LOBBY Y MATCHMAKING
   • Tamaño: 8 jugadores (mín/máx: 8/8).
   • Emparejamiento: todos contra todos por rondas sin repetir hasta completar el ciclo. Gana el último en pie.
   • Fantasma: ante número impar, un jugador enfrenta al “fantasma” del último eliminado hasta volver a número par.
   • Reingresos: no hay. Espectador: sí para eliminados.
   • Duración objetivo: \~10 minutos por match (con excepciones hasta \~15).

2. EQUIPO, CAMPEÓN Y POOLS
   • Equipo por jugador: 6 unidades totales (Campeón + 5 PJ). Máximo 3 activos simultáneamente en combate.
   • Campeón: se elige 1 entre 3 opciones al inicio del match (1 reroll gratuito). No se puede vender; debe permanecer al menos en banca. Es único por jugador y solo aparece en su tienda para subir de nivel.
   • Campeón — rol sistémico: habilidad de campeón que puede afectar tienda, tablero, estadísticas o conjuntos específicos de PJ. No es obligatorio alinearlo en tablero.
   • Pools: determinadas por nivel de cuenta. Cada 10 niveles de cuenta se desbloquea una nueva pool de PJ y de campeones.

3. TABLERO Y POSICIONAMIENTO
   • Disposición: 3 columnas × 6 filas (hexágonos). Cada jugador controla su cuadrícula 3×3.
   • Orden de turno: lectura de izquierda a derecha y de arriba hacia abajo dentro del lado de cada jugador (esquina superior izquierda → … → esquina inferior derecha).
   • Huecos: si una unidad muere, la casilla queda vacía. No hay reordenamiento automático.
   • Posicional: ciertas posiciones podrán otorgar buffs o habilitar habilidades (definición por contenido).
   • Reposicionamiento: solo fuera del combate (entre rounds). Drag & drop; sin coste por ahora.
   • Banca (bench): tamaño 4. Se puede reorganizar libremente antes de comenzar y al terminar el set de rounds de un stage.
   • Objetivo: auto‑target siempre; habilidades pueden depender del posicionamiento.

4. COMBATE POR TURNOS
   • Secuencia base de acciones: Usuario 1 — PJ en su primer slot activo → Usuario 2 — PJ en su primer slot activo → Usuario 1 — su segundo slot activo → Usuario 2 — su segundo slot activo → …
   • Acciones de unidad: ataque básico o habilidad si cumple condiciones (maná/trigger). Las habilidades pueden reemplazar el ataque, acompañarlo o dispararse por triggers simples (a definir por unidad).
   • Tiempo: no hay temporizador por turno (auto‑battler). La interacción del jugador ocurre fuera del combate.
   • Empate de round: gana el jugador que haya hecho más daño total en ese round.
   • Fin de round: otorgar recompensas y aplicar daño al jugador defensor/ambos según resultado (ver Daño al jugador).

5. DAÑO AL JUGADOR Y VIDA
   • Vida del jugador: cada jugador tiene puntos de vida.
   • Daño por derrota de round: vida perdida = unidades enemigas en pie + X (parámetro global a definir).
   • Eliminación: al llegar a 0, el jugador queda fuera. Su “fantasma” puede ser utilizado para emparejamientos impares.

6. ECONOMÍA DE PARTIDA (XP MATCH‑WIDE)
   • Moneda única: XP de match.
   • Ganancias por round: +X por ganar o perder; bonus adicional por cantidad de PJ propios vivos si se gana; bonus por racha de victorias. (Valores exactos a definir, base‑10 recomendada para ajuste fino.)
   • Gastos: comprar PJ y hacer reroll consumen XP.
   • Reintegro: vender devuelve 100% del costo (compra = venta).
   • Subidas: subir de nivel PJ o campeón y eliminar enemigos otorgan XP (progresión tipo “Minecraft”: ver fórmula de leveleo como referencia general).
   • Distribución por stage: la XP acumulada de un stage se reparte al inicio del siguiente.

7. TIENDA
   • Acceso: fuera del combate (entre rounds/stages).
   • Opciones visibles: 3 por refresco.
   • Reroll: costo = 1 + 1 por cada reroll consecutivo; el contador se resetea al inicio de cada stage.
   • Nivel de tienda: sube cada X rondas; nivel máximo aproximado = número de stages / 2.
   • Rarezas: mínimo 5 rarezas con probabilidades dependientes del nivel de tienda.
   • Campeón personal: garantizado que puede aparecer en la tienda personal (según probabilidad/rareza) para permitir su subida de nivel.
   • Selección de campeón (inicio de match): toma 3 de la pool habilitada para ese nivel de cuenta; 1 reroll gratuito en esa selección.

8. PROGRESIÓN DE CUENTA (XP ACCOUNT‑WIDE)
   • Ganancias: por quedar entre los primeros X puestos del match y por ganar matches.
   • Desbloqueos: cada 10 niveles de cuenta desbloquea nuevas pools de PJ/campeones (se acumulan a las existentes).
   • Niveles de cuenta: base de 40 niveles; expansiones futuras posibles. Sin monetización por ahora (progresión in‑game). Skins u otros cosméticos en evaluación futura.
   • Fórmula de nivel: referencia “Minecraft” para curva de experiencia.

9. UNIDADES, STATS Y EVOLUCIÓN
   • Stats base por unidad: HP, DEF Física, DEF Mágica, ATK Físico, VEL de ATK, ATK Mágico, CRIT (probabilidad), DAÑO CRIT, MANÁ.
   • Sin caps duros por ahora; si aparece un combo roto, se aborda en balance.
   • Habilidades: cada unidad puede tener 1 habilidad (con descripción, coste de maná/trigger y efectos). Las habilidades pueden depender de posición o estados simples (stun, DoT, escudo, etc.).
   • Evolución (fusiones): Nivel 1 = 1 copia. Nivel 2 = fusión automática de 2 copias iguales (1+1). Nivel 3 = fusión automática de 2 unidades de nivel 2 (requiere 4 copias base).
   • Sinergias: foco en sinergias por habilidades/efectos (no por clase/raza). Los PJ en banca aportan a sinergias de los que están en tablero.

10. MODIFICADORES (TO‑DO)
    • Modificadores globales por MATCH, por STAGE y por ROUND, otorgados por el juego (no control directo del jugador). Se integrarán en fases posteriores, tras pulir el core loop.

11. CORE GAMEPLAY LOOP (RESUMEN)

1) Lobby: 8 jugadores; emparejamiento inicial.
2) Selección de campeón: 3 opciones de la pool de cuenta; 1 reroll gratuito.
3) Stage N: fase de preparación (tienda, reposicionamiento, fusiones); luego set de rounds auto‑resueltos por turnos.
4) Entre rounds: compras/rerolls/reposicionamiento (fuera del combate).
5) Fin de stage: repartir XP de stage; subir nivel de tienda si corresponde.
6) Repetir hasta que quede el último en pie; usar “fantasma” si hay impar.

12. ESQUEMAS DE OBJETOS (MINIMOS)
    Account
    • account\_id, nivel\_cuenta, xp\_account, desbloqueos\[], pools\_desbloqueadas{pj\[], campeones\[]}, campeones\_desbloqueados\[]

Lobby
• lobby\_id, jugadores\[], estado, reglas\_emparejamiento, seed

Match
• match\_id, lobby\_id, jugadores\_estado\[], stage\_actual, round\_actual, registro\_eventos\[]

Stage
• index, rounds\_totales, recompensas\_pendientes, estado

Round
• index, estado, daño\_causado\_por\_jugador{}, unidades\_vivas\_por\_jugador{}, resultado\_por\_jugador, recompensa\_round

PlayerState (por match)
• user\_id, campeon, bench\[4], board\_slots\_activos\[3], equipo\_total\[6], xp\_match, racha, vida\_jugador, nivel\_tienda, costo\_reroll\_actual, store\_entries\[3]

Unit (PJ)
• unit\_id, nombre, descripcion, habilidad, descripcion\_habilidad, stats{hp, def\_fis, def\_mag, atk\_fis, vel\_atk, atk\_mag, crit, crit\_dmg, mana}, estrella, nivel, etiquetas\_sinergia\[]

Champion (extiende Unit)
• habilidad\_campeon, es\_exclusivo\_de\_usuario(true), vendible(false)

StoreEntry
• unidad\_tipo, rareza, costo\_xp, visible\_para(user\_id), bloqueos, probabilidades\_por\_nivel\_tienda{}

Turno
• actor\_user\_id, actor\_slot, accion(ataque|habilidad), objetivo, resultado\_daño\_y\_efectos

Sinergia
• tag, criterios, umbrales\[], efectos\_por\_umbral\[]

13. PARÁMETROS POR DEFINIR (LISTA CORTA)
    • X base del daño al jugador por round perdido.
    • Valores numéricos de XP: ganancia por victoria/derrota, bonus por unidades vivas y por racha.
    • Cantidad de stages por match y de rounds por stage.
    • Tabla de probabilidades por rareza y por nivel de tienda.
    • Costes de maná/trigger y escalas de daño/defensa de stats base (semillas en base‑10).

FIN DEL DOCUMENTO (v0.2)

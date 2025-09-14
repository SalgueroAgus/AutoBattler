// Core data models (English code, brief Spanish comments)

export type Rarity = 'C' | 'R' | 'SR' | 'E' | 'L';

export interface Stats {
  hp: number;
  def_fis: number;
  def_mag: number;
  atk_fis: number;
  vel_atk: number; // escala daño base por simplicidad
  atk_mag: number;
  crit: number; // 0..1
  crit_dmg: number; // multiplier
  mana: number;
}

export interface Unit {
  unit_id: string;
  nombre: string;
  descripcion?: string;
  habilidad?: string;
  descripcion_habilidad?: string;
  stats: Stats;
  estrella: number; // star tier (1..3)
  nivel: number; // unit level for merges
  etiquetas_sinergia?: string[];
  rareza?: Rarity;
}

export interface Champion extends Unit {
  habilidad_campeon?: string;
  es_exclusivo_de_usuario: true;
  vendible: false;
}

export interface StoreEntry {
  unidad_tipo: string; // unit_id
  rareza: Rarity;
  costo_xp: number;
  visible_para: (user_id: string) => boolean; // runtime-only
  bloqueos?: string[];
  probabilidades_por_nivel_tienda?: Record<string, number>;
}

export interface Turno {
  actor_user_id: string;
  actor_slot: number; // 0..2
  accion: 'ataque' | 'habilidad';
  objetivo: { user_id: string; slot: number } | null;
  resultado_daño_y_efectos: string; // breve log
}

export interface Round {
  index: number;
  estado: 'pre' | 'en_curso' | 'fin';
  daño_causado_por_jugador: Record<string, number>;
  unidades_vivas_por_jugador: Record<string, number>;
  resultado_por_jugador: Record<string, 'win' | 'lose' | 'tie'>;
  recompensa_round?: any;
}

export interface Stage {
  index: number;
  rounds_totales: number;
  recompensas_pendientes?: any[];
  estado: 'pre' | 'en_curso' | 'fin';
}

export interface PlayerState {
  user_id: string;
  campeon: Champion;
  bench: Unit[]; // banca 4
  board_slots_activos: (Unit | null)[]; // exactly 3 active
  equipo_total: Unit[]; // 6 total cap (includes active + bench)
  xp_match: number; // currency
  racha: number;
  vida_jugador: number;
  nivel_tienda: number; // 1..5
  costo_reroll_actual: number;
  store_entries: string[]; // unit_ids visible in store (3)
}

export interface Match {
  match_id: string;
  lobby_id: string;
  jugadores_estado: PlayerState[];
  stage_actual: number;
  round_actual: number;
  registro_eventos: string[];
}

export interface Lobby {
  lobby_id: string;
  jugadores: string[]; // user_ids
  estado: 'creado' | 'en_curso' | 'fin';
  reglas_emparejamiento?: string;
  seed: string;
}

export interface Account {
  account_id: string;
  nivel_cuenta: number;
  xp_account: number;
  desbloqueos: string[];
  pools_desbloqueadas: { pj: string[]; campeones: string[] };
  campeones_desbloqueados: string[];
}

export interface DamageContext {
  critMultiplier: number;
}

export interface ParamsConfig {
  seed: string;
  player: { vida_inicial: number };
  daño_jugador: { X_base: number; tie_rule: 'ambos_daño_base' | 'ninguno' | 'desempate_por_seed' };
  economia: {
    xp_por_victoria: number;
    xp_por_derrota: number;
    bonus_por_unidad_viva: number;
    bonus_racha_victorias: number[];
    costo_compra_por_rareza: Record<Rarity, number>;
    reroll: { base: number; incremento_por_cadena: number };
  };
  tienda: {
    niveles_por_rounds: number[];
  };
  match: { stages: number; rounds_por_stage: number };
  combate: { crit_multiplier: number; mana_por_ataque: number; mana_requerida_habilidad: number };
  progression: { level_curve_base: number; win_top3_xp: Record<string, number> };
}

export interface ProbabilitiesConfig {
  [nivel: string]: Record<Rarity, number>;
}


export const PERMISSION_ACTIONS = [
  'view',
  'create',
  'edit',
  'delete',
  'send',
  'validate',
] as const;
export type PermissionAction = (typeof PERMISSION_ACTIONS)[number];

/** Permisos de un rol: { modulo: [acciones] } */
export type RolePermissions = Record<string, PermissionAction[]>;

const CRUD: PermissionAction[] = ['view', 'create', 'edit', 'delete'];

/** Módulos del sistema y las acciones que tiene sentido dar en cada uno */
export const PERMISSION_CATALOG: {
  key: string;
  label: string;
  actions: PermissionAction[];
}[] = [
  { key: 'dashboard', label: 'Inicio', actions: ['view'] },
  {
    key: 'incidencias',
    label: 'Incidencias',
    actions: [...CRUD, 'send', 'validate'],
  },
  { key: 'inasistencias', label: 'Inasistencias', actions: ['view', 'create'] },
  { key: 'bodycam', label: 'Dispositivos', actions: CRUD },
  { key: 'estadisticas', label: 'Estadísticas', actions: ['view'] },
  { key: 'offenders', label: 'Infractores', actions: CRUD },
  { key: 'personal', label: 'Personal', actions: CRUD },
  { key: 'cargos', label: 'Cargos', actions: CRUD },
  { key: 'asuntos', label: 'Asuntos', actions: CRUD },
  { key: 'faltas', label: 'Faltas', actions: CRUD },
  { key: 'jurisdicciones', label: 'Jurisdicciones', actions: CRUD },
  { key: 'usuarios', label: 'Usuarios', actions: CRUD },
  { key: 'sesiones', label: 'Sesiones activas', actions: ['edit'] },
  { key: 'roles', label: 'Roles y permisos', actions: CRUD },
  { key: 'auditoria', label: 'Auditoría', actions: ['view'] },
];

/** Rol del sistema que siempre tiene todos los permisos (así nadie se queda sin acceso) */
export const SUPER_ROLE = 'ADMINISTRATOR';

export function fullPermissions(): RolePermissions {
  return Object.fromEntries(
    PERMISSION_CATALOG.map((m) => [m.key, [...m.actions]]),
  );
}

const A = 'ADMINISTRATOR';
const S = 'SUPERVISOR';
const C = 'SENTINEL';
const V = 'VALIDATOR';
const G = 'SUBGERENTE';
const ALL = [A, S, C, V, G];

/** Quién puede qué por defecto: reproduce lo que el sistema permitía antes de tener roles editables */
const DEFAULT_RULES: Record<
  string,
  Partial<Record<PermissionAction, string[]>>
> = {
  dashboard: { view: [A, S, C, G] },
  incidencias: {
    view: ALL,
    create: [A, S, C],
    edit: [A, S],
    delete: [A, S],
    send: [A, S, C],
    validate: [A, V],
  },
  inasistencias: { view: [A, S, C, V], create: [A, V] },
  bodycam: { view: [A, S, C], create: [A], edit: [A], delete: [A] },
  estadisticas: { view: [A, S, G] },
  offenders: { view: [A, S], create: [A], edit: [A], delete: [A] },
  personal: { view: [A, S], create: [A, S], edit: [A, S], delete: [A, S] },
  cargos: { view: [A, S], create: [A, S], edit: [A, S], delete: [A, S] },
  asuntos: { view: [A, S], create: [A, S], edit: [A, S], delete: [A, S] },
  faltas: { view: [A, S], create: [A], edit: [A], delete: [A] },
  jurisdicciones: { view: [A], create: [A], edit: [A], delete: [A] },
  usuarios: { view: [A, S], create: [A, S], edit: [A, S], delete: [A, S] },
  sesiones: { edit: [A] },
  roles: { view: [A], create: [A], edit: [A], delete: [A] },
  auditoria: { view: [A] },
};

function defaultsFor(role: string): RolePermissions {
  const result: RolePermissions = {};
  for (const [module, rules] of Object.entries(DEFAULT_RULES)) {
    const actions = PERMISSION_ACTIONS.filter((a) => rules[a]?.includes(role));
    if (actions.length) result[module] = actions;
  }
  return result;
}

export const SYSTEM_ROLES = [
  {
    key: A,
    name: 'Administrador',
    description: 'Acceso total al sistema. No se puede limitar.',
  },
  {
    key: S,
    name: 'Supervisor',
    description: 'Supervisa incidencias y gestiona a los centinelas.',
  },
  {
    key: C,
    name: 'Centinela',
    description: 'Registra incidencias e inasistencias en campo.',
  },
  {
    key: V,
    name: 'Validador',
    description: 'Revisa y aprueba o rechaza los informes.',
  },
  {
    key: G,
    name: 'Subgerente',
    description: 'Consulta incidencias y estadísticas de su área.',
  },
].map((r) => ({ ...r, permissions: defaultsFor(r.key) }));

/**
 * permissions.config.ts
 * Configuración centralizada de permisos por recurso y acción.
 * Fuente única de verdad para toda la lógica de autorización.
 */

export type Role = 'waiter' | 'cook' | 'manager';

export type ResourcePermissions = {
  [action: string]: Role[];
};

export type PermissionsMap = {
  [resource: string]: ResourcePermissions;
};

export const PERMISSIONS: PermissionsMap = {
  orders: {
    list:          ['waiter', 'cook', 'manager'],
    read:          ['waiter', 'cook', 'manager'],
    create:        ['waiter', 'manager'],
    updateStatus:  ['waiter', 'manager'],
    addItem:       ['waiter', 'manager'],
    updateItem:    ['waiter', 'manager'],
    deleteItem:    ['waiter', 'manager'],
    deliver:       ['waiter', 'manager'],
    updateItemStatus: ['cook', 'manager'],
  },
  menu: {
    read:   ['waiter', 'cook', 'manager'],
    create: ['manager'],
    update: ['manager'],
  },
  tables: {
    list:   ['waiter', 'cook', 'manager'],
    update: ['waiter', 'manager'],
    assign: ['manager'],
    listWaiters: ['manager'],
  },
  promotions: {
    list:       ['manager'],
    listActive: ['waiter', 'cook', 'manager'],
    create:     ['manager'],
    update:     ['manager'],
  },
  caja: {
    readActive:  ['waiter', 'manager'],
    readHistory: ['manager'],
    open:        ['manager'],
    close:       ['manager'],
    summary:     ['manager'],
  },
  kitchen: {
    stats: ['cook', 'manager'],
  },
  dashboard: {
    read: ['manager'],
  },
  ai: {
    pairing:            ['waiter', 'manager'],
    shiftSummary:       ['manager'],
    delayCheck:         ['waiter', 'manager'],
    menuRecommendations: ['waiter', 'manager'],
  },
};

/**
 * Verifica si un rol tiene acceso a un recurso y acción específicos.
 */
export function canAccess(role: string, resource: string, action: string): boolean {
  const resourcePerms = PERMISSIONS[resource];
  if (!resourcePerms) return false;
  const allowedRoles = resourcePerms[action];
  if (!allowedRoles) return false;
  return allowedRoles.includes(role as Role);
}

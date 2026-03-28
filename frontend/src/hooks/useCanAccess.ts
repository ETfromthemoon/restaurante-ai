import { useAppStore } from '../store/useAppStore';
import type { UserRole } from '../types';

type ResourcePermissions = {
  [action: string]: UserRole[];
};

type PermissionsMap = {
  [resource: string]: ResourcePermissions;
};

/**
 * Matriz de permisos del frontend — debe mantenerse sincronizada
 * con backend/src/config/permissions.config.ts
 */
const PERMISSIONS: PermissionsMap = {
  orders: {
    list:             ['waiter', 'cook', 'manager'],
    read:             ['waiter', 'cook', 'manager'],
    create:           ['waiter', 'manager'],
    updateStatus:     ['waiter', 'manager'],
    addItem:          ['waiter', 'manager'],
    updateItem:       ['waiter', 'manager'],
    deleteItem:       ['waiter', 'manager'],
    deliver:          ['waiter', 'manager'],
    updateItemStatus: ['cook', 'manager'],
  },
  menu: {
    read:   ['waiter', 'cook', 'manager'],
    create: ['manager'],
    update: ['manager'],
  },
  tables: {
    list:        ['waiter', 'cook', 'manager'],
    update:      ['waiter', 'manager'],
    assign:      ['manager'],
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
    pairing:             ['waiter', 'manager'],
    shiftSummary:        ['manager'],
    delayCheck:          ['waiter', 'manager'],
    menuRecommendations: ['waiter', 'manager'],
  },
  users: {
    list:   ['manager'],
    read:   ['manager'],
    create: ['manager'],
    update: ['manager'],
    delete: ['manager'],
  },
};

/**
 * Hook para verificar si el usuario actual tiene permiso sobre un recurso y acción.
 *
 * @example
 * const canDeleteItem = useCanAccess('orders', 'deleteItem');
 * return canDeleteItem ? <DeleteButton /> : null;
 */
export function useCanAccess(resource: string, action: string): boolean {
  const user = useAppStore(s => s.user);
  if (!user) return false;
  const resourcePerms = PERMISSIONS[resource];
  if (!resourcePerms) return false;
  const allowedRoles = resourcePerms[action];
  if (!allowedRoles) return false;
  return allowedRoles.includes(user.role);
}

export interface OnboardingStep {
  id: string;           // matches data-onboarding-id attribute
  title: string;
  description: string;
  placement: 'top' | 'bottom' | 'left' | 'right';
  route: string;        // ruta donde vive este elemento
}

export const ONBOARDING_STEPS: Record<string, OnboardingStep[]> = {
  waiter: [
    {
      id: 'mesas-header',
      title: 'Panel de mesas',
      description: 'Aquí ves un resumen de tus mesas: cuántas están ocupadas, libres, listas para servir o pidiendo cuenta. Todo en tiempo real.',
      placement: 'bottom',
      route: '/mesas',
    },
    {
      id: 'table-grid',
      title: 'Tus mesas',
      description: 'La cuadrícula muestra todas las mesas asignadas a ti. Los colores indican el estado: rojo = ocupada, verde = lista para servir, amarillo = pide cuenta.',
      placement: 'bottom',
      route: '/mesas',
    },
    {
      id: 'table-card-first',
      title: 'Gestionar una mesa',
      description: 'Toca una mesa para abrir su pedido. Desde ahí podrás agregar platos del menú, enviarlos a cocina y solicitar la cuenta cuando el cliente termine.',
      placement: 'bottom',
      route: '/mesas',
    },
  ],

  cook: [
    {
      id: 'kitchen-kpis',
      title: 'Métricas de cocina',
      description: 'Aquí ves cuántos pedidos están en cola, cuántos son urgentes (+20 min), el total completados hoy y el tiempo promedio de preparación.',
      placement: 'bottom',
      route: '/cocina',
    },
    {
      id: 'kitchen-queue',
      title: 'Cola activa',
      description: 'Estos son los pedidos que debes preparar ahora, ordenados del más antiguo al más reciente. La barra lateral de color indica urgencia: verde = reciente, naranja = 10 min, rojo = urgente.',
      placement: 'top',
      route: '/cocina',
    },
    {
      id: 'kitchen-order-card',
      title: 'Tarjeta de pedido',
      description: 'Toca una tarjeta para ver el detalle del pedido y cambiar el estado de cada plato uno a uno: pendiente → preparando → listo. La cocina avisa automáticamente al mesero cuando todo está listo.',
      placement: 'top',
      route: '/cocina',
    },
  ],

  manager: [
    {
      id: 'dashboard-kpis',
      title: 'KPIs del día',
      description: 'Un vistazo rápido a ventas, pedidos, mesas activas y tiempo promedio de servicio. Se actualiza en tiempo real conforme el equipo trabaja.',
      placement: 'bottom',
      route: '/gerente',
    },
    {
      id: 'ai-summary-btn',
      title: 'Resumen IA',
      description: 'Genera un análisis inteligente del turno con Claude AI. Obtienes recomendaciones sobre rendimiento, platos populares y áreas de mejora del servicio.',
      placement: 'bottom',
      route: '/gerente',
    },
    {
      id: 'quick-nav',
      title: 'Accesos rápidos',
      description: 'Desde aquí gestionas el menú, promociones, asignación de mesas a meseros, caja y el historial de turnos anteriores.',
      placement: 'top',
      route: '/gerente',
    },
    {
      id: 'sidebar-nav',
      title: 'Navegación principal',
      description: 'El menú lateral te da acceso a todas las secciones del sistema. Siempre puedes volver al Dashboard desde "Dashboard" en la barra lateral.',
      placement: 'right',
      route: '/gerente',
    },
  ],
};

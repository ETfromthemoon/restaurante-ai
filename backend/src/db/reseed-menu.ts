/**
 * Script de uso único: reemplaza los items del menú con datos de cevichería peruana.
 * Uso: npx ts-node src/db/reseed-menu.ts
 */
import { db } from './database';

db.transaction(() => {
  db.prepare('DELETE FROM order_items').run();
  db.prepare('DELETE FROM orders').run();
  db.prepare('DELETE FROM menu_items').run();

  // Resetear todas las mesas a 'free'
  db.prepare(`UPDATE tables SET status = 'free', last_interaction_at = NULL`).run();

  const ins = db.prepare(
    'INSERT INTO menu_items (id, name, description, price, category, available) VALUES (?, ?, ?, ?, ?, ?)'
  );

  // ── Entradas ──────────────────────────────────────────────────────────
  ins.run('m1',  'Ceviche Clásico',        'Corvina fresca en leche de tigre, cebolla roja, ají limo y choclo',          48, 'Entradas', 1);
  ins.run('m2',  'Ceviche Mixto',          'Corvina, camarones, pulpo y conchas negras. Leche de tigre al ají amarillo', 62, 'Entradas', 1);
  ins.run('m3',  'Leche de Tigre',         'Shot de cítrico con trozos de pescado, chochos y cancha serrana',            28, 'Entradas', 1);
  ins.run('m4',  'Tiradito de Lenguado',   'Láminas de lenguado en crema de ají amarillo con gotas de limón',            55, 'Entradas', 1);
  ins.run('m5',  'Causa Limeña',           'Papa amarilla rellena de atún o pollo con palta y huevo',                    38, 'Entradas', 1);
  ins.run('m6',  'Choros a la Chalaca',    'Mejillones frescos con salsa criolla, tomate y limón',                       42, 'Entradas', 1);
  ins.run('m7',  'Pulpo al Olivo',         'Pulpo tierno en salsa de aceitunas de botija con papas nativas',             65, 'Entradas', 1);

  // ── Principales ───────────────────────────────────────────────────────
  ins.run('m8',  'Arroz con Mariscos',     'Arroz al cilantro con camarones, pulpo, mejillones y conchas negras',        88, 'Principales', 1);
  ins.run('m9',  'Jalea Mixta',            'Pescado, calamares y mariscos fritos con yuca, zarza criolla y salsa tártara',82, 'Principales', 1);
  ins.run('m10', 'Sudado de Pescado',      'Corvina entera en caldo criollo de tomate, ají panca y chicha de jora',      90, 'Principales', 1);
  ins.run('m11', 'Parihuela',              'Sopa marinera con mariscos, pescado y cangrejo en caldo especiado',          95, 'Principales', 1);
  ins.run('m12', 'Lomo Saltado',           'Res salteada con tomate, cebolla, sillao y papas fritas. Con arroz',         85, 'Principales', 1);
  ins.run('m13', 'Chaufa de Mariscos',     'Arroz chaufa salteado con camarones, pulpo, calamar y cebollita china',      78, 'Principales', 1);
  ins.run('m14', 'Pescado a lo Macho',     'Filete de corvina bañado en salsa mariscos y ají amarillo. Con arroz',       92, 'Principales', 0);

  // ── Postres ───────────────────────────────────────────────────────────
  ins.run('m15', 'Suspiro Limeño',         'Manjar blanco con merengue de oporto y canela',                              28, 'Postres', 1);
  ins.run('m16', 'Picarones',              'Buñuelos de zapallo y camote con miel de chancaca y clavo de olor (x4)',     24, 'Postres', 1);
  ins.run('m17', 'Mazamorra Morada',       'Postre tradicional de maíz morado con frutas y canela',                     22, 'Postres', 1);
  ins.run('m18', 'Arroz con Leche',        'Cremoso arroz con leche evaporada, canela y cáscara de naranja',             20, 'Postres', 1);

  // ── Bebidas ───────────────────────────────────────────────────────────
  ins.run('m19', 'Pisco Sour',             'Pisco quebranta, limón, clara de huevo y amargo de angostura',               32, 'Bebidas', 1);
  ins.run('m20', 'Chicha Morada',          'Bebida tradicional de maíz morado, piña, membrillo y canela. 1L',            22, 'Bebidas', 1);
  ins.run('m21', 'Inca Kola',              'Gaseosa nacional. Personal 350ml',                                          12, 'Bebidas', 1);
  ins.run('m22', 'Agua mineral',           'San Mateo 625ml, con o sin gas',                                            10, 'Bebidas', 1);
  ins.run('m23', 'Cerveza Cristal',        'Botella 620ml bien fría',                                                   18, 'Bebidas', 1);
  ins.run('m24', 'Limonada Frozen',        'Limón sutil, hielo frappe y azúcar. Tamaño personal',                       16, 'Bebidas', 1);
})();

const count = (db.prepare('SELECT COUNT(*) as c FROM menu_items').get() as { c: number }).c;
console.log(`✅ Menú reseteado: ${count} platos cargados`);

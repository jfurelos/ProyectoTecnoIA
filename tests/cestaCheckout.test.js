import { describe, it, expect, beforeEach } from 'vitest';
import { CheckoutService } from '../src/services/checkoutService.js';
import { MatchingEngine } from '../src/services/matchingEngine.js';

// Setup de localStorage en entorno de test si no está presente
if (!globalThis.localStorage) {
  const store = new Map();
  globalThis.localStorage = {
    getItem: (key) => store.get(key) || null,
    setItem: (key, val) => store.set(key, String(val)),
    removeItem: (key) => store.delete(key),
    clear: () => store.clear()
  };
}

describe('Cesta & CheckoutService - Pedidos y Emisión de Ticket', () => {
  const sampleItems = [
    {
      id: 'item-101',
      name: 'Sofá Modular Kumo',
      category: 'Asientos',
      price: 1850,
      dimensions: { width: 240, height: 72, depth: 98 },
      style: 'Japandi',
      color: 'Lino Natural',
      materials: ['Roble macizo', 'Lino']
    },
    {
      id: 'item-102',
      name: 'Mesa Escultórica de Caliza',
      category: 'Mesas',
      price: 520,
      dimensions: { width: 110, height: 34, depth: 70 },
      style: 'Minimalismo Cálido',
      color: 'Caliza Crema',
      materials: ['Caliza', 'Mortero']
    }
  ];

  beforeEach(() => {
    localStorage.clear();
  });

  it('calcula correctamente el subtotal, desglose de IVA (21%) y total', () => {
    const totals = CheckoutService.calculateTotals(sampleItems);
    expect(totals.total).toBe(2370);
    // 2370 / 1.21 = 1958.68
    expect(totals.subtotal).toBeCloseTo(1958.68, 1);
    // 2370 - 1958.68 = 411.32
    expect(totals.vat).toBeCloseTo(411.32, 1);
    expect(totals.subtotal + totals.vat).toBe(totals.total);
    expect(totals.count).toBe(2);
  });

  it('valida campos obligatorios al crear el ticket de pedido', () => {
    expect(() => {
      CheckoutService.createOrder({
        clientName: '',
        email: 'arq@test.com',
        address: 'Calle Mayor 1',
        items: sampleItems
      });
    }).toThrow('nombre del cliente');

    expect(() => {
      CheckoutService.createOrder({
        clientName: 'Estudio Arq',
        email: 'arq@test.com',
        address: '',
        items: sampleItems
      });
    }).toThrow('dirección de entrega');

    expect(() => {
      CheckoutService.createOrder({
        clientName: 'Estudio Arq',
        email: 'arq@test.com',
        address: 'Paseo del Prado 12',
        items: []
      });
    }).toThrow('al menos un mueble');
  });

  it('genera un pedido completo con número de orden y cotas arquitectónicas', () => {
    const order = CheckoutService.createOrder({
      clientName: 'Alejandro Sanz',
      email: 'asanz@estudio.es',
      address: 'Paseo de la Castellana 45, 4ºB, Madrid',
      phone: '+34 600 000 000',
      paymentMethod: 'Bizum',
      items: sampleItems
    });

    expect(order.orderId).toMatch(/^ESP-\d{4}-\d{4}$/);
    expect(order.client.name).toBe('Alejandro Sanz');
    expect(order.client.address).toContain('Castellana');
    expect(order.payment.method).toBe('Bizum');
    expect(order.items.length).toBe(2);
    expect(order.items[0].dimensions.width).toBe(240);
  });

  it('completa el checkout vaciando la cesta y recalculando el estado', async () => {
    const engine = new MatchingEngine({
      room: 'salón',
      budget: 4500,
      spent: 2370,
      acceptedIds: ['item-101', 'item-102']
    });

    expect(engine.profile.acceptedIds.length).toBe(2);
    expect(engine.profile.spent).toBe(2370);

    const result = await CheckoutService.completeCheckout({
      clientName: 'Lucía Méndez',
      email: 'lucia@arquitectura.com',
      address: 'Gran Vía 28, Madrid',
      phone: '+34 611 222 333',
      paymentMethod: 'Tarjeta Bancaria',
      items: sampleItems,
      matchingEngine: engine
    });

    expect(result.success).toBe(true);
    expect(result.order.orderId).toBeDefined();

    // Verificamos que la cesta del matching engine se vació
    expect(engine.profile.acceptedIds.length).toBe(0);
    expect(engine.profile.spent).toBe(0);
  });
});


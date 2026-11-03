/**
 * SERVICIO DE CHECKOUT, CÁLCULO DE FACTURACIÓN Y EMISIÓN DE TICKET ARQUITECTÓNICO
 * Gestiona el desglose fiscal (IVA 21%), generación de pedidos y vaciado de cesta.
 */

import { DatabaseAdapter } from './dbAdapter.js';

export class CheckoutService {
  /**
   * Calcula el desglose fiscal oficial (PVP con IVA 21% desglosado)
   */
  static calculateTotals(items) {
    if (!Array.isArray(items) || items.length === 0) {
      return { total: 0, subtotal: 0, vat: 0, count: 0 };
    }

    const total = items.reduce((acc, it) => acc + (Number(it.price) || 0), 0);
    // En facturación española con PVP, la base imponible = Total / 1.21
    const subtotal = Math.round((total / 1.21) * 100) / 100;
    const vat = Math.round((total - subtotal) * 100) / 100;

    return {
      total,
      subtotal,
      vat,
      count: items.length
    };
  }

  /**
   * Crea un pedido estructurado y genera el ticket arquitectónico
   */
  static createOrder({
    clientName,
    email,
    address,
    phone = "",
    paymentMethod = "Tarjeta Bancaria",
    items = [],
    userId = null
  }) {
    if (!clientName || !clientName.trim()) {
      throw new Error("El nombre del cliente o titular es obligatorio.");
    }
    if (!address || !address.trim()) {
      throw new Error("La dirección de entrega del proyecto es obligatoria.");
    }
    if (!items || items.length === 0) {
      throw new Error("La cesta debe contener al menos un mueble para tramitar el pedido.");
    }

    const totals = this.calculateTotals(items);
    const orderNumber = `ESP-${new Date().getFullYear()}-${Math.floor(1000 + Math.random() * 9000)}`;

    const order = {
      orderId: orderNumber,
      createdAt: new Date().toISOString(),
      formattedDate: new Date().toLocaleDateString("es-ES", {
        day: "2-digit",
        month: "long",
        year: "numeric",
        hour: "2-digit",
        minute: "2-digit"
      }),
      userId: userId || "invitado",
      client: {
        name: clientName.trim(),
        email: email ? email.trim() : "cliente@espacio-arq.local",
        address: address.trim(),
        phone: phone ? phone.trim() : ""
      },
      payment: {
        method: paymentMethod,
        status: "COMPLETADO"
      },
      items: items.map(it => ({
        id: it.id,
        name: it.name,
        category: it.category,
        room: it.room,
        price: it.price,
        style: it.style,
        color: it.color,
        dimensions: it.dimensions,
        materials: it.materials
      })),
      totals
    };

    return order;
  }

  /**
   * Ejecuta el checkout completo:
   * Guarda el pedido en la capa de datos y vacía la cesta del usuario.
   */
  static async completeCheckout({
    clientName,
    email,
    address,
    phone,
    paymentMethod,
    items,
    matchingEngine,
    currentUser = null
  }) {
    const order = this.createOrder({
      clientName,
      email,
      address,
      phone,
      paymentMethod,
      items,
      userId: currentUser ? currentUser.id : null
    });

    // 1. Guardar en capa de persistencia (Local o Firestore)
    await DatabaseAdapter.saveOrder(order);

    // 2. Vaciar cesta del matchingEngine
    if (matchingEngine && matchingEngine.profile) {
      matchingEngine.profile.acceptedIds = [];
      matchingEngine.profile.spent = 0;
    }

    // 3. Sincronizar usuario
    if (currentUser && matchingEngine) {
      await DatabaseAdapter.syncUserData(
        matchingEngine.profile,
        [],
        matchingEngine.profile.rejectedIds,
        currentUser.tasteDescription || null
      );
    }

    return {
      success: true,
      order
    };
  }
}


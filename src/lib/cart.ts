export type CartProduct = {
  id: number | string;
  product_name: string;
  selling_price: number;
  product_code?: string | null;
};

export type CartLine = {
  product: CartProduct;
  qty: number;
};

export type CartState = {
  lines: CartLine[];
};

export const emptyCart: CartState = { lines: [] };

export function cartTotal(cart: CartState): number {
  return cart.lines.reduce((sum, l) => sum + l.product.selling_price * l.qty, 0);
}

export function cartCount(cart: CartState): number {
  return cart.lines.reduce((sum, l) => sum + l.qty, 0);
}

export function addToCart(cart: CartState, product: CartProduct): CartState {
  const existing = cart.lines.find((l) => l.product.id === product.id);
  if (existing) {
    return {
      lines: cart.lines.map((l) =>
        l.product.id === product.id ? { ...l, qty: l.qty + 1 } : l
      ),
    };
  }
  return { lines: [...cart.lines, { product, qty: 1 }] };
}

export function setCartQty(cart: CartState, productId: number | string, qty: number): CartState {
  if (qty <= 0) return removeFromCart(cart, productId);
  return {
    lines: cart.lines.map((l) =>
      l.product.id === productId ? { ...l, qty } : l
    ),
  };
}

export function removeFromCart(cart: CartState, productId: number | string): CartState {
  return { lines: cart.lines.filter((l) => l.product.id !== productId) };
}

export function clearCart(): CartState {
  return emptyCart;
}
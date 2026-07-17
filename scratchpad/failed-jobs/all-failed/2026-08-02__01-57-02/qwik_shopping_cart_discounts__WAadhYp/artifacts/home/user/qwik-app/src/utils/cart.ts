import { db } from './db';

export interface CartItemState {
  productId: number;
  name: string;
  price: number;
  quantity: number;
  total: number;
}

export interface CouponState {
  code: string;
  type: 'PERCENT' | 'FIXED' | 'BOGO';
  value: number;
  minSpend: number;
}

export interface CartState {
  items: CartItemState[];
  subtotal: number;
  coupon: CouponState | null;
  discount: number;
  total: number;
  error: string | null;
}

export function getCartState(errorOverride: string | null = null): CartState {
  // Query all CartItem joined with Product, sorted by productId in ascending order
  const items = db.prepare(`
    SELECT 
      CartItem.productId, 
      Product.name, 
      Product.price, 
      CartItem.quantity 
    FROM CartItem 
    JOIN Product ON CartItem.productId = Product.id
    ORDER BY CartItem.productId ASC
  `).all() as { productId: number; name: string; price: number; quantity: number }[];

  const cartItems: CartItemState[] = items.map(item => ({
    productId: item.productId,
    name: item.name,
    price: item.price,
    quantity: item.quantity,
    total: Math.round(item.price * item.quantity * 100) / 100
  }));

  const subtotal = Math.round(cartItems.reduce((sum, item) => sum + item.total, 0) * 100) / 100;

  // Query active coupon
  const activeCouponRow = db.prepare(`
    SELECT 
      ActiveCoupon.code, 
      Coupon.type, 
      Coupon.value, 
      Coupon.minSpend 
    FROM ActiveCoupon 
    JOIN Coupon ON ActiveCoupon.code = Coupon.code
  `).get() as { code: string; type: 'PERCENT' | 'FIXED' | 'BOGO'; value: number; minSpend: number } | undefined;

  let discount = 0;
  let coupon: CouponState | null = activeCouponRow || null;
  let error: string | null = errorOverride;

  if (coupon) {
    if (subtotal < coupon.minSpend) {
      // Automatically remove active coupon from the database
      db.prepare('DELETE FROM ActiveCoupon').run();
      coupon = null;
      discount = 0;
      error = "Minimum spend not met";
    } else {
      if (coupon.type === 'PERCENT') {
        discount = subtotal * (coupon.value / 100);
      } else if (coupon.type === 'FIXED') {
        discount = coupon.value;
      } else if (coupon.type === 'BOGO') {
        const targetProductId = Math.round(coupon.value);
        const item = cartItems.find(i => i.productId === targetProductId);
        if (item) {
          const freeUnits = Math.floor(item.quantity / 2);
          discount = freeUnits * item.price;
        } else {
          discount = 0;
        }
      }
      discount = Math.round(discount * 100) / 100;
      if (discount > subtotal) {
        discount = subtotal;
      }
    }
  }

  const total = Math.round((subtotal - discount) * 100) / 100;

  return {
    items: cartItems,
    subtotal,
    coupon,
    discount,
    total,
    error
  };
}

export function handleCartAction(body: any): CartState {
  if (!body || typeof body !== 'object') {
    return getCartState("Invalid request body");
  }

  const { action } = body;

  if (action === 'update') {
    const { productId, quantity } = body;
    if (typeof productId !== 'number') {
      return getCartState("Invalid product ID");
    }
    if (typeof quantity !== 'number') {
      return getCartState("Invalid quantity");
    }

    if (quantity <= 0) {
      db.prepare('DELETE FROM CartItem WHERE productId = ?').run(productId);
    } else {
      db.prepare(`
        INSERT INTO CartItem (productId, quantity) 
        VALUES (?, ?) 
        ON CONFLICT(productId) DO UPDATE SET quantity = excluded.quantity
      `).run(productId, quantity);
    }

    return getCartState();
  }

  if (action === 'applyCoupon') {
    const { code } = body;
    if (typeof code !== 'string') {
      return getCartState("Invalid coupon code");
    }

    const couponRow = db.prepare('SELECT * FROM Coupon WHERE code = ?').get(code) as { code: string; type: 'PERCENT' | 'FIXED' | 'BOGO'; value: number; minSpend: number } | undefined;

    if (!couponRow) {
      return getCartState("Invalid coupon code");
    }

    // Calculate current subtotal to check minSpend
    const items = db.prepare(`
      SELECT CartItem.productId, Product.price, CartItem.quantity 
      FROM CartItem 
      JOIN Product ON CartItem.productId = Product.id
    `).all() as { productId: number; price: number; quantity: number }[];

    const subtotal = Math.round(items.reduce((sum, item) => sum + (item.price * item.quantity), 0) * 100) / 100;

    if (subtotal < couponRow.minSpend) {
      return getCartState("Minimum spend not met");
    }

    db.transaction(() => {
      db.prepare('DELETE FROM ActiveCoupon').run();
      db.prepare('INSERT INTO ActiveCoupon (code) VALUES (?)').run(code);
    })();

    return getCartState();
  }

  if (action === 'clear') {
    db.transaction(() => {
      db.prepare('DELETE FROM CartItem').run();
      db.prepare('DELETE FROM ActiveCoupon').run();
    })();

    return getCartState();
  }

  return getCartState("Unsupported action");
}

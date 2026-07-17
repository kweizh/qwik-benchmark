import { getDb } from "./src/db";

const db = getDb();

console.log("Products:");
console.log(db.prepare("SELECT * FROM Product").all());

console.log("\nCoupons:");
console.log(db.prepare("SELECT * FROM Coupon").all());

console.log("\nCartItems:");
console.log(db.prepare("SELECT * FROM CartItem").all());

console.log("\nActiveCoupons:");
console.log(db.prepare("SELECT * FROM ActiveCoupon").all());

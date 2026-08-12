-- ============================================================================
-- ترباوية — إغلاق آخر ثغرة في orders: مسح policies الإدخال المفتوحة
-- بعد التحويل لاستخدام create_order() (اللي بتتحقق من كل حاجة سيرفر-سايد)،
-- مبقاش فيه داعي لسماح insert مباشر بأي بيانات على orders/order_items —
-- كان ده بيسمح لأي حد يبعت طلب بأسعار/بيانات مفبركة عن طريق REST API مباشرة.
-- ============================================================================
drop policy if exists "public can create orders" on orders;
drop policy if exists "public can create order items" on order_items;

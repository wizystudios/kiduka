-- Fix customer_transactions quantity column to support decimals
ALTER TABLE customer_transactions 
ALTER COLUMN quantity TYPE numeric USING quantity::numeric;
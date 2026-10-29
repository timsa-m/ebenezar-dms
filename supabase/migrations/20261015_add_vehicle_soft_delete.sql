-- Migration: 20261015_add_vehicle_soft_delete.sql
-- Description: Supports soft-deletion and reversion of vehicles by managers and admins.

-- Note: In the vehicles table, 'deleted' is a valid status ('in_stock', 'reserved', 'financed', 'repossessed', 'cash_sale', 'deleted').
-- When deleted, the vehicle has is_published = false and deletion metadata is captured.

-- Optional: ensure index on vehicles status for rapid filtering
CREATE INDEX IF NOT EXISTS idx_vehicles_status ON vehicles(status);

-- Optional: ensure index on is_published and status for public website and active inventory
CREATE INDEX IF NOT EXISTS idx_vehicles_active ON vehicles(status, is_published);

COMMENT ON COLUMN vehicles.status IS 'Status of vehicle: in_stock, reserved, financed, repossessed, cash_sale, or deleted (soft-deleted by manager/admin)';

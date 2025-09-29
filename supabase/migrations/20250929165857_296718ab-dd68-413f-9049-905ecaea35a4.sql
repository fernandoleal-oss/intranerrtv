-- First, let's check if the trigger exists and fix it
DROP TRIGGER IF EXISTS update_versions_updated_at ON versions;

-- Add updated_at column if it doesn't exist
ALTER TABLE versions ADD COLUMN IF NOT EXISTS updated_at TIMESTAMP WITH TIME ZONE DEFAULT now();

-- Recreate the trigger properly
CREATE TRIGGER update_versions_updated_at
    BEFORE UPDATE ON versions
    FOR EACH ROW
    EXECUTE FUNCTION update_updated_at_column();
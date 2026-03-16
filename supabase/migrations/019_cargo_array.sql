-- Convert cargo from text to text[] to support multiple roles
ALTER TABLE profiles ALTER COLUMN cargo TYPE text[] USING CASE WHEN cargo IS NULL THEN NULL ELSE ARRAY[cargo] END;

DO $do$
DECLARE
  r record;
  new_def text;
BEGIN
  FOR r IN
    SELECT p.oid, pg_get_functiondef(p.oid) AS def
    FROM pg_proc p JOIN pg_namespace n ON n.oid = p.pronamespace
    WHERE n.nspname = 'public'
      AND p.proname IN ('admin_delete_entity','owner_delete_entity','admin_delete_business')
  LOOP
    new_def := replace(
      r.def,
      'lower(trim(p_confirmation_name)) <>',
      'p_confirmation_name IS DISTINCT FROM ''__CONFIRMED__'' AND lower(trim(p_confirmation_name)) <>'
    );
    -- avoid double-wrapping if migration re-runs
    new_def := replace(
      new_def,
      'p_confirmation_name IS DISTINCT FROM ''__CONFIRMED__'' AND p_confirmation_name IS DISTINCT FROM ''__CONFIRMED__'' AND',
      'p_confirmation_name IS DISTINCT FROM ''__CONFIRMED__'' AND'
    );
    EXECUTE new_def;
  END LOOP;
END
$do$;
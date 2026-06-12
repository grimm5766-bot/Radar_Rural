-- Execute após migrar o schema para PostgreSQL.
-- A role usada pela aplicação não deve ser superuser nem possuir BYPASSRLS.

CREATE SCHEMA IF NOT EXISTS app;

CREATE OR REPLACE FUNCTION app.current_tenant_id()
RETURNS text
LANGUAGE sql
STABLE
AS $$
  SELECT NULLIF(current_setting('app.current_tenant_id', true), '');
$$;

CREATE OR REPLACE FUNCTION app.is_developer()
RETURNS boolean
LANGUAGE sql
STABLE
AS $$
  SELECT COALESCE(current_setting('app.is_developer', true), 'false') = 'true';
$$;

ALTER TABLE "Tenant" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "Tenant" FORCE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS tenant_isolation ON "Tenant";
CREATE POLICY tenant_isolation ON "Tenant"
  USING (app.is_developer() OR "id" = app.current_tenant_id())
  WITH CHECK (app.is_developer() OR "id" = app.current_tenant_id());

ALTER TABLE "User" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "User" FORCE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS tenant_isolation ON "User";
CREATE POLICY tenant_isolation ON "User"
  USING (app.is_developer() OR "tenantId" = app.current_tenant_id())
  WITH CHECK (app.is_developer() OR "tenantId" = app.current_tenant_id());
DROP POLICY IF EXISTS auth_lookup ON "User";
CREATE POLICY auth_lookup ON "User"
  FOR SELECT
  USING (
    "email" = NULLIF(current_setting('app.login_email', true), '')
    OR "googleSubject" = NULLIF(current_setting('app.google_subject', true), '')
  );

DO $$
DECLARE
  table_name text;
BEGIN
  FOREACH table_name IN ARRAY ARRAY[
    'Farm',
    'FarmAgronomist',
    'FieldPlot',
    'CropCycle',
    'Inspection',
    'Sampling',
    'Occurrence',
    'ManagementCall',
    'GeoPhoto',
    'Notification'
  ]
  LOOP
    EXECUTE format('ALTER TABLE %I ENABLE ROW LEVEL SECURITY', table_name);
    EXECUTE format('ALTER TABLE %I FORCE ROW LEVEL SECURITY', table_name);
    EXECUTE format('DROP POLICY IF EXISTS tenant_isolation ON %I', table_name);
    EXECUTE format(
      'CREATE POLICY tenant_isolation ON %I
       USING (app.is_developer() OR "tenantId" = app.current_tenant_id())
       WITH CHECK (app.is_developer() OR "tenantId" = app.current_tenant_id())',
      table_name
    );
  END LOOP;
END $$;

-- O servidor deve executar estas configurações no início de cada transação:
-- SELECT set_config('app.current_tenant_id', '<tenant-id>', true);
-- SELECT set_config('app.is_developer', 'false', true);
--
-- Para o console global:
-- SELECT set_config('app.current_tenant_id', '', true);
-- SELECT set_config('app.is_developer', 'true', true);
--
-- A consulta de autenticação usa uma transação curta:
-- SELECT set_config('app.login_email', '<email-normalizado>', true);
-- SELECT set_config('app.google_subject', '<google-sub-ou-vazio>', true);

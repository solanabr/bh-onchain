-- Restore service_role grants. BYPASSRLS lets it skip row filtering,
-- but it still needs table-level privileges. The admin page and any
-- service-role server route hit "permission denied" without these.

grant all privileges on all tables in schema public to service_role;
grant all privileges on all sequences in schema public to service_role;
grant all privileges on all functions in schema public to service_role;

alter default privileges in schema public grant all on tables to service_role;
alter default privileges in schema public grant all on sequences to service_role;
alter default privileges in schema public grant all on functions to service_role;

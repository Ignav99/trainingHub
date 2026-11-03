-- DEV SETUP 02: close RLS gaps found in the production schema dump (2026-10-02)
-- alertas, informes_rival and planes_partido had RLS disabled while anon and
-- authenticated held ALL grants, i.e. readable/writable with the public anon key.
--
-- Same pattern as rival_informes: RLS on, access only for service_role (the
-- backend). The frontend never queries tables directly (it only calls 3 search
-- RPCs through the backend), and the backend uses the service-role key, so
-- this should not change app behaviour. Verify on dev before applying to prod.

alter table public.alertas enable row level security;
alter table public.informes_rival enable row level security;
alter table public.planes_partido enable row level security;

create policy "service_role_all" on public.alertas
  to service_role using (true) with check (true);
create policy "service_role_all" on public.informes_rival
  to service_role using (true) with check (true);
create policy "service_role_all" on public.planes_partido
  to service_role using (true) with check (true);

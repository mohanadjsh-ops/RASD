create policy "osint cases insert team" on public.osint_cases
  for insert to authenticated
  with check (created_by = auth.uid());

create policy "osint cases update team or admin" on public.osint_cases
  for update to authenticated
  using (true)
  with check (
    public.is_admin()
    or (
      approved_by is null
      and approved_at is null
      and verdict in ('inconclusive','needs_evidence','likely')
    )
  );

create policy "osint claims insert team" on public.osint_claims
  for insert to authenticated
  with check (created_by = auth.uid());

create policy "osint evidence insert team" on public.osint_evidence
  for insert to authenticated
  with check (created_by = auth.uid());

create policy "osint findings insert team" on public.osint_findings
  for insert to authenticated
  with check (created_by = auth.uid());

create policy "osint events insert team" on public.osint_case_events
  for insert to authenticated
  with check (created_by = auth.uid());

create policy "osint tools admin insert" on public.osint_tools
  for insert to authenticated
  with check (public.is_admin());

create policy "osint tools admin update" on public.osint_tools
  for update to authenticated
  using (public.is_admin())
  with check (public.is_admin());

create policy "osint telegram links insert own" on public.osint_telegram_links
  for insert to authenticated
  with check (user_id = auth.uid());

create policy "osint telegram links update own" on public.osint_telegram_links
  for update to authenticated
  using (user_id = auth.uid())
  with check (user_id = auth.uid());

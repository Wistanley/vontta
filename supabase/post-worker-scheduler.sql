-- Configuração opcional de infraestrutura, depois da migração e do deploy.
-- CRON_SECRET deve existir no runtime e no Vault sob o nome
-- vontta_post_worker_secret. O segredo é cadastrado fora do código versionado.
create extension if not exists pg_cron with schema pg_catalog;
create extension if not exists pg_net with schema extensions;

create or replace function public.invoke_post_worker() returns bigint
language sql security definer set search_path = public,extensions as $$
  select net.http_post(
    url := 'https://vontta.niinja.com.br/api/post-worker',
    headers := jsonb_build_object(
      'Content-Type','application/json',
      'Authorization','Bearer ' || (
        select decrypted_secret from vault.decrypted_secrets
        where name = 'vontta_post_worker_secret'
      )
    ),
    body := '{}'::jsonb,
    timeout_milliseconds := 240000
  );
$$;
revoke all on function public.invoke_post_worker() from public,anon,authenticated,service_role;
grant execute on function public.invoke_post_worker() to postgres;

select cron.schedule('vontta-posts-worker','* * * * *','select public.invoke_post_worker();');
select cron.schedule('vontta-posts-history-cleanup','15 3 * * *', $$
  delete from cron.job_run_details
  where end_time < now() - interval '7 days'
  and jobid in (
    select jobid from cron.job
    where jobname in ('vontta-posts-worker','vontta-posts-history-cleanup')
  );
$$);

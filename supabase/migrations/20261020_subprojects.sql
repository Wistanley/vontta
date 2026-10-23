-- Optional relationship: existing projects remain independent.
create index if not exists workspace_project_parent
on public.workspace_entries(owner_id, (payload->>'parentProjectId')) where kind = 'project';

create or replace function public.validate_workspace_project_parent()
returns trigger language plpgsql set search_path = public as $$
declare
  parent_text text;
  parent_id uuid;
  ancestor_payload jsonb;
  visited uuid[];
  project_owner uuid;
begin
  if TG_OP = 'DELETE' then
    if OLD.kind <> 'project' then return OLD; end if;
    -- Account removal cascades through this table; do not block FK cleanup.
    if pg_trigger_depth() > 1 then return OLD; end if;
    project_owner := OLD.owner_id;
  else
    if NEW.kind <> 'project' and (TG_OP = 'INSERT' or OLD.kind <> 'project') then return NEW; end if;
    project_owner := NEW.owner_id;
  end if;
  -- Serialize hierarchy mutations for one owner, including competing moves/deletes.
  perform pg_advisory_xact_lock(hashtextextended(project_owner::text, 0));
  if TG_OP <> 'INSERT' and OLD.kind = 'project' then
    if TG_OP = 'DELETE' or NEW.kind <> 'project' or NEW.id <> OLD.id or NEW.owner_id <> OLD.owner_id then
      if exists (select 1 from public.workspace_entries
        where owner_id = OLD.owner_id and kind = 'project' and payload->>'parentProjectId' = OLD.id::text) then
        raise exception 'Este projeto possui subprojetos. Mova ou exclua os subprojetos primeiro.' using errcode = '23514';
      end if;
    end if;
  end if;
  if TG_OP = 'DELETE' then return OLD; end if;
  if NEW.kind <> 'project' then return NEW; end if;
  if NEW.payload ? 'parentProjectId' and jsonb_typeof(NEW.payload->'parentProjectId') not in ('string', 'null') then
    raise exception 'Projeto pai inválido.' using errcode = '23514';
  end if;
  parent_text := nullif(NEW.payload->>'parentProjectId', '');
  visited := array[NEW.id];
  while parent_text is not null loop
    begin
      parent_id := parent_text::uuid;
    exception when invalid_text_representation then
      raise exception 'Projeto pai inválido.' using errcode = '23514';
    end;
    if parent_id = any(visited) then
      raise exception 'Um projeto não pode ficar dentro de si ou de um de seus subprojetos.' using errcode = '23514';
    end if;
    if array_length(visited, 1) = 1 then
      NEW.payload := jsonb_set(NEW.payload, '{parentProjectId}', to_jsonb(parent_id::text));
    end if;
    visited := array_append(visited, parent_id);
    select payload into ancestor_payload from public.workspace_entries
      where owner_id = NEW.owner_id and id = parent_id and kind = 'project';
    if not found then
      raise exception 'O projeto pai deve existir na mesma conta.' using errcode = '23514';
    end if;
    parent_text := nullif(ancestor_payload->>'parentProjectId', '');
  end loop;
  return NEW;
end;
$$;

drop trigger if exists workspace_project_parent_check on public.workspace_entries;
create trigger workspace_project_parent_check before insert or update or delete
on public.workspace_entries for each row execute function public.validate_workspace_project_parent();

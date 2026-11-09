-- =====================================================================
-- minimum · Club de postres
-- Esquema completo para Supabase (PostgreSQL).
-- Cómo usarlo: Supabase > SQL Editor > New query > pega todo > Run.
-- Se puede volver a ejecutar sin romper nada.
-- =====================================================================

create extension if not exists pgcrypto with schema extensions;

-- ---------------------------------------------------------------------
-- Tablas
-- ---------------------------------------------------------------------

create table if not exists public.configuracion (
  id            int primary key default 1 check (id = 1),
  meta_postres  int not null default 5 check (meta_postres between 1 and 50),
  actualizado_en timestamptz not null default now()
);
insert into public.configuracion (id) values (1) on conflict (id) do nothing;

create table if not exists public.clientes (
  id                 uuid primary key default gen_random_uuid(),
  nombre             text not null check (char_length(trim(nombre)) between 2 and 60),
  celular            text not null unique check (celular ~ '^[0-9]{10}$'),
  compras_acumuladas int  not null default 0 check (compras_acumuladas >= 0),
  creado_en          timestamptz not null default now()
);

create table if not exists public.codigos_qr (
  id         uuid primary key default gen_random_uuid(),
  codigo     text not null unique,
  lote       text not null,
  usado      boolean not null default false,
  usado_en   timestamptz,
  cliente_id uuid references public.clientes(id) on delete set null,
  creado_en  timestamptz not null default now()
);
create index if not exists codigos_qr_lote_idx on public.codigos_qr (lote);

create table if not exists public.compras (
  id         uuid primary key default gen_random_uuid(),
  cliente_id uuid not null references public.clientes(id) on delete cascade,
  codigo_id  uuid references public.codigos_qr(id) on delete set null,
  fecha      timestamptz not null default now(),
  anulada    boolean not null default false
);
create index if not exists compras_cliente_idx on public.compras (cliente_id);
create index if not exists compras_fecha_idx on public.compras (fecha);

create table if not exists public.premios (
  id            uuid primary key default gen_random_uuid(),
  cliente_id    uuid not null references public.clientes(id) on delete cascade,
  codigo        text not null unique,
  fecha_ganado  timestamptz not null default now(),
  entregado     boolean not null default false,
  fecha_entrega timestamptz
);
create index if not exists premios_cliente_idx on public.premios (cliente_id);

-- Personas que pueden entrar al panel (la dueña).
create table if not exists public.administradores (
  user_id uuid primary key references auth.users(id) on delete cascade,
  creado_en timestamptz not null default now()
);

-- ---------------------------------------------------------------------
-- Utilidades
-- ---------------------------------------------------------------------

-- Código aleatorio con letras y números fáciles de leer (sin 0/O, 1/I/L).
create or replace function public.codigo_aleatorio(largo int)
returns text
language plpgsql
volatile
set search_path = public, extensions
as $$
declare
  alfabeto constant text := 'ABCDEFGHJKMNPQRSTUVWXYZ23456789';
  bytes bytea := gen_random_bytes(largo);
  salida text := '';
  i int;
begin
  for i in 0 .. largo - 1 loop
    salida := salida || substr(alfabeto, (get_byte(bytes, i) % length(alfabeto)) + 1, 1);
  end loop;
  return salida;
end;
$$;

create or replace function public.es_admin()
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select exists (select 1 from public.administradores where user_id = auth.uid());
$$;

create or replace function public.limpiar_celular(p text)
returns text
language sql
immutable
as $$
  select right(regexp_replace(coalesce(p, ''), '\D', '', 'g'), 10);
$$;

-- ---------------------------------------------------------------------
-- Seguridad: nadie del público lee las tablas directamente.
-- El público solo usa las funciones de abajo; la dueña tiene acceso total.
-- ---------------------------------------------------------------------

alter table public.configuracion   enable row level security;
alter table public.clientes        enable row level security;
alter table public.codigos_qr      enable row level security;
alter table public.compras         enable row level security;
alter table public.premios         enable row level security;
alter table public.administradores enable row level security;

drop policy if exists admin_todo on public.configuracion;
drop policy if exists admin_todo on public.clientes;
drop policy if exists admin_todo on public.codigos_qr;
drop policy if exists admin_todo on public.compras;
drop policy if exists admin_todo on public.premios;
drop policy if exists admin_lee on public.administradores;

create policy admin_todo on public.configuracion for all to authenticated using (public.es_admin()) with check (public.es_admin());
create policy admin_todo on public.clientes      for all to authenticated using (public.es_admin()) with check (public.es_admin());
create policy admin_todo on public.codigos_qr    for all to authenticated using (public.es_admin()) with check (public.es_admin());
create policy admin_todo on public.compras       for all to authenticated using (public.es_admin()) with check (public.es_admin());
create policy admin_todo on public.premios       for all to authenticated using (public.es_admin()) with check (public.es_admin());
create policy admin_lee  on public.administradores for select to authenticated using (user_id = auth.uid());

-- ---------------------------------------------------------------------
-- Funciones públicas (las usa la página del QR)
-- ---------------------------------------------------------------------

-- 1. Revisa un código del QR: si existe y si ya se usó.
create or replace function public.estado_codigo(p_codigo text)
returns json
language plpgsql
stable
security definer
set search_path = public
as $$
declare
  v_meta  int;
  v_usado boolean;
begin
  select meta_postres into v_meta from configuracion where id = 1;
  select usado into v_usado from codigos_qr where codigo = upper(trim(p_codigo));
  if not found then
    return json_build_object('existe', false, 'usado', false, 'meta', v_meta);
  end if;
  return json_build_object('existe', true, 'usado', v_usado, 'meta', v_meta);
end;
$$;

-- 2. Busca al cliente por celular. Solo responde si el código del QR
--    es válido y no se ha usado, para que nadie pueda revisar números al azar.
--    Devuelve solo el primer nombre y su progreso.
create or replace function public.buscar_cliente(p_codigo text, p_celular text)
returns json
language plpgsql
stable
security definer
set search_path = public
as $$
declare
  v_cel text := limpiar_celular(p_celular);
  v_cliente clientes%rowtype;
begin
  if not exists (select 1 from codigos_qr where codigo = upper(trim(p_codigo)) and usado = false) then
    return json_build_object('error', 'codigo_invalido');
  end if;

  select * into v_cliente from clientes where celular = v_cel;
  if not found then
    return json_build_object('encontrado', false);
  end if;

  return json_build_object(
    'encontrado', true,
    'nombre', split_part(v_cliente.nombre, ' ', 1),
    'compras', v_cliente.compras_acumuladas
  );
end;
$$;

-- 3. Canjea el código: registra la compra, quema el QR y, si llega a la meta,
--    crea el premio. Todo pasa junto o no pasa nada.
create or replace function public.canjear_codigo(p_codigo text, p_celular text, p_nombre text default null)
returns json
language plpgsql
volatile
security definer
set search_path = public
as $$
declare
  v_cel     text := limpiar_celular(p_celular);
  v_qr      codigos_qr%rowtype;
  v_cliente clientes%rowtype;
  v_meta    int;
  v_compras int;
  v_premio  text := null;
begin
  if char_length(v_cel) <> 10 then
    return json_build_object('error', 'celular_invalido');
  end if;

  -- Bloquea la fila del QR para que dos personas no lo usen al mismo tiempo.
  select * into v_qr from codigos_qr where codigo = upper(trim(p_codigo)) for update;
  if not found then
    return json_build_object('error', 'codigo_invalido');
  end if;
  if v_qr.usado then
    return json_build_object('error', 'codigo_usado');
  end if;

  select * into v_cliente from clientes where celular = v_cel for update;
  if not found then
    if p_nombre is null or char_length(trim(p_nombre)) < 2 then
      return json_build_object('error', 'falta_nombre');
    end if;
    insert into clientes (nombre, celular)
    values (initcap(trim(p_nombre)), v_cel)
    returning * into v_cliente;
  end if;

  select meta_postres into v_meta from configuracion where id = 1;

  insert into compras (cliente_id, codigo_id) values (v_cliente.id, v_qr.id);
  update codigos_qr set usado = true, usado_en = now(), cliente_id = v_cliente.id where id = v_qr.id;

  v_compras := v_cliente.compras_acumuladas + 1;

  if v_compras >= v_meta then
    loop
      v_premio := codigo_aleatorio(6);
      begin
        insert into premios (cliente_id, codigo) values (v_cliente.id, v_premio);
        exit;
      exception when unique_violation then
        -- código repetido, intenta otro
      end;
    end loop;
    v_compras := 0;
  end if;

  update clientes set compras_acumuladas = v_compras where id = v_cliente.id;

  return json_build_object(
    'nombre',  v_cliente.nombre,
    'celular', v_cliente.celular,
    'compras', v_compras,
    'meta',    v_meta,
    'premio',  v_premio
  );
end;
$$;

-- ---------------------------------------------------------------------
-- Funciones del panel (solo la dueña)
-- ---------------------------------------------------------------------

-- Crea un lote de códigos QR nuevos.
create or replace function public.generar_codigos(p_cantidad int, p_lote text)
returns int
language plpgsql
volatile
security definer
set search_path = public
as $$
declare
  creados int := 0;
begin
  if not es_admin() then raise exception 'No autorizado'; end if;
  if p_cantidad < 1 or p_cantidad > 2000 then raise exception 'La cantidad debe estar entre 1 y 2000'; end if;
  if p_lote is null or char_length(trim(p_lote)) = 0 then raise exception 'Escribe un nombre para el lote'; end if;

  while creados < p_cantidad loop
    begin
      insert into codigos_qr (codigo, lote) values (codigo_aleatorio(8), trim(p_lote));
      creados := creados + 1;
    exception when unique_violation then
      -- código repetido, intenta otro
    end;
  end loop;
  return creados;
end;
$$;

-- Anula una compra (por ejemplo, si se registró por error) y descuenta el sello.
create or replace function public.anular_compra(p_compra uuid)
returns void
language plpgsql
volatile
security definer
set search_path = public
as $$
declare
  v_cliente uuid;
begin
  if not es_admin() then raise exception 'No autorizado'; end if;

  update compras set anulada = true
  where id = p_compra and anulada = false
  returning cliente_id into v_cliente;

  if v_cliente is not null then
    update clientes set compras_acumuladas = greatest(compras_acumuladas - 1, 0) where id = v_cliente;
  end if;
end;
$$;

-- Resumen de cada lote de QR para el panel.
create or replace function public.resumen_lotes()
returns table (lote text, total bigint, usados bigint, creado_en timestamptz)
language plpgsql
stable
security definer
set search_path = public
as $$
begin
  if not es_admin() then raise exception 'No autorizado'; end if;
  return query
    select q.lote, count(*), count(*) filter (where q.usado), min(q.creado_en)
    from codigos_qr q
    group by q.lote
    order by min(q.creado_en) desc;
end;
$$;

-- Vuelve a habilitar un QR (por ejemplo, si se dañó al escanearlo).
create or replace function public.reactivar_codigo(p_codigo uuid)
returns void
language plpgsql
volatile
security definer
set search_path = public
as $$
begin
  if not es_admin() then raise exception 'No autorizado'; end if;
  update codigos_qr set usado = false, usado_en = null, cliente_id = null where id = p_codigo;
end;
$$;

-- ---------------------------------------------------------------------
-- Permisos
-- ---------------------------------------------------------------------

revoke all on function public.codigo_aleatorio(int) from public, anon, authenticated;
revoke all on function public.limpiar_celular(text) from public, anon;

grant execute on function public.estado_codigo(text)               to anon, authenticated;
grant execute on function public.buscar_cliente(text, text)        to anon, authenticated;
grant execute on function public.canjear_codigo(text, text, text)  to anon, authenticated;

revoke all on function public.generar_codigos(int, text) from public, anon;
revoke all on function public.anular_compra(uuid)        from public, anon;
revoke all on function public.reactivar_codigo(uuid)     from public, anon;
revoke all on function public.resumen_lotes()            from public, anon;
grant execute on function public.resumen_lotes()            to authenticated;
grant execute on function public.generar_codigos(int, text) to authenticated;
grant execute on function public.anular_compra(uuid)        to authenticated;
grant execute on function public.reactivar_codigo(uuid)     to authenticated;
grant execute on function public.es_admin()                 to authenticated;

-- ---------------------------------------------------------------------
-- Último paso (hazlo una sola vez, después de crear el usuario de la dueña
-- en Supabase > Authentication > Users > Add user):
--
--   insert into public.administradores (user_id)
--   select id from auth.users where email = 'correo-de-ella@ejemplo.com';
-- ---------------------------------------------------------------------

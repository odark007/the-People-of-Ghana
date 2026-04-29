-- ─────────────────────────────────────────────────────────────────────────────
-- Seed: Ghana Governance Data
-- All 16 regions + sample constituencies and districts
-- ─────────────────────────────────────────────────────────────────────────────

-- ── Regions ───────────────────────────────────────────────────────────────────
insert into regions (name, code) values
  ('Greater Accra',       'GAR'),
  ('Ashanti',             'ASH'),
  ('Western',             'WR'),
  ('Central',             'CR'),
  ('Eastern',             'ER'),
  ('Volta',               'VR'),
  ('Oti',                 'OTI'),
  ('Bono',                'BR'),
  ('Bono East',           'BER'),
  ('Ahafo',               'AHR'),
  ('Northern',            'NR'),
  ('Savannah',            'SVR'),
  ('North East',          'NER'),
  ('Upper East',          'UER'),
  ('Upper West',          'UWR'),
  ('Western North',       'WNR')
on conflict (code) do nothing;

-- ── Constituencies — Greater Accra (sample, full list has 29) ─────────────────
with gar as (select id from regions where code = 'GAR')
insert into constituencies (name, region_id) values
  ('Ablekuma Central',     (select id from gar)),
  ('Ablekuma North',       (select id from gar)),
  ('Ablekuma West',        (select id from gar)),
  ('Adenta',               (select id from gar)),
  ('Ashaiman',             (select id from gar)),
  ('Ayawaso Central',      (select id from gar)),
  ('Ayawaso East',         (select id from gar)),
  ('Ayawaso North',        (select id from gar)),
  ('Ayawaso West Wuogon',  (select id from gar)),
  ('Dome-Kwabenya',        (select id from gar)),
  ('Korle Klottey',        (select id from gar)),
  ('Krowor',               (select id from gar)),
  ('La Bawaleshie',        (select id from gar)),
  ('La Dade-Kotopon',      (select id from gar)),
  ('Ledzokuku',            (select id from gar)),
  ('Madina',               (select id from gar)),
  ('Ningo Prampram',       (select id from gar)),
  ('Okaikwei Central',     (select id from gar)),
  ('Tema Central',         (select id from gar)),
  ('Tema East',            (select id from gar)),
  ('Tema West',            (select id from gar))
on conflict do nothing;

-- ── Constituencies — Ashanti (sample) ────────────────────────────────────────
with ash as (select id from regions where code = 'ASH')
insert into constituencies (name, region_id) values
  ('Asokwa',               (select id from ash)),
  ('Bantama',              (select id from ash)),
  ('Bosomtwe',             (select id from ash)),
  ('Kumasi Central',       (select id from ash)),
  ('Manhyia North',        (select id from ash)),
  ('Manhyia South',        (select id from ash)),
  ('Nhyiaeso',             (select id from ash)),
  ('Oforikrom',            (select id from ash)),
  ('Old Tafo',             (select id from ash)),
  ('Suame',                (select id from ash))
on conflict do nothing;

-- ── Districts — Greater Accra (sample) ───────────────────────────────────────
with dk as (select id from constituencies where name = 'Dome-Kwabenya')
insert into districts (name, constituency_id, type) values
  ('Ga East Municipal',     (select id from dk), 'municipal')
on conflict do nothing;

with tema_c as (select id from constituencies where name = 'Tema Central')
insert into districts (name, constituency_id, type) values
  ('Tema Metropolitan',     (select id from tema_c), 'metropolitan')
on conflict do nothing;

with ashaiman as (select id from constituencies where name = 'Ashaiman')
insert into districts (name, constituency_id, type) values
  ('Ashaiman Municipal',    (select id from ashaiman), 'municipal')
on conflict do nothing;

with madina as (select id from constituencies where name = 'Madina')
insert into districts (name, constituency_id, type) values
  ('La Nkwantanang-Madina', (select id from madina), 'municipal')
on conflict do nothing;

with korle as (select id from constituencies where name = 'Korle Klottey')
insert into districts (name, constituency_id, type) values
  ('Accra Metropolitan',    (select id from korle), 'metropolitan')
on conflict do nothing;

-- ── Electoral Areas — Accra Metropolitan (sample) ────────────────────────────
with ama as (select id from districts where name = 'Accra Metropolitan')
insert into electoral_areas (name, district_id) values
  ('Adabraka',        (select id from ama)),
  ('Airport',         (select id from ama)),
  ('Asylum Down',     (select id from ama)),
  ('Cantonments',     (select id from ama)),
  ('Kokomlemle',      (select id from ama)),
  ('Kanda',           (select id from ama)),
  ('North Kaneshie',  (select id from ama)),
  ('Osu Klottey',     (select id from ama)),
  ('Ringway',         (select id from ama)),
  ('Roman Ridge',     (select id from ama)),
  ('Tesano',          (select id from ama)),
  ('Weija',           (select id from ama))
on conflict do nothing;

-- ── Officials (sample, unverified placeholders) ───────────────────────────────
insert into officials (full_name, role, region_id, verification_status) values
  (
    'Regional Minister - Greater Accra',
    'regional_minister',
    (select id from regions where code = 'GAR'),
    'pending'
  ),
  (
    'Regional Minister - Ashanti',
    'regional_minister',
    (select id from regions where code = 'ASH'),
    'pending'
  )
on conflict do nothing;

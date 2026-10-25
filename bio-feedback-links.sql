-- Keep existing customized links and stable section URLs. Append only missing actions.
update public.bio_page set links = links || (
  select coalesce(jsonb_agg(item), '[]'::jsonb)
  from jsonb_array_elements('[{"id":"newsletter","section":"contatti","title":"Iscriviti alla newsletter","url":"/feed?newsletter=open","description":"Le novità della Factory, direttamente nella tua email.","visible":true},{"id":"reviews","section":"contatti","title":"Lascia una recensione","url":"/feed/recensioni","description":"Raccontaci la tua esperienza.","visible":true}]'::jsonb) item
  where not exists (select 1 from jsonb_array_elements(links) old where old->>'id' = item->>'id')
), version = version + 1 where id = 1 and not (links @> '[{"id":"newsletter"}]'::jsonb and links @> '[{"id":"reviews"}]'::jsonb);

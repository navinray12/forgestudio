-- First-class blog configuration backed by the existing CMS, plus deterministic personalization rules.
CREATE TABLE studio.blog_configs (
  site_id uuid PRIMARY KEY REFERENCES public.websites(id) ON DELETE CASCADE,
  posts_collection_id uuid NOT NULL REFERENCES studio.collections(id) ON DELETE RESTRICT,
  authors_collection_id uuid NOT NULL REFERENCES studio.collections(id) ON DELETE RESTRICT,
  categories_collection_id uuid NOT NULL REFERENCES studio.collections(id) ON DELETE RESTRICT,
  default_locale varchar(35) NOT NULL DEFAULT 'en',
  created_by uuid REFERENCES public.users(id) ON DELETE SET NULL,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

CREATE TABLE studio.personalization_rules (
  id uuid PRIMARY KEY,
  site_id uuid NOT NULL REFERENCES public.websites(id) ON DELETE CASCADE,
  name varchar(120) NOT NULL,
  state varchar(20) NOT NULL DEFAULT 'DRAFT' CHECK(state IN ('DRAFT','RUNNING','PAUSED')),
  priority integer NOT NULL DEFAULT 100 CHECK(priority BETWEEN 0 AND 100000),
  conditions jsonb NOT NULL DEFAULT '[]'::jsonb CHECK(jsonb_typeof(conditions)='array'),
  target_element_id varchar(150) NOT NULL,
  variant jsonb NOT NULL CHECK(jsonb_typeof(variant)='object'),
  revision integer NOT NULL DEFAULT 0,
  created_by uuid REFERENCES public.users(id) ON DELETE SET NULL,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX studio_personalization_site_state ON studio.personalization_rules(site_id,state,priority,id);

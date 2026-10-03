BEGIN;
CREATE TABLE public.workspace_member_types (
 id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
 workspace_id uuid NOT NULL REFERENCES public.workspaces(id) ON DELETE CASCADE,
 name text NOT NULL CHECK (length(btrim(name)) BETWEEN 1 AND 80),
 is_default boolean NOT NULL DEFAULT false,
 UNIQUE(workspace_id,id)
);
CREATE UNIQUE INDEX workspace_member_types_default ON public.workspace_member_types(workspace_id) WHERE is_default;
CREATE UNIQUE INDEX workspace_member_types_name ON public.workspace_member_types(workspace_id,lower(btrim(name)));
INSERT INTO public.workspace_member_types(workspace_id,name,is_default) SELECT id,'Members',true FROM public.workspaces;
ALTER TABLE public.workspace_users ADD COLUMN member_type_id uuid;
UPDATE public.workspace_users m SET member_type_id=t.id FROM public.workspace_member_types t WHERE t.workspace_id=m.workspace_id AND t.is_default;
ALTER TABLE public.workspace_users ALTER COLUMN member_type_id SET NOT NULL;
ALTER TABLE public.workspace_users ADD CONSTRAINT workspace_users_member_type FOREIGN KEY(workspace_id,member_type_id) REFERENCES public.workspace_member_types(workspace_id,id);

CREATE FUNCTION private.create_default_member_type() RETURNS trigger LANGUAGE plpgsql SECURITY DEFINER SET search_path=pg_catalog,public AS $$
BEGIN INSERT INTO public.workspace_member_types(workspace_id,name,is_default) VALUES(NEW.id,'Members',true); RETURN NEW; END $$;
CREATE TRIGGER workspaces_default_member_type AFTER INSERT ON public.workspaces FOR EACH ROW EXECUTE FUNCTION private.create_default_member_type();
CREATE FUNCTION private.assign_default_member_type() RETURNS trigger LANGUAGE plpgsql SECURITY DEFINER SET search_path=pg_catalog,public AS $$
BEGIN
 IF NEW.member_type_id IS NULL THEN SELECT id INTO NEW.member_type_id FROM public.workspace_member_types WHERE workspace_id=NEW.workspace_id AND is_default; END IF;
 RETURN NEW;
END $$;
CREATE TRIGGER workspace_users_default_type BEFORE INSERT ON public.workspace_users FOR EACH ROW EXECUTE FUNCTION private.assign_default_member_type();
CREATE FUNCTION private.protect_default_member_type() RETURNS trigger LANGUAGE plpgsql SET search_path=pg_catalog,public AS $$
BEGIN
 IF TG_OP='DELETE' THEN
  IF OLD.is_default AND EXISTS(SELECT 1 FROM public.workspaces WHERE id=OLD.workspace_id) THEN RAISE EXCEPTION 'The default member type cannot be deleted'; END IF;
  RETURN OLD;
 END IF;
 IF NEW.workspace_id<>OLD.workspace_id OR NEW.is_default<>OLD.is_default THEN RAISE EXCEPTION 'Member type identity cannot change'; END IF;
 RETURN NEW;
END $$;
CREATE TRIGGER member_types_protect_default BEFORE UPDATE OR DELETE ON public.workspace_member_types FOR EACH ROW EXECUTE FUNCTION private.protect_default_member_type();
ALTER TABLE public.workspace_member_types ENABLE ROW LEVEL SECURITY;
GRANT SELECT,INSERT,UPDATE ON public.workspace_member_types TO authenticated;
GRANT SELECT ON public.workspace_member_types TO service_role;
CREATE POLICY member_types_read ON public.workspace_member_types FOR SELECT TO authenticated USING(private.is_workspace_member(workspace_id));
CREATE POLICY member_types_create ON public.workspace_member_types FOR INSERT TO authenticated WITH CHECK(private.current_user_can(workspace_id,'can_update') AND NOT is_default);
CREATE POLICY member_types_rename ON public.workspace_member_types FOR UPDATE TO authenticated USING(private.current_user_can(workspace_id,'can_update')) WITH CHECK(private.current_user_can(workspace_id,'can_update'));
CREATE FUNCTION public.set_workspace_member_type(p_workspace_id uuid,p_user_id uuid,p_type_id uuid) RETURNS void LANGUAGE plpgsql SECURITY DEFINER SET search_path=pg_catalog,public AS $$
BEGIN
 IF NOT private.current_user_can(p_workspace_id,'can_update') THEN RAISE EXCEPTION 'Forbidden' USING ERRCODE='42501'; END IF;
 IF NOT EXISTS(SELECT 1 FROM public.workspace_member_types WHERE id=p_type_id AND workspace_id=p_workspace_id) THEN RAISE EXCEPTION 'Invalid member type'; END IF;
 UPDATE public.workspace_users SET member_type_id=p_type_id WHERE workspace_id=p_workspace_id AND user_id=p_user_id;
 IF NOT FOUND THEN RAISE EXCEPTION 'Member not found'; END IF;
END $$;
REVOKE ALL ON FUNCTION public.set_workspace_member_type(uuid,uuid,uuid) FROM PUBLIC,anon;
GRANT EXECUTE ON FUNCTION public.set_workspace_member_type(uuid,uuid,uuid) TO authenticated;
REVOKE ALL ON FUNCTION private.create_default_member_type(),private.assign_default_member_type(),private.protect_default_member_type() FROM PUBLIC,anon,authenticated;
COMMIT;

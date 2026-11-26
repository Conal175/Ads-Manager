-- Preflight: check existing duplicate Drive file IDs and create a restorable backup
-- before applying. Do not silently discard or merge existing media.
CREATE UNIQUE INDEX creatives_drive_file_id_unique ON public.creatives (drive_file_id);
CREATE UNIQUE INDEX creatives_normalized_code_unique ON public.creatives (upper(trim(creative_code)));

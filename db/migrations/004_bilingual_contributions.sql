ALTER TABLE content_entries ADD COLUMN source_locale text NOT NULL DEFAULT 'de' CHECK (source_locale IN ('de','en'));
ALTER TABLE content_entries ADD COLUMN translations jsonb NOT NULL DEFAULT '{}'::jsonb CHECK (jsonb_typeof(translations)='object');
ALTER TABLE content_entries ADD COLUMN region_id text;
ALTER TABLE content_entries ADD COLUMN context_id text;
UPDATE content_entries SET region_id = CASE lower(trim(region))
 WHEN 'norddeutschland' THEN 'de-north' WHEN 'northern germany' THEN 'de-north'
 WHEN 'deutschschweiz' THEN 'ch' WHEN 'german-speaking switzerland' THEN 'ch'
 WHEN 'sachsen' THEN 'de-saxony' WHEN 'saxony' THEN 'de-saxony'
 WHEN 'berlin' THEN 'de-berlin' WHEN 'schwaben' THEN 'de-swabia' WHEN 'swabia' THEN 'de-swabia'
 WHEN 'österreich' THEN 'at' WHEN 'austria' THEN 'at' WHEN 'rheinland' THEN 'de-rhineland' WHEN 'rhineland' THEN 'de-rhineland'
 WHEN 'bayern' THEN 'de-bavaria' WHEN 'bavaria' THEN 'de-bavaria' WHEN 'québec' THEN 'ca-quebec' WHEN 'quebec' THEN 'ca-quebec' WHEN 'stockholm' THEN 'se-stockholm' END;
UPDATE content_entries SET context_id = CASE lower(trim(context))
 WHEN 'formelle bitte' THEN 'formal-request' WHEN 'formal request' THEN 'formal-request'
 WHEN 'informelle begrüßung' THEN 'casual-greeting' WHEN 'informal greeting' THEN 'casual-greeting'
 WHEN 'höfliche absage' THEN 'polite-refusal' WHEN 'polite refusal' THEN 'polite-refusal'
 WHEN 'entschuldigung' THEN 'apology' WHEN 'apology' THEN 'apology'
 WHEN 'direkte aufforderung' THEN 'direct-request' WHEN 'direct instruction' THEN 'direct-request'
 WHEN 'dank' THEN 'thanks' WHEN 'thanks' THEN 'thanks' WHEN 'zustimmung' THEN 'agreement' WHEN 'agreement' THEN 'agreement'
 WHEN 'förmliche begrüßung' THEN 'formal-greeting' WHEN 'formal greeting' THEN 'formal-greeting' END;
ALTER TABLE explanations ADD COLUMN source_locale text NOT NULL DEFAULT 'de' CHECK (source_locale IN ('de','en'));
ALTER TABLE explanations ADD COLUMN translations jsonb NOT NULL DEFAULT '{}'::jsonb CHECK (jsonb_typeof(translations)='object');
CREATE TABLE translation_suggestions (
 cache_key text PRIMARY KEY, result jsonb NOT NULL, created_at timestamptz NOT NULL DEFAULT now()
);
CREATE TABLE translation_usage (
 month text PRIMARY KEY, characters integer NOT NULL CHECK (characters>=0)
);

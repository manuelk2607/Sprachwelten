INSERT INTO translation_usage(month,characters)
SELECT 'lifetime',coalesce(sum(characters),0)::integer FROM translation_usage WHERE month<>'lifetime'
ON CONFLICT(month) DO NOTHING;

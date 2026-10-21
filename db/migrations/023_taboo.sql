ALTER TABLE content_entries DROP CONSTRAINT content_entries_kind_check;
ALTER TABLE content_entries ADD CONSTRAINT content_entries_kind_check CHECK (kind IN ('idiom','dialect','situation','word','tongue_twister','gaming_mission','youth_chat','academic','sound_pair','attribution','false_friend','word_order','joke','word_group','loanword','taboo'));

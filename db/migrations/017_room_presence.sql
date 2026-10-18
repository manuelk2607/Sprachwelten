CREATE TABLE room_presence (
  room_code text NOT NULL REFERENCES game_rooms(code) ON DELETE CASCADE,
  player_id text NOT NULL,
  seen_at timestamptz NOT NULL DEFAULT now(),
  PRIMARY KEY(room_code,player_id)
);
CREATE INDEX request_limits_expiration ON request_limits(expires_at);

/** Shared error identity without importing the game engine or starter decks. */
export class GameError extends Error {
  constructor(message: string, public status = 409) { super(message); }
}

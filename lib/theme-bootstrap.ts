// Serialized into a pre-hydration script; this function never runs in a render.
export function themeBootstrap() {
  try {
    const saved = localStorage.getItem("sprachwelten-theme");
    document.documentElement.dataset.theme =
      saved === "light" || saved === "dark"
        ? saved
        : matchMedia("(prefers-color-scheme: dark)").matches
          ? "dark"
          : "light";
  } catch {}
}

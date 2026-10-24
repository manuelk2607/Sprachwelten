"use client";
import {
  Children,
  isValidElement,
  useEffect,
  useId,
  useRef,
  useState,
  type ReactNode,
} from "react";
import { Check, ChevronDown } from "lucide-react";
import { useI18n } from "@/lib/i18n";
type Props = {
  children: ReactNode;
  value?: string | number;
  defaultValue?: string | number;
  onValueChange?: (value: string) => void;
  name?: string;
  required?: boolean;
  disabled?: boolean;
  id?: string;
  "aria-label"?: string;
};
export function Select({
  children,
  value,
  defaultValue,
  onValueChange,
  name,
  required,
  disabled,
  id: providedId,
  "aria-label": label,
}: Props) {
  const { t } = useI18n(),
    uid = useId(),
    id = providedId ?? uid;
  const options = Children.toArray(children).flatMap((child) => {
    if (
      !isValidElement<{
        value?: string | number;
        children?: ReactNode;
        disabled?: boolean;
      }>(child) ||
      child.type !== "option"
    )
      return [];
    return [
      {
        value: String(child.props.value ?? ""),
        text: Children.toArray(child.props.children).join(""),
        disabled: child.props.disabled,
      },
    ];
  });
  const [internal, setInternal] = useState(
      String(defaultValue ?? options[0]?.value ?? ""),
    ),
    [open, setOpen] = useState(false),
    [query, setQuery] = useState(""),
    [active, setActive] = useState(0);
  const current = String(value ?? internal),
    selected = options.find((o) => o.value === current),
    filtered = options.filter((o) =>
      o.text.toLocaleLowerCase().includes(query.toLocaleLowerCase()),
    );
  const trigger = useRef<HTMLButtonElement>(null),
    popup = useRef<HTMLDivElement>(null),
    list = useRef<HTMLDivElement>(null),
    search = useRef<HTMLInputElement>(null);
  const [position, setPosition] = useState({
    left: 0,
    top: 0,
    width: 200,
    maxHeight: 280,
  });
  function show() {
    if (disabled) return;
    setQuery("");
    setActive(
      Math.max(
        0,
        options.findIndex((o) => o.value === current),
      ),
    );
    setOpen(true);
  }
  function choose(v: string) {
    setInternal(v);
    onValueChange?.(v);
    if (popup.current?.matches(":popover-open")) popup.current.hidePopover();
    setOpen(false);
    trigger.current?.focus();
  }
  useEffect(() => {
    if (!open || !popup.current) return;
    const el = popup.current;
    const place = () => {
      const r = trigger.current!.getBoundingClientRect(),
        height = Math.min(300, window.innerHeight - 24),
        below = window.innerHeight - r.bottom - 12,
        above = r.top - 12;
      const up = below < 180 && above > below;
      setPosition({
        left: Math.max(8, Math.min(r.left, window.innerWidth - r.width - 8)),
        top: up ? Math.max(8, r.top - Math.min(height, above)) : r.bottom + 6,
        width: r.width,
        maxHeight: Math.max(100, Math.min(height, up ? above : below)),
      });
    };
    place();
    el.showPopover();
    if (options.length > 8) search.current?.focus();
    else list.current?.focus();
    const toggle = (e: Event) => {
      if ((e as ToggleEvent).newState === "closed") setOpen(false);
    };
    el.addEventListener("toggle", toggle);
    window.addEventListener("resize", place);
    window.addEventListener("scroll", place, true);
    return () => {
      el.removeEventListener("toggle", toggle);
      window.removeEventListener("resize", place);
      window.removeEventListener("scroll", place, true);
      if (el.matches(":popover-open")) el.hidePopover();
    };
  }, [open, options.length]);
  useEffect(() => {
    if (open)
      popup.current
        ?.querySelector(`[data-index="${active}"]`)
        ?.scrollIntoView({ block: "nearest" });
  }, [active, open]);
  function keys(e: React.KeyboardEvent) {
    if (e.key === "Escape") {
      e.preventDefault();
      setOpen(false);
      trigger.current?.focus();
      return;
    }
    if (e.key === "Tab") {
      e.preventDefault();
      const root=trigger.current?.closest('dialog')??document;
      const focusable=Array.from(root.querySelectorAll<HTMLElement>('a[href],button,input,textarea,select,summary,[tabindex]')).filter(el=>el.tabIndex>=0&&!el.matches(':disabled')&&!popup.current?.contains(el)&&el.getClientRects().length>0);
      const index=focusable.indexOf(trigger.current!);
      const next=focusable[index+(e.shiftKey?-1:1)];
      setOpen(false);
      (next??trigger.current)?.focus();
      return;
    }
    if (["ArrowDown", "ArrowUp", "Home", "End"].includes(e.key)) {
      e.preventDefault();
      if (!open) {
        show();
        return;
      }
      if (!filtered.length) return;
      let n =
        e.key === "Home"
          ? 0
          : e.key === "End"
            ? filtered.length - 1
            : active + (e.key === "ArrowDown" ? 1 : -1);
      n = (n + filtered.length) % filtered.length;
      for (let i = 0; i < filtered.length && filtered[n].disabled; i++)
        n =
          (n + (e.key === "ArrowUp" ? -1 : 1) + filtered.length) %
          filtered.length;
      setActive(n);
    } else if (
      e.key === "Enter" ||
      (e.key === " " && e.target !== search.current)
    ) {
      e.preventDefault();
      if (!open) show();
      else if (filtered[active] && !filtered[active].disabled)
        choose(filtered[active].value);
    }
  }
  return (
    <span className="select-control">
      <button
        id={id}
        ref={trigger}
        type="button"
        className="select-trigger"
        role="combobox"
        aria-label={label}
        aria-expanded={open}
        aria-controls={id + "-list"}
        aria-activedescendant={open&&filtered[active]?id+"-option-"+active:undefined}
        aria-haspopup="listbox"
        aria-required={required}
        disabled={disabled}
        onClick={() => (open ? setOpen(false) : show())}
        onKeyDown={keys}
      >
        <span>{selected?.text ?? t("Bitte auswählen")}</span>
        <ChevronDown size={17} />
      </button>
      <select
        className="select-native"
        tabIndex={-1}
        aria-hidden="true"
        name={name}
        required={required}
        disabled={disabled}
        value={current}
        onChange={(e) => choose(e.target.value)}
        onInvalid={(e) => {
          e.preventDefault();
          trigger.current?.focus();
          show();
        }}
      >
        {children}
      </select>
      {open && (
        <div
          ref={popup}
          popover="auto"
          tabIndex={-1}
          className="select-popup"
          style={position}
          onKeyDown={keys}
        >
          {options.length > 8 && (
            <input
              ref={search}
              role="combobox"
              aria-expanded="true"
              aria-controls={id+"-list"}
              aria-autocomplete="list"
              aria-activedescendant={filtered[active]?id+"-option-"+active:undefined}
              aria-label={t("Auswahl durchsuchen")}
              placeholder={t("Auswahl durchsuchen")}
              value={query}
              onChange={(e) => {
                setQuery(e.target.value);
                setActive(0);
              }}
            />
          )}
          <div
            ref={list}
            tabIndex={-1}
            id={id + "-list"}
            role="listbox"
            aria-label={label ?? selected?.text}
            aria-activedescendant={
              filtered[active] ? id + "-option-" + active : undefined
            }
          >
            {filtered.map((o, i) => (
              <button
                type="button"
                id={id + "-option-" + i}
                key={o.value}
                data-index={i}
                role="option"
                tabIndex={-1}
                aria-selected={o.value === current}
                disabled={o.disabled}
                className={i === active ? "active" : ""}
                onPointerMove={() => setActive(i)}
                onClick={(e) => {
                  e.preventDefault();
                  e.stopPropagation();
                  choose(o.value);
                }}
              >
                <span>{o.text}</span>
                {o.value === current && <Check size={16} />}
              </button>
            ))}
          </div>
          {!filtered.length && <p>{t("Keine passende Auswahl.")}</p>}
        </div>
      )}
    </span>
  );
}

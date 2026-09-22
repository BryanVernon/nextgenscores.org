import { useRef, useState } from "react";

export default function StaticFilterPicker({ label, value, options, onSelect, disabled = false, visuallyHiddenLabel = false, className = "" }) {
  const [open, setOpen] = useState(false);
  const triggerRef = useRef(null);
  const id = `filter-${label.toLowerCase().replace(/\s+/g, "-")}`;
  const selected = options.find(option => option.value === value) || options[0];

  function close() {
    setOpen(false);
    requestAnimationFrame(() => triggerRef.current?.focus());
  }

  function select(nextValue) {
    onSelect(nextValue);
    close();
  }

  return <>
    <label id={`${id}-label`} className={visuallyHiddenLabel ? "sr-only" : undefined}>{label}</label>
    <div className={`static-filter-picker ${className}`.trim()}>
      <button ref={triggerRef} type="button" className="static-filter-picker-trigger" aria-labelledby={`${id}-label`} aria-haspopup="dialog" aria-expanded={open} aria-controls={`${id}-menu`} onClick={() => setOpen(current => !current)} disabled={disabled}>{selected?.label}<span className="filter-picker-chevron" aria-hidden="true" /></button>
      {open && <div id={`${id}-menu`} className="static-filter-picker-menu" role="dialog" aria-labelledby={`${id}-label`} onKeyDown={event => { if (event.key === "Escape") { event.preventDefault(); close(); } }}>
        <div className="static-filter-picker-options">
          {options.map(option => <button key={option.value} type="button" className={option.value === value ? "selected" : ""} aria-pressed={option.value === value} onClick={() => select(option.value)}>{option.label}</button>)}
        </div>
      </div>}
    </div>
  </>;
}

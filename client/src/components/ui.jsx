import { EM_STATUS } from "../lib.js";

export const Icon = ({ name, className = "" }) => <span className={"material-symbols-outlined " + className} aria-hidden="true">{name}</span>;

const TONES = {
  crit: "bg-[#FFDAD6] text-[#B50C08]", warn: "bg-[#FEF3C7] text-[#92400E]", info: "bg-[#DBEAFE] text-[#1E40AF]",
  ok: "bg-[#D1FAE5] text-[#047857]", muted: "bg-[#F3F4F6] text-[#4B5563]"
};
const DOTS = { crit: "bg-brand", warn: "bg-warn", info: "bg-info", ok: "bg-ok", muted: "bg-[#9CA3AF]" };

export const Chip = ({ tone = "muted", children }) => (
  <span className={"inline-flex items-center gap-1.5 px-2 py-0.5 rounded-full text-[12px] font-semibold whitespace-nowrap " + TONES[tone]}>
    <span className={"w-2 h-2 rounded-full " + DOTS[tone]} />{children}
  </span>
);
export const Dot = ({ tone = "muted", children }) => (
  <span className="inline-flex items-center gap-1.5 text-[13px] font-medium whitespace-nowrap"><span className={"w-2 h-2 rounded-full " + DOTS[tone]} />{children}</span>
);
const SEV = { Critical: "crit", Serious: "warn", Moderate: "info" };
export const Severity = ({ s }) => <Chip tone={SEV[s]}>{s}</Chip>;
export const Unverified = () => <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[12px] font-semibold whitespace-nowrap border border-[#92400E]/40 text-[#92400E]" title="The caller was not sure how serious it is. Treated as serious until a dispatcher confirms."><Icon name="help" className="!text-[14px]" />Urgency not confirmed</span>;
export const EmStatus = ({ s }) => <Dot tone={EM_STATUS[s].tone}>{EM_STATUS[s].label}</Dot>;
const HS = { Accepting: "ok", Limited: "warn", Diverting: "crit" };
export const HospStatus = ({ s }) => <Chip tone={HS[s]}>{s}</Chip>;
const SS = { OK: "ok", Low: "warn", Out: "crit" };
export const SupplyStatus = ({ s }) => <Chip tone={SS[s]}>{s}</Chip>;

export function PageHead({ title, desc, children }) {
  return (
    <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 mb-6">
      <div>
        <h1 className="text-[28px] leading-9 font-semibold tracking-tight">{title}</h1>
        <p className="text-muted mt-0.5">{desc}</p>
      </div>
      {children && <div className="flex flex-wrap items-center gap-2 shrink-0">{children}</div>}
    </div>
  );
}

export function Kpi({ label, value, unit, sub, icon, tone = "text-ink" }) {
  return (
    <div className="card p-4">
      <div className="flex items-center justify-between"><span className="lbl">{label}</span><Icon name={icon} className={tone} /></div>
      <div className="mt-2 text-[36px] leading-10 font-semibold tracking-tight">{value}{unit && <span className="text-[18px] text-muted font-normal"> {unit}</span>}</div>
      <div className="mt-1 text-[13px] text-muted">{sub}</div>
    </div>
  );
}

export function Bar({ value, max = 100, tone }) {
  const p = Math.max(0, Math.min(100, (value / max) * 100));
  const c = tone || (p >= 90 ? "bg-brand" : p >= 70 ? "bg-warn" : "bg-ok");
  return <div className="h-1.5 rounded-full bg-[#EEF0F3] overflow-hidden"><div className={"h-full rounded-full " + c} style={{ width: p + "%" }} /></div>;
}

export const AiNote = () => <p className="text-[12px] text-muted text-center">Suggested by AI. A person makes the final decision. VISION never diagnoses patients.</p>;

export function Steps({ step, labels = ["Request sent", "Ambulance assigned", "On the way", "With patient", "At hospital"] }) {
  return (
    <ol className="flex items-center w-full">
      {labels.map((l, i) => (
        <li key={l} className="flex-1 flex flex-col items-center relative min-w-0">
          {i > 0 && <span className={"absolute top-[9px] right-1/2 w-full h-0.5 " + (i <= step ? "bg-brand" : "bg-line")} />}
          <span className={"relative z-10 w-5 h-5 rounded-full border-2 flex items-center justify-center " + (i < step ? "bg-brand border-brand" : i === step ? "bg-white border-brand" : "bg-white border-line")}>
            {i < step && <Icon name="check" className="!text-[14px] text-white" />}
            {i === step && <span className="w-2 h-2 rounded-full bg-brand" />}
          </span>
          <span className={"mt-1.5 text-[11px] text-center leading-tight px-0.5 " + (i <= step ? "text-ink font-semibold" : "text-muted")}>{l}</span>
        </li>
      ))}
    </ol>
  );
}

export const Loading = ({ text = "Loading..." }) => <div className="p-6 text-center text-muted">{text}</div>;
export const Empty = ({ icon = "inbox", text }) => <div className="p-8 text-center text-muted"><Icon name={icon} className="!text-[28px] mb-2" /><p>{text}</p></div>;

const MONTH_PATTERN = /^(\d{4})-(0[1-9]|1[0-2])$/;

export function currentMonthValue(date = new Date()) {
  return `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, "0")}`;
}

export function monthPeriod(value?: string) {
  const month = value && MONTH_PATTERN.test(value) ? value : currentMonthValue();
  const [year, monthNumber] = month.split("-").map(Number);
  return {
    value: month,
    start: new Date(Date.UTC(year, monthNumber - 1, 1)),
    end: new Date(Date.UTC(year, monthNumber, 1)),
    label: new Intl.DateTimeFormat("pt-BR", { month: "long", year: "numeric", timeZone: "UTC" }).format(new Date(Date.UTC(year, monthNumber - 1, 1)))
  };
}

export function monthRedirect(path: string, form: FormData, fallbackDate?: string) {
  const requested = String(form.get("returnMonth") || "");
  const dateMonth = fallbackDate?.slice(0, 7) || "";
  const month = MONTH_PATTERN.test(requested) ? requested : MONTH_PATTERN.test(dateMonth) ? dateMonth : "";
  return month ? `${path}?mes=${month}` : path;
}

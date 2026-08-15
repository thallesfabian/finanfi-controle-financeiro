export const currency = (value: number) => new Intl.NumberFormat("pt-BR", { style: "currency", currency: "BRL" }).format(value);
export const brDate = (value: Date | string) => new Intl.DateTimeFormat("pt-BR", { timeZone: "UTC" }).format(new Date(value));

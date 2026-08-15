import "./globals.css";
import "./sidebar.css";
export const metadata = { title: "Finanfi | Controle financeiro", description: "Finanças pessoais e ganhos como motorista em um só lugar." };
export default function RootLayout({ children }: Readonly<{ children: React.ReactNode }>) { return <html lang="pt-BR"><body>{children}</body></html>; }

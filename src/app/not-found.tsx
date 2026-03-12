
import Link from "next/link";

export default function NotFound() {
  return (
    <section className="page-hero">
      <div className="container-shell">
        <h1 className="text-4xl font-bold">Página não encontrada</h1>
        <p className="mt-4 text-white/70">As rotas quebradas da versão legada foram corrigidas nesta migração.</p>
        <Link href="/" className="legacy-button mt-8">Voltar para a home</Link>
      </div>
    </section>
  );
}

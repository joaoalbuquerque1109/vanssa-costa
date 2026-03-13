
import type { ConfigRow } from "@/types/site";

export function ContactSection({ config }: { config: ConfigRow }) {
  const mapSrc = config.mapa ? config.mapa.match(/src="([^"]+)"/)?.[1] ?? config.mapa : "";

  return (
    <section className="section-padding bg-slate-50">
      <div className="container-shell">
        <h2 className="section-title">Contate-nos</h2>
        <div className="mt-12 grid gap-8 lg:grid-cols-2">
          <form className="card-shell grid gap-4 p-8">
            <input className="form-field" placeholder="Seu Nome" />
            <input className="form-field" placeholder="Seu Telefone" />
            <input className="form-field" placeholder="Seu E-mail" type="email" />
            <textarea className="form-field min-h-36" placeholder="Mensagem" />
            <button type="button" className="legacy-button">Enviar</button>
          </form>

          <div className="card-shell overflow-hidden p-0">
            {mapSrc ? (
              <iframe
                src={mapSrc}
                className="min-h-[420px] w-full border-0"
                loading="lazy"
                title="Mapa"
              />
            ) : (
              <div className="flex min-h-[420px] items-center justify-center text-slate-500">Mapa indisponível</div>
            )}
          </div>
        </div>
      </div>
    </section>
  );
}

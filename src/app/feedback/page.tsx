import { FeedbackForm } from "@/components/FeedbackForm";

export default function FeedbackPage() {
  return (
    <section className="section-padding">
      <div className="container-shell max-w-3xl">
        <div className="card-shell p-6 sm:p-10">
          <h1 className="section-title">Envie seu feedback</h1>
          <p className="mt-4 text-sm leading-7 text-slate-600">
            Compartilhe sua experiência com uma nota de 0 a 5 estrelas e um comentário. O feedback será analisado pelo administrador antes de aparecer na página inicial.
          </p>
          <div className="mt-8">
            <FeedbackForm />
          </div>
        </div>
      </div>
    </section>
  );
}

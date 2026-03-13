import { AboutSection } from "@/components/AboutSection";
import { ContactSection } from "@/components/ContactSection";
import { HeroSection } from "@/components/HeroSection";
import { ProductsGrid } from "@/components/ProductsGrid";
import { ServicesGrid } from "@/components/ServicesGrid";
import { Testimonials } from "@/components/Testimonials";
import { createSupabaseServerClient } from "@/lib/supabase-server";
import type { BannerRow, CategoryRow, ConfigRow, ProductRow, ServiceRow, TestimonialRow } from "@/types/site";

const HOME_CONFIG: ConfigRow = {
  id: 1,
  nome: "Vanessa Costa",
  email: "contato@vanessacosta.com.br",
  telefone_whatsapp: "(31) 99534-8118",
  endereco: "Rua X Numero 150 - Centro - Belo Horizonte/MG",
  logo: "logo.png",
  icone_site: "favicon.png",
  texto_rodape: "Atendimento premium com foco em experiencia, qualidade e pontualidade.",
  img_banner_index: "banner_site.jpg",
  texto_sobre: "Somos um espaco de beleza com atendimento humanizado e profissionais especializados.",
  imagem_sobre: "sobre-nos-vanessa.png",
  instagram: "https://www.instagram.com/portal_hugo_cursos/",
  mapa: "",
};

const HOME_BANNERS: BannerRow[] = [
  { id: 1, titulo: "Cortes Profissionais", descricao: "Equipe qualificada, agenda rapida e experiencia premium." },
  { id: 2, titulo: "Faca sua Barba", descricao: "Acabamento impecavel com tecnicas modernas." },
];

const HOME_TESTIMONIALS: TestimonialRow[] = [
  { id: 1, nome: "Hugo Vasconcelos", texto: "Excelente atendimento e ambiente impecavel.", foto: "14-06-2022-19-11-18-24-05-2022-20-46-30-eu.jpeg" },
  { id: 2, nome: "Paula Campos", texto: "Servico rapido, profissional e com otimo resultado.", foto: "12-10-2023-10-31-42-ARTE-PERFIL-WHATSAPP.jpg" },
  { id: 3, nome: "Marcos Silva", texto: "Minha barbearia de confianca.", foto: "14-06-2022-19-11-32-30-05-2022-13-19-34-08-03-2022-22-21-20-02-03-2022-09-59-04-Arthur.jpg" },
];

export default async function HomePage({
  searchParams,
}: {
  searchParams?: Promise<{ payment?: string }>;
}) {
  const params = searchParams ? await searchParams : undefined;
  const supabase = await createSupabaseServerClient();
  let services: ServiceRow[] = [];
  let categories: CategoryRow[] = [];
  let products: ProductRow[] = [];

  if (supabase) {
    const [servicesRes, categoriesRes, productsRes] = await Promise.all([
      supabase.from("servicos").select("id,nome,categoria,valor,foto,tempo").eq("ativo", "Sim").order("id", { ascending: true }),
      supabase.from("cat_servicos").select("id,nome").order("nome", { ascending: true }),
      supabase.from("produtos").select("id,nome,descricao,categoria,valor_venda,estoque,foto").order("id", { ascending: true }),
    ]);

    services = (servicesRes.data ?? []) as ServiceRow[];
    const allCategories = (categoriesRes.data ?? []) as CategoryRow[];
    products = (productsRes.data ?? []) as ProductRow[];

    const serviceCategoryIds = new Set(services.map((service) => Number(service.categoria)));
    categories = allCategories.filter((category) => serviceCategoryIds.has(Number(category.id)));
  }

  return (
    <>
      {params?.payment === "success" ? (
        <section className="bg-emerald-50 px-4 py-4 text-emerald-800">
          <div className="container-shell rounded-2xl border border-emerald-200 bg-emerald-100 px-4 py-3 text-sm font-semibold">
            Pagamento bem sucedido.
          </div>
        </section>
      ) : null}
      <HeroSection banners={HOME_BANNERS} config={HOME_CONFIG} />
      <ServicesGrid services={services} categories={categories} compact />
      <AboutSection config={HOME_CONFIG} />
      <ProductsGrid products={products} config={HOME_CONFIG} compact />
      <ContactSection config={HOME_CONFIG} />
      <Testimonials testimonials={HOME_TESTIMONIALS} />
    </>
  );
}

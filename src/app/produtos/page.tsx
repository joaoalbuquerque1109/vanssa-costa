import { PageHero } from "@/components/PageHero";
import { ProductsGrid } from "@/components/ProductsGrid";
import { createSupabaseServerClient } from "@/lib/supabase-server";
import type { ConfigRow, ProductRow } from "@/types/site";

const PRODUCTS_PAGE_CONFIG: ConfigRow = {
  id: 1,
  nome: "Vanessa Costa",
  email: "contato@vanessacosta.com.br",
  telefone_whatsapp: "(31) 99534-8118",
  endereco: "Rua X Numero 150 - Centro - Belo Horizonte/MG",
  logo: "logo.png",
  icone_site: "favicon.png",
  texto_rodape: "Atendimento premium com foco em experiencia, qualidade e pontualidade.",
  img_banner_index: "hero-bg.jpg",
};

export default async function ProdutosPage() {
  const supabase = await createSupabaseServerClient();
  let products: ProductRow[] = [];

  if (supabase) {
    const productsRes = await supabase.from("produtos").select("id,nome,descricao,categoria,valor_venda,estoque,foto").order("id", { ascending: true });
    products = (productsRes.data ?? []) as ProductRow[];
  }

  return (
    <>
      <PageHero title="Nossos Produtos" subtitle="Catalogo carregado diretamente do banco de dados." />
      <ProductsGrid products={products} config={PRODUCTS_PAGE_CONFIG} />
    </>
  );
}

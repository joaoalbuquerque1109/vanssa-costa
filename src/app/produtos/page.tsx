import { PageHero } from "@/components/PageHero";
import { ProductsGrid } from "@/components/ProductsGrid";
import { createSupabaseServerClient } from "@/lib/supabase-server";
import type { ConfigRow, ProductRow } from "@/types/site";

const PRODUCTS_PAGE_CONFIG: ConfigRow = {
  id: 1,
  nome: "Vanessa Costa",
  email: "vancostaracco@hotmail.com",
  telefone_whatsapp: "(83) 98751-6023",
  endereco: "Av. Gen. Edson Ramalho, 275 - Manaíra - João Pessoa/PB",
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
      <PageHero title="Nossos Produtos" subtitle="Cátalogo dos melhores produtos da região." />
      <ProductsGrid products={products} config={PRODUCTS_PAGE_CONFIG} />
    </>
  );
}

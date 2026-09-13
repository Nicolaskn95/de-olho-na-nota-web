import { ListaCompras } from "@/components/ListaCompras";

export const metadata = {
  title: "Lista de Compras | De Olho na Nota",
  description: "Gere sua lista de compras inteligente baseada no seu histórico de notas fiscais.",
};

export default function ListaComprasPage() {
  return <ListaCompras />;
}

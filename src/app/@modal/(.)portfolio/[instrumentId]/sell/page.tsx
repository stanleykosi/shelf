import { SellPage } from "@/components/route-pages";
import { TaskDialog } from "@/components/task-dialog";

export default async function SellDialog(props: Parameters<typeof SellPage>[0]) {
  // Holding ownership is checked by the same route function as a direct visit.
  const screen = await SellPage(props);
  return <TaskDialog task="sell">{screen}</TaskDialog>;
}

import { redirect } from "next/navigation";

/** Old Local Product admin → Home sections */
export default function LocalProductsRedirect() {
  redirect("/admin/home-sections");
}

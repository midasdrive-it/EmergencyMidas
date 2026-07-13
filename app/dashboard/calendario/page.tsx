import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { mondayOf, todayIsoDate, weekUtcRange } from "@/lib/dates";
import type { Appointment, ShopDetails, ShopOption } from "@/lib/types";
import CalendarView from "./CalendarView";

export const dynamic = "force-dynamic";

export default async function CalendarioPage({
  searchParams,
}: {
  searchParams: { shop?: string; week?: string };
}) {
  const supabase = await createClient();

  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) redirect("/login");

  const [{ data: isAdmin }, { data: myShopId }] = await Promise.all([
    supabase.rpc("is_admin"),
    supabase.rpc("get_customer_id"),
  ]);

  if (!isAdmin && !myShopId) {
    redirect("/access-denied");
  }

  let shops: ShopOption[] = [];
  if (isAdmin) {
    const { data } = await supabase
      .from("customers")
      .select('User_ID, User_Name, Town')
      .order("User_Name", { ascending: true });
    shops = data ?? [];
  }

  const activeShopId =
    (isAdmin ? searchParams.shop : null) || myShopId || shops[0]?.User_ID;

  let shopDetails: ShopDetails | null = null;
  if (activeShopId) {
    const { data } = await supabase
      .from("customers")
      .select('User_ID, User_Name, Legal_Name, Town, Address, Province')
      .eq("User_ID", activeShopId)
      .maybeSingle();
    shopDetails = data ?? null;
  }

  const mondayIso = mondayOf(searchParams.week || todayIsoDate());
  const { startUtc, endUtc } = weekUtcRange(mondayIso);

  let appointments: Appointment[] = [];
  if (activeShopId) {
    const { data } = await supabase
      .from("util_shop_appointments")
      .select(
        "date_appointment, type_rdv, type_vehicle, CONFIRMED, number_plate, customer_name, mobile_phone, shop_id"
      )
      .eq("shop_id", activeShopId)
      .gte("date_appointment", startUtc)
      .lt("date_appointment", endUtc)
      .order("date_appointment", { ascending: true });
    appointments = data ?? [];
  }

  return (
    <CalendarView
      isAdmin={Boolean(isAdmin)}
      shops={shops}
      activeShopId={activeShopId ?? null}
      shopDetails={shopDetails}
      mondayIso={mondayIso}
      appointments={appointments}
    />
  );
}

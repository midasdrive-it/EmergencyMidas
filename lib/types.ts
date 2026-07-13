export type Appointment = {
  date_appointment: string;
  type_rdv: string | null;
  type_vehicle: string | null;
  CONFIRMED: string | null;
  number_plate: string | null;
  customer_name: string | null;
  mobile_phone: number | null;
  shop_id: string | null;
};

export type ShopOption = {
  User_ID: string;
  User_Name: string | null;
  Town: string | null;
};

export type ShopDetails = {
  User_ID: string;
  User_Name: string | null;
  Legal_Name: string | null;
  Town: string | null;
  Address: string | null;
  Province: string | null;
};

export type ItemType = "forfait" | "ricambio" | "pneumatico";

export type Forfait = {
  code_reference: string;
  label_reference: string | null;
  price: number | null;
};

export type Tire = {
  reference: string;
  libelle: string | null;
  prix_vente: string | null;
};

export type QuoteRow = {
  quote_id: string;
  shop_id: string;
  vehicle_plate: string;
  item_type: ItemType;
  forfait_code: string;
  parent_forfait: string | null;
  quantity: number;
  unit_price: number;
  line_price: number;
  created_at: string;
};

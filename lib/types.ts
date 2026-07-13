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

export type Forfait = {
  code_reference: string;
  label_reference: string | null;
  price: number | null;
};

export type QuoteRow = {
  quote_id: string;
  shop_id: string;
  vehicle_plate: string;
  forfait_code: string;
  quantity: number;
  unit_price: number;
  line_price: number;
  created_at: string;
};

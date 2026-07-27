import { BASE_URL } from "./api";

export const bookBusTicket = async (payload: any) => {
  try {
    const res = await fetch(`${BASE_URL}/api/busBooking/bookBus`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(payload),
    });
    return await res.json();
  } catch (error) {
    console.error("Book Bus Error:", error);
    return null;
  }
};
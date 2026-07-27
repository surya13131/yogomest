import { BASE_URL } from "./api";

export const canCancelEzeeSeat = async (bookingId: string) => {
  try {
    const res = await fetch(`${BASE_URL}/api/bus/ezee/canCancelSeat/${bookingId}`);
    
    if (!res.ok) {
      console.error(`[Ezee Cancel Shield] Can Cancel API failed with status ${res.status}`);
      return null;
    }
    
    return await res.json();
  } catch (error) {
    console.error("Ezee Can Cancel Error:", error);
    return null;
  }
};

export const confirmCancelEzeeSeat = async (payload: { bookingId: string, cca: string | number, ctpc: string }) => {
  try {
    const res = await fetch(`${BASE_URL}/api/bus/ezee/confirmCancelSeat`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(payload),
    });
    
    if (!res.ok) {
      console.error(`[Ezee Cancel Shield] Confirm Cancel API failed with status ${res.status}`);
      return null;
    }
    
    return await res.json();
  } catch (error) {
    console.error("Ezee Confirm Cancel Error:", error);
    return null;
  }
};
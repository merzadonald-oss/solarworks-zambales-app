export function generateBOQNumber(
  counterDate: string | null,
  dailyCounter: number
): { boqNumber: string; newDate: string; newCounter: number } {
  const today = new Date();
  const yyyy = today.getFullYear();
  const mm = String(today.getMonth() + 1).padStart(2, "0");
  const dd = String(today.getDate()).padStart(2, "0");
  const todayStr = `${yyyy}${mm}${dd}`;

  let newCounter: number;
  if (counterDate === todayStr) {
    newCounter = dailyCounter + 1;
  } else {
    newCounter = 1;
  }

  const paddedCounter = String(newCounter).padStart(4, "0");
  const boqNumber = `${todayStr}${paddedCounter}`;

  return { boqNumber, newDate: todayStr, newCounter };
}

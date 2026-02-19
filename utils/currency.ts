
export const formatCurrency = (amount: number, currency: string) => {
  return new Intl.NumberFormat('ja-JP', {
    style: 'currency',
    currency: currency,
  }).format(amount);
};

export const convertToJPY = (amount: number, currency: string, rate: number = 100) => {
  if (currency === 'JPY') return amount;
  return Math.round(amount * rate);
};

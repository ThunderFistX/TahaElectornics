export const formatCurrency = (value) => {
  const amount = Number(value || 0);
  return `PKR ${amount.toLocaleString('en-PK', {
    minimumFractionDigits: 0,
    maximumFractionDigits: 2
  })}`;
};

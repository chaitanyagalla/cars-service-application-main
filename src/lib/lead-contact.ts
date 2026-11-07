export function leadContactNumber(phone: string) {
  let digits = phone.replace(/\D/g, '');
  if (digits.startsWith('00')) digits = digits.slice(2);
  if (digits.length === 11 && digits.startsWith('0')) digits = digits.slice(1);
  if (/^[1-9]\d{9}$/.test(digits)) return `91${digits}`;
  return /^[1-9]\d{10,14}$/.test(digits) ? digits : null;
}

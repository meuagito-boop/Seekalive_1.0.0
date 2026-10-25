export function maskEmail(email: string): string {
  const [localPart, domain] = email.split("@");
  if (!localPart || !domain) return "e-mail cadastrado";
  const visible = localPart.length > 2 ? `${localPart.slice(0, 2)}***` : `${localPart[0] ?? "*"}***`;
  return `${visible}@${domain}`;
}

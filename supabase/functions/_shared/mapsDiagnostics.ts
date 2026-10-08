// Only these codes may leave the browser. Never send keys, URLs or driver data.
export const MAP_ERROR_MESSAGES = {
  MissingKeyMapError: 'Kartnyckeln saknas. Kontakta supporten för att aktivera Google Maps.',
  InvalidKeyMapError: 'Kartnyckeln fungerar inte. Kontakta supporten.',
  ExpiredKeyMapError: 'Kartnyckeln har gått ut. Kontakta supporten.',
  RefererNotAllowedMapError: 'Google Maps tillåter inte den här webbplatsens adress. Kontakta supporten.',
  ApiNotActivatedMapError: 'Google Maps är inte aktiverat för kartnyckeln. Kontakta supporten.',
  ApiTargetBlockedMapError: 'Kartnyckeln saknar behörighet till Google Maps. Kontakta supporten.',
  BillingNotEnabledMapError: 'Faktureringen för Google Maps är inte aktiverad. Kontakta supporten.',
  ClientBillingNotEnabledMapError: 'Faktureringen för Google Maps är inte aktiverad. Kontakta supporten.',
  OverQuotaMapError: 'Gränsen för Google Maps har nåtts. Försök igen senare.',
  MapsAuthenticationError: 'Google Maps godkände inte kartnyckeln. Nyckel, webbplatsbehörighet och fakturering behöver kontrolleras.',
  MapsLoadError: 'Kartan kunde inte laddas. Kontrollera anslutningen och försök igen.',
  MapsLoadTimeout: 'Google Maps svarade inte i tid. Kontrollera anslutningen och försök igen.',
} as const;

export type MapErrorCode = keyof typeof MAP_ERROR_MESSAGES;
export function isMapErrorCode(value: unknown): value is MapErrorCode {
  return typeof value === 'string' && Object.hasOwn(MAP_ERROR_MESSAGES, value);
}

import type { Owner, Property, Tenant } from "./types";

export const PROPERTY_TYPES = [
  "Departamento",
  "Casa",
  "PH",
  "Local comercial",
  "Oficina",
  "Cochera",
  "Terreno / Lote",
  "Otro",
] as const;

export const PROVINCES = [
  "Buenos Aires",
  "Ciudad Autónoma de Buenos Aires",
  "Catamarca",
  "Chaco",
  "Chubut",
  "Córdoba",
  "Corrientes",
  "Entre Ríos",
  "Formosa",
  "Jujuy",
  "La Pampa",
  "La Rioja",
  "Mendoza",
  "Misiones",
  "Neuquén",
  "Río Negro",
  "Salta",
  "San Juan",
  "San Luis",
  "Santa Cruz",
  "Santa Fe",
  "Santiago del Estero",
  "Tierra del Fuego",
  "Tucumán",
] as const;

export interface AddressSuggestion {
  id: string;
  label: string;
  city: string;
  province: string;
  postalCode: string;
}

// Simula resultados de un proveedor de geocodificación (Google Places / Mapbox).
// Reemplazar por una integración real cuando haya API key disponible: la forma
// de AddressSuggestion ya coincide con lo que necesita el resto del formulario.
export const MOCK_ADDRESS_SUGGESTIONS: AddressSuggestion[] = [
  { id: "addr-1", label: "Av. Rivadavia 2340, 5.º A", city: "CABA", province: "Ciudad Autónoma de Buenos Aires", postalCode: "C1033" },
  { id: "addr-2", label: "Lavalle 950, 3.º B", city: "CABA", province: "Ciudad Autónoma de Buenos Aires", postalCode: "C1047" },
  { id: "addr-3", label: "Belgrano 445, PB", city: "Morón", province: "Buenos Aires", postalCode: "B1708" },
  { id: "addr-4", label: "Güemes 1120, 2.º C", city: "CABA", province: "Ciudad Autónoma de Buenos Aires", postalCode: "C1425" },
  { id: "addr-5", label: "Mitre 78, local", city: "San Isidro", province: "Buenos Aires", postalCode: "B1642" },
  { id: "addr-6", label: "San Martín 1560", city: "Córdoba", province: "Córdoba", postalCode: "X5000" },
  { id: "addr-7", label: "Sarmiento 2210, 4.º D", city: "Rosario", province: "Santa Fe", postalCode: "S2000" },
  { id: "addr-8", label: "Av. Colón 890", city: "Córdoba", province: "Córdoba", postalCode: "X5001" },
  { id: "addr-9", label: "Rivadavia 3300, 1.º A", city: "Mar del Plata", province: "Buenos Aires", postalCode: "B7600" },
  { id: "addr-10", label: "Alem 480, 6.º B", city: "Mendoza", province: "Mendoza", postalCode: "M5500" },
];

// Directorio de propietarios: cada uno existe una sola vez y se referencia
// desde los inmuebles que le correspondan (ver Property.owners). Evita
// retipear/desincronizar sus datos de contacto en cada alta de inmueble.
export const MOCK_OWNERS: Owner[] = [
  { id: "own-1", name: "Silvina Roldán", email: "silvina.roldan@ejemplo.com", phone: "11 4455-2210" },
  { id: "own-2", name: "Héctor Bruno", email: "hbruno@ejemplo.com", phone: "11 5566-3321" },
  { id: "own-3", name: "Marina Bruno", email: "marina.bruno@ejemplo.com", phone: "11 5566-3322" },
  { id: "own-4", name: "Marta Sosa", email: "marta.sosa@ejemplo.com", phone: "11 3344-7788" },
];

const [OWNER_SILVINA, OWNER_HECTOR, OWNER_MARINA, OWNER_MARTA] = MOCK_OWNERS;

export const MOCK_PROPERTIES: Property[] = [
  {
    id: "prop-1",
    address: "Av. Rivadavia 2340, 5.º A",
    city: "CABA",
    province: "Ciudad Autónoma de Buenos Aires",
    postalCode: "C1033",
    propertyType: "Departamento",
    owners: [{ owner: OWNER_SILVINA, ownershipPercent: "100" }],
  },
  {
    id: "prop-2",
    address: "Lavalle 950, 3.º B",
    city: "CABA",
    province: "Ciudad Autónoma de Buenos Aires",
    postalCode: "C1047",
    propertyType: "Departamento",
    owners: [
      { owner: OWNER_HECTOR, ownershipPercent: "60" },
      { owner: OWNER_MARINA, ownershipPercent: "40" },
    ],
  },
  {
    id: "prop-3",
    address: "Belgrano 445, PB",
    city: "Morón",
    province: "Buenos Aires",
    postalCode: "B1708",
    propertyType: "Casa",
    // Marta Sosa vuelve a aparecer en prop-4: mismo registro de directorio,
    // dos inmuebles — el caso que motivó separar Owner de Property.
    owners: [{ owner: OWNER_MARTA, ownershipPercent: "100" }],
  },
  {
    id: "prop-4",
    address: "Mitre 78, local",
    city: "San Isidro",
    province: "Buenos Aires",
    postalCode: "B1642",
    propertyType: "Local comercial",
    owners: [{ owner: OWNER_MARTA, ownershipPercent: "100" }],
  },
];

export const MOCK_TENANTS: Tenant[] = [
  { id: "ten-1", name: "Jorge Paletta", email: "jorge.paletta@ejemplo.com", phone: "11 6677-1122", isGuarantor: false },
  { id: "ten-2", name: "Luis Medina", email: "luis.medina@ejemplo.com", phone: "11 4433-8899", isGuarantor: false },
  { id: "ten-3", name: "Marta Suárez", email: "marta.suarez@ejemplo.com", phone: "11 7788-0011", isGuarantor: false },
  { id: "ten-4", name: "Ricardo Gómez", email: "ricardo.gomez@ejemplo.com", phone: "11 5555-8877", isGuarantor: false },
];

export const DEPOSIT_TYPES = [
  "Depósito en efectivo",
  "Seguro de caución",
  "Garantía propietaria",
  "Aval bancario",
  "Otro",
] as const;


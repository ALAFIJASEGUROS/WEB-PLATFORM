import type { Answers, QuoteRequest } from "@/domain/types";
import { MOCK_INSURERS } from "./mock/insurers";
import { describeAdapterContract } from "./contract.suite";

const answers: Answers = {
  priority: "equilibrio",
  use: "particular",
  parking: "cerrado",
  mileage: "medio",
  drivers: "solo",
  financed: false,
  deductibleTolerance: "medio",
  services: [],
  claimsLast3Years: 0,
};

const auto: QuoteRequest = {
  vehicle: { type: "auto", plate: "ABC123", brand: "Mazda", model: "Mazda 2", year: 2022, commercialValue: 70_000_000 },
  driver: { birthdate: "1990-05-10", city: "Medellín" },
  answers,
};
const moto: QuoteRequest = {
  vehicle: { type: "moto", plate: "ABC12D", brand: "Yamaha", model: "NMAX 155", year: 2023, commercialValue: 13_000_000, engineCc: 155 },
  driver: { birthdate: "1995-03-03", city: "Cali" },
  answers,
};

describeAdapterContract(MOCK_INSURERS[0], {
  requests: { auto, moto },
  quoteFailPlate: "ERR123",
  rejectPlate: "REC123",
  pendingPlate: "PEN123",
});
describeAdapterContract(MOCK_INSURERS[1], {
  requests: { auto, moto },
  rejectPlate: "REC123",
  pendingPlate: "PEN123",
});

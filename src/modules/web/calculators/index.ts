// Public calculator components (client). Import from "@/modules/web/calculators".
//
//   <StampDutyCalculator defaultState="NSW" defaultPrice={750000} compact />   // + defaultFirstHomeBuyer, defaultResidency="foreign", lockState
//   <BorrowingCalculator assumptions={savedAssumptions} defaultState="NSW" />
//   <RepaymentsCalculator defaultAmount={600000} />
//   <RefinanceCalculator />
//   <NprConverter defaultMode="currency" />
//
// Every calculator: the user enters their own interest rate (never a default), results card with a
// "Talk this through" CTA to /book-appointment and an assumptions disclosure linking /legal/important-information.
// Pages still add <Disclaimer variant="calculator" /> and webAppJsonLd.
export { StampDutyCalculator, STATE_NAMES, type StampDutyCalculatorProps, type Residency } from "./StampDutyCalculator";
export { BorrowingCalculator, type BorrowingCalculatorProps } from "./BorrowingCalculator";
export { RepaymentsCalculator, type RepaymentsCalculatorProps } from "./RepaymentsCalculator";
export { RefinanceCalculator, type RefinanceCalculatorProps } from "./RefinanceCalculator";
export { NprConverter, type NprConverterProps } from "./NprConverter";

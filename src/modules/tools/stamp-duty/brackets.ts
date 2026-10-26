// Stamp duty + government fee brackets — exact port of the WPCode snippets used by the
// original Mustang Mortgage stamp duty calculator (nswstamp, qldstamp-js, vicstamp-js,
// actstamp-js, ntstamp-js, sastamp-js, tasstamp-js, wastamp-js; posts 2460–2488).
// Logic (including its quirks) is intentionally unchanged so results match the old tool.

export type AuState = "NSW" | "QLD" | "VIC" | "ACT" | "NT" | "SA" | "TAS" | "WA";
export const STATES: AuState[] = ["NSW", "QLD", "VIC", "ACT", "NT", "SA", "TAS", "WA"];

export type PropertyType = "Principal Place of Residence" | "Investment";
export type PurchaseType = "Established Home" | "New Home";

export type StampResult = {
  stampDuty: number;
  mortgageRegistrationFee: number;
  transferFee: number;
  firstHomeGrant: number;
  newHomeGrant: number;
};

type Calc = (v: number, firstHomeBuyer: boolean, foreignPurchaser: boolean, propertyType: string) => StampResult;

const NSW: Calc = (propertyValue, firstHomeBuyer, foreignPurchaser, propertyType) => {
  const mortgageRegistrationFee = 171.7;
  const transferFee = 171.7;
  let stampDuty = 0;
  if (propertyValue <= 17000) stampDuty = propertyValue * 0.0125;
  else if (propertyValue <= 36000) stampDuty = 212 + (propertyValue - 17000) * 0.015;
  else if (propertyValue <= 97000) stampDuty = 497 + (propertyValue - 36000) * 0.0175;
  else if (propertyValue <= 364000) stampDuty = 1564 + (propertyValue - 97000) * 0.035;
  else if (propertyValue <= 1212000) stampDuty = 10909 + (propertyValue - 364000) * 0.045;
  else if (propertyValue <= 3636000) stampDuty = 49069 + (propertyValue - 1212000) * 0.055;
  else stampDuty = 182389 + (propertyValue - 3636000) * 0.07;

  if (firstHomeBuyer && propertyType === "Principal Place of Residence") {
    if (propertyValue <= 800000) stampDuty = 0;
    else if (propertyValue <= 1000000) stampDuty = (stampDuty * (propertyValue - 800000)) / 200000;
  }
  if (foreignPurchaser) stampDuty += propertyValue * 0.08;
  return { stampDuty, mortgageRegistrationFee, transferFee, firstHomeGrant: 0, newHomeGrant: 0 };
};

const QLD: Calc = (propertyValue, firstHomeBuyer, foreignPurchaser, propertyType) => {
  const mortgageRegistrationFee = 231.98;
  const transferFeeBase = 231.98;
  const additionalTransferFee = propertyValue > 180000 ? Math.ceil((propertyValue - 180000) / 10000) * 43.56 : 0;
  const transferFee = transferFeeBase + additionalTransferFee;
  let stampDuty = 0;
  if (propertyType === "Investment") {
    if (propertyValue <= 5000) stampDuty = 0;
    else if (propertyValue <= 75000) stampDuty = ((propertyValue - 5000) / 100) * 1.5;
    else if (propertyValue <= 540000) stampDuty = 1050 + ((propertyValue - 75000) / 100) * 3.5;
    else if (propertyValue <= 1000000) stampDuty = 17325 + ((propertyValue - 540000) / 100) * 4.5;
    else stampDuty = 38025 + ((propertyValue - 1000000) / 100) * 5.75;
  } else {
    if (propertyValue <= 350000) stampDuty = (propertyValue / 100) * 1.0;
    else if (propertyValue <= 540000) stampDuty = 3500 + ((propertyValue - 350000) / 100) * 3.5;
    else if (propertyValue <= 1000000) stampDuty = 10150 + ((propertyValue - 540000) / 100) * 4.5;
    else stampDuty = 30850 + ((propertyValue - 1000000) / 100) * 5.75;
  }
  if (firstHomeBuyer) {
    if (propertyValue <= 709999.99) stampDuty = 17350;
    else if (propertyValue <= 719999.99) stampDuty = 15615;
    else if (propertyValue <= 729999.99) stampDuty = 13880;
    else if (propertyValue <= 739999.99) stampDuty = 12145;
    else if (propertyValue <= 749999.99) stampDuty = 10410;
    else if (propertyValue <= 759999.99) stampDuty = 8675;
    else if (propertyValue <= 769999.99) stampDuty = 6940;
    else if (propertyValue <= 779999.99) stampDuty = 5205;
    else if (propertyValue <= 789999.99) stampDuty = 3470;
    else if (propertyValue <= 799999.99) stampDuty = 1735;
    else stampDuty = 0;
  }
  if (foreignPurchaser) stampDuty += propertyValue * 0.08;
  return { stampDuty, mortgageRegistrationFee, transferFee, firstHomeGrant: firstHomeBuyer ? 30000 : 0, newHomeGrant: 0 };
};

const VIC: Calc = (propertyValue, firstHomeBuyer, foreignPurchaser, propertyType) => {
  const mortgageRegistrationFee = 122.1;
  const transferFee = 98.6 + Math.min((propertyValue / 1000) * 2.34, 3609.0);
  let stampDuty = 0;
  if (propertyType === "Principal Place of Residence") {
    if (propertyValue <= 130000) stampDuty = propertyValue * 0.014;
    else if (propertyValue <= 440000) stampDuty = 2870 + (propertyValue - 130000) * 0.05;
    else if (propertyValue <= 550000) stampDuty = 18370 + (propertyValue - 440000) * 0.06;
    else stampDuty = propertyValue * 0.055;
  } else {
    if (propertyValue <= 25000) stampDuty = propertyValue * 0.014;
    else if (propertyValue <= 130000) stampDuty = 350 + (propertyValue - 25000) * 0.024;
    else if (propertyValue <= 960000) stampDuty = 2870 + (propertyValue - 130000) * 0.06;
    else if (propertyValue <= 2000000) stampDuty = propertyValue * 0.055;
    else stampDuty = 110000 + (propertyValue - 2000000) * 0.065;
  }
  if (firstHomeBuyer && propertyValue <= 600000) stampDuty = 0;
  else if (firstHomeBuyer && propertyValue <= 750000) stampDuty *= (750000 - propertyValue) / 150000;
  if (foreignPurchaser) stampDuty += propertyValue * 0.08;
  return { stampDuty, mortgageRegistrationFee, transferFee, firstHomeGrant: firstHomeBuyer && propertyValue <= 750000 ? 10000 : 0, newHomeGrant: 0 };
};

const ACT: Calc = (propertyValue, firstHomeBuyer, foreignPurchaser, propertyType) => {
  const mortgageRegistrationFee = 172.0;
  const transferFee = 463.0;
  let stampDuty = 0;
  if (propertyType === "Principal Place of Residence" || propertyType === "Owner Occupier") {
    if (propertyValue <= 260000) stampDuty = propertyValue * 0.004;
    else if (propertyValue <= 300000) stampDuty = 1040 + (propertyValue - 260000) * 0.022;
    else if (propertyValue <= 500000) stampDuty = 1920 + (propertyValue - 300000) * 0.034;
    else if (propertyValue <= 750000) stampDuty = 8720 + (propertyValue - 500000) * 0.0432;
    else if (propertyValue <= 1000000) stampDuty = 19520 + (propertyValue - 750000) * 0.059;
    else if (propertyValue <= 1455000) stampDuty = 34270 + (propertyValue - 1000000) * 0.064;
    else stampDuty = propertyValue * 0.0454;
  } else {
    if (propertyValue <= 200000) stampDuty = propertyValue * 0.012;
    else if (propertyValue <= 300000) stampDuty = 2400 + (propertyValue - 200000) * 0.022;
    else if (propertyValue <= 500000) stampDuty = 4600 + (propertyValue - 300000) * 0.034;
    else if (propertyValue <= 750000) stampDuty = 11400 + (propertyValue - 500000) * 0.0432;
    else if (propertyValue <= 1000000) stampDuty = 22200 + (propertyValue - 750000) * 0.059;
    else if (propertyValue <= 1455000) stampDuty = 36950 + (propertyValue - 1000000) * 0.064;
    else stampDuty = propertyValue * 0.0454;
  }
  if (firstHomeBuyer && propertyValue <= 1000000) stampDuty = 0;
  else if (firstHomeBuyer && propertyValue <= 1455000) stampDuty = (propertyValue - 1000000) * 0.06;
  else if (firstHomeBuyer && propertyValue > 1455000) stampDuty = propertyValue * 0.064 - 34270;
  if (foreignPurchaser) stampDuty += propertyValue * 0.08;
  return { stampDuty, mortgageRegistrationFee, transferFee, firstHomeGrant: 0, newHomeGrant: 0 };
};

const NT: Calc = (propertyValue, firstHomeBuyer, foreignPurchaser) => {
  const mortgageRegistrationFee = 172.0;
  const transferFee = 172.0;
  let stampDuty = 0;
  if (propertyValue <= 525000) stampDuty = 0.06571441 * Math.pow(propertyValue / 1000, 2) + 15 * (propertyValue / 1000);
  else if (propertyValue < 3000000) stampDuty = propertyValue * 0.0495;
  else if (propertyValue < 5000000) stampDuty = propertyValue * 0.0575;
  else stampDuty = propertyValue * 0.0595;
  if (firstHomeBuyer) stampDuty -= 10000;
  if (foreignPurchaser) stampDuty += propertyValue * 0.08;
  return { stampDuty, mortgageRegistrationFee, transferFee, firstHomeGrant: firstHomeBuyer ? 10000 : 0, newHomeGrant: 0 };
};

const SA: Calc = (propertyValue, firstHomeBuyer, foreignPurchaser) => {
  const mortgageRegistrationFee = 192.0;
  const transferFee =
    propertyValue <= 5000
      ? 192.0
      : propertyValue <= 20000
        ? 215.0
        : propertyValue <= 40000
          ? 236.0
          : propertyValue <= 50000
            ? 332.0
            : 332.0 + Math.ceil((propertyValue - 50000) / 10000) * 99.0;
  let stampDuty = 0;
  if (propertyValue <= 12000) stampDuty = propertyValue * 0.01;
  else if (propertyValue <= 30000) stampDuty = 120 + (propertyValue - 12000) * 0.02;
  else if (propertyValue <= 50000) stampDuty = 480 + (propertyValue - 30000) * 0.03;
  else if (propertyValue <= 100000) stampDuty = 1080 + (propertyValue - 50000) * 0.035;
  else if (propertyValue <= 200000) stampDuty = 2830 + (propertyValue - 100000) * 0.04;
  else if (propertyValue <= 250000) stampDuty = 6830 + (propertyValue - 200000) * 0.0425;
  else if (propertyValue <= 300000) stampDuty = 8955 + (propertyValue - 250000) * 0.0475;
  else if (propertyValue <= 500000) stampDuty = 11330 + (propertyValue - 300000) * 0.05;
  else stampDuty = 21330 + (propertyValue - 500000) * 0.055;
  if (firstHomeBuyer) stampDuty = 0;
  if (foreignPurchaser) stampDuty += propertyValue * 0.07;
  return { stampDuty, mortgageRegistrationFee, transferFee, firstHomeGrant: firstHomeBuyer ? 15000 : 0, newHomeGrant: 0 };
};

const TAS: Calc = (propertyValue, firstHomeBuyer, foreignPurchaser) => {
  const mortgageRegistrationFee = 159.88;
  const transferFee = 244.97;
  let stampDuty = 0;
  if (propertyValue <= 3000) stampDuty = 50;
  else if (propertyValue <= 25000) stampDuty = 50 + ((propertyValue - 3000) / 100) * 1.75;
  else if (propertyValue <= 75000) stampDuty = 435 + ((propertyValue - 25000) / 100) * 2.25;
  else if (propertyValue <= 200000) stampDuty = 1560 + ((propertyValue - 75000) / 100) * 3.5;
  else if (propertyValue <= 375000) stampDuty = 5935 + ((propertyValue - 200000) / 100) * 4.0;
  else if (propertyValue <= 725000) stampDuty = 12935 + ((propertyValue - 375000) / 100) * 4.25;
  else stampDuty = 27810 + ((propertyValue - 725000) / 100) * 4.5;
  if (firstHomeBuyer && propertyValue <= 750000) stampDuty = 0;
  if (foreignPurchaser) stampDuty += propertyValue * 0.08;
  return { stampDuty, mortgageRegistrationFee, transferFee, firstHomeGrant: firstHomeBuyer ? 10000 : 0, newHomeGrant: 0 };
};

const WA: Calc = (propertyValue, firstHomeBuyer, foreignPurchaser, propertyType) => {
  const mortgageRegistrationFee = 210.3;
  let transferFee = 0;
  if (propertyValue <= 85000) transferFee = 210.3;
  else if (propertyValue <= 120000) transferFee = 220.3;
  else if (propertyValue <= 200000) transferFee = 240.3;
  else if (propertyValue <= 300000) transferFee = 260.3;
  else if (propertyValue <= 400000) transferFee = 280.3;
  else if (propertyValue <= 500000) transferFee = 300.3;
  else if (propertyValue <= 600000) transferFee = 320.3;
  else if (propertyValue <= 700000) transferFee = 340.3;
  else if (propertyValue <= 800000) transferFee = 360.3;
  else if (propertyValue <= 900000) transferFee = 380.3;
  else if (propertyValue <= 1000000) transferFee = 400.3;
  else transferFee = 600.3 + Math.ceil((propertyValue - 2000000) / 100000) * 20;

  let stampDuty = 0;
  if (propertyValue <= 120000) stampDuty = (propertyValue / 100) * 1.9;
  else if (propertyValue <= 150000) stampDuty = 2280 + ((propertyValue - 120000) / 100) * 2.85;
  else if (propertyValue <= 360000) stampDuty = 3135 + ((propertyValue - 150000) / 100) * 3.8;
  else if (propertyValue <= 725000) stampDuty = 11115 + ((propertyValue - 360000) / 100) * 4.75;
  else stampDuty = 28453 + ((propertyValue - 725000) / 100) * 5.15;

  if (propertyType === "Principal Place of Residence" && propertyValue <= 200000) {
    if (propertyValue <= 120000) stampDuty = (propertyValue / 100) * 1.5;
    else stampDuty = 1800 + ((propertyValue - 120000) / 100) * 4.04;
  }
  // First home owner rate — compares propertyType with purchase types exactly like the original.
  if (firstHomeBuyer) {
    if (propertyType === "Established Home" && propertyValue <= 450000) stampDuty = 0;
    else if (propertyType === "Established Home" && propertyValue <= 600000) stampDuty = ((propertyValue - 450000) / 100) * 15.01;
    else if (propertyType === "Vacant Land" && propertyValue <= 300000) stampDuty = 0;
    else if (propertyType === "Vacant Land" && propertyValue <= 400000) stampDuty = ((propertyValue - 300000) / 100) * 13.01;
  }
  if (foreignPurchaser) stampDuty += propertyValue * 0.07;
  return { stampDuty, mortgageRegistrationFee, transferFee, firstHomeGrant: firstHomeBuyer ? 10000 : 0, newHomeGrant: 0 };
};

const CALCS: Record<AuState, Calc> = { NSW, QLD, VIC, ACT, NT, SA, TAS, WA };

export function calculateStampDuty(
  state: AuState,
  propertyValue: number,
  firstHomeBuyer: boolean,
  foreignPurchaser: boolean,
  propertyType: PropertyType,
) {
  const r = CALCS[state](propertyValue, firstHomeBuyer, foreignPurchaser, propertyType);
  return { ...r, totalFees: r.mortgageRegistrationFee + r.transferFee + r.stampDuty };
}

export const formatCurrency = (value: number) => new Intl.NumberFormat("en-AU", { style: "currency", currency: "AUD" }).format(value);

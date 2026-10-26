import { Fact } from "../ui/Fact";

/**
 * ASIC-format licence statement, written in full (never "ACL 12345" alone):
 * "{representative} is a Credit Representative (number {CR}) of {licensee}, Australian Credit Licence {ACL}."
 * Unknown values render as placeholder tokens until supplied in config.ts.
 */
export function LicenceStatement({ withAbn = true, as: Tag = "p", className }: { withAbn?: boolean; as?: "p" | "span" | "div"; className?: string }) {
  return (
    <Tag className={className}>
      <Fact path="licence.representativeName" /> is a Credit Representative (Credit Representative number <Fact path="licence.creditRepresentativeNumber" />) of{" "}
      <Fact path="licence.licenseeName" />, Australian Credit Licence <Fact path="licence.licenseeAcl" />.
      {withAbn && (
        <>
          {" "}
          Mustang Mortgage is a trading name of <Fact path="legal.entityName" />, ABN <Fact path="legal.abn" />.
        </>
      )}
    </Tag>
  );
}

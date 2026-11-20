import { Fact } from "../ui/Fact";
import { factValue, licenceComplete } from "../../config";

/**
 * ASIC-format licence statement, written in full. Renders nothing until the licence details are
 * filled in under SITE.licence in config.ts, so no placeholder text ever shows on the public site.
 */
export function LicenceStatement({ withAbn = true, as: Tag = "p", className }: { withAbn?: boolean; as?: "p" | "span" | "div"; className?: string }) {
  if (!licenceComplete()) return null;
  return (
    <Tag className={className}>
      <Fact path="licence.representativeName" /> is a Credit Representative (Credit Representative number <Fact path="licence.creditRepresentativeNumber" />) of{" "}
      <Fact path="licence.licenseeName" />, Australian Credit Licence <Fact path="licence.licenseeAcl" />.
      {withAbn && factValue("legal.entityName") && factValue("legal.abn") && (
        <>
          {" "}
          Mustang Mortgage is a trading name of <Fact path="legal.entityName" />, ABN <Fact path="legal.abn" />.
        </>
      )}
    </Tag>
  );
}

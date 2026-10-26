import Cf7FormClient from "./Cf7FormClient";
import { getCf7ClientProps } from "./registry";

/**
 * Server component rendering a Contact Form 7 replica, e.g. `<Cf7Form formId={2651} />`.
 * Submissions POST to /api/forms/<formId> (validation, uploads, signature, mail 1/2,
 * stored as FormSubmission). Renders nothing for unknown ids.
 */
export default async function Cf7Form({ formId }: { formId: number }) {
  const props = await getCf7ClientProps(formId);
  if (!props) return null;
  return <Cf7FormClient {...props} />;
}

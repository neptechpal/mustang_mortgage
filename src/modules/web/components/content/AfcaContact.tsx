import { Fact } from "../ui/Fact";

/** AFCA (external dispute resolution) contact details, for complaints, hardship and the Credit Guide. */
export function AfcaContact() {
  return (
    <dl>
      <div>
        <dt>Australian Financial Complaints Authority (AFCA)</dt>
        <dd>
          Website{" "}
          <a href="https://www.afca.org.au/" target="_blank" rel="noopener noreferrer">
            www.afca.org.au
          </a>
          <br />
          Email <a href="mailto:info@afca.org.au">info@afca.org.au</a>
          <br />
          Phone <a href="tel:1800931678">1800 931 678</a> (free call)
          <br />
          Mail: Australian Financial Complaints Authority, GPO Box 3, Melbourne VIC 3001
          <br />
          Our AFCA member number: <Fact path="licence.afcaMemberNumber" />
        </dd>
      </div>
    </dl>
  );
}

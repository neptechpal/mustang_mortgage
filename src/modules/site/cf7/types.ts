export type Cf7Mail = {
  active: boolean;
  subject: string;
  sender: string;
  recipient: string;
  body: string;
  additional_headers: string;
  attachments: string;
  use_html: boolean;
  exclude_blank: boolean;
};

/** Contact Form 7 form, exported 1:1 from the WordPress post meta. */
export type Cf7Definition = {
  id: number;
  title: string;
  hash: string;
  locale: string;
  /** raw `_form` template with [form-tags] */
  template: string;
  /** template after CF7's own wpcf7_autop() (generated at build time with PHP) */
  html: string;
  mail: Cf7Mail;
  mail2: Cf7Mail;
  messages: Record<string, string>;
  additionalSettings: string;
};

export type Cf7Tag = {
  raw: string;
  type: string; // e.g. "text*"
  basetype: string; // e.g. "text"
  required: boolean;
  name: string;
  options: string[];
  values: string[];
};

/** Props handed from the server wrapper to the client form component. */
export type Cf7ClientProps = {
  formId: number;
  title: string;
  hash: string;
  /** rendered inner form markup (fields, hp field, response output) */
  bodyHtml: string;
  /** inline <script> blocks of the template (run after mount) */
  scripts: string[];
  messages: Pick<Record<string, string>, string>;
};

export type Cf7Response = {
  status: "mail_sent" | "mail_failed" | "validation_failed" | "spam" | "aborted";
  message: string;
  invalid_fields?: { field: string; message: string }[];
  submissionId?: number;
};

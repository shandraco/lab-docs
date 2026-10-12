import type { TemplateDefinition } from "@/lib/doc/types";

/**
 * A first email to one named person at a business. Follows CAN-SPAM for commercial email
 * (Brain: marketing-consent-email-sms-and-whatsapp): honest subject, the sender's postal
 * address, and a working way to opt out. One-to-one B2B email; bulk sends, purchased lists,
 * and recipients in Canada or the EU need different rules and a lawyer.
 */
export const outreachEmail: TemplateDefinition = {
  kind: "outreach_email",
  format: "email",
  heading: "Email to {{client.contact_name}}",
  subject: "{{subject}}",
  sections: [
    {
      title: "The email",
      fields: [
        { key: "subject", label: "Subject line", type: "text", hint: "Say plainly what the email is about. Misleading subjects are against the law." },
        { key: "first_name", label: "Their first name", type: "text" },
        { key: "why_them", label: "Why you are writing to them", type: "longtext", hint: "Something specific to their business, in one or two sentences." },
        { key: "offer", label: "What you could do for them", type: "longtext" },
        { key: "proof", label: "A similar result you have delivered", type: "longtext", optional: true, hint: "Optional. Only real results you can name." },
        {
          key: "ask",
          label: "What you are asking for",
          type: "choice",
          default: "call",
          options: [
            { value: "call", label: "A 20-minute call" },
            { value: "reply", label: "A reply to say if it is of interest" },
          ],
        },
      ],
    },
  ],
  blocks: [
    { t: "p", text: "Hi {{first_name}}," },
    { t: "p", text: "{{why_them}}" },
    { t: "p", text: "{{offer}}" },
    { t: "p", when: { field: "proof" }, text: "{{proof}}" },
    { t: "p", when: { field: "ask", equals: "call" }, text: "Would you be open to a 20-minute call in the next couple of weeks? I'm happy to work around your schedule." },
    { t: "p", when: { field: "ask", equals: "reply" }, text: "If this is of interest, just reply and I'll send over a few ideas. If not, no problem at all." },
    { t: "p", text: "Thanks,\n{{sender.name}}\n{{lab.name}}\n{{lab.website}}" },
    {
      t: "note",
      text: "{{lab.legal_name|lab.name}}, {{lab.address}}. If you would rather not hear from us again, reply “no thanks” and we will not write again.",
    },
  ],
};

/** A one-page capability statement, tailored to the organisation it is sent to. */
export const capability: TemplateDefinition = {
  kind: "capability",
  format: "document",
  heading: "Capability statement",
  sections: [
    {
      title: "About the lab",
      fields: [
        { key: "overview", label: "Who you are, in two or three sentences", type: "longtext" },
        { key: "capabilities", label: "What you do", type: "lines", hint: "One service per line." },
        { key: "differentiators", label: "Why choose you", type: "lines", hint: "One per line. Specific beats impressive." },
      ],
    },
    {
      title: "Proof",
      fields: [
        {
          key: "past_work",
          label: "Past work",
          type: "rows",
          hint: "Only work you can name and the client would confirm.",
          columns: [
            { key: "project", label: "Client and project", type: "text" },
            { key: "result", label: "Result", type: "text" },
          ],
        },
      ],
    },
    {
      title: "Company data",
      hint: "Optional. Government buyers look for these.",
      fields: [
        { key: "uei", label: "UEI number", type: "text", optional: true },
        { key: "cage", label: "CAGE code", type: "text", optional: true },
        { key: "naics", label: "NAICS codes", type: "text", optional: true },
      ],
    },
  ],
  blocks: [
    { t: "p", text: "Prepared for {{client.name}} by {{lab.name}}." },
    { t: "h", text: "Overview" },
    { t: "p", text: "{{overview}}" },
    { t: "h", text: "Core capabilities" },
    { t: "lines", field: "capabilities" },
    { t: "h", text: "Past performance" },
    { t: "rows", field: "past_work" },
    { t: "h", text: "What sets us apart" },
    { t: "lines", field: "differentiators" },
    { t: "h", text: "Company data" },
    { t: "p", when: { field: "uei" }, text: "**UEI:** {{uei}}" },
    { t: "p", when: { field: "cage" }, text: "**CAGE code:** {{cage}}" },
    { t: "p", when: { field: "naics" }, text: "**NAICS:** {{naics}}" },
    { t: "p", text: "**Contact:** {{lab.signer_name}}, {{lab.signer_title}}. {{lab.email}}, {{lab.phone}}. {{lab.website}}" },
    { t: "p", text: "{{lab.address}}" },
  ],
};

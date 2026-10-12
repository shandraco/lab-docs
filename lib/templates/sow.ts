import type { TemplateDefinition } from "@/lib/doc/types";

/**
 * Statement of Work under the MSA. Scoping rules from the Brain notes
 * estimating-and-scoping-client-work (acceptance criteria per deliverable, an out-of-scope
 * list, assumptions written down) and sow-written-ahead-of-build (describe only what will
 * actually be delivered). NOT attorney-reviewed.
 */
export const sow: TemplateDefinition = {
  kind: "sow",
  format: "document",
  heading: "Statement of Work: {{project_name}}",
  sections: [
    {
      title: "The project",
      fields: [
        { key: "project_name", label: "Project name", type: "text", hint: "Short, for example “Booking app”." },
        { key: "msa_date", label: "Date of the signed Master Services Agreement", type: "date", hint: "This SOW sits under that agreement." },
        { key: "start_date", label: "Start date", type: "date" },
        { key: "summary", label: "What the project is, in two or three sentences", type: "longtext" },
      ],
    },
    {
      title: "What you will deliver",
      hint: "Write each deliverable so the client could check it is done.",
      fields: [
        {
          key: "deliverables",
          label: "Deliverables",
          type: "rows",
          columns: [
            { key: "item", label: "Deliverable", type: "text" },
            { key: "criteria", label: "Done when", type: "text" },
          ],
        },
        { key: "out_of_scope", label: "Not included", type: "lines", hint: "One item per line. Saying this now avoids arguments later." },
        { key: "assumptions", label: "Assumptions", type: "lines", hint: "One per line, for example “Client supplies all photos”." },
        { key: "client_tasks", label: "What the client needs to provide", type: "lines", hint: "One per line." },
      ],
    },
    {
      title: "Timeline",
      fields: [
        {
          key: "milestones",
          label: "Milestones",
          type: "rows",
          columns: [
            { key: "milestone", label: "Milestone", type: "text" },
            { key: "date", label: "Target date", type: "date" },
          ],
        },
      ],
    },
    {
      title: "Price",
      fields: [
        {
          key: "pricing",
          label: "How is it priced?",
          type: "choice",
          default: "fixed",
          options: [
            { value: "fixed", label: "Fixed price" },
            { value: "hourly", label: "Hourly, with a cap" },
          ],
        },
        {
          key: "fees",
          label: "Fees",
          type: "rows",
          hint: "For a fixed price, one line per payment. For hourly, the estimate per phase.",
          columns: [
            { key: "item", label: "Item", type: "text" },
            { key: "amount", label: "Amount", type: "money" },
          ],
        },
        { key: "hourly_rate", label: "Hourly rate", type: "money", optional: true, hint: "Only for hourly pricing." },
        { key: "payment_schedule", label: "When the client pays", type: "longtext", default: "50% on signing this SOW and 50% on acceptance of the final deliverable." },
      ],
    },
    {
      title: "People",
      fields: [
        { key: "lab_lead", label: "Your project lead", type: "text" },
        { key: "acceptance_days", label: "Days the client has to check each delivery", type: "number", default: "10" },
      ],
    },
  ],
  blocks: [
    {
      t: "p",
      text: "This Statement of Work (“**SOW**”) is made on {{today}} between {{lab.legal_name|lab.name}} (“**Developer**”) and {{client.legal_name|client.name}} (“**Client**”) under the Master Services Agreement between them dated {{msa_date}} (the “**Agreement**”). Terms defined in the Agreement have the same meaning here. If this SOW conflicts with the Agreement, the Agreement controls.",
    },
    { t: "h", text: "Summary" },
    { t: "p", text: "{{summary}}" },
    { t: "p", text: "Work starts on {{start_date}}." },
    { t: "h", text: "Deliverables and acceptance criteria" },
    { t: "p", text: "Each deliverable is complete when it meets the criteria beside it." },
    { t: "rows", field: "deliverables" },
    {
      t: "p",
      text: "Client has {{acceptance_days}} business days after each delivery to accept it or describe in writing how it does not meet its criteria, as set out in the Agreement.",
    },
    { t: "h", text: "Not included" },
    { t: "p", text: "The following are outside this SOW. Any of them can be added through a signed change order." },
    { t: "lines", field: "out_of_scope" },
    { t: "h", text: "Assumptions" },
    { t: "p", text: "The price and timeline rely on these assumptions. If one turns out to be wrong, either party may ask for a change order." },
    { t: "lines", field: "assumptions" },
    { t: "h", text: "Client responsibilities" },
    { t: "lines", field: "client_tasks" },
    { t: "h", text: "Timeline" },
    { t: "p", text: "Target dates assume Client meets its responsibilities on time. Delays on Client's side move the dates that follow." },
    { t: "rows", field: "milestones" },
    { t: "h", text: "Fees" },
    { t: "p", when: { field: "pricing", equals: "fixed" }, text: "The fixed price for this SOW is {{fees.total}}, made up as follows." },
    {
      t: "p",
      when: { field: "pricing", equals: "hourly" },
      text: "Work is billed at {{hourly_rate}} per hour, for time actually spent. The estimate below totals {{fees.total}}. Developer will not exceed that total without Client's written approval.",
    },
    { t: "rows", field: "fees" },
    { t: "p", text: "**Payment.** {{payment_schedule}} Invoices are payable as set out in the Agreement." },
    { t: "h", text: "Changes" },
    {
      t: "p",
      text: "Any change to the deliverables, timeline or fees needs a change order signed by both parties, stating the change and its effect on price and dates.",
    },
    { t: "h", text: "Contacts" },
    { t: "p", text: "Developer's project lead is {{lab_lead}}. Client's contact is {{client.contact_name}} ({{client.contact_email}})." },
    { t: "signatures" },
  ],
};

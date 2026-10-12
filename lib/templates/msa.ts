import type { TemplateDefinition } from "@/lib/doc/types";

/**
 * Master Services Agreement, developer-side paper. Structure and fallback positions from the
 * Brain notes contract-review-playbook-with-fallback-positions,
 * limitation-of-liability-and-indemnity-structure and ip-assignment-and-work-for-hire.
 * NOT attorney-reviewed: the app labels it so until the owner records a review.
 */
export const msa: TemplateDefinition = {
  kind: "msa",
  format: "document",
  heading: "Master Services Agreement",
  sections: [
    {
      title: "The agreement",
      fields: [
        { key: "effective_date", label: "Start date of this agreement", type: "date" },
        {
          key: "term",
          label: "How long does it last?",
          type: "choice",
          default: "until_ended",
          options: [
            { value: "until_ended", label: "Until either side ends it" },
            { value: "fixed", label: "A fixed number of years, then renews each year" },
          ],
        },
        { key: "term_years", label: "Number of years", type: "number", optional: true, default: "1", hint: "Only used if you chose a fixed number of years." },
        { key: "termination_days", label: "Notice needed to end it (days)", type: "number", default: "30" },
      ],
    },
    {
      title: "Money",
      fields: [
        {
          key: "payment_days",
          label: "Invoices are due within",
          type: "choice",
          default: "30",
          options: [
            { value: "15", label: "15 days" },
            { value: "30", label: "30 days" },
            { value: "45", label: "45 days" },
          ],
        },
        {
          key: "late_fee",
          label: "Charge interest on late payments?",
          type: "choice",
          default: "yes",
          options: [
            { value: "yes", label: "Yes, 1% a month" },
            { value: "no", label: "No" },
          ],
        },
      ],
    },
    {
      title: "Risk and protection",
      hint: "The defaults are the usual starting position for a development studio.",
      fields: [
        { key: "acceptance_days", label: "Days the client has to check each delivery", type: "number", default: "10" },
        {
          key: "warranty_days",
          label: "Bug-fix warranty after acceptance",
          type: "choice",
          default: "90",
          options: [
            { value: "30", label: "30 days" },
            { value: "60", label: "60 days" },
            { value: "90", label: "90 days" },
          ],
        },
        {
          key: "liability_cap",
          label: "Most either side can owe the other",
          type: "choice",
          default: "fees_12",
          options: [
            { value: "fees_12", label: "The fees paid in the 12 months before the claim" },
            { value: "greater_of", label: "Those fees or a fixed amount, whichever is larger" },
          ],
        },
        { key: "liability_floor", label: "Fixed amount", type: "money", optional: true, hint: "Only used with the second option. $100,000 is a common figure." },
        {
          key: "breach_hours",
          label: "Tell the client about a data breach within",
          type: "choice",
          default: "72",
          options: [
            { value: "48", label: "48 hours" },
            { value: "72", label: "72 hours" },
          ],
        },
        {
          key: "nonsolicit",
          label: "Stop each side hiring the other's staff?",
          type: "choice",
          default: "yes",
          options: [
            { value: "yes", label: "Yes, for 12 months after the work ends" },
            { value: "no", label: "No" },
          ],
        },
        {
          key: "publicity",
          label: "Can the lab name the client as a customer?",
          type: "choice",
          default: "allowed",
          options: [
            { value: "allowed", label: "Yes, name and logo only" },
            { value: "ask_first", label: "Only with written permission each time" },
          ],
        },
      ],
    },
  ],
  blocks: [
    {
      t: "p",
      text: "This Master Services Agreement (the “**Agreement**”) starts on {{effective_date}} (the “**Effective Date**”) and is between {{lab.legal_name|lab.name}}, {{lab.entity_description}}, of {{lab.address}} (“**Developer**”), and {{client.legal_name|client.name}}, {{client.entity_description}}, of {{client.address}} (“**Client**”).",
    },
    { t: "h", text: "Services and Statements of Work" },
    {
      t: "p",
      text: "Developer will provide software design, development and related services (the “**Services**”) as described in one or more statements of work signed by both parties (each a “**SOW**”). Each SOW is governed by this Agreement. If a SOW conflicts with this Agreement, this Agreement controls unless the SOW expressly says which section it overrides.",
    },
    { t: "h", text: "Changes" },
    {
      t: "p",
      text: "Either party may ask to change a SOW's scope, timeline or fees. A change takes effect only when both parties sign a written change order. Developer is not required to perform work outside a signed SOW or change order.",
    },
    { t: "h", text: "Fees and payment" },
    {
      t: "p",
      text: "Client will pay the fees set out in each SOW. Developer will invoice as the SOW states, and invoices are due within {{payment_days}} days of the invoice date. Pre-approved, reasonable expenses are reimbursed at cost. Fees exclude taxes, which Client will pay except for taxes on Developer's income.",
    },
    {
      t: "p",
      when: { field: "late_fee", equals: "yes" },
      text: "Overdue amounts accrue interest at 1% per month or the highest rate allowed by law, whichever is lower. If an invoice is more than 30 days overdue, Developer may pause the Services after giving 10 days' written notice.",
    },
    {
      t: "p",
      when: { field: "late_fee", equals: "no" },
      text: "If an invoice is more than 30 days overdue, Developer may pause the Services after giving 10 days' written notice.",
    },
    { t: "h", text: "Client responsibilities" },
    {
      t: "p",
      text: "Client will provide timely decisions, feedback, content, access and a named contact as the SOW requires. Developer is not responsible for delays caused by Client not doing so, and the affected dates move accordingly.",
    },
    { t: "h", text: "Acceptance" },
    {
      t: "p",
      text: "Client has {{acceptance_days}} business days after each delivery to check it against the acceptance criteria in the SOW and either accept it or describe in writing how it fails those criteria. Developer will correct described failures and redeliver. A deliverable is accepted when Client says so, when that period ends without a written description of a failure, or when Client uses it in production, whichever comes first.",
    },
    { t: "h", text: "Intellectual property" },
    {
      t: "p",
      text: "**Deliverables.** Once Client has paid in full for a deliverable, Developer hereby assigns to Client all rights in the work product created specifically for Client under a SOW, excluding Background IP and Third-Party Materials.",
    },
    {
      t: "p",
      text: "**Background IP.** Developer keeps all rights in the tools, code libraries, know-how and materials it owned before or develops outside a SOW (“**Background IP**”). To the extent Background IP is included in a deliverable, Developer grants Client a perpetual, worldwide, non-exclusive, royalty-free licence to use, copy and modify it as part of that deliverable.",
    },
    {
      t: "p",
      text: "**Third-Party Materials.** Open-source and third-party components are licensed to Client under their own licences, which Developer will identify on request.",
    },
    { t: "h", text: "Confidentiality" },
    {
      t: "p",
      text: "Each party will keep the other's non-public business and technical information confidential, use it only for this Agreement, and protect it with at least reasonable care. This does not apply to information that is public through no fault of the receiving party, already known to it, independently developed, or rightfully received from someone else. A party may disclose information when the law requires it, after giving the other party notice where allowed. These duties last for three years after this Agreement ends, and for trade secrets as long as they remain trade secrets.",
    },
    { t: "h", text: "Personal data and security" },
    {
      t: "p",
      text: "If Developer handles personal data for Client, it will do so only on Client's instructions, use reasonable technical and organisational security measures, and notify Client without undue delay, and in any event within {{breach_hours}} hours, after becoming aware of a breach affecting that data. The parties will sign a separate data processing agreement where the law requires one.",
    },
    { t: "h", text: "Warranties" },
    {
      t: "p",
      text: "Developer warrants that the Services will be performed in a professional manner, and that for {{warranty_days}} days after acceptance each deliverable will materially conform to its SOW. Client's remedy for a breach of this warranty is for Developer to fix the non-conformity or, if it cannot do so within a reasonable time, to refund the fees paid for the affected deliverable. Except as stated in this Agreement, the Services and deliverables are provided without other warranties, including implied warranties of merchantability and fitness for a particular purpose.",
    },
    { t: "h", text: "Limitation of liability" },
    {
      t: "p",
      when: { field: "liability_cap", equals: "fees_12" },
      text: "Each party's total liability under this Agreement is limited to the fees paid or payable by Client under this Agreement in the 12 months before the event giving rise to the claim.",
    },
    {
      t: "p",
      when: { field: "liability_cap", equals: "greater_of" },
      text: "Each party's total liability under this Agreement is limited to the greater of (a) the fees paid or payable by Client under this Agreement in the 12 months before the event giving rise to the claim and (b) {{liability_floor}}.",
    },
    {
      t: "p",
      text: "Neither party is liable for indirect, incidental, special or consequential damages, or for lost profits, revenue or data, even if it was told they were possible. These limits do not apply to fraud, wilful misconduct, Client's obligation to pay fees, or a party's indemnity obligations under the Indemnities section.",
    },
    { t: "h", text: "Indemnities" },
    {
      t: "p",
      text: "Developer will defend Client against any third-party claim that a deliverable, as delivered, infringes that third party's intellectual property rights, and pay the resulting damages and costs awarded or agreed in settlement. This does not apply to claims caused by Client's materials, by changes not made by Developer, or by combining a deliverable with things Developer did not supply. Client will defend Developer in the same way against third-party claims arising from materials or instructions Client provided. The party seeking defence must promptly notify the other, let it control the defence, and reasonably cooperate.",
    },
    { t: "h", text: "Term and termination" },
    {
      t: "p",
      when: { field: "term", equals: "until_ended" },
      text: "This Agreement continues until either party ends it by giving {{termination_days}} days' written notice.",
    },
    {
      t: "p",
      when: { field: "term", equals: "fixed" },
      text: "This Agreement lasts for {{term_years}} year(s) from the Effective Date and then renews for one year at a time, unless either party gives {{termination_days}} days' written notice before a renewal date.",
    },
    {
      t: "p",
      text: "Either party may end this Agreement or a SOW immediately by written notice if the other materially breaches it and does not fix the breach within 30 days of being told about it. When this Agreement or a SOW ends, Client will pay for all Services performed up to that date, and Developer will hand over work in progress that Client has paid for. Sections that by their nature should survive, including payment, intellectual property, confidentiality, limitation of liability and indemnities, survive.",
    },
    { t: "h", text: "Independent contractor" },
    {
      t: "p",
      text: "Developer is an independent contractor. Developer controls how the Services are performed and is responsible for its own staff, subcontractors and taxes. Developer may use subcontractors but remains responsible for their work.",
    },
    { t: "h", text: "Non-solicitation", when: { field: "nonsolicit", equals: "yes" } },
    {
      t: "p",
      when: { field: "nonsolicit", equals: "yes" },
      text: "While this Agreement is in force and for 12 months after it ends, neither party will directly solicit for employment any employee of the other who worked on the Services. General job advertisements and people who approach a party on their own are not covered.",
    },
    { t: "h", text: "Publicity" },
    {
      t: "p",
      when: { field: "publicity", equals: "allowed" },
      text: "Developer may name Client and show Client's logo in its list of customers. Any other public statement about the work needs Client's written consent.",
    },
    {
      t: "p",
      when: { field: "publicity", equals: "ask_first" },
      text: "Neither party will name the other publicly or use its logo without the other's written consent each time.",
    },
    { t: "h", text: "General" },
    {
      t: "p",
      text: "**Governing law.** This Agreement is governed by the laws of the State of {{lab.governing_law}}, and the courts in {{lab.venue}} have exclusive jurisdiction over any dispute.",
    },
    {
      t: "p",
      text: "**Notices.** Notices must be in writing and sent to the addresses above, or by email to the contact each party names, and take effect when received.",
    },
    {
      t: "p",
      text: "**Assignment.** Neither party may assign this Agreement without the other's written consent, except to a successor of all or substantially all of its business that agrees to be bound by it.",
    },
    {
      t: "p",
      text: "**Entire agreement.** This Agreement and its SOWs are the whole agreement between the parties on their subject and replace all earlier discussions. Changes must be in writing and signed by both parties. If any part is unenforceable, the rest remains in effect. Not enforcing a right is not a waiver of it.",
    },
    {
      t: "p",
      text: "**Signatures.** This Agreement may be signed in counterparts and with electronic signatures, each of which counts as an original.",
    },
    { t: "signatures" },
  ],
};

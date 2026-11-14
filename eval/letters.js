// Sample letters for tests, the evaluation and the demo. Every person, address
// and number here is made up: NI numbers use the QQ prefix (never issued),
// phone numbers use the 01632 and 07700 900xxx ranges reserved for drama, and
// emails use example.com. No letter is copied from a real one.
//
// pii:  what must be hidden before anything is sent.
// keep: what must stay readable, or the cloud cannot explain the letter.
// facts: acceptable answers for the main amount and the date or period to act by.

export const LETTERS = [
  {
    id: 'hmrc-late-filing',
    title: 'HMRC: late filing penalty',
    text: `HM Revenue and Customs
Self Assessment
BX9 1AS

Mr Alan Example
12 Sample Road
Dundee
DD1 9ZZ

Date of issue 2 November 2026
Unique Taxpayer Reference (UTR) 12345 67890
National Insurance number QQ 12 34 56 C

Dear Mr Example

Late filing penalty: tax year 6 April 2025 to 5 April 2026

We have charged you a penalty of £100 because we did not receive your Self Assessment tax return by the deadline of 31 October 2026 for paper returns.

What you need to do now
You must pay the penalty by 14 December 2026. If you do not pay, we will charge interest. If your return is more than 3 months late we will charge £10 for each day it remains outstanding, for up to 90 days.

If you think this penalty is wrong
You can appeal within 30 days of the date of this notice if you had a reasonable excuse. Phone us on 0300 200 3310 or write to the address above quoting your UTR.

Yours sincerely
HM Revenue and Customs`,
    pii: [
      { kind: 'NAME', text: 'Mr Alan Example' },
      { kind: 'NAME', text: 'Mr Example' },
      { kind: 'ADDRESS', text: '12 Sample Road' },
      { kind: 'ADDRESS', text: 'Dundee' },
      { kind: 'POSTCODE', text: 'DD1 9ZZ' },
      { kind: 'TAX_REFERENCE', text: '12345 67890' },
      { kind: 'NI_NUMBER', text: 'QQ 12 34 56 C' },
    ],
    keep: ['£100', '14 December 2026', '30 days', '31 October 2026'],
    facts: { amount: ['£100'], deadline: ['14 December 2026'] },
  },
  {
    id: 'council-tax-reminder',
    title: 'Council: council tax reminder',
    text: `Northbridge Council
Revenues and Benefits, PO Box 100, Northbridge

Ms Priya Sampleton
Flat 2, 48 Canal Street
Northbridge
NB4 2QY

Account number: 7104482913
Date: 5 November 2026

COUNCIL TAX REMINDER NOTICE

Dear Ms Sampleton,

Our records show that your council tax instalment of £148.00, due on 1 November 2026, has not been paid.

You must pay £148.00 within 7 days of the date of this notice. If you do not, you will lose your right to pay by instalments and the full balance of £740.00 for the year will become due. We may then apply to the Magistrates' Court for a liability order, which will add costs of £82.50 to your account.

If you are struggling to pay, contact us on 01632 960123 or email revenues@northbridge.example.com. You may be entitled to Council Tax Reduction.

Revenues Team`,
    pii: [
      { kind: 'NAME', text: 'Ms Priya Sampleton' },
      { kind: 'NAME', text: 'Ms Sampleton' },
      { kind: 'ADDRESS', text: 'Flat 2, 48 Canal Street' },
      { kind: 'POSTCODE', text: 'NB4 2QY' },
      { kind: 'REFERENCE', text: '7104482913' },
    ],
    keep: ['£148.00', 'within 7 days', '£740.00', '£82.50', 'liability order'],
    facts: { amount: ['£148.00'], deadline: ['7 days', '12 November 2026'] },
  },
  {
    id: 'landlord-rent-increase',
    title: 'Landlord: rent increase notice',
    text: `Harbour Lettings Ltd
3 Quay Lane, Portside PS1 4AB

10 November 2026

To: Tomasz Nowak-Sample and Erin Placeholder
Flat 5, 17 Mill Wynd, Portside, PS2 7TT

Tenancy reference: HL/2023/00417

Dear Tomasz and Erin,

NOTICE OF RENT INCREASE

We are writing to tell you that the rent for the property above will go up from £780 per calendar month to £865 per calendar month. The new rent starts on 1 February 2027.

If you do not agree with the increase you have the right to refer this notice to a rent officer or tribunal before the new rent starts. If we do not hear from you by 10 December 2026 we will take it that you accept the new rent, and your standing order should be changed from the February payment.

If you have any questions please call the office on 01632 960777 or email tenants@harbourlettings.example.com.

Yours sincerely,
Dana Fictive
Property Manager`,
    pii: [
      { kind: 'NAME', text: 'Tomasz Nowak-Sample' },
      { kind: 'NAME', text: 'Erin Placeholder' },
      { kind: 'NAME', text: 'Tomasz' },
      { kind: 'NAME', text: 'Erin' },
      { kind: 'ADDRESS', text: 'Flat 5, 17 Mill Wynd' },
      { kind: 'POSTCODE', text: 'PS2 7TT' },
      { kind: 'REFERENCE', text: 'HL/2023/00417' },
    ],
    keep: ['£780', '£865', '1 February 2027', '10 December 2026'],
    facts: { amount: ['£865'], deadline: ['10 December 2026'] },
  },
  {
    id: 'dwp-overpayment',
    title: 'DWP: Universal Credit overpayment',
    text: `Department for Work and Pensions
Debt Management
Mail Handling Site A, Wolverhampton, WV98 2DF

Mrs Grace Testerton
9 Orchard Close
Little Fakenham
LF3 8RW

Our reference: UC-88204417-OP
National Insurance number: QQ987654A
Date of birth: 14/03/1984

4 November 2026

Dear Mrs Testerton

You have been paid too much Universal Credit

Between 1 June 2026 and 31 August 2026 you were paid £612.48 more Universal Credit than you were entitled to. This is because your earnings changed and we were not told at the time.

You have to pay this money back. We will take £46.20 from each Universal Credit payment starting from your payment on 12 December 2026 until the money is repaid.

If you disagree with this decision you can ask us to look at it again. This is called a mandatory reconsideration. You must ask within one month of the date of this letter. If the deductions will leave you unable to pay for essentials, call Debt Management on 0800 916 0647 to ask for a lower rate.

Yours sincerely
Office Manager`,
    pii: [
      { kind: 'NAME', text: 'Mrs Grace Testerton' },
      { kind: 'NAME', text: 'Mrs Testerton' },
      { kind: 'ADDRESS', text: '9 Orchard Close' },
      { kind: 'ADDRESS', text: 'Little Fakenham' },
      { kind: 'POSTCODE', text: 'LF3 8RW' },
      { kind: 'REFERENCE', text: 'UC-88204417-OP' },
      { kind: 'NI_NUMBER', text: 'QQ987654A' },
      { kind: 'DATE_OF_BIRTH', text: '14/03/1984' },
    ],
    keep: ['£612.48', '£46.20', '12 December 2026', 'mandatory reconsideration', 'within one month'],
    facts: { amount: ['£612.48'], deadline: ['one month', '12 December 2026', '4 December 2026'] },
  },
  {
    id: 'parking-pcn',
    title: 'Council: penalty charge notice (parking)',
    text: `Eastmere Borough Council Parking Services

PENALTY CHARGE NOTICE: NOTICE TO OWNER
PCN number: EM40078812
Vehicle registration: AB12 CDE
Date of contravention: 19/10/2026 at 14:32, Market Square car park
Contravention: 83 Parked in a car park without clearly displaying a valid pay and display ticket

Registered keeper:
Dr Samuel Mockford
221 Station Avenue
Eastmere
EM9 5HH

Date of this notice: 9 November 2026

A penalty charge of £70 is now due. The 14 day period for paying the reduced charge of £35 has ended.

You must either pay £70 or make formal representations within 28 days of the date this notice is served. If you do neither, we may issue a charge certificate increasing the penalty by 50% to £105.

To pay or challenge online go to eastmere.example.com/pcn and enter the PCN number and vehicle registration.`,
    pii: [
      { kind: 'NAME', text: 'Dr Samuel Mockford' },
      { kind: 'ADDRESS', text: '221 Station Avenue' },
      { kind: 'POSTCODE', text: 'EM9 5HH' },
      { kind: 'VEHICLE_REG', text: 'AB12 CDE' },
      { kind: 'REFERENCE', text: 'EM40078812' },
    ],
    keep: ['£70', 'within 28 days', '£105', '19/10/2026'],
    facts: { amount: ['£70'], deadline: ['28 days'] },
  },
  {
    id: 'county-court-claim',
    title: 'Court: money claim',
    text: `In the County Court Business Centre
Claim Number: K7QZ41B9

Claimant: Brightline Finance Limited
Defendant: Jordan Specimen, 6 Weaver Terrace, Old Mockton, OM12 4JD

Issue date: 3 November 2026

Particulars of claim
The claimant claims the sum of £1,842.17 being monies due under a regulated credit agreement, account 40021987, together with interest of £96.40 and a court fee of £115.

Amount claimed £2,053.57

To the defendant
You have 14 days from the date of service to respond to this claim. You can pay the amount claimed, admit all or part of the claim and ask for time to pay, or dispute the claim by filing a defence. If you need more time you can file an acknowledgment of service, which gives you 28 days from the date of service to file a defence.

If you do nothing, judgment may be entered against you. A county court judgment will be recorded on the Register of Judgments and may make it difficult for you to get credit.

Respond online at the Money Claim Online service using the claim number and the password 48213377.`,
    pii: [
      { kind: 'NAME', text: 'Jordan Specimen' },
      { kind: 'ADDRESS', text: '6 Weaver Terrace' },
      { kind: 'ADDRESS', text: 'Old Mockton' },
      { kind: 'POSTCODE', text: 'OM12 4JD' },
      { kind: 'REFERENCE', text: 'K7QZ41B9' },
      { kind: 'BANK_ACCOUNT', text: '40021987' },
      { kind: 'REFERENCE', text: '48213377' },
    ],
    keep: ['£2,053.57', '14 days', '28 days', 'judgment'],
    facts: { amount: ['£2,053.57'], deadline: ['14 days'] },
  },
  {
    id: 'energy-debt',
    title: 'Energy supplier: debt and warrant warning',
    text: `Kelpie Energy
Customer Accounts, PO Box 7, Glasgow

Miss Aroha Sampleson
3/2, 91 Tollcross Road
Glasgow
G32 8ZZ

Customer number 5500 1234 77
Email on file: aroha.sampleson@example.com
Mobile on file: 07700 900123

6 November 2026

Dear Miss Sampleson

Your account is overdue: £418.90

We wrote to you on 2 October 2026 and 20 October 2026 about the balance on your electricity account. We have not received payment.

Please pay £418.90 by 20 November 2026 or call us on 0330 000 0000 to agree a payment plan. If we do not hear from you, we may pass the debt to a collection agency and may apply to the court for a warrant to fit a prepayment meter at your home. The costs of doing this, up to £150, may be added to your account.

If you are of pensionable age, disabled or have a long-term health condition, tell us: you may be able to join our Priority Services Register.

Kelpie Energy Collections Team`,
    pii: [
      { kind: 'NAME', text: 'Miss Aroha Sampleson' },
      { kind: 'NAME', text: 'Miss Sampleson' },
      { kind: 'ADDRESS', text: '91 Tollcross Road' },
      { kind: 'POSTCODE', text: 'G32 8ZZ' },
      { kind: 'REFERENCE', text: '5500 1234 77' },
      { kind: 'EMAIL', text: 'aroha.sampleson@example.com' },
      { kind: 'PHONE', text: '07700 900123' },
    ],
    keep: ['£418.90', '20 November 2026', 'prepayment meter', '£150'],
    facts: { amount: ['£418.90'], deadline: ['20 November 2026'] },
  },
  {
    id: 'hmrc-tax-code',
    title: 'HMRC: tax code notice',
    text: `HM Revenue and Customs
Pay As You Earn

Mx Robin Dummyson
The Old Bakery
4 Chapel Lane
Nether Sample
NS6 1PL

National Insurance number QQ 44 55 66 D
Employer PAYE reference 123/AB45678
Date 1 November 2026

Dear Mx Dummyson

Your tax code for the tax year 6 April 2026 to 5 April 2027

Your new tax code is 1057L. It replaces your previous code 1257L.

Why your code has changed
We think you owe £400 in tax from an earlier year. To collect it we have reduced your tax-free amount by £2,000 for the rest of this tax year. Your employer, Fictional Foods Ltd, will use the new code from your next pay day.

If you think this is wrong, or you would rather pay the £400 in one payment, tell us within 30 days. Phone 0300 200 3300 and have your National Insurance number ready.`,
    pii: [
      { kind: 'NAME', text: 'Mx Robin Dummyson' },
      { kind: 'NAME', text: 'Mx Dummyson' },
      { kind: 'ADDRESS', text: 'The Old Bakery' },
      { kind: 'ADDRESS', text: '4 Chapel Lane' },
      { kind: 'ADDRESS', text: 'Nether Sample' },
      { kind: 'POSTCODE', text: 'NS6 1PL' },
      { kind: 'NI_NUMBER', text: 'QQ 44 55 66 D' },
      { kind: 'PAYE_REFERENCE', text: '123/AB45678' },
    ],
    keep: ['1057L', '£400', '£2,000', 'within 30 days'],
    facts: { amount: ['£400'], deadline: ['30 days'] },
  },
  {
    id: 'bank-overdraft',
    title: 'Bank: overdraft withdrawal',
    text: `Tidewater Bank plc

Private and confidential
Mr K Placeholder-Jones
Rose Cottage, 2 Ferry Row
Saltmarsh SM4 0XX

7 November 2026

Dear Mr Placeholder-Jones,

Your arranged overdraft

Sort code 40-51-62  Account number 31926819

We reviewed your account on 5 November 2026. Your arranged overdraft limit of £1,500 will be removed on 7 December 2026. On that date any overdrawn balance becomes repayable in full. Your balance today is £1,212.36 overdrawn.

If you cannot repay the balance by 7 December 2026 please call us on 0345 000 0000 before that date so that we can agree a repayment plan. If we do not hear from you, we may register a default with the credit reference agencies and close your account.

You can get free, independent debt advice from StepChange or Citizens Advice.

Yours sincerely,
Customer Lending Team`,
    pii: [
      { kind: 'NAME', text: 'Mr K Placeholder-Jones' },
      { kind: 'NAME', text: 'Mr Placeholder-Jones' },
      { kind: 'ADDRESS', text: 'Rose Cottage' },
      { kind: 'ADDRESS', text: '2 Ferry Row' },
      { kind: 'POSTCODE', text: 'SM4 0XX' },
      { kind: 'SORT_CODE', text: '40-51-62' },
      { kind: 'BANK_ACCOUNT', text: '31926819' },
    ],
    keep: ['£1,500', '7 December 2026', '£1,212.36', 'default'],
    facts: { amount: ['£1,212.36', '£1,500'], deadline: ['7 December 2026'] },
  },
  {
    id: 'nhs-penalty-charge',
    title: 'NHS: prescription penalty charge',
    text: `NHS Business Services Authority
Penalty Charge Notice

Leila Notreal
77 Kiln Gardens
Upper Testbury
UT2 3EF

NHS number: 943 476 5919
PCN reference: 2611-447-0093
Date of birth: 2 May 1991

Date: 3 November 2026

Our records show that on 12 August 2026 you claimed a free NHS prescription by declaring that you held a valid prescription prepayment certificate. We could not confirm that you were entitled to it on that date.

You now need to pay:
NHS prescription charge £9.90
Penalty charge £49.50
Total £59.40

You must pay or challenge this notice within 28 days of the date above. If you do not, a surcharge of £24.75 will be added. If you were entitled to free prescriptions on 12 August 2026, you can challenge the notice online or by phoning 0300 330 9291, and the charges will be removed.`,
    pii: [
      { kind: 'NAME', text: 'Leila Notreal' },
      { kind: 'ADDRESS', text: '77 Kiln Gardens' },
      { kind: 'ADDRESS', text: 'Upper Testbury' },
      { kind: 'POSTCODE', text: 'UT2 3EF' },
      { kind: 'NHS_NUMBER', text: '943 476 5919' },
      { kind: 'REFERENCE', text: '2611-447-0093' },
      { kind: 'DATE_OF_BIRTH', text: '2 May 1991' },
    ],
    keep: ['£59.40', 'within 28 days', '£24.75', '12 August 2026'],
    facts: { amount: ['£59.40'], deadline: ['28 days', '1 December 2026'] },
  },
];

export const byId = (id) => LETTERS.find((l) => l.id === id);

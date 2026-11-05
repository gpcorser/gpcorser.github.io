# Six-scenario health plan comparison
Open index.html locally, or upload that one self-contained file to your website. No installation or external scripts are needed.

Enter regular prescription full prices per month (excluding Mounjaro) and doctor/medical bills per year for each covered person. Use annual medical prices after provider discounts and before insurer payments, excluding preventive-free care. Blank fields mean zero. Person 1 starts selected for Mounjaro; select other people only if they also take it.

The app always compares six scenarios: ABC 2.5, ABC 2 and Choices PPO, each with Mounjaro billed through insurance versus purchased directly. Both routes include the drug for every selected person. Insured route uses the reported $1,464.54 monthly working price and a $40 preferred-brand working copay once prescription coverage begins. Direct route adds $500/month per selected person outside insurance, without deductible or spending-limit credit. All-zero inputs and all Mounjaro boxes unchecked mean premiums only (the paired lines overlap).

Results: annual breakdown including premiums and direct-purchase spending; monthly cash flow; cumulative annual spending. Solid lines are insured Mounjaro, dashed lines direct purchase. Matching colors identify the same plan.

Normal prescriptions default to one preferred-brand monthly fill per person; optional category selection uses published five-tier amounts. Multiple medications, medical visit copays and irregular fill timing remain simplified. No copay dollar entry is requested. The insured price is a working input, not confirmation of negotiated price. Coverage/requirements are assumed satisfied; no preventive Mounjaro exemption or assistance is assumed. The user's observed $25 payment under 2026 PPO is not automatically used for 2027.

Premium defaults and limits use the supplied 2027 summaries and corrected premium screenshot. Quoted premium tier is fixed even if person count changes. HSA deposits, tax effects, noncovered regular drugs and out-of-network services are omitted. ABC family ceilings are modeled as stated in the summaries. Confirm individualized 2027 benefits.

Sources: https://www.messa.org/5tierrx/ and https://www.messa.org/pdf/5TierDruglist.pdf (checked November 4, 2026). October 2026 drug list identifies Mounjaro as preferred brand, with step therapy and quantity limits.

Verification: node test.js; node scenario.test.js; node six.test.js; node --check app.js. All passed. Browser visual testing has not been performed. Source copies are included; changes to source must be re-inlined in index.html.

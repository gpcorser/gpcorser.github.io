# 2027 health plan comparison

Open or publish the self-contained index.html. It saves entries locally in the browser. Expand each person's prescriptions to edit coverage, prices and tier. The two line charts compare coverage as entered with all prescriptions purchased at market price. The stacked chart shows three plans per month for the selected route.

The $3,500 default Healthcare FSA election applies only to Choices PPO. The chart assumes eligible expenses can draw on the annual election from January and shows the election divided by 12 as payroll contributions. It deducts reimbursements from out-of-pocket spending. It includes unused contributions and excludes tax savings, carryover and HSA contributions. The model treats all entered medical and prescription expenses as FSA-eligible.

Medical spending is spread evenly across the year. Rates use the supplied two-person SVSU premiums. Medical visit copays and manufacturer assistance are excluded. Verify individualized coverage and prices.

Source scripts are bundled into index.html. After editing the scripts, re-inline them before publishing. Existing calculation tests run with node test.js, node scenario.test.js and node six.test.js.

Choose a preferred plan to enable its account. PPO enables Healthcare FSA ($3,500 maximum). ABC enables HSA Catchup ($1,000 maximum, age 55+), modeled with monthly deposits from a zero starting balance. The other plans remain in the comparison.

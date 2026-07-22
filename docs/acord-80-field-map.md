# ACORD 80 (2013/09) Homeowner Application — field map

This is the authoritative mapping from the BestHO3 quote wizard (`ho-wizard.js`) to the
AcroForm field names in `api/acord-80-homeowner-application.pdf`. `api/ho-application.js`
mirrors this map exactly. **Do not edit one without the other**, and re-run
`npm run test:fields` after any change — it asserts every name below exists in the template.

## Template provenance & the field-name trap

The source PDF (`Acord-80-201309-Homeowner-Application.pdf` in Downloads) is an
**RC4-128 encrypted, XFA-hybrid** ACORD form. Two things had to happen before pdf-lib
could fill it:

1. **Decryption.** The file is encrypted with an empty user password (owner-locked).
   It was decrypted with a standalone Perl+MD5/RC4 routine (`scratchpad/pdf_decrypt.pl`),
   the key verified via Algorithm 5, and the `/XFA` entry stripped from the AcroForm so
   Adobe/pdf-lib render the AcroForm layer deterministically. The decrypted result is the
   committed template.
2. **Real field names.** The field names are **XFA-style, fully-qualified, hierarchical**:
   `F[0].P<page>[0].<Entity>_<Attribute>_<Instance>[0]` — e.g.
   `F[0].P1[0].NamedInsured_FullName_A[0]`. A field map written against the flat ACORD
   print names (`NamedInsuredName`, etc.) would **silently no-op on every write** — the
   same failure mode caught on the ACORD 130 job. All 824 names below were extracted from
   the decrypted template's actual AcroForm tree.

Terminal text fields are `Tx`; checkboxes/radios are `Btn` and are set with
`checkBox.check()` (pdf-lib resolves the on-appearance state automatically). The numbered
underwriting questions are **`Tx` fields that take the literal string `Y` or `N`**, not
checkboxes.

---

## 1. Producer (constant — Bollinsure)

| Value | ACORD 80 field |
|---|---|
| `WJB Services, Inc. dba Bollinsure Insurance Services` | `F[0].P1[0].Producer_FullName_A[0]` |
| `310-804-5017` | `F[0].P1[0].Producer_ContactPerson_PhoneNumber_A[0]` |
| `quotes@bollinsure.com` | `F[0].P1[0].Producer_ContactPerson_EmailAddress_A[0]` |
| `Bollinsure Insurance Services` | `F[0].P1[0].Producer_ContactPerson_FullName_A[0]` |
| Form completion date (on submit) | `F[0].P1[0].Form_CompletionDate_A[0]` |
| Requested effective date | `F[0].P1[0].Policy_EffectiveDate_A[0]` |
| Policy form (`HO 00 03`, `HO 00 05`, `DP 00 03`) | `F[0].P1[0].ResidentialStructure_PolicyForm_FormTypeCode_A[0]` |
| Status = new business | `F[0].P1[0].Policy_Status_NewIndicator_A[0]` (check) |

Surplus-lines number (#0D94699) is deliberately **not** written — E&S is placed through the appointed surplus-lines channel.

---

## 2. Applicant / Named Insured (page 1)  — wizard step "Applicant"

| Wizard key | ACORD 80 field |
|---|---|
| `applicant_full_name` | `F[0].P1[0].NamedInsured_FullName_A[0]` |
| `applicant_dob` | `F[0].P1[0].NamedInsured_BirthDate_A[0]` |
| `applicant_occupation` | `F[0].P1[0].NamedInsured_OccupationDescription_A[0]` |
| `applicant_email` | `F[0].P1[0].NamedInsured_Primary_EmailAddress_A[0]` |
| `applicant_phone` | `F[0].P1[0].NamedInsured_Primary_PhoneNumber_A[0]` |
| `applicant_phone_type` = `cell` | `F[0].P1[0].NamedInsured_Primary_CellPhoneIndicator_A[0]` (check) |
| `applicant_phone_type` = `home` | `F[0].P1[0].NamedInsured_Primary_HomePhoneIndicator_A[0]` (check) |
| `applicant_phone_type` = `business` | `F[0].P1[0].NamedInsured_Primary_BusinessPhoneIndicator_A[0]` (check) |

Mailing address (named insured):

| Wizard key | ACORD 80 field |
|---|---|
| `mailing_address` | `F[0].P1[0].NamedInsured_MailingAddress_LineOne_A[0]` |
| `mailing_city` | `F[0].P1[0].NamedInsured_MailingAddress_CityName_A[0]` |
| `mailing_state` | `F[0].P1[0].NamedInsured_MailingAddress_StateOrProvinceCode_A[0]` |
| `mailing_zip` | `F[0].P1[0].NamedInsured_MailingAddress_PostalCode_A[0]` |
| `risk_same_as_mailing` = yes | `F[0].P1[0].NamedInsured_PhysicalAddress_SameAsMailingIndicator_A[0]` (check) |

---

## 3. Risk location (page 2)

| Wizard key | ACORD 80 field |
|---|---|
| `risk_address` | `F[0].P2[0].Location_PhysicalAddress_LineOne_A[0]` |
| `risk_city` | `F[0].P2[0].Location_PhysicalAddress_CityName_A[0]` |
| `risk_county` | `F[0].P2[0].Location_PhysicalAddress_CountyName_A[0]` |
| `risk_state` | `F[0].P2[0].Location_PhysicalAddress_StateOrProvinceCode_A[0]` |
| `risk_zip` | `F[0].P2[0].Location_PhysicalAddress_PostalCode_A[0]` |
| `in_city_limits` = yes | `F[0].P2[0].ResidentialLocation_RiskLocation_InCityLimitsIndicator_A[0]` (check) |

---

## 4. Occupancy, usage, residence type (page 2)

`occupancy` (routes: `investor`/`tenant-occupied` → DP-3 path):

| Value | ACORD 80 field (check) |
|---|---|
| `owner` | `F[0].P2[0].ResidenceOccupancy_OccupancyType_OwnerIndicator_A[0]` |
| `tenant` | `F[0].P2[0].ResidenceOccupancy_OccupancyType_TenantIndicator_A[0]` |
| `vacant` | `F[0].P2[0].ResidenceOccupancy_OccupancyType_VacantIndicator_A[0]` |
| `unoccupied` | `F[0].P2[0].ResidenceOccupancy_OccupancyType_UnoccupiedIndicator_A[0]` |
| other | `F[0].P2[0].ResidenceOccupancy_OccupancyType_OtherIndicator_A[0]` + `..._OtherDescription_A[0]` |

`usage`:

| Value | ACORD 80 field (check) |
|---|---|
| `primary` | `F[0].P2[0].ResidenceOccupancy_Usage_PrimaryIndicator_A[0]` |
| `seasonal` | `F[0].P2[0].ResidenceOccupancy_Usage_SeasonalIndicator_A[0]` |
| `secondary` | `F[0].P2[0].ResidenceOccupancy_Usage_SecondaryIndicator_A[0]` |
| other | `F[0].P2[0].ResidenceOccupancy_Usage_OtherIndicator_A[0]` + `..._OtherDescription_A[0]` |

`residence_type`:

| Value | ACORD 80 field (check) |
|---|---|
| `dwelling` | `F[0].P2[0].ResidenceOccupancy_ResidenceType_DwellingIndicator_A[0]` |
| `townhouse` | `F[0].P2[0].ResidenceOccupancy_ResidenceType_TownhouseIndicator_A[0]` |
| `condominium` | `F[0].P2[0].ResidenceOccupancy_ResidenceType_CondominiumIndicator_A[0]` |
| `rowhouse` | `F[0].P2[0].ResidenceOccupancy_ResidenceType_RowHouseIndicator_A[0]` |
| `cooperative` | `F[0].P2[0].ResidenceOccupancy_ResidenceType_CooperativeIndicator_A[0]` |
| `apartment` | `F[0].P2[0].ResidenceOccupancy_ResidenceType_ApartmentIndicator_A[0]` |
| other | `F[0].P2[0].ResidenceOccupancy_ResidenceType_OtherIndicator_A[0]` + `..._OtherDescription_A[0]` |

| Wizard key | ACORD 80 field |
|---|---|
| `number_of_families` | `F[0].P2[0].ResidenceOccupancy_FamilyCount_A[0]` |
| `number_of_units` | `F[0].P2[0].ResidenceOccupancy_ApartmentCount_A[0]` |

---

## 5. Construction & structure (page 2) — wizard step "Home"

| Wizard key | ACORD 80 field |
|---|---|
| `year_built` | `F[0].P2[0].Construction_BuiltYear_A[0]` |
| `total_living_area` (sq ft) | `F[0].P2[0].ResidentialStructure_TotalLivingArea_A[0]` |
| `roof_material` code | `F[0].P2[0].Construction_RoofMaterialCode_A[0]` |
| `electrical_amps` | `F[0].P2[0].Construction_ElectricalPanel_AmpereCount_A[0]` |

`construction_type` (check):

| Value | ACORD 80 field |
|---|---|
| `frame` | `F[0].P2[0].Construction_ConstructionType_FrameIndicator_A[0]` |
| `masonry` | `F[0].P2[0].Construction_ConstructionType_MasonryIndicator_A[0]` |
| `masonry_veneer` | `F[0].P2[0].Construction_ConstructionType_MasonryVeneerIndicator_A[0]` |
| other | `F[0].P2[0].Construction_ConstructionType_OtherIndicator_A[0]` |

`foundation_type` (check; **optional** per brief):

| Value | ACORD 80 field |
|---|---|
| `closed` | `F[0].P2[0].Construction_Foundation_ClosedIndicator_A[0]` |
| `open` | `F[0].P2[0].Construction_Foundation_OpenIndicator_A[0]` |
| `none` | `F[0].P2[0].Construction_Foundation_NoIndicator_A[0]` |

`electrical_panel` (check):

| Value | ACORD 80 field |
|---|---|
| `breakers` | `F[0].P2[0].Construction_ElectricalPanel_CircuitBreakersIndicator_A[0]` |
| `fuses` | `F[0].P2[0].Construction_ElectricalPanel_FusesIndicator_A[0]` |

`wiring_type` (copper/romex, aluminum, knob_tube, mixed, unknown): the ACORD 80 has no
discrete wiring-material field, so this is written into the remarks
(`F[0].P5[0].Residential_RemarkText_A[0]`, prefixed `Wiring type: ...`). Aluminum / knob &
tube are material CA underwriting facts — surfaced to the broker, never silently dropped.

Condition ratings (check — excellent/good/average/below_average):

| Wizard key | field prefix (append `ExcellentIndicator_A[0]` etc.) |
|---|---|
| `roof_condition` | `F[0].P2[0].ResidentialStructure_RoofCondition_` |
| `plumbing_condition` | `F[0].P2[0].ResidentialStructure_PlumbingCondition_` |
| `housekeeping` | `F[0].P2[0].ResidentialStructure_Housekeeping_` |

---

## 6. Building improvements — "year updated" (page 2)

For each system: `*_updated` ∈ {`full`, `partial`, `none`}. `full`→CompleteIndicator,
`partial`→PartialIndicator; the year goes in `*Year`. If unknown, leave all blank —
"assume original unless a public record shows an update."

| System | Complete / Partial indicator (check) | Year field |
|---|---|---|
| Roof (`roof_updated`, `roof_update_year`) | `...BuildingImprovement_RoofingCompleteIndicator_A[0]` / `...RoofingPartialIndicator_A[0]` | `F[0].P2[0].BuildingImprovement_RoofingYear_A[0]` |
| Heating (`heating_updated`, `heating_update_year`) | `...HeatingCompleteIndicator_A[0]` / `...HeatingPartialIndicator_A[0]` | `F[0].P2[0].BuildingImprovement_HeatingYear_A[0]` |
| Plumbing (`plumbing_updated`, `plumbing_update_year`) | `...PlumbingCompleteIndicator_A[0]` / `...PlumbingPartialIndicator_A[0]` | `F[0].P2[0].BuildingImprovement_PlumbingYear_A[0]` |
| Wiring/electrical (`wiring_updated`, `wiring_update_year`) | `...WiringCompleteIndicator_A[0]` / `...WiringPartialIndicator_A[0]` | `F[0].P2[0].BuildingImprovement_WiringYear_A[0]` |

(All under prefix `F[0].P2[0].BuildingImprovement_`.)

---

## 7. Protection & safety (page 2)

`door_locks` (check): `deadbolt`→`ResidentialStructure_Security_DoorLockDeadboltIndicator_A[0]`,
`spring`→`...DoorLockSpringIndicator_A[0]`, other→`...DoorLockOtherIndicator_A[0]`.

`burglar_alarm`: `central`→`F[0].P2[0].Alarm_Burglar_CentralStationIndicator_A[0]`,
`local`→`Alarm_Burglar_LocalGongIndicator_A[0]`, `direct`→`Alarm_Burglar_DirectIndicator_A[0]`.

`smoke_alarm`: `central`→`F[0].P2[0].Alarm_Smoke_CentralStationIndicator_A[0]`,
`local`→`Alarm_Smoke_LocalGongIndicator_A[0]`, `direct`→`Alarm_Smoke_DirectIndicator_A[0]`.

`sprinklers`: `full`→`F[0].P2[0].BuildingFireProtection_Sprinkler_FullIndicator_A[0]`,
`partial`→`...Sprinkler_PartialIndicator_A[0]`.
`fire_extinguisher` (Y/N) → `F[0].P2[0].BuildingFireProtection_ExtinguisherCode_A[0]`.

`swimming_pool`: `no`→`SwimmingPool_NoIndicator_A[0]`, `in_ground`→`SwimmingPool_InGroundIndicator_A[0]`,
`above_ground`→`SwimmingPool_AboveGroundIndicator_A[0]`; plus checks
`SwimmingPool_ApprovedFenceIndicator_A[0]`, `SwimmingPool_DivingBoardIndicator_A[0]`,
`SwimmingPool_SlideIndicator_A[0]` (all `F[0].P2[0].`).

---

## 8. Coverage & deductible (page 1) — from indication

| Wizard key | ACORD 80 field |
|---|---|
| `dwelling_limit` (Coverage A) | `F[0].P1[0].ResidentialCoverage_Dwelling_LimitAmount_A[0]` |
| `personal_liability_limit` (E) | `F[0].P1[0].ResidentialCoverage_PersonalLiability_EachOccurrenceLimitAmount_A[0]` |
| `med_pay_limit` (F) | `F[0].P1[0].ResidentialCoverage_MedicalPayments_EachPersonLimitAmount_A[0]` |
| `deductible` ($) | `F[0].P1[0].ResidentialCoverage_Deductible_BaseAmount_A[0]` |

Coverages B/C/D are left blank for the broker unless the applicant supplies them
(HO-3 carriers derive them from Coverage A). Never auto-populate a limit the applicant
did not choose.

---

## 9. Loss history (page 2) — up to 4 rows

For row *n* ∈ {A,B,C,D}: `F[0].P2[0].LossHistory_OccurrenceDate_<n>[0]`,
`LossHistory_OccurrenceDescription_<n>[0]`, `LossHistory_PaidAmount_<n>[0]`.
`no_losses` = yes → all rows blank (there is no "no losses" checkbox; blank rows convey it).

---

## 10. Prior coverage (page 2) — last 3–5 years

| Wizard key | ACORD 80 field |
|---|---|
| `prior_insurer_1` | `F[0].P2[0].PriorCoverage_InsurerFullName_A[0]` |
| `prior_insurer_2` | `F[0].P2[0].PriorCoverage_InsurerFullName_B[0]` |
| `prior_expiration` | `F[0].P2[0].PriorCoverage_ExpirationDate_A[0]` |
| `no_prior_coverage` = yes | `F[0].P2[0].PriorCoverage_NoPriorCoverageIndicator_A[0]` (check) |

---

## 11. The 16 underwriting Y/N questions (pages 3–4)

Each is a `Tx` field that takes `Y` or `N`. Wizard key → question → ACORD 80 field:

| # | Wizard key | Question (as shown) | ACORD 80 field |
|---|---|---|---|
| 1 | `q_owner` | Are you the owner of the property being insured? | `F[0].P4[0].Residential_Question_KDZCode_A[0]` |
| 2 | `q_hazard` | Any flooding, brush, forest-fire, or landslide hazard at the location? | `F[0].P4[0].Residential_Question_KBBCode_A[0]` |
| 3 | `q_code_violation` | Any uncorrected fire or building-code violations? | `F[0].P4[0].Residential_Question_KBDCode_A[0]` |
| 4 | `q_business` | Is any business conducted on the premises? | `F[0].P4[0].Residential_Question_KAZCode_A[0]` |
| 5 | `q_employees` | Any residence employees (nanny, housekeeper, gardener)? | `F[0].P4[0].Residential_Question_KBACode_A[0]` |
| 6 | `q_animals` | Any animals or exotic pets on the premises? | `F[0].P4[0].Residential_Question_KBCCode_A[0]` |
| 7 | `q_trampoline` | Is there a trampoline on the premises? | `F[0].P4[0].Residential_Question_KBGCode_A[0]` |
| 8 | `q_commercial_300ft` | Is the property within 300 ft of a commercial/non-residential property? | `F[0].P4[0].Residential_Question_KBFCode_A[0]` |
| 9 | `q_co_alarm` | Approved carbon-monoxide alarm near every sleeping room? | `F[0].P4[0].Residential_Question_ABBCode_A[0]` |
| 10 | `q_lead_paint` | Any lead paint (homes built before 1978)? | `F[0].P4[0].Residential_Question_KBICode_A[0]` |
| 11 | `q_for_sale` | Is the dwelling currently for sale? | `F[0].P4[0].Residential_Question_KBECode_A[0]` |
| 12 | `q_converted` | Was the structure originally built for other than a private residence and converted? | `F[0].P4[0].Residential_Question_KBHCode_A[0]` |
| 13 | `q_declined_cancelled` | Any coverage declined, cancelled, or non-renewed in the last 3 years? | `F[0].P3[0].PersonalPolicy_Question_KABCode_A[0]` |
| 14 | `q_bankruptcy` | Any foreclosure, repossession, or bankruptcy in the past years? | `F[0].P3[0].PersonalPolicy_Question_KAHCode_A[0]` |
| 15 | `q_lien` | Any judgment or lien in the past years? | `F[0].P3[0].PersonalPolicy_Question_KAICode_A[0]` |
| 16 | `q_fraud_arson` | In the last 5 years, convicted of fraud, bribery, or arson? | `F[0].P4[0].PersonalPolicy_Question_KAGCode_A[0]` |

Explanations for "Yes" answers are concatenated into
`F[0].P5[0].Residential_RemarkText_A[0]` (the general remarks field).

---

## 12. Signature & remarks (pages 4–5)

- Adopted signature image is drawn onto the applicant-signature area of the signature page.
- Free-text remarks (wiring type, "Yes"-answer explanations, website indication note) →
  `F[0].P5[0].Residential_RemarkText_A[0]`.
- The e-sign audit certificate is appended as an extra page (see `api/ho-application.js`).

---

## Checkbox on-state note

pdf-lib's `checkBox.check()` sets the widget to its own on-appearance state, so the export
value does not need to be hard-coded. `npm run test:fields` verifies each `Btn` above
resolves to a checkbox; `npm test` fills a sample application end-to-end and re-reads it.
